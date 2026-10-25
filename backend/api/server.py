"""
MatterPackr 2.0 - Backend REST & WebSocket API Server
Exposes asynchronous archive operations to the MatterPackr 2.0 frontend UI.
Matches all toolbar actions: New, Open, Add, Extract, View, Check.
"""

from __future__ import annotations
import os
import sys
import asyncio
from typing import List, Dict, Any, Optional

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models import (
    ArchiveFormat,
    CompressionLevel,
    ArchiveError,
    ReadOnlyArchiveError,
    CorruptedArchiveError,
    PasswordRequiredError,
    InvalidPasswordError,
    EntryNotFoundError
)
from services.archive_service import ArchiveService
from detector import detect_format_from_path, get_format_capabilities


# Initialize FastAPI Application
app = FastAPI(
    title="MatterPackr 2.0 Backend Core",
    description="High-performance archive manager backend powered by libarchrv and unRAR.",
    version="2.0.0"
)

# Enable CORS for desktop webviews and local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global archive service instance
archive_service = ArchiveService()


# ============================================================================
# Request / Response Schemas
# ============================================================================

class OpenArchiveRequest(BaseModel):
    archive_path: str = Field(..., description="Absolute path to the archive file on disk")
    password: Optional[str] = Field(None, description="Decryption passphrase if archive is encrypted")


class ExtractRequest(BaseModel):
    archive_path: str
    destination_dir: str
    entry_paths: Optional[List[str]] = Field(None, description="Optional selective entries to extract")
    password: Optional[str] = None
    operation_id: Optional[str] = None


class FileSpec(BaseModel):
    source_path: str
    archive_path: Optional[str] = None


class AddFilesRequest(BaseModel):
    archive_path: str
    files: List[FileSpec]
    compression_level: str = "normal"
    password: Optional[str] = None
    operation_id: Optional[str] = None


class CreateArchiveRequest(BaseModel):
    archive_path: str
    format: str = "zip"                  # "zip", "7z", "tar", "tar.gz", "tar.bz2", "tar.xz"
    files: List[FileSpec]
    compression_level: str = "normal"
    password: Optional[str] = None
    operation_id: Optional[str] = None


class PreviewRequest(BaseModel):
    archive_path: str
    entry_path: str
    password: Optional[str] = None
    max_bytes: int = 1048576             # 1 MB preview limit


class TestArchiveRequest(BaseModel):
    archive_path: str
    password: Optional[str] = None
    operation_id: Optional[str] = None


# ============================================================================
# REST Endpoints matching Toolbar Actions
# ============================================================================

@app.get("/api/system/info")
async def get_system_info():
    """Returns CPU thread configuration and loaded compression engines."""
    return archive_service.get_system_telemetry()


@app.post("/api/archive/detect")
async def detect_archive(payload: OpenArchiveRequest):
    """
    Detects archive format and engine assignment ('libarchrv' vs 'unRAR')
    and validates read/write capabilities.
    """
    fmt = detect_format_from_path(payload.archive_path)
    caps = get_format_capabilities(fmt)
    return {
        "filePath": payload.archive_path,
        "format": fmt.value,
        "handler": caps["handler"],
        "accessMode": caps["access_mode"].value,
        "canModify": caps["can_modify"],
        "description": caps["description"]
    }


@app.post("/api/archive/open")
async def open_archive(payload: OpenArchiveRequest):
    """
    Action: Open
    Opens an archive, parses headers, and returns all entries with metadata
    columns: Name, Modified, Size, Ratio, Packed, CRC-32, Encryption, and Path.
    """
    try:
        result = await archive_service.open_archive_async(
            archive_path=payload.archive_path,
            password=payload.password
        )
        return result
    except PasswordRequiredError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "PASSWORD_REQUIRED", "message": str(e)}
        )
    except CorruptedArchiveError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "CORRUPTED_ARCHIVE", "message": str(e)}
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "INTERNAL_ERROR", "message": str(e)}
        )


@app.post("/api/archive/extract")
async def extract_archive(payload: ExtractRequest):
    """
    Action: Extract
    Extracts selected files or the complete archive to destination.
    Uses 'libarchrv' for general archives and 'unRAR' exclusively for RAR files.
    """
    try:
        result = await archive_service.extract_async(
            archive_path=payload.archive_path,
            destination_dir=payload.destination_dir,
            entry_paths=payload.entry_paths,
            password=payload.password,
            operation_id=payload.operation_id
        )
        return result
    except PasswordRequiredError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except InvalidPasswordError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/archive/add")
async def add_files(payload: AddFilesRequest):
    """
    Action: Add
    Adds files to an existing archive (Zip, 7Z, TAR).
    STRICTLY BLOCKS RAR archives via unRAR read-only restriction.
    """
    try:
        level = CompressionLevel(payload.compression_level)
    except ValueError:
        level = CompressionLevel.NORMAL

    file_specs = [f.dict() for f in payload.files]

    try:
        result = await archive_service.add_files_async(
            archive_path=payload.archive_path,
            file_specs=file_specs,
            compression_level=level,
            password=payload.password,
            operation_id=payload.operation_id
        )
        return result
    except ReadOnlyArchiveError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "READ_ONLY_FORMAT", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/archive/create")
async def create_archive(payload: CreateArchiveRequest):
    """
    Action: New
    Creates a new archive (Zip, 7Z, TAR).
    STRICTLY BLOCKS creation of RAR files (unRAR is read-only).
    """
    try:
        fmt = ArchiveFormat(payload.format)
    except ValueError:
        fmt = ArchiveFormat.ZIP

    try:
        level = CompressionLevel(payload.compression_level)
    except ValueError:
        level = CompressionLevel.NORMAL

    file_specs = [f.dict() for f in payload.files]

    try:
        result = await archive_service.create_archive_async(
            archive_path=payload.archive_path,
            fmt=fmt,
            file_specs=file_specs,
            compression_level=level,
            password=payload.password,
            operation_id=payload.operation_id
        )
        return result
    except ReadOnlyArchiveError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "READ_ONLY_FORMAT", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/archive/preview")
async def preview_entry(payload: PreviewRequest):
    """
    Action: View / Inspect
    Reads file content into memory stream for quick viewing without extracting.
    """
    try:
        preview_data = await archive_service.preview_entry_async(
            archive_path=payload.archive_path,
            entry_path=payload.entry_path,
            password=payload.password,
            max_bytes=payload.max_bytes
        )
        return preview_data
    except EntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/archive/check")
async def check_archive(payload: TestArchiveRequest):
    """
    Action: Check / Test
    Verifies archive integrity and validates CRC-32 checksums.
    """
    try:
        result = await archive_service.test_integrity_async(
            archive_path=payload.archive_path,
            password=payload.password,
            operation_id=payload.operation_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ============================================================================
# WebSocket Telemetry & Progress Streaming
# ============================================================================

@app.websocket("/ws/progress/{operation_id}")
async def websocket_progress_endpoint(websocket: WebSocket, operation_id: str):
    """
    Streams real-time progress events for long operations (e.g. multi-gigabyte compression/extraction),
    including active thread ID, throughput MB/s, and percentage.
    """
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()

    def listener(prog):
        queue.put_nowait(prog.to_dict())

    archive_service.subscribe_progress(operation_id, listener)

    try:
        while True:
            # Wait for next progress tick or disconnect
            data = await queue.get()
            await websocket.send_json(data)
            if data.get("status") in {"completed", "failed", "cancelled"}:
                break
    except WebSocketDisconnect:
        pass
    finally:
        archive_service.unsubscribe_progress(operation_id, listener)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
