"""
Survey Models for PulseFlow - Dynamic Enterprise Survey Management System

This module contains all SQLAlchemy models for the survey system:
- Survey: Main survey entity
- SurveyQuestion: Questions within a survey
- QuestionOption: Options for choice-based questions
- SurveyResponse: Response submissions
- Answer: Individual answers within a response
"""

from sqlalchemy import Column, String, Text, DateTime, Date, Boolean, ForeignKey, Integer, JSON, Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from core.database import Base


class SurveyStatus(str, enum.Enum):
    """Survey status options"""
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class QuestionType(str, enum.Enum):
    """Supported question types"""
    LIKERT_5 = "likert_5"           # 5-point Likert scale
    LIKERT_7 = "likert_7"           # 7-point Likert scale
    OPEN_TEXT = "open_text"         # Free text response
    SINGLE_CHOICE = "single_choice" # Single select (radio)
    MULTIPLE_CHOICE = "multiple_choice"  # Multi-select (checkboxes)
    DROPDOWN = "dropdown"           # Dropdown select
    RATING = "rating"               # Star rating (1-5)
    YES_NO = "yes_no"               # Boolean question
    NPS = "nps"                     # Net Promoter Score (0-10)
    SCALE = "scale"                 # Custom scale (min-max)


class Survey(Base):
    """
    Main Survey entity.
    Stores survey metadata and settings as JSON for flexibility.
    """
    __tablename__ = "surveys"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core fields
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default=SurveyStatus.DRAFT, nullable=False)
    
    # Settings stored as JSON for flexibility
    # Example: {"welcome_message": "...", "thank_you_message": "...", "is_anonymous": true, "allow_multiple": false}
    settings = Column(JSON, default=dict)
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#1976d2")  # Hex color
    company_name = Column(String(255), nullable=True)  # Company name to display on survey
    show_company_name = Column(Boolean, default=True)  # Whether to show company name on public survey
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    published_at = Column(DateTime, nullable=True)
    closes_at = Column(DateTime, nullable=True)
    
    # Statistics (denormalized for performance)
    response_count = Column(Integer, default=0)
    
    # Relationships
    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan", order_by="SurveyQuestion.order_index")
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")
    creator = relationship("User", backref="created_surveys")


class SurveyQuestion(Base):
    """
    Questions within a survey.
    Supports multiple question types with validation rules stored as JSON.
    """
    __tablename__ = "survey_questions"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    
    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)
    help_text = Column(Text, nullable=True)
    
    # Ordering and grouping
    order_index = Column(Integer, default=0)
    page_number = Column(Integer, default=1)  # For multi-page surveys
    section = Column(String(100), nullable=True)  # Section header
    
    # Validation and behavior
    is_required = Column(Boolean, default=False)
    validation_rules = Column(JSON, default=dict)
    # Example validation_rules:
    # {"min_length": 10, "max_length": 500} for open_text
    # {"min": 1, "max": 10} for scale
    # {"pattern": "regex"} for custom validation
    
    # Options for choice-based questions (stored as JSON for flexibility)
    # Example: [{"label": "Strongly Agree", "value": "5"}, ...]
    options = Column(JSON, default=list)
    
    # Conditional logic (show this question only if...)
    # Example: {"question_id": "uuid", "operator": "equals", "value": "yes"}
    conditional_logic = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    survey = relationship("Survey", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class SurveyResponse(Base):
    """
    Response submission for a survey.
    Stores metadata about the submission and links to individual answers.
    """
    __tablename__ = "survey_responses"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    
    # Respondent identification (optional - for non-anonymous surveys)
    respondent_id = Column(UUID(as_uuid=True), nullable=True)  # Could be employee_id or user_id
    respondent_email = Column(String(255), nullable=True)
    respondent_name = Column(String(255), nullable=True)
    respondent_position = Column(String(255), nullable=True)
    
    # Response metadata (renamed from 'metadata' to avoid conflict with SQLAlchemy reserved word)
    response_metadata = Column(JSON, default=dict)
    # Example response_metadata:
    # {
    #   "ip_address": "hashed",
    #   "user_agent": "browser info",
    #   "device_type": "mobile/desktop",
    #   "browser_language": "en",
    #   "referrer": "email/qr/direct"
    # }
    
    # Timing
    started_at = Column(DateTime, default=func.now())
    submitted_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    
    # Status
    is_complete = Column(Boolean, default=False)
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """
    Individual answer to a question within a response.
    Stores the answer value and any additional data.
    """
    __tablename__ = "survey_answers"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(UUID(as_uuid=True), ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("survey_questions.id", ondelete="CASCADE"), nullable=False)
    
    # Answer value (text representation)
    answer_value = Column(Text, nullable=True)
    
    # Structured answer data for complex types
    # Example: {"selected": ["option1", "option2"], "other": "custom text"}
    answer_data = Column(JSON, nullable=True)
    
    # For Likert/NPS/rating - numeric value for easier analytics
    numeric_value = Column(Integer, nullable=True)
    
    # Metadata
    answered_at = Column(DateTime, default=func.now())
    time_spent_seconds = Column(Integer, default=0)  # Time spent on this question
    
    # Relationships
    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")


class SurveyTemplate(Base):
    """
    Pre-defined survey templates for quick creation.
    """
    __tablename__ = "survey_templates"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # e.g., "Employee Satisfaction", "Feedback", "Performance"
    
    # Template structure (JSON representation of questions)
    template_data = Column(JSON, nullable=False)
    
    # Metadata
    is_builtin = Column(Boolean, default=False)  # System templates cannot be deleted
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Usage stats
    use_count = Column(Integer, default=0)
