"""
MatterPackr 2.0 - Asynchronous Multi-Threaded Archive Service
Orchestrates archive operations across a background thread pool, maintaining UI responsiveness
and streaming real-time performance indicators (CPU thread allocation, throughput MB/s, progress).
"""

from __future__ import annotations
import os
import time
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, List, Callable, Set

from models import (
    ArchiveEntry,
    ArchiveMetadata,
    ArchiveFormat,
    CompressionLevel,
    OperationProgress,
    ArchiveError,
    ReadOnlyArchiveError,
)
from handlers.router import ArchiveRouter


class ArchiveService:
    """
    High-performance, asynchronous service managing non-blocking background workers.
    """

    def __init__(self, max_workers: Optional[int] = None):
        self.cpu_cores = os.cpu_count() or 4
        self.max_workers = max_workers or max(2, self.cpu_cores)
        self.executor = ThreadPoolExecutor(
            max_workers=self.max_workers,
            thread_name_prefix="MatterPackrWorker"
        )
        self.router = ArchiveRouter()
        self._active_operations: Dict[str, OperationProgress] = {}
        self._progress_listeners: Dict[str, Set[Callable[[OperationProgress], None]]] = {}

    def get_system_telemetry(self) -> Dict[str, Any]:
        """Returns host CPU and worker allocation metrics for the UI."""
        return {
            "cpuCores": self.cpu_cores,
            "allocatedThreads": self.max_workers,
            "activeTasks": len(self._active_operations),
            "supportedEngines": {
                "libarchrv": "Active (General Archive Manipulations)",
                "unRAR": "Active (Exclusive RAR Decompression)"
            }
        }

    def subscribe_progress(self, operation_id: str, callback: Callable[[OperationProgress], None]) -> None:
        """Subscribes an event listener (e.g. WebSocket streamer) to an active operation."""
        if operation_id not in self._progress_listeners:
            self._progress_listeners[operation_id] = set()
        self._progress_listeners[operation_id].add(callback)

    def unsubscribe_progress(self, operation_id: str, callback: Callable[[OperationProgress], None]) -> None:
        if operation_id in self._progress_listeners:
            self._progress_listeners[operation_id].discard(callback)

    def _notify_progress(self, progress: OperationProgress) -> None:
        self._active_operations[progress.operation_id] = progress
        listeners = self._progress_listeners.get(progress.operation_id, set())
        for listener in list(listeners):
            try:
                listener(progress)
            except Exception:
                pass

    async def open_archive_async(
        self,
        archive_path: str,
        password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously parses archive metadata and file list without freezing the event loop.
        """
        loop = asyncio.get_running_loop()
        metadata, entries = await loop.run_in_executor(
            self.executor,
            self.router.list_archive,
            archive_path,
            password
        )
        return {
            "metadata": metadata.to_dict(),
            "entries": [e.to_dict() for e in entries]
        }

    async def extract_async(
        self,
        archive_path: str,
        destination_dir: str,
        entry_paths: Optional[List[str]] = None,
        password: Optional[str] = None,
        operation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extracts files asynchronously with real-time thread progress updates.
        """
        op_id = operation_id or f"extract-{uuid.uuid4().hex[:8]}"
        loop = asyncio.get_running_loop()

        def progress_callback(prog: OperationProgress):
            prog.operation_id = op_id
            prog.total_threads = self.max_workers
            self._notify_progress(prog)

        try:
            extracted_files = await loop.run_in_executor(
                self.executor,
                lambda: self.router.extract_archive(
                    archive_path=archive_path,
                    destination_dir=destination_dir,
                    entry_paths=entry_paths,
                    password=password,
                    progress_cb=progress_callback
                )
            )
            # Final completion progress
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="extract",
                status="completed",
                total_progress=100.0,
                active_thread=0,
                total_threads=self.max_workers
            ))
            return {
                "operationId": op_id,
                "status": "success",
                "extractedCount": len(extracted_files),
                "destination": destination_dir
            }
        except Exception as e:
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="extract",
                status="failed",
                error_message=str(e)
            ))
            raise

    async def add_files_async(
        self,
        archive_path: str,
        file_specs: List[Dict[str, str]],
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        operation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously adds files to an archive. Raises ReadOnlyArchiveError if format is RAR.
        """
        op_id = operation_id or f"add-{uuid.uuid4().hex[:8]}"
        loop = asyncio.get_running_loop()

        def progress_callback(prog: OperationProgress):
            prog.operation_id = op_id
            prog.total_threads = self.max_workers
            self._notify_progress(prog)

        try:
            await loop.run_in_executor(
                self.executor,
                lambda: self.router.add_files(
                    archive_path=archive_path,
                    file_specs=file_specs,
                    compression_level=compression_level,
                    password=password,
                    progress_cb=progress_callback
                )
            )
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="add",
                status="completed",
                total_progress=100.0
            ))
            return {"operationId": op_id, "status": "success", "addedCount": len(file_specs)}
        except Exception as e:
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="add",
                status="failed",
                error_message=str(e)
            ))
            raise

    async def create_archive_async(
        self,
        archive_path: str,
        fmt: ArchiveFormat,
        file_specs: List[Dict[str, str]],
        compression_level: CompressionLevel = CompressionLevel.NORMAL,
        password: Optional[str] = None,
        operation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Asynchronously creates a new archive (ZIP, 7Z, TAR).
        """
        op_id = operation_id or f"create-{uuid.uuid4().hex[:8]}"
        loop = asyncio.get_running_loop()

        def progress_callback(prog: OperationProgress):
            prog.operation_id = op_id
            prog.total_threads = self.max_workers
            self._notify_progress(prog)

        try:
            await loop.run_in_executor(
                self.executor,
                lambda: self.router.create_archive(
                    archive_path=archive_path,
                    fmt=fmt,
                    file_specs=file_specs,
                    compression_level=compression_level,
                    password=password,
                    progress_cb=progress_callback
                )
            )
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="create",
                status="completed",
                total_progress=100.0
            ))
            return {
                "operationId": op_id,
                "status": "success",
                "archivePath": archive_path,
                "packedCount": len(file_specs)
            }
        except Exception as e:
            self._notify_progress(OperationProgress(
                operation_id=op_id,
                action="create",
                status="failed",
                error_message=str(e)
            ))
            raise

    async def preview_entry_async(
        self,
        archive_path: str,
        entry_path: str,
        password: Optional[str] = None,
        max_bytes: int = 2 * 1024 * 1024
    ) -> Dict[str, Any]:
        """
        Reads entry into buffer for previewing without extracting to disk.
        Detects if content is plain text or binary.
        """
        loop = asyncio.get_running_loop()
        raw_bytes = await loop.run_in_executor(
            self.executor,
            self.router.preview_entry,
            archive_path,
            entry_path,
            password,
            max_bytes
        )

        # Check if text or binary
        is_text = True
        try:
            decoded_text = raw_bytes.decode('utf-8')
        except UnicodeDecodeError:
            is_text = False
            decoded_text = None

        return {
            "entryPath": entry_path,
            "byteLength": len(raw_bytes),
            "isText": is_text,
            "textContent": decoded_text if is_text else None,
            "hexPreview": raw_bytes[:512].hex() if not is_text else None
        }

    async def test_integrity_async(
        self,
        archive_path: str,
        password: Optional[str] = None,
        operation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tests CRC-32 checksums and archive validity.
        """
        op_id = operation_id or f"test-{uuid.uuid4().hex[:8]}"
        loop = asyncio.get_running_loop()

        def progress_callback(prog: OperationProgress):
            prog.operation_id = op_id
            self._notify_progress(prog)

        result = await loop.run_in_executor(
            self.executor,
            self.router.test_integrity,
            archive_path,
            password,
            progress_callback
        )
        return result
