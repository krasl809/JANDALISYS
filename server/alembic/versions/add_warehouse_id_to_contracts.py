"""Add warehouse_id column to contracts table

Revision ID: add_warehouse_id_to_contracts
Revises: 
Create Date: 2025-12-22 06:44:30.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_warehouse_id_to_contracts'
down_revision = 'create_warehouses_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add warehouse_id column to contracts table
    op.add_column('contracts', 
                  sa.Column('warehouse_id', 
                           postgresql.UUID(as_uuid=True), 
                           sa.ForeignKey('warehouses.id'), 
                           nullable=True))


def downgrade() -> None:
    # Remove warehouse_id column from contracts table
    op.drop_column('contracts', 'warehouse_id')