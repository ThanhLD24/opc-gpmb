"""
Task Service: business logic for task generation, scope assignment, rollup.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from ..db.models import (
    HoSoWorkflowNode,
    TaskInstance,
    TaskStatusEnum,
    NodeHouseholdScope,
    Ho,
    HoStatusEnum,
)


async def _get_all_descendants(
    node_id: uuid.UUID, ho_so_id: uuid.UUID, db: AsyncSession
) -> List[HoSoWorkflowNode]:
    """Return all descendant nodes (BFS) for a given node within a ho_so."""
    result = await db.execute(
        select(HoSoWorkflowNode).where(
            HoSoWorkflowNode.ho_so_id == ho_so_id,
            HoSoWorkflowNode.parent_id == node_id,
        )
    )
    children = list(result.scalars().all())
    descendants = list(children)
    for child in children:
        grand = await _get_all_descendants(child.id, ho_so_id, db)
        descendants.extend(grand)
    return descendants


async def generate_tasks_for_ho_so(ho_so_id: uuid.UUID, db: AsyncSession) -> int:
    """
    Generate TaskInstance records for all non-per_household nodes in this ho_so.
    Returns count of tasks created.
    """
    result = await db.execute(
        select(HoSoWorkflowNode).where(
            HoSoWorkflowNode.ho_so_id == ho_so_id,
            HoSoWorkflowNode.per_household == False,  # noqa: E712
        )
    )
    nodes = result.scalars().all()
    count = 0
    for node in nodes:
        # Check if task already exists
        existing = await db.execute(
            select(TaskInstance).where(
                TaskInstance.workflow_node_id == node.id,
                TaskInstance.ho_id == None,  # noqa: E711
            )
        )
        if existing.scalar_one_or_none() is None:
            task = TaskInstance(
                ho_so_id=ho_so_id,
                workflow_node_id=node.id,
                ho_id=None,
                status=TaskStatusEnum.dang_thuc_hien,
            )
            db.add(task)
            count += 1
    await db.flush()
    return count


async def assign_households_to_node(
    ho_so_id: uuid.UUID,
    node_id: uuid.UUID,
    ho_ids: List[uuid.UUID],
    db: AsyncSession,
) -> dict:
    """
    Assign households to a per_household node and all its per_household descendants.
    Creates TaskInstance records for each combination.
    """
    # Verify the node belongs to this ho_so and is per_household
    result = await db.execute(
        select(HoSoWorkflowNode).where(
            HoSoWorkflowNode.id == node_id,
            HoSoWorkflowNode.ho_so_id == ho_so_id,
        )
    )
    node = result.scalar_one_or_none()
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    if not node.per_household:
        raise HTTPException(
            status_code=400, detail="Node is not a per_household node"
        )

    # Get all per_household descendants
    descendants = await _get_all_descendants(node_id, ho_so_id, db)
    per_hh_nodes = [n for n in [node] + descendants if n.per_household]

    tasks_created = 0
    for ho_id in ho_ids:
        # Upsert scope assignment
        existing_scope = await db.execute(
            select(NodeHouseholdScope).where(
                NodeHouseholdScope.workflow_node_id == node_id,
                NodeHouseholdScope.ho_id == ho_id,
            )
        )
        if existing_scope.scalar_one_or_none() is None:
            scope = NodeHouseholdScope(workflow_node_id=node_id, ho_id=ho_id)
            db.add(scope)

        # Create task instances for each per_household node
        for ph_node in per_hh_nodes:
            existing_task = await db.execute(
                select(TaskInstance).where(
                    TaskInstance.workflow_node_id == ph_node.id,
                    TaskInstance.ho_id == ho_id,
                )
            )
            if existing_task.scalar_one_or_none() is None:
                task = TaskInstance(
                    ho_so_id=ho_so_id,
                    workflow_node_id=ph_node.id,
                    ho_id=ho_id,
                    status=TaskStatusEnum.dang_thuc_hien,
                )
                db.add(task)
                tasks_created += 1

    await db.flush()
    return {"assigned": len(ho_ids), "tasks_created": tasks_created}


async def remove_household_from_node(
    ho_so_id: uuid.UUID,
    node_id: uuid.UUID,
    ho_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Remove a household from a node's scope.
    Raises error if any task for this household in the subtree is completed.
    """
    descendants = await _get_all_descendants(node_id, ho_so_id, db)
    all_node_ids = [node_id] + [n.id for n in descendants]

    # Check for completed tasks
    completed_result = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.workflow_node_id.in_(all_node_ids),
            TaskInstance.ho_id == ho_id,
            TaskInstance.status == TaskStatusEnum.hoan_thanh,
        )
    )
    completed_count = completed_result.scalar()
    if completed_count and completed_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove household: some tasks are already completed",
        )

    # Delete task instances
    await db.execute(
        delete(TaskInstance).where(
            TaskInstance.workflow_node_id.in_(all_node_ids),
            TaskInstance.ho_id == ho_id,
        )
    )

    # Remove scope assignment
    await db.execute(
        delete(NodeHouseholdScope).where(
            NodeHouseholdScope.workflow_node_id == node_id,
            NodeHouseholdScope.ho_id == ho_id,
        )
    )
    await db.flush()


async def update_task_rollup(
    node_id: uuid.UUID,
    ho_id: Optional[uuid.UUID],
    ho_so_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Recursive rollup: after a leaf task completes, propagate status up the tree.
    """
    # Get current node
    result = await db.execute(
        select(HoSoWorkflowNode).where(HoSoWorkflowNode.id == node_id)
    )
    node = result.scalar_one_or_none()
    if node is None or node.parent_id is None:
        return

    parent_id = node.parent_id

    # Get parent node
    parent_result = await db.execute(
        select(HoSoWorkflowNode).where(HoSoWorkflowNode.id == parent_id)
    )
    parent_node = parent_result.scalar_one_or_none()
    if parent_node is None:
        return

    # Get all children of the parent
    children_result = await db.execute(
        select(HoSoWorkflowNode).where(
            HoSoWorkflowNode.parent_id == parent_id,
            HoSoWorkflowNode.ho_so_id == ho_so_id,
        )
    )
    children = list(children_result.scalars().all())
    child_ids = [c.id for c in children]

    # For the parent task, determine effective ho_id filter
    effective_ho_id = ho_id if parent_node.per_household else None

    # Count total vs completed child tasks
    total_result = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.workflow_node_id.in_(child_ids),
            TaskInstance.ho_id == effective_ho_id,
        )
    )
    total = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.workflow_node_id.in_(child_ids),
            TaskInstance.ho_id == effective_ho_id,
            TaskInstance.status == TaskStatusEnum.hoan_thanh,
        )
    )
    completed = completed_result.scalar() or 0

    # Get or create parent task
    parent_task_result = await db.execute(
        select(TaskInstance).where(
            TaskInstance.workflow_node_id == parent_id,
            TaskInstance.ho_id == effective_ho_id,
        )
    )
    parent_task = parent_task_result.scalar_one_or_none()

    if parent_task is None:
        # Create parent task if it doesn't exist
        parent_task = TaskInstance(
            ho_so_id=ho_so_id,
            workflow_node_id=parent_id,
            ho_id=effective_ho_id,
            status=TaskStatusEnum.dang_thuc_hien,
        )
        db.add(parent_task)
        await db.flush()

    if total > 0 and completed == total:
        parent_task.status = TaskStatusEnum.hoan_thanh
        parent_task.completed_at = datetime.utcnow()
    else:
        parent_task.status = TaskStatusEnum.dang_thuc_hien
        parent_task.completed_at = None

    await db.flush()

    # Check ho status update (moi -> dang_xu_ly)
    if effective_ho_id is not None and completed > 0:
        await _check_ho_status_dang_xu_ly(effective_ho_id, db)

    # Recurse up the tree
    await update_task_rollup(parent_id, effective_ho_id, ho_so_id, db)


async def _check_ho_status_dang_xu_ly(ho_id: uuid.UUID, db: AsyncSession) -> None:
    """If ho is still 'moi' and has any completed task, advance to 'dang_xu_ly'."""
    ho_result = await db.execute(select(Ho).where(Ho.id == ho_id))
    ho = ho_result.scalar_one_or_none()
    if ho and ho.status == HoStatusEnum.moi:
        completed_count_result = await db.execute(
            select(func.count(TaskInstance.id)).where(
                TaskInstance.ho_id == ho_id,
                TaskInstance.status == TaskStatusEnum.hoan_thanh,
            )
        )
        completed_count = completed_count_result.scalar() or 0
        if completed_count > 0:
            ho.status = HoStatusEnum.dang_xu_ly
            await db.flush()
