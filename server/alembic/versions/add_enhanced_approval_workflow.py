"""Add Enhanced Approval Workflow Tables

Revision ID: enhanced_approval_workflow_v1
Revises: leave_management_v1
Create Date: 2026-03-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'enhanced_approval_workflow_v1'
down_revision = 'leave_management_v1'  # Set to your last migration
branch_labels = None
depends_on = None


def upgrade():
    # ==================== APPROVAL WORKFLOWS ====================
    op.create_table('approval_workflows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('name_ar', sa.String(100), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('trigger_conditions', postgresql.JSON, default=dict),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('priority', sa.Integer, default=0),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_approval_workflows_name', 'approval_workflows', ['name'])
    op.create_index('ix_approval_workflows_is_active', 'approval_workflows', ['is_active'])

    # ==================== APPROVAL WORKFLOW STEPS ====================
    op.create_table('approval_workflow_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('approval_workflows.id'), nullable=False),
        sa.Column('step_order', sa.Integer, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('approver_type', sa.String(50), nullable=False, default='manager'),
        sa.Column('approver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approver_employee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.id'), nullable=True),
        sa.Column('auto_assign', sa.Boolean, default=True),
        sa.Column('allow_delegation', sa.Boolean, default=False),
        sa.Column('is_active', sa.Boolean, default=True),
    )
    op.create_index('ix_approval_workflow_steps_workflow', 'approval_workflow_steps', ['workflow_id'])
    op.create_index('ix_approval_workflow_steps_order', 'approval_workflow_steps', ['step_order'])

    # ==================== WORKFLOW EMPLOYEE GROUPS ====================
    op.create_table('workflow_employee_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('approval_workflows.id'), nullable=False),
        sa.Column('employee_ids', postgresql.JSON, default=list),
        sa.Column('department_ids', postgresql.JSON, default=list),
        sa.Column('employee_levels', postgresql.JSON, default=list),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_workflow_employee_groups_workflow', 'workflow_employee_groups', ['workflow_id'])

    # ==================== LEAVE REQUEST APPROVAL STEPS ====================
    op.create_table('leave_request_approval_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('leave_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('leave_requests.id'), nullable=False),
        sa.Column('current_step', sa.Integer, default=1),
        sa.Column('total_steps', sa.Integer, default=1),
        sa.Column('workflow_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('approval_workflows.id'), nullable=True),
        sa.Column('current_approver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approval_status', sa.String(20), default='pending'),
        sa.Column('step_history', postgresql.JSON, default=list),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_leave_request_approval_steps_request', 'leave_request_approval_steps', ['leave_request_id'])
    op.create_index('ix_leave_request_approval_steps_approver', 'leave_request_approval_steps', ['current_approver_id'])
    op.create_index('ix_leave_request_approval_steps_status', 'leave_request_approval_steps', ['approval_status'])


def downgrade():
    op.drop_table('leave_request_approval_steps')
    op.drop_table('workflow_employee_groups')
    op.drop_table('approval_workflow_steps')
    op.drop_table('approval_workflows')
