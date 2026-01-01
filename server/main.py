import os
import logging
import uuid
import time
from datetime import datetime, timezone
from collections import defaultdict
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Load environment variables first
try:
    from dotenv import load_dotenv
    # Load .env from the server directory
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)
except ImportError:
    pass

# Initialize Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        environment=os.getenv("ENVIRONMENT", "development"),
    )
    logging.info("Sentry monitoring enabled")

# Add server directory to sys.path for absolute imports when running with uvicorn
import sys
sys.path.insert(0, os.path.dirname(__file__))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

# Import core modules
from core.database import get_db, Base, engine, SessionLocal
import models
core_models = models
rbac_models = models
department_models = models
hr_models = models
import schemas.schemas as schemas
from crud import rbac_crud
from core.auth import authenticate_user, create_access_token, get_current_user, get_password_hash, require_permission

# Import routers
from routers import contracts, conveyors, agents, financial_transactions, departments, hr, notifications, dashboard, inventory, payments, bank_accounts, documents, archive
from rbac.rbac_main import router as rbac_router

# استيراد مدير الويب سوكيت
from fastapi import WebSocket, WebSocketDisconnect
from ws_manager import manager

app = FastAPI(title="JANDALISYS")

# Log application startup
logger.info("Starting JANDALISYS")

# --- Secure CORS Configuration ---
from typing import List

# Get allowed origins from environment variable or use defaults
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins = [origin.strip() for origin in env_origins.split(",")]
else:
    # Allow all origins for easier network/internet access during development
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "X-Content-Range"],
    max_age=3600,
)

# --- Security Headers & Rate Limiting Middleware ---
@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    """Combined middleware for security headers and rate limiting to reduce overhead and nesting issues"""
    
    # Check if the Host header is an allowed IP
    allowed_hosts = ["91.144.22.3", "10.0.0.10", "localhost", "127.0.0.1"]
    host = request.headers.get("host", "").split(":")[0]
    
    # 1. Rate Limiting Logic
    if os.getenv("ENABLE_RATE_LIMIT", "true").lower() == "true":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Accessing the app state or a global for rate limit storage
        if not hasattr(app.state, 'rate_limit_requests'):
            app.state.rate_limit_requests = defaultdict(list)
        
        requests = app.state.rate_limit_requests[client_ip]
        
        # Clean old requests
        max_requests = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "100"))
        window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        
        app.state.rate_limit_requests[client_ip] = [req_time for req_time in requests if now - req_time < window_seconds]
        
        if len(app.state.rate_limit_requests[client_ip]) >= max_requests:
            return Response("Rate limit exceeded", status_code=429)
            
        app.state.rate_limit_requests[client_ip].append(now)

    # 2. Call Next (with error handling for stream issues)
    try:
        response = await call_next(request)
    except Exception as e:
        # Catch anyio stream errors that often happen with BaseHTTPMiddleware
        error_msg = str(e)
        if "EndOfStream" in error_msg or "WouldBlock" in error_msg:
            logger.warning(f"Stream error in middleware: {error_msg}")
            return Response("Internal Server Error (Stream Error)", status_code=500)
        logger.error(f"Error in middleware: {e}", exc_info=True)
        raise e

    # 3. Security Headers Logic
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    return response

# --- Register Routers ---
from routers import setup
app.include_router(setup.router, prefix="/api/setup", tags=["setup"])
app.include_router(rbac_router, prefix="/api/rbac", tags=["RBAC"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
# app.include_router(conveyors.router, prefix="/api/conveyors", tags=["conveyors"])  # Using direct endpoint instead
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(financial_transactions.router, prefix="/api/financial-transactions", tags=["financial_transactions"])
app.include_router(departments.router, prefix="/api", tags=["departments"])
app.include_router(hr.router, prefix="/api", tags=["hr"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(bank_accounts.router, prefix="/api", tags=["bank_accounts"])
app.include_router(archive.router, prefix="/api", tags=["archive"])

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_host = websocket.client.host if websocket.client else "unknown"
    logger.info(f"Incoming WebSocket connection from {client_host}")
    try:
        await manager.connect(websocket)
        logger.info(f"WebSocket connection accepted for {client_host}")
        while True:
            # Keep connection alive and wait for messages
            data = await websocket.receive_text()
            logger.debug(f"Received WS message from {client_host}: {data}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {client_host}")
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for {client_host}: {str(e)}", exc_info=True)
        await manager.disconnect(websocket)

# --- Models for Main ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"

# --- Startup Event ---
@app.on_event("startup")
def startup_event():
    print("DEBUG: Entering startup_event", flush=True)
    logger.info("Creating database tables...")
    # Create tables
    try:
        Base.metadata.create_all(bind=engine)
        print("DEBUG: Tables created", flush=True)
    except Exception as e:
        print(f"DEBUG: Failed to create tables: {e}", flush=True)
        raise
    logger.info("Database tables created successfully")

    # Initialize default permissions
    db = SessionLocal()
    try:
        # Ensure archive storage is initialized
        from routers.archive import ensure_storage
        ensure_storage(db)
        
        logger.info("Initializing default roles and permissions...")
        # Define default roles and their permissions
        roles_perms = {
            "admin": [
                "view_dashboard", "view_reports", "view_inventory", "view_settings", "view_hr",
                "read_contracts", "write_contracts", "post_contracts", "delete_contracts", 
                "manage_users", "approve_pricing", "manage_draft_status", "price_contracts",
                "read_pricing", "read_payments", "manage_hr",
                "read_sellers", "write_sellers", "read_buyers", "write_buyers", 
                "read_shippers", "write_shippers", "read_brokers", "write_brokers", 
                "read_conveyors", "write_conveyors", "read_articles", "write_articles", "read_payment_terms", "write_payment_terms",
                "read_incoterms", "write_incoterms", "read_document_types", "write_document_types",
                "view_agents", "manage_agents", "view_inventory", 
                "archive_read", "archive_upload", "archive_download", "archive_delete", "archive_write"
            ],
            "hr_manager": [
                "view_hr", "manage_hr"
            ],
            "manager": [
                "view_dashboard", "view_reports", "view_inventory",
                "read_contracts", "write_contracts", "post_contracts",
                "read_pricing", "read_payments",
                "read_sellers", "write_sellers", "read_buyers", "write_buyers", 
                "read_shippers", "write_shippers", "read_brokers", "write_brokers", 
                "read_conveyors", "write_conveyors", "read_articles", "write_articles", "read_payment_terms", "write_payment_terms",
                "read_incoterms", "write_incoterms", "read_document_types", "write_document_types",
                "view_agents", "manage_agents"
            ],
            "finance": [
                "view_dashboard", "view_reports",
                "read_contracts", "post_contracts", "price_contracts", "review_pricing",
                "read_pricing", "read_payments",
                "read_sellers", "read_buyers", "read_shippers", "read_brokers", "read_conveyors", "read_articles",
                "read_payment_terms", "read_incoterms", "read_document_types", "view_agents"
            ],
            "user": [
                "view_dashboard", "view_inventory",
                "read_contracts", "write_contracts",
                "read_sellers", "read_buyers", "read_shippers", "read_brokers", "read_conveyors", "read_articles",
                "read_payment_terms", "read_incoterms", 
                "archive_read", "archive_download"
            ],
            "viewer": [
                "view_dashboard",
                "read_contracts",
                "read_sellers", "read_buyers", "read_shippers", "read_brokers", "read_conveyors", "read_articles",
                "read_payment_terms", "read_incoterms"
            ],
            "archive_admin": [
                "archive_read", "archive_upload", "archive_download", "archive_delete", "archive_write"
            ],
            "archive_viewer": [
                "archive_read", "archive_download"
            ]
        }
        
        # Note: rbac_crud.create_role and create_permission use "get_or_create" pattern
        # They return existing records if already present, avoiding duplicates
        for role_name, permissions in roles_perms.items():
            role = rbac_crud.create_role(db, role_name)
            for perm_name in permissions:
                perm = rbac_crud.create_permission(db, perm_name)
                # assign_permission_to_role also checks for existing assignments
                rbac_crud.assign_permission_to_role(db, role.id, perm.id)
        
        logger.info("Default roles and permissions initialized successfully")

        # Create default admin user if no users exist
        admin_email = "admin@jandali.com"
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")
        
        # Security warning if using default password
        if admin_password == "Admin@123":
            logger.warning("⚠️⚠️⚠️ DEFAULT ADMIN PASSWORD IS BEING USED - CHANGE IT IMMEDIATELY! ⚠️⚠️⚠️")
            logger.warning("Set DEFAULT_ADMIN_PASSWORD in .env file for security") 
        
        admin_exists = db.query(core_models.User).filter(core_models.User.email == admin_email).first()
        
        if not admin_exists:
            logger.info(f"Admin user {admin_email} not found. Creating default admin user...")
            hashed_password = get_password_hash(admin_password)
            default_admin = core_models.User(
                name="System Admin",
                email=admin_email,
                password=hashed_password,
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            db.refresh(default_admin)
            
            # Assign admin role to the user
            admin_role = rbac_crud.get_role_by_name(db, "admin")
            if admin_role:
                rbac_crud.assign_role_to_user(db, default_admin.id, admin_role.id)
                
            logger.info(f"Default admin user created and role assigned: {admin_email} / {admin_password}")
        else:
            logger.info(f"Admin user {admin_email} already exists. Updating password...")
            admin_exists.password = get_password_hash(admin_password)
            admin_exists.is_active = True
            admin_exists.role = "admin"  # Ensure role is set to admin
            db.commit()
            
            # Ensure role is assigned even if user already existed
            admin_role = rbac_crud.get_role_by_name(db, "admin")
            if admin_role:
                # Check if role is already assigned
                user_roles_list = rbac_crud.get_user_roles(db, admin_exists.id)
                if "admin" not in user_roles_list:
                    rbac_crud.assign_role_to_user(db, admin_exists.id, admin_role.id)
                    
            logger.info(f"Password for {admin_email} has been reset to default and admin role verified.")

        # Create 6 default archive users
        archive_users = [
            {"name": "م. سايد شهوان", "email": "said.shahwan@archive.com", "role": "archive_admin"},
            {"name": "أ. نازك الجندلي", "email": "nazik.jandali@archive.com", "role": "archive_admin"},
            {"name": "أ. ماهر الريحاوي", "email": "maher.rehayi@archive.com", "role": "archive_admin"},
            {"name": "أ . غزوان البيك", "email": "ghazwan.baik@archive.com", "role": "archive_admin"},
            {"name": "أ . عبيدة الحامد", "email": "obada.hamed@archive.com", "role": "archive_admin"},
            {"name": "Archive Viewer", "email": "viewer@archive.com", "role": "archive_viewer"}
        ]
        
        archive_password = os.getenv("DEFAULT_ARCHIVE_PASSWORD", "Archive@123")
        
        # Security warning if using default password
        if archive_password == "Archive@123":
            logger.warning("⚠️⚠️⚠️ DEFAULT ARCHIVE PASSWORD IS BEING USED - CHANGE IT IMMEDIATELY! ⚠️⚠️⚠️")
            logger.warning("Set DEFAULT_ARCHIVE_PASSWORD in .env file for security")
        
        default_password = get_password_hash(archive_password)
        
        for u_data in archive_users:
            u_exists = db.query(core_models.User).filter(core_models.User.email == u_data["email"]).first()
            if not u_exists:
                logger.info(f"Creating archive user: {u_data['email']}")
                new_u = core_models.User(
                    name=u_data["name"],
                    email=u_data["email"],
                    password=default_password,
                    role=u_data["role"],
                    is_active=True
                )
                db.add(new_u)
                db.commit()
                db.refresh(new_u)
                
                # Assign role
                u_role = rbac_crud.get_role_by_name(db, u_data["role"])
                if u_role:
                    rbac_crud.assign_role_to_user(db, new_u.id, u_role.id)
            else:
                # Update password and role to ensure they match requirements
                u_exists.password = default_password
                u_exists.role = u_data["role"]
                db.commit()
                
                # Ensure role assignment
                u_role = rbac_crud.get_role_by_name(db, u_data["role"])
                if u_role:
                    user_roles_list = rbac_crud.get_user_roles(db, u_exists.id)
                    if u_data["role"] not in user_roles_list:
                        rbac_crud.assign_role_to_user(db, u_exists.id, u_role.id)
        
        logger.info("Archive users initialized successfully")

    except Exception as e:
        logger.error(f"Startup Config Error: {e}", exc_info=True)
    finally:
        db.close()

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Jandali ERP API is running"}

# --- Health Check Endpoints ---
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check endpoint for monitoring"""
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Check Redis (if configured)
    redis_status = "not_configured"
    if os.getenv("REDIS_HOST"):
        try:
            import redis
            r = redis.Redis(
                host=os.getenv("REDIS_HOST"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                db=int(os.getenv("REDIS_DB", "0")),
                socket_connect_timeout=2
            )
            r.ping()
            redis_status = "connected"
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            redis_status = "unavailable"
    
    return {
        "status": "healthy",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database": db_status,
        "redis": redis_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health/live")
async def liveness():
    """Kubernetes liveness probe - checks if application is running"""
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/health/ready")
async def readiness(db: Session = Depends(get_db)):
    """Kubernetes readiness probe - checks if application can serve traffic"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Not ready")


# --- Auth Endpoints ---

@app.post("/api/auth/login", response_model=dict)
def login_auth(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    print(f"DEBUG: Login attempt for email: {user_credentials.email}", flush=True)
    
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    print(f"DEBUG: authenticate_user result: {user}", flush=True)
    
    if not user:
        print(f"DEBUG: Authentication failed for {user_credentials.email}", flush=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"DEBUG: User authenticated successfully: {user.email}", flush=True)
    
    token = create_access_token({"sub": str(user.id)})
    print(f"DEBUG: Token created successfully", flush=True)
    
    # Fetch permissions for the user's role
    role_obj = db.query(rbac_models.Role).filter(rbac_models.Role.name == user.role).first()
    print(f"DEBUG: Role object found: {role_obj is not None}", flush=True)
    
    permissions = []
    if role_obj:
        permissions = [p.name for p in role_obj.permissions]
        print(f"DEBUG: Permissions found: {len(permissions)}", flush=True)
    else:
        print(f"DEBUG: No role object found for role: {user.role}", flush=True)
        
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user_id": str(user.id), 
        "role": user.role,
        "permissions": permissions
    }

@app.post("/api/auth/register", response_model=dict)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Admin only")

    try:
        existing_user = db.query(core_models.User).filter(core_models.User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = get_password_hash(user_data.password)
        user = core_models.User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
            department=user_data.department,
            position=user_data.position,
            hire_date=user_data.hire_date,
            employee_id=user_data.employee_id,
            manager_id=user_data.manager_id,
            phone=user_data.phone,
            address=user_data.address,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message": "User registered successfully", "user_id": str(user.id)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to register user")

@app.get("/api/auth/me", response_model=schemas.User)
def get_user_info_auth(current_user = Depends(get_current_user)):
    return current_user

# --- Admin Setup ---
@app.post("/api/setup/admin", response_model=dict)
def setup_admin(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    try:
        admin = db.query(core_models.User).filter(core_models.User.role == "admin").first()
        if admin:
            raise HTTPException(status_code=400, detail="Admin user already exists")

        hashed_password = get_password_hash(user_data.password)
        user = core_models.User(
            name=user_data.name,
            email=user_data.email,
            password=hashed_password,
            role="admin"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message": "Admin user created successfully", "user_id": str(user.id)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create admin user")

# --- Basic CRUD Endpoints (Entities) ---

@app.get("/api/users/", response_model=list[schemas.User])
def read_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        # Only admin can view all users
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied: Admin only")
        return db.query(core_models.User).all()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve users")

# Sellers
@app.get("/api/sellers/", response_model=list[schemas.Seller])
def read_sellers(db: Session = Depends(get_db), current_user = Depends(require_permission("read_sellers"))):
    try:
        return db.query(core_models.Seller).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve sellers")

@app.post("/api/sellers/", response_model=schemas.Seller)
def create_seller(seller: schemas.SellerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_sellers"))):
    try:
        db_seller = core_models.Seller(**seller.model_dump())
        db.add(db_seller)
        db.commit()
        db.refresh(db_seller)
        return db_seller
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create seller: {str(e)}")

@app.put("/api/sellers/{seller_id}", response_model=schemas.Seller)
def update_seller(seller_id: uuid.UUID, seller: schemas.SellerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_sellers"))):
    try:
        db_seller = db.query(core_models.Seller).filter(core_models.Seller.id == seller_id).first()
        if not db_seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        for key, value in seller.model_dump().items():
            setattr(db_seller, key, value)
        db.commit()
        db.refresh(db_seller)
        return db_seller
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update seller: {str(e)}")

@app.delete("/api/sellers/{seller_id}")
def delete_seller(seller_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_sellers"))):
    try:
        db_seller = db.query(core_models.Seller).filter(core_models.Seller.id == seller_id).first()
        if not db_seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        db.delete(db_seller)
        db.commit()
        return {"message": "Seller deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete seller: {str(e)}")

# Buyers
@app.get("/api/buyers/", response_model=list[schemas.Buyer])
def read_buyers(db: Session = Depends(get_db), current_user = Depends(require_permission("read_buyers"))):
    try:
        return db.query(core_models.Buyer).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve buyers")

@app.post("/api/buyers/", response_model=schemas.Buyer)
def create_buyer(buyer: schemas.BuyerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_buyers"))):
    try:
        db_buyer = core_models.Buyer(**buyer.model_dump())
        db.add(db_buyer)
        db.commit()
        db.refresh(db_buyer)
        return db_buyer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create buyer: {str(e)}")

@app.put("/api/buyers/{buyer_id}", response_model=schemas.Buyer)
def update_buyer(buyer_id: uuid.UUID, buyer: schemas.BuyerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_buyers"))):
    try:
        db_buyer = db.query(core_models.Buyer).filter(core_models.Buyer.id == buyer_id).first()
        if not db_buyer:
            raise HTTPException(status_code=404, detail="Buyer not found")
        for key, value in buyer.model_dump().items():
            setattr(db_buyer, key, value)
        db.commit()
        db.refresh(db_buyer)
        return db_buyer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update buyer: {str(e)}")

@app.delete("/api/buyers/{buyer_id}")
def delete_buyer(buyer_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_buyers"))):
    try:
        db_buyer = db.query(core_models.Buyer).filter(core_models.Buyer.id == buyer_id).first()
        if not db_buyer:
            raise HTTPException(status_code=404, detail="Buyer not found")
        db.delete(db_buyer)
        db.commit()
        return {"message": "Buyer deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete buyer: {str(e)}")

# Shippers
@app.get("/api/shippers/", response_model=list[schemas.Shipper])
def read_shippers(db: Session = Depends(get_db), current_user = Depends(require_permission("read_shippers"))):
    try:
        return db.query(core_models.Shipper).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve shippers")

@app.post("/api/shippers/", response_model=schemas.Shipper)
def create_shipper(shipper: schemas.ShipperCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_shippers"))):
    try:
        db_shipper = core_models.Shipper(**shipper.model_dump())
        db.add(db_shipper)
        db.commit()
        db.refresh(db_shipper)
        return db_shipper
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create shipper: {str(e)}")

@app.put("/api/shippers/{shipper_id}", response_model=schemas.Shipper)
def update_shipper(shipper_id: uuid.UUID, shipper: schemas.ShipperCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_shippers"))):
    try:
        db_shipper = db.query(core_models.Shipper).filter(core_models.Shipper.id == shipper_id).first()
        if not db_shipper:
            raise HTTPException(status_code=404, detail="Shipper not found")
        for key, value in shipper.model_dump().items():
            setattr(db_shipper, key, value)
        db.commit()
        db.refresh(db_shipper)
        return db_shipper
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update shipper: {str(e)}")

@app.delete("/api/shippers/{shipper_id}")
def delete_shipper(shipper_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_shippers"))):
    try:
        db_shipper = db.query(core_models.Shipper).filter(core_models.Shipper.id == shipper_id).first()
        if not db_shipper:
            raise HTTPException(status_code=404, detail="Shipper not found")
        db.delete(db_shipper)
        db.commit()
        return {"message": "Shipper deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete shipper: {str(e)}")

# Document Types
@app.get("/api/document-types/", response_model=list[schemas.DocumentType])
def read_document_types(db: Session = Depends(get_db), current_user = Depends(require_permission("read_document_types"))):
    try:
        return db.query(core_models.DocumentType).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve document types")

@app.post("/api/document-types/", response_model=schemas.DocumentType)
def create_document_type(document_type: schemas.DocumentTypeCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_document_types"))):
    try:
        db_doc_type = core_models.DocumentType(**document_type.model_dump())
        db.add(db_doc_type)
        db.commit()
        db.refresh(db_doc_type)
        return db_doc_type
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create document type: {str(e)}")

@app.put("/api/document-types/{doc_id}", response_model=schemas.DocumentType)
def update_document_type(doc_id: uuid.UUID, document_type: schemas.DocumentTypeCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_document_types"))):
    try:
        db_doc_type = db.query(core_models.DocumentType).filter(core_models.DocumentType.id == doc_id).first()
        if not db_doc_type:
            raise HTTPException(status_code=404, detail="Document type not found")
        for key, value in document_type.model_dump().items():
            setattr(db_doc_type, key, value)
        db.commit()
        db.refresh(db_doc_type)
        return db_doc_type
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update document type: {str(e)}")

@app.patch("/api/document-types/{doc_id}", response_model=schemas.DocumentType)
def patch_document_type(doc_id: uuid.UUID, document_type: schemas.DocumentTypeUpdate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_document_types"))):
    try:
        db_doc_type = db.query(core_models.DocumentType).filter(core_models.DocumentType.id == doc_id).first()
        if not db_doc_type:
            raise HTTPException(status_code=404, detail="Document type not found")
        
        update_data = document_type.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_doc_type, key, value)
            
        db.commit()
        db.refresh(db_doc_type)
        return db_doc_type
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to patch document type: {str(e)}")

@app.delete("/api/document-types/{doc_id}")
def delete_document_type(doc_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_document_types"))):
    try:
        db_doc_type = db.query(core_models.DocumentType).filter(core_models.DocumentType.id == doc_id).first()
        if not db_doc_type:
            raise HTTPException(status_code=404, detail="Document type not found")
        db.delete(db_doc_type)
        db.commit()
        return {"message": "Document type deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete document type: {str(e)}")

# Brokers
@app.get("/api/brokers/", response_model=list[schemas.Broker])
def read_brokers(db: Session = Depends(get_db), current_user = Depends(require_permission("read_brokers"))):
    try:
        return db.query(core_models.Broker).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve brokers")

# Conveyors
@app.get("/api/conveyors/", response_model=list[schemas.Conveyor])
def read_conveyors(db: Session = Depends(get_db), current_user = Depends(require_permission("read_conveyors"))):
    try:
        return db.query(core_models.Conveyor).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve conveyors")

@app.post("/api/brokers/", response_model=schemas.Broker)
def create_broker(broker: schemas.BrokerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_brokers"))):
    try:
        db_broker = core_models.Broker(**broker.model_dump())
        db.add(db_broker)
        db.commit()
        db.refresh(db_broker)
        return db_broker
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create broker: {str(e)}")

@app.put("/api/brokers/{broker_id}", response_model=schemas.Broker)
def update_broker(broker_id: uuid.UUID, broker: schemas.BrokerCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_brokers"))):
    try:
        db_broker = db.query(core_models.Broker).filter(core_models.Broker.id == broker_id).first()
        if not db_broker:
            raise HTTPException(status_code=404, detail="Broker not found")
        for key, value in broker.model_dump().items():
            setattr(db_broker, key, value)
        db.commit()
        db.refresh(db_broker)
        return db_broker
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update broker: {str(e)}")

@app.delete("/api/brokers/{broker_id}")
def delete_broker(broker_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_brokers"))):
    try:
        db_broker = db.query(core_models.Broker).filter(core_models.Broker.id == broker_id).first()
        if not db_broker:
            raise HTTPException(status_code=404, detail="Broker not found")
        db.delete(db_broker)
        db.commit()
        return {"message": "Broker deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete broker: {str(e)}")

# Articles
@app.get("/api/articles/", response_model=list[schemas.ArticleEntity])
def read_articles(db: Session = Depends(get_db), current_user = Depends(require_permission("read_articles"))):
    return db.query(core_models.Article).all()

@app.post("/api/articles/", response_model=schemas.ArticleEntity)
def create_article(article: schemas.ArticleEntity, db: Session = Depends(get_db), current_user = Depends(require_permission("write_articles"))):
    try:
        db_article = core_models.Article(**article.model_dump(exclude={"id"}))
        db.add(db_article)
        db.commit()
        db.refresh(db_article)
        return db_article
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create article: {str(e)}")

@app.put("/api/articles/{article_id}", response_model=schemas.ArticleEntity)
def update_article(article_id: uuid.UUID, article: schemas.ArticleEntity, db: Session = Depends(get_db), current_user = Depends(require_permission("write_articles"))):
    try:
        db_article = db.query(core_models.Article).filter(core_models.Article.id == article_id).first()
        if not db_article:
            raise HTTPException(status_code=404, detail="Article not found")
        for key, value in article.model_dump(exclude={"id"}).items():
            setattr(db_article, key, value)
        db.commit()
        db.refresh(db_article)
        return db_article
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update article: {str(e)}")

@app.delete("/api/articles/{article_id}")
def delete_article(article_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_articles"))):
    try:
        db_article = db.query(core_models.Article).filter(core_models.Article.id == article_id).first()
        if not db_article:
            raise HTTPException(status_code=404, detail="Article not found")
        db.delete(db_article)
        db.commit()
        return {"message": "Article deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete article: {str(e)}")

# Payment Terms
@app.get("/api/payment-terms/", response_model=list[schemas.PaymentTerm])
def read_payment_terms(db: Session = Depends(get_db), current_user = Depends(require_permission("read_payment_terms"))):
    try:
        return db.query(core_models.PaymentTerm).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve payment terms")

@app.post("/api/payment-terms/", response_model=schemas.PaymentTerm)
def create_payment_term(payment_term: schemas.PaymentTermCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_payment_terms"))):
    try:
        db_term = core_models.PaymentTerm(**payment_term.model_dump())
        db.add(db_term)
        db.commit()
        db.refresh(db_term)
        return db_term
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment term: {str(e)}")

@app.put("/api/payment-terms/{term_id}", response_model=schemas.PaymentTerm)
def update_payment_term(term_id: uuid.UUID, payment_term: schemas.PaymentTermCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_payment_terms"))):
    try:
        db_term = db.query(core_models.PaymentTerm).filter(core_models.PaymentTerm.id == term_id).first()
        if not db_term:
            raise HTTPException(status_code=404, detail="Payment term not found")
        for key, value in payment_term.model_dump().items():
            setattr(db_term, key, value)
        db.commit()
        db.refresh(db_term)
        return db_term
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment term: {str(e)}")

@app.delete("/api/payment-terms/{term_id}")
def delete_payment_term(term_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_payment_terms"))):
    try:
        db_term = db.query(core_models.PaymentTerm).filter(core_models.PaymentTerm.id == term_id).first()
        if not db_term:
            raise HTTPException(status_code=404, detail="Payment term not found")
        db.delete(db_term)
        db.commit()
        return {"message": "Payment term deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete payment term: {str(e)}")

# Incoterms
@app.get("/api/incoterms/", response_model=list[schemas.Incoterm])
def read_incoterms(db: Session = Depends(get_db), current_user = Depends(require_permission("read_incoterms"))):
    try:
        return db.query(core_models.Incoterm).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve incoterms")

@app.post("/api/incoterms/", response_model=schemas.Incoterm)
def create_incoterm(incoterm: schemas.IncotermCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_incoterms"))):
    try:
        db_incoterm = core_models.Incoterm(**incoterm.model_dump())
        db.add(db_incoterm)
        db.commit()
        db.refresh(db_incoterm)
        return db_incoterm
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incoterm: {str(e)}")

@app.put("/api/incoterms/{incoterm_id}", response_model=schemas.Incoterm)
def update_incoterm(incoterm_id: uuid.UUID, incoterm: schemas.IncotermCreate, db: Session = Depends(get_db), current_user = Depends(require_permission("write_incoterms"))):
    try:
        db_incoterm = db.query(core_models.Incoterm).filter(core_models.Incoterm.id == incoterm_id).first()
        if not db_incoterm:
            raise HTTPException(status_code=404, detail="Incoterm not found")
        for key, value in incoterm.model_dump().items():
            setattr(db_incoterm, key, value)
        db.commit()
        db.refresh(db_incoterm)
        return db_incoterm
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update incoterm: {str(e)}")

@app.delete("/api/incoterms/{incoterm_id}")
def delete_incoterm(incoterm_id: uuid.UUID, db: Session = Depends(get_db), current_user = Depends(require_permission("write_incoterms"))):
    try:
        db_incoterm = db.query(core_models.Incoterm).filter(core_models.Incoterm.id == incoterm_id).first()
        if not db_incoterm:
            raise HTTPException(status_code=404, detail="Incoterm not found")
        db.delete(db_incoterm)
        db.commit()
        return {"message": "Incoterm deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete incoterm: {str(e)}")

@app.get("/api/parties/", response_model=list[schemas.Entity])
def read_parties(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        # Combine all party types into one list
        sellers = db.query(core_models.Seller).all()
        buyers = db.query(core_models.Buyer).all()
        brokers = db.query(core_models.Broker).all()

        # Convert to common format - using contact_name which is the actual field name
        parties = []
        for seller in sellers:
            parties.append({"id": str(seller.id), "contact_name": seller.contact_name})
        for buyer in buyers:
            parties.append({"id": str(buyer.id), "contact_name": buyer.contact_name})
        for broker in brokers:
            parties.append({"id": str(broker.id), "contact_name": broker.contact_name})

        return parties
    except Exception as e:
        logger.error(f"Failed to retrieve parties: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve parties")

# --- Health Check ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Simple test endpoint for debugging
@app.post("/api/auth/test-login")
def test_login_endpoint(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    print(f"TEST ENDPOINT: Received login request for: {user_credentials.email}", flush=True)
    
    try:
        # Test direct authentication
        user = authenticate_user(db, user_credentials.email, user_credentials.password)
        print(f"TEST ENDPOINT: Authentication result: {user is not None}", flush=True)
        
        if user:
            token = create_access_token({"sub": str(user.id)})
            print(f"TEST ENDPOINT: Token created successfully", flush=True)
            
            # Get role and permissions
            role_obj = db.query(rbac_models.Role).filter(rbac_models.Role.name == user.role).first()
            permissions = []
            if role_obj:
                permissions = [p.name for p in role_obj.permissions]
                print(f"TEST ENDPOINT: Found {len(permissions)} permissions", flush=True)
            
            return {
                "success": True,
                "message": "Login successful",
                "user_id": str(user.id),
                "email": user.email,
                "role": user.role,
                "permissions": permissions,
                "token_preview": token[:20] + "..."
            }
        else:
            print(f"TEST ENDPOINT: Authentication failed", flush=True)
            return {
                "success": False,
                "message": "Invalid credentials",
                "user_id": None,
                "email": user_credentials.email
            }
    except Exception as e:
        print(f"TEST ENDPOINT: Error occurred: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "user_id": None,
            "email": user_credentials.email
        }

# --- Test DB ---
@app.get("/api/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Connected to database successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")



if __name__ == "__main__":
    import uvicorn
    # Allow port configuration via environment variable, default to 8000
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)