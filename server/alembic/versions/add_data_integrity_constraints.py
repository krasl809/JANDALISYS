"""Add data integrity constraints and fix inconsistencies

Revision ID: add_data_integrity_constraints
Revises: add_performance_indexes
Create Date: 2025-12-21T05:38:50.000Z

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_data_integrity_constraints'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None

def upgrade():
    """Add data integrity constraints and fix inconsistencies"""
    
    # Add foreign key constraints with proper CASCADE/RESTRICT rules
    op.create_foreign_key(
        'fk_contracts_seller', 
        'contracts', 'sellers',
        ['seller_id'], ['id'], 
        ondelete='RESTRICT', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_buyer', 
        'contracts', 'buyers',
        ['buyer_id'], ['id'], 
        ondelete='RESTRICT', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_shipper', 
        'contracts', 'shippers',
        ['shipper_id'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_broker', 
        'contracts', 'brokers',
        ['broker_id'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_agent', 
        'contracts', 'agents',
        ['agent_id'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_conveyor', 
        'contracts', 'conveyors',
        ['conveyor_id'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_created_by', 
        'contracts', 'users',
        ['created_by'], ['id'], 
        ondelete='RESTRICT', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_posted_by', 
        'contracts', 'users',
        ['posted_by'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contracts_finance_notified_by', 
        'contracts', 'users',
        ['finance_notified_by'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    # Contract items constraints
    op.create_foreign_key(
        'fk_contract_items_contract', 
        'contract_items', 'contracts',
        ['contract_id'], ['id'], 
        ondelete='CASCADE', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_contract_items_article', 
        'contract_items', 'articles',
        ['article_id'], ['id'], 
        ondelete='RESTRICT', onupdate='CASCADE'
    )
    
    # Financial transactions constraints
    op.create_foreign_key(
        'fk_financial_transactions_contract', 
        'financial_transactions', 'contracts',
        ['contract_id'], ['id'], 
        ondelete='CASCADE', onupdate='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_financial_transactions_item', 
        'financial_transactions', 'contract_items',
        ['item_id'], ['id'], 
        ondelete='SET NULL', onupdate='CASCADE'
    )
    
    # Add check constraints for data consistency
    
    # Contract status validation
    op.create_check_constraint(
        'chk_contracts_status_valid',
        'contracts',
        "status IN ('draft', 'posted', 'confirmed', 'completed', 'cancelled', 'pricing_pending')"
    )
    
    # Contract direction validation
    op.create_check_constraint(
        'chk_contracts_direction_valid',
        'contracts',
        "direction IN ('import', 'export')"
    )
    
    # Contract type validation
    op.create_check_constraint(
        'chk_contracts_contract_type_valid',
        'contracts',
        "contract_type IN ('fixed_price', 'stock_market')"
    )
    
    # Pricing status validation
    op.create_check_constraint(
        'chk_contracts_pricing_status_valid',
        'contracts',
        "pricing_status IN ('pending', 'approved', 'rejected')"
    )
    
    # Financial transaction type validation
    op.create_check_constraint(
        'chk_financial_transactions_type_valid',
        'financial_transactions',
        "type IN ('Invoice', 'Payment', 'Debit Note', 'Credit Note', 'Partial Pricing', 'Pricing Adjustment')"
    )
    
    # Ensure positive amounts
    op.create_check_constraint(
        'chk_financial_transactions_positive_amount',
        'financial_transactions',
        "amount > 0"
    )
    
    # Ensure positive quantities
    op.create_check_constraint(
        'chk_contract_items_positive_qty',
        'contract_items',
        "(quantity IS NULL OR quantity > 0) AND (qty_lot IS NULL OR qty_lot > 0) AND (qty_ton IS NULL OR qty_ton > 0)"
    )
    
    # Ensure positive prices
    op.create_check_constraint(
        'chk_contract_items_positive_price',
        'contract_items',
        "(price IS NULL OR price >= 0) AND (premium IS NULL OR premium >= 0)"
    )
    
    # Currency code validation (ISO 4217)
    op.create_check_constraint(
        'chk_contracts_currency_valid',
        'contracts',
        "contract_currency ~ '^[A-Z]{3}$'"
    )
    
    # Ensure contract numbers are properly formatted
    op.create_check_constraint(
        'chk_contracts_contract_no_format',
        'contracts',
        "contract_no IS NULL OR contract_no ~ '^[A-Z0-9]{4}[0-9]{6}[0-9]{4}$'"
    )

def downgrade():
    """Remove data integrity constraints"""
    
    # Drop check constraints
    op.drop_constraint('chk_contracts_contract_no_format', 'contracts', type_='check')
    op.drop_constraint('chk_contracts_currency_valid', 'contracts', type_='check')
    op.drop_constraint('chk_contract_items_positive_price', 'contract_items', type_='check')
    op.drop_constraint('chk_contract_items_positive_qty', 'contract_items', type_='check')
    op.drop_constraint('chk_financial_transactions_positive_amount', 'financial_transactions', type_='check')
    op.drop_constraint('chk_financial_transactions_type_valid', 'financial_transactions', type_='check')
    op.drop_constraint('chk_contracts_pricing_status_valid', 'contracts', type_='check')
    op.drop_constraint('chk_contracts_contract_type_valid', 'contracts', type_='check')
    op.drop_constraint('chk_contracts_direction_valid', 'contracts', type_='check')
    op.drop_constraint('chk_contracts_status_valid', 'contracts', type_='check')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_financial_transactions_item', 'financial_transactions', type_='foreignkey')
    op.drop_constraint('fk_financial_transactions_contract', 'financial_transactions', type_='foreignkey')
    op.drop_constraint('fk_contract_items_article', 'contract_items', type_='foreignkey')
    op.drop_constraint('fk_contract_items_contract', 'contract_items', type_='foreignkey')
    op.drop_constraint('fk_contracts_finance_notified_by', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_posted_by', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_created_by', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_conveyor', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_agent', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_broker', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_shipper', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_buyer', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_seller', 'contracts', type_='foreignkey')