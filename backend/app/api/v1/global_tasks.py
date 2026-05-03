from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ...db.session import get_db
from ...db.models import TaskInstance, HoSoWorkflowNode, HoSoGPMB, User, Ho, TaskStatusEnum, RoleEnum
from ..deps import get_current_user

router = APIRouter()

TASK_STATUS_LABELS: dict[str, str] = {
    "dang_thuc_hien": "Đang thực hiện",
    "hoan_thanh": "Hoàn thành",
}


@router.get("")
async def list_tasks_global(
    ho_so_id: Optional[str] = Query(None),
    trang_thai: Optional[str] = Query(None),
    ma_ho: Optional[str] = Query(None),
    ten_chu_ho: Optional[str] = Query(None),
    my_tasks: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List task instances across hồ sơ, paginated.

    For non-admin users, either ho_so_id or my_tasks=true is required.
    my_tasks=true returns tasks from hồ sơ assigned to current user (cbcq_id).
    """
    is_admin = current_user.role == RoleEnum.admin
    is_cbcq = current_user.role == RoleEnum.cbcq
    is_ke_toan = current_user.role == RoleEnum.ke_toan
    is_gddh = current_user.role == RoleEnum.gddh

    # Chỉ yêu cầu filter cho role không có quyền xem toàn bộ
    needs_filter = not is_admin and not is_cbcq and not is_ke_toan and not is_gddh
    if needs_filter and not my_tasks and ho_so_id is None:
        raise HTTPException(
            status_code=400,
            detail="Vui lòng chọn hồ sơ GPMB để xem công việc",
        )

    conditions = [HoSoGPMB.deleted_at.is_(None)]

    # UC-09: CBCQ auto-scoped to their assigned hồ sơ (always — không cần my_tasks)
    if is_cbcq:
        conditions.append(HoSoGPMB.cbcq_id == current_user.id)

    # my_tasks=true cho CBCQ = đã xử lý bởi auto-scope ở trên
    # my_tasks=true cho ke_toan/gddh/admin = không thêm filter (họ thấy tất cả)

    if ho_so_id:
        try:
            conditions.append(TaskInstance.ho_so_id == uuid.UUID(ho_so_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ho_so_id UUID")

    if trang_thai:
        try:
            conditions.append(TaskInstance.status == TaskStatusEnum(trang_thai))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid trang_thai: {trang_thai}. "
                       f"Valid values: {[e.value for e in TaskStatusEnum]}",
            )

    if ma_ho:
        conditions.append(Ho.ma_ho.ilike(f"%{ma_ho}%"))
    if ten_chu_ho:
        conditions.append(Ho.ten_chu_ho.ilike(f"%{ten_chu_ho}%"))

    # Base JOIN: TaskInstance → HoSoWorkflowNode (name) → HoSoGPMB → User (cbcq)
    base_join = (
        lambda q: q
        .join(HoSoWorkflowNode, TaskInstance.workflow_node_id == HoSoWorkflowNode.id)
        .join(HoSoGPMB, TaskInstance.ho_so_id == HoSoGPMB.id)
        .outerjoin(User, HoSoGPMB.cbcq_id == User.id)
        .outerjoin(Ho, TaskInstance.ho_id == Ho.id)
        .where(and_(*conditions))
    )

    # Count
    count_q = base_join(select(func.count(TaskInstance.id)))
    total = (await db.execute(count_q)).scalar_one()

    # Data
    data_q = base_join(
        select(
            TaskInstance.id,
            TaskInstance.ho_so_id,
            TaskInstance.status,
            TaskInstance.updated_at,
            TaskInstance.ho_id,
            HoSoWorkflowNode.name.label("ten_cong_viec"),
            HoSoGPMB.code.label("ho_so_code"),
            HoSoGPMB.name.label("ho_so_name"),
            User.full_name.label("cbcq_name"),
            Ho.ma_ho.label("ma_ho"),
            Ho.ten_chu_ho.label("ten_chu_ho"),
        )
    ).order_by(HoSoGPMB.code.asc(), HoSoWorkflowNode.order.asc(), TaskInstance.updated_at.desc()) \
     .offset((page - 1) * page_size) \
     .limit(page_size)

    rows = (await db.execute(data_q)).mappings().all()

    items = [
        {
            "id": str(row["id"]),
            "ho_so_id": str(row["ho_so_id"]),
            "ho_so_code": row["ho_so_code"],
            "ho_so_name": row["ho_so_name"],
            "ten_cong_viec": row["ten_cong_viec"],
            "trang_thai": row["status"].value,
            "trang_thai_label": TASK_STATUS_LABELS.get(row["status"].value, row["status"].value),
            "cbcq_name": row["cbcq_name"],
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "ho_id": str(row["ho_id"]) if row["ho_id"] else None,
            "ma_ho": row["ma_ho"],
            "ten_chu_ho": row["ten_chu_ho"],
        }
        for row in rows
    ]

    return {"total": total, "page": page, "page_size": page_size, "items": items}
