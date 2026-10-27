; ==============================================================================
; MatterPackr NSIS Installer Script
; Features:
; 1. MultiUser installation (All Users / Machine-Wide vs Current User)
; 2. Sequential wizard flow (Welcome -> License -> Mode -> Directory -> Associations -> Install -> Finish)
; 3. File type association selection with icons and Windows Explorer integration
; ==============================================================================

Unicode true
ManifestDPIAware true
ManifestDPIAwareness PerMonitorV2
SetCompressor /SOLID "lzma"

!define PRODUCT_NAME "MatterPackr"
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "3.0.1"
!endif
!define PRODUCT_PUBLISHER "Z Software Labs"
!define PRODUCT_WEB_SITE "https://github.com/Z-Sofware-Labs/MatterPackr"
!define MAIN_EXE_NAME "MatterPackr.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

!ifndef OUTFILE
  !define OUTFILE "MatterPackr-v3.0.1-windows-x64-Setup.exe"
!endif

Name "${PRODUCT_NAME}"
OutFile "${OUTFILE}"

; MultiUser Configuration (Must be defined BEFORE including MultiUser.nsh)
!define MULTIUSER_EXECUTIONLEVEL Highest
!define MULTIUSER_MUI
!define MULTIUSER_INSTALLMODE_COMMANDLINE
!define MULTIUSER_INSTALLMODE_DEFAULT_ALLUSERS 1
!define MULTIUSER_USE_PROGRAMFILES64
!define MULTIUSER_INSTALLMODE_INSTDIR "${PRODUCT_NAME}"
!define MULTIUSER_INSTALLMODE_INSTDIR_REGISTRY_KEY "${UNINST_KEY}"
!define MULTIUSER_INSTALLMODE_INSTDIR_REGISTRY_VALUENAME "InstallLocation"

!include "MUI2.nsh"
!include "MultiUser.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; UI Configuration
!define MUI_ICON "app.ico"
!define MUI_UNICON "app.ico"
!define MUI_ABORTWARNING

; Variables for File Associations Page
Var Dialog
Var CheckboxZip
Var Checkbox7z
Var CheckboxRar
Var CheckboxTar
Var CheckboxGz
Var CheckboxIso
Var CheckboxOther
Var BtnSelectAll
Var BtnDeselectAll

Var StateZip
Var State7z
Var StateRar
Var StateTar
Var StateGz
Var StateIso
Var StateOther

; ==============================================================================
; Wizard Sequential Pages
; ==============================================================================
; 1. Welcome Page
!insertmacro MUI_PAGE_WELCOME

; 2. License Page
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"

; 3. Installation Mode (Machine-wide / All users vs Current User)
!insertmacro MULTIUSER_PAGE_INSTALLMODE

; 4. Destination Directory
!insertmacro MUI_PAGE_DIRECTORY

; 5. File Type Associations Custom Page
Page custom PageFileAssociationsShow PageFileAssociationsLeave

; 6. Installation Progress
!insertmacro MUI_PAGE_INSTFILES

; 7. Finish Page
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAIN_EXE_NAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch MatterPackr"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; ==============================================================================
; Initialization
; ==============================================================================
Function .onInit
  !insertmacro MULTIUSER_INIT
  ; Default all associations checked
  StrCpy $StateZip ${BST_CHECKED}
  StrCpy $State7z ${BST_CHECKED}
  StrCpy $StateRar ${BST_CHECKED}
  StrCpy $StateTar ${BST_CHECKED}
  StrCpy $StateGz ${BST_CHECKED}
  StrCpy $StateIso ${BST_CHECKED}
  StrCpy $StateOther ${BST_CHECKED}
FunctionEnd

Function un.onInit
  !insertmacro MULTIUSER_UNINIT
FunctionEnd

; ==============================================================================
; Custom Page: File Type Associations
; ==============================================================================
Function PageFileAssociationsShow
  !insertmacro MUI_HEADER_TEXT "File Associations" "Choose which file types MatterPackr should open by default."

  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 10u 4u 280u 16u "Select the archive and image formats you want to associate with MatterPackr:"
  Pop $0

  ${NSD_CreateCheckbox} 15u 24u 130u 12u "ZIP archives (.zip)"
  Pop $CheckboxZip
  ${NSD_SetState} $CheckboxZip $StateZip

  ${NSD_CreateCheckbox} 150u 24u 130u 12u "7-Zip archives (.7z)"
  Pop $Checkbox7z
  ${NSD_SetState} $Checkbox7z $State7z

  ${NSD_CreateCheckbox} 15u 40u 130u 12u "RAR archives (.rar)"
  Pop $CheckboxRar
  ${NSD_SetState} $CheckboxRar $StateRar

  ${NSD_CreateCheckbox} 150u 40u 140u 12u "TAR & compressed (.tar, .tgz, .tbz2, .txz)"
  Pop $CheckboxTar
  ${NSD_SetState} $CheckboxTar $StateTar

  ${NSD_CreateCheckbox} 15u 56u 130u 12u "GZip & BZip2 (.gz, .bz2)"
  Pop $CheckboxGz
  ${NSD_SetState} $CheckboxGz $StateGz

  ${NSD_CreateCheckbox} 150u 56u 130u 12u "Disk Images (.iso, .img)"
  Pop $CheckboxIso
  ${NSD_SetState} $CheckboxIso $StateIso

  ${NSD_CreateCheckbox} 15u 72u 130u 12u "Other (.cab, .cpio, .ar)"
  Pop $CheckboxOther
  ${NSD_SetState} $CheckboxOther $StateOther

  ; Quick action buttons
  ${NSD_CreateButton} 15u 95u 65u 14u "Select All"
  Pop $BtnSelectAll
  ${NSD_OnClick} $BtnSelectAll OnSelectAll

  ${NSD_CreateButton} 85u 95u 70u 14u "Deselect All"
  Pop $BtnDeselectAll
  ${NSD_OnClick} $BtnDeselectAll OnDeselectAll

  nsDialogs::Show
FunctionEnd

Function OnSelectAll
  ${NSD_SetState} $CheckboxZip ${BST_CHECKED}
  ${NSD_SetState} $Checkbox7z ${BST_CHECKED}
  ${NSD_SetState} $CheckboxRar ${BST_CHECKED}
  ${NSD_SetState} $CheckboxTar ${BST_CHECKED}
  ${NSD_SetState} $CheckboxGz ${BST_CHECKED}
  ${NSD_SetState} $CheckboxIso ${BST_CHECKED}
  ${NSD_SetState} $CheckboxOther ${BST_CHECKED}
FunctionEnd

Function OnDeselectAll
  ${NSD_SetState} $CheckboxZip ${BST_UNCHECKED}
  ${NSD_SetState} $Checkbox7z ${BST_UNCHECKED}
  ${NSD_SetState} $CheckboxRar ${BST_UNCHECKED}
  ${NSD_SetState} $CheckboxTar ${BST_UNCHECKED}
  ${NSD_SetState} $CheckboxGz ${BST_UNCHECKED}
  ${NSD_SetState} $CheckboxIso ${BST_UNCHECKED}
  ${NSD_SetState} $CheckboxOther ${BST_UNCHECKED}
FunctionEnd

Function PageFileAssociationsLeave
  ${NSD_GetState} $CheckboxZip $StateZip
  ${NSD_GetState} $Checkbox7z $State7z
  ${NSD_GetState} $CheckboxRar $StateRar
  ${NSD_GetState} $CheckboxTar $StateTar
  ${NSD_GetState} $CheckboxGz $StateGz
  ${NSD_GetState} $CheckboxIso $StateIso
  ${NSD_GetState} $CheckboxOther $StateOther
FunctionEnd

; ==============================================================================
; File Association Macros
; ==============================================================================
!macro RegisterExt Ext ProgId Desc IconName
  ; 1. ProgId Definition
  WriteRegStr SHCTX "Software\Classes\${ProgId}" "" "${Desc}"
  ${If} ${FileExists} "$INSTDIR\icons\filetypes\${IconName}"
    WriteRegStr SHCTX "Software\Classes\${ProgId}\DefaultIcon" "" "$INSTDIR\icons\filetypes\${IconName},0"
  ${Else}
    WriteRegStr SHCTX "Software\Classes\${ProgId}\DefaultIcon" "" "$INSTDIR\${MAIN_EXE_NAME},0"
  ${EndIf}
  WriteRegStr SHCTX "Software\Classes\${ProgId}\shell\open\command" "" '"$INSTDIR\${MAIN_EXE_NAME}" "%1"'

  ; 2. Extension Default Handler & Direct DefaultIcon
  WriteRegStr SHCTX "Software\Classes\.${Ext}" "" "${ProgId}"
  WriteRegStr SHCTX "Software\Classes\.${Ext}\OpenWithProgids" "${ProgId}" ""
  ${If} ${FileExists} "$INSTDIR\icons\filetypes\${IconName}"
    WriteRegStr SHCTX "Software\Classes\.${Ext}\DefaultIcon" "" "$INSTDIR\icons\filetypes\${IconName},0"
  ${EndIf}

  ; 3. Windows Capabilities & Registered Applications
  WriteRegStr SHCTX "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".${Ext}" "${ProgId}"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}\SupportedTypes" ".${Ext}" ""

  ; 4. Clear cached UserChoice in HKCU so Windows 10/11 activates MatterPackr as default
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\UserChoice"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\OpenWithProgids" "${ProgId}" ""
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\OpenWithList" "a" "${MAIN_EXE_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\OpenWithList" "MRUList" "a"
!macroend

!macro UnregisterExt Ext ProgId
  ReadRegStr $0 SHCTX "Software\Classes\.${Ext}" ""
  ${If} $0 == "${ProgId}"
    DeleteRegValue SHCTX "Software\Classes\.${Ext}" ""
    DeleteRegKey SHCTX "Software\Classes\.${Ext}\DefaultIcon"
  ${EndIf}
  DeleteRegValue SHCTX "Software\Classes\.${Ext}\OpenWithProgids" "${ProgId}"
  DeleteRegKey SHCTX "Software\Classes\${ProgId}"
  DeleteRegValue SHCTX "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".${Ext}"
  DeleteRegValue SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}\SupportedTypes" ".${Ext}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${Ext}\OpenWithProgids" "${ProgId}"
!macroend

; ==============================================================================
; Install Section
; ==============================================================================
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  ; Bundle all windeployqt output
  File /r "dist\*.*"

  ; Install filetype icons
  CreateDirectory "$INSTDIR\icons\filetypes"
  SetOutPath "$INSTDIR\icons\filetypes"
  File /r "filetypes\*.*"

  SetOutPath "$INSTDIR"

  ; Create Shortcuts
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE_NAME}" "" "$INSTDIR\${MAIN_EXE_NAME}" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${MAIN_EXE_NAME}" "" "$INSTDIR\${MAIN_EXE_NAME}" 0

  ; Register Application in Windows
  WriteRegStr SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}" "FriendlyAppName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}\DefaultIcon" "" "$INSTDIR\${MAIN_EXE_NAME},0"
  WriteRegStr SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}\shell\open\command" "" '"$INSTDIR\${MAIN_EXE_NAME}" "%1"'

  ; Register in Windows 10/11 RegisteredApplications
  WriteRegStr SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}" "Software\${PRODUCT_NAME}\Capabilities"
  WriteRegStr SHCTX "Software\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "MatterPackr Modern Archive Manager"

  ; File Associations
  ${If} $StateZip == ${BST_CHECKED}
    !insertmacro RegisterExt "zip" "MatterPackr.zip" "ZIP Archive" "zip.ico"
  ${EndIf}

  ${If} $State7z == ${BST_CHECKED}
    !insertmacro RegisterExt "7z" "MatterPackr.7z" "7-Zip Archive" "7z.ico"
  ${EndIf}

  ${If} $StateRar == ${BST_CHECKED}
    !insertmacro RegisterExt "rar" "MatterPackr.rar" "RAR Archive" "rar.ico"
  ${EndIf}

  ${If} $StateTar == ${BST_CHECKED}
    !insertmacro RegisterExt "tar" "MatterPackr.tar" "TAR Archive" "tar.ico"
    !insertmacro RegisterExt "tgz" "MatterPackr.tgz" "GZ Compressed TAR Archive" "tgz.ico"
    !insertmacro RegisterExt "tbz2" "MatterPackr.tbz2" "BZip2 Compressed TAR Archive" "tbz2.ico"
    !insertmacro RegisterExt "txz" "MatterPackr.txz" "XZ Compressed TAR Archive" "txz.ico"
  ${EndIf}

  ${If} $StateGz == ${BST_CHECKED}
    !insertmacro RegisterExt "gz" "MatterPackr.gz" "GZip File" "gz.ico"
    !insertmacro RegisterExt "bz2" "MatterPackr.bz2" "BZip2 File" "bz2.ico"
  ${EndIf}

  ${If} $StateIso == ${BST_CHECKED}
    !insertmacro RegisterExt "iso" "MatterPackr.iso" "ISO Disk Image" "iso.ico"
    !insertmacro RegisterExt "img" "MatterPackr.img" "Disk Image" "img.ico"
  ${EndIf}

  ${If} $StateOther == ${BST_CHECKED}
    !insertmacro RegisterExt "cab" "MatterPackr.cab" "Cabinet Archive" "cab.ico"
    !insertmacro RegisterExt "cpio" "MatterPackr.cpio" "CPIO Archive" "cpio.ico"
    !insertmacro RegisterExt "ar" "MatterPackr.ar" "UNIX Archive" "ar.ico"
  ${EndIf}

  ; Refresh Windows Shell Icons
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, i 0, i 0)'

  ; Write Uninstaller & Add/Remove Programs entry
  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr SHCTX "${UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "${UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr SHCTX "${UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr SHCTX "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${MAIN_EXE_NAME},0"
  WriteRegStr SHCTX "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr SHCTX "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegStr SHCTX "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
SectionEnd

; ==============================================================================
; Uninstall Section
; ==============================================================================
Section "Uninstall"
  ; Remove File Associations
  !insertmacro UnregisterExt "zip" "MatterPackr.zip"
  !insertmacro UnregisterExt "7z" "MatterPackr.7z"
  !insertmacro UnregisterExt "rar" "MatterPackr.rar"
  !insertmacro UnregisterExt "tar" "MatterPackr.tar"
  !insertmacro UnregisterExt "tgz" "MatterPackr.tgz"
  !insertmacro UnregisterExt "tbz2" "MatterPackr.tbz2"
  !insertmacro UnregisterExt "txz" "MatterPackr.txz"
  !insertmacro UnregisterExt "gz" "MatterPackr.gz"
  !insertmacro UnregisterExt "bz2" "MatterPackr.bz2"
  !insertmacro UnregisterExt "iso" "MatterPackr.iso"
  !insertmacro UnregisterExt "img" "MatterPackr.img"
  !insertmacro UnregisterExt "cab" "MatterPackr.cab"
  !insertmacro UnregisterExt "cpio" "MatterPackr.cpio"
  !insertmacro UnregisterExt "ar" "MatterPackr.ar"

  ; Notify Windows Explorer
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, i 0, i 0)'

  ; Delete Shortcuts
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; Delete Files & Uninstaller
  Delete "$INSTDIR\uninstall.exe"
  Delete "$INSTDIR\${MAIN_EXE_NAME}"
  RMDir /r "$INSTDIR\icons"
  ${If} $INSTDIR != ""
    RMDir /r "$INSTDIR"
  ${EndIf}

  ; Remove Add/Remove Programs registry key
  DeleteRegKey SHCTX "${UNINST_KEY}"

  ; Remove Application & Capabilities Registration
  DeleteRegValue SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}"
  DeleteRegKey SHCTX "Software\${PRODUCT_NAME}\Capabilities"
  DeleteRegKey SHCTX "Software\${PRODUCT_NAME}"
  DeleteRegKey SHCTX "Software\Classes\Applications\${MAIN_EXE_NAME}"
SectionEnd
