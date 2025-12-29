"""merge heads

Revision ID: 4e13f59ffced
Revises: add_warehouse_id_to_contracts, efd6fe3d593c
Create Date: 2025-12-28 22:59:58.052167

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e13f59ffced'
down_revision: Union[str, Sequence[str], None] = ('add_warehouse_id_to_contracts', 'efd6fe3d593c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
