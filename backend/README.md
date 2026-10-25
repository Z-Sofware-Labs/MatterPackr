# MatterPackr 2.0 - Backend Architecture & Documentation

High-performance desktop archive manager backend for **MatterPackr 2.0**, featuring dual-engine routing:
- **`libarchrv` (`libarchive`)**: Primary engine for general archive manipulation (Zip, 7-Zip, TAR, GZ, BZ2, XZ, ISO, CAB).
- **`unRAR`**: Dedicated engine exclusively for handling RAR archives (.rar, .cbr) in read-only mode.

---

## 1. File Support Matrix

| Format | Extension(s) | Engine | Access Mode | Actions Allowed |
| :--- | :--- | :--- | :--- | :--- |
| **ZIP** | `.zip`, `.jar`, `.apk` | `libarchrv` | **Read & Write** | List, Extract, Add, Create, View, Test |
| **7-Zip** | `.7z` | `libarchrv` | **Read & Write** | List, Extract, Add, Create, View, Test |
| **TAR** | `.tar` | `libarchrv` | **Read & Write** | List, Extract, Add, Create, View, Test |
| **TAR Compressed** | `.tar.gz`, `.tar.bz2`, `.tar.xz` | `libarchrv` | **Read & Write** | List, Extract, Add, Create, View, Test |
| **RAR** | `.rar`, `.cbr` | `unRAR` | **Read-Only** | **List, Extract, View, Test ONLY** (Modifications blocked) |
| **Secondary Formats** | `.iso`, `.cab`, `.arj`, `.lha` | `libarchrv` | **Read-Only** | List, Extract, View |

---

## 2. System Dependencies Setup

### Linux (Ubuntu / Debian)
```bash
sudo apt-get update
# Install system libarchive and unrar
sudo apt-get install -y libarchive-dev unrar
```

### macOS (Homebrew)
```bash
# Install system libarchive and unrar
brew install libarchive unrar
```

### Windows (Chocolatey / Scoop)
```powershell
choco install unrar
```

---

## 3. Python Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

---

## 4. Launching the API Server

```bash
python3 -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload
```

---

## 5. Frontend UI Integration Example (TypeScript)

The frontend communicates with the backend via the `ArchiveBackendClient`:

```typescript
// src/services/archiveBackendClient.ts

import { ArchiveFile, ArchiveState, ProgressState } from '../types/winzip';

const BACKEND_BASE = 'http://127.0.0.1:8000';

export class ArchiveBackendClient {
  /**
   * Action: Open Archive
   * Reads metadata and populates table columns (Name, Modified, Size, Ratio, Packed, CRC-32, Encryption, Path)
   */
  static async openArchive(filePath: string, password?: string): Promise<{ state: ArchiveState }> {
    const res = await fetch(`${BACKEND_BASE}/api/archive/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_path: filePath, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.message || 'Failed to open archive');
    }

    const data = await res.json();
    return {
      state: {
        name: data.metadata.filename,
        path: data.metadata.filePath,
        files: data.entries,
        isEncrypted: data.metadata.isEncrypted,
        encryptionMethod: data.metadata.encryptionSummary,
        totalSize: data.metadata.totalUncompressedBytes,
        totalPackedSize: data.metadata.totalPackedBytes,
        overallRatio: data.metadata.overallRatio,
        isModified: false,
        threadsCount: 8,
        chunkSizeKb: 64,
      }
    };
  }

  /**
   * Action: Extract Archive with WebSocket Progress
   */
  static async extract(
    archivePath: string,
    destinationDir: string,
    entryPaths?: string[],
    password?: string,
    onProgress?: (p: ProgressState) => void
  ) {
    const operationId = `extract-${Date.now()}`;
    
    // Connect WebSocket for real-time multi-threading metrics
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/progress/${operationId}`);
    ws.onmessage = (event) => {
      const p = JSON.parse(event.data);
      if (onProgress) {
        onProgress({
          active: p.status === 'running',
          action: 'extract',
          title: 'Extracting files...',
          currentFile: p.currentFile,
          currentFileProgress: p.currentFileProgress,
          totalProgress: p.totalProgress,
          activeThread: p.activeThread,
          totalThreads: p.totalThreads,
          throughputMBs: p.throughputMBs,
          processedBytes: p.processedBytes,
          totalBytes: p.totalBytes,
          elapsedSeconds: p.elapsedSeconds,
          estimatedRemainingSeconds: p.estimatedRemainingSeconds,
          isPaused: false,
          canCancel: true,
        });
      }
    };

    const res = await fetch(`${BACKEND_BASE}/api/archive/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archive_path: archivePath,
        destination_dir: destinationDir,
        entry_paths: entryPaths,
        password,
        operation_id: operationId,
      }),
    });

    ws.close();
    return await res.json();
  }

  /**
   * Action: View / Inspect Stream
   */
  static async preview(archivePath: string, entryPath: string, password?: string) {
    const res = await fetch(`${BACKEND_BASE}/api/archive/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archive_path: archivePath,
        entry_path: entryPath,
        password,
      }),
    });
    return await res.json();
  }

  /**
   * Action: Add Files (Read-Write formats only: Zip, 7Z, TAR)
   * Enforces 403 Forbidden rejection if archive is RAR.
   */
  static async addFiles(archivePath: string, files: { source_path: string; archive_path?: string }[]) {
    const res = await fetch(`${BACKEND_BASE}/api/archive/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_path: archivePath, files }),
    });

    if (res.status === 403) {
      const err = await res.json();
      throw new Error(`Write Operation Denied: ${err.detail?.message}`);
    }

    return await res.json();
  }
}
```
