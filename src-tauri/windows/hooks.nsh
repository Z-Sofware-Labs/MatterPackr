; =========================================================================
; MatterPackr NSIS Custom Installer Hooks
; Adds customizable File Association options and Windows Registry management
; =========================================================================

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; Tauri includes this hook from the generated NSIS script. Capture the
; source directory here because ${__FILEDIR__} changes meaning inside hook macros.
!define MATTERPACKR_HOOK_DIR "${__FILEDIR__}"

; Variables for File Association checkboxes
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
Var AssocInitDone

Function PageFileAssociationsShow
  ${IfThen} $PassiveMode = 1 ${|} Abort ${|}

  ${If} $AssocInitDone != 1
    StrCpy $StateZip ${BST_UNCHECKED}
    StrCpy $State7z ${BST_UNCHECKED}
    StrCpy $StateRar ${BST_UNCHECKED}
    StrCpy $StateTar ${BST_UNCHECKED}
    StrCpy $StateGz ${BST_UNCHECKED}
    StrCpy $StateIso ${BST_UNCHECKED}
    StrCpy $StateOther ${BST_UNCHECKED}
    StrCpy $AssocInitDone 1
  ${EndIf}

  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "File Associations" "Choose which file formats you want MatterPackr to open by default."

  ${NSD_CreateLabel} 0 0 100% 24u "Select the file extensions you would like to associate with MatterPackr:"
  Pop $0

  ${NSD_CreateCheckbox} 10u 26u 130u 12u "ZIP archives (.zip)"
  Pop $CheckboxZip
  ${NSD_SetState} $CheckboxZip $StateZip

  ${NSD_CreateCheckbox} 150u 26u 130u 12u "7-Zip archives (.7z)"
  Pop $Checkbox7z
  ${NSD_SetState} $Checkbox7z $State7z

  ${NSD_CreateCheckbox} 10u 42u 130u 12u "RAR archives (.rar)"
  Pop $CheckboxRar
  ${NSD_SetState} $CheckboxRar $StateRar

  ${NSD_CreateCheckbox} 150u 42u 140u 12u "TAR & compressed (.tar, .gz, .bz2, .xz)"
  Pop $CheckboxTar
  ${NSD_SetState} $CheckboxTar $StateTar

  ${NSD_CreateCheckbox} 10u 58u 130u 12u "GZip & BZip2 (.gz, .bz2)"
  Pop $CheckboxGz
  ${NSD_SetState} $CheckboxGz $StateGz

  ${NSD_CreateCheckbox} 150u 58u 130u 12u "Disk Images (.iso, .img)"
  Pop $CheckboxIso
  ${NSD_SetState} $CheckboxIso $StateIso

  ${NSD_CreateCheckbox} 10u 74u 130u 12u "Other archives (.cab, .cpio, .ar)"
  Pop $CheckboxOther
  ${NSD_SetState} $CheckboxOther $StateOther

  ; Select All / Deselect All quick buttons
  ${NSD_CreateButton} 10u 96u 65u 14u "Select All"
  Pop $BtnSelectAll
  ${NSD_OnClick} $BtnSelectAll OnSelectAll

  ${NSD_CreateButton} 80u 96u 70u 14u "Deselect All"
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

; Macro to register a specific file extension with dedicated icon
!macro RegisterExtension Ext ProgId Desc IconName
  WriteRegStr HKCR ".${Ext}" "" "${ProgId}"
  WriteRegStr HKCR "${ProgId}" "" "${Desc}"
  ${If} ${FileExists} "$INSTDIR\icons\filetypes\${IconName}"
    WriteRegStr HKCR "${ProgId}\DefaultIcon" "" '"$INSTDIR\icons\filetypes\${IconName}"'
  ${ElseIf} ${FileExists} "$INSTDIR\resources\icons\filetypes\${IconName}"
    WriteRegStr HKCR "${ProgId}\DefaultIcon" "" '"$INSTDIR\resources\icons\filetypes\${IconName}"'
  ${Else}
    WriteRegStr HKCR "${ProgId}\DefaultIcon" "" '"$INSTDIR\${MAINBINARYNAME}.exe",0'
  ${EndIf}
  WriteRegStr HKCR "${ProgId}\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
!macroend

; Macro to unregister a specific file extension
!macro UnregisterExtension Ext ProgId
  DeleteRegKey HKCR ".${Ext}"
  DeleteRegKey HKCR "${ProgId}"
!macroend

; Post-install hook: copies filetype icons and registers chosen associations in Windows Registry
!macro NSIS_HOOK_POSTINSTALL
  ; Copy dedicated filetype icons
  CreateDirectory "$INSTDIR\icons\filetypes"
  SetOutPath "$INSTDIR\icons\filetypes"
  File /r "${MATTERPACKR_HOOK_DIR}\..\icons\filetypes\*.*"
  SetOutPath $INSTDIR

  ${If} $StateZip == ${BST_CHECKED}
    !insertmacro RegisterExtension "zip" "MatterPackr.zip" "ZIP Archive" "archive.ico"
  ${EndIf}

  ${If} $State7z == ${BST_CHECKED}
    !insertmacro RegisterExtension "7z" "MatterPackr.7z" "7-Zip Archive" "archive.ico"
  ${EndIf}

  ${If} $StateRar == ${BST_CHECKED}
    !insertmacro RegisterExtension "rar" "MatterPackr.rar" "RAR Archive" "archive.ico"
  ${EndIf}

  ${If} $StateTar == ${BST_CHECKED}
    !insertmacro RegisterExtension "tar" "MatterPackr.tar" "TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tar.gz" "MatterPackr.targz" "GZ Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tgz" "MatterPackr.tgz" "GZ Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tar.bz2" "MatterPackr.tarbz2" "BZip2 Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tbz2" "MatterPackr.tbz2" "BZip2 Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tar.xz" "MatterPackr.tarxz" "XZ Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "txz" "MatterPackr.txz" "XZ Compressed TAR Archive" "archive.ico"
    !insertmacro RegisterExtension "tar.zst" "MatterPackr.tarzst" "Zstandard TAR Archive" "archive.ico"
  ${EndIf}

  ${If} $StateGz == ${BST_CHECKED}
    !insertmacro RegisterExtension "gz" "MatterPackr.gz" "GZip File" "archive.ico"
    !insertmacro RegisterExtension "bz2" "MatterPackr.bz2" "BZip2 File" "archive.ico"
  ${EndIf}

  ${If} $StateIso == ${BST_CHECKED}
    !insertmacro RegisterExtension "iso" "MatterPackr.iso" "ISO Disk Image" "archive.ico"
    !insertmacro RegisterExtension "img" "MatterPackr.img" "Disk Image" "archive.ico"
  ${EndIf}

  ${If} $StateOther == ${BST_CHECKED}
    !insertmacro RegisterExtension "cab" "MatterPackr.cab" "Cabinet Archive" "archive.ico"
    !insertmacro RegisterExtension "cpio" "MatterPackr.cpio" "CPIO Archive" "archive.ico"
    !insertmacro RegisterExtension "ar" "MatterPackr.ar" "UNIX Archive" "archive.ico"
    !insertmacro RegisterExtension "a" "MatterPackr.a" "Static Library Archive" "archive.ico"
  ${EndIf}

  ; Notify Windows Explorer that file associations have updated
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, i 0, i 0)'
!macroend

; Pre-uninstall hook: cleanly unregisters all file associations and removes icons
!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro UnregisterExtension "zip" "MatterPackr.zip"
  !insertmacro UnregisterExtension "7z" "MatterPackr.7z"
  !insertmacro UnregisterExtension "rar" "MatterPackr.rar"
  !insertmacro UnregisterExtension "tar" "MatterPackr.tar"
  !insertmacro UnregisterExtension "tar.gz" "MatterPackr.targz"
  !insertmacro UnregisterExtension "tgz" "MatterPackr.tgz"
  !insertmacro UnregisterExtension "tar.bz2" "MatterPackr.tarbz2"
  !insertmacro UnregisterExtension "tbz2" "MatterPackr.tbz2"
  !insertmacro UnregisterExtension "tar.xz" "MatterPackr.tarxz"
  !insertmacro UnregisterExtension "txz" "MatterPackr.txz"
  !insertmacro UnregisterExtension "tar.zst" "MatterPackr.tarzst"
  !insertmacro UnregisterExtension "gz" "MatterPackr.gz"
  !insertmacro UnregisterExtension "bz2" "MatterPackr.bz2"
  !insertmacro UnregisterExtension "iso" "MatterPackr.iso"
  !insertmacro UnregisterExtension "img" "MatterPackr.img"
  !insertmacro UnregisterExtension "cab" "MatterPackr.cab"
  !insertmacro UnregisterExtension "cpio" "MatterPackr.cpio"
  !insertmacro UnregisterExtension "ar" "MatterPackr.ar"
  !insertmacro UnregisterExtension "a" "MatterPackr.a"

  RMDir /r "$INSTDIR\icons\filetypes"

  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0x0000, i 0, i 0)'
!macroend
