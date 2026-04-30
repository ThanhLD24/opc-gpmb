"""
Ho (Household) service: business logic for ho status transitions.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Ho, HoStatusEnum, HoSoChiTra, TaskInstance, TaskStatusEnum


async def check_and_update_ho_status_dang_xu_ly(
    ho_id: uuid.UUID, db: AsyncSession
) -> None:
    """
    If ho.status == 'moi' and has at least one completed task,
    advance status to 'dang_xu_ly'.
    """
    ho_result = await db.execute(select(Ho).where(Ho.id == ho_id))
    ho = ho_result.scalar_one_or_none()
    if ho is None or ho.status != HoStatusEnum.moi:
        return

    completed_result = await db.execute(
        select(func.count(TaskInstance.id)).where(
            TaskInstance.ho_id == ho_id,
            TaskInstance.status == TaskStatusEnum.hoan_thanh,
        )
    )
    completed_count = completed_result.scalar() or 0
    if completed_count > 0:
        ho.status = HoStatusEnum.dang_xu_ly
        await db.flush()


async def update_ho_status_da_chi_tra(ho_id: uuid.UUID, db: AsyncSession) -> None:
    """
    If ho.status == 'da_thong_nhat', advance to 'da_chi_tra'.
    Called after a chi_tra is approved.
    """
    ho_result = await db.execute(select(Ho).where(Ho.id == ho_id))
    ho = ho_result.scalar_one_or_none()
    if ho and ho.status == HoStatusEnum.da_thong_nhat:
        ho.status = HoStatusEnum.da_chi_tra
        await db.flush()


async def update_ho_ban_giao(
    chi_tra_id: uuid.UUID,
    ngay_ban_giao: datetime,
    db: AsyncSession,
) -> Optional[Ho]:
    """
    Update HoSoChiTra.ngay_ban_giao_mat_bang and set Ho.status = 'da_ban_giao'.
    """
    chi_tra_result = await db.execute(
        select(HoSoChiTra).where(HoSoChiTra.id == chi_tra_id)
    )
    chi_tra = chi_tra_result.scalar_one_or_none()
    if chi_tra is None:
        return None

    chi_tra.ngay_ban_giao_mat_bang = ngay_ban_giao

    ho_result = await db.execute(select(Ho).where(Ho.id == chi_tra.ho_id))
    ho = ho_result.scalar_one_or_none()
    if ho:
        ho.status = HoStatusEnum.da_ban_giao
    await db.flush()
    return ho
