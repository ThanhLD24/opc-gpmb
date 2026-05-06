from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, String

from ...db.session import get_db
from ...db.models import Ho, HoSoGPMB, HoDatInfo, User, HoStatusEnum, RoleEnum
from ..deps import get_current_user
from .ho import LOAI_DAT_CATALOG

router = APIRouter()


@router.get("/loai-dat-catalog")
async def get_loai_dat_catalog(current_user: User = Depends(get_current_user)):
    """Return the list of Vietnamese land type codes and names (Luật Đất đai)."""
    return LOAI_DAT_CATALOG

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
    search: Optional[str] = Query(None),
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

    if search:
        conditions.append(Ho.ten_chu_ho.ilike(f"%{search}%"))

    # Count
    count_q = (
        select(func.count(Ho.id))
        .join(HoSoGPMB, Ho.ho_so_id == HoSoGPMB.id)
        .where(and_(*conditions))
    )
    total = (await db.execute(count_q)).scalar_one()

    # Subquery: aggregate dat_info per ho_id
    dat_agg = (
        select(
            HoDatInfo.ho_id,
            func.count(HoDatInfo.id).label("dat_count"),
            func.sum(HoDatInfo.dien_tich).label("tong_dien_tich"),
            func.sum(HoDatInfo.so_tien).label("tong_so_tien"),
            func.string_agg(HoDatInfo.loai_dat, ",").label("loai_dat_list"),
        )
        .group_by(HoDatInfo.ho_id)
        .subquery("dat_agg")
    )

    # Data — select individual columns for clean mapping
    data_q = (
        select(
            Ho.id,
            Ho.ho_so_id,
            Ho.ma_ho,
            Ho.ten_chu_ho,
            Ho.loai_doi_tuong,
            Ho.dia_chi,
            Ho.so_dien_thoai,
            Ho.status,
            HoSoGPMB.code.label("ho_so_code"),
            HoSoGPMB.name.label("ho_so_name"),
            User.full_name.label("cbcq_name"),
            dat_agg.c.dat_count,
            dat_agg.c.tong_dien_tich,
            dat_agg.c.tong_so_tien,
            dat_agg.c.loai_dat_list,
        )
        .join(HoSoGPMB, Ho.ho_so_id == HoSoGPMB.id)
        .outerjoin(User, HoSoGPMB.cbcq_id == User.id)
        .outerjoin(dat_agg, Ho.id == dat_agg.c.ho_id)
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
            "ma_ho": row["ma_ho"],
            "ho_so_code": row["ho_so_code"],
            "ho_so_name": row["ho_so_name"],
            "ten_chu_ho": row["ten_chu_ho"],
            "loai_doi_tuong": row["loai_doi_tuong"],
            "dia_chi": row["dia_chi"],
            "so_dien_thoai": row["so_dien_thoai"],
            "trang_thai": row["status"].value,
            "trang_thai_label": HO_STATUS_LABELS.get(row["status"].value, row["status"].value),
            "cbcq_name": row["cbcq_name"],
            "dat_count": row["dat_count"] or 0,
            "tong_dien_tich": float(row["tong_dien_tich"]) if row["tong_dien_tich"] is not None else None,
            "tong_so_tien": float(row["tong_so_tien"]) if row["tong_so_tien"] is not None else None,
            "loai_dat_list": row["loai_dat_list"] or "",
        }
        for row in rows
    ]

    return {"total": total, "page": page, "page_size": page_size, "items": items}
