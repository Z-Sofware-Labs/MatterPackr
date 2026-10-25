"""
MatterPackr 2.0 - Core Data Models and Custom Exceptions
Provides typed data structures matching the modern archive manager UI columns:
(Name, Modified, Size, Ratio, Packed, CRC-32, Encryption, Path)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class ArchiveFormat(str, Enum):
    ZIP = "zip"
    SEVEN_ZIP = "7z"
    TAR = "tar"
    TAR_GZ = "tar.gz"
    TAR_BZ2 = "tar.bz2"
    TAR_XZ = "tar.xz"
    RAR = "rar"
    ISO = "iso"
    CAB = "cab"
    ARJ = "arj"
    LHA = "lha"
    UNKNOWN = "unknown"


class AccessMode(str, Enum):
    READ_WRITE = "read-write"
    READ_ONLY = "read-only"


class EncryptionMethod(str, Enum):
    NONE = "none"
    ZIP20 = "zip20"          # Legacy ZipCrypto
    AES_128 = "aes-128"      # WinZip AES-128 / RAR4
    AES_192 = "aes-192"      # WinZip AES-192
    AES_256 = "aes-256"      # WinZip AES-256 / 7-Zip AES-256 / RAR5 AES-256


class CompressionLevel(str, Enum):
    STORE = "store"          # Level 0
    FASTEST = "fastest"      # Level 1
    FAST = "fast"            # Level 3
    NORMAL = "normal"        # Level 5 (default)
    MAXIMUM = "maximum"      # Level 7
    ULTRA = "ultra"          # Level 9


@dataclass
class ArchiveEntry:
    """
    Represents a single file or directory entry inside an archive.
    Fields directly match the frontend UI columns.
    """
    id: str
    name: str
    path: str
    size: int                         # Uncompressed size in bytes
    packed_size: int                  # Compressed / packed size in bytes
    ratio: float                      # Compression savings percentage (e.g. 54.2%)
    modified: str                     # ISO-8601 string or formatted date
    crc32: str                        # 8-character uppercase hex string (e.g. "A4E79802")
    encrypted: bool                   # True if entry requires password / encrypted
    encryption_method: str = "none"   # "aes-256", "aes-128", "zip20", or "none"
    is_directory: bool = False        # True for folders
    attributes: str = ""              # File attributes (e.g. "drwxr-xr-x" or "A")
    comment: Optional[str] = None     # Optional per-file comment

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "path": self.path,
            "size": self.size,
            "packedSize": self.packed_size,
            "ratio": round(self.ratio, 1),
            "modified": self.modified,
            "crc32": self.crc32.upper(),
            "encrypted": self.encrypted,
            "encryptionMethod": self.encryption_method,
            "isDirectory": self.is_directory,
            "attributes": self.attributes,
            "comment": self.comment or ""
        }


@dataclass
class ArchiveMetadata:
    """
    Summary metadata for an opened archive.
    """
    file_path: str
    filename: str
    format: ArchiveFormat
    access_mode: AccessMode
    handler_used: str                 # "libarchrv" or "unRAR"
    total_entries: int = 0
    total_uncompressed_bytes: int = 0
    total_packed_bytes: int = 0
    overall_ratio: float = 0.0
    is_encrypted: bool = False
    encryption_summary: str = "none"
    can_modify: bool = False
    comment: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "filePath": self.file_path,
            "filename": self.filename,
            "format": self.format.value,
            "accessMode": self.access_mode.value,
            "handlerUsed": self.handler_used,
            "totalEntries": self.total_entries,
            "totalUncompressedBytes": self.total_uncompressed_bytes,
            "totalPackedBytes": self.total_packed_bytes,
            "overallRatio": round(self.overall_ratio, 1),
            "isEncrypted": self.is_encrypted,
            "encryptionSummary": self.encryption_summary,
            "canModify": self.can_modify,
            "comment": self.comment or ""
        }


@dataclass
class OperationProgress:
    """
    Real-time progress telemetry streamed to the UI during operations.
    Supports multi-threading indicators (CPU threads, active worker, throughput).
    """
    operation_id: str
    action: str                       # 'extract', 'compress', 'test', 'preview', 'list'
    status: str                       # 'queued', 'running', 'completed', 'failed', 'cancelled'
    current_file: str = ""
    current_file_progress: float = 0.0
    total_progress: float = 0.0
    processed_bytes: int = 0
    total_bytes: int = 0
    throughput_mbs: float = 0.0
    active_thread: int = 0
    total_threads: int = 1
    elapsed_seconds: float = 0.0
    estimated_remaining_seconds: float = 0.0
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "operationId": self.operation_id,
            "action": self.action,
            "status": self.status,
            "currentFile": self.current_file,
            "currentFileProgress": round(self.current_file_progress, 1),
            "totalProgress": round(self.total_progress, 1),
            "processedBytes": self.processed_bytes,
            "totalBytes": self.total_bytes,
            "throughputMBs": round(self.throughput_mbs, 2),
            "activeThread": self.active_thread,
            "totalThreads": self.total_threads,
            "elapsedSeconds": round(self.elapsed_seconds, 1),
            "estimatedRemainingSeconds": round(self.estimated_remaining_seconds, 1),
            "errorMessage": self.error_message
        }


# ============================================================================
# Backend Exception Hierarchy
# ============================================================================

class ArchiveError(Exception):
    """Base exception for all archive operations."""
    pass


class ReadOnlyArchiveError(ArchiveError):
    """Raised when an add/modify operation is attempted on read-only formats (e.g. RAR via unRAR)."""
    pass


class CorruptedArchiveError(ArchiveError):
    """Raised when an archive header or payload fails integrity validation."""
    pass


class PasswordRequiredError(ArchiveError):
    """Raised when an encrypted archive or entry requires a password."""
    pass


class InvalidPasswordError(ArchiveError):
    """Raised when the supplied password fails to decrypt the archive entry."""
    pass


class UnsupportedFormatError(ArchiveError):
    """Raised when a file cannot be identified or handled by any archive engine."""
    pass


class EntryNotFoundError(ArchiveError):
    """Raised when a requested file or directory does not exist inside the archive."""
    pass
