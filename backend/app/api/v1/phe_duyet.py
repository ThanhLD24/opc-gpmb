from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from ...db.session import get_db
from ...db.models import (
    HoSoChiTra,
    HoSoGPMB,
    Ho,
    User,
    ChiTraStatusEnum,
    RoleEnum,
)
from ..deps import require_roles

router = APIRouter()

CHI_TRA_STATUS_LABELS: dict[str, str] = {
    "da_tao": "Mới tạo",
    "cho_phe_duyet": "Chờ phê duyệt",
    "da_phe_duyet": "Đã phê duyệt",
    "bi_tu_choi": "Bị từ chối",
    "da_ban_giao": "Đã bàn giao",
}


@router.get("")
async def list_phe_duyet(
    tab: str = Query("cho_phe_duyet", regex="^(cho_phe_duyet|lich_su)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.gddh, RoleEnum.admin)),
):
    """GDDH inbox: list HoSoChiTra records for approval or history."""
    if tab == "cho_phe_duyet":
        status_conditions = [HoSoChiTra.status == ChiTraStatusEnum.cho_phe_duyet]
    else:
        # lich_su: da_phe_duyet, bi_tu_choi, da_ban_giao
        status_conditions = [
            HoSoChiTra.status.in_([
                ChiTraStatusEnum.da_phe_duyet,
                ChiTraStatusEnum.bi_tu_choi,
                ChiTraStatusEnum.da_ban_giao,
            ])
        ]

    base_conditions = and_(*status_conditions)

    # Count
    count_q = (
        select(func.count(HoSoChiTra.id))
        .join(HoSoGPMB, HoSoChiTra.ho_so_id == HoSoGPMB.id)
        .outerjoin(Ho, HoSoChiTra.ho_id == Ho.id)
        .where(base_conditions)
    )
    total = (await db.execute(count_q)).scalar_one()

    # Data
    data_q = (
        select(
            HoSoChiTra.id,
            HoSoChiTra.ho_so_id,
            HoSoChiTra.status,
            HoSoChiTra.so_tien_bt,
            HoSoChiTra.so_tien_ht,
            HoSoChiTra.so_tien_tdc,
            HoSoChiTra.created_at,
            HoSoChiTra.updated_at,
            HoSoGPMB.code.label("ho_so_code"),
            HoSoGPMB.name.label("ho_so_name"),
            Ho.ten_chu_ho,
        )
        .join(HoSoGPMB, HoSoChiTra.ho_so_id == HoSoGPMB.id)
        .outerjoin(Ho, HoSoChiTra.ho_id == Ho.id)
        .where(base_conditions)
        .order_by(HoSoChiTra.created_at.desc())
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
            "tong_tien": (
                (row["so_tien_bt"] or 0)
                + (row["so_tien_ht"] or 0)
                + (row["so_tien_tdc"] or 0)
            ),
            "trang_thai": row["status"].value,
            "trang_thai_label": CHI_TRA_STATUS_LABELS.get(
                row["status"].value, row["status"].value
            ),
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        for row in rows
    ]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "tab": tab,
        "items": items,
    }
