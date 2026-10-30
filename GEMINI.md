# MatterPackr Agent Project Rules & Critical Constraints

## Protected Files & Modification Restrictions

### 1. Windows Installer Script (`packaging/windows/installer.nsi`)
> [!CRITICAL]
> **DO NOT MODIFY `packaging/windows/installer.nsi` UNLESS EXPLICITLY INSTRUCTED BY THE USER.**
>
> When updating or modifying other parts of the application (e.g. native Qt C++ code, frontend, themes, CMake configuration, or version bumps), **NEVER touch or alter `packaging/windows/installer.nsi`** without explicit user permission.
>
> In particular:
> - **Registry Rules**: NEVER add registry deletion commands that touch `UserChoice` or `FileExts\...` (such as `DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\UserChoice"`). This triggers antivirus heuristic false positives (specifically Microsoft Defender's `Trojan:Win32/Bearfoos`).
> - **File Associations**: All Windows file associations MUST strictly adhere to standard Windows mechanisms (`Software\Classes\...`, `Software\${PRODUCT_NAME}\Capabilities`, and `SHChangeNotify`).
> - Keep the installer script stable and unchanged unless the user directly and explicitly requests changes to the Windows packaging/installer.

### 2. Qt Options Dialog Registry Registration (`native-qt/src/OptionsDialog.cpp`)
> [!IMPORTANT]
> The Windows shell command formatted in `OptionsDialog.cpp` MUST ALWAYS retain the exact argument placeholders:
> `QString("\"%1\" \"%2\"").arg(winAppPath, "%1")`
> Never reduce or alter this to `QString("\"%1\" \"%1\"")` as Qt's multi-arg replacement will substitute `winAppPath` into both slots, corrupting file association arguments in the Windows registry.

