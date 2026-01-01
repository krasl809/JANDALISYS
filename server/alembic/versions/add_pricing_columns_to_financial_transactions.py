"""Add pricing columns to financial_transactions table

Revision ID: b23c45d67890
Revises: ad39d38fc82d
Create Date: 2024-12-11 17:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b23c45d67890'
down_revision: Union[str, None] = 'ad39d38fc82d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add new columns for partial pricing support."""
    # Add item_id column (foreign key to contract_items)
    op.add_column('financial_transactions', 
        sa.Column('item_id', sa.UUID(), nullable=True)
    )
    
    # Add qty_priced column
    op.add_column('financial_transactions', 
        sa.Column('qty_priced', sa.DECIMAL(10, 2), nullable=True)
    )
    
    # Add unit_price column
    op.add_column('financial_transactions', 
        sa.Column('unit_price', sa.DECIMAL(10, 2), nullable=True)
    )
    
    # Add foreign key constraint for item_id
    op.create_foreign_key(
        'fk_financial_transactions_item_id',
        'financial_transactions', 
        'contract_items',
        ['item_id'], 
        ['id']
    )


def downgrade() -> None:
    """Remove the new columns."""
    # Drop foreign key first
    op.drop_constraint('fk_financial_transactions_item_id', 'financial_transactions', type_='foreignkey')
    
    # Drop columns
    op.drop_column('financial_transactions', 'unit_price')
    op.drop_column('financial_transactions', 'qty_priced')
    op.drop_column('financial_transactions', 'item_id')
