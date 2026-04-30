from __future__ import annotations

import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from ...db.session import get_db
from ...db.models import (
    HoSoChiTra,
    ChiTraStatusEnum,
    HoSoGPMB,
    Ho,
    HoStatusEnum,
    AuditLog,
    User,
    RoleEnum,
)
from ...services.ho_service import update_ho_status_da_chi_tra, update_ho_ban_giao
from ...services.audit_service import log_audit
from ..deps import get_current_user, require_roles
from ...db.models import Notification

router = APIRouter()


# ── Notification helper ───────────────────────────────────────────────────────

async def _create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    body: str,
    link_url: str,
) -> None:
    """Add a notification record to the session. Caller is responsible for commit."""
    notif = Notification(user_id=user_id, title=title, body=body, link_url=link_url)
    db.add(notif)


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChiTraCreate(BaseModel):
    ho_id: str
    so_tien_bt: Optional[float] = None
    so_tien_ht: Optional[float] = None
    so_tien_tdc: Optional[float] = None
    ghi_chu: Optional[str] = None


class ChiTraUpdate(BaseModel):
    so_tien_bt: Optional[float] = None
    so_tien_ht: Optional[float] = None
    so_tien_tdc: Optional[float] = None
    noi_dung: Optional[str] = None  # alias for ghi_chu
    ghi_chu: Optional[str] = None


class RejectBody(BaseModel):
    ly_do: str


class NgayBanGiaoUpdate(BaseModel):
    ngay_ban_giao: str  # ISO date string


class BanGiaoBody(BaseModel):
    ngay_ban_giao: str  # ISO date string (YYYY-MM-DD)
    ghi_chu: Optional[str] = None


def chi_tra_to_dict(ct: HoSoChiTra) -> Dict[str, Any]:
    ho_data = None
    if ct.ho:
        ho_data = {
            "id": str(ct.ho.id),
            "ma_ho": ct.ho.ma_ho,
            "ten_chu_ho": ct.ho.ten_chu_ho,
            "dia_chi": ct.ho.dia_chi,
            "status": ct.ho.status.value,
        }
    tong = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
    return {
        "id": str(ct.id),
        "ho_so_id": str(ct.ho_so_id),
        "ho_id": str(ct.ho_id),
        "ho": ho_data,
        "status": ct.status.value,
        "so_tien_bt": ct.so_tien_bt,
        "so_tien_ht": ct.so_tien_ht,
        "so_tien_tdc": ct.so_tien_tdc,
        "tong_so_tien": tong,
        "tong_de_nghi": tong,
        "ghi_chu": ct.ghi_chu,
        "ke_toan_id": str(ct.ke_toan_id) if ct.ke_toan_id else None,
        "gddh_id": str(ct.gddh_id) if ct.gddh_id else None,
        "ly_do_tu_choi": ct.ly_do_tu_choi,
        "ngay_gui_duyet": ct.ngay_gui_duyet.isoformat() if ct.ngay_gui_duyet else None,
        "ngay_duyet": ct.ngay_duyet.isoformat() if ct.ngay_duyet else None,
        "ngay_ban_giao_mat_bang": ct.ngay_ban_giao_mat_bang.isoformat()
        if ct.ngay_ban_giao_mat_bang
        else None,
        "created_at": ct.created_at.isoformat(),
        "updated_at": ct.updated_at.isoformat(),
    }


async def _get_ho_so_or_404(ho_so_id: str, db: AsyncSession) -> HoSoGPMB:
    result = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    hs = result.scalar_one_or_none()
    if hs is None:
        raise HTTPException(status_code=404, detail="Ho so not found")
    return hs


async def _get_chi_tra_or_404(
    ho_so_id: str, chi_tra_id: str, db: AsyncSession
) -> HoSoChiTra:
    result = await db.execute(
        select(HoSoChiTra)
        .options(selectinload(HoSoChiTra.ho))
        .where(
            HoSoChiTra.id == uuid.UUID(chi_tra_id),
            HoSoChiTra.ho_so_id == uuid.UUID(ho_so_id),
        )
    )
    ct = result.scalar_one_or_none()
    if ct is None:
        raise HTTPException(status_code=404, detail="Chi tra not found")
    return ct


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{ho_so_id}/chi-tra")
async def list_chi_tra(
    ho_so_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_ho_so_or_404(ho_so_id, db)

    q = select(HoSoChiTra).options(selectinload(HoSoChiTra.ho)).where(HoSoChiTra.ho_so_id == uuid.UUID(ho_so_id))
    if status:
        try:
            status_enum = ChiTraStatusEnum(status)
            q = q.where(HoSoChiTra.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar()

    q = q.order_by(HoSoChiTra.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()

    return {
        "items": [chi_tra_to_dict(ct) for ct in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/{ho_so_id}/chi-tra", status_code=status.HTTP_201_CREATED)
async def create_chi_tra(
    ho_so_id: str,
    body: ChiTraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.ke_toan)),
):
    await _get_ho_so_or_404(ho_so_id, db)

    # Validate ho exists in this ho_so
    ho_result = await db.execute(
        select(Ho).where(
            Ho.id == uuid.UUID(body.ho_id),
            Ho.ho_so_id == uuid.UUID(ho_so_id),
        )
    )
    ho = ho_result.scalar_one_or_none()
    if ho is None:
        raise HTTPException(status_code=404, detail="Ho not found in this ho so")

    # Check: only 1 active (non-rejected) chi_tra per ho
    active_result = await db.execute(
        select(func.count(HoSoChiTra.id)).where(
            and_(
                HoSoChiTra.ho_so_id == uuid.UUID(ho_so_id),
                HoSoChiTra.ho_id == uuid.UUID(body.ho_id),
                HoSoChiTra.status != ChiTraStatusEnum.bi_tu_choi,
            )
        )
    )
    active_count = active_result.scalar() or 0
    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Ho already has an active chi tra record. Must reject existing first.",
        )

    chi_tra = HoSoChiTra(
        ho_so_id=uuid.UUID(ho_so_id),
        ho_id=uuid.UUID(body.ho_id),
        status=ChiTraStatusEnum.da_tao,
        so_tien_bt=body.so_tien_bt,
        so_tien_ht=body.so_tien_ht,
        so_tien_tdc=body.so_tien_tdc,
        ghi_chu=body.ghi_chu,
        ke_toan_id=current_user.id,
    )
    db.add(chi_tra)
    await db.flush()

    await log_audit(db, "chi_tra", chi_tra.id, "tao", current_user)

    await db.commit()
    result = await db.execute(
        select(HoSoChiTra).options(selectinload(HoSoChiTra.ho)).where(HoSoChiTra.id == chi_tra.id)
    )
    chi_tra = result.scalar_one()
    return chi_tra_to_dict(chi_tra)


@router.get("/{ho_so_id}/chi-tra/{chi_tra_id}")
async def get_chi_tra(
    ho_so_id: str,
    chi_tra_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)
    return chi_tra_to_dict(ct)


@router.patch("/{ho_so_id}/chi-tra/{chi_tra_id}")
async def update_chi_tra(
    ho_so_id: str,
    chi_tra_id: str,
    body: ChiTraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.ke_toan)),
):
    """Ke toan updates chi tra fields — only allowed when status = bi_tu_choi."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)

    if ct.status != ChiTraStatusEnum.bi_tu_choi:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot edit: current status is {ct.status.value}. Only bi_tu_choi records can be edited.",
        )

    if body.so_tien_bt is not None:
        ct.so_tien_bt = body.so_tien_bt
    if body.so_tien_ht is not None:
        ct.so_tien_ht = body.so_tien_ht
    if body.so_tien_tdc is not None:
        ct.so_tien_tdc = body.so_tien_tdc
    # ghi_chu takes precedence over noi_dung
    if body.ghi_chu is not None:
        ct.ghi_chu = body.ghi_chu
    elif body.noi_dung is not None:
        ct.ghi_chu = body.noi_dung

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.post("/{ho_so_id}/chi-tra/{chi_tra_id}/tai-gui")
async def tai_gui(
    ho_so_id: str,
    chi_tra_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.ke_toan)),
):
    """Re-submit a rejected chi tra for approval."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)

    if ct.status != ChiTraStatusEnum.bi_tu_choi:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot re-submit: current status is {ct.status.value}. Only bi_tu_choi records can be re-submitted.",
        )

    ct.status = ChiTraStatusEnum.cho_phe_duyet
    ct.ly_do_tu_choi = None
    ct.ngay_gui_duyet = datetime.utcnow()
    await db.flush()

    await log_audit(db, "chi_tra", ct.id, "tai_gui", current_user)

    # Notify all GDDH users about resubmitted chi tra
    hs = await _get_ho_so_or_404(ho_so_id, db)
    ho_result = await db.execute(select(Ho).where(Ho.id == ct.ho_id))
    ho_obj = ho_result.scalar_one_or_none()
    tong_tien = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
    ten_chu_ho = ho_obj.ten_chu_ho if ho_obj else ""
    gddh_result = await db.execute(
        select(User).where(User.role == RoleEnum.gddh, User.active == True)  # noqa: E712
    )
    gddh_users = gddh_result.scalars().all()
    for gddh_user in gddh_users:
        await _create_notification(
            db,
            gddh_user.id,
            title="Chi trả mới chờ phê duyệt",
            body=f"Hồ sơ {hs.code}: {ten_chu_ho} - {tong_tien:,.0f} đ",
            link_url="/phe-duyet",
        )

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.post("/{ho_so_id}/chi-tra/{chi_tra_id}/gui-duyet")
async def gui_duyet(
    ho_so_id: str,
    chi_tra_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ke_toan, RoleEnum.admin)),
):
    """Ke toan submits chi tra for GDDH approval."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)
    if ct.status != ChiTraStatusEnum.da_tao:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit: current status is {ct.status.value}",
        )
    ct.status = ChiTraStatusEnum.cho_phe_duyet
    ct.ngay_gui_duyet = datetime.utcnow()
    await db.flush()

    await log_audit(db, "chi_tra", ct.id, "gui_duyet", current_user)

    # Notify all GDDH users about new chi tra pending approval
    hs = await _get_ho_so_or_404(ho_so_id, db)
    ho_result = await db.execute(select(Ho).where(Ho.id == ct.ho_id))
    ho_obj = ho_result.scalar_one_or_none()
    tong_tien = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
    ten_chu_ho = ho_obj.ten_chu_ho if ho_obj else ""
    gddh_result = await db.execute(
        select(User).where(User.role == RoleEnum.gddh, User.active == True)  # noqa: E712
    )
    gddh_users = gddh_result.scalars().all()
    for gddh_user in gddh_users:
        await _create_notification(
            db,
            gddh_user.id,
            title="Chi trả mới chờ phê duyệt",
            body=f"Hồ sơ {hs.code}: {ten_chu_ho} - {tong_tien:,.0f} đ",
            link_url="/phe-duyet",
        )

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.post("/{ho_so_id}/chi-tra/{chi_tra_id}/duyet")
async def duyet(
    ho_so_id: str,
    chi_tra_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.gddh, RoleEnum.admin)),
):
    """GDDH approves chi tra."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)
    if ct.status != ChiTraStatusEnum.cho_phe_duyet:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve: current status is {ct.status.value}",
        )
    ct.status = ChiTraStatusEnum.da_phe_duyet
    ct.gddh_id = current_user.id
    ct.ngay_duyet = datetime.utcnow()
    await db.flush()

    # Update ho status to da_chi_tra
    await update_ho_status_da_chi_tra(ct.ho_id, db)
    await log_audit(db, "chi_tra", ct.id, "phe_duyet", current_user)

    # Notify ke_toan creator of the chi tra
    if ct.ke_toan_id:
        hs = await _get_ho_so_or_404(ho_so_id, db)
        ho_result = await db.execute(select(Ho).where(Ho.id == ct.ho_id))
        ho_obj = ho_result.scalar_one_or_none()
        tong_tien = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
        ten_chu_ho = ho_obj.ten_chu_ho if ho_obj else ""
        await _create_notification(
            db,
            ct.ke_toan_id,
            title="Chi trả đã được phê duyệt",
            body=f"Hồ sơ {hs.code}: {ten_chu_ho} - {tong_tien:,.0f} đ",
            link_url=f"/ho-so-gpmb/{ho_so_id}",
        )

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.post("/{ho_so_id}/chi-tra/{chi_tra_id}/tu-choi")
async def tu_choi(
    ho_so_id: str,
    chi_tra_id: str,
    body: RejectBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.gddh, RoleEnum.admin)),
):
    """GDDH rejects chi tra."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)
    if ct.status != ChiTraStatusEnum.cho_phe_duyet:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject: current status is {ct.status.value}",
        )
    ct.status = ChiTraStatusEnum.bi_tu_choi
    ct.gddh_id = current_user.id
    ct.ly_do_tu_choi = body.ly_do
    await db.flush()

    await log_audit(db, "chi_tra", ct.id, "tu_choi", current_user, note=body.ly_do)

    # Notify ke_toan creator of the chi tra
    if ct.ke_toan_id:
        hs = await _get_ho_so_or_404(ho_so_id, db)
        ho_result = await db.execute(select(Ho).where(Ho.id == ct.ho_id))
        ho_obj = ho_result.scalar_one_or_none()
        tong_tien = (ct.so_tien_bt or 0) + (ct.so_tien_ht or 0) + (ct.so_tien_tdc or 0)
        ten_chu_ho = ho_obj.ten_chu_ho if ho_obj else ""
        await _create_notification(
            db,
            ct.ke_toan_id,
            title="Chi trả bị từ chối",
            body=f"Hồ sơ {hs.code}: {ten_chu_ho} - {tong_tien:,.0f} đ",
            link_url=f"/ho-so-gpmb/{ho_so_id}",
        )

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.patch("/{ho_so_id}/chi-tra/{chi_tra_id}/ngay-ban-giao")
async def update_ngay_ban_giao(
    ho_so_id: str,
    chi_tra_id: str,
    body: NgayBanGiaoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    """Update handover date and advance ho status to da_ban_giao."""
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)
    if ct.status != ChiTraStatusEnum.da_phe_duyet:
        raise HTTPException(
            status_code=400,
            detail="Can only set handover date on approved chi tra",
        )

    try:
        ngay_ban_giao = datetime.fromisoformat(body.ngay_ban_giao)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for ngay_ban_giao")

    await update_ho_ban_giao(ct.id, ngay_ban_giao, db)
    await db.flush()

    # Update chi_tra status to da_ban_giao
    ct.status = ChiTraStatusEnum.da_ban_giao
    await log_audit(db, "chi_tra", ct.id, "ban_giao", current_user)

    await db.commit()
    await db.refresh(ct)
    return chi_tra_to_dict(ct)


@router.post("/{ho_so_id}/chi-tra/{chi_tra_id}/ban-giao")
async def ban_giao(
    ho_so_id: str,
    chi_tra_id: str,
    body: BanGiaoBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    """
    UC-06 — Bàn giao mặt bằng.

    State transition (1 chiều, không revert — ADR-S4-01):
      chi_tra.status: da_phe_duyet -> da_ban_giao
      ho.status: any -> da_ban_giao

    Validation:
      - chi_tra.status phải = da_phe_duyet, else 409
      - ngay_ban_giao trong khoảng [today - 30, today], else 422
      - role admin / cbcq, else 403 (do require_roles)
    """
    ct = await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)

    # Status guard
    if ct.status != ChiTraStatusEnum.da_phe_duyet:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot hand over: current status is {ct.status.value}. "
                "Only da_phe_duyet records can be handed over."
            ),
        )

    # Parse + validate ngay_ban_giao (ADR-S4-02)
    try:
        ngay_ban_giao_date = date.fromisoformat(body.ngay_ban_giao)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid ngay_ban_giao format. Expected ISO date YYYY-MM-DD.",
        )

    today = date.today()
    if ngay_ban_giao_date > today:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ngay_ban_giao cannot be in the future.",
        )
    if ngay_ban_giao_date < today - timedelta(days=30):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ngay_ban_giao cannot be more than 30 days in the past.",
        )

    # Apply transaction:
    #   - chi_tra.status = da_ban_giao + ngay_ban_giao_mat_bang + ghi_chu
    #   - ho.status = da_ban_giao
    #   - audit log entry
    # SQLAlchemy AsyncSession holds an open transaction implicitly until commit/rollback;
    # if any step raises, the session is not committed and changes are discarded.
    ct.status = ChiTraStatusEnum.da_ban_giao
    ct.ngay_ban_giao_mat_bang = datetime.combine(ngay_ban_giao_date, datetime.min.time())
    if body.ghi_chu is not None:
        ct.ghi_chu = body.ghi_chu

    ho_result = await db.execute(select(Ho).where(Ho.id == ct.ho_id))
    ho = ho_result.scalar_one_or_none()
    if ho is None:
        # Should not happen — chi_tra has a FK to ho. Treat as data inconsistency.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Linked ho not found for chi_tra.",
        )
    ho.status = HoStatusEnum.da_ban_giao

    await db.flush()
    await log_audit(db, "chi_tra", ct.id, "ban_giao", current_user, note=body.ghi_chu)

    await db.commit()
    await db.refresh(ct)
    # Reload with ho relationship for response
    result = await db.execute(
        select(HoSoChiTra)
        .options(selectinload(HoSoChiTra.ho))
        .where(HoSoChiTra.id == ct.id)
    )
    ct = result.scalar_one()
    return chi_tra_to_dict(ct)


@router.get("/{ho_so_id}/chi-tra/{chi_tra_id}/audit")
async def list_audit(
    ho_so_id: str,
    chi_tra_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List audit log entries for a chi tra, sorted descending."""
    # Verify chi tra exists and belongs to ho_so
    await _get_chi_tra_or_404(ho_so_id, chi_tra_id, db)

    result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "chi_tra",
            AuditLog.entity_id == uuid.UUID(chi_tra_id),
        )
        .order_by(AuditLog.created_at.desc())
    )
    entries = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "action": e.action,
            "actor_name": e.actor_name,
            "note": e.note,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]
