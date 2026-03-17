#!/usr/bin/env python3
"""Test script to debug import issues with survey models"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

def test_imports():
    try:
        print("Testing imports from models.survey_models:")
        from models.survey_models import Survey as SurveyModel
        print(f"SurveyModel type: {type(SurveyModel)}")
        print(f"SurveyModel __module__: {SurveyModel.__module__}")
        print()
        
        print("Testing imports from schemas.survey_schemas:")
        from schemas.survey_schemas import Survey
        print(f"Survey type: {type(Survey)}")
        print(f"Survey __module__: {Survey.__module__}")
        print()
        
        # Test importing both
        print("Testing imports in router context:")
        from models.survey_models import Survey as SurveyModel, SurveyQuestion as SurveyQuestionModel
        from schemas.survey_schemas import Survey, SurveyList, PaginatedSurveyList
        
        print(f"SurveyModel type: {type(SurveyModel)}")
        print(f"SurveyModel __name__: {SurveyModel.__name__}")
        print(f"Survey type: {type(Survey)}")
        print(f"Survey __name__: {Survey.__name__}")
        
        print("\n✅ Imports seem to be working correctly")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    test_imports()
