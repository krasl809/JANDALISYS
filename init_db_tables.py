import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path to allow imports from 'server'
sys.path.append(os.path.join(os.getcwd(), 'server'))

from server.core.database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from server.models.core_models import *
from server.models.department_models import *
from server.models.rbac_models import *
from server.models.hr_models import *
from server.models.employee_models import *
from server.models.company_models import *
from server.models.archive_models import *

def init_db():
    print("Creating all tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_db()
