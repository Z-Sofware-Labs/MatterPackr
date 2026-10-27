#!/usr/bin/env python3
"""
Generate macOS .icns and Linux FreeDesktop MIME .png icons from source assets.
"""
import io
import os
import struct
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
FILETYPES_DIR = os.path.join(PROJECT_ROOT, "native-qt", "resources", "filetypes")
APP_PNG = os.path.join(PROJECT_ROOT, "native-qt", "resources", "app.png")
MACOS_OUT_DIR = os.path.join(PROJECT_ROOT, "native-qt", "resources", "macos")
LINUX_MIME_DIR = os.path.join(SCRIPT_DIR, "linux", "icons", "hicolor", "256x256", "mimetypes")

def make_icns_data(img):
    """
    Generate an Apple ICNS format binary with multiple PNG resolutions.
    """
    entries = [
        (b'ic11', 32),    # 16x16@2x
        (b'ic12', 64),    # 32x32@2x
        (b'ic07', 128),   # 128x128
        (b'ic13', 256),   # 128x128@2x
        (b'ic08', 256),   # 256x256
        (b'ic14', 512),   # 256x256@2x
        (b'ic09', 512),   # 512x512
        (b'ic10', 1024),  # 512x512@2x / 1024x1024
    ]
    chunks = []
    for tag, size in entries:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format='PNG')
        data = buf.getvalue()
        chunks.append(tag + struct.pack('>I', 8 + len(data)) + data)
    
    total_len = 8 + sum(len(c) for c in chunks)
    return b'icns' + struct.pack('>I', total_len) + b''.join(chunks)

def generate_macos_icons():
    os.makedirs(MACOS_OUT_DIR, exist_ok=True)
    print(f"Generating macOS .icns files into {MACOS_OUT_DIR}...")
    
    # 1. Main app icon
    app_img = Image.open(APP_PNG)
    with open(os.path.join(MACOS_OUT_DIR, "MatterPackr.icns"), "wb") as f:
        f.write(make_icns_data(app_img))
    print("  -> MatterPackr.icns")

    # 2. Filetype icons
    filetypes = [
        "7z", "ar", "bz2", "cab", "cpio", "gz", "img",
        "iso", "rar", "tar", "tbz2", "tgz", "txz", "zip"
    ]
    for ft in filetypes:
        src = os.path.join(FILETYPES_DIR, f"{ft}.png")
        if os.path.exists(src):
            img = Image.open(src)
            icns_path = os.path.join(MACOS_OUT_DIR, f"{ft}.icns")
            with open(icns_path, "wb") as f:
                f.write(make_icns_data(img))
            print(f"  -> {ft}.icns")

def generate_linux_icons():
    os.makedirs(LINUX_MIME_DIR, exist_ok=True)
    print(f"Generating Linux 256x256 MIME icons into {LINUX_MIME_DIR}...")

    # Mapping of Linux MIME icon names to source PNG files in filetypes
    mime_map = {
        "application-zip.png": "zip.png",
        "application-x-zip-compressed.png": "zip.png",
        "application-x-7z-compressed.png": "7z.png",
        "application-x-rar.png": "rar.png",
        "application-x-rar-compressed.png": "rar.png",
        "application-vnd.rar.png": "rar.png",
        "application-x-tar.png": "tar.png",
        "application-x-compressed-tar.png": "tgz.png",
        "application-x-tarz.png": "tgz.png",
        "application-x-gzip.png": "gz.png",
        "application-gzip.png": "gz.png",
        "application-x-bzip2.png": "bz2.png",
        "application-x-bzip.png": "bz2.png",
        "application-x-bzip-compressed-tar.png": "tbz2.png",
        "application-x-xz.png": "txz.png",
        "application-x-xz-compressed-tar.png": "txz.png",
        "application-x-iso9660-image.png": "iso.png",
        "application-x-cd-image.png": "iso.png",
        "application-x-raw-disk-image.png": "img.png",
        "application-vnd.ms-cab-compressed.png": "cab.png",
        "application-x-cpio.png": "cpio.png",
        "application-x-archive.png": "ar.png",
        "application-x-ar.png": "ar.png",
    }

    cache = {}
    for mime_icon, src_file in mime_map.items():
        if src_file not in cache:
            src_path = os.path.join(FILETYPES_DIR, src_file)
            img = Image.open(src_path)
            cache[src_file] = img.resize((256, 256), Image.Resampling.LANCZOS)
        
        dest_path = os.path.join(LINUX_MIME_DIR, mime_icon)
        cache[src_file].save(dest_path, format="PNG")
        print(f"  -> {mime_icon}")

if __name__ == "__main__":
    generate_macos_icons()
    generate_linux_icons()
    print("All cross-platform icons generated successfully.")
