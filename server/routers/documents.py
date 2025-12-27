from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid
import os
import shutil
from datetime import datetime, date
from typing import List, Optional
import aiofiles
import mimetypes

from core.database import get_db
from models.core_models import ContractDocument, Contract, DocumentType, User
from core.auth import get_current_user
from pydantic import BaseModel, UUID4

router = APIRouter()

# Configuration
UPLOAD_DIR = "uploads/contracts"
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DocumentResponse(BaseModel):
    id: UUID4
    contract_id: UUID4
    document_type_id: Optional[UUID4]
    file_name: str
    original_name: str
    file_size: int
    mime_type: str
    document_number: Optional[str]
    description: Optional[str]
    expiry_date: Optional[date]
    is_required: bool
    is_verified: bool
    verified_by: Optional[UUID4]
    verified_at: Optional[datetime]
    uploaded_by: UUID4
    uploaded_at: datetime
    modified_at: datetime

    class Config:
        from_attributes = True

class DocumentUploadRequest(BaseModel):
    document_type_id: Optional[str] = None
    document_number: Optional[str] = None
    description: Optional[str] = None
    expiry_date: Optional[date] = None
    is_required: bool = False

def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

def generate_unique_filename(original_name: str) -> str:
    """Generate a unique filename"""
    ext = os.path.splitext(original_name)[1]
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{ext}"

@router.post("/contracts/{contract_id}/documents", response_model=DocumentResponse)
async def upload_document(
    contract_id: str,
    file: UploadFile = File(...),
    document_type_id: Optional[str] = Form(None),
    document_number: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_required: bool = Form(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload a document for a contract"""
    try:
        # Validate contract exists
        contract = db.query(Contract).filter(Contract.id == uuid.UUID(contract_id)).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Validate file
        validate_file(file)

        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save file to disk
        try:
            async with aiofiles.open(file_path, 'wb') as buffer:
                content = await file.read()
                await buffer.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        # Parse expiry date
        parsed_expiry_date = None
        if expiry_date:
            try:
                parsed_expiry_date = date.fromisoformat(expiry_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry date format")

        # Create document record
        document = ContractDocument(
            contract_id=uuid.UUID(contract_id),
            document_type_id=uuid.UUID(document_type_id) if document_type_id else None,
            file_name=unique_filename,
            original_name=file.filename,
            file_path=file_path,
            file_size=len(content),
            mime_type=file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream',
            document_number=document_number,
            description=description,
            expiry_date=parsed_expiry_date,
            is_required=is_required,
            uploaded_by=current_user.id
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return DocumentResponse.from_orm(document)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # Clean up file if it was created
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.get("/contracts/{contract_id}/documents", response_model=List[DocumentResponse])
def get_contract_documents(
    contract_id: str,
    document_type_id: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all documents for a contract"""
    try:
        # Validate contract exists
        contract = db.query(Contract).filter(Contract.id == uuid.UUID(contract_id)).first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")

        # Build query
        query = db.query(ContractDocument).filter(ContractDocument.contract_id == uuid.UUID(contract_id))

        if document_type_id:
            query = query.filter(ContractDocument.document_type_id == uuid.UUID(document_type_id))

        if is_verified is not None:
            query = query.filter(ContractDocument.is_verified == is_verified)

        documents = query.order_by(ContractDocument.uploaded_at.desc()).all()

        return [DocumentResponse.from_orm(doc) for doc in documents]

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid contract ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve documents: {str(e)}")

@router.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Download a document file"""
    try:
        document = db.query(ContractDocument).filter(ContractDocument.id == uuid.UUID(document_id)).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check if file exists
        if not os.path.exists(document.file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # Return file response
        return FileResponse(
            path=document.file_path,
            filename=document.original_name,
            media_type=document.mime_type
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download document: {str(e)}")

@router.put("/documents/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: str,
    document_type_id: Optional[str] = None,
    document_number: Optional[str] = None,
    description: Optional[str] = None,
    expiry_date: Optional[date] = None,
    is_required: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update document metadata"""
    try:
        document = db.query(ContractDocument).filter(ContractDocument.id == uuid.UUID(document_id)).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Update fields
        if document_type_id is not None:
            document.document_type_id = uuid.UUID(document_type_id) if document_type_id else None
        if document_number is not None:
            document.document_number = document_number
        if description is not None:
            document.description = description
        if expiry_date is not None:
            document.expiry_date = expiry_date
        if is_required is not None:
            document.is_required = is_required

        db.commit()
        db.refresh(document)

        return DocumentResponse.from_orm(document)

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID or data format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")

@router.put("/documents/{document_id}/verify")
def verify_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark a document as verified"""
    try:
        document = db.query(ContractDocument).filter(ContractDocument.id == uuid.UUID(document_id)).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        document.is_verified = True
        document.verified_by = current_user.id
        document.verified_at = datetime.utcnow()

        db.commit()

        return {"message": "Document verified successfully"}

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to verify document: {str(e)}")

@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a document"""
    try:
        document = db.query(ContractDocument).filter(ContractDocument.id == uuid.UUID(document_id)).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Delete file from disk
        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        # Delete database record
        db.delete(document)
        db.commit()

        return {"message": "Document deleted successfully"}

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@router.get("/document-types", response_model=List[dict])
def get_document_types(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all available document types"""
    try:
        document_types = db.query(DocumentType).filter(DocumentType.is_active == True).all()
        return [
            {
                "id": str(dt.id),
                "name": dt.name,
                "code": dt.code,
                "description": dt.description,
                "is_required": dt.is_required
            }
            for dt in document_types
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve document types: {str(e)}")