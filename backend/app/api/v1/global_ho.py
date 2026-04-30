from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ...db.session import get_db
from ...db.models import Ho, HoSoGPMB, User, HoStatusEnum, RoleEnum
from ..deps import get_current_user

router = APIRouter()

HO_STATUS_LABELS: dict[str, str] = {
    "moi": "Mới",
    "dang_xu_ly": "Đang xử lý",
    "da_thong_nhat": "Đã thống nhất",
    "da_chi_tra": "Đã chi trả",
    "da_ban_giao": "Đã bàn giao",
}


@router.get("")
async def list_ho_global(
    ho_so_id: Optional[str] = Query(None),
    trang_thai: Optional[str] = Query(None),
    cbcq_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all hộ across all hồ sơ, paginated, with optional filters."""
    conditions = [HoSoGPMB.deleted_at.is_(None)]

    # UC-09: CBCQ only sees hộ from hồ sơ where they are the assigned CBCQ
    if current_user.role == RoleEnum.cbcq:
        conditions.append(HoSoGPMB.cbcq_id == current_user.id)

    if ho_so_id:
        try:
            conditions.append(Ho.ho_so_id == uuid.UUID(ho_so_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ho_so_id UUID")

    if trang_thai:
        try:
            conditions.append(Ho.status == HoStatusEnum(trang_thai))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid trang_thai: {trang_thai}. "
                       f"Valid values: {[e.value for e in HoStatusEnum]}",
            )

    if cbcq_id:
        try:
            conditions.append(HoSoGPMB.cbcq_id == uuid.UUID(cbcq_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid cbcq_id UUID")

    # Count
    count_q = (
        select(func.count(Ho.id))
        .join(HoSoGPMB, Ho.ho_so_id == HoSoGPMB.id)
        .where(and_(*conditions))
    )
    total = (await db.execute(count_q)).scalar_one()

    # Data — select individual columns for clean mapping
    data_q = (
        select(
            Ho.id,
            Ho.ho_so_id,
            Ho.ten_chu_ho,
            Ho.dia_chi,
            Ho.dien_tich,
            Ho.status,
            HoSoGPMB.code.label("ho_so_code"),
            HoSoGPMB.name.label("ho_so_name"),
            User.full_name.label("cbcq_name"),
        )
        .join(HoSoGPMB, Ho.ho_so_id == HoSoGPMB.id)
        .outerjoin(User, HoSoGPMB.cbcq_id == User.id)
        .where(and_(*conditions))
        .order_by(HoSoGPMB.code.asc(), Ho.ten_chu_ho.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(data_q)).mappings().all()

    items = [
        {
            "id": str(row["id"]),
            "ho_so_id": str(row["ho_so_id"]),
            "ho_so_code": row["ho_so_code"],
            "ho_so_name": row["ho_so_name"],
            "ten_chu_ho": row["ten_chu_ho"],
            "dia_chi": row["dia_chi"],
            "dien_tich": row["dien_tich"],
            "trang_thai": row["status"].value,
            "trang_thai_label": HO_STATUS_LABELS.get(row["status"].value, row["status"].value),
            "cbcq_name": row["cbcq_name"],
        }
        for row in rows
    ]

    return {"total": total, "page": page, "page_size": page_size, "items": items}
