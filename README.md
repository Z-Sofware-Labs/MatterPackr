# MatterPackr — 100% Native Qt 6 Desktop Archiver

MatterPackr is a high-performance desktop archive manager built with a **100% pure native Qt 6 (C++20)** architecture. 

It does **NOT** use Electron, Tauri, or browser web wrappers for desktop execution. It compiles down to a raw native binary utilizing your operating system's native window manager (Win32/DWM on Windows, Cocoa on macOS, and X11/Wayland on Linux) for maximum performance, minimum memory footprint, and direct disk streaming.

---

## Architecture

* **Framework**: Qt 6.4+ (Widgets, Core, Gui, Concurrent)
* **Language**: C++20 standard
* **Build System**: Modern CMake 3.20+
* **Data Grid**: `QTableView` with custom `QAbstractTableModel` (instant virtualized rendering for 500,000+ files)
* **Selection Model**: `QItemSelectionModel` with rubber-band marquee drag box, `Ctrl`/`Cmd` non-contiguous toggle, and `Shift` range selection
* **Concurrency**: `QThreadPool` & `QRunnable` multi-threaded chunked compression
* **Cryptography**: Hardware-accelerated AES-256 (AES-NI / ARM Crypto instructions)
* **Zero Wrappers**: No Chromium runtime, no Node.js desktop layer, no WebViews

---

## Directory Layout

```
├── native-qt/               # Complete Native Qt 6 C++20 Project Source
│   ├── CMakeLists.txt       # CMake build configuration
│   ├── README.md            # Platform-specific build instructions
│   └── src/
│       ├── main.cpp         # Native Qt QApplication entry point
│       ├── MainWindow.h/.cpp# QMainWindow, QTableView, QToolBar, QStatusBar
│       ├── ArchiveModel.h/.cpp # QAbstractTableModel (all 9 columns)
│       ├── CompressionEngine.h/.cpp # QThreadPool worker pipeline
│       └── OptionsDialog.h/.cpp # Native Qt compact QTabWidget dialog
├── src/                     # Interactive Qt 6 Web-based Architecture Viewer & Simulator
└── backend/                 # High-performance archive backend specifications
```

---

## Native Qt 6 Build Instructions

### Linux (Ubuntu / Debian / Fedora / Arch)
```bash
sudo apt update && sudo apt install -y build-essential cmake qt6-base-dev qt6-declarative-dev
cd native-qt
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j$(nproc)
./build/MatterPackr
```

### macOS (Apple Silicon & Intel)
```bash
brew install qt6 cmake
cd native-qt
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=$(brew --prefix qt6)
cmake --build build -j$(sysctl -n hw.ncpu)
open build/MatterPackr.app
```

### Windows (Visual Studio or MinGW)
Open `native-qt/CMakeLists.txt` directly in **Qt Creator** and press **Ctrl+R**, or:
```powershell
cd native-qt
cmake -B build -DCMAKE_PREFIX_PATH="C:\Qt\6.6.0\msvc2019_64" -G "Ninja"
cmake --build build --config Release
.\build\MatterPackr.exe
```
