"""
MatterPackr 2.0 - Base Archive Handler Interface
Defines the standard abstract contract that all backend archive handlers must satisfy.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
from models import ArchiveEntry, ArchiveMetadata, CompressionLevel, OperationProgress


class BaseArchiveHandler(ABC):
    """
    Abstract base class for archive handling engines.
    Implemented by LibarchiveHandler and UnrarHandler.
    """

    @abstractmethod
    def get_handler_name(self) -> str:
        """Returns the canonical name of the engine ('libarchrv' or 'unRAR')."""
        pass

    @abstractmethod
    def list_entries(
        self,
        archive_path: str,
        password: Optional[str] = None
    ) -> List[ArchiveEntry]:
        """
        Enumerates all files and directories inside the archive, returning
        full metadata: Name, Modified Date, Uncompressed Size, Ratio,
        Packed Size, CRC-32, and Encryption status.
        """
        pass

    @abstractmethod
    def get_metadata(
        self,
        archive_path: str,
        entries: Optional[List[ArchiveEntry]] = None
    ) -> ArchiveMetadata:
        """
        Returns high-level summary metadata for the archive.
        """
        pass

    @abstractmethod
    def extract_entries(
        self,
        archive_path: str,
        destination_dir: str,
        entry_paths: Optional[List[str]] = None,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> List[str]:
        """
        Extracts selected files or the entire archive to destination_dir.
        Returns a list of extracted local file paths.
        """
        pass

    @abstractmethod
    def add_entries(
        self,
        archive_path: str,
        file_specs: List[Dict[str, str]], # List of dicts: {'source_path': '...', 'archive_path': '...'}
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> None:
        """
        Adds or updates files inside an existing archive.
        Must raise ReadOnlyArchiveError if format is read-only.
        """
        pass

    @abstractmethod
    def create_archive(
        self,
        archive_path: str,
        file_specs: List[Dict[str, str]],
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> None:
        """
        Creates a new archive and packs the specified files into it.
        Must raise ReadOnlyArchiveError if format is read-only.
        """
        pass

    @abstractmethod
    def read_entry_stream(
        self,
        archive_path: str,
        entry_path: str,
        password: Optional[str] = None,
        max_bytes: int = 2 * 1024 * 1024  # Default 2MB preview limit
    ) -> bytes:
        """
        Reads an entry's content into memory or a stream for viewing/inspecting
        without performing full extraction to disk.
        """
        pass

    @abstractmethod
    def test_archive(
        self,
        archive_path: str,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> Dict[str, Any]:
        """
        Verifies CRC-32 checksums and archive integrity.
        Returns test results summary (passed, failed entries, total checked).
        """
        pass
