"""move_land_fields_to_ho_dat_info

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-06 12:00:00.000000

Move so_thua, so_to_ban_do, dien_tich, ty_le_thu_hoi from ho → ho_dat_info.
These fields belong to a land parcel, not to the household itself.
"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add land-parcel fields to ho_dat_info ─────────────────────────────
    op.add_column('ho_dat_info', sa.Column('so_thua', sa.String(length=50), nullable=True))
    op.add_column('ho_dat_info', sa.Column('so_to_ban_do', sa.String(length=50), nullable=True))
    op.add_column('ho_dat_info', sa.Column('dien_tich', sa.Float(), nullable=True))
    op.add_column('ho_dat_info', sa.Column('ty_le_thu_hoi', sa.Float(), nullable=True))

    # ── Remove newly-added (all-null) columns from ho ─────────────────────
    # so_to_ban_do and ty_le_thu_hoi were added in a1b2c3d4e5f6 with no data
    op.drop_column('ho', 'so_to_ban_do')
    op.drop_column('ho', 'ty_le_thu_hoi')
    # NOTE: ho.thua and ho.dien_tich are kept as deprecated nullable columns
    # because they may contain legacy seed data. They are no longer
    # surfaced through the API or FE.


def downgrade() -> None:
    op.add_column('ho', sa.Column('ty_le_thu_hoi', sa.Float(), nullable=True))
    op.add_column('ho', sa.Column('so_to_ban_do', sa.String(length=50), nullable=True))
    op.drop_column('ho_dat_info', 'ty_le_thu_hoi')
    op.drop_column('ho_dat_info', 'dien_tich')
    op.drop_column('ho_dat_info', 'so_to_ban_do')
    op.drop_column('ho_dat_info', 'so_thua')
