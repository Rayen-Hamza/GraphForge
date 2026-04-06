"""File upload and management endpoints."""

import logging
import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

from core.config import settings
from core.session import get_session, update_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_EXTENSIONS = {".csv", ".md", ".txt", ".json", ".tsv"}
MAX_SIZE_BYTES = settings.max_upload_size_mb * 1024 * 1024


class FileInfo(BaseModel):
    name: str
    size: int
    type: str


class FileListResponse(BaseModel):
    files: list[FileInfo]
    upload_dir: Optional[str] = None
    is_demo: bool = True


async def _get_session_id(x_session_id: Optional[str]) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-ID header")
    session = await get_session(x_session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return x_session_id


def _get_upload_dir(session_id: str) -> Path:
    """Get or create the upload directory for a session."""
    upload_dir = Path(settings.upload_dir) / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


@router.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    x_session_id: Optional[str] = Header(default=None),
):
    """Upload CSV/MD/TXT files for graph construction."""
    sid = await _get_session_id(x_session_id)

    # Check session isn't demo-only (demo users can't upload)
    session = await get_session(sid)
    # Actually, allow uploads for all users — they need data to build graphs

    upload_dir = _get_upload_dir(sid)

    uploaded = []
    total_size = 0

    for file in files:
        # Validate extension
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        # Read content and check size
        content = await file.read()
        total_size += len(content)
        if total_size > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Total upload size exceeds {settings.max_upload_size_mb}MB limit",
            )

        # Save file
        dest = upload_dir / file.filename
        dest.write_bytes(content)
        uploaded.append(FileInfo(
            name=file.filename,
            size=len(content),
            type=ext.lstrip("."),
        ))
        logger.info(f"Uploaded {file.filename} ({len(content)} bytes) for session {sid}")

    # Update session with upload dir path
    await update_session(sid, {"upload_dir": str(upload_dir)})

    return {"status": "ok", "files": [f.model_dump() for f in uploaded]}


@router.get("", response_model=FileListResponse)
async def list_files(
    x_session_id: Optional[str] = Header(default=None),
):
    """List available files (uploaded files + sample data for demo users)."""
    sid = await _get_session_id(x_session_id)
    session = await get_session(sid)

    files: list[FileInfo] = []
    is_demo = session.get("is_demo", True)
    upload_dir_str = session.get("upload_dir")

    # List uploaded files
    if upload_dir_str:
        upload_dir = Path(upload_dir_str)
        if upload_dir.exists():
            for f in upload_dir.iterdir():
                if f.is_file():
                    files.append(FileInfo(
                        name=f.name,
                        size=f.stat().st_size,
                        type=f.suffix.lstrip("."),
                    ))

    # For demo users (or if no uploads), also show sample data
    if is_demo or not files:
        sample_dir = Path(__file__).parent.parent.parent.parent / "data"
        if sample_dir.exists():
            for f in sample_dir.rglob("*"):
                if f.is_file():
                    files.append(FileInfo(
                        name=str(f.relative_to(sample_dir)),
                        size=f.stat().st_size,
                        type=f.suffix.lstrip("."),
                    ))

    return FileListResponse(files=files, upload_dir=upload_dir_str, is_demo=is_demo)


@router.delete("/{filename}")
async def delete_file(
    filename: str,
    x_session_id: Optional[str] = Header(default=None),
):
    """Delete an uploaded file."""
    sid = await _get_session_id(x_session_id)
    session = await get_session(sid)
    upload_dir_str = session.get("upload_dir")

    if not upload_dir_str:
        raise HTTPException(status_code=404, detail="No uploads found for this session")

    file_path = Path(upload_dir_str) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    # Security: ensure the file is within the upload directory
    try:
        file_path.resolve().relative_to(Path(upload_dir_str).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    file_path.unlink()
    return {"status": "ok", "message": f"Deleted {filename}"}
