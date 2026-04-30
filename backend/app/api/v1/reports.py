from __future__ import annotations

import io
import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from ...db.session import get_db
from ...db.models import (
    HoSoChiTra,
    ChiTraStatusEnum,
    HoSoGPMB,
    Ho,
    User,
)
from ..deps import get_current_user

router = APIRouter()

try:
    import openpyxl
    from openpyxl.styles import Font
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

_APPROVED_STATUSES = (ChiTraStatusEnum.da_phe_duyet, ChiTraStatusEnum.da_ban_giao)
_PENDING_STATUSES = (ChiTraStatusEnum.cho_phe_duyet,)

STATUS_LABELS = {
    "da_tao": "Đã tạo",
    "cho_phe_duyet": "Chờ phê duyệt",
    "da_phe_duyet": "Đã phê duyệt",
    "bi_tu_choi": "Bị từ chối",
    "da_ban_giao": "Đã bàn giao",
}


def _build_query(
    ho_so_id: Optional[str],
    ho_id: Optional[str],
    tu_ngay: Optional[date],
    den_ngay: Optional[date],
    ct_status: Optional[str],
):
    """Build the base HoSoChiTra query with filters applied."""
    q = (
        select(HoSoChiTra)
        .options(
            selectinload(HoSoChiTra.ho),
            selectinload(HoSoChiTra.ho_so),
        )
    )

    conditions = []
    if ho_so_id:
        conditions.append(HoSoChiTra.ho_so_id == uuid.UUID(ho_so_id))
    if ho_id:
        conditions.append(HoSoChiTra.ho_id == uuid.UUID(ho_id))
    if tu_ngay:
        conditions.append(HoSoChiTra.created_at >= datetime.combine(tu_ngay, datetime.min.time()))
    if den_ngay:
        conditions.append(HoSoChiTra.created_at <= datetime.combine(den_ngay, datetime.max.time()))
    if ct_status:
        conditions.append(HoSoChiTra.status == ChiTraStatusEnum(ct_status))

    if conditions:
        q = q.where(and_(*conditions))
    return q


def _ct_to_report_item(ct: HoSoChiTra) -> dict:
    ho_so_data = None
    if ct.ho_so:
        ho_so_data = {
            "id": str(ct.ho_so.id),
            "code": ct.ho_so.code,
            "name": ct.ho_so.name,
        }
    ho_data = None
    if ct.ho:
        ho_data = {
            "id": str(ct.ho.id),
            "ma_ho": ct.ho.ma_ho,
            "ten_chu_ho": ct.ho.ten_chu_ho,
        }
    return {
        "id": str(ct.id),
        "ma_hsct": str(ct.id)[:8].upper(),
        "ho_so": ho_so_data,
        "ho": ho_data,
        "so_tien_bt": ct.so_tien_bt,
        "so_tien_ht": ct.so_tien_ht,
        "so_tien_tdc": ct.so_tien_tdc,
        "tong_de_nghi": (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0),
        "status": ct.status.value,
        "approved_at": ct.ngay_duyet.isoformat() if ct.ngay_duyet else None,
        "ngay_ban_giao_mat_bang": ct.ngay_ban_giao_mat_bang.isoformat()
        if ct.ngay_ban_giao_mat_bang
        else None,
    }


@router.get("/chi-tra")
async def report_chi_tra(
    ho_so_id: Optional[str] = None,
    ho_id: Optional[str] = None,
    tu_ngay: Optional[date] = None,
    den_ngay: Optional[date] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List chi tra records with optional filters and aggregate totals."""
    base_q = _build_query(ho_so_id, ho_id, tu_ngay, den_ngay, status)

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total = count_result.scalar() or 0

    # Paginated items
    paged_q = base_q.order_by(HoSoChiTra.created_at.desc())
    paged_q = paged_q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(paged_q)
    items = result.scalars().all()

    # Aggregate totals (full dataset, not just page)
    # tong_da_chi_tra: sum of da_phe_duyet + da_ban_giao
    agg_q = _build_query(ho_so_id, ho_id, tu_ngay, den_ngay, status)
    approved_q = agg_q.where(
        HoSoChiTra.status.in_(_APPROVED_STATUSES)
    )
    sum_approved_result = await db.execute(
        select(
            func.coalesce(func.sum(
                func.coalesce(HoSoChiTra.so_tien_bt, 0)
                + func.coalesce(HoSoChiTra.so_tien_ht, 0)
                + func.coalesce(HoSoChiTra.so_tien_tdc, 0)
            ), 0)
        ).select_from(approved_q.subquery())
    )
    tong_da_chi_tra = sum_approved_result.scalar() or 0

    pending_q = _build_query(ho_so_id, ho_id, tu_ngay, den_ngay, status)
    pending_q = pending_q.where(HoSoChiTra.status.in_(_PENDING_STATUSES))
    sum_pending_result = await db.execute(
        select(
            func.coalesce(func.sum(
                func.coalesce(HoSoChiTra.so_tien_bt, 0)
                + func.coalesce(HoSoChiTra.so_tien_ht, 0)
                + func.coalesce(HoSoChiTra.so_tien_tdc, 0)
            ), 0)
        ).select_from(pending_q.subquery())
    )
    tong_dang_cho_duyet = sum_pending_result.scalar() or 0

    return {
        "items": [_ct_to_report_item(ct) for ct in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "tong_da_chi_tra": tong_da_chi_tra,
        "tong_dang_cho_duyet": tong_dang_cho_duyet,
    }


@router.get("/chi-tra/export-excel")
async def export_chi_tra_excel(
    ho_so_id: Optional[str] = None,
    ho_id: Optional[str] = None,
    tu_ngay: Optional[date] = None,
    den_ngay: Optional[date] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download chi tra report as xlsx file."""
    base_q = _build_query(ho_so_id, ho_id, tu_ngay, den_ngay, status)
    q = base_q.order_by(HoSoChiTra.created_at.desc())
    result = await db.execute(q)
    records = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Báo cáo chi trả"

    headers = [
        "Mã HSCT",
        "Mã hồ sơ",
        "Tên công trình",
        "Mã hộ",
        "Tên chủ hộ",
        "BT (đồng)",
        "HT (đồng)",
        "TĐC (đồng)",
        "Tổng đề nghị",
        "Trạng thái",
        "Ngày phê duyệt",
        "Ngày bàn giao",
    ]
    ws.append(headers)

    # Bold header row
    bold = Font(bold=True)
    for cell in ws[1]:
        cell.font = bold

    for ct in records:
        tong = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
        row = [
            str(ct.id)[:8].upper(),
            ct.ho_so.code if ct.ho_so else "",
            ct.ho_so.name if ct.ho_so else "",
            ct.ho.ma_ho if ct.ho else "",
            ct.ho.ten_chu_ho if ct.ho else "",
            ct.so_tien_bt or 0,
            ct.so_tien_ht or 0,
            ct.so_tien_tdc or 0,
            tong,
            STATUS_LABELS.get(ct.status.value, ct.status.value),
            ct.ngay_duyet.strftime("%Y-%m-%d %H:%M") if ct.ngay_duyet else "",
            ct.ngay_ban_giao_mat_bang.strftime("%Y-%m-%d") if ct.ngay_ban_giao_mat_bang else "",
        ]
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"bao-cao-chi-tra-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"
    headers_resp = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_resp,
    )
