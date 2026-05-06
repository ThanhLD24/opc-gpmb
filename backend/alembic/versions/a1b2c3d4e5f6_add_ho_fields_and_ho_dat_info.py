"""add_ho_fields_and_ho_dat_info

Revision ID: a1b2c3d4e5f6
Revises: 72a40fc53a29
Create Date: 2026-05-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '72a40fc53a29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── New columns on 'ho' ────────────────────────────────────────────────
    op.add_column('ho', sa.Column('loai_doi_tuong', sa.String(length=20), nullable=True))
    op.add_column('ho', sa.Column('so_dien_thoai', sa.String(length=20), nullable=True))
    op.add_column('ho', sa.Column('so_to_ban_do', sa.String(length=50), nullable=True))
    op.add_column('ho', sa.Column('ty_le_thu_hoi', sa.Float(), nullable=True))
    op.add_column('ho', sa.Column('cccd', sa.String(length=20), nullable=True))
    op.add_column('ho', sa.Column('dkkd_mst', sa.String(length=30), nullable=True))
    op.add_column('ho', sa.Column('ghi_chu', sa.Text(), nullable=True))

    # ── New table 'ho_dat_info' ────────────────────────────────────────────
    op.create_table(
        'ho_dat_info',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('ho_id', sa.UUID(), nullable=False),
        sa.Column('loai_dat', sa.String(length=20), nullable=False),
        sa.Column('so_tien', sa.Float(), nullable=True),
        sa.Column('ghi_chu', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['ho_id'], ['ho.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ho_dat_info_ho_id', 'ho_dat_info', ['ho_id'])


def downgrade() -> None:
    op.drop_index('ix_ho_dat_info_ho_id', table_name='ho_dat_info')
    op.drop_table('ho_dat_info')
    op.drop_column('ho', 'ghi_chu')
    op.drop_column('ho', 'dkkd_mst')
    op.drop_column('ho', 'cccd')
    op.drop_column('ho', 'ty_le_thu_hoi')
    op.drop_column('ho', 'so_to_ban_do')
    op.drop_column('ho', 'so_dien_thoai')
    op.drop_column('ho', 'loai_doi_tuong')
