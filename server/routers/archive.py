from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from core.database import get_db
from models import archive_models, core_models
import schemas.schemas as schemas
from core.auth import get_current_user, require_permission, get_user_from_raw_token
from crud import rbac_crud
import os
import shutil
import uuid
import datetime
import urllib.parse
import subprocess
import platform
from typing import List, Optional
from PIL import Image
import io

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/archive", tags=["Archive Management"])

# Permissions
PERM_ARCHIVE_READ = "archive_read"
PERM_ARCHIVE_WRITE = "archive_write"

# Restrictions
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.tiff'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check size if possible (spool file might not have size)
    # file.file.seek(0, os.SEEK_END)
    # size = file.file.tell()
    # file.file.seek(0)
    # However, FastAPI's UploadFile doesn't always have a size attribute until read.
    # We will check size during/after saving for simplicity, or use a workaround.
    return True

# Base Storage Path - using absolute path to avoid issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_PATH = os.path.join(BASE_DIR, "storage", "archive")
THUMBNAIL_PATH = os.path.join(BASE_DIR, "storage", "thumbnails")

def ensure_storage(db: Session):
    if not os.path.exists(STORAGE_PATH):
        os.makedirs(STORAGE_PATH)
    if not os.path.exists(THUMBNAIL_PATH):
        os.makedirs(THUMBNAIL_PATH)
        
        # Create initial folders ONLY if the entire storage path was missing (first time setup)
        system_folders = ["General", "Administrative", "Financial", "Projects"]
        for folder_name in system_folders:
            folder_path = os.path.join(STORAGE_PATH, folder_name)
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            
            new_folder = archive_models.ArchiveFolder(
                name=folder_name,
                path=folder_path,
                is_system=False,
                description=f"Initial folder for {folder_name} documents"
            )
            db.add(new_folder)
        db.commit()

# --- Helper Functions ---

def _generate_file_thumbnail(file_record: archive_models.ArchiveFile):
    """Generate and save a thumbnail for an image file."""
    try:
        # Check if it's an image
        ext = os.path.splitext(file_record.file_path)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            return None

        thumb_filename = f"thumb_{file_record.id}_{os.path.basename(file_record.file_path)}"
        thumb_path = os.path.join(THUMBNAIL_PATH, thumb_filename)

        # Check cache
        if os.path.exists(thumb_path):
            return thumb_path

        normalized_path = os.path.normpath(file_record.file_path)
        if not os.path.exists(normalized_path):
            return None

        with Image.open(normalized_path) as img:
            # Convert to RGB if necessary (for RGBA or P images)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Target size 200x200 (aspect ratio preserved)
            img.thumbnail((200, 200))
            
            # Save to cache
            if not os.path.exists(THUMBNAIL_PATH):
                os.makedirs(THUMBNAIL_PATH)
            img.save(thumb_path, "JPEG", quality=85)
            
        return thumb_path
    except Exception as e:
        logger.error(f"Failed to generate thumbnail for {file_record.id}: {str(e)}")
        return None

def _delete_file_thumbnail(file_id: int, file_path: str):
    """Delete the thumbnail associated with a file."""
    try:
        thumb_filename = f"thumb_{file_id}_{os.path.basename(file_path)}"
        thumb_path = os.path.join(THUMBNAIL_PATH, thumb_filename)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
            logger.info(f"Deleted thumbnail: {thumb_path}")
    except Exception as e:
        logger.error(f"Failed to delete thumbnail for {file_id}: {str(e)}")

# --- API Routes ---

@router.get("/init")
def init_archive(db: Session = Depends(get_db), current_user = Depends(require_permission("archive_write"))):
    ensure_storage(db)
    return {"status": "initialized"}

@router.get("/folders")
def get_folders(
    parent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    query = db.query(archive_models.ArchiveFolder).filter(archive_models.ArchiveFolder.parent_id == parent_id)
    return query.all()

@router.post("/folders")
def create_folder(
    folder_data: schemas.ArchiveFolderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    ensure_storage(db)
    # Get parent path
    parent_path = STORAGE_PATH
    if folder_data.parent_id:
        parent = db.query(archive_models.ArchiveFolder).get(folder_data.parent_id)
        if parent:
            parent_path = parent.path
            
    # Use absolute path for safety
    parent_path = os.path.abspath(parent_path)
    
    import re
    # Sanitize folder name
    clean_name = re.sub(r'[\\/*?:"<>|]', "", folder_data.name).strip()
    if not clean_name:
        clean_name = f"folder_{uuid.uuid4().hex[:6]}"
        
    folder_path = os.path.join(parent_path, clean_name)
    
    # Create physical folder
    try:
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)
            
        new_folder = archive_models.ArchiveFolder(
            name=clean_name,
            parent_id=folder_data.parent_id,
            path=folder_path,
            description=folder_data.description,
            created_by=current_user.id
        )
        db.add(new_folder)
        db.commit()
        db.refresh(new_folder)
        return new_folder
    except Exception as e:
        logger.error(f"Failed to create folder {folder_path}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")

@router.get("/files")
def get_files(
    folder_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    query = db.query(archive_models.ArchiveFile).filter(archive_models.ArchiveFile.folder_id == folder_id)
    total = query.count()
    files = query.offset(skip).limit(limit).all()
    return {
        "total": total,
        "files": files,
        "skip": skip,
        "limit": limit
    }

import mimetypes

@router.get("/files/{file_id}/view")
def view_file(
    file_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: view_file called for file_id={file_id}")
    
    # Manual auth check
    if not token:
        print("DEBUG: No token provided in query")
        raise HTTPException(status_code=401, detail="Token required")
        
    try:
        current_user = get_user_from_raw_token(token, db)
        # Check permission
        has_perm, _ = rbac_crud.check_user_permission(db, str(current_user.id), "archive_read")
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission archive_read required")
        print(f"DEBUG: Auth success for {current_user.email}")
    except Exception as e:
        print(f"DEBUG: Auth failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")

    file_record = db.query(archive_models.ArchiveFile).get(file_id)
    if not file_record:
        print(f"DEBUG: File {file_id} not found in DB")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Normalize path for Windows
    normalized_path = os.path.normpath(file_record.file_path)
    print(f"DEBUG: Normalized path: {normalized_path}")
    
    if not os.path.exists(normalized_path):
        print(f"DEBUG: File does not exist at {normalized_path}")
        # Last resort: try to find it relative to current STORAGE_PATH
        filename = os.path.basename(normalized_path)
        # We need to know which folder it's in.
        folder = db.query(archive_models.ArchiveFolder).get(file_record.folder_id)
        if folder:
            alt_path = os.path.join(folder.path, filename)
            if os.path.exists(alt_path):
                print(f"DEBUG: Found file at alt_path: {alt_path}")
                normalized_path = alt_path
            else:
                raise HTTPException(status_code=404, detail="Physical file not found")
        else:
            raise HTTPException(status_code=404, detail="Physical file not found")
            
    # Determine mime type
    ext = os.path.splitext(normalized_path)[1].lower()
    if ext == '.pdf':
        mime_type = 'application/pdf'
    else:
        mime_type, _ = mimetypes.guess_type(normalized_path)
        if not mime_type:
            mime_type = 'application/octet-stream'
            
    return FileResponse(
        path=normalized_path,
        media_type=mime_type,
        content_disposition_type="inline"
    )

@router.get("/files/{file_id}/thumbnail")
def get_thumbnail(
    file_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Manual auth check
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
        
    try:
        current_user = get_user_from_raw_token(token, db)
        # Check permission
        has_perm, _ = rbac_crud.check_user_permission(db, str(current_user.id), "archive_read")
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission archive_read required")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")

    file_record = db.query(archive_models.ArchiveFile).get(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if it's an image
    ext = os.path.splitext(file_record.file_path)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        # For non-images, we don't generate thumbnails here
        # The frontend should handle this by showing icons
        raise HTTPException(status_code=400, detail="Not an image file")

    thumb_filename = f"thumb_{file_id}_{os.path.basename(file_record.file_path)}"
    thumb_path = os.path.join(THUMBNAIL_PATH, thumb_filename)

    # Check cache first
    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, media_type="image/jpeg")

    # If not in cache, try to generate it (fallback for existing files)
    generated_path = _generate_file_thumbnail(file_record)
    if generated_path and os.path.exists(generated_path):
        return FileResponse(generated_path, media_type="image/jpeg")

    # If generation failed or not an image, return error or fallback
    normalized_path = os.path.normpath(file_record.file_path)
    if not os.path.exists(normalized_path):
        # Try alt path logic
        filename = os.path.basename(normalized_path)
        folder = db.query(archive_models.ArchiveFolder).get(file_record.folder_id)
        if folder:
            alt_path = os.path.join(folder.path, filename)
            if os.path.exists(alt_path):
                normalized_path = alt_path
            else:
                raise HTTPException(status_code=404, detail="Physical file not found")
        else:
            raise HTTPException(status_code=404, detail="Physical file not found")

    return FileResponse(normalized_path, media_type="image/jpeg")

@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Manual auth check
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
        
    try:
        current_user = get_user_from_raw_token(token, db)
        # Check permission
        has_perm, _ = rbac_crud.check_user_permission(db, str(current_user.id), "archive_download")
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission archive_download required")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")

    file_record = db.query(archive_models.ArchiveFile).get(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    normalized_path = os.path.normpath(file_record.file_path)
    if not os.path.exists(normalized_path):
        # Try alt path
        filename = os.path.basename(normalized_path)
        folder = db.query(archive_models.ArchiveFolder).get(file_record.folder_id)
        if folder:
            alt_path = os.path.join(folder.path, filename)
            if os.path.exists(alt_path):
                normalized_path = alt_path
            else:
                raise HTTPException(status_code=404, detail="Physical file not found")
        else:
            raise HTTPException(status_code=404, detail="Physical file not found")
        
    return FileResponse(
        path=normalized_path,
        filename=file_record.original_name,
        media_type='application/octet-stream'
    )

@router.get("/search")
def search_archive(
    q: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    # Search in folders and files
    folders = db.query(archive_models.ArchiveFolder).filter(
        archive_models.ArchiveFolder.name.ilike(f"%{q}%")
    ).all()
    
    files = db.query(archive_models.ArchiveFile).filter(
        or_(
            archive_models.ArchiveFile.name.ilike(f"%{q}%"),
            archive_models.ArchiveFile.description.ilike(f"%{q}%"),
            archive_models.ArchiveFile.ocr_text.ilike(f"%{q}%")
        )
    ).all()
    
    return {
        "folders": folders,
        "files": files
    }

@router.get("/stats")
@router.get("/dashboard")
async def get_archive_dashboard(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    try:
        total_folders = db.query(func.count(archive_models.ArchiveFolder.id)).scalar()
        total_files = db.query(func.count(archive_models.ArchiveFile.id)).scalar()
        
        # Calculate total size
        total_size = db.query(func.sum(archive_models.ArchiveFile.file_size)).scalar() or 0
        
        # Files by extension (top 5)
        files_by_ext_raw = db.query(
            archive_models.ArchiveFile.file_type, 
            func.count(archive_models.ArchiveFile.id)
        ).group_by(archive_models.ArchiveFile.file_type).order_by(func.count(archive_models.ArchiveFile.id).desc()).limit(5).all()
        
        files_by_ext = [{"ext": ext or "Unknown", "count": count} for ext, count in files_by_ext_raw]
        
        # Recent activity (last 5 files)
        recent_files = db.query(archive_models.ArchiveFile).order_by(archive_models.ArchiveFile.created_at.desc()).limit(5).all()
        activity = []
        for f in recent_files:
            activity.append({
                "id": f.id,
                "name": f.name,
                "created_at": f.created_at,
                "type": "file_upload"
            })
            
        # Files per month (last 6 months)
        six_months_ago = datetime.datetime.now() - datetime.timedelta(days=180)
        
        # Use different function for PostgreSQL vs SQLite
        is_postgres = "postgresql" in str(db.get_bind().url)
        if is_postgres:
            # PostgreSQL syntax
            monthly_stats_raw = db.query(
                func.to_char(archive_models.ArchiveFile.created_at, 'YYYY-MM').label('month'),
                func.count(archive_models.ArchiveFile.id)
            ).filter(archive_models.ArchiveFile.created_at >= six_months_ago).group_by('month').all()
        else:
            # SQLite syntax
            monthly_stats_raw = db.query(
                func.strftime('%Y-%m', archive_models.ArchiveFile.created_at).label('month'),
                func.count(archive_models.ArchiveFile.id)
            ).filter(archive_models.ArchiveFile.created_at >= six_months_ago).group_by('month').all()
        
        monthly_stats = [{"month": m, "count": c} for m, c in monthly_stats_raw]

        return {
            "total_folders": total_folders,
            "total_files": total_files,
            "total_size": total_size,
            "files_by_ext": files_by_ext,
            "activity": activity,
            "monthly_stats": monthly_stats
        }
    except Exception as e:
        logger.error(f"Error in get_archive_dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch archive stats: {str(e)}")

@router.post("/folders/{folder_id}/explore")
def explore_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    logger.info(f"Attempting to explore folder: {folder_id}")
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        logger.warning(f"Folder {folder_id} not found for exploration")
        raise HTTPException(status_code=404, detail="Folder not found")
        
    normalized_path = os.path.normpath(folder.path)
    
    if not os.path.exists(normalized_path):
        raise HTTPException(status_code=404, detail="Physical folder not found")
        
    try:
        if platform.system() == "Windows":
            os.startfile(normalized_path)
        elif platform.system() == "Darwin": # macOS
            subprocess.run(["open", normalized_path])
        else: # Linux
            subprocess.run(["xdg-open", normalized_path])
        return {"status": "success", "path": normalized_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open folder: {str(e)}")

@router.get("/status")
def archive_status(db: Session = Depends(get_db)):
    """Check storage and system status"""
    import os
    import platform
    
    storage_exists = os.path.exists(STORAGE_PATH)
    storage_writable = os.access(STORAGE_PATH, os.W_OK) if storage_exists else False
    
    return {
        "status": "online",
        "storage_path": STORAGE_PATH,
        "storage_exists": storage_exists,
        "storage_writable": storage_writable,
        "platform": platform.system(),
        "cwd": os.getcwd(),
        "total_folders": db.query(archive_models.ArchiveFolder).count(),
        "total_files": db.query(archive_models.ArchiveFile).count()
    }

@router.post("/upload")
async def upload_file(
    folder_id: int = Form(...),
    name: Optional[str] = Form(None), 
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    validate_file(file)
    ensure_storage(db)
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Get original filename and extension
    orig_filename, orig_ext = os.path.splitext(file.filename)
    
    # Use provided name or original filename
    base_name = name if name else orig_filename
    
    # Remove extension from base_name if it exists to prevent double extensions
    base_name, _ = os.path.splitext(base_name)
    
    # Sanitize base_name for filesystem
    import re
    # Remove invalid Windows characters but KEEP Arabic and other unicode
    # Invalid: \ / : * ? " < > |
    base_name = re.sub(r'[\\/*?:"<>|]', "", base_name).strip()
    if not base_name.replace(".", "").strip():
        base_name = f"file_{uuid.uuid4().hex[:4]}"
    
    # Prepare final storage filename: [Date]_[Name][Ext]
    date_str = datetime.date.today().strftime("%Y-%m-%d")
    
    storage_filename = f"{date_str}_{base_name}"
    
    # Ensure physical directory exists
    target_dir = os.path.abspath(folder.path)
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to recreate directory {target_dir}: {str(e)}")
            # Fallback to STORAGE_PATH if specific folder path fails
            target_dir = STORAGE_PATH
            
    # Add extension
    storage_filename += orig_ext
    
    # Ensure filename is unique in the physical folder
    file_path = os.path.join(target_dir, storage_filename)
    counter = 1
    while os.path.exists(file_path):
        unique_name = f"{date_str}_{base_name}_{counter}{orig_ext}"
        file_path = os.path.join(target_dir, unique_name)
        storage_filename = unique_name
        counter += 1
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Check size after saving
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"File too large ({file_size} bytes). Max: {MAX_FILE_SIZE} bytes")
            
        new_file = archive_models.ArchiveFile(
            folder_id=folder_id,
            name=storage_filename, 
            original_name=file.filename,
            file_type=orig_ext.replace(".", "").lower(),
            file_size=file_size,
            file_path=file_path,
            description=description,
            created_by=current_user.id
        )
        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        
        # Generate thumbnail immediately
        _generate_file_thumbnail(new_file)
        
        return new_file
    except Exception as e:
        logger.error(f"Upload failed for user {current_user.email}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/bulk-upload")
async def bulk_upload(
    parent_folder_id: int = Form(...),
    files: List[UploadFile] = File(...),
    relative_paths: str = Form(...), # JSON string list of paths
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    """
    Upload multiple files and recreate their folder structure recursively.
    relative_paths is a JSON list of strings like ["Folder1/file.txt", "Folder1/Sub/file2.txt"]
    """
    import json
    import re
    
    ensure_storage(db)
    
    logger.info(f"Bulk upload started: parent_folder_id={parent_folder_id}, files_count={len(files)}")
    
    try:
        paths = json.loads(relative_paths)
        logger.debug(f"Paths received: {paths}")
    except Exception:
        logger.error("Invalid relative_paths format received in bulk-upload")
        raise HTTPException(status_code=400, detail="Invalid relative_paths format")
        
    if len(files) != len(paths):
        logger.error(f"Mismatch: files={len(files)}, paths={len(paths)}")
        raise HTTPException(status_code=400, detail="Files and paths count mismatch")
        
    parent_folder = db.get(archive_models.ArchiveFolder, parent_folder_id)
    if not parent_folder:
        logger.error(f"Parent folder {parent_folder_id} not found")
        raise HTTPException(status_code=404, detail="Parent folder not found")
        
    results = []
    
    # Cache for folder lookups to avoid redundant DB queries
    # Key: (parent_id, folder_name), Value: folder_id
    folder_id_cache = {}
    
    # Helper to sanitize names
    def sanitize_name(name):
        # Remove invalid Windows characters but KEEP Arabic and other unicode
        # Invalid: \ / : * ? " < > |
        sanitized = re.sub(r'[\\/*?:"<>|]', "", name).strip()
        # Ensure it's not just spaces or dots which are invalid in Windows
        if not sanitized.replace(".", "").strip():
            return f"folder_{uuid.uuid4().hex[:4]}"
        return sanitized

    try:
        for file, rel_path in zip(files, paths):
            # Validate each file
            validate_file(file)
            
            # Normalize and split path
            # rel_path might be "folder/sub/file.txt"
            parts = rel_path.replace("\\", "/").split("/")
            original_filename = parts[-1]
            folder_structure = [sanitize_name(p) for p in parts[:-1] if sanitize_name(p)]
            
            current_parent_id = parent_folder_id
            
            # Traverse/Create folder structure
            for folder_name in folder_structure:
                cache_key = (current_parent_id, folder_name)
                
                if cache_key in folder_id_cache:
                    current_parent_id = folder_id_cache[cache_key]
                else:
                    # Check in DB
                    existing_folder = db.query(archive_models.ArchiveFolder).filter(
                        archive_models.ArchiveFolder.parent_id == current_parent_id,
                        archive_models.ArchiveFolder.name == folder_name
                    ).first()
                    
                    if not existing_folder:
                        # Get current parent path
                        parent_obj = db.get(archive_models.ArchiveFolder, current_parent_id)
                        if not parent_obj:
                             logger.error(f"Failed to find parent folder with id {current_parent_id}")
                             # If we lose the parent, we can't create children correctly
                             # Fallback to root or skip? Let's try to recover by using current_parent_id as root if it's None
                             continue
                             
                        new_folder_path = os.path.join(os.path.abspath(parent_obj.path), folder_name)
                        
                        # Create physical folder
                        try:
                            os.makedirs(new_folder_path, exist_ok=True)
                            logger.info(f"Created physical folder: {new_folder_path}")
                        except Exception as e:
                            logger.error(f"Failed to create directory {new_folder_path}: {str(e)}")
                            # Try a safe name if the original fails
                            safe_name = f"folder_{uuid.uuid4().hex[:6]}"
                            new_folder_path = os.path.join(os.path.abspath(parent_obj.path), safe_name)
                            os.makedirs(new_folder_path, exist_ok=True)
                            folder_name = f"{folder_name}_safe"
                            
                        existing_folder = archive_models.ArchiveFolder(
                            name=folder_name,
                            parent_id=current_parent_id,
                            path=new_folder_path,
                            created_by=current_user.id,
                            description=f"Auto-created during bulk upload"
                        )
                        db.add(existing_folder)
                        db.flush() # Get ID without full commit
                    
                    folder_id_cache[cache_key] = existing_folder.id
                    current_parent_id = existing_folder.id
                
            # Now current_parent_id is the target folder for the file
            target_folder = db.get(archive_models.ArchiveFolder, current_parent_id)
            if not target_folder:
                logger.error(f"Target folder {current_parent_id} not found for file {original_filename}")
                continue
            
            # Save file logic
            orig_filename, orig_ext = os.path.splitext(original_filename)
            date_str = datetime.date.today().strftime("%Y-%m-%d")
            
            # Sanitize filename
            clean_filename = sanitize_name(orig_filename)
            storage_filename = f"{date_str}_{clean_filename}{orig_ext}"
            
            # Ensure filename is unique in the physical folder
            file_path = os.path.join(os.path.abspath(target_folder.path), storage_filename)
            counter = 1
            while os.path.exists(file_path):
                unique_name = f"{date_str}_{clean_filename}_{counter}{orig_ext}"
                file_path = os.path.join(os.path.abspath(target_folder.path), unique_name)
                storage_filename = unique_name
                counter += 1
            
            # Save file
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Check size
                file_size = os.path.getsize(file_path)
                if file_size > MAX_FILE_SIZE:
                    os.remove(file_path)
                    results.append({"filename": original_filename, "status": "error", "message": f"File too large. Max {MAX_FILE_SIZE/(1024*1024)}MB"})
                    continue

                new_file = archive_models.ArchiveFile(
                    folder_id=target_folder.id,
                    name=storage_filename,
                    original_name=original_filename,
                    file_type=orig_ext.replace(".", ""),
                    file_size=file_size,
                    file_path=file_path,
                    description=f"Bulk upload: {original_filename}",
                    created_by=current_user.id
                )
                db.add(new_file)
                db.flush() # Get ID for thumbnail naming
                _generate_file_thumbnail(new_file)
                results.append({"filename": original_filename, "status": "success"})
            except Exception as e:
                logger.error(f"Failed to save file {file_path}: {str(e)}")
                results.append({"filename": original_filename, "status": "error", "message": str(e)})
            
        db.commit()
        logger.info(f"Bulk upload success: {len(results)} files uploaded")
        return {"status": "success", "uploaded_count": len(results)}

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")

@router.delete("/files/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_delete"))
):
    file = db.query(archive_models.ArchiveFile).get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Remove physical file
    if file.file_path and os.path.exists(file.file_path):
        try:
            # Delete thumbnail first
            _delete_file_thumbnail(file.id, file.file_path)
            os.remove(file.file_path)
            logger.info(f"Deleted physical file: {file.file_path}")
        except Exception as e:
            logger.error(f"Failed to delete physical file {file.file_path}: {str(e)}")
            
    db.delete(file)
    db.commit()
    return {"status": "success"}

@router.delete("/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_delete"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Removed is_system restriction as per user request
    # if folder.is_system:
    #    raise HTTPException(status_code=400, detail="Cannot delete system folder")
        
    # Find all files in this folder and its subfolders to delete their thumbnails
    def collect_file_ids(fld):
        f_data = []
        for fl in fld.files:
            f_data.append((fl.id, fl.file_path))
        for sub in fld.subfolders:
            f_data.extend(collect_file_ids(sub))
        return f_data

    files_to_cleanup = collect_file_ids(folder)
    for f_id, f_path in files_to_cleanup:
        _delete_file_thumbnail(f_id, f_path)

    # Remove physical folder
    if folder.path and os.path.exists(folder.path):
        try:
            shutil.rmtree(folder.path)
            logger.info(f"Deleted physical folder: {folder.path}")
        except Exception as e:
            logger.error(f"Failed to delete physical folder {folder.path}: {str(e)}")
            
    db.delete(folder)
    db.commit()
    return {"status": "success"}

# --- Bulk Operations (Copy/Move) ---

class BulkActionRequest(BaseModel):
    file_ids: List[int] = []
    folder_ids: List[int] = []
    target_folder_id: Optional[int] = None

@router.post("/bulk-delete")
def bulk_delete(
    request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_delete"))
):
    try:
        # Delete files
        for file_id in request.file_ids:
            file = db.query(archive_models.ArchiveFile).get(file_id)
            if file:
                # Delete thumbnail
                _delete_file_thumbnail(file.id, file.file_path)
                
                if os.path.exists(file.file_path):
                    try:
                        os.remove(file.file_path)
                    except Exception as e:
                        logger.error(f"Failed to delete physical file {file.file_path}: {str(e)}")
                db.delete(file)
        
        # Delete folders
        # Order by path length descending to delete subfolders before parents physically
        folders_to_delete = []
        for folder_id in request.folder_ids:
            folder = db.query(archive_models.ArchiveFolder).get(folder_id)
            if folder: # Removed is_system restriction
                folders_to_delete.append(folder)
        
        # Sort to ensure we handle deepest folders first
        folders_to_delete.sort(key=lambda x: len(x.path), reverse=True)
        
        for folder in folders_to_delete:
            if os.path.exists(folder.path):
                try:
                    shutil.rmtree(folder.path)
                except Exception as e:
                    logger.error(f"Failed to delete physical folder {folder.path}: {str(e)}")
            db.delete(folder)
                
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk delete failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")

@router.post("/bulk-move")
def bulk_move(
    request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    target_folder = db.query(archive_models.ArchiveFolder).get(request.target_folder_id)
    if not target_folder:
        raise HTTPException(status_code=404, detail="Target folder not found")

    # Move files
    for file_id in request.file_ids:
        file = db.query(archive_models.ArchiveFile).get(file_id)
        if file:
            old_path = file.file_path
            new_filename = os.path.basename(old_path)
            new_path = os.path.join(target_folder.path, new_filename)
            
            if os.path.exists(old_path):
                shutil.move(old_path, new_path)
                file.file_path = new_path
                file.folder_id = request.target_folder_id
    
    # Move folders
    for folder_id in request.folder_ids:
        folder = db.query(archive_models.ArchiveFolder).get(folder_id)
        if folder: # Removed is_system restriction
            # Check if moving into itself or its subfolder
            if folder.id == request.target_folder_id:
                continue
            
            old_path = folder.path
            new_path = os.path.join(target_folder.path, folder.name)
            
            if os.path.exists(old_path):
                shutil.move(old_path, new_path)
                folder.path = new_path
                folder.parent_id = request.target_folder_id
                
                # Recursively update paths of all subfolders and files (optional if using relative paths, but we use absolute)
                # For simplicity, we assume absolute paths need update
                def update_child_paths(fld):
                    for sub in fld.subfolders:
                        sub.path = os.path.join(fld.path, sub.name)
                        update_child_paths(sub)
                    for fl in fld.files:
                        fl.file_path = os.path.join(fld.path, os.path.basename(fl.file_path))
                
                update_child_paths(folder)

    db.commit()
    return {"status": "success"}

@router.post("/bulk-copy")
def bulk_copy(
    request: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    target_folder = db.query(archive_models.ArchiveFolder).get(request.target_folder_id)
    if not target_folder:
        raise HTTPException(status_code=404, detail="Target folder not found")

    # Copy files
    for file_id in request.file_ids:
        file = db.query(archive_models.ArchiveFile).get(file_id)
        if file:
            old_path = file.file_path
            if not os.path.exists(old_path):
                continue
                
            filename_base = os.path.basename(old_path)
            orig_name, orig_ext = os.path.splitext(filename_base)
            
            # Ensure unique filename
            new_filename = f"copy_{filename_base}"
            new_path = os.path.join(target_folder.path, new_filename)
            counter = 1
            while os.path.exists(new_path):
                new_filename = f"copy_{counter}_{filename_base}"
                new_path = os.path.join(target_folder.path, new_filename)
                counter += 1
            
            shutil.copy2(old_path, new_path)
            new_file = archive_models.ArchiveFile(
                folder_id=request.target_folder_id,
                name=new_filename,
                original_name=file.original_name,
                file_type=file.file_type,
                file_size=file.file_size,
                file_path=new_path,
                description=file.description,
                ocr_text=file.ocr_text,
                created_by=current_user.id
            )
            db.add(new_file)
            db.flush() # Get ID for thumbnail
            _generate_file_thumbnail(new_file)

    # Copy folders
    for folder_id in request.folder_ids:
        folder = db.query(archive_models.ArchiveFolder).get(folder_id)
        if folder:
            old_path = folder.path
            if not os.path.exists(old_path):
                continue
                
            new_folder_name = f"Copy of {folder.name}"
            new_path = os.path.join(target_folder.path, new_folder_name)
            counter = 1
            while os.path.exists(new_path):
                new_folder_name = f"Copy of {folder.name} ({counter})"
                new_path = os.path.join(target_folder.path, new_folder_name)
                counter += 1
            
            shutil.copytree(old_path, new_path)
            
            def clone_folder(old_fld, new_parent_id, new_base_path, is_root=False):
                cloned = archive_models.ArchiveFolder(
                    name=new_folder_name if is_root else old_fld.name,
                    path=new_base_path,
                    parent_id=new_parent_id,
                    description=old_fld.description,
                    created_by=current_user.id
                )
                db.add(cloned)
                db.flush() # Get ID
                
                for sub in old_fld.subfolders:
                    clone_folder(sub, cloned.id, os.path.join(new_base_path, sub.name))
                for fl in old_fld.files:
                    new_fl = archive_models.ArchiveFile(
                        folder_id=cloned.id,
                        name=fl.name,
                        original_name=fl.original_name,
                        file_type=fl.file_type,
                        file_size=fl.file_size,
                        file_path=os.path.join(new_base_path, os.path.basename(fl.file_path)),
                        description=fl.description,
                        ocr_text=fl.ocr_text,
                        created_by=current_user.id
                    )
                    db.add(new_fl)
                    db.flush()
                    _generate_file_thumbnail(new_fl)
            
            clone_folder(folder, request.target_folder_id, new_path, is_root=True)

    db.commit()
    return {"status": "success"}

# --- Scanner Management ---

@router.get("/scanners", response_model=List[schemas.ScannerDevice])
def get_scanners(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    return db.query(archive_models.ScannerDevice).all()

@router.post("/scanners", response_model=schemas.ScannerDevice)
def create_scanner(
    scanner: schemas.ScannerDeviceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    db_scanner = archive_models.ScannerDevice(
        **scanner.dict(),
        created_by=current_user.id
    )
    db.add(db_scanner)
    db.commit()
    db.refresh(db_scanner)
    return db_scanner

@router.put("/scanners/{scanner_id}", response_model=schemas.ScannerDevice)
def update_scanner(
    scanner_id: int,
    scanner: schemas.ScannerDeviceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    db_scanner = db.query(archive_models.ScannerDevice).get(scanner_id)
    if not db_scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    
    for key, value in scanner.dict().items():
        setattr(db_scanner, key, value)
        
    db.commit()
    db.refresh(db_scanner)
    return db_scanner

@router.delete("/scanners/{scanner_id}")
def delete_scanner(
    scanner_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    db_scanner = db.query(archive_models.ScannerDevice).get(scanner_id)
    if not db_scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
    
    db.delete(db_scanner)
    db.commit()
    return {"status": "success"}

# --- Scan Action ---

@router.post("/scan")
async def perform_scan(
    scanner_id: int = Form(...),
    folder_id: int = Form(...),
    filename: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    scanner = db.query(archive_models.ScannerDevice).get(scanner_id)
    if not scanner:
        raise HTTPException(status_code=404, detail="Scanner not found")
        
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # In a real environment, you would use a library like `pyinsane2` (TWAIN) 
    # or call a local scanning service. For this implementation, 
    # we will simulate the scan by creating a dummy image file.
    
    # Prepare final storage filename: [Date]_[Name]_[Description if exists][Ext]
    orig_filename, orig_ext = os.path.splitext(filename)
    if not orig_ext:
        orig_ext = ".jpg"
        
    import re
    base_name = re.sub(r'[\\/*?:"<>|]', "", orig_filename)
    date_str = datetime.date.today().strftime("%Y-%m-%d")
    
    storage_filename = f"{date_str}_{base_name}"
    if description:
        clean_desc = re.sub(r'[\\/*?:"<>|]', "", description)[:50]
        storage_filename += f"_{clean_desc}"
    
    storage_filename += orig_ext
    
    # Ensure filename is unique in the physical folder
    file_path = os.path.join(folder.path, storage_filename)
    counter = 1
    while os.path.exists(file_path):
        unique_name = f"{date_str}_{base_name}"
        if description:
            unique_name += f"_{clean_desc}"
        unique_name += f"_{counter}{orig_ext}"
        file_path = os.path.join(folder.path, unique_name)
        storage_filename = unique_name
        counter += 1
    
    # Simulate scanning (creating a 1x1 empty file or copying a placeholder)
    # In production, this would be: data = scanner_service.scan(scanner.connection_string)
    with open(file_path, "wb") as f:
        f.write(b"SIMULATED_SCAN_DATA") 
        
    new_file = archive_models.ArchiveFile(
        folder_id=folder_id,
        name=storage_filename,
        original_name=filename,
        file_type=orig_ext.replace(".", ""),
        file_size=os.path.getsize(file_path),
        file_path=file_path,
        description=description,
        created_by=current_user.id
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # Generate thumbnail
    _generate_file_thumbnail(new_file)
    
    return new_file
