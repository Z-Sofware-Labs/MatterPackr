"""
MatterPackr 2.0 - Archive Core Router
Detects archive type upon opening a file and routes requests to the correct handler:
- 'libarchrv' for Zip, 7Z, TAR, and secondary formats.
- 'unRAR' exclusively for RAR files (.rar, .cbr).
Enforces read-only restrictions on read-only formats (preventing add/modify operations).
"""

from __future__ import annotations
import os
from typing import List, Dict, Any, Optional, Callable, Tuple

from models import (
    ArchiveEntry,
    ArchiveMetadata,
    ArchiveFormat,
    AccessMode,
    CompressionLevel,
    OperationProgress,
    ReadOnlyArchiveError,
    UnsupportedFormatError,
)
from handlers.base import BaseArchiveHandler
from handlers.libarchive_handler import LibarchiveHandler
from handlers.unrar_handler import UnrarHandler
from detector import detect_format_from_path, get_format_capabilities, READ_WRITE_FORMATS


class ArchiveRouter:
    """
    Central dispatch router for all archive operations in MatterPackr 2.0.
    """

    def __init__(self):
        self._libarchive_handler = LibarchiveHandler()
        self._unrar_handler = UnrarHandler()

    def get_handler_for_file(self, archive_path: str) -> Tuple[BaseArchiveHandler, ArchiveFormat]:
        """
        Determines the format and selects the appropriate engine.
        Returns (handler, format).
        """
        fmt = detect_format_from_path(archive_path)
        if fmt == ArchiveFormat.RAR:
            return self._unrar_handler, fmt
        elif fmt != ArchiveFormat.UNKNOWN:
            return self._libarchive_handler, fmt
        else:
            # Fallback to libarchive which supports broad format sniffing
            return self._libarchive_handler, fmt

    def get_handler_by_format(self, fmt: ArchiveFormat) -> BaseArchiveHandler:
        """
        Selects handler given a known ArchiveFormat.
        """
        if fmt == ArchiveFormat.RAR:
            return self._unrar_handler
        return self._libarchive_handler

    def list_archive(
        self,
        archive_path: str,
        password: Optional[str] = None
    ) -> Tuple[ArchiveMetadata, List[ArchiveEntry]]:
        """
        Opens and inspects an archive, returning high-level metadata and all entries.
        """
        handler, fmt = self.get_handler_for_file(archive_path)
        entries = handler.list_entries(archive_path, password)
        metadata = handler.get_metadata(archive_path, entries)
        return metadata, entries

    def extract_archive(
        self,
        archive_path: str,
        destination_dir: str,
        entry_paths: Optional[List[str]] = None,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> List[str]:
        """
        Extracts files using the designated engine.
        """
        handler, _ = self.get_handler_for_file(archive_path)
        return handler.extract_entries(
            archive_path=archive_path,
            destination_dir=destination_dir,
            entry_paths=entry_paths,
            password=password,
            progress_cb=progress_cb
        )

    def add_files(
        self,
        archive_path: str,
        file_specs: List[Dict[str, str]],
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> None:
        """
        Adds files to an existing archive. Enforces Read-Write restrictions.
        """
        handler, fmt = self.get_handler_for_file(archive_path)
        caps = get_format_capabilities(fmt)

        if not caps["can_modify"] or caps["access_mode"] == AccessMode.READ_ONLY:
            raise ReadOnlyArchiveError(
                f"Modifications are blocked: '{fmt.value}' is a read-only format in MatterPackr 2.0 "
                f"(handled by {caps['handler']}). Only Zip, 7Z, and TAR archives support file addition."
            )

        handler.add_entries(
            archive_path=archive_path,
            file_specs=file_specs,
            compression_level=compression_level,
            password=password,
            progress_cb=progress_cb
        )

    def create_archive(
        self,
        archive_path: str,
        fmt: ArchiveFormat,
        file_specs: List[Dict[str, str]],
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> None:
        """
        Creates a new archive. Enforces that only Zip, 7Z, and TAR can be created.
        """
        caps = get_format_capabilities(fmt)
        if not caps["can_modify"]:
            raise ReadOnlyArchiveError(
                f"Cannot create '{fmt.value}' archive. Creation is only supported for "
                f"Read-Write formats: Zip (.zip), 7-Zip (.7z), and TAR (.tar, .tar.gz, .tar.bz2, .tar.xz)."
            )

        handler = self.get_handler_by_format(fmt)
        handler.create_archive(
            archive_path=archive_path,
            file_specs=file_specs,
            compression_level=compression_level,
            password=password,
            progress_cb=progress_cb
        )

    def preview_entry(
        self,
        archive_path: str,
        entry_path: str,
        password: Optional[str] = None,
        max_bytes: int = 2 * 1024 * 1024
    ) -> bytes:
        """
        Streams entry contents for instant UI preview without full extraction.
        """
        handler, _ = self.get_handler_for_file(archive_path)
        return handler.read_entry_stream(archive_path, entry_path, password, max_bytes)

    def test_integrity(
        self,
        archive_path: str,
        password: Optional[str] = None,
        progress_cb: Optional[Callable[[OperationProgress], None]] = None
    ) -> Dict[str, Any]:
        """
        Verifies archive integrity and CRC-32 checksums.
        """
        handler, _ = self.get_handler_for_file(archive_path)
        return handler.test_archive(archive_path, password, progress_cb)
