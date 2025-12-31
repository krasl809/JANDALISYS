"""Add performance indexes for contracts system

Revision ID: add_performance_indexes
Revises: 
Create Date: 2025-12-21T05:36:20.000Z

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_performance_indexes'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Add critical indexes for performance optimization"""
    
    # Contract table indexes
    op.create_index('idx_contracts_status', 'contracts', ['status'])
    op.create_index('idx_contracts_direction', 'contracts', ['direction'])
    op.create_index('idx_contracts_modified_date', 'contracts', ['modified_date'])
    op.create_index('idx_contracts_seller_id', 'contracts', ['seller_id'])
    op.create_index('idx_contracts_buyer_id', 'contracts', ['buyer_id'])
    op.create_index('idx_contracts_contract_no', 'contracts', ['contract_no'])
    
    # Contract items indexes
    op.create_index('idx_contract_items_contract_id', 'contract_items', ['contract_id'])
    op.create_index('idx_contract_items_article_id', 'contract_items', ['article_id'])
    
    # Financial transactions indexes (critical for ledger queries)
    op.create_index('idx_financial_transactions_contract_id', 'financial_transactions', ['contract_id'])
    op.create_index('idx_financial_transactions_date', 'financial_transactions', ['transaction_date'])
    op.create_index('idx_financial_transactions_type', 'financial_transactions', ['type'])
    op.create_index('idx_financial_transactions_item_id', 'financial_transactions', ['item_id'])
    
    # Related table indexes
    op.create_index('idx_sellers_seller_code', 'sellers', ['seller_code'])
    op.create_index('idx_buyers_contact_name', 'buyers', ['contact_name'])
    op.create_index('idx_articles_article_name', 'articles', ['article_name'])
    
    # Compound indexes for common query patterns
    op.create_index('idx_contracts_status_direction', 'contracts', ['status', 'direction'])
    op.create_index('idx_contracts_created_by_status', 'contracts', ['created_by', 'status'])

def downgrade():
    """Remove performance indexes"""
    
    # Drop compound indexes first
    op.drop_index('idx_contracts_created_by_status', table_name='contracts')
    op.drop_index('idx_contracts_status_direction', table_name='contracts')
    
    # Drop main indexes
    op.drop_index('idx_articles_article_name', table_name='articles')
    op.drop_index('idx_buyers_contact_name', table_name='buyers')
    op.drop_index('idx_sellers_seller_code', table_name='sellers')
    
    # Drop financial transactions indexes
    op.drop_index('idx_financial_transactions_item_id', table_name='financial_transactions')
    op.drop_index('idx_financial_transactions_type', table_name='financial_transactions')
    op.drop_index('idx_financial_transactions_date', table_name='financial_transactions')
    op.drop_index('idx_financial_transactions_contract_id', table_name='financial_transactions')
    
    # Drop contract items indexes
    op.drop_index('idx_contract_items_article_id', table_name='contract_items')
    op.drop_index('idx_contract_items_contract_id', table_name='contract_items')
    
    # Drop contract indexes
    op.drop_index('idx_contracts_contract_no', table_name='contracts')
    op.drop_index('idx_contracts_buyer_id', table_name='contracts')
    op.drop_index('idx_contracts_seller_id', table_name='contracts')
    op.drop_index('idx_contracts_modified_date', table_name='contracts')
    op.drop_index('idx_contracts_direction', table_name='contracts')
    op.drop_index('idx_contracts_status', table_name='contracts')