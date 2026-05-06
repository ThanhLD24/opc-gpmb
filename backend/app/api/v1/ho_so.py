from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from ...db.session import get_db
from ...db.models import (
    HoSoGPMB,
    HoSoStatusEnum,
    HoSoWorkflowNode,
    WorkflowTemplate,
    WorkflowNode,
    User,
    Ho,
    RoleEnum,
)
from ...services.task_service import generate_tasks_for_ho_so
from ...services.task_date_service import calculate_planned_dates
from ..deps import get_current_user, require_roles

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class HoSoCreate(BaseModel):
    code: str
    name: str
    dia_chi: Optional[str] = None
    cbcq_id: Optional[str] = None
    template_id: Optional[str] = None
    ngay_bat_dau: Optional[str] = None
    ngay_ket_thuc: Optional[str] = None


class HoSoUpdate(BaseModel):
    name: Optional[str] = None
    dia_chi: Optional[str] = None
    cbcq_id: Optional[str] = None
    ngay_bat_dau: Optional[str] = None
    ngay_ket_thuc: Optional[str] = None


class HoSoStatusUpdate(BaseModel):
    status: str


async def ho_so_to_dict(hs: HoSoGPMB, db: AsyncSession) -> Dict[str, Any]:
    so_ho = await db.scalar(
        select(func.count(Ho.id)).where(Ho.ho_so_id == hs.id)
    ) or 0
    cbcq_data = None
    if hs.cbcq_user:
        cbcq_data = {
            "id": str(hs.cbcq_user.id),
            "username": hs.cbcq_user.username,
            "full_name": hs.cbcq_user.full_name,
            "role": hs.cbcq_user.role.value,
        }
    return {
        "id": str(hs.id),
        "code": hs.code,
        "name": hs.name,
        "dia_chi": hs.dia_chi,
        "status": hs.status.value,
        "cbcq": cbcq_data,
        "so_ho": so_ho,
        "template_id": str(hs.template_id) if hs.template_id else None,
        "ngay_bat_dau": hs.ngay_bat_dau.isoformat() if hs.ngay_bat_dau else None,
        "ngay_ket_thuc": hs.ngay_ket_thuc.isoformat() if hs.ngay_ket_thuc else None,
        "created_at": hs.created_at.isoformat(),
        "updated_at": hs.updated_at.isoformat(),
        "deleted_at": hs.deleted_at.isoformat() if hs.deleted_at else None,
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _snapshot_workflow(
    ho_so_id: uuid.UUID, template_id: uuid.UUID, db: AsyncSession
) -> None:
    """
    Copy all WorkflowNodes from the template into HoSoWorkflowNodes,
    preserving the tree structure via parent_id mapping.
    """
    nodes_result = await db.execute(
        select(WorkflowNode)
        .where(WorkflowNode.template_id == template_id)
        .order_by(WorkflowNode.level, WorkflowNode.order)
    )
    nodes = list(nodes_result.scalars().all())

    # Map original_node_id -> new HoSoWorkflowNode id
    id_map: Dict[uuid.UUID, uuid.UUID] = {}

    # First pass: create all nodes without parent
    for node in nodes:
        new_node = HoSoWorkflowNode(
            ho_so_id=ho_so_id,
            source_node_id=node.id,
            parent_id=None,  # will set in second pass
            code=node.code,
            name=node.name,
            level=node.level,
            order=node.order,
            planned_days=node.planned_days,
            is_milestone=node.is_milestone,
            legal_basis=node.legal_basis,
            org_in_charge=node.org_in_charge,
            org_coordinate=node.org_coordinate,
            per_household=node.per_household,
            is_parallel=node.is_parallel,
            require_scan=node.require_scan,
            field_so_vb=node.field_so_vb,
            field_ngay_vb=node.field_ngay_vb,
            field_loai_vb=node.field_loai_vb,
            field_gia_tri_trinh=node.field_gia_tri_trinh,
            field_gia_tri_duyet=node.field_gia_tri_duyet,
            field_ghi_chu=node.field_ghi_chu,
        )
        db.add(new_node)
        await db.flush()
        id_map[node.id] = new_node.id

    # Second pass: set parent_id using the map
    for node in nodes:
        if node.parent_id and node.parent_id in id_map:
            new_node_id = id_map[node.id]
            node_result = await db.execute(
                select(HoSoWorkflowNode).where(HoSoWorkflowNode.id == new_node_id)
            )
            new_node = node_result.scalar_one()
            new_node.parent_id = id_map[node.parent_id]

    await db.flush()


async def _set_initial_actual_start(
    ho_so_id: uuid.UUID,
    anchor_date: Optional[date],
    db: AsyncSession,
) -> None:
    """
    Set actual_start_date on TaskInstances that belong to root-level nodes
    (parent_id IS NULL) in this ho_so. Uses anchor_date if provided, else today.
    """
    from ...db.models import TaskInstance
    from datetime import date as date_type

    start = anchor_date if anchor_date else date_type.today()

    # Get root nodes (parent_id IS NULL)
    root_result = await db.execute(
        select(HoSoWorkflowNode).where(
            HoSoWorkflowNode.ho_so_id == ho_so_id,
            HoSoWorkflowNode.parent_id.is_(None),
        )
    )
    root_nodes = list(root_result.scalars().all())

    for node in root_nodes:
        tasks_result = await db.execute(
            select(TaskInstance).where(
                TaskInstance.workflow_node_id == node.id,
                TaskInstance.ho_so_id == ho_so_id,
            )
        )
        tasks = list(tasks_result.scalars().all())
        for task in tasks:
            if task.actual_start_date is None:
                task.actual_start_date = start

    await db.flush()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
async def list_ho_so(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(HoSoGPMB).options(selectinload(HoSoGPMB.cbcq_user)).where(HoSoGPMB.deleted_at.is_(None))

    # UC-09: CBCQ only sees their assigned hồ sơ
    if current_user.role == RoleEnum.cbcq:
        q = q.where(HoSoGPMB.cbcq_id == current_user.id)

    if status:
        try:
            status_enum = HoSoStatusEnum(status)
            q = q.where(HoSoGPMB.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    if search:
        q = q.where(
            HoSoGPMB.name.ilike(f"%{search}%") | HoSoGPMB.code.ilike(f"%{search}%")
        )

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar()

    q = q.order_by(HoSoGPMB.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()

    return {
        "items": [await ho_so_to_dict(hs, db) for hs in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ho_so(
    body: HoSoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    # Check code uniqueness
    existing = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.code == body.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ho so code already exists")

    # Determine template
    template_id = None
    if body.template_id:
        template_id = uuid.UUID(body.template_id)
    else:
        # Use the active template
        tmpl_result = await db.execute(
            select(WorkflowTemplate).where(WorkflowTemplate.is_active == True)  # noqa: E712
        )
        tmpl = tmpl_result.scalar_one_or_none()
        if tmpl:
            template_id = tmpl.id

    ho_so = HoSoGPMB(
        code=body.code,
        name=body.name,
        dia_chi=body.dia_chi,
        status=HoSoStatusEnum.chuan_bi,
        cbcq_id=uuid.UUID(body.cbcq_id) if body.cbcq_id else None,
        template_id=template_id,
        ngay_bat_dau=date.fromisoformat(body.ngay_bat_dau) if body.ngay_bat_dau else None,
        ngay_ket_thuc=date.fromisoformat(body.ngay_ket_thuc) if body.ngay_ket_thuc else None,
        created_by=current_user.id,
    )
    db.add(ho_so)
    await db.flush()

    # Snapshot workflow
    if template_id:
        await _snapshot_workflow(ho_so.id, template_id, db)
        # Generate non-per_household tasks
        await generate_tasks_for_ho_so(ho_so.id, db)
        # Calculate planned dates
        await calculate_planned_dates(ho_so.id, db)
        # Set actual_start_date on root node TaskInstances
        await _set_initial_actual_start(ho_so.id, ho_so.ngay_bat_dau, db)

    await db.commit()
    result = await db.execute(
        select(HoSoGPMB)
        .options(selectinload(HoSoGPMB.cbcq_user))
        .where(HoSoGPMB.id == ho_so.id)
    )
    ho_so = result.scalar_one()
    return await ho_so_to_dict(ho_so, db)


@router.get("/{ho_so_id}")
async def get_ho_so(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(HoSoGPMB)
        .options(selectinload(HoSoGPMB.cbcq_user))
        .where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    ho_so = result.scalar_one_or_none()
    if ho_so is None or ho_so.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")
    return await ho_so_to_dict(ho_so, db)


@router.patch("/{ho_so_id}/status")
async def update_ho_so_status(
    ho_so_id: str,
    body: HoSoStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    result = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    ho_so = result.scalar_one_or_none()
    if ho_so is None or ho_so.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")

    try:
        new_status = HoSoStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    # Validate transitions
    valid_transitions = {
        HoSoStatusEnum.chuan_bi: [HoSoStatusEnum.thuc_hien],
        HoSoStatusEnum.thuc_hien: [HoSoStatusEnum.hoan_thanh, HoSoStatusEnum.chuan_bi],
        HoSoStatusEnum.hoan_thanh: [HoSoStatusEnum.thuc_hien],
    }
    if new_status not in valid_transitions.get(ho_so.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {ho_so.status.value} to {new_status.value}",
        )

    ho_so.status = new_status
    ho_so.updated_at = datetime.utcnow()
    await db.commit()
    result = await db.execute(
        select(HoSoGPMB)
        .options(selectinload(HoSoGPMB.cbcq_user))
        .where(HoSoGPMB.id == ho_so.id)
    )
    ho_so = result.scalar_one()
    return await ho_so_to_dict(ho_so, db)


# S2-BE-01 — PATCH /ho-so/{ho_so_id}
@router.patch("/{ho_so_id}")
async def update_ho_so(
    ho_so_id: str,
    body: HoSoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    result = await db.execute(
        select(HoSoGPMB)
        .options(selectinload(HoSoGPMB.cbcq_user))
        .where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    ho_so = result.scalar_one_or_none()
    if ho_so is None or ho_so.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")

    update_data = body.model_dump(exclude_none=True)
    ngay_bat_dau_changed = False
    if "name" in update_data:
        ho_so.name = update_data["name"]
    if "dia_chi" in update_data:
        ho_so.dia_chi = update_data["dia_chi"]
    if "cbcq_id" in update_data:
        ho_so.cbcq_id = uuid.UUID(update_data["cbcq_id"]) if update_data["cbcq_id"] else None
    if "ngay_bat_dau" in update_data:
        new_ngay_bat_dau = date.fromisoformat(update_data["ngay_bat_dau"]) if update_data["ngay_bat_dau"] else None
        if new_ngay_bat_dau != ho_so.ngay_bat_dau:
            ngay_bat_dau_changed = True
        ho_so.ngay_bat_dau = new_ngay_bat_dau
    if "ngay_ket_thuc" in update_data:
        ho_so.ngay_ket_thuc = date.fromisoformat(update_data["ngay_ket_thuc"]) if update_data["ngay_ket_thuc"] else None

    ho_so.updated_at = datetime.utcnow()

    # Auto-recalculate planned dates when ngay_bat_dau changes
    if ngay_bat_dau_changed:
        await calculate_planned_dates(ho_so.id, db)
        await _set_initial_actual_start(ho_so.id, ho_so.ngay_bat_dau, db)

    await db.commit()

    result = await db.execute(
        select(HoSoGPMB)
        .options(selectinload(HoSoGPMB.cbcq_user))
        .where(HoSoGPMB.id == ho_so.id)
    )
    ho_so = result.scalar_one()
    return await ho_so_to_dict(ho_so, db)


# S2-BE-02 — DELETE /ho-so/{ho_so_id} (soft delete)
@router.delete("/{ho_so_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ho_so(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    result = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    ho_so = result.scalar_one_or_none()
    if ho_so is None or ho_so.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại")

    if ho_so.status != HoSoStatusEnum.chuan_bi:
        raise HTTPException(
            status_code=409, detail="Không thể xoá hồ sơ đang thực hiện"
        )

    ho_so.deleted_at = datetime.utcnow()
    ho_so.updated_at = datetime.utcnow()
    await db.commit()


@router.post("/{ho_so_id}/recalculate-dates")
async def recalculate_dates(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    """Recalculate all planned dates for a hồ sơ (e.g., after ngay_bat_dau change)."""
    await calculate_planned_dates(uuid.UUID(ho_so_id), db)
    await db.commit()
    return {"message": "Dates recalculated"}
