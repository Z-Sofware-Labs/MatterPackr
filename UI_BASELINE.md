# MatterPackr UI Baseline

This build freezes the current UI direction while archive backends continue to expand.

- Borderless Tauri window (`decorations: false`).
- Custom title bar. Windows controls are `—`, maximize, and close; macOS uses custom traffic lights.
- The title bar is draggable via Tauri `startDragging()` except over interactive controls; double-clicking the non-interactive title bar toggles maximize.
- Compact header and bottom status bar.
- System light/dark theme with live system-theme changes.
- Nested file-manager-style archive tree.
- Activity logger.
- New Archive format dropdown.
- Encryption/password controls appear only for ZIP and 7Z.
- Empty state: “Create or open an archive to begin”, with current create/extract formats and planned extract-only formats.
- File-type icons and file association preferences remain in Options.

## Format presentation

Create & extract: ZIP, 7Z, TAR, TAR.GZ, TAR.BZ2, GZ, BZ2.

Extract only (planned backend): RAR, CAB, ISO, IMG, BIN/CUE, MDF/MDS.
