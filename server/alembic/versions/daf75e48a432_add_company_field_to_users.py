"""add_company_field_to_users

Revision ID: daf75e48a432
Revises: 50dc6cf92fad
Create Date: 2025-12-19 04:45:44.567680

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'daf75e48a432'
down_revision: Union[str, Sequence[str], None] = '50dc6cf92fad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add company column to users table
    op.add_column('users', sa.Column('company', sa.String(100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove company column from users table
    op.drop_column('users', 'company')
