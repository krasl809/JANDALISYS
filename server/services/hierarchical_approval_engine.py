"""
Hierarchical Approval Engine
Multi-level approval workflow for leave management
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class HierarchicalApprovalEngine:
    """Engine for managing hierarchical approval workflow"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_approval_chain(self, employee_id: uuid.UUID) -> List[Dict]:
        """
        Get approval chain for an employee based on their hierarchy
        
        Args:
            employee_id: Employee UUID
            
        Returns:
            list: List of approval levels with approver info
        """
        from models.employee_models import Employee
        
        employee = self.db.query(Employee).filter(
            Employee.id == employee_id
        ).first()
        
        if not employee:
            raise ValueError("الموظف غير موجود")
        
        approval_chain = []
        
        # Level 1: Direct Supervisor
        if employee.direct_supervisor_id:
            approval_chain.append({
                'level': 1,
                'approver_id': employee.direct_supervisor_id,
                'approver_type': 'direct_supervisor',
                'title': 'المسؤول المباشر',
                'title_en': 'Direct Supervisor'
            })
        
        # Level 2: Department Manager
        if employee.department_manager_id:
            approval_chain.append({
                'level': 2,
                'approver_id': employee.department_manager_id,
                'approver_type': 'department_manager',
                'title': 'مدير القسم',
                'title_en': 'Department Manager'
            })
        
        # Level 3: Facility Manager
        if employee.facility_manager_id:
            approval_chain.append({
                'level': 3,
                'approver_id': employee.facility_manager_id,
                'approver_type': 'facility_manager',
                'title': 'مدير المنشأة',
                'title_en': 'Facility Manager'
            })
        
        # Level 4: HR Manager
        if employee.hr_manager_id:
            approval_chain.append({
                'level': 4,
                'approver_id': employee.hr_manager_id,
                'approver_type': 'hr_manager',
                'title': 'مدير الموارد البشرية',
                'title_en': 'HR Manager'
            })
        
        # Level 5: Executive Manager (General Administration only)
        if employee.is_general_admin and employee.executive_manager_id:
            approval_chain.append({
                'level': 5,
                'approver_id': employee.executive_manager_id,
                'approver_type': 'executive_manager',
                'title': 'المدير التنفيذي',
                'title_en': 'Executive Manager'
            })
        
        return approval_chain
    
    def submit_leave_request(self, leave_request_id: uuid.UUID) -> Dict:
        """
        Submit leave request and start approval workflow
        
        Args:
            leave_request_id: Leave request UUID
            
        Returns:
            dict: Submission result
        """
        from models.leave_models import LeaveRequest
        from models.hierarchical_approval_models import LeaveRequestApproval, ApprovalStatus
        
        leave_request = self.db.query(LeaveRequest).filter(
            LeaveRequest.id == leave_request_id
        ).first()
        
        if not leave_request:
            raise ValueError("طلب الإجازة غير موجود")
        
        # Get approval chain
        approval_chain = self.get_approval_chain(leave_request.employee_id)
        
        if not approval_chain:
            raise ValueError("لا يوجد مسار موافقات محدد للموظف")
        
        # Create approval steps
        for approval in approval_chain:
            approval_step = LeaveRequestApproval(
                id=uuid.uuid4(),
                leave_request_id=leave_request_id,
                approver_id=approval['approver_id'],
                approval_level=approval['level'],
                approver_type=approval['approver_type'],
                status=ApprovalStatus.PENDING
            )
            self.db.add(approval_step)
        
        # Update leave request status
        leave_request.status = 'pending'
        leave_request.current_approval_level = 1
        leave_request.submitted_at = datetime.now()
        
        # Add to approval history
        self._add_approval_history(
            leave_request_id=leave_request_id,
            actor_id=leave_request.employee_id,
            action='submit',
            level=0,
            previous_status='draft',
            new_status='pending',
            notes='تم تقديم الطلب'
        )
        
        self.db.commit()
        
        # Send notification to first approver
        first_approver = approval_chain[0]
        self._send_approval_notification(
            leave_request_id=leave_request_id,
            approver_id=first_approver['approver_id'],
            level=1
        )
        
        return {
            'success': True,
            'message': 'تم تقديم الطلب بنجاح',
            'request_number': leave_request.request_number,
            'current_level': 1,
            'next_approver_id': str(first_approver['approver_id']),
            'next_approver_title': first_approver['title'],
            'total_levels': len(approval_chain)
        }
    
    def approve_leave_request(
        self,
        leave_request_id: uuid.UUID,
        approver_id: uuid.UUID,
        approved: bool,
        notes: Optional[str] = None
    ) -> Dict:
        """
        Approve or reject leave request at current level
        
        Args:
            leave_request_id: Leave request UUID
            approver_id: Approver UUID
            approved: Whether approved or rejected
            notes: Optional notes
            
        Returns:
            dict: Approval result
        """
        from models.leave_models import LeaveRequest
        from models.hierarchical_approval_models import LeaveRequestApproval, ApprovalStatus
        
        leave_request = self.db.query(LeaveRequest).filter(
            LeaveRequest.id == leave_request_id
        ).first()
        
        if not leave_request:
            raise ValueError("طلب الإجازة غير موجود")
        
        # Get current approval step
        current_step = self.db.query(LeaveRequestApproval).filter(
            and_(
                LeaveRequestApproval.leave_request_id == leave_request_id,
                LeaveRequestApproval.approver_id == approver_id,
                LeaveRequestApproval.status == ApprovalStatus.PENDING
            )
        ).first()
        
        if not current_step:
            raise ValueError("ليس لديك صلاحية الموافقة على هذا الطلب")
        
        # Update approval step
        current_step.status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        current_step.approved_at = datetime.now()
        current_step.notes = notes
        
        if not approved:
            current_step.rejection_reason = notes
        
        previous_status = leave_request.status
        
        if approved:
            # Check if there are more approval levels
            approval_chain = self.get_approval_chain(leave_request.employee_id)
            
            if current_step.approval_level < len(approval_chain):
                # Move to next level
                next_level = current_step.approval_level + 1
                leave_request.status = f'approved_level_{current_step.approval_level}'
                leave_request.current_approval_level = next_level
                new_status = leave_request.status
                
                # Send notification to next approver
                next_approver = next(
                    (a for a in approval_chain if a['level'] == next_level),
                    None
                )
                
                if next_approver:
                    self._send_approval_notification(
                        leave_request_id=leave_request_id,
                        approver_id=next_approver['approver_id'],
                        level=next_level
                    )
            else:
                # Final approval
                leave_request.status = 'approved'
                leave_request.approved_by = approver_id
                leave_request.approved_at = datetime.now()
                new_status = 'approved'
                
                # Send final approval notification
                self._send_final_approval_notification(leave_request_id)
        else:
            # Rejection
            leave_request.status = 'rejected'
            leave_request.rejection_reason = notes
            new_status = 'rejected'
            
            # Send rejection notification
            self._send_rejection_notification(leave_request_id, notes)
        
        # Add to approval history
        self._add_approval_history(
            leave_request_id=leave_request_id,
            actor_id=approver_id,
            action='approve' if approved else 'reject',
            level=current_step.approval_level,
            previous_status=previous_status,
            new_status=new_status,
            notes=notes
        )
        
        self.db.commit()
        
        return {
            'success': True,
            'message': 'تمت الموافقة بنجاح' if approved else 'تم الرفض',
            'status': new_status,
            'current_level': leave_request.current_approval_level,
            'is_final': leave_request.status in ['approved', 'rejected']
        }
    
    def get_pending_approvals(self, approver_id: uuid.UUID) -> List[Dict]:
        """
        Get all pending approvals for an approver
        
        Args:
            approver_id: Approver UUID
            
        Returns:
            list: List of pending approvals
        """
        from models.leave_models import LeaveRequest
        from models.employee_models import Employee
        from models.hierarchical_approval_models import LeaveRequestApproval, ApprovalStatus
        
        pending_approvals = self.db.query(LeaveRequestApproval).filter(
            and_(
                LeaveRequestApproval.approver_id == approver_id,
                LeaveRequestApproval.status == ApprovalStatus.PENDING
            )
        ).all()
        
        result = []
        for approval in pending_approvals:
            leave_request = self.db.query(LeaveRequest).filter(
                LeaveRequest.id == approval.leave_request_id
            ).first()
            
            if leave_request:
                employee = self.db.query(Employee).filter(
                    Employee.id == leave_request.employee_id
                ).first()
                
                result.append({
                    'approval_id': str(approval.id),
                    'leave_request_id': str(leave_request.id),
                    'request_number': leave_request.request_number,
                    'employee_name': employee.full_name if employee else 'Unknown',
                    'employee_code': employee.code if employee else 'Unknown',
                    'leave_type': leave_request.leave_type.name if leave_request.leave_type else 'Unknown',
                    'start_date': leave_request.start_date.isoformat(),
                    'end_date': leave_request.end_date.isoformat(),
                    'total_days': float(leave_request.total_days),
                    'reason': leave_request.reason,
                    'approval_level': approval.approval_level,
                    'approver_type': approval.approver_type,
                    'created_at': approval.created_at.isoformat()
                })
        
        return result
    
    def get_approval_history(self, leave_request_id: uuid.UUID) -> List[Dict]:
        """
        Get approval history for a leave request
        
        Args:
            leave_request_id: Leave request UUID
            
        Returns:
            list: Approval history
        """
        from models.leave_models import LeaveApprovalHistory
        from models.employee_models import Employee
        
        history = self.db.query(LeaveApprovalHistory).filter(
            LeaveApprovalHistory.leave_request_id == leave_request_id
        ).order_by(LeaveApprovalHistory.created_at.asc()).all()
        
        result = []
        for entry in history:
            actor = self.db.query(Employee).filter(
                Employee.id == entry.actor_id
            ).first()
            
            result.append({
                'id': str(entry.id),
                'actor_name': actor.full_name if actor else 'Unknown',
                'action': entry.action,
                'level': entry.level,
                'previous_status': entry.previous_status,
                'new_status': entry.new_status,
                'notes': entry.notes,
                'created_at': entry.created_at.isoformat()
            })
        
        return result
    
    def _add_approval_history(
        self,
        leave_request_id: uuid.UUID,
        actor_id: uuid.UUID,
        action: str,
        level: int,
        previous_status: str,
        new_status: str,
        notes: Optional[str] = None
    ):
        """Add entry to approval history"""
        
        from models.leave_models import LeaveApprovalHistory
        
        history = LeaveApprovalHistory(
            id=uuid.uuid4(),
            leave_request_id=leave_request_id,
            actor_id=actor_id,
            action=action,
            level=level,
            previous_status=previous_status,
            new_status=new_status,
            notes=notes
        )
        
        self.db.add(history)
    
    def _send_approval_notification(
        self,
        leave_request_id: uuid.UUID,
        approver_id: uuid.UUID,
        level: int
    ):
        """Send notification to approver"""
        
        try:
            from services.notification_service import NotificationService
            from models.leave_models import LeaveRequest
            from models.employee_models import Employee
            
            notification_service = NotificationService(self.db)
            
            leave_request = self.db.query(LeaveRequest).filter(
                LeaveRequest.id == leave_request_id
            ).first()
            
            employee = self.db.query(Employee).filter(
                Employee.id == leave_request.employee_id
            ).first()
            
            # Get approver's user_id
            approver = self.db.query(Employee).filter(
                Employee.id == approver_id
            ).first()
            
            if approver and approver.user_id:
                title = "طلب إجازة جديد بانتظار الموافقة"
                message = f"""
                الموظف: {employee.full_name}
                الرقم الوظيفي: {employee.code}
                نوع الإجازة: {leave_request.leave_type.name if leave_request.leave_type else 'غير محدد'}
                من: {leave_request.start_date}
                إلى: {leave_request.end_date}
                عدد الأيام: {leave_request.total_days}
                
                مستوى الموافقة: {level}
                
                يرجى مراجعة الطلب والموافقة أو الرفض.
                """
                
                notification_service.send_notification(
                    user_id=approver.user_id,
                    title=title,
                    message=message,
                    notification_type='approval_required',
                    related_id=leave_request_id,
                    related_type='leave_request'
                )
                
                logger.info(f"Sent approval notification to {approver.full_name} for level {level}")
        
        except Exception as e:
            logger.error(f"Error sending approval notification: {str(e)}")
    
    def _send_final_approval_notification(self, leave_request_id: uuid.UUID):
        """Send final approval notification to employee"""
        
        try:
            from services.notification_service import NotificationService
            from models.leave_models import LeaveRequest
            from models.employee_models import Employee
            
            notification_service = NotificationService(self.db)
            
            leave_request = self.db.query(LeaveRequest).filter(
                LeaveRequest.id == leave_request_id
            ).first()
            
            employee = self.db.query(Employee).filter(
                Employee.id == leave_request.employee_id
            ).first()
            
            if employee and employee.user_id:
                title = "تمت الموافقة على طلب الإجازة"
                message = f"""
                تمت الموافقة على طلب الإجازة الخاص بك:
                
                نوع الإجازة: {leave_request.leave_type.name if leave_request.leave_type else 'غير محدد'}
                من: {leave_request.start_date}
                إلى: {leave_request.end_date}
                عدد الأيام: {leave_request.total_days}
                
                يمكنك الآن الاطمئنان على إجازتك.
                """
                
                notification_service.send_notification(
                    user_id=employee.user_id,
                    title=title,
                    message=message,
                    notification_type='approval_result',
                    related_id=leave_request_id,
                    related_type='leave_request'
                )
                
                logger.info(f"Sent final approval notification to {employee.full_name}")
        
        except Exception as e:
            logger.error(f"Error sending final approval notification: {str(e)}")
    
    def _send_rejection_notification(
        self,
        leave_request_id: uuid.UUID,
        rejection_reason: Optional[str] = None
    ):
        """Send rejection notification to employee"""
        
        try:
            from services.notification_service import NotificationService
            from models.leave_models import LeaveRequest
            from models.employee_models import Employee
            
            notification_service = NotificationService(self.db)
            
            leave_request = self.db.query(LeaveRequest).filter(
                LeaveRequest.id == leave_request_id
            ).first()
            
            employee = self.db.query(Employee).filter(
                Employee.id == leave_request.employee_id
            ).first()
            
            if employee and employee.user_id:
                title = "تم رفض طلب الإجازة"
                message = f"""
                تم رفض طلب الإجازة الخاص بك:
                
                نوع الإجازة: {leave_request.leave_type.name if leave_request.leave_type else 'غير محدد'}
                من: {leave_request.start_date}
                إلى: {leave_request.end_date}
                
                السبب: {rejection_reason or 'غير محدد'}
                
                يمكنك التواصل مع مدير الموارد البشرية للمزيد من المعلومات.
                """
                
                notification_service.send_notification(
                    user_id=employee.user_id,
                    title=title,
                    message=message,
                    notification_type='approval_result',
                    related_id=leave_request_id,
                    related_type='leave_request'
                )
                
                logger.info(f"Sent rejection notification to {employee.full_name}")
        
        except Exception as e:
            logger.error(f"Error sending rejection notification: {str(e)}")
