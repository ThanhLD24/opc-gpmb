"""
Audit log service: append-only log of chi_tra actions.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import AuditLog, User


async def log_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    actor: User,
    note: Optional[str] = None,
) -> AuditLog:
    """Append an immutable audit entry. Caller is responsible for db.commit()."""
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor.id,
        actor_name=actor.full_name,
        note=note,
    )
    db.add(entry)
    await db.flush()
    return entry
