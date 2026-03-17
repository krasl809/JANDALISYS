"""Add Leave Management System Tables

Revision ID: leave_management_v1
Revises: 
Create Date: 2026-03-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'leave_management_v1'
down_revision = None  # Set to your last migration
branch_labels = None
depends_on = None


def upgrade():
    # ==================== LEAVE TYPES ====================
    op.create_table('leave_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('name_ar', sa.String(100), nullable=True),
        sa.Column('code', sa.String(20), nullable=False, unique=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('max_days_per_year', sa.DECIMAL(5, 1), default=0),
        sa.Column('max_consecutive_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('min_advance_days', sa.Integer, default=0),
        sa.Column('max_advance_days', sa.Integer, default=0),
        sa.Column('requires_probation_completion', sa.Boolean, default=False),
        sa.Column('probation_months', sa.Integer, default=0),
        sa.Column('gender_specific', sa.String(20), nullable=True),
        sa.Column('is_accumulative', sa.Boolean, default=False),
        sa.Column('max_accumulation_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('accumulation_reset_month', sa.Integer, default=1),
        sa.Column('deduction_type', sa.String(20), default='full_day'),
        sa.Column('is_paid', sa.Boolean, default=True),
        sa.Column('payment_percentage', sa.DECIMAL(5, 2), default=100.00),
        sa.Column('requires_documents', sa.Boolean, default=False),
        sa.Column('document_types', postgresql.JSON, default=list),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_visible_to_employees', sa.Boolean, default=True),
        sa.Column('color', sa.String(7), default='#3B82F6'),
        sa.Column('requires_approval', sa.Boolean, default=True),
        sa.Column('approval_levels_required', sa.Integer, default=1),
        sa.Column('allow_carry_over', sa.Boolean, default=False),
        sa.Column('carry_over_expiry_months', sa.Integer, default=12),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_leave_types_code', 'leave_types', ['code'])
    
    # ==================== LEAVE POLICIES ====================
    op.create_table('leave_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('name_ar', sa.String(100), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('effective_from', sa.Date, nullable=False),
        sa.Column('effective_to', sa.Date, nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('default_annual_leave_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('max_leave_balance_warning_days', sa.DECIMAL(5, 1), default=5),
        sa.Column('work_year_start_month', sa.Integer, default=1),
        sa.Column('work_year_start_day', sa.Integer, default=1),
        sa.Column('exclude_weekends_from_leave', sa.Boolean, default=True),
        sa.Column('exclude_holidays_from_leave', sa.Boolean, default=True),
        sa.Column('round_leave_days', sa.Boolean, default=False),
        sa.Column('round_method', sa.String(20), default='ceil'),
        sa.Column('allow_leave_encashment', sa.Boolean, default=False),
        sa.Column('max_encashment_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('encashment_multiplier', sa.DECIMAL(5, 2), default=1.0),
        sa.Column('auto_approve_after_days', sa.Integer, default=0),
        sa.Column('allow_employee_cancel', sa.Boolean, default=True),
        sa.Column('cancellation_deadline_days', sa.Integer, default=0),
        sa.Column('reset_balance_on_calendar_year', sa.Boolean, default=True),
        sa.Column('reset_balance_on_work_year', sa.Boolean, default=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # ==================== EMPLOYEE LEAVE BALANCES ====================
    op.create_table('employee_leave_balances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('leave_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_types.id'), nullable=False),
        sa.Column('allocated_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('used_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('pending_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('remaining_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('carried_over_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('encashed_days', sa.DECIMAL(5, 1), default=0),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('last_updated', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_employee_leave_balances_employee', 'employee_leave_balances', ['employee_id'])
    op.create_index('ix_employee_leave_balances_year', 'employee_leave_balances', ['year'])
    op.create_unique_constraint('uq_employee_leave_balance', 'employee_leave_balances', ['employee_id', 'leave_type_id', 'year'])
    
    # ==================== APPROVAL CHAINS ====================
    op.create_table('approval_chains',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('name_ar', sa.String(100), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('trigger_conditions', postgresql.JSON, default=dict),
        sa.Column('level_1_approver_type', sa.String(50), default='manager'),
        sa.Column('level_1_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_2_approver_type', sa.String(50), nullable=True),
        sa.Column('level_2_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_3_approver_type', sa.String(50), nullable=True),
        sa.Column('level_3_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('priority', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # ==================== LEAVE REQUESTS ====================
    op.create_table('leave_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('request_number', sa.String(50), nullable=False, unique=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('leave_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_types.id'), nullable=False),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date, nullable=False),
        sa.Column('start_time', sa.String(10), nullable=True),
        sa.Column('end_time', sa.String(10), nullable=True),
        sa.Column('total_days', sa.DECIMAL(5, 1), nullable=False),
        sa.Column('deduction_days', sa.DECIMAL(5, 1), nullable=False),
        sa.Column('is_half_day', sa.Boolean, default=False),
        sa.Column('is_hourly', sa.Boolean, default=False),
        sa.Column('hours_requested', sa.DECIMAL(5, 2), default=0),
        sa.Column('reason', sa.Text, nullable=True),
        sa.Column('destination', sa.String(255), nullable=True),
        sa.Column('contact_number', sa.String(50), nullable=True),
        sa.Column('documents', postgresql.JSON, default=list),
        sa.Column('document_descriptions', postgresql.JSON, default=list),
        sa.Column('status', sa.String(30), default='draft'),
        
        # Level 1 Approval
        sa.Column('level_1_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_1_approved_at', sa.DateTime, nullable=True),
        sa.Column('level_1_approved', sa.Boolean, default=False),
        sa.Column('level_1_notes', sa.Text, nullable=True),
        sa.Column('level_1_rejected_reason', sa.Text, nullable=True),
        
        # Level 2 Approval
        sa.Column('level_2_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_2_approved_at', sa.DateTime, nullable=True),
        sa.Column('level_2_approved', sa.Boolean, default=False),
        sa.Column('level_2_notes', sa.Text, nullable=True),
        sa.Column('level_2_rejected_reason', sa.Text, nullable=True),
        
        # Level 3 Approval
        sa.Column('level_3_approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_3_approved_at', sa.DateTime, nullable=True),
        sa.Column('level_3_approved', sa.Boolean, default=False),
        sa.Column('level_3_notes', sa.Text, nullable=True),
        sa.Column('level_3_rejected_reason', sa.Text, nullable=True),
        
        # Final Approval (backward compatibility)
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('approval_notes', sa.Text, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        
        # Handover
        sa.Column('handover_to_employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('handover_notes', sa.Text, nullable=True),
        sa.Column('handover_completed', sa.Boolean, default=False),
        sa.Column('replacement_employee_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        # Cancellation
        sa.Column('cancelled_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime, nullable=True),
        sa.Column('cancellation_reason', sa.Text, nullable=True),
        
        # Expiry
        sa.Column('expires_at', sa.DateTime, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_leave_requests_request_number', 'leave_requests', ['request_number'])
    op.create_index('ix_leave_requests_employee_id', 'leave_requests', ['employee_id'])
    op.create_index('ix_leave_requests_status', 'leave_requests', ['status'])
    op.create_index('ix_leave_requests_start_date', 'leave_requests', ['start_date'])
    
    # ==================== LEAVE ENTITLEMENTS ====================
    op.create_table('leave_entitlements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id'), nullable=False),
        sa.Column('leave_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_types.id'), nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('allocated_days', sa.DECIMAL(5, 1), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('is_carry_over', sa.Boolean, default=False),
        sa.Column('is_adjustment', sa.Boolean, default=False),
        sa.Column('adjustment_reason', sa.Text, nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_leave_entitlements_employee', 'leave_entitlements', ['employee_id'])
    op.create_index('ix_leave_entitlements_year', 'leave_entitlements', ['year'])
    
    # ==================== LEAVE APPROVAL HISTORY ====================
    op.create_table('leave_approval_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('leave_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_requests.id'), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('level', sa.Integer, nullable=True),
        sa.Column('previous_status', sa.String(30), nullable=True),
        sa.Column('new_status', sa.String(30), nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_leave_approval_history_request', 'leave_approval_history', ['leave_request_id'])
    
    # ==================== LEAVE CALENDAR ====================
    op.create_table('leave_calendars',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('leave_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_requests.id'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('is_holiday', sa.Boolean, default=False),
        sa.Column('is_weekend', sa.Boolean, default=False),
    )
    op.create_index('ix_leave_calendars_date', 'leave_calendars', ['date'])
    
    # ==================== PUBLIC HOLIDAYS ====================
    op.create_table('public_holidays',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('name_ar', sa.String(100), nullable=True),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('end_date', sa.Date, nullable=True),
        sa.Column('is_recurring', sa.Boolean, default=True),
        sa.Column('country', sa.String(100), default='General'),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('is_paid', sa.Boolean, default=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('color', sa.String(7), default='#EF4444'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_public_holidays_date', 'public_holidays', ['date'])
    
    # ==================== LEAVE REPORTS ====================
    op.create_table('leave_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('report_type', sa.String(50), nullable=False),
        sa.Column('from_date', sa.Date, nullable=False),
        sa.Column('to_date', sa.Date, nullable=False),
        sa.Column('department_ids', postgresql.JSON, default=list),
        sa.Column('employee_ids', postgresql.JSON, default=list),
        sa.Column('leave_type_ids', postgresql.JSON, default=list),
        sa.Column('generated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('generated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('file_path', sa.String(500), nullable=True),
    )


def downgrade():
    op.drop_table('leave_reports')
    op.drop_table('public_holidays')
    op.drop_table('leave_calendars')
    op.drop_table('leave_approval_history')
    op.drop_table('leave_entitlements')
    op.drop_table('leave_requests')
    op.drop_table('approval_chains')
    op.drop_table('employee_leave_balances')
    op.drop_table('leave_policies')
    op.drop_table('leave_types')
