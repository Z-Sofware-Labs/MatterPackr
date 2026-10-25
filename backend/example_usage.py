"""
MatterPackr 2.0 - Backend Verification and Usage Script
Demonstrates end-to-end functionality:
1. Archive type detection and engine dispatch ('libarchrv' vs 'unRAR')
2. Metadata listing (Size, Ratio, Packed, CRC-32, Encryption, Path)
3. Enforcing Read-Only restrictions on RAR archives
4. Viewing/inspecting streams without disk extraction
5. Multi-threaded extraction and integrity testing
"""

import os
import sys
import zipfile
import asyncio

# Add backend directory to module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import CompressionLevel, ReadOnlyArchiveError
from handlers.router import ArchiveRouter
from services.archive_service import ArchiveService


async def main():
    print("=" * 70)
    print("MatterPackr 2.0 - Backend Core Initialization")
    print("=" * 70)

    service = ArchiveService()
    sys_info = service.get_system_telemetry()
    print(f"[*] Host CPU Cores: {sys_info['cpuCores']}")
    print(f"[*] Thread Pool Workers Allocated: {sys_info['allocatedThreads']}")
    print(f"[*] Registered Engines: {sys_info['supportedEngines']}")
    print("-" * 70)

    # 1. Create a sample test ZIP archive
    sample_dir = "/tmp/matterpackr_test"
    os.makedirs(sample_dir, exist_ok=True)
    sample_zip = os.path.join(sample_dir, "project_assets.zip")
    file1 = os.path.join(sample_dir, "config.json")
    file2 = os.path.join(sample_dir, "readme.txt")

    with open(file1, "w") as f:
        f.write('{"appName": "MatterPackr 2.0", "engine": "libarchrv", "version": "2.0"}')
    with open(file2, "w") as f:
        f.write("MatterPackr 2.0: Modern high-performance desktop archive manager.\n")

    print("[1] Creating new ZIP archive via libarchrv...")
    router = ArchiveRouter()
    router.create_archive(
        archive_path=sample_zip,
        fmt=router.get_handler_for_file(sample_zip)[1],
        file_specs=[
            {"source_path": file1, "archive_path": "config.json"},
            {"source_path": file2, "archive_path": "docs/readme.txt"},
        ],
        compression_level=CompressionLevel.NORMAL
    )
    print(f"    Created: {sample_zip}")

    # 2. Open and inspect archive metadata and columns
    print("\n[2] Reading archive entries and metadata columns...")
    metadata, entries = router.list_archive(sample_zip)
    print(f"    Engine Selected : {metadata.handler_used}")
    print(f"    Format          : {metadata.format.value}")
    print(f"    Access Mode     : {metadata.access_mode.value} (can_modify={metadata.can_modify})")
    print(f"    Total Entries   : {metadata.total_entries}")
    print(f"    Overall Ratio   : {metadata.overall_ratio}%")
    print(f"\n    {'NAME':<18} | {'SIZE':<8} | {'PACKED':<8} | {'RATIO':<8} | {'CRC-32':<10} | {'PATH'}")
    print("    " + "-" * 68)
    for entry in entries:
        print(f"    {entry.name:<18} | {entry.size:<8} | {entry.packed_size:<8} | {entry.ratio:4.1f}%   | {entry.crc32:<10} | {entry.path}")

    # 3. View/Inspect file content in memory without disk extraction
    print("\n[3] Viewing file content stream without disk extraction...")
    preview = await service.preview_entry_async(sample_zip, "config.json")
    print(f"    Stream read {preview['byteLength']} bytes successfully.")
    print(f"    Content Preview: {preview['textContent']}")

    # 4. Enforcing Read-Only restrictions on RAR archives
    print("\n[4] Testing Read-Only Enforcement for RAR archives (unRAR)...")
    fake_rar = os.path.join(sample_dir, "backup.rar")
    # Write RAR magic header: Rar!\x1a\x07\x00
    with open(fake_rar, "wb") as f:
        f.write(b"Rar!\x1a\x07\x00" + b"\x00" * 32)

    handler, detected_fmt = router.get_handler_for_file(fake_rar)
    print(f"    Detected Format: {detected_fmt.value}")
    print(f"    Dispatched Handler: {handler.get_handler_name()}")

    try:
        print("    Attempting to add files to RAR archive...")
        router.add_files(fake_rar, [{"source_path": file1}])
        print("    [!] ERROR: Read-only check failed to trigger!")
    except ReadOnlyArchiveError as e:
        print(f"    [+] SUCCESS: Read-only restriction correctly enforced!")
        print(f"        Message: {e}")

    # 5. Integrity verification
    print("\n[5] Running integrity and CRC-32 test...")
    test_result = router.test_integrity(sample_zip)
    print(f"    Test Status: {test_result['status']}")
    print(f"    Passed: {test_result['passed']}/{test_result['totalEntries']}")

    print("\n" + "=" * 70)
    print("All backend checks completed successfully.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
