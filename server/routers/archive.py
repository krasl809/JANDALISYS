from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from core.database import get_db
from models import archive_models, core_models
import schemas.schemas as schemas
from core.auth import get_current_user_obj, require_permission, get_user_from_raw_token
from crud import rbac_crud
import os
import shutil
import uuid
import datetime
import urllib.parse
import subprocess
import platform
from typing import List, Optional

router = APIRouter(prefix="/archive", tags=["Archive Management"])

# Permissions
PERM_ARCHIVE_READ = "archive_read"
PERM_ARCHIVE_WRITE = "archive_write"

# Base Storage Path - using absolute path to avoid issues
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_PATH = os.path.join(BASE_DIR, "storage", "archive")

def ensure_storage(db: Session):
    if not os.path.exists(STORAGE_PATH):
        os.makedirs(STORAGE_PATH)
    
    # Create initial system folders in DB if not exist
    system_folders = ["General", "Administrative", "Financial", "Projects"]
    for folder_name in system_folders:
        existing = db.query(archive_models.ArchiveFolder).filter(
            archive_models.ArchiveFolder.name == folder_name,
            archive_models.ArchiveFolder.parent_id == None
        ).first()
        
        if not existing:
            folder_path = os.path.join(STORAGE_PATH, folder_name)
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            
            new_folder = archive_models.ArchiveFolder(
                name=folder_name,
                path=folder_path,
                is_system=True,
                description=f"System folder for {folder_name} documents"
            )
            db.add(new_folder)
    db.commit()

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
            
    folder_path = os.path.join(parent_path, folder_data.name)
    
    # Create physical folder
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        
    new_folder = archive_models.ArchiveFolder(
        name=folder_data.name,
        parent_id=folder_data.parent_id,
        path=folder_path,
        description=folder_data.description,
        created_by=current_user.id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.get("/files")
def get_files(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    return db.query(archive_models.ArchiveFile).filter(archive_models.ArchiveFile.folder_id == folder_id).all()

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
            
    mime_type, _ = mimetypes.guess_type(normalized_path)
    if not mime_type:
        mime_type = 'application/octet-stream'
        
    return FileResponse(
        path=normalized_path,
        media_type=mime_type
    )

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
def get_archive_stats(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch archive stats: {str(e)}")

@router.post("/folders/{folder_id}/explore")
def explore_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_read"))
):
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
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

@router.post("/upload")
async def upload_file(
    folder_id: int = Form(...),
    name: Optional[str] = Form(None), 
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("archive_upload"))
):
    ensure_storage(db)
    folder = db.query(archive_models.ArchiveFolder).get(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # Get original filename and extension
    orig_filename, orig_ext = os.path.splitext(file.filename)
    
    # Use provided name or original filename
    base_name = name if name else orig_filename
    
    # Sanitize base_name for filesystem
    import re
    base_name = re.sub(r'[\\/*?:"<>|]', "", base_name)
    
    # Prepare final storage filename: [Date]_[Name]_[Description if exists][Ext]
    date_str = datetime.date.today().strftime("%Y-%m-%d")
    
    storage_filename = f"{date_str}_{base_name}"
    if description:
        # Sanitize description
        clean_desc = re.sub(r'[\\/*?:"<>|]', "", description)[:50] # Limit desc length in filename
        storage_filename += f"_{clean_desc}"
    
    # Add extension
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
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_file = archive_models.ArchiveFile(
        folder_id=folder_id,
        name=storage_filename, # Use the storage filename as the record name for consistency
        original_name=file.filename,
        file_type=orig_ext.replace(".", ""),
        file_size=os.path.getsize(file_path),
        file_path=file_path,
        description=description,
        created_by=current_user.id
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    return new_file

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
    if os.path.exists(file.file_path):
        os.remove(file.file_path)
        
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
        
    if folder.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system folder")
        
    # Remove physical folder
    if os.path.exists(folder.path):
        shutil.rmtree(folder.path)
        
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
    # Delete files
    for file_id in request.file_ids:
        file = db.query(archive_models.ArchiveFile).get(file_id)
        if file:
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
            db.delete(file)
    
    # Delete folders
    for folder_id in request.folder_ids:
        folder = db.query(archive_models.ArchiveFolder).get(folder_id)
        if folder and not folder.is_system:
            if os.path.exists(folder.path):
                shutil.rmtree(folder.path)
            db.delete(folder)
            
    db.commit()
    return {"status": "success"}

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
        if folder and not folder.is_system:
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
    return new_file
