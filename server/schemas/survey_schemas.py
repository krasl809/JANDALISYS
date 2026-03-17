"""
Survey Pydantic Schemas for PulseFlow - Dynamic Enterprise Survey Management System

This module contains all Pydantic schemas for request/response validation:
- Survey CRUD schemas
- Question schemas
- Response submission schemas
- Analytics schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid


# ============== Enums ==============

class SurveyStatusEnum(str, Enum):
    """Survey status options"""
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class QuestionTypeEnum(str, Enum):
    """Supported question types"""
    LIKERT_5 = "likert_5"
    LIKERT_7 = "likert_7"
    OPEN_TEXT = "open_text"
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    RATING = "rating"
    YES_NO = "yes_no"
    NPS = "nps"
    SCALE = "scale"


# ============== Question Option Schema ==============

class QuestionOptionBase(BaseModel):
    """Base schema for question options"""
    label: str = Field(..., min_length=1, max_length=500)
    value: str = Field(..., min_length=1, max_length=100)
    order: Optional[int] = 0


class QuestionOptionCreate(QuestionOptionBase):
    """Schema for creating a question option"""
    pass


class QuestionOption(QuestionOptionBase):
    """Schema for question option response"""
    class Config:
        from_attributes = True


# ============== Question Schemas ==============

class SurveyQuestionBase(BaseModel):
    """Base schema for survey questions"""
    question_text: str = Field(..., min_length=1, max_length=2000)
    question_type: QuestionTypeEnum
    help_text: Optional[str] = Field(None, max_length=1000)
    order_index: int = Field(default=0, ge=0)
    page_number: int = Field(default=1, ge=1)
    section: Optional[str] = Field(None, max_length=100)
    is_required: bool = False
    options: Optional[List[QuestionOptionCreate]] = Field(default_factory=list)
    validation_rules: Optional[Dict[str, Any]] = Field(default_factory=dict)
    conditional_logic: Optional[Dict[str, Any]] = None


class SurveyQuestionCreate(SurveyQuestionBase):
    """Schema for creating a survey question"""
    pass


class SurveyQuestionUpdate(BaseModel):
    """Schema for updating a survey question"""
    question_text: Optional[str] = Field(None, min_length=1, max_length=2000)
    question_type: Optional[QuestionTypeEnum] = None
    help_text: Optional[str] = Field(None, max_length=1000)
    order_index: Optional[int] = Field(None, ge=0)
    page_number: Optional[int] = Field(None, ge=1)
    section: Optional[str] = Field(None, max_length=100)
    is_required: Optional[bool] = None
    options: Optional[List[QuestionOptionCreate]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    conditional_logic: Optional[Dict[str, Any]] = None


class SurveyQuestion(SurveyQuestionBase):
    """Schema for survey question response"""
    id: uuid.UUID
    survey_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    options: List[QuestionOption] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ============== Survey Settings Schema ==============

class SurveySettings(BaseModel):
    """Schema for survey settings"""
    welcome_message: Optional[str] = Field(None, max_length=2000)
    thank_you_message: Optional[str] = Field(None, max_length=2000)
    is_anonymous: bool = True
    allow_multiple: bool = False
    show_progress: bool = True
    shuffle_questions: bool = False
    require_all_questions: bool = False
    collect_email: bool = False
    email_required: bool = False
    collect_name: bool = False
    name_required: bool = False
    collect_position: bool = False
    position_required: bool = False
    max_responses: Optional[int] = None
    redirect_url: Optional[str] = None
    notify_on_response: bool = False
    notification_emails: Optional[List[str]] = None
    company_name: Optional[str] = Field(None, max_length=255)
    show_company_name: bool = True


# ============== Survey Schemas ==============

class SurveyBase(BaseModel):
    """Base schema for surveys"""
    title: str = Field(..., min_length=1, max_length=255)
    title_ar: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    description_ar: Optional[str] = Field(None, max_length=5000)
    status: SurveyStatusEnum = SurveyStatusEnum.DRAFT
    settings: Optional[SurveySettings] = Field(default_factory=SurveySettings)
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field("#1976d2", max_length=7)
    company_name: Optional[str] = Field(None, max_length=255)
    show_company_name: bool = True
    closes_at: Optional[datetime] = None
    welcome_message: Optional[str] = None
    welcome_message_ar: Optional[str] = None
    thank_you_message: Optional[str] = None
    thank_you_message_ar: Optional[str] = None
    is_anonymous_allowed: bool = True
    is_draft_autosave: bool = True

    @field_validator('primary_color')
    @classmethod
    def validate_hex_color(cls, v):
        if v and not v.startswith('#'):
            raise ValueError('Primary color must be a hex color starting with #')
        if v and len(v) != 7:
            raise ValueError('Primary color must be 7 characters (e.g., #1976d2)')
        return v


class SurveyCreate(SurveyBase):
    """Schema for creating a survey"""
    questions: Optional[List[SurveyQuestionCreate]] = Field(default_factory=list)


class SurveyUpdate(BaseModel):
    """Schema for updating a survey"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    title_ar: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    description_ar: Optional[str] = Field(None, max_length=5000)
    status: Optional[SurveyStatusEnum] = None
    settings: Optional[SurveySettings] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, max_length=7)
    company_name: Optional[str] = Field(None, max_length=255)
    show_company_name: Optional[bool] = None
    closes_at: Optional[datetime] = None
    welcome_message: Optional[str] = None
    welcome_message_ar: Optional[str] = None
    thank_you_message: Optional[str] = None
    thank_you_message_ar: Optional[str] = None
    is_anonymous_allowed: Optional[bool] = None
    is_draft_autosave: Optional[bool] = None
    questions: Optional[List['SurveyQuestionUpdate']] = None

    @field_validator('primary_color')
    @classmethod
    def validate_hex_color(cls, v):
        if v is not None:
            if not v.startswith('#'):
                raise ValueError('Primary color must be a hex color starting with #')
            if len(v) != 7:
                raise ValueError('Primary color must be 7 characters (e.g., #1976d2)')
        return v


class Survey(SurveyBase):
    """Schema for survey response"""
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    response_count: int = 0
    questions: List[SurveyQuestion] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SurveyList(BaseModel):
    """Schema for survey list item (without questions)"""
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: SurveyStatusEnum
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    response_count: int = 0
    created_by: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class SurveyWithQuestions(Survey):
    """Schema for survey with questions (for editing)"""
    pass


class SurveyPublic(BaseModel):
    """Schema for public survey access (no sensitive data)"""
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    settings: Optional[SurveySettings] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    company_name: Optional[str] = None
    show_company_name: bool = True
    questions: List[SurveyQuestion] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ============== Answer Schemas ==============

class AnswerBase(BaseModel):
    """Base schema for an answer"""
    question_id: uuid.UUID
    answer_value: Optional[str] = None
    answer_data: Optional[Dict[str, Any]] = None
    numeric_value: Optional[int] = None


class AnswerCreate(AnswerBase):
    """Schema for creating an answer"""
    pass


class Answer(AnswerBase):
    """Schema for answer response"""
    id: uuid.UUID
    response_id: uuid.UUID
    answered_at: datetime
    time_spent_seconds: int = 0

    class Config:
        from_attributes = True


# ============== Response Schemas ==============

class SurveyResponseBase(BaseModel):
    """Base schema for survey response"""
    respondent_email: Optional[str] = Field(None, max_length=255)
    respondent_name: Optional[str] = Field(None, max_length=255)
    respondent_position: Optional[str] = Field(None, max_length=255)
    response_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SurveyResponseCreate(SurveyResponseBase):
    """Schema for submitting a survey response"""
    answers: List[AnswerCreate]
    time_spent_seconds: Optional[int] = 0


class SurveyResponse(SurveyResponseBase):
    """Schema for survey response"""
    id: uuid.UUID
    survey_id: uuid.UUID
    respondent_id: Optional[uuid.UUID] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int = 0
    is_complete: bool = False
    answers: List[Answer] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SurveyResponseList(BaseModel):
    """Schema for response list item"""
    id: uuid.UUID
    survey_id: uuid.UUID
    respondent_email: Optional[str] = None
    submitted_at: Optional[datetime] = None
    time_spent_seconds: int = 0
    is_complete: bool = False

    class Config:
        from_attributes = True


# ============== Analytics Schemas ==============

class QuestionAnalytics(BaseModel):
    """Analytics for a single question - matching client interface"""
    question_id: str  # Client expects string
    question_title: str  # Client expects question_title
    question_type: QuestionTypeEnum
    response_count: int = 0  # Client expects response_count
    skip_rate: float = 0.0  # Client expects skip_rate
    average_value: Optional[float] = None
    distribution: Optional[List[Dict[str, Any]]] = None  # Client expects list
    sentiment_score: Optional[float] = None
    word_cloud: Optional[List[Dict[str, Any]]] = None


class SurveyAnalytics(BaseModel):
    """Analytics for a survey"""
    survey_id: str  # Client expects string
    total_responses: int
    completed_responses: int  # Client expects completed_responses
    partial_responses: int = 0  # Client expects this field
    average_completion_time_seconds: float  # Client expects this name
    completion_rate: float
    responses_over_time: Optional[List[Dict[str, Any]]] = None
    question_analytics: List[QuestionAnalytics]
    device_breakdown: Optional[Dict[str, int]] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None  # Optional field


# ============== Template Schemas ==============

class SurveyTemplateBase(BaseModel):
    """Base schema for survey templates"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=100)


class SurveyTemplateCreate(SurveyTemplateBase):
    """Schema for creating a template"""
    template_data: Dict[str, Any]  # JSON structure of questions


class SurveyTemplate(SurveyTemplateBase):
    """Schema for template response"""
    id: uuid.UUID
    template_data: Dict[str, Any]
    is_builtin: bool = False
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    use_count: int = 0

    class Config:
        from_attributes = True


# ============== Pagination Schemas ==============

class PaginatedSurveyList(BaseModel):
    """Paginated list of surveys"""
    items: List[SurveyList]
    total: int
    page: int
    limit: int
    pages: int


class PaginatedResponseList(BaseModel):
    """Paginated list of responses"""
    items: List[SurveyResponseList]
    total: int
    page: int
    limit: int
    pages: int
