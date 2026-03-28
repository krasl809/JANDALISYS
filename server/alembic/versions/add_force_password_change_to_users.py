"""add_force_password_change_to_users

Revision ID: add_force_password_change
Revises: 4e13f59ffced
Create Date: 2026-03-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_force_password_change'
down_revision: Union[str, Sequence[str], None] = '4e13f59ffced'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add force_password_change column to users table
    op.add_column('users', sa.Column('force_password_change', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove force_password_change column from users table
    op.drop_column('users', 'force_password_change')
