"""
MatterPackr 2.0 - Archive Format Detector and Capability Matrix
Accurately identifies archive formats via magic-byte signatures and header inspection.
Maps files to either 'libarchrv' (general archives) or 'unRAR' (RAR archives).
"""

from __future__ import annotations
import os
import io
from typing import Tuple, Dict, Any, Optional
from models import ArchiveFormat, AccessMode


# Magic byte signatures
SIGNATURES: Dict[bytes, ArchiveFormat] = {
    # 7-Zip signature: 7z \xbc \xaf \x27 \x1c
    b"7z\xbc\xaf\x27\x1c": ArchiveFormat.SEVEN_ZIP,
    
    # RAR signatures:
    # RAR 5.0+ signature: Rar! \x1a \x07 \x01 \x00
    b"Rar!\x1a\x07\x01\x00": ArchiveFormat.RAR,
    # RAR 1.5 - 4.x signature: Rar! \x1a \x07 \x00
    b"Rar!\x1a\x07\x00": ArchiveFormat.RAR,
    
    # Standard ZIP signatures:
    b"PK\x03\x04": ArchiveFormat.ZIP,          # Local file header
    b"PK\x05\x06": ArchiveFormat.ZIP,          # Empty zip / End of central dir
    b"PK\x07\x08": ArchiveFormat.ZIP,          # Data descriptor / spanned
    
    # Gzip: \x1f \x8b
    b"\x1f\x8b": ArchiveFormat.TAR_GZ,
    
    # Bzip2: BZh
    b"BZh": ArchiveFormat.TAR_BZ2,
    
    # XZ: \xfd 7 z X Z \x00
    b"\xfd7zXZ\x00": ArchiveFormat.TAR_XZ,
    
    # Microsoft Cabinet (CAB): MSCF
    b"MSCF": ArchiveFormat.CAB,
}

# Extension to format mapping (for cases where magic bytes require secondary check or for creation)
EXTENSION_MAP: Dict[str, ArchiveFormat] = {
    ".zip": ArchiveFormat.ZIP,
    ".jar": ArchiveFormat.ZIP,
    ".war": ArchiveFormat.ZIP,
    ".apk": ArchiveFormat.ZIP,
    ".7z": ArchiveFormat.SEVEN_ZIP,
    ".rar": ArchiveFormat.RAR,
    ".cbr": ArchiveFormat.RAR,
    ".tar": ArchiveFormat.TAR,
    ".tar.gz": ArchiveFormat.TAR_GZ,
    ".tgz": ArchiveFormat.TAR_GZ,
    ".tar.bz2": ArchiveFormat.TAR_BZ2,
    ".tbz2": ArchiveFormat.TAR_BZ2,
    ".tar.xz": ArchiveFormat.TAR_XZ,
    ".txz": ArchiveFormat.TAR_XZ,
    ".iso": ArchiveFormat.ISO,
    ".cab": ArchiveFormat.CAB,
    ".arj": ArchiveFormat.ARJ,
    ".lha": ArchiveFormat.LHA,
    ".lzh": ArchiveFormat.LHA,
}

# Formats where Write/Modify operations are supported (Read-Write formats)
READ_WRITE_FORMATS = {
    ArchiveFormat.ZIP,
    ArchiveFormat.SEVEN_ZIP,
    ArchiveFormat.TAR,
    ArchiveFormat.TAR_GZ,
    ArchiveFormat.TAR_BZ2,
    ArchiveFormat.TAR_XZ,
}


def detect_format_from_stream(stream: io.BufferedReader, filename: str = "") -> ArchiveFormat:
    """
    Detects the archive format by analyzing the magic bytes from a stream,
    falling back to file extension analysis.
    """
    initial_pos = stream.tell()
    try:
        header = stream.read(512)
        if not header:
            return _detect_by_extension(filename)
        
        # Check RAR first (7 bytes or 8 bytes)
        if header.startswith(b"Rar!\x1a\x07\x01\x00") or header.startswith(b"Rar!\x1a\x07\x00"):
            return ArchiveFormat.RAR
        
        # Check 7-Zip (6 bytes)
        if header.startswith(b"7z\xbc\xaf\x27\x1c"):
            return ArchiveFormat.SEVEN_ZIP
        
        # Check Zip signatures
        if header.startswith(b"PK\x03\x04") or header.startswith(b"PK\x05\x06") or header.startswith(b"PK\x07\x08"):
            return ArchiveFormat.ZIP
        
        # Check GZip / Tar.gz
        if header.startswith(b"\x1f\x8b"):
            return ArchiveFormat.TAR_GZ if (".tar" in filename.lower() or filename.lower().endswith(".tgz")) else ArchiveFormat.TAR_GZ
        
        # Check BZip2
        if header.startswith(b"BZh"):
            return ArchiveFormat.TAR_BZ2
            
        # Check XZ
        if header.startswith(b"\xfd7zXZ\x00"):
            return ArchiveFormat.TAR_XZ
            
        # Check CAB
        if header.startswith(b"MSCF"):
            return ArchiveFormat.CAB
            
        # Check POSIX TAR magic at offset 257 ('ustar\x00' or 'ustar  \x00')
        if len(header) >= 265 and (header[257:262] == b"ustar" or header[257:265] == b"ustar  \x00"):
            return ArchiveFormat.TAR

        # Check ISO 9660 volume descriptor at offset 0x8000, 0x8800, or 0x9000
        stream.seek(0x8000)
        iso_hdr = stream.read(6)
        if iso_hdr.startswith(b"\x01CD001"):
            return ArchiveFormat.ISO

    except Exception:
        pass
    finally:
        stream.seek(initial_pos)

    # Fallback to extension
    return _detect_by_extension(filename)


def detect_format_from_path(file_path: str) -> ArchiveFormat:
    """
    Detects format from a file path on disk.
    """
    if not os.path.exists(file_path):
        return _detect_by_extension(file_path)
    
    try:
        with open(file_path, "rb") as f:
            return detect_format_from_stream(f, filename=os.path.basename(file_path))
    except Exception:
        return _detect_by_extension(file_path)


def _detect_by_extension(filename: str) -> ArchiveFormat:
    lower_name = filename.lower()
    # Check multi-part extensions first (.tar.gz, .tar.bz2, etc.)
    for ext, fmt in sorted(EXTENSION_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if lower_name.endswith(ext):
            return fmt
    return ArchiveFormat.UNKNOWN


def get_format_capabilities(fmt: ArchiveFormat) -> Dict[str, Any]:
    """
    Returns capability matrix for a given format:
    - handler: 'unRAR' for RAR, 'libarchrv' for all others.
    - access_mode: 'read-write' for Zip, 7z, Tar; 'read-only' for RAR and others.
    - can_modify: boolean
    """
    if fmt == ArchiveFormat.RAR:
        return {
            "handler": "unRAR",
            "access_mode": AccessMode.READ_ONLY,
            "can_modify": False,
            "description": "Roshal Archive handled exclusively via unRAR engine (Read-Only)."
        }
    
    can_write = fmt in READ_WRITE_FORMATS
    return {
        "handler": "libarchrv",
        "access_mode": AccessMode.READ_WRITE if can_write else AccessMode.READ_ONLY,
        "can_modify": can_write,
        "description": f"Standard archive format handled via libarchrv ({'Read/Write' if can_write else 'Read-Only'})."
    }
