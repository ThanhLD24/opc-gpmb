"""
Task Date Service: logic for planned date calculation and actual date propagation.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import (
    HoSoGPMB,
    HoSoWorkflowNode,
    TaskInstance,
    TaskStatusEnum,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _group_siblings(
    siblings: List[HoSoWorkflowNode],
) -> List[List[HoSoWorkflowNode]]:
    """
    Split a list of sibling nodes (already sorted by order) into groups.
    Consecutive nodes with is_parallel=True form one group; each sequential
    node is its own group of size 1.

    Returns a list of groups, where each group is a list of nodes.
    A group with len > 1 (or len == 1 with is_parallel==True) represents
    a parallel group; a group with len == 1 and is_parallel==False is sequential.
    """
    groups: List[List[HoSoWorkflowNode]] = []
    current_parallel: List[HoSoWorkflowNode] = []

    for node in siblings:
        if node.is_parallel:
            current_parallel.append(node)
        else:
            if current_parallel:
                groups.append(current_parallel)
                current_parallel = []
            groups.append([node])

    if current_parallel:
        groups.append(current_parallel)

    return groups


async def _calc_planned_for_children(
    parent_id: Optional[uuid.UUID],
    start_date: date,
    nodes_by_parent: Dict[Optional[uuid.UUID], List[HoSoWorkflowNode]],
    db: AsyncSession,
) -> None:
    """
    Recursively calculate planned_start_date / planned_end_date for children
    of parent_id, starting from start_date.
    """
    children = nodes_by_parent.get(parent_id, [])
    if not children:
        return

    # Sort by order
    children = sorted(children, key=lambda n: n.order)
    groups = _group_siblings(children)

    cursor_date = start_date

    for group in groups:
        if len(group) == 1 and not group[0].is_parallel:
            # Sequential node
            node = group[0]
            node.planned_start_date = cursor_date
            node.planned_end_date = cursor_date + timedelta(days=node.planned_days or 0)
            cursor_date = node.planned_end_date
            # Recurse into children of this node
            await _calc_planned_for_children(node.id, node.planned_start_date, nodes_by_parent, db)
        else:
            # Parallel group
            group_start = cursor_date
            group_ends = []
            for node in group:
                node.planned_start_date = group_start
                node.planned_end_date = group_start + timedelta(days=node.planned_days or 0)
                group_ends.append(node.planned_end_date)
                # Recurse into children of each parallel node
                await _calc_planned_for_children(node.id, node.planned_start_date, nodes_by_parent, db)
            cursor_date = max(group_ends) if group_ends else cursor_date


# ── Public API ────────────────────────────────────────────────────────────────

async def calculate_planned_dates(ho_so_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Calculate planned_start_date / planned_end_date for all HoSoWorkflowNodes
    belonging to ho_so_id, anchored at ho_so.ngay_bat_dau.

    No-op if ngay_bat_dau is NULL.
    """
    # Load ho_so to get anchor date
    hs_result = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.id == ho_so_id)
    )
    ho_so = hs_result.scalar_one_or_none()
    if ho_so is None or ho_so.ngay_bat_dau is None:
        return

    anchor: date = ho_so.ngay_bat_dau

    # Load all nodes for this ho_so
    nodes_result = await db.execute(
        select(HoSoWorkflowNode)
        .where(HoSoWorkflowNode.ho_so_id == ho_so_id)
        .order_by(HoSoWorkflowNode.level, HoSoWorkflowNode.order)
    )
    all_nodes = list(nodes_result.scalars().all())

    # Build parent_id -> children map
    nodes_by_parent: Dict[Optional[uuid.UUID], List[HoSoWorkflowNode]] = {}
    for node in all_nodes:
        nodes_by_parent.setdefault(node.parent_id, []).append(node)

    # Start recursive calculation from root nodes (parent_id = None)
    await _calc_planned_for_children(None, anchor, nodes_by_parent, db)

    await db.flush()


async def set_actual_start_for_next(
    completed_node_id: uuid.UUID,
    ho_so_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    After a node (or all nodes in its parallel group) completes, set
    actual_start_date on the next sibling node's TaskInstances.

    Also propagates up if the completed node is the last child of its parent.
    """
    # Load completed node
    node_result = await db.execute(
        select(HoSoWorkflowNode).where(HoSoWorkflowNode.id == completed_node_id)
    )
    completed_node = node_result.scalar_one_or_none()
    if completed_node is None:
        return

    parent_id = completed_node.parent_id

    # Load all siblings (same parent, same ho_so), sorted by order
    siblings_result = await db.execute(
        select(HoSoWorkflowNode)
        .where(
            HoSoWorkflowNode.ho_so_id == ho_so_id,
            HoSoWorkflowNode.parent_id == parent_id,
        )
        .order_by(HoSoWorkflowNode.order)
    )
    siblings = list(siblings_result.scalars().all())

    # Build groups to understand the structure
    groups = _group_siblings(sorted(siblings, key=lambda n: n.order))

    # Find which group contains the completed node
    completed_group_idx: Optional[int] = None
    for idx, group in enumerate(groups):
        if any(n.id == completed_node_id for n in group):
            completed_group_idx = idx
            break

    if completed_group_idx is None:
        return

    completed_group = groups[completed_group_idx]

    # If the completed node is part of a parallel group, check all members done
    if len(completed_group) > 1 or (len(completed_group) == 1 and completed_group[0].is_parallel):
        # Check if ALL nodes in the parallel group have all TaskInstances completed
        all_done = True
        for grp_node in completed_group:
            tasks_result = await db.execute(
                select(TaskInstance).where(
                    TaskInstance.workflow_node_id == grp_node.id,
                    TaskInstance.ho_so_id == ho_so_id,
                )
            )
            grp_tasks = list(tasks_result.scalars().all())
            if not grp_tasks:
                # No tasks yet — consider not done
                all_done = False
                break
            for t in grp_tasks:
                if t.actual_end_date is None:
                    all_done = False
                    break
            if not all_done:
                break

        if not all_done:
            return
    # For a sequential node, we proceed immediately to unlock next

    # Find the next group
    next_group_idx = completed_group_idx + 1
    if next_group_idx >= len(groups):
        # No next sibling — propagate up to parent if parent exists
        if parent_id is not None:
            # Check if this is the last child completing (all siblings' tasks done)
            # Load parent node to check if it is non-per_household
            parent_result = await db.execute(
                select(HoSoWorkflowNode).where(HoSoWorkflowNode.id == parent_id)
            )
            parent_node = parent_result.scalar_one_or_none()
            if parent_node and not parent_node.per_household:
                await set_actual_start_for_next(parent_id, ho_so_id, db)
        return

    next_group = groups[next_group_idx]

    # Set actual_start_date on all TaskInstances of nodes in the next group
    today = date.today()
    for next_node in next_group:
        tasks_result = await db.execute(
            select(TaskInstance).where(
                TaskInstance.workflow_node_id == next_node.id,
                TaskInstance.ho_so_id == ho_so_id,
            )
        )
        next_tasks = list(tasks_result.scalars().all())
        for t in next_tasks:
            if t.actual_start_date is None:
                t.actual_start_date = today

    await db.flush()


async def _propagate_start_to_first_child_group(
    node_id: uuid.UUID,
    ho_so_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    After a non-per_household node completes, set actual_start_date on the
    TaskInstances belonging to its first child group (non-per_household children only).

    Per-household children manage their own actual_start via household assignment logic.
    Only the FIRST group is unlocked; subsequent groups wait for siblings to complete
    (handled by set_actual_start_for_next horizontal propagation).
    """
    children_result = await db.execute(
        select(HoSoWorkflowNode)
        .where(
            HoSoWorkflowNode.ho_so_id == ho_so_id,
            HoSoWorkflowNode.parent_id == node_id,
            HoSoWorkflowNode.per_household == False,  # noqa: E712
        )
        .order_by(HoSoWorkflowNode.order)
    )
    children = list(children_result.scalars().all())
    if not children:
        return

    groups = _group_siblings(children)
    if not groups:
        return

    first_group = groups[0]
    today = date.today()
    for child_node in first_group:
        tasks_result = await db.execute(
            select(TaskInstance).where(
                TaskInstance.workflow_node_id == child_node.id,
                TaskInstance.ho_so_id == ho_so_id,
                TaskInstance.ho_id.is_(None),
            )
        )
        child_tasks = list(tasks_result.scalars().all())
        for t in child_tasks:
            if t.actual_start_date is None:
                t.actual_start_date = today

    await db.flush()


async def set_actual_end(task_instance_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Mark a TaskInstance as ended (actual_end_date = today) and
    trigger actual_start propagation for both:
      1. this node's first child group (vertical — DOWN)
      2. the next sibling group (horizontal — ACROSS)
    """
    task_result = await db.execute(
        select(TaskInstance).where(TaskInstance.id == task_instance_id)
    )
    task = task_result.scalar_one_or_none()
    if task is None:
        return

    task.actual_end_date = date.today()
    await db.flush()

    # Vertical propagation: unlock first child group of the completed node
    await _propagate_start_to_first_child_group(task.workflow_node_id, task.ho_so_id, db)

    # Horizontal propagation: unlock next sibling group (or parent's sibling)
    await set_actual_start_for_next(task.workflow_node_id, task.ho_so_id, db)
