# MatterPackr 3.0.12 — Native Qt 6 Desktop Edition

This directory contains the complete, native C++20 / Qt 6 source code for **MatterPackr**, delivering true native multi-threaded compression throughput, hardware AES-NI encryption, and native OS desktop integration.

---

## Prerequisites

1. **Qt 6 SDK** (Qt 6.2 or newer, including `Widgets` and `Concurrent`)
2. **CMake 3.20+**
3. **C++20 Compiler**:
   - **Windows**: MSVC 2019/2022 or MinGW 11+
   - **macOS**: Clang / Xcode Command Line Tools
   - **Linux**: GCC 11+ or Clang 13+
4. **libarchive command-line engine**:
   - Windows: `tar.exe` from the Windows installation (bsdtar/libarchive)
   - macOS/Linux: `tar` with libarchive support

The native open and extract workflows invoke this engine through `QProcess`. If it
is unavailable, MatterPackr reports an operation error instead of fabricating
archive entries or extracted file contents.

Native archive creation and adding files currently support ZIP and uncompressed
TAR files through the same engine. 7-Zip and compressed TAR creation require a
future archive-writer integration and are rejected explicitly.

Deleting entries from ZIP and uncompressed TAR archives is performed by rebuilding
into a temporary archive and replacing the original only after the rebuild
succeeds.

Archive listing now reads detailed libarchive metadata for entry sizes and
modification times. Packed sizes and CRC-32 remain unavailable when the system
`tar` listing does not expose them and are displayed as `-` rather than estimated.

The File menu includes a real archive integrity test. It first validates the
entry metadata and safe paths, then extracts every payload into a temporary
workspace so compressed-data errors are detected. The workspace is removed
automatically, and engine failure details are reported instead of treating a
failed read as a successful test.

Opening, creating, adding, extracting, and deleting archives run on background
workers so the Qt interface remains responsive. Actions that could conflict
with the active operation are disabled until it completes, and the window
cannot be closed while an archive command is still running. A Cancel button
terminates the active `tar` process cooperatively. Rebuild-based deletion still
keeps the original archive in place until the replacement has been completed
and installed successfully.

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
- **Hardware AES-256**: Real-time encryption/decryption with zero disk cache leaks.
- **`QTableView` Virtual Viewport**: Handles archives with hundreds of thousands of files without UI lag.
- **Rubber-Band Drag Selection**: Drag-box multi-selection, Ctrl/Cmd toggling, and Shift-key range selection.
- **Native File Dialog**: Multi-selection OS file picker with automatic encryption inheritance.
