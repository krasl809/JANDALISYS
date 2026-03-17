"""
Test script for the PulseFlow Survey System.
Tests the models, schemas, and basic functionality.
"""
import sys
import os

# Add the server directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

def test_models_import():
    """Test that all survey models can be imported."""
    print("Testing model imports...")
    try:
        from models.survey_models import Survey, SurveyQuestion, SurveyResponse, Answer, SurveyTemplate, SurveyStatus, QuestionType
        print("[PASS] Models imported successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Model import failed: {e}")
        return False

def test_schemas_import():
    """Test that all survey schemas can be imported."""
    print("\nTesting schema imports...")
    try:
        from schemas.survey_schemas import (
            SurveyCreate, SurveyUpdate, Survey, SurveyList,
            SurveyResponseCreate, SurveyResponse,
            SurveyAnalytics, QuestionAnalytics,
            SurveyTemplateCreate, SurveyTemplate,
            SurveyStatusEnum, QuestionTypeEnum
        )
        print("[PASS] Schemas imported successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Schema import failed: {e}")
        return False

def test_routers_import():
    """Test that all survey routers can be imported."""
    print("\nTesting router imports...")
    try:
        from routers.surveys import router as surveys_router
        from routers.public_surveys import router as public_surveys_router
        print("[PASS] Routers imported successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Router import failed: {e}")
        return False

def test_schema_validation():
    """Test schema validation."""
    print("\nTesting schema validation...")
    try:
        from schemas.survey_schemas import SurveyCreate, SurveySettings, SurveyStatusEnum
        
        # Test creating a survey schema
        survey_data = SurveyCreate(
            title="Test Survey",
            description="A test survey for validation",
            status=SurveyStatusEnum.DRAFT,
            settings=SurveySettings(
                is_anonymous=True,
                allow_multiple=False
            )
        )
        print(f"[PASS] Survey schema created: {survey_data.title}")
        
        # Test invalid color validation
        try:
            SurveyCreate(
                title="Invalid Color Survey",
                primary_color="invalid"  # Should fail validation
            )
            print("[FAIL] Color validation should have failed")
            return False
        except Exception:
            print("[PASS] Color validation works correctly")
        
        return True
    except Exception as e:
        print(f"[FAIL] Schema validation test failed: {e}")
        return False

def test_database_tables():
    """Test that survey tables exist in the database."""
    print("\nTesting database tables...")
    try:
        from sqlalchemy import inspect
        from core.database import engine
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        survey_tables = [t for t in tables if 'survey' in t]
        
        expected_tables = ['surveys', 'survey_questions', 'survey_responses', 'survey_answers', 'survey_templates']
        missing_tables = [t for t in expected_tables if t not in survey_tables]
        
        if missing_tables:
            print(f"[FAIL] Missing tables: {missing_tables}")
            return False
        
        print(f"[PASS] All survey tables exist: {survey_tables}")
        return True
    except Exception as e:
        print(f"[FAIL] Database table test failed: {e}")
        return False

def test_model_creation():
    """Test creating model instances."""
    print("\nTesting model creation...")
    try:
        from models.survey_models import Survey, SurveyQuestion, SurveyStatus, QuestionType
        import uuid
        
        # Create a survey instance
        survey = Survey(
            id=uuid.uuid4(),
            title="Test Survey",
            description="Test Description",
            status=SurveyStatus.DRAFT.value,
            settings={"is_anonymous": True}
        )
        print(f"[PASS] Survey model created: {survey.title}")
        
        # Create a question instance
        question = SurveyQuestion(
            id=uuid.uuid4(),
            survey_id=survey.id,
            question_text="What is your opinion?",
            question_type=QuestionType.LIKERT_5.value,
            is_required=True
        )
        print(f"[PASS] Question model created: {question.question_text}")
        
        return True
    except Exception as e:
        print(f"[FAIL] Model creation test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("PulseFlow Survey System Test Suite")
    print("=" * 60)
    
    results = []
    
    results.append(("Model Imports", test_models_import()))
    results.append(("Schema Imports", test_schemas_import()))
    results.append(("Router Imports", test_routers_import()))
    results.append(("Schema Validation", test_schema_validation()))
    results.append(("Database Tables", test_database_tables()))
    results.append(("Model Creation", test_model_creation()))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
