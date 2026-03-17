"""
Survey Admin Router for PulseFlow - Dynamic Enterprise Survey Management System

This module contains all admin endpoints for survey management:
- CRUD operations for surveys
- Response management
- Analytics endpoints
- Export functionality
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from core.database import get_db
from models.survey_models import Survey as SurveyModel, SurveyQuestion as SurveyQuestionModel, SurveyResponse as SurveyResponseModel, Answer, SurveyTemplate, SurveyStatus, QuestionType
from models.core_models import User
from core.auth import get_current_user, require_permission
from crud import rbac_crud
from schemas.survey_schemas import (
    SurveyCreate, SurveyUpdate, Survey, SurveyList, SurveyWithQuestions,
    SurveyResponseCreate, SurveyResponse, SurveyResponseList,
    SurveyAnalytics, QuestionAnalytics, SurveyTemplateCreate, SurveyTemplate,
    PaginatedSurveyList, PaginatedResponseList, SurveyStatusEnum,
    SurveyQuestion, SurveyQuestionCreate, SurveyQuestionUpdate
)
from typing import List, Optional
import uuid
import logging
import json
import csv
import io
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Permissions
PERM_MANAGE_SURVEYS = "manage_surveys"
PERM_VIEW_SURVEY_ANALYTICS = "view_survey_analytics"

router = APIRouter(prefix="/surveys", tags=["Survey Management"])


def get_current_user_or_admin(db: Session, current_user: User):
    """
    Custom dependency that allows admins to bypass permission checks.
    """
    # Check if user is admin via role field (case-insensitive)
    if current_user.role and current_user.role.lower() == "admin":
        return current_user
    
    # Check if user has admin role in RBAC system
    try:
        user_roles = rbac_crud.get_user_roles(db, current_user.id)
        if any(role.lower() == "admin" for role in user_roles):
            return current_user
    except:
        pass
    
    # Check if user has manage_surveys permission
    has_perm, msg = rbac_crud.check_user_permission(db, current_user.id, PERM_MANAGE_SURVEYS)
    if not has_perm:
        raise HTTPException(
            status_code=403,
            detail=f"Operation not permitted. Required: {PERM_MANAGE_SURVEYS}"
        )
    
    return current_user


# ============== Survey CRUD ==============

@router.post("", response_model=Survey)
def create_survey(
    data: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new survey with optional questions.
    Admin users can always create surveys.
    """
    # Check if user is admin or has permission
    get_current_user_or_admin(db, current_user)
    
    try:
        new_survey = SurveyModel(
            title=data.title,
            description=data.description,
            status=SurveyStatus.DRAFT,
            settings=data.settings if data.settings else {},
            created_by=current_user.id
        )
        db.add(new_survey)
        db.flush()
        
        if data.questions:
            for idx, q_data in enumerate(data.questions):
                question = SurveyQuestionModel(
                    survey_id=new_survey.id,
                    question_text=q_data.question_text,
                    question_type=q_data.question_type,
                    help_text=q_data.help_text,
                    order_index=idx,
                    is_required=q_data.is_required,
                    options=q_data.options if q_data.options else [],
                    validation_rules=q_data.validation_rules if q_data.validation_rules else {},
                    conditional_logic=q_data.conditional_logic
                )
                db.add(question)
        
        db.commit()
        db.refresh(new_survey)
        logger.info(f"Survey created successfully: {new_survey.id}")
        return new_survey
    except Exception as e:
        logger.error(f"Error creating survey: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("", response_model=PaginatedSurveyList)
def list_surveys(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[SurveyStatusEnum] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all surveys with pagination and filtering.
    """
    try:
        query = db.query(SurveyModel)
        
        if status:
            query = query.filter(SurveyModel.status == status.value)
            
        if search:
            search_filter = or_(
                SurveyModel.title.ilike(f"%{search}%"),
                SurveyModel.description.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
            
        total = query.count()
        offset = (page - 1) * limit
        surveys = query.offset(offset).limit(limit).all()
        
        return PaginatedSurveyList(
            items=[SurveyList.model_validate(survey) for survey in surveys],
            total=total,
            page=page,
            limit=limit,
            pages=(total + limit - 1) // limit
        )
    except Exception as e:
        logger.error(f"Error listing surveys: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{survey_id}", response_model=Survey)
def get_survey(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a survey by ID for editing.
    """
    try:
        logger.info(f"Fetching survey {survey_id} for user {current_user.id}")
        
        # Use outerjoin to ensure we get the survey even if it has no questions
        # SQLAlchemy 1.4/2.0 compatibility: Query.unique() might not exist in older versions or Legacy Query
        # We can just use distinct() or rely on identity map if we iterate, but first() is what we need.
        # However, joinedload can result in multiple rows.
        # Let's remove .unique() call if it's causing issues with the current SQLAlchemy version used in this project.
        survey = db.query(SurveyModel).options(
            joinedload(SurveyModel.questions)
        ).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            logger.warning(f"Survey {survey_id} not found in database")
            raise HTTPException(status_code=404, detail="Survey not found")
        
        logger.info(f"Found survey {survey.id} with {len(survey.questions)} questions")
        
        # Sort questions by order_index
        sorted_questions = sorted(survey.questions, key=lambda x: x.order_index)
        
        # Build response with all fields
        # Get additional fields from settings JSON
        settings = survey.settings or {}
        
        # Safely construct the response
        return Survey(
            id=survey.id,
            title=survey.title,
            title_ar=settings.get('title_ar'),
            description=survey.description,
            description_ar=settings.get('description_ar'),
            status=survey.status,
            settings=survey.settings or {},
            logo_url=survey.logo_url,
            primary_color=survey.primary_color,
            company_name=survey.company_name,
            show_company_name=survey.show_company_name,
            closes_at=survey.closes_at,
            welcome_message=settings.get('welcome_message'),
            welcome_message_ar=settings.get('welcome_message_ar'),
            thank_you_message=settings.get('thank_you_message'),
            thank_you_message_ar=settings.get('thank_you_message_ar'),
            is_anonymous_allowed=settings.get('is_anonymous_allowed', True),
            is_draft_autosave=settings.get('is_draft_autosave', True),
            created_by=survey.created_by,
            created_at=survey.created_at,
            updated_at=survey.updated_at,
            published_at=survey.published_at,
            response_count=survey.response_count,
            questions=[SurveyQuestion(
                id=q.id,
                survey_id=q.survey_id,
                question_text=q.question_text,
                question_type=q.question_type,
                help_text=q.help_text,
                order_index=q.order_index,
                page_number=q.page_number,
                section=q.section,
                is_required=q.is_required,
                options=q.options or [],
                validation_rules=q.validation_rules or {},
                conditional_logic=q.conditional_logic,
                created_at=q.created_at,
                updated_at=q.updated_at
            ) for q in sorted_questions]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting survey {survey_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{survey_id}", response_model=Survey)
def update_survey(
    survey_id: uuid.UUID,
    data: SurveyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a survey.
    """
    # Check if user is admin or has permission
    get_current_user_or_admin(db, current_user)
    
    try:
        survey = db.query(SurveyModel).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Update basic fields
        update_data = data.model_dump(exclude_unset=True, exclude={'questions'})
        
        for field, value in update_data.items():
            if value is not None:
                setattr(survey, field, value)
        
        # Handle settings - merge with existing settings
        if data.settings:
            existing_settings = survey.settings or {}
            existing_settings.update(data.settings.model_dump())
            survey.settings = existing_settings
        
        # Handle title_ar and description_ar in settings
        if data.title_ar is not None or data.description_ar is not None:
            settings = survey.settings or {}
            if data.title_ar is not None:
                settings['title_ar'] = data.title_ar
            if data.description_ar is not None:
                settings['description_ar'] = data.description_ar
            survey.settings = settings
        
        # Handle welcome/thank you messages in settings
        if data.welcome_message is not None or data.welcome_message_ar is not None:
            settings = survey.settings or {}
            if data.welcome_message is not None:
                settings['welcome_message'] = data.welcome_message
            if data.welcome_message_ar is not None:
                settings['welcome_message_ar'] = data.welcome_message_ar
            survey.settings = settings
        
        if data.thank_you_message is not None or data.thank_you_message_ar is not None:
            settings = survey.settings or {}
            if data.thank_you_message is not None:
                settings['thank_you_message'] = data.thank_you_message
            if data.thank_you_message_ar is not None:
                settings['thank_you_message_ar'] = data.thank_you_message_ar
            survey.settings = settings
        
        if data.is_anonymous_allowed is not None:
            settings = survey.settings or {}
            settings['is_anonymous_allowed'] = data.is_anonymous_allowed
            survey.settings = settings
        
        if data.is_draft_autosave is not None:
            settings = survey.settings or {}
            settings['is_draft_autosave'] = data.is_draft_autosave
            survey.settings = settings
        
        # Update questions if provided
        # NOTE: We only update questions if the list is provided.
        # If an empty list is provided, we check if it was intentional or a loading error.
        # But we can't easily know. For now, we assume if it's not None, we update.
        if data.questions is not None:
            # Safety check: if new questions list is empty but existing questions exist,
            # this might be a data loss scenario (e.g. frontend failed to load).
            # However, user might WANT to delete all questions.
            # To be safe, we proceed, but we rely on the frontend to be correct.
            
            # Remove existing questions
            # We delete them one by one to trigger cascades if needed, or use delete()
            db.query(SurveyQuestionModel).filter(SurveyQuestionModel.survey_id == survey.id).delete()
            
            # Add new questions
            for idx, q_data in enumerate(data.questions):
                question = SurveyQuestionModel(
                    survey_id=survey.id,
                    question_text=q_data.question_text,
                    question_type=q_data.question_type,
                    help_text=q_data.help_text,
                    order_index=idx,
                    is_required=q_data.is_required,
                    options=q_data.options if q_data.options else [],
                    validation_rules=q_data.validation_rules if q_data.validation_rules else {},
                    conditional_logic=q_data.conditional_logic
                )
                db.add(question)
        
        db.commit()
        db.refresh(survey)
        
        logger.info(f"Survey updated successfully: {survey.id}")
        
        # Return the updated survey
        sorted_questions = sorted(survey.questions, key=lambda x: x.order_index)
        
        # Get additional fields from settings JSON
        settings = survey.settings or {}
        return Survey(
            id=survey.id,
            title=survey.title,
            title_ar=settings.get('title_ar'),
            description=survey.description,
            description_ar=settings.get('description_ar'),
            status=survey.status,
            settings=survey.settings or {},
            logo_url=survey.logo_url,
            primary_color=survey.primary_color,
            company_name=survey.company_name,
            show_company_name=survey.show_company_name,
            closes_at=survey.closes_at,
            welcome_message=settings.get('welcome_message'),
            welcome_message_ar=settings.get('welcome_message_ar'),
            thank_you_message=settings.get('thank_you_message'),
            thank_you_message_ar=settings.get('thank_you_message_ar'),
            is_anonymous_allowed=settings.get('is_anonymous_allowed', True),
            is_draft_autosave=settings.get('is_draft_autosave', True),
            created_by=survey.created_by,
            created_at=survey.created_at,
            updated_at=survey.updated_at,
            published_at=survey.published_at,
            response_count=survey.response_count,
            questions=[SurveyQuestion(
                id=q.id,
                survey_id=q.survey_id,
                question_text=q.question_text,
                question_type=q.question_type,
                help_text=q.help_text,
                order_index=q.order_index,
                page_number=q.page_number,
                section=q.section,
                is_required=q.is_required,
                options=q.options or [],
                validation_rules=q.validation_rules or {},
                conditional_logic=q.conditional_logic,
                created_at=q.created_at,
                updated_at=q.updated_at
            ) for q in sorted_questions]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating survey: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{survey_id}/analytics", response_model=SurveyAnalytics)
def get_survey_analytics(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get analytics for a survey.
    """
    try:
        survey = db.query(SurveyModel).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Get all responses for this survey
        responses = db.query(SurveyResponseModel).filter(
            SurveyResponseModel.survey_id == survey_id
        ).all()
        
        total_responses = len(responses)
        completed_responses = len([r for r in responses if r.is_complete])
        completion_rate = (completed_responses / total_responses * 100) if total_responses > 0 else 0
        
        # Calculate average completion time
        total_time = sum(r.time_spent_seconds or 0 for r in responses if r.time_spent_seconds)
        avg_time = total_time / completed_responses if completed_responses > 0 else 0
        
        # Device breakdown (matching client interface)
        device_breakdown = {"desktop": 0, "mobile": 0, "tablet": 0, "unknown": 0}
        for r in responses:
            if r.response_metadata:
                device = r.response_metadata.get("device_type", "unknown")
            else:
                device = "unknown"
            if device in device_breakdown:
                device_breakdown[device] += 1
        
        # Build question analytics
        question_analytics = []
        for q in survey.questions:
            q_responses = []
            for r in responses:
                for a in r.answers:
                    if a.question_id == q.id:
                        q_responses.append(a)
            
            question_analytics.append(QuestionAnalytics(
                question_id=str(q.id),
                question_title=q.question_text,
                question_type=q.question_type,
                response_count=len(q_responses),
                skip_rate=0.0,
                average_value=None,
                distribution=[],
                sentiment_score=None,
                word_cloud=None
            ))
        
        return SurveyAnalytics(
            survey_id=str(survey_id),
            total_responses=total_responses,
            completed_responses=completed_responses,
            partial_responses=total_responses - completed_responses,
            average_completion_time_seconds=avg_time,
            completion_rate=completion_rate,
            responses_over_time=[],
            question_analytics=question_analytics,
            device_breakdown=device_breakdown,
            sentiment_analysis=None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting survey analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{survey_id}/responses", response_model=PaginatedResponseList)
def get_survey_responses(
    survey_id: uuid.UUID,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get responses for a survey.
    """
    try:
        survey = db.query(SurveyModel).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        query = db.query(SurveyResponseModel).filter(
            SurveyResponseModel.survey_id == survey_id
        )
        
        total = query.count()
        offset = (page - 1) * pageSize
        responses = query.offset(offset).limit(pageSize).all()
        
        return PaginatedResponseList(
            items=[SurveyResponse(
                id=r.id,
                survey_id=r.survey_id,
                respondent_id=r.respondent_id,
                respondent_email=r.respondent_email,
                started_at=r.started_at,
                submitted_at=r.submitted_at,
                is_complete=r.is_complete,
                time_spent_seconds=r.time_spent_seconds,
                response_metadata=r.response_metadata,
                answers=r.answers
            ) for r in responses],
            total=total,
            page=page,
            page_size=pageSize,
            pages=(total + pageSize - 1) // pageSize
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting survey responses: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{survey_id}")
def delete_survey(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a survey.
    """
    get_current_user_or_admin(db, current_user)
    
    try:
        survey = db.query(SurveyModel).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        db.delete(survey)
        db.commit()
        
        return {"message": "Survey deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting survey: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{survey_id}/duplicate", response_model=Survey)
def duplicate_survey(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Duplicate a survey.
    """
    get_current_user_or_admin(db, current_user)
    
    try:
        survey = db.query(SurveyModel).options(
            joinedload(SurveyModel.questions)
        ).filter(
            SurveyModel.id == survey_id
        ).first()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Create new survey with copied data
        new_survey = SurveyModel(
            title=f"{survey.title} (Copy)",
            description=survey.description,
            status=SurveyStatus.DRAFT,
            settings=survey.settings,
            logo_url=survey.logo_url,
            primary_color=survey.primary_color,
            company_name=survey.company_name,
            show_company_name=survey.show_company_name,
            created_by=current_user.id
        )
        db.add(new_survey)
        db.flush()
        
        # Copy questions
        for q in survey.questions:
            new_q = SurveyQuestionModel(
                survey_id=new_survey.id,
                question_text=q.question_text,
                question_type=q.question_type,
                help_text=q.help_text,
                order_index=q.order_index,
                page_number=q.page_number,
                section=q.section,
                is_required=q.is_required,
                options=q.options,
                validation_rules=q.validation_rules,
                conditional_logic=q.conditional_logic
            )
            db.add(new_q)
        
        db.commit()
        db.refresh(new_survey)
        
        return Survey(
            id=new_survey.id,
            title=new_survey.title,
            title_ar=survey.settings.get('title_ar') if survey.settings else None,
            description=new_survey.description,
            description_ar=survey.settings.get('description_ar') if survey.settings else None,
            status=new_survey.status,
            settings=new_survey.settings or {},
            logo_url=new_survey.logo_url,
            primary_color=new_survey.primary_color,
            company_name=new_survey.company_name,
            show_company_name=new_survey.show_company_name,
            closes_at=new_survey.closes_at,
            welcome_message=survey.settings.get('welcome_message') if survey.settings else None,
            welcome_message_ar=survey.settings.get('welcome_message_ar') if survey.settings else None,
            thank_you_message=survey.settings.get('thank_you_message') if survey.settings else None,
            thank_you_message_ar=survey.settings.get('thank_you_message_ar') if survey.settings else None,
            is_anonymous_allowed=survey.settings.get('is_anonymous_allowed', True) if survey.settings else True,
            is_draft_autosave=survey.settings.get('is_draft_autosave', True) if survey.settings else True,
            created_by=new_survey.created_by,
            created_at=new_survey.created_at,
            updated_at=new_survey.updated_at,
            published_at=new_survey.published_at,
            response_count=0,
            questions=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating survey: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")
