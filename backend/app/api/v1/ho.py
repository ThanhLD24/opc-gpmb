from __future__ import annotations

import io
import uuid
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from ...db.session import get_db
from ...db.models import Ho, HoSoGPMB, HoStatusEnum, TaskInstance, HoSoChiTra, User, RoleEnum
from ..deps import get_current_user, require_roles


class HoStatusUpdate(BaseModel):
    status: str

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class HoCreate(BaseModel):
    ma_ho: str
    ten_chu_ho: str
    dia_chi: Optional[str] = None
    loai_dat: Optional[str] = None
    thua: Optional[str] = None
    dien_tich: Optional[float] = None


class HoUpdate(BaseModel):
    ma_ho: Optional[str] = None
    loai_dat: Optional[str] = None
    ten_chu_ho: Optional[str] = None
    dia_chi: Optional[str] = None
    thua: Optional[str] = None
    dien_tich: Optional[float] = None


def ho_to_dict(ho: Ho) -> Dict[str, Any]:
    return {
        "id": str(ho.id),
        "ho_so_id": str(ho.ho_so_id),
        "ma_ho": ho.ma_ho,
        "ten_chu_ho": ho.ten_chu_ho,
        "dia_chi": ho.dia_chi,
        "loai_dat": ho.loai_dat,
        "thua": str(ho.thua) if ho.thua else None,
        "dien_tich": ho.dien_tich,
        "status": ho.status.value,
        "created_at": ho.created_at.isoformat(),
        "updated_at": ho.updated_at.isoformat(),
    }


async def _get_ho_so_or_404(ho_so_id: str, db: AsyncSession) -> HoSoGPMB:
    result = await db.execute(
        select(HoSoGPMB).where(HoSoGPMB.id == uuid.UUID(ho_so_id))
    )
    ho_so = result.scalar_one_or_none()
    if ho_so is None:
        raise HTTPException(status_code=404, detail="Ho so not found")
    return ho_so


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{ho_so_id}/ho")
async def list_ho(
    ho_so_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_ho_so_or_404(ho_so_id, db)

    q = select(Ho).where(Ho.ho_so_id == uuid.UUID(ho_so_id))
    if status:
        try:
            status_enum = HoStatusEnum(status)
            q = q.where(Ho.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    if search:
        q = q.where(
            Ho.ten_chu_ho.ilike(f"%{search}%") | Ho.ma_ho.ilike(f"%{search}%")
        )

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar()

    q = q.order_by(Ho.ma_ho).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()

    return {
        "items": [ho_to_dict(h) for h in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/{ho_so_id}/ho", status_code=status.HTTP_201_CREATED)
async def create_ho(
    ho_so_id: str,
    body: HoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    await _get_ho_so_or_404(ho_so_id, db)

    # Check ma_ho uniqueness within ho_so
    existing = await db.execute(
        select(Ho).where(
            Ho.ho_so_id == uuid.UUID(ho_so_id),
            Ho.ma_ho == body.ma_ho,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400, detail=f"Ma ho '{body.ma_ho}' already exists"
        )

    ho = Ho(
        ho_so_id=uuid.UUID(ho_so_id),
        ma_ho=body.ma_ho,
        ten_chu_ho=body.ten_chu_ho,
        dia_chi=body.dia_chi,
        loai_dat=body.loai_dat,
        thua=body.thua,
        dien_tich=body.dien_tich,
        status=HoStatusEnum.moi,
    )
    db.add(ho)
    await db.commit()
    await db.refresh(ho)
    return ho_to_dict(ho)


@router.get("/{ho_so_id}/ho/import/template")
async def download_import_template(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an xlsx template for importing households."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Import Ho"

    headers = ["ma_ho", "ten_chu_ho", "dia_chi", "loai_dat", "thua", "dien_tich"]
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Example row
    ws.append(["HB001", "Nguyễn Văn A", "Thôn Hữu Bằng", "LUC", "123", 500.0])

    # Adjust column widths
    for col_idx in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=import_ho_template.xlsx"},
    )


@router.post("/{ho_so_id}/ho/import")
async def import_ho(
    ho_so_id: str,
    file: UploadFile = File(...),
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    """
    Parse xlsx file and validate rows.
    If confirm=false, return preview with valid/error rows.
    If confirm=true, insert valid rows into DB.
    """
    await _get_ho_so_or_404(ho_so_id, db)

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read xlsx file: {e}")

    ws = wb.active
    valid_rows: List[Dict] = []
    error_rows: List[Dict] = []

    # Get existing ma_ho set for duplicate detection
    existing_result = await db.execute(
        select(Ho.ma_ho).where(Ho.ho_so_id == uuid.UUID(ho_so_id))
    )
    existing_ma_ho = set(row[0] for row in existing_result.all())
    seen_in_file: set = set()

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):
            continue

        ma_ho = str(row[0]).strip() if row[0] is not None else ""
        ten_chu_ho = str(row[1]).strip() if row[1] is not None else ""
        dia_chi = str(row[2]).strip() if row[2] is not None else None
        loai_dat = str(row[3]).strip() if row[3] is not None else None
        thua = str(row[4]).strip() if row[4] is not None else None
        dien_tich = None
        if row[5] is not None:
            try:
                dien_tich = float(row[5])
            except (ValueError, TypeError):
                pass

        errors = []
        if not ma_ho:
            errors.append("ma_ho is required")
        if not ten_chu_ho:
            errors.append("ten_chu_ho is required")
        if ma_ho in existing_ma_ho:
            errors.append(f"ma_ho '{ma_ho}' already exists in database")
        if ma_ho in seen_in_file:
            errors.append(f"ma_ho '{ma_ho}' is duplicated in file")

        row_data = {
            "row": row_idx,
            "ma_ho": ma_ho,
            "ten_chu_ho": ten_chu_ho,
            "dia_chi": dia_chi,
            "loai_dat": loai_dat,
            "thua": thua,
            "dien_tich": dien_tich,
        }

        if errors:
            error_rows.append({**row_data, "errors": errors})
        else:
            valid_rows.append(row_data)
            seen_in_file.add(ma_ho)

    imported = False
    if confirm and valid_rows:
        for row_data in valid_rows:
            ho = Ho(
                ho_so_id=uuid.UUID(ho_so_id),
                ma_ho=row_data["ma_ho"],
                ten_chu_ho=row_data["ten_chu_ho"],
                dia_chi=row_data["dia_chi"],
                loai_dat=row_data["loai_dat"],
                thua=row_data["thua"],
                dien_tich=row_data["dien_tich"],
                status=HoStatusEnum.moi,
            )
            db.add(ho)
        await db.commit()
        imported = True

    return {
        "valid": valid_rows,
        "errors": error_rows,
        "imported": imported,
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
    }


@router.patch("/{ho_so_id}/ho/{ho_id}/status")
async def update_ho_status(
    ho_so_id: str,
    ho_id: str,
    body: HoStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    """Manually transition a ho's status. Only 'da_thong_nhat' is allowed via this endpoint."""
    await _get_ho_so_or_404(ho_so_id, db)
    ho_result = await db.execute(
        select(Ho).where(
            Ho.id == uuid.UUID(ho_id),
            Ho.ho_so_id == uuid.UUID(ho_so_id),
        )
    )
    ho = ho_result.scalar_one_or_none()
    if ho is None:
        raise HTTPException(status_code=404, detail="Ho not found")

    try:
        new_status = HoStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")

    allowed_manual = {HoStatusEnum.da_thong_nhat}
    if new_status not in allowed_manual:
        raise HTTPException(
            status_code=400,
            detail=f"Status '{new_status.value}' cannot be set manually",
        )

    valid_transitions = {
        HoStatusEnum.dang_xu_ly: [HoStatusEnum.da_thong_nhat],
    }
    if new_status not in valid_transitions.get(ho.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {ho.status.value} to {new_status.value}",
        )

    ho.status = new_status
    await db.commit()
    await db.refresh(ho)
    return ho_to_dict(ho)


# S2-BE-03 — PATCH /ho-so/{ho_so_id}/ho/{ho_id}
@router.patch("/{ho_so_id}/ho/{ho_id}")
async def update_ho(
    ho_so_id: str,
    ho_id: str,
    body: HoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    await _get_ho_so_or_404(ho_so_id, db)

    ho_result = await db.execute(
        select(Ho).where(
            Ho.id == uuid.UUID(ho_id),
            Ho.ho_so_id == uuid.UUID(ho_so_id),
        )
    )
    ho = ho_result.scalar_one_or_none()
    if ho is None:
        raise HTTPException(status_code=404, detail="Hộ không tồn tại")

    locked_statuses = {HoStatusEnum.da_thong_nhat, HoStatusEnum.da_chi_tra, HoStatusEnum.da_ban_giao}
    if ho.status in locked_statuses:
        raise HTTPException(
            status_code=409,
            detail=f"Không thể sửa hộ ở trạng thái '{ho.status.value}'"
        )

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(ho, field, value)

    from datetime import datetime
    ho.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(ho)
    return ho_to_dict(ho)


# S2-BE-04 — DELETE /ho-so/{ho_so_id}/ho/{ho_id}
@router.delete("/{ho_so_id}/ho/{ho_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ho(
    ho_so_id: str,
    ho_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin, RoleEnum.cbcq)),
):
    await _get_ho_so_or_404(ho_so_id, db)

    ho_result = await db.execute(
        select(Ho).where(
            Ho.id == uuid.UUID(ho_id),
            Ho.ho_so_id == uuid.UUID(ho_so_id),
        )
    )
    ho = ho_result.scalar_one_or_none()
    if ho is None:
        raise HTTPException(status_code=404, detail="Hộ không tồn tại")

    if ho.status != HoStatusEnum.moi:
        raise HTTPException(
            status_code=409, detail="Chỉ xoá được hộ chưa vào xử lý"
        )

    # Check task_instance records
    task_count = await db.scalar(
        select(func.count(TaskInstance.id)).where(TaskInstance.ho_id == ho.id)
    ) or 0
    if task_count > 0:
        raise HTTPException(
            status_code=409, detail="Hộ đã được gán vào quy trình"
        )

    # Check chi_tra records
    chi_tra_count = await db.scalar(
        select(func.count(HoSoChiTra.id)).where(HoSoChiTra.ho_id == ho.id)
    ) or 0
    if chi_tra_count > 0:
        raise HTTPException(
            status_code=409, detail="Hộ đã có chi trả, không thể xoá"
        )

    await db.delete(ho)
    await db.commit()
