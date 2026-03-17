"""
Public Survey Router for PulseFlow - Dynamic Enterprise Survey Management System

This module contains public endpoints for survey access and submission:
- Get survey for filling (no auth required)
- Submit survey response (no auth required)
- Draft auto-save functionality
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from core.database import get_db
from models.survey_models import Survey, SurveyQuestion, SurveyResponse, Answer, SurveyStatus
from schemas.survey_schemas import (
    SurveyPublic, SurveyResponseCreate, SurveyResponse as SurveyResponseSchema,
    SurveyQuestion as SurveyQuestionSchema, QuestionOption
)
from typing import List, Optional
import uuid
import logging
import hashlib
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/surveys", tags=["Public Surveys"])


def get_client_hash(request: Request) -> str:
    """
    Generate a hash of client IP for anonymous tracking.
    """
    client_ip = request.client.host if request.client else "unknown"
    return hashlib.sha256(client_ip.encode()).hexdigest()[:16]


@router.get("/{survey_id}", response_model=SurveyPublic)
def get_public_survey(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get a survey for public filling.
    No authentication required - accessible via unique UUID.
    """
    survey = db.query(Survey).options(
        joinedload(Survey.questions)
    ).filter(
        Survey.id == survey_id,
        Survey.status == SurveyStatus.ACTIVE.value
    ).first()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or not active")
    
    # Check if survey has closed
    if survey.closes_at and survey.closes_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Survey has closed")
    
    # Check max responses limit
    settings = survey.settings or {}
    max_responses = settings.get("max_responses")
    if max_responses and survey.response_count >= max_responses:
        raise HTTPException(status_code=400, detail="Survey has reached maximum responses")
    
    # Sort questions by order_index
    sorted_questions = sorted(survey.questions, key=lambda x: x.order_index)
    
    return SurveyPublic(
        id=survey.id,
        title=survey.title,
        description=survey.description,
        settings=settings,
        logo_url=survey.logo_url,
        primary_color=survey.primary_color,
        questions=[
            SurveyQuestionSchema(
                id=q.id,
                survey_id=q.survey_id,
                question_text=q.question_text,
                question_type=q.question_type,
                help_text=q.help_text,
                order_index=q.order_index,
                page_number=q.page_number,
                section=q.section,
                is_required=q.is_required,
                options=[QuestionOption(**opt) for opt in q.options] if q.options else [],
                validation_rules=q.validation_rules or {},
                conditional_logic=q.conditional_logic,
                created_at=q.created_at,
                updated_at=q.updated_at
            )
            for q in sorted_questions
        ]
    )


@router.post("/{survey_id}/submit", response_model=SurveyResponseSchema)
def submit_survey_response(
    survey_id: uuid.UUID,
    data: SurveyResponseCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Submit a response to a survey.
    No authentication required - anonymous submissions allowed.
    """
    # Verify survey exists and is active
    survey = db.query(Survey).options(
        joinedload(Survey.questions)
    ).filter(
        Survey.id == survey_id,
        Survey.status == SurveyStatus.ACTIVE.value
    ).first()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or not active")
    
    # Check if survey has closed
    if survey.closes_at and survey.closes_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Survey has closed")
    
    # Check max responses limit
    settings = survey.settings or {}
    max_responses = settings.get("max_responses")
    if max_responses and survey.response_count >= max_responses:
        raise HTTPException(status_code=400, detail="Survey has reached maximum responses")
    
    # Check for multiple submissions
    allow_multiple = settings.get("allow_multiple", False)
    if not allow_multiple:
        # Check by email if provided
        if data.respondent_email:
            existing = db.query(SurveyResponse).filter(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.respondent_email == data.respondent_email
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="You have already responded to this survey")
        
        # Check by client hash for anonymous
        client_hash = get_client_hash(request)
        if data.response_metadata:
            data.response_metadata["client_hash"] = client_hash
        else:
            data.response_metadata = {"client_hash": client_hash}
        
        # Check for existing response from same client
        # This is a soft check - we don't want to block legitimate responses
    
    # Validate required questions
    question_map = {q.id: q for q in survey.questions}
    answered_questions = set()
    
    for answer in data.answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(status_code=400, detail=f"Invalid question ID: {answer.question_id}")
        
        answered_questions.add(answer.question_id)
        
        # Validate required questions have answers
        if question.is_required:
            if answer.answer_value is None and answer.numeric_value is None and not answer.answer_data:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Question '{question.question_text[:50]}' is required"
                )
        
        # Validate answer based on question type
        validate_answer(question, answer)
    
    # Check all required questions are answered
    for q in survey.questions:
        if q.is_required and q.id not in answered_questions:
            raise HTTPException(
                status_code=400,
                detail=f"Required question not answered: {q.question_text[:50]}"
            )
    
    # Create response
    new_response = SurveyResponse(
        survey_id=survey_id,
        respondent_email=data.respondent_email,
        respondent_name=data.respondent_name,
        respondent_position=data.respondent_position,
        response_metadata=data.response_metadata or {},
        time_spent_seconds=data.time_spent_seconds or 0,
        is_complete=True,
        submitted_at=datetime.utcnow()
    )
    
    db.add(new_response)
    db.flush()  # Get ID
    
    # Create answers
    for answer_data in data.answers:
        answer = Answer(
            response_id=new_response.id,
            question_id=answer_data.question_id,
            answer_value=answer_data.answer_value,
            answer_data=answer_data.answer_data,
            numeric_value=answer_data.numeric_value
        )
        db.add(answer)
    
    # Update survey response count
    survey.response_count = (survey.response_count or 0) + 1
    
    db.commit()
    db.refresh(new_response)
    
    logger.info(f"Survey response submitted: survey={survey_id}, response={new_response.id}")
    
    return new_response


def validate_answer(question: SurveyQuestion, answer):
    """
    Validate an answer based on question type and validation rules.
    """
    q_type = question.question_type
    validation_rules = question.validation_rules or {}
    
    if q_type == "open_text":
        # Validate text length
        if answer.answer_value:
            min_len = validation_rules.get("min_length", 0)
            max_len = validation_rules.get("max_length", 10000)
            
            if len(answer.answer_value) < min_len:
                raise HTTPException(
                    status_code=400,
                    detail=f"Answer must be at least {min_len} characters"
                )
            if len(answer.answer_value) > max_len:
                raise HTTPException(
                    status_code=400,
                    detail=f"Answer must not exceed {max_len} characters"
                )
    
    elif q_type in ["likert_5", "likert_7", "rating", "nps", "scale"]:
        # Validate numeric value
        if answer.numeric_value is not None:
            if q_type == "likert_5" and not (1 <= answer.numeric_value <= 5):
                raise HTTPException(status_code=400, detail="Likert 5 value must be between 1 and 5")
            elif q_type == "likert_7" and not (1 <= answer.numeric_value <= 7):
                raise HTTPException(status_code=400, detail="Likert 7 value must be between 1 and 7")
            elif q_type == "rating" and not (1 <= answer.numeric_value <= 5):
                raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
            elif q_type == "nps" and not (0 <= answer.numeric_value <= 10):
                raise HTTPException(status_code=400, detail="NPS must be between 0 and 10")
            elif q_type == "scale":
                min_val = validation_rules.get("min", 1)
                max_val = validation_rules.get("max", 10)
                if not (min_val <= answer.numeric_value <= max_val):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Scale value must be between {min_val} and {max_val}"
                    )
    
    elif q_type in ["single_choice", "dropdown", "yes_no"]:
        # Validate that answer is a valid option
        if answer.answer_value:
            valid_options = [opt.get("value") for opt in (question.options or [])]
            if valid_options and answer.answer_value not in valid_options:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid option: {answer.answer_value}"
                )
    
    elif q_type == "multiple_choice":
        # Validate that all selected options are valid
        if answer.answer_data and "selected" in answer.answer_data:
            valid_options = [opt.get("value") for opt in (question.options or [])]
            for selected in answer.answer_data["selected"]:
                if valid_options and selected not in valid_options:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid option: {selected}"
                    )


@router.post("/{survey_id}/draft")
def save_draft_response(
    survey_id: uuid.UUID,
    data: SurveyResponseCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Save a draft response (partial submission).
    Used for auto-save functionality.
    """
    # Verify survey exists and is active
    survey = db.query(Survey).filter(
        Survey.id == survey_id,
        Survey.status == SurveyStatus.ACTIVE.value
    ).first()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or not active")
    
    # Check if draft already exists for this session
    client_hash = get_client_hash(request)
    
    # Look for existing draft by email or client hash
    existing_draft = None
    if data.respondent_email:
        existing_draft = db.query(SurveyResponse).filter(
            SurveyResponse.survey_id == survey_id,
            SurveyResponse.respondent_email == data.respondent_email,
            SurveyResponse.is_complete == False
        ).first()
    
    if existing_draft:
        # Update existing draft
        # Remove old answers
        db.query(Answer).filter(Answer.response_id == existing_draft.id).delete()
        
        # Add new answers
        for answer_data in data.answers:
            answer = Answer(
                response_id=existing_draft.id,
                question_id=answer_data.question_id,
                answer_value=answer_data.answer_value,
                answer_data=answer_data.answer_data,
                numeric_value=answer_data.numeric_value
            )
            db.add(answer)
        
        existing_draft.time_spent_seconds = data.time_spent_seconds or 0
        existing_draft.response_metadata = data.response_metadata or {}
        
        db.commit()
        
        return {"message": "Draft updated", "draft_id": str(existing_draft.id)}
    
    else:
        # Create new draft
        new_draft = SurveyResponse(
            survey_id=survey_id,
            respondent_email=data.respondent_email,
            response_metadata=data.response_metadata or {"client_hash": client_hash},
            time_spent_seconds=data.time_spent_seconds or 0,
            is_complete=False
        )
        
        db.add(new_draft)
        db.flush()
        
        # Create answers
        for answer_data in data.answers:
            answer = Answer(
                response_id=new_draft.id,
                question_id=answer_data.question_id,
                answer_value=answer_data.answer_value,
                answer_data=answer_data.answer_data,
                numeric_value=answer_data.numeric_value
            )
            db.add(answer)
        
        db.commit()
        
        return {"message": "Draft saved", "draft_id": str(new_draft.id)}


@router.get("/{survey_id}/draft/{draft_id}")
def get_draft_response(
    survey_id: uuid.UUID,
    draft_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Retrieve a draft response for continuation.
    """
    draft = db.query(SurveyResponse).options(
        joinedload(SurveyResponse.answers)
    ).filter(
        SurveyResponse.id == draft_id,
        SurveyResponse.survey_id == survey_id,
        SurveyResponse.is_complete == False
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return {
        "id": str(draft.id),
        "survey_id": str(draft.survey_id),
        "respondent_email": draft.respondent_email,
        "time_spent_seconds": draft.time_spent_seconds,
        "answers": [
            {
                "question_id": str(a.question_id),
                "answer_value": a.answer_value,
                "answer_data": a.answer_data,
                "numeric_value": a.numeric_value
            }
            for a in draft.answers
        ]
    }


@router.get("/{survey_id}/status")
def get_survey_status(
    survey_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get survey status and basic info (for checking if survey is still active).
    """
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    is_active = survey.status == SurveyStatus.ACTIVE.value
    is_closed = survey.closes_at and survey.closes_at < datetime.utcnow() if survey.closes_at else False
    
    settings = survey.settings or {}
    max_responses = settings.get("max_responses")
    is_full = max_responses and survey.response_count >= max_responses if max_responses else False
    
    return {
        "id": str(survey.id),
        "title": survey.title,
        "status": survey.status,
        "is_active": is_active and not is_closed and not is_full,
        "response_count": survey.response_count,
        "closes_at": survey.closes_at.isoformat() if survey.closes_at else None
    }
