"""add_contract_item_specifications_table

Revision ID: 473352c06ccd
Revises: 4e13f59ffced
Create Date: 2026-01-14 14:04:14.349374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '473352c06ccd'
down_revision: Union[str, Sequence[str], None] = '4e13f59ffced'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'contract_item_specifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('contract_item_id', sa.UUID(), nullable=False),
        sa.Column('spec_key', sa.String(length=255), nullable=False),
        sa.Column('spec_value', sa.String(length=255), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.ForeignKeyConstraint(['contract_item_id'], ['contract_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('contract_item_specifications')
