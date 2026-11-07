# MatterPackr 3.0.15 — Native Qt 6 Desktop Edition

This directory contains the complete, native C++20 / Qt 6 source code for
**MatterPackr**, delivering native archive operations, responsive desktop
integration, and explicit capability reporting for the available archive engine.

---

## Prerequisites

1. **Qt 6 SDK** (Qt 6.2 or newer, including `Widgets` and `Concurrent`)
2. **CMake 3.20+**
3. **C++20 Compiler**:
   - **Windows**: MSVC 2019/2022 or MinGW 11+
   - **macOS**: Clang / Xcode Command Line Tools
   - **Linux**: GCC 11+ or Clang 13+
4. **libarchive**:
   - The CMake build fetches and links the pinned libarchive source by default.
   - Packagers may set `MATTERPACKR_USE_SYSTEM_LIBARCHIVE=ON` to use a
     preinstalled library instead.
   - On MinGW, CMake also searches the active toolchain for zlib so ZIP
     Deflate extraction is enabled.
5. **Optional libzip**:
   - libzip development headers and library for ZIP metadata and encryption.
6. **7Z support through libarchive**:
   - The linked libarchive writer handles 7Z creation, listing, extraction,
     testing, adding, and removal without an additional SDK dependency.
   - The `MatterPackr7zSmoke` CTest validates empty, nested-file, add, and
     remove workflows through independent libarchive readback.

The native Qt target currently uses libarchive for the formats it supports.
Native UnRAR integration is a separate pending component; the project must not
bundle WinRAR, and any UnRAR integration must remain read-only. The
redistribution text is included in `../licenses/UNRAR-LICENSE.txt`.

The native open and extract workflows use the linked libarchive library. If the
library cannot be configured or loaded, the application build fails rather than
silently switching to a different archive implementation.

Native archive creation, adding files, and deletion rebuilds use the linked
libarchive writer for unencrypted ZIP, 7-Zip, and uncompressed TAR files.
The user-facing format list intentionally excludes BZip2/XZ-compressed TAR
archives because they are outside MatterPackr's target audience.
When enabled, the pinned 7-Zip SDK is linked only for password-protected 7Z
creation. After naming an archive with the operating system file dialog, the
New Archive setup window lets the user choose ZIP, 7Z, TAR, or TAR.GZ, select
files to add, and optionally enable encryption. ZIP uses libarchive's AES-256
writer; 7Z uses the SDK with encrypted headers. TAR and TAR.GZ are displayed
as creation options but their encryption control is disabled. Passwords are
passed in-process and are never placed on a command line.

Deleting entries from ZIP and uncompressed TAR archives is performed by rebuilding
into a temporary archive and replacing the original only after the rebuild
succeeds.

Replacement archives are staged in the original archive's directory so Windows
can atomically rename them even when the system temporary directory is on a
different volume.

Archive listing now reads detailed libarchive metadata for entry sizes and
modification times. Packed sizes and CRC-32 remain unavailable when the system
`tar` listing does not expose them and are displayed as `-` rather than estimated.

The File menu includes a real archive integrity test. It first validates the
entry metadata and safe paths, then extracts every payload into a temporary
workspace so compressed-data errors are detected. The workspace is removed
automatically, and engine failure details are reported instead of treating a
failed read as a successful test.

Encrypted 7Z creation uses AES encryption and encrypted headers through the
7-Zip SDK. The existing libarchive path remains responsible for unencrypted
7Z creation and all normal archive operations. Encrypted 7Z modification and
password-aware reopening require the corresponding SDK callbacks and are not
silently routed through libarchive.

The CMake build links the pinned libarchive source by default and defines
`MATTERPACKR_HAS_LIBARCHIVE`. It can use a preinstalled libarchive with
`MATTERPACKR_USE_SYSTEM_LIBARCHIVE=ON`. The optional libzip detection defines
`MATTERPACKR_HAS_LIBZIP` when available. The in-process libarchive adapter is
the authoritative read backend; corrupt or unsafe archives are not silently
reinterpreted by another backend.

Opening, creating, adding, extracting, and deleting archives run on background
workers so the Qt interface remains responsive. Actions that could conflict
with the active operation are disabled until it completes, and the window
cannot be closed while an archive operation is still running. A Cancel button
cooperatively stops the active operation. Rebuild-based deletion still keeps
the original archive in place until the replacement has been completed and
installed successfully.

---

## Quick Build & Run

### 🐧 Linux (Ubuntu / Debian / Fedora / Arch)

```bash
# 1. Install Qt 6 and build tools
# On Ubuntu / Debian:
sudo apt update
sudo apt install -y build-essential cmake qt6-base-dev qt6-declarative-dev libgl1-mesa-dev

# On Fedora:
sudo dnf install -y gcc-c++ cmake qt6-qtbase-devel

# On Arch Linux:
sudo pacman -S --needed base-devel cmake qt6-base

# 2. Build MatterPackr
cd native-qt
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)

# 3. Run the binary
./build/MatterPackr
```

---

### 🍎 macOS (Apple Silicon & Intel)

```bash
# 1. Install Qt 6 and CMake via Homebrew
brew install qt6 cmake

# 2. Configure with Qt 6 prefix path
cd native-qt
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=$(brew --prefix qt6)
cmake --build build -j$(sysctl -n hw.ncpu)

# 3. Run the macOS App Bundle
open build/MatterPackr.app
```

---

### 🪟 Windows (Visual Studio or MinGW)

#### Method 1: Qt Creator (Easiest)
1. Download and install [Qt 6 Open Source](https://www.qt.io/download-open-source).
2. Open `native-qt/CMakeLists.txt` in **Qt Creator**.
3. Click **Configure Project** and press **Ctrl+R** to build and run!

#### Method 2: Command Line (MSVC)
```powershell
# In "x64 Native Tools Command Prompt for VS 2022":
cd native-qt
cmake -B build -DCMAKE_PREFIX_PATH="C:\Qt\6.6.0\msvc2019_64" -G "Ninja"
cmake --build build --config Release
.\build\MatterPackr.exe
```

---

## Features
- **True Multi-Threading**: `QThreadPool` & `QRunnable` architecture allocating tasks dynamically to your physical CPU cores.
- **Encryption safety**: Encrypted archives are rejected explicitly until a
  password-capable archive backend is integrated; passwords are never passed on
  command lines or stored by the native workflow.
- **`QTableView` Virtual Viewport**: Handles archives with hundreds of thousands of files without UI lag.
- **Rubber-Band Drag Selection**: Drag-box multi-selection, Ctrl/Cmd toggling, and Shift-key range selection.
- **Native File Dialog**: Multi-selection OS file picker with automatic encryption inheritance.
