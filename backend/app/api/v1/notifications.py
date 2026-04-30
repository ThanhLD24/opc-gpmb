from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from ...db.session import get_db
from ...db.models import Notification, User
from ..deps import get_current_user

router = APIRouter()


@router.get("")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return unread_count and the 10 most recent notifications for the current user."""
    # Unread count
    count_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    )
    unread_count = (await db.execute(count_q)).scalar_one()

    # 10 most recent notifications
    data_q = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(10)
    )
    result = await db.execute(data_q)
    items = result.scalars().all()

    return {
        "unread_count": unread_count,
        "items": [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "link_url": n.link_url,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
    }


@router.patch("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications as read for the current user."""
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"updated": result.rowcount}


@router.patch("/{notif_id}/read")
async def mark_one_read(
    notif_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read. Returns 404 if not owned by current user."""
    try:
        notif_uuid = uuid.UUID(notif_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_uuid,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    return {"ok": True}
