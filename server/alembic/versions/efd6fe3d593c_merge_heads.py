"""merge_heads

Revision ID: efd6fe3d593c
Revises: add_data_integrity_constraints, daf75e48a432
Create Date: 2025-12-21 14:29:18.269730

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'efd6fe3d593c'
down_revision: Union[str, Sequence[str], None] = ('add_data_integrity_constraints', 'daf75e48a432')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
