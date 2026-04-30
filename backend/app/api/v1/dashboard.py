from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ...db.session import get_db
from ...db.models import (
    HoSoGPMB,
    HoSoStatusEnum,
    Ho,
    HoStatusEnum,
    HoSoChiTra,
    ChiTraStatusEnum,
    User,
)
from ..deps import get_current_user

router = APIRouter()

_CHI_TRA_APPROVED_STATUSES = (ChiTraStatusEnum.da_phe_duyet, ChiTraStatusEnum.da_ban_giao)


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate dashboard statistics."""

    # ── Ho So counts (exclude deleted) ──────────────────────────────────────
    hs_result = await db.execute(
        select(
            HoSoGPMB.status,
            func.count(HoSoGPMB.id).label("cnt"),
        )
        .where(HoSoGPMB.deleted_at.is_(None))
        .group_by(HoSoGPMB.status)
    )
    hs_rows = hs_result.all()

    hs_by_status: dict = {s.value: 0 for s in HoSoStatusEnum}
    hs_total = 0
    for row in hs_rows:
        hs_by_status[row.status.value] = row.cnt
        hs_total += row.cnt

    # ── Ho counts ────────────────────────────────────────────────────────────
    ho_result = await db.execute(
        select(
            Ho.status,
            func.count(Ho.id).label("cnt"),
        )
        .group_by(Ho.status)
    )
    ho_rows = ho_result.all()

    ho_by_status: dict = {s.value: 0 for s in HoStatusEnum}
    ho_total = 0
    for row in ho_rows:
        ho_by_status[row.status.value] = row.cnt
        ho_total += row.cnt

    # ── Chi Tra counts and sums ───────────────────────────────────────────────
    ct_result = await db.execute(
        select(
            HoSoChiTra.status,
            func.count(HoSoChiTra.id).label("cnt"),
            func.coalesce(
                func.sum(
                    func.coalesce(HoSoChiTra.so_tien_bt, 0)
                    + func.coalesce(HoSoChiTra.so_tien_ht, 0)
                    + func.coalesce(HoSoChiTra.so_tien_tdc, 0)
                ),
                0,
            ).label("total_amount"),
        )
        .group_by(HoSoChiTra.status)
    )
    ct_rows = ct_result.all()

    ct_by_status: dict = {s.value: 0 for s in ChiTraStatusEnum}
    ct_total_records = 0
    tong_da_phe_duyet = 0.0
    tong_cho_duyet = 0.0

    for row in ct_rows:
        ct_by_status[row.status.value] = row.cnt
        ct_total_records += row.cnt
        if row.status in _CHI_TRA_APPROVED_STATUSES:
            tong_da_phe_duyet += float(row.total_amount)
        if row.status == ChiTraStatusEnum.cho_phe_duyet:
            tong_cho_duyet += float(row.total_amount)

    # ── Recent Ho So (5 latest, exclude deleted) ──────────────────────────────
    recent_result = await db.execute(
        select(HoSoGPMB)
        .where(HoSoGPMB.deleted_at.is_(None))
        .order_by(HoSoGPMB.created_at.desc())
        .limit(5)
    )
    recent_ho_so = recent_result.scalars().all()

    return {
        "ho_so": {
            "total": hs_total,
            "by_status": hs_by_status,
        },
        "ho": {
            "total": ho_total,
            "by_status": ho_by_status,
        },
        "chi_tra": {
            "total_records": ct_total_records,
            "tong_da_phe_duyet": tong_da_phe_duyet,
            "tong_cho_duyet": tong_cho_duyet,
            "by_status": ct_by_status,
        },
        "recent_ho_so": [
            {
                "id": str(hs.id),
                "code": hs.code,
                "name": hs.name,
                "status": hs.status.value,
                "created_at": hs.created_at.isoformat(),
            }
            for hs in recent_ho_so
        ],
    }
