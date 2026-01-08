from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
import zipfile
import tempfile
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from core.database import get_db
from models import archive_models, core_models, rbac_models
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
import re
import mimetypes
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
# ALLOWED_EXTENSIONS removed to allow all file types as requested
# MAX_FILE_SIZE removed/increased for unlimited uploads
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # Set to 5GB as a practical "unlimited" for most servers

def validate_file(file: UploadFile):
    # No extension restriction anymore
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

# --- Helper Functions ---
def check_item_access(item, current_user, db: Session, required_level: str = "view"):
    """
    Professional Access Control Logic for Archive:
    1. System Admin has full access.
    2. Archive Admin has full access.
    3. Item Creator has full access.
    4. For others: Check explicit permissions or public status.
    """
    # 1. System & Archive Admin bypass
    user_role = getattr(current_user, 'role', 'user')
    if user_role in ["admin", "archive_admin"]:
        return True
        
    # Determine the folder for permission check
    folder_id = item.id if isinstance(item, archive_models.ArchiveFolder) else item.folder_id
    
    # 2. Check Ownership
    if item.created_by == current_user.id:
        return True
        
    # 3. Check ACL (Folder Permissions)
    acl_permission = db.query(archive_models.ArchiveFolderPermission).filter(
        archive_models.ArchiveFolderPermission.folder_id == folder_id,
        archive_models.ArchiveFolderPermission.user_id == current_user.id
    ).first()
    
    if acl_permission:
        levels = {"view": 1, "edit": 2, "full": 3}
        user_level = levels.get(acl_permission.permission_level, 0)
        req_level = levels.get(required_level, 1)
        
        if user_level >= req_level:
            return True

    # 4. Public Access (View only)
    if required_level == "view" and getattr(item, 'is_public', False):
        return True
        
    raise HTTPException(
        status_code=403, 
        detail=f"Access denied: You do not have '{required_level}' permission for this item."
    )

# --- API Routes ---

@router.get("/users", response_model=List[schemas.User])
def get_archive_users(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get users who have archive-related permissions or roles.
    Used for assigning folder permissions.
    """
    try:
        # Debug log
        logger.info(f"Fetching archive users for user: {current_user.email}, role: {getattr(current_user, 'role', 'N/A')}")
        
        # 1. Get ALL users first as a base
        all_users = db.query(core_models.User).all()
        logger.info(f"Total users in DB: {len(all_users)}")
        
        # 2. Get roles with archive permissions
        role_names = ["admin", "archive_admin", "archive_viewer", "manager"]
        try:
            # Query roles that have any permission starting with 'archive_'
            roles_with_archive_perms = db.query(rbac_models.Role.name).join(
                rbac_models.Role.permissions
            ).filter(
                rbac_models.Permission.name.like("archive_%")
            ).all()
            
            if roles_with_archive_perms:
                role_names.extend([r[0] for r in roles_with_archive_perms])
        except Exception as e:
            logger.warning(f"Could not fetch roles by permissions: {e}")
            
        # 3. Filter users
        # We include users who have any of the identified roles, OR whose role name contains 'archive'
        archive_users = [
            u for u in all_users 
            if (u.role in role_names or 
                "archive" in (u.role or "").lower())
        ]
        
        logger.info(f"Filtered archive users: {len(archive_users)}")
        
        # If no users found through filtering, or if user is admin, return all users as a safe fallback
        # This ensures the UI is never empty when trying to manage permissions
        if not archive_users or getattr(current_user, 'role', '') == 'admin':
            logger.info("Returning all users as fallback (either empty filter or admin requester)")
            return all_users
            
        return archive_users
    except Exception as e:
        logger.error(f"Error in get_archive_users: {str(e)}", exc_info=True)
        # Final safety net: return all users
        return db.query(core_models.User).all()

@router.get("/init")
def init_archive(db: Session = Depends(get_db), current_user = Depends(require_permission("archive_write"))):
    ensure_storage(db)
    return {"status": "initialized"}

def get_breadcrumb_path(db: Session, folder_id: Optional[int]) -> str:
    if not folder_id:
        return "Main Archive"
    
    path_parts = []
    current_id = folder_id
    while current_id:
        folder = db.query(archive_models.ArchiveFolder).filter(archive_models.ArchiveFolder.id == current_id).first()
        if folder:
            path_parts.append(folder.name)
            current_id = folder.parent_id
        else:
            break
    
    return " / ".join(reversed(path_parts))

@router.get("/search")
def search_archive(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    user_role = getattr(current_user, 'role', 'user')
    is_admin = user_role in ["admin", "archive_admin"]
    
    # 1. Search Folders
    folder_query = db.query(archive_models.ArchiveFolder).filter(
        archive_models.ArchiveFolder.name.ilike(f"%{q}%")
    )
    
    if not is_admin:
        shared_folder_ids = db.query(archive_models.ArchiveFolderPermission.folder_id).filter(
            archive_models.ArchiveFolderPermission.user_id == current_user.id
        ).all()
        shared_folder_ids = [f[0] for f in shared_folder_ids]
        
        folder_query = folder_query.filter(
            or_(
                archive_models.ArchiveFolder.created_by == current_user.id,
                archive_models.ArchiveFolder.is_public == True,
                archive_models.ArchiveFolder.id.in_(shared_folder_ids)
            )
        )
    
    folders_raw = folder_query.limit(20).all()
    folders = []
    
    # Calculate sizes and counts for folders found
    for f in folders_raw:
        # Get path
        f_path = get_breadcrumb_path(db, f.parent_id)
        
        all_folder_ids = [f.id]
        to_process = [f.id]
        while to_process:
            curr_id = to_process.pop()
            subs = [sf[0] for sf in db.query(archive_models.ArchiveFolder.id).filter(
                archive_models.ArchiveFolder.parent_id == curr_id
            ).all()]
            all_folder_ids.extend(subs)
            to_process.extend(subs)
            
        total_size = db.query(func.sum(archive_models.ArchiveFile.file_size)).filter(
            archive_models.ArchiveFile.folder_id.in_(all_folder_ids)
        ).scalar() or 0
        
        f_count = db.query(func.count(archive_models.ArchiveFile.id)).filter(
            archive_models.ArchiveFile.folder_id == f.id
        ).scalar() or 0
        sf_count = db.query(func.count(archive_models.ArchiveFolder.id)).filter(
            archive_models.ArchiveFolder.parent_id == f.id
        ).scalar() or 0
        
        # We need to convert to dict to add custom fields or use an ad-hoc schema
        f_dict = {
            "id": f.id,
            "name": f.name,
            "parent_id": f.parent_id,
            "created_at": f.created_at,
            "total_size": total_size,
            "item_count": f_count + sf_count,
            "breadcrumb": f_path
        }
        folders.append(f_dict)

    # 2. Search Files
    file_query = db.query(archive_models.ArchiveFile).filter(
        archive_models.ArchiveFile.name.ilike(f"%{q}%")
    )
    
    if not is_admin:
        file_query = file_query.filter(
            or_(
                archive_models.ArchiveFile.created_by == current_user.id,
                archive_models.ArchiveFile.is_public == True
            )
        )
        
    files_raw = file_query.limit(50).all()
    files = []
    for f in files_raw:
        files.append({
            "id": f.id,
            "name": f.name,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "created_at": f.created_at,
            "folder_id": f.folder_id,
            "breadcrumb": get_breadcrumb_path(db, f.folder_id)
        })
    
    return {
        "folders": folders,
        "files": files
    }

@router.get("/folders")
def get_folders(
    parent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    user_role = getattr(current_user, 'role', 'user')
    is_admin = user_role in ["admin", "archive_admin"]
    
    logger.info(f"User {current_user.email} (role: {user_role}) fetching folders for parent_id: {parent_id}")
    
    query = db.query(archive_models.ArchiveFolder).filter(archive_models.ArchiveFolder.parent_id == parent_id)
    
    # Filter by ownership, public status, or ACL
    if not is_admin:
        # Get IDs of folders where user has explicit permission
        shared_folder_ids = db.query(archive_models.ArchiveFolderPermission.folder_id).filter(
            archive_models.ArchiveFolderPermission.user_id == current_user.id
        ).all()
        shared_folder_ids = [f[0] for f in shared_folder_ids]

        query = query.filter(
            or_(
                archive_models.ArchiveFolder.created_by == current_user.id,
                archive_models.ArchiveFolder.is_public == True,
                archive_models.ArchiveFolder.id.in_(shared_folder_ids)
            )
        )
        
    folders = query.all()
    
    # Calculate recursive sizes and item counts
    for folder in folders:
        # 1. Get all subfolder IDs recursively for total size calculation
        all_folder_ids = [folder.id]
        to_process = [folder.id]
        while to_process:
            current_id = to_process.pop()
            sub_ids = [sf[0] for sf in db.query(archive_models.ArchiveFolder.id).filter(
                archive_models.ArchiveFolder.parent_id == current_id
            ).all()]
            all_folder_ids.extend(sub_ids)
            to_process.extend(sub_ids)
            
        # 2. Sum file sizes in all these folders (recursive)
        total_size = db.query(func.sum(archive_models.ArchiveFile.file_size)).filter(
            archive_models.ArchiveFile.folder_id.in_(all_folder_ids)
        ).scalar() or 0
        
        # 3. Count items directly inside this folder (non-recursive count for the "(X Items)" label)
        file_count = db.query(func.count(archive_models.ArchiveFile.id)).filter(
            archive_models.ArchiveFile.folder_id == folder.id
        ).scalar() or 0
        
        subfolder_count = db.query(func.count(archive_models.ArchiveFolder.id)).filter(
            archive_models.ArchiveFolder.parent_id == folder.id
        ).scalar() or 0
        
        folder.total_size = total_size
        folder.item_count = file_count + subfolder_count

    logger.info(f"Found {len(folders)} folders for parent_id {parent_id}")
    return folders

@router.post("/folders")
def create_folder(
    folder_data: schemas.ArchiveFolderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    ensure_storage(db)
    
    import re
    # Sanitize folder name
    clean_name = re.sub(r'[\\/*?:"<>|]', "", folder_data.name).strip()
    if not clean_name:
        clean_name = f"folder_{uuid.uuid4().hex[:6]}"
        
    # 1. Check if folder with same name already exists in this parent
    existing = db.query(archive_models.ArchiveFolder).filter(
        archive_models.ArchiveFolder.parent_id == folder_data.parent_id,
        archive_models.ArchiveFolder.name == clean_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"A folder with the name '{clean_name}' already exists in this directory.")

    # Get parent path
    parent_path = STORAGE_PATH
    if folder_data.parent_id:
        parent = db.query(archive_models.ArchiveFolder).get(folder_data.parent_id)
        if parent:
            parent_path = parent.path
            
    # Use absolute path for safety
    parent_path = os.path.abspath(parent_path)
    
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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")

@router.get("/files")
def get_files(
    folder_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    # First, verify access to the parent folder
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    check_item_access(folder, current_user, db)
    
    query = db.query(archive_models.ArchiveFile).filter(archive_models.ArchiveFile.folder_id == folder_id)
    
    # Filter files by ownership or public status
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        query = query.filter(
            or_(
                archive_models.ArchiveFile.created_by == current_user.id,
                archive_models.ArchiveFile.is_public == True
            )
        )
        
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
    
    # Check item access
    check_item_access(file_record, current_user, db)
    
    # Normalize path for Windows
    normalized_path = os.path.normpath(file_record.file_path)
    print(f"DEBUG: Normalized path from DB: {normalized_path}")
    
    # Check if file exists. If not, try to reconstruct path from current STORAGE_PATH
    if not os.path.exists(normalized_path):
        print(f"DEBUG: File does not exist at DB path. Attempting reconstruction...")
        
        # 1. Try migration reconstruction (flexible split)
        found_path = None
        path_lower = normalized_path.lower()
        # Clean the path from any absolute prefixes to get relative part
        parts = re.split(r'storage[\\/]archive[\\/]', path_lower, flags=re.IGNORECASE)
        relative_part = parts[-1] if len(parts) > 1 else os.path.basename(normalized_path)
        
        # Try joining with current STORAGE_PATH
        new_path = os.path.normpath(os.path.join(STORAGE_PATH, relative_part))
        if os.path.exists(new_path):
            found_path = new_path
        
        # 2. Try markers if not found
        if not found_path:
            for marker in ["storage\\archive", "storage/archive", "archive"]:
                if marker in path_lower:
                    relative_part = path_lower.split(marker)[-1].lstrip("\\/")
                    new_path = os.path.normpath(os.path.join(STORAGE_PATH, relative_part))
                    if os.path.exists(new_path):
                        found_path = new_path
                        break
        
        # 2. Try finding via folder with improved flexibility
        if not found_path:
            folder = db.query(archive_models.ArchiveFolder).get(file_record.folder_id)
            if folder:
                # Try to fix folder path first
                folder_path = os.path.normpath(folder.path)
                if not os.path.exists(folder_path):
                    for marker in ["storage\\archive", "storage/archive", "archive"]:
                        if marker in folder_path.lower():
                            rel_folder = folder_path.lower().split(marker)[-1].lstrip("\\/")
                            new_f_path = os.path.normpath(os.path.join(STORAGE_PATH, rel_folder))
                            if os.path.exists(new_f_path):
                                folder.path = new_f_path
                                db.commit()
                                folder_path = new_f_path
                                break

                if os.path.exists(folder_path):
                    filenames = [file_record.original_name, file_record.name, os.path.basename(normalized_path)]
                    for fname in filter(None, filenames):
                        p = os.path.normpath(os.path.join(folder_path, fname))
                        if os.path.exists(p):
                            found_path = p
                            break

    # FINAL RESORT: Recursive search in STORAGE_PATH (Slow but effective)
    if not os.path.exists(normalized_path):
        print(f"DEBUG: File not found at {normalized_path}. Starting smart search...")
        target_filename = os.path.basename(normalized_path).lower()
        original_filename = file_record.original_name.lower() if file_record.original_name else None
        
        found_path = None
        for root, dirs, files in os.walk(STORAGE_PATH):
            for f in files:
                f_lower = f.lower()
                # Try exact match, original name match, or stripped match (ignore extra spaces/encoding issues)
                if f_lower == target_filename or (original_filename and f_lower == original_filename):
                    found_path = os.path.join(root, f)
                    break
                
                # Stripped match for Arabic characters issues
                f_stripped = "".join(f_lower.split())
                t_stripped = "".join(target_filename.split())
                if f_stripped == t_stripped:
                    found_path = os.path.join(root, f)
                    break
            if found_path: break
            
        if found_path:
            normalized_path = os.path.normpath(found_path)
            file_record.file_path = normalized_path
            db.commit()
            print(f"DEBUG: Smart search found file at: {normalized_path}")
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Physical file not found. Checked DB path and performed deep scan in {STORAGE_PATH}. Please ensure the file exists."
            )

    # Final verification before serving
    # Use long path support for Windows
    if not normalized_path.startswith("\\\\?\\"):
        abs_path = os.path.abspath(normalized_path)
        long_path = "\\\\?\\" + abs_path
        if os.path.exists(long_path):
            normalized_path = long_path
        elif os.path.exists(abs_path):
            normalized_path = abs_path
            
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

@router.get("/admin/full-report")
def get_full_archive_report(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """
    Generates a full report of all files and their status on disk.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    all_files = db.query(archive_models.ArchiveFile).all()
    report = {
        "summary": {
            "total_files_in_db": len(all_files),
            "healthy_files": 0,
            "moved_but_found": 0,
            "completely_missing": 0
        },
        "details": {
            "moved_files": [],
            "missing_files": []
        }
    }

    # Pre-scan storage to speed up lookups
    all_disk_files = {}
    for root, _, files in os.walk(STORAGE_PATH):
        for f in files:
            all_disk_files[f.lower()] = os.path.join(root, f)

    for file in all_files:
        current_path = os.path.normpath(file.file_path)
        
        # 1. Check if healthy
        if os.path.exists(current_path):
            report["summary"]["healthy_files"] += 1
            continue
        
        # 2. Try to find it in our pre-scanned disk map
        found_path = None
        storage_name = os.path.basename(current_path).lower()
        original_name = file.original_name.lower() if file.original_name else None
        
        if storage_name in all_disk_files:
            found_path = all_disk_files[storage_name]
        elif original_name and original_name in all_disk_files:
            found_path = all_disk_files[original_name]
        
        if found_path:
            report["summary"]["moved_but_found"] += 1
            report["details"]["moved_files"].append({
                "id": file.id,
                "name": file.name,
                "old_path": current_path,
                "new_path": found_path
            })
        else:
            report["summary"]["completely_missing"] += 1
            report["details"]["missing_files"].append({
                "id": file.id,
                "name": file.name,
                "db_path": current_path,
                "original_name": file.original_name
            })

    return report

@router.post("/admin/force-repair")
def force_repair_paths(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    """
    Bulk repair all file and folder paths in the database as a background task.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    def repair_worker():
        from core.database import SessionLocal
        worker_db = SessionLocal()
        try:
            print("REPAIR: Starting background archive repair...")
            # 1. Pre-scan disk folders and files
            all_disk_folders = {}
            all_disk_files = {}
            for root, dirs, fs in os.walk(STORAGE_PATH):
                for d in dirs:
                    all_disk_folders[d.lower()] = os.path.join(root, d)
                for f in fs:
                    all_disk_files[f.lower()] = os.path.join(root, f)

            # 2. Fix Folders
            folders = worker_db.query(archive_models.ArchiveFolder).all()
            folder_fixes = 0
            for folder in folders:
                if not os.path.exists(folder.path):
                    name_lower = folder.name.lower()
                    if name_lower in all_disk_folders:
                        folder.path = all_disk_folders[name_lower]
                        folder_fixes += 1
            worker_db.commit()

            # 3. Fix Files
            files = worker_db.query(archive_models.ArchiveFile).all()
            file_fixes = 0
            for file in files:
                if not os.path.exists(file.file_path):
                    storage_name = os.path.basename(file.file_path).lower()
                    original_name = file.original_name.lower() if file.original_name else None
                    
                    new_path = None
                    if storage_name in all_disk_files:
                        new_path = all_disk_files[storage_name]
                    elif original_name and original_name in all_disk_files:
                        new_path = all_disk_files[original_name]
                        
                    if new_path:
                        file.file_path = new_path
                        file_fixes += 1
            worker_db.commit()
            print(f"REPAIR: Finished. Repaired {folder_fixes} folders and {file_fixes} files.")
        except Exception as e:
            print(f"REPAIR ERROR: {str(e)}")
        finally:
            worker_db.close()

    background_tasks.add_task(repair_worker)
    return {"message": "Full archive repair process started in the background. Check logs for details."}

@router.post("/items/copy-move")
def copy_move_items(
    data: schemas.ArchiveItemCopyMove,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    """
    Bulk copy or move files and folders.
    """
    target_folder = None
    if data.target_folder_id:
        target_folder = db.query(archive_models.ArchiveFolder).get(data.target_folder_id)
        if not target_folder:
            raise HTTPException(status_code=404, detail="Target folder not found")
        
        # Check write access to target folder
        check_item_access(target_folder, current_user, db, required_level="edit")

    target_path = STORAGE_PATH if not target_folder else target_folder.path
    results = {"copied": [], "moved": [], "failed": []}

    # --- Helper: Recursive Path Update for DB ---
    def update_db_paths(old_base_path, new_base_path):
        # Normalize paths for comparison
        old_base_path = os.path.normpath(old_base_path)
        new_base_path = os.path.normpath(new_base_path)
        
        # Ensure we only match sub-items by adding a separator if not present
        search_path = old_base_path
        if not search_path.endswith(os.sep):
            search_path += os.sep
            
        # Update all subfolders
        subfolders = db.query(archive_models.ArchiveFolder).filter(
            archive_models.ArchiveFolder.path.like(f"{search_path}%")
        ).all()
        for f in subfolders:
            f.path = f.path.replace(old_base_path, new_base_path, 1)
        
        # Update all files within these folders
        subfiles = db.query(archive_models.ArchiveFile).filter(
            archive_models.ArchiveFile.file_path.like(f"{search_path}%")
        ).all()
        for f in subfiles:
            f.file_path = f.file_path.replace(old_base_path, new_base_path, 1)

    # --- 1. Process Files ---
    for file_id in data.file_ids:
        file_record = db.query(archive_models.ArchiveFile).get(file_id)
        if not file_record:
            results["failed"].append({"id": file_id, "type": "file", "reason": "Not found"})
            continue
            
        try:
            # Check view access to file (for copy/move)
            # and we already checked edit access to target folder above
            check_item_access(file_record, current_user, db, required_level="view")
            
            old_path = os.path.normpath(file_record.file_path)
            if not os.path.exists(old_path):
                results["failed"].append({"id": file_id, "name": file_record.name, "reason": "Physical file missing"})
                continue

            new_filename = file_record.name
            new_path = os.path.join(target_path, new_filename)
            
            # Name collision
            counter = 1
            name_base, ext = os.path.splitext(new_filename)
            while os.path.exists(new_path):
                new_path = os.path.join(target_path, f"{name_base}_{counter}{ext}")
                counter += 1
            
            if data.operation == "copy":
                shutil.copy2(old_path, new_path)
                
                # Verification
                if not os.path.exists(new_path):
                    raise Exception("Physical copy failed: File not found at destination")
                
                new_file = archive_models.ArchiveFile(
                    name=os.path.basename(new_path),
                    original_name=file_record.original_name,
                    folder_id=data.target_folder_id,
                    file_type=file_record.file_type,
                    file_size=file_record.file_size,
                    file_path=new_path,
                    description=file_record.description,
                    created_by=current_user.id
                )
                db.add(new_file)
                results["copied"].append(file_id)
            else: # move
                shutil.move(old_path, new_path)
                
                # Verification
                if not os.path.exists(new_path):
                    raise Exception("Physical move failed: File not found at destination")
                
                file_record.file_path = new_path
                file_record.folder_id = data.target_folder_id
                file_record.name = os.path.basename(new_path)
                results["moved"].append(file_id)
        except Exception as e:
            results["failed"].append({"id": file_id, "type": "file", "reason": str(e)})

    # --- 2. Process Folders ---
    for folder_id in data.folder_ids:
        folder_record = db.query(archive_models.ArchiveFolder).get(folder_id)
        if not folder_record:
            results["failed"].append({"id": folder_id, "type": "folder", "reason": "Not found"})
            continue
            
        try:
            # Check edit access to folder being moved/copied
            check_item_access(folder_record, current_user, db, required_level="edit")
            
            # Prevent moving folder into itself or its own subfolders
            old_path = os.path.normpath(folder_record.path)
            if data.operation == "move":
                if data.target_folder_id == folder_id:
                    results["failed"].append({"id": folder_id, "name": folder_record.name, "reason": "Cannot move folder into itself"})
                    continue
                
                # Check if target is a subfolder of this folder
                target_path_norm = os.path.normpath(target_path)
                if target_path_norm.startswith(old_path + os.sep) or target_path_norm == old_path:
                    results["failed"].append({"id": folder_id, "name": folder_record.name, "reason": "Cannot move folder into its own subfolder"})
                    continue

            if not os.path.exists(old_path):
                results["failed"].append({"id": folder_id, "name": folder_record.name, "reason": "Physical folder missing"})
                continue

            new_folder_name = folder_record.name
            new_path = os.path.join(target_path, new_folder_name)
            
            # Name collision for folders
            counter = 1
            while os.path.exists(new_path):
                new_path = os.path.join(target_path, f"{new_folder_name}_{counter}")
                counter += 1

            if data.operation == "copy":
                shutil.copytree(old_path, new_path)
                
                # Verification
                if not os.path.exists(new_path):
                    raise Exception("Physical copy failed: Folder not found at destination")
                
                # Recursive DB Record Creation for Copy
                def clone_folder_db(old_folder, new_parent_id, new_folder_path):
                    cloned = archive_models.ArchiveFolder(
                        name=os.path.basename(new_folder_path),
                        parent_id=new_parent_id,
                        path=new_folder_path,
                        description=old_folder.description,
                        created_by=current_user.id
                    )
                    db.add(cloned)
                    db.flush() # Get ID
                    
                    # Clone files in this folder
                    old_files = db.query(archive_models.ArchiveFile).filter_by(folder_id=old_folder.id).all()
                    for of in old_files:
                        nf_path = os.path.join(new_folder_path, of.name)
                        nf = archive_models.ArchiveFile(
                            name=of.name,
                            original_name=of.original_name,
                            folder_id=cloned.id,
                            file_type=of.file_type,
                            file_size=of.file_size,
                            file_path=nf_path,
                            description=of.description,
                            created_by=current_user.id
                        )
                        db.add(nf)
                    
                    # Clone subfolders
                    old_subfolders = db.query(archive_models.ArchiveFolder).filter_by(parent_id=old_folder.id).all()
                    for osf in old_subfolders:
                        clone_folder_db(osf, cloned.id, os.path.join(new_folder_path, osf.name))

                clone_folder_db(folder_record, data.target_folder_id, new_path)
                results["copied"].append(folder_id)
            else: # move
                shutil.move(old_path, new_path)
                
                # Verification
                if not os.path.exists(new_path):
                    raise Exception("Physical move failed: Folder not found at destination")
                
                old_base = folder_record.path
                folder_record.path = new_path
                folder_record.parent_id = data.target_folder_id
                folder_record.name = os.path.basename(new_path)
                
                # Update all nested paths in DB
                update_db_paths(old_base, new_path)
                results["moved"].append(folder_id)
        except Exception as e:
            results["failed"].append({"id": folder_id, "type": "folder", "reason": str(e)})

    db.commit()
    return results

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
    
    # Check item access
    check_item_access(file_record, current_user, db)
    
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
    
    # Check item access
    check_item_access(file_record, current_user, db)
    
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

def normalize_arabic(text: str) -> str:
    if not text:
        return ""
    # Remove Arabic diacritics
    text = re.sub(r'[\u064B-\u0652]', '', text)
    # Normalize Alif
    text = re.sub(r'[أإآ]', 'ا', text)
    # Normalize Teh Marbuta
    text = re.sub(r'ة', 'ه', text)
    # Normalize Ya
    text = re.sub(r'ى', 'ي', text)
    return text.lower().strip()

@router.get("/search")
def search_archive(
    q: str = Query(...),
    folder_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """
    Enhanced search for files and folders with Arabic normalization support.
    """
    normalized_q = normalize_arabic(q)
    search_pattern = f"%{q}%"
    norm_search_pattern = f"%{normalized_q}%"

    # Search folders
    folder_query = db.query(archive_models.ArchiveFolder)
    if folder_id:
        folder_query = folder_query.filter(archive_models.ArchiveFolder.parent_id == folder_id)
    
    folder_query = folder_query.filter(
        or_(
            archive_models.ArchiveFolder.name.ilike(search_pattern),
            # Add a custom check for normalized names if we had a normalized column, 
            # but since we don't, we'll stick to ilike for now or use a hybrid approach
            archive_models.ArchiveFolder.description.ilike(search_pattern)
        )
    )
    
    # Search files
    file_query = db.query(archive_models.ArchiveFile)
    if folder_id:
        file_query = file_query.filter(archive_models.ArchiveFile.folder_id == folder_id)
        
    file_query = file_query.filter(
        or_(
            archive_models.ArchiveFile.name.ilike(search_pattern),
            archive_models.ArchiveFile.original_name.ilike(search_pattern),
            archive_models.ArchiveFile.description.ilike(search_pattern),
            archive_models.ArchiveFile.ocr_text.ilike(search_pattern)
        )
    )

    # Filter by permissions
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        # Get accessible folder IDs
        shared_folder_ids = db.query(archive_models.ArchiveFolderPermission.folder_id).filter(
            archive_models.ArchiveFolderPermission.user_id == current_user.id
        ).all()
        shared_folder_ids = [f[0] for f in shared_folder_ids]

        folder_query = folder_query.filter(
            or_(
                archive_models.ArchiveFolder.created_by == current_user.id,
                archive_models.ArchiveFolder.is_public == True,
                archive_models.ArchiveFolder.id.in_(shared_folder_ids)
            )
        )
        file_query = file_query.filter(
            or_(
                archive_models.ArchiveFile.created_by == current_user.id,
                archive_models.ArchiveFile.is_public == True,
                archive_models.ArchiveFile.folder_id.in_(shared_folder_ids)
            )
        )

    return {
        "folders": folder_query.limit(50).all(),
        "files": file_query.limit(100).all(),
        "query": q
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

@router.get("/admin/health-check")
def archive_health_check(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """
    Comprehensive system check to verify migration success and system health.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    total_files = db.query(archive_models.ArchiveFile).count()
    total_folders = db.query(archive_models.ArchiveFolder).count()
    
    # Sample 100 files for quick check
    sample_files = db.query(archive_models.ArchiveFile).limit(100).all()
    missing_in_sample = 0
    for f in sample_files:
        if not os.path.exists(f.file_path):
            missing_in_sample += 1
            
    # Check storage status
    storage_info = {
        "path": STORAGE_PATH,
        "exists": os.path.exists(STORAGE_PATH),
        "writable": os.access(STORAGE_PATH, os.W_OK) if os.path.exists(STORAGE_PATH) else False,
        "total_size_db": db.query(func.sum(archive_models.ArchiveFile.file_size)).scalar() or 0
    }

    return {
        "status": "healthy" if missing_in_sample == 0 else "degraded",
        "migration_success_estimate": f"{100 - missing_in_sample}%" if sample_files else "N/A",
        "summary": {
            "total_files": total_files,
            "total_folders": total_folders,
            "missing_in_sample": missing_in_sample,
            "sample_size": len(sample_files)
        },
        "storage": storage_info,
        "recommendations": [
            "Run /admin/force-repair if migration_success_estimate is below 100%",
            "Check storage permissions if storage.writable is false"
        ]
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
    current_user = Depends(require_permission("archive_write"))
):
    file = db.query(archive_models.ArchiveFile).get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
        
    check_item_access(file, current_user, db, required_level="full")
    
    # Delete physical file
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
    current_user = Depends(require_permission("archive_write"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    check_item_access(folder, current_user, db, required_level="full")
    
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

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class FolderPermissionCreate(BaseModel):
    user_id: uuid.UUID
    permission_level: str # view, edit, full

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
        if folder:
            if folder.id == request.target_folder_id:
                continue
            
            old_path = os.path.normpath(folder.path)
            new_path = os.path.normpath(os.path.join(target_folder.path, folder.name))
            
            # Avoid naming collision in target
            if os.path.exists(new_path) and old_path.lower() != new_path.lower():
                base, ext = os.path.splitext(new_path)
                new_path = f"{base}_{uuid.uuid4().hex[:4]}{ext}"
                folder.name = os.path.basename(new_path)

            if os.path.exists(old_path):
                try:
                    shutil.move(old_path, new_path)
                    
                    # Update paths in DB using string replacement to be fast and comprehensive
                    # 1. Update all subfolders paths
                    all_subfolders = db.query(archive_models.ArchiveFolder).filter(
                        archive_models.ArchiveFolder.path.like(f"{old_path}%")
                    ).all()
                    for sub in all_subfolders:
                        sub.path = sub.path.replace(old_path, new_path, 1)
                    
                    # 2. Update all files paths within these folders
                    all_files = db.query(archive_models.ArchiveFile).filter(
                        archive_models.ArchiveFile.file_path.like(f"{old_path}%")
                    ).all()
                    for fl in all_files:
                        fl.file_path = fl.file_path.replace(old_path, new_path, 1)
                    
                    folder.path = new_path
                    folder.parent_id = request.target_folder_id
                    db.commit()
                except Exception as e:
                    logger.error(f"Error moving folder {old_path} to {new_path}: {str(e)}")
                    db.rollback()
                    raise HTTPException(status_code=500, detail=f"Failed to move folder: {str(e)}")

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

# --- New Features: Zip Download, Edit, Move Tree ---

@router.get("/folders/{folder_id}/download-zip")
async def download_folder_zip(
    folder_id: int,
    background_tasks: BackgroundTasks,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Manual auth check
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        current_user = get_user_from_raw_token(token, db)
        has_perm, _ = rbac_crud.check_user_permission(db, str(current_user.id), "archive_download")
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission archive_download required")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")

    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if not os.path.exists(folder.path):
        raise HTTPException(status_code=404, detail="Physical folder not found")

    # Create a temporary zip file
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    def create_zip():
        with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(folder.path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, os.path.dirname(folder.path))
                    zipf.write(file_path, arcname)

    # We run zip creation synchronously here for simplicity, 
    # but for very large folders, a background task + notification might be better.
    create_zip()

    # Clean up the temp file after response is sent
    background_tasks.add_task(os.remove, temp_zip_path)

    return FileResponse(
        temp_zip_path,
        filename=f"{folder.name}.zip",
        media_type="application/x-zip-compressed"
    )

@router.patch("/files/{file_id}")
def update_file_metadata(
    file_id: int,
    update_data: ItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    file = db.query(archive_models.ArchiveFile).get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    check_item_access(file, current_user, db, required_level="edit")

    if update_data.name:
        import re
        # Sanitize filename
        clean_name = re.sub(r'[\\/*?:"<>|]', "", update_data.name).strip()
        if not clean_name:
             raise HTTPException(status_code=400, detail="Invalid file name")

        if file.original_name != clean_name:
            # Check for duplicate name in DB within same folder
            existing_in_db = db.query(archive_models.ArchiveFile).filter(
                archive_models.ArchiveFile.folder_id == file.folder_id,
                archive_models.ArchiveFile.original_name == clean_name,
                archive_models.ArchiveFile.id != file_id
            ).first()
            if existing_in_db:
                raise HTTPException(status_code=400, detail=f"A file with the name '{clean_name}' already exists in this folder.")

            old_path = file.file_path
            dir_name = os.path.dirname(old_path)
            # Keep the same extension if not provided in new name
            old_ext = os.path.splitext(old_path)[1]
            new_ext = os.path.splitext(clean_name)[1]
            
            final_name = clean_name
            if not new_ext and old_ext:
                final_name += old_ext
                
            new_path = os.path.join(dir_name, final_name)
            
            # Physical rename if path exists
            if os.path.exists(old_path):
                try:
                    if os.path.exists(new_path) and old_path.lower() != new_path.lower():
                        # If file exists, add a suffix
                        base, ext = os.path.splitext(new_path)
                        new_path = f"{base}_{uuid.uuid4().hex[:4]}{ext}"
                    
                    os.rename(old_path, new_path)
                    file.file_path = new_path
                    logger.info(f"Physically renamed file from {old_path} to {new_path}")
                except Exception as e:
                    logger.error(f"Failed to rename physical file: {str(e)}")
                    # We continue even if physical rename fails, but update DB
            
            file.original_name = final_name
            file.name = final_name # Also update display name
        
    if update_data.description is not None:
        file.description = update_data.description

    db.commit()
    db.refresh(file)
    return file

@router.patch("/folders/{folder_id}")
def update_folder_metadata(
    folder_id: int,
    update_data: ItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Check if user has permission to edit this folder
    check_item_access(folder, current_user, db, required_level="edit")

    if update_data.name:
        import re
        # Sanitize folder name
        clean_name = re.sub(r'[\\/*?:"<>|]', "", update_data.name).strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Invalid folder name")
            
        if folder.name != clean_name:
            # Check for duplicate name in DB within same parent
            existing_in_db = db.query(archive_models.ArchiveFolder).filter(
                archive_models.ArchiveFolder.parent_id == folder.parent_id,
                archive_models.ArchiveFolder.name == clean_name,
                archive_models.ArchiveFolder.id != folder_id
            ).first()
            if existing_in_db:
                raise HTTPException(status_code=400, detail=f"A folder with the name '{clean_name}' already exists in this location.")

            old_path = folder.path
            parent_path = os.path.dirname(old_path)
            new_path = os.path.join(parent_path, clean_name)
            
            # Physical rename if path exists
            if os.path.exists(old_path):
                try:
                    if os.path.exists(new_path) and old_path.lower() != new_path.lower():
                        raise HTTPException(status_code=400, detail="A folder with this name already exists")
                    
                    os.rename(old_path, new_path)
                    logger.info(f"Physically renamed folder from {old_path} to {new_path}")
                    
                    # Update paths of all items inside this folder
                    # 1. Update files in this folder and subfolders
                    all_files = db.query(archive_models.ArchiveFile).filter(
                        archive_models.ArchiveFile.file_path.like(f"{old_path}%")
                    ).all()
                    for f in all_files:
                        f.file_path = f.file_path.replace(old_path, new_path, 1)
                        
                    # 2. Update paths of all subfolders
                    all_subfolders = db.query(archive_models.ArchiveFolder).filter(
                        archive_models.ArchiveFolder.path.like(f"{old_path}%")
                    ).all()
                    for sf in all_subfolders:
                        sf.path = sf.path.replace(old_path, new_path, 1)
                        
                    folder.path = new_path
                except Exception as e:
                    logger.error(f"Failed to rename physical folder: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Failed to rename physical folder: {str(e)}")
            
            folder.name = clean_name
        
    if update_data.description is not None:
        folder.description = update_data.description

    if update_data.is_public is not None:
        folder.is_public = update_data.is_public

    db.commit()
    db.refresh(folder)
    return folder

@router.get("/folder-tree")
def get_folder_tree(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """Returns the full folder structure as a tree for move/copy operations."""
    query = db.query(archive_models.ArchiveFolder)
    
    user_role = getattr(current_user, 'role', 'user')
    is_admin = user_role in ["admin", "archive_admin"]

    # Filter by ownership, public status, or ACL
    if not is_admin:
        shared_folder_ids = db.query(archive_models.ArchiveFolderPermission.folder_id).filter(
            archive_models.ArchiveFolderPermission.user_id == current_user.id
        ).all()
        shared_folder_ids = [f[0] for f in shared_folder_ids]

        query = query.filter(
            or_(
                archive_models.ArchiveFolder.created_by == current_user.id,
                archive_models.ArchiveFolder.is_public == True,
                archive_models.ArchiveFolder.id.in_(shared_folder_ids)
            )
        )
        
    all_folders = query.all()
    
    # Build tree
    # If a folder is in the list but its parent is NOT, we still want to show the hierarchy 
    # but the parent should be non-selectable (though for simplicity we'll just show them for now)
    # Better approach: If we have a folder, we MUST include all its ancestors to build a proper tree.
    
    if not is_admin:
        # Collect all ancestor IDs for the permitted folders
        permitted_folder_ids = {f.id for f in all_folders}
        all_included_ids = set(permitted_folder_ids)
        
        for folder in all_folders:
            curr = folder
            # Assuming path-based hierarchy or recursive parent check
            # For simplicity, we'll fetch parents recursively if they are not in the list
            while curr.parent_id and curr.parent_id not in all_included_ids:
                parent = db.query(archive_models.ArchiveFolder).get(curr.parent_id)
                if parent:
                    all_included_ids.add(parent.id)
                    curr = parent
                else:
                    break
        
        # Re-fetch all folders that should be in the tree (permitted + their ancestors)
        all_folders = db.query(archive_models.ArchiveFolder).filter(
            archive_models.ArchiveFolder.id.in_(list(all_included_ids))
        ).all()

    nodes = {f.id: {"id": f.id, "name": f.name, "parent_id": f.parent_id, "children": []} for f in all_folders}
    tree = []
    
    # Sort folders by name for a better UI experience
    sorted_folders = sorted(all_folders, key=lambda x: (x.name or "").lower())
    
    for f in sorted_folders:
        node = nodes[f.id]
        parent_id = f.parent_id
        if parent_id is None or parent_id not in nodes:
            # If it's a root folder OR its parent is missing from our list, show it at the top level
            tree.append(node)
        else:
            nodes[parent_id]["children"].append(node)
                
    return tree

@router.get("/admin/diagnostics")
def get_archive_diagnostics(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """Admin-only diagnostic to find potential issues like orphaned folders."""
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    all_folders = db.query(archive_models.ArchiveFolder).all()
    folder_ids = {f.id for f in all_folders}
    
    orphaned_folders = []
    for f in all_folders:
        if f.parent_id and f.parent_id not in folder_ids:
            orphaned_folders.append({
                "id": f.id,
                "name": f.name,
                "parent_id": f.parent_id,
                "path": f.path,
                "reason": "Parent ID not found in database"
            })
            
    # Check physical path issues
    path_issues = []
    for f in all_folders:
        if f.path and not os.path.exists(f.path):
            path_issues.append({
                "id": f.id,
                "name": f.name,
                "path": f.path,
                "reason": "Physical path does not exist"
            })
            
    return {
        "total_folders": len(all_folders),
        "orphaned_folders": orphaned_folders,
        "path_issues": path_issues,
        "total_files": db.query(archive_models.ArchiveFile).count()
    }

@router.get("/admin/full-report")
def get_full_archive_report(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    """
    Generates a full report of all files and their status on disk.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    all_files = db.query(archive_models.ArchiveFile).all()
    report = {
        "summary": {
            "total_files_in_db": len(all_files),
            "healthy_files": 0,
            "moved_but_found": 0,
            "completely_missing": 0
        },
        "details": {
            "moved_files": [],
            "missing_files": []
        }
    }

    # Pre-scan storage to speed up lookups
    all_disk_files = {}
    for root, _, files in os.walk(STORAGE_PATH):
        for f in files:
            all_disk_files[f.lower()] = os.path.join(root, f)

    for file in all_files:
        current_path = os.path.normpath(file.file_path)
        
        # 1. Check if healthy
        if os.path.exists(current_path):
            report["summary"]["healthy_files"] += 1
            continue
            
        # 2. Try to find it in our pre-scanned disk map
        found_path = None
        storage_name = os.path.basename(current_path).lower()
        original_name = file.original_name.lower() if file.original_name else None
        
        if storage_name in all_disk_files:
            found_path = all_disk_files[storage_name]
        elif original_name and original_name in all_disk_files:
            found_path = all_disk_files[original_name]
            
        if found_path:
            report["summary"]["moved_but_found"] += 1
            report["details"]["moved_files"].append({
                "id": file.id,
                "name": file.name,
                "old_path": current_path,
                "new_path": found_path
            })
        else:
            report["summary"]["completely_missing"] += 1
            report["details"]["missing_files"].append({
                "id": file.id,
                "name": file.name,
                "db_path": current_path,
                "original_name": file.original_name
            })

    return report

@router.get("/admin/force-repair")
def force_repair_archive(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    """
    Desperate repair tool to fix all paths after manual migration.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    stats = {"folders_fixed": 0, "files_fixed": 0}
    
    # 1. Fix all folders by name
    all_folders = db.query(archive_models.ArchiveFolder).all()
    for folder in all_folders:
        if not os.path.exists(os.path.normpath(folder.path)):
            for root, dirs, files in os.walk(STORAGE_PATH):
                if folder.name in dirs:
                    folder.path = os.path.normpath(os.path.join(root, folder.name))
                    stats["folders_fixed"] += 1
                    break
    db.commit()

    # 2. Fix all files by name or original name
    all_files = db.query(archive_models.ArchiveFile).all()
    for file in all_files:
        if not os.path.exists(os.path.normpath(file.file_path)):
            found = False
            # Try by storage name
            storage_name = os.path.basename(file.file_path)
            for root, dirs, files in os.walk(STORAGE_PATH):
                if storage_name in files:
                    file.file_path = os.path.normpath(os.path.join(root, storage_name))
                    stats["files_fixed"] += 1
                    found = True
                    break
            
            # Try by original name if not found
            if not found and file.original_name:
                for root, dirs, files in os.walk(STORAGE_PATH):
                    if file.original_name in files:
                        file.file_path = os.path.normpath(os.path.join(root, file.original_name))
                        stats["files_fixed"] += 1
                        found = True
                        break
    db.commit()
    return {"status": "Repair complete", "stats": stats}

@router.post("/admin/repair-paths")
def repair_archive_paths(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    """
    Advanced Repair Tool:
    1. Scans all folders in DB and tries to find their physical location.
    2. Updates paths for all sub-items.
    3. Syncs DB with actual disk structure.
    """
    user_role = getattr(current_user, 'role', 'user')
    if user_role not in ["admin", "archive_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    stats = {"folders_fixed": 0, "files_fixed": 0, "errors": []}
    
    # Get all folders from DB
    all_folders = db.query(archive_models.ArchiveFolder).all()
    
    # 1. First, try to find each folder's real path
    for folder in all_folders:
        current_path = os.path.normpath(folder.path)
        if not os.path.exists(current_path):
            # Attempt to find it by name within STORAGE_PATH
            found_path = None
            # Deep search for this folder name
            for root, dirs, files in os.walk(STORAGE_PATH):
                if folder.name in dirs:
                    potential_path = os.path.normpath(os.path.join(root, folder.name))
                    # Basic heuristic: if it has similar subfolders or files, it's likely the one
                    found_path = potential_path
                    break
            
            if found_path:
                folder.path = found_path
                stats["folders_fixed"] += 1
                db.flush()

    # 2. Now that folders are (mostly) fixed, fix all files
    all_files = db.query(archive_models.ArchiveFile).all()
    for file in all_files:
        current_path = os.path.normpath(file.file_path)
        if not os.path.exists(current_path):
            # Try to find it in its parent folder first
            parent_folder = db.query(archive_models.ArchiveFolder).get(file.folder_id)
            if parent_folder and os.path.exists(parent_folder.path):
                # Check for original_name or name
                for fname in [file.original_name, file.name, os.path.basename(current_path)]:
                    if not fname: continue
                    potential_path = os.path.normpath(os.path.join(parent_folder.path, fname))
                    if os.path.exists(potential_path):
                        file.file_path = potential_path
                        stats["files_fixed"] += 1
                        break
            
            # If still not found, do a deep search for the filename
            if not os.path.exists(os.path.normpath(file.file_path)):
                target_name = os.path.basename(current_path)
                for root, dirs, files in os.walk(STORAGE_PATH):
                    if target_name in files:
                        file.file_path = os.path.normpath(os.path.join(root, target_name))
                        stats["files_fixed"] += 1
                        break
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Repair failed: {str(e)}")
        
    return {
        "status": "success",
        "message": f"Archive structure repaired successfully.",
        "details": stats
    }

# --- ACL / Permission Management ---

@router.get("/folders/{folder_id}/permissions")
def get_folder_permissions(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Only owner or admin can manage permissions
    if folder.created_by != current_user.id and not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Only folder owner or admin can view permissions")
        
    perms = db.query(archive_models.ArchiveFolderPermission).filter(
        archive_models.ArchiveFolderPermission.folder_id == folder_id
    ).all()
    
    return [
        {
            "user_id": p.user_id,
            "user_email": p.user.email if p.user else "Unknown",
            "permission_level": p.permission_level,
            "granted_by": p.granted_by,
            "created_at": p.created_at
        } for p in perms
    ]

@router.post("/folders/{folder_id}/permissions")
def add_folder_permission(
    folder_id: int,
    perm_data: FolderPermissionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Only owner or admin can manage permissions
    if folder.created_by != current_user.id and not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Only folder owner or admin can grant permissions")
        
    # Check if permission already exists
    existing = db.query(archive_models.ArchiveFolderPermission).filter(
        archive_models.ArchiveFolderPermission.folder_id == folder_id,
        archive_models.ArchiveFolderPermission.user_id == perm_data.user_id
    ).first()
    
    if existing:
        existing.permission_level = perm_data.permission_level
        existing.granted_by = current_user.id
    else:
        new_perm = archive_models.ArchiveFolderPermission(
            folder_id=folder_id,
            user_id=perm_data.user_id,
            permission_level=perm_data.permission_level,
            granted_by=current_user.id
        )
        db.add(new_perm)
        
    db.commit()
    return {"status": "success"}

@router.delete("/folders/{folder_id}/permissions/{user_id}")
def remove_folder_permission(
    folder_id: int,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_write"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Only owner or admin can manage permissions
    if folder.created_by != current_user.id and not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Only folder owner or admin can revoke permissions")
        
    db.query(archive_models.ArchiveFolderPermission).filter(
        archive_models.ArchiveFolderPermission.folder_id == folder_id,
        archive_models.ArchiveFolderPermission.user_id == user_id
    ).delete()
    
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
