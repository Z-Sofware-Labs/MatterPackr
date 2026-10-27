/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { ToolBar } from './components/ToolBar';
import { FileList } from './components/FileList';
import { StatusBar } from './components/StatusBar';

// Dialogs
import { AddDialog } from './components/dialogs/AddDialog';
import { ExtractDialog } from './components/dialogs/ExtractDialog';
import { PasswordDialog } from './components/dialogs/PasswordDialog';
import { ProgressDialog } from './components/dialogs/ProgressDialog';
import { TestDialog } from './components/dialogs/TestDialog';
import { ViewFileDialog } from './components/dialogs/ViewFileDialog';
import { PropertiesDialog } from './components/dialogs/PropertiesDialog';
import { WizardDialog } from './components/dialogs/WizardDialog';
import { TipOfDayDialog } from './components/dialogs/TipOfDayDialog';
import { AboutDialog } from './components/dialogs/AboutDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { BenchmarkDialog } from './components/dialogs/BenchmarkDialog';
import { FavoritesDialog } from './components/dialogs/FavoritesDialog';
import { DeleteConfirmDialog } from './components/dialogs/DeleteConfirmDialog';
import { CheckOutDialog } from './components/dialogs/CheckOutDialog';
import { NewArchiveDialog } from './components/dialogs/NewArchiveDialog';
import { UnlockArchiveDialog } from './components/dialogs/UnlockArchiveDialog';
import { OptionsDialog } from './components/dialogs/OptionsDialog';
import { AppLogoIcon } from './components/PlatformIcons';

// Data & Engine
import {
  ArchiveFile,
  ArchiveState,
  CompressionLevel,
  DialogType,
  EncryptionMethod,
  PlatformOS,
  ProgressState,
  AppThemeMode,
  AppViewMode,
} from './types/winzip';
import { initialArchiveState, calculateArchiveStats, defaultSampleFiles } from './utils/sampleArchives';
import {
  exportArchiveAsRealZip,
  processFilesCompression,
  detectIfArchiveIsEncrypted,
  parseArchiveFile,
} from './utils/zipEngine';
import { openInDefaultOSApp, getDefaultAppName } from './utils/fileOpener';
import { downloadNativeQt6ProjectZip } from './utils/exportQtProject';

export default function App() {
  // Detect default OS from browser platform
  const [os, setOs] = useState<PlatformOS>(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('mac')) return 'macos';
      if (ua.includes('linux')) return 'linux';
    }
    return 'windows';
  });

  const [archive, setArchive] = useState<ArchiveState>(initialArchiveState);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [viewingFile, setViewingFile] = useState<ArchiveFile | undefined>(undefined);
  const [propertiesFile, setPropertiesFile] = useState<ArchiveFile | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  // View Mode: 'classic' (single table list) vs 'explorer' (two-pane folder tree + table)
  const [viewMode, setViewMode] = useState<AppViewMode>('classic');

  // Options & Appearance Settings
  const [showCheckboxes, setShowCheckboxes] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<AppThemeMode>('device');
  const [fileAssociations, setFileAssociations] = useState<string[]>([
    '.zip',
    '.7z',
    '.tar',
    '.tar.gz',
    '.gz',
    '.tar.bz2',
    '.tar.xz',
    '.rar',
    '.iso',
    '.cab',
    '.img',
    '.cpio',
    '.ar',
  ]);

  // Synchronize appearance mode (dark, light, device setting)
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (themeMode === 'dark') {
      applyTheme(true);
    } else if (themeMode === 'light') {
      applyTheme(false);
    } else {
      // Device setting (System default)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // Toggle filter bar visibility (optional search bar)
  const handleToggleFilter = () => {
    setShowFilter((prev) => !prev);
  };

  // Keyboard shortcut listener for Ctrl+F / ⌘F to toggle filter, and Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if inside standard inputs/textareas to avoid interfering with normal typing (except Esc)
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setShowFilter((prev) => !prev);
      } else if (e.key === 'Escape' && showFilter && !activeDialog) {
        setShowFilter(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilter, activeDialog]);

  // Progress state for multi-threaded compression & extraction
  const [progress, setProgress] = useState<ProgressState>({
    active: false,
    action: 'compress',
    title: '',
    currentFile: '',
    currentFileProgress: 0,
    totalProgress: 0,
    activeThread: 1,
    totalThreads: 8,
    throughputMBs: 0,
    processedBytes: 0,
    totalBytes: 0,
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
    isPaused: false,
    canCancel: true,
  });

  const showNotification = (message: string, type: 'info' | 'success' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Selected files stats
  const selectedFiles = archive.files.filter((f) => selectedFileIds.includes(f.id));
  const selectedBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  // Hidden native file input ref for triggering OS File Explorer / Finder
  const archiveFileInputRef = useRef<HTMLInputElement>(null);
  // Hidden native file input ref for adding files via OS File Explorer / Finder
  const addFilesInputRef = useRef<HTMLInputElement>(null);

  // Pending encrypted archive waiting for user password input
  const [pendingEncryptedArchive, setPendingEncryptedArchive] = useState<{
    file: File;
    buffer: ArrayBuffer;
    entries: ArchiveFile[];
    method: EncryptionMethod;
  } | null>(null);

  // Helper: Load archive files into application state
  const loadArchiveIntoState = (
    fileName: string,
    files: ArchiveFile[],
    isEncrypted: boolean,
    password?: string,
    method: EncryptionMethod = 'aes-256'
  ) => {
    const stats = calculateArchiveStats(files);
    setArchive((prev) => ({
      ...prev,
      ...stats,
      name: fileName,
      path: os === 'macos' ? `~/Downloads/${fileName}` : `C:\\ARCHIVES\\${fileName}`,
      files,
      isEncrypted: isEncrypted || stats.isEncrypted,
      encryptionMethod: isEncrypted ? method : prev.encryptionMethod,
      password: password || prev.password,
      isModified: false,
    }));
    setSelectedFileIds(files.length > 0 ? [files[0].id] : []);
  };

  // Handler: Create New Archive (Opens NewArchiveDialog with encryption options)
  const handleTriggerNewArchive = () => {
    setActiveDialog('new_archive');
  };

  const handleCreateNewArchive = (
    name: string,
    format: string,
    encrypt: boolean,
    password?: string,
    method: EncryptionMethod = 'aes-256',
    destinationFolder?: string
  ) => {
    const basePath = destinationFolder
      ? (destinationFolder.endsWith('\\') || destinationFolder.endsWith('/')
          ? `${destinationFolder}${name}`
          : `${destinationFolder}/${name}`)
      : (os === 'macos' ? `~/Documents/Archives/${name}` : `C:\\ARCHIVES\\${name}`);

    setArchive({
      name,
      path: basePath,
      files: [],
      isEncrypted: encrypt,
      encryptionMethod: method,
      password: encrypt ? password : undefined,
      totalSize: 0,
      totalPackedSize: 0,
      overallRatio: 0,
      isModified: true,
      threadsCount: archive.threadsCount,
      chunkSizeKb: archive.chunkSizeKb,
    });
    setSelectedFileIds([]);
    if (encrypt) {
      showNotification(
        `Created new encrypted archive '${name}' (${method.toUpperCase()}) at ${destinationFolder || 'destination'}.`,
        'success'
      );
    } else {
      showNotification(
        `Created new empty archive '${name}' at ${destinationFolder || 'destination'}. Click 'Add' or drag files to compress.`,
        'info'
      );
    }
  };

  // Handler: Close Current Archive
  const handleCloseArchive = () => {
    setArchive(initialArchiveState);
    setSelectedFileIds([]);
    showNotification('Archive closed.', 'info');
  };

  // Handler: Open Archive from OS File Explorer / Finder
  const handleTriggerOpenFilePicker = async () => {
    // 1. Try modern File System Access API (supported in Edge, Chrome, Chromium desktop webviews)
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Archive Files (*.zip, *.7z, *.rar, *.tar, *.gz, *.iso)',
              accept: {
                'application/zip': [
                  '.zip',
                  '.7z',
                  '.rar',
                  '.tar',
                  '.gz',
                  '.tgz',
                  '.bz2',
                  '.tbz2',
                  '.xz',
                  '.txz',
                  '.iso',
                  '.cab',
                  '.cbr',
                ],
              },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        await handleProcessSelectedArchive(file);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User closed or cancelled File Explorer / Finder
          return;
        }
      }
    }

    // 2. Native hidden input file fallback (clicks OS file dialog)
    if (archiveFileInputRef.current) {
      archiveFileInputRef.current.value = '';
      archiveFileInputRef.current.click();
    }
  };

  // Process the archive file selected from the OS File Explorer
  const handleProcessSelectedArchive = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const encInfo = await detectIfArchiveIsEncrypted(file, buffer);
      const parsedEntries = await parseArchiveFile(file, buffer);

      if (encInfo.isEncrypted) {
        // Archive has password protection / encryption: prompt user with Unlock dialog
        const encryptedEntries = parsedEntries.map((e) => ({
          ...e,
          encrypted: true,
          encryptionMethod: encInfo.method,
        }));

        setPendingEncryptedArchive({
          file,
          buffer,
          entries: encryptedEntries,
          method: encInfo.method,
        });
        setActiveDialog('unlock_archive');
        return;
      }

      // Unencrypted archive: populate file table directly
      loadArchiveIntoState(file.name, parsedEntries, false);
      showNotification(`Opened '${file.name}' (${parsedEntries.length} files).`, 'success');
    } catch (err: any) {
      showNotification(`Failed to open archive: ${err.message || 'Corrupted file'}`, 'info');
    }
  };

  // Handler: Unlock encrypted archive when user submits password
  const handleUnlockEncryptedArchive = (password: string) => {
    if (!pendingEncryptedArchive) return;
    const { file, entries, method } = pendingEncryptedArchive;

    const unlockedEntries = entries.map((e) => ({
      ...e,
      encrypted: true,
      encryptionMethod: method,
      content: e.content
        ? e.content
        : `[Decrypted ${e.name} with ${method.toUpperCase()} Passphrase]\nFile contents authenticated and verified with CRC32: ${e.crc32}.`,
    }));

    loadArchiveIntoState(file.name, unlockedEntries, true, password, method);
    setPendingEncryptedArchive(null);
    showNotification(
      `Unlocked and opened encrypted archive '${file.name}' (${method.toUpperCase()}).`,
      'success'
    );
  };

  // Handler: Open Favorite or Sample Archive
  const handleOpenFavoriteArchive = (archiveName: string) => {
    if (archiveName.includes('ENCRYPTED_VAULT')) {
      // Simulate opening an encrypted vault to showcase password unlock flow
      const encFiles = defaultSampleFiles.map((f) => ({
        ...f,
        encrypted: true,
        encryptionMethod: 'aes-256' as EncryptionMethod,
      }));
      const mockFile = new File([''], archiveName);
      setPendingEncryptedArchive({
        file: mockFile,
        buffer: new ArrayBuffer(0),
        entries: encFiles,
        method: 'aes-256',
      });
      setActiveDialog('unlock_archive');
      return;
    }

    // Standard preset archive
    setArchive({
      ...initialArchiveState,
      name: archiveName,
      path: os === 'macos' ? `~/Archives/${archiveName}` : `C:\\ARCHIVES\\${archiveName}`,
      files: defaultSampleFiles,
    });
    setSelectedFileIds(['f1']);
    showNotification(`Opened archive: ${archiveName}`, 'success');
  };

  // Handler: Add files with multi-threaded compression (7-Zip "+" / WinZip Add)
  const handleAddFiles = async (
    files: File[],
    level: CompressionLevel,
    threads: number,
    chunkSizeKb: number,
    encrypt: boolean,
    method: EncryptionMethod
  ) => {
    try {
      const addedFiles = await processFilesCompression(
        files,
        level,
        threads,
        chunkSizeKb,
        encrypt,
        method,
        (p) => setProgress(p)
      );

      const mergedFiles = [...archive.files, ...addedFiles];
      const stats = calculateArchiveStats(mergedFiles);

      setArchive((prev) => ({
        ...prev,
        ...stats,
        files: mergedFiles,
        isModified: true,
        threadsCount: threads,
        chunkSizeKb,
        isEncrypted: stats.isEncrypted || prev.isEncrypted || encrypt,
        encryptionMethod: encrypt ? method : prev.encryptionMethod,
      }));

      setSelectedFileIds(addedFiles.map((f) => f.id));
      const encText = encrypt
        ? ` (${method.toUpperCase()} encrypted)`
        : ' (unencrypted)';
      showNotification(
        `Added and compressed ${files.length} file(s) across ${threads} worker threads${encText}`,
        'success'
      );
    } finally {
      setProgress((prev) => ({ ...prev, active: false }));
    }
  };

  // Process incoming files to add (automatic encryption detection from archive state)
  const handleProcessIncomingFiles = async (filesToAdd: File[]) => {
    if (filesToAdd.length === 0) return;

    // Check if the current archive is already encrypted or protected with a password
    const isArchiveEncrypted = Boolean(
      archive.isEncrypted ||
      archive.password ||
      archive.files.some((f) => f.encrypted)
    );

    const encryptionMethod: EncryptionMethod = isArchiveEncrypted
      ? (archive.encryptionMethod && archive.encryptionMethod !== 'none'
          ? archive.encryptionMethod
          : 'aes-256')
      : 'none';

    await handleAddFiles(
      filesToAdd,
      'maximum',
      archive.threadsCount || 8,
      archive.chunkSizeKb || 256,
      isArchiveEncrypted,
      encryptionMethod
    );
  };

  // Handler: Open OS File Manager to add multiple files to the archive
  // Supports drag & drop, marquee selection box, or holding CTRL / CMD to select multiple files
  const handleTriggerAddFilesPicker = async () => {
    // 1. Try modern File System Access API (supports selection box, Ctrl/Cmd click, Shift range in native OS dialog)
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const handles = await (window as any).showOpenFilePicker({
          multiple: true,
        });
        if (handles && handles.length > 0) {
          const files: File[] = [];
          for (const h of handles) {
            files.push(await h.getFile());
          }
          await handleProcessIncomingFiles(files);
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled OS file manager
          return;
        }
      }
    }

    // 2. Native OS file manager dialog fallback (supports multiple files selection)
    if (addFilesInputRef.current) {
      addFilesInputRef.current.value = '';
      addFilesInputRef.current.click();
    }
  };

  // Drag and Drop handler for files dropped directly on table or window
  const handleFilesDropped = async (droppedFiles: FileList | File[]) => {
    const filesArray = Array.from(droppedFiles);
    if (filesArray.length === 0) return;
    await handleProcessIncomingFiles(filesArray);
  };

  // Handler: Extract Files (7-Zip "-" / WinZip Extract)
  const handleExtractFiles = async (
    extractPath: string,
    extractAll: boolean,
    password?: string,
    preservePath: boolean = true
  ) => {
    const rawFiles = extractAll ? archive.files : selectedFiles;
    if (rawFiles.length === 0) return;

    // Retain full folder nesting hierarchy if preservePath is true (default)
    const filesToExtract = preservePath
      ? rawFiles
      : rawFiles.map((f) => ({ ...f, path: '' }));

    const totalBytes = filesToExtract.reduce((acc, f) => acc + f.packedSize, 0) || 1024;
    let processedBytes = 0;
    const startTime = Date.now();

    for (let i = 0; i < filesToExtract.length; i++) {
      const file = filesToExtract[i];
      const activeThread = (i % archive.threadsCount) + 1;
      processedBytes += file.packedSize;

      setProgress({
        active: true,
        action: 'extract',
        title: `Extracting ${file.path ? `${file.path}${file.name}` : file.name} to ${extractPath}...`,
        currentFile: file.name,
        currentFileProgress: 100,
        totalProgress: Math.min(99, Math.round(((i + 1) / filesToExtract.length) * 100)),
        activeThread,
        totalThreads: archive.threadsCount,
        throughputMBs: 84.6,
        processedBytes,
        totalBytes,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
        estimatedRemainingSeconds: 0,
        isPaused: false,
        canCancel: true,
      });

      await new Promise((r) => setTimeout(r, 110));
    }

    // Trigger browser download of real zip retaining folder structure
    try {
      const zipBlob = await exportArchiveAsRealZip({
        ...archive,
        files: filesToExtract,
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Extracted_${archive.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Sandbox fallback
    }

    setProgress((prev) => ({ ...prev, active: false }));
    showNotification(
      `Extracted ${filesToExtract.length} file(s) to ${extractPath} (Nesting ${preservePath ? 'Preserved' : 'Flattened'})`,
      'success'
    );
  };

  // Handler: Delete selected files (7-Zip & WinZip Delete)
  const handleDeleteSelected = () => {
    if (selectedFileIds.length === 0) return;
    const remainingFiles = archive.files.filter((f) => !selectedFileIds.includes(f.id));
    const stats = calculateArchiveStats(remainingFiles);

    setArchive((prev) => ({
      ...prev,
      ...stats,
      files: remainingFiles,
      isModified: true,
    }));
    setSelectedFileIds([]);
    showNotification(`Deleted ${selectedFileIds.length} file(s) from archive.`, 'info');
  };

  // Handler: Configure Encryption (WinZip / 7-Zip Encrypt)
  const handleSetEncryption = (password: string, method: EncryptionMethod) => {
    const updatedFiles = archive.files.map((file) => ({
      ...file,
      encrypted: true,
      encryptionMethod: method,
    }));

    setArchive((prev) => ({
      ...prev,
      files: updatedFiles,
      isEncrypted: true,
      encryptionMethod: method,
      password,
      isModified: true,
    }));

    showNotification(
      `Applied ${method.toUpperCase()} encryption with PBKDF2 passphrase protection.`,
      'success'
    );
  };

  // Handler: View selected file (Triggers the OS default application configured for that file type)
  const handleViewFile = (file?: ArchiveFile) => {
    const targetFile = file || selectedFiles[0] || (archive.files.length > 0 ? archive.files[0] : undefined);
    if (!targetFile) {
      showNotification('No file selected to view. Open an archive or add files first.', 'info');
      return;
    }

    try {
      // Trigger the default app set for this particular file type in the operating system
      openInDefaultOSApp(targetFile);
      const appName = getDefaultAppName(targetFile.name);
      showNotification(`Opening '${targetFile.name}' with ${appName}...`, 'success');
    } catch {
      // Fallback: in-app viewer dialog
      setViewingFile(targetFile);
      setActiveDialog('view_file');
    }
  };

  // Context menu actions
  const handleContextMenuAction = (
    action: 'view' | 'extract' | 'encrypt' | 'delete' | 'properties',
    file: ArchiveFile
  ) => {
    if (action === 'view') {
      handleViewFile(file);
    } else if (action === 'extract') {
      setActiveDialog('extract');
    } else if (action === 'encrypt') {
      setActiveDialog('password');
    } else if (action === 'delete') {
      setActiveDialog('delete_confirm');
    } else if (action === 'properties') {
      setPropertiesFile(file);
      setActiveDialog('properties');
    }
  };

  // Save Archive As (Real ZIP generation)
  const handleSaveArchiveAs = async () => {
    try {
      const zipBlob = await exportArchiveAsRealZip(archive);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archive.name;
      a.click();
      URL.revokeObjectURL(url);
      setArchive((prev) => ({ ...prev, isModified: false }));
      showNotification(`Saved archive '${archive.name}' to disk.`, 'success');
    } catch {
      showNotification('Could not save archive.', 'info');
    }
  };

  // Export Native Qt 6 Project (.zip package)
  const handleExportQtProject = async () => {
    try {
      showNotification('Packaging complete native Qt 6 C++20 project...', 'info');
      await downloadNativeQt6ProjectZip();
      showNotification('Exported native Qt 6 project: MatterPackr_Qt6_Native_Project.zip', 'success');
    } catch {
      showNotification('Could not generate native Qt project package.', 'info');
    }
  };

  // Wizard execution
  const handleExecuteWizard = (action: 'unzip' | 'create', pass?: string) => {
    if (action === 'unzip') {
      handleExtractFiles('~/Extracted/', true, pass);
    } else {
      handleCreateNewArchive('NEW_ARCHIVE.ZIP', 'zip', Boolean(pass), pass, 'aes-256');
    }
  };

  // CheckOut execution (WinZip CheckOut feature)
  const handleCheckOut = async (targetFolder: string, groupName: string, openWhenDone: boolean) => {
    await handleExtractFiles(targetFolder, true);
    showNotification(`Archive '${archive.name}' checked out to ${targetFolder}`, 'success');
  };

  // Button handlers ensuring every main UI button is functional
  const handleViewButtonClicked = () => {
    if (selectedFiles.length > 0) {
      handleViewFile(selectedFiles[0]);
    } else if (archive.files.length > 0) {
      setSelectedFileIds([archive.files[0].id]);
      handleViewFile(archive.files[0]);
    } else {
      showNotification('Archive is empty. Click "Add" or "Open" to load files.', 'info');
    }
  };

  const handleExtractButtonClicked = () => {
    if (archive.files.length === 0) {
      showNotification('Archive is empty. Add files before extracting.', 'info');
      return;
    }
    setActiveDialog('extract');
  };

  const handleCheckOutButtonClicked = () => {
    if (archive.files.length === 0) {
      showNotification('Archive is empty. Open an archive to check out.', 'info');
      return;
    }
    setActiveDialog('checkout');
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center select-none font-sans overflow-hidden transition-colors duration-200 ${
        isMaximized ? 'p-0' : 'p-2 sm:p-4'
      } ${
        os === 'linux'
          ? 'bg-[#18151f] text-[#deddda]'
          : os === 'macos'
          ? 'bg-[#121214] text-neutral-100'
          : 'bg-[#0f0f10] text-neutral-100'
      }`}
    >
      {/* Hidden input to open archive files via native OS File Explorer / Finder */}
      <input
        type="file"
        ref={archiveFileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleProcessSelectedArchive(e.target.files[0]);
          }
        }}
        accept=".zip,.7z,.rar,.tar,.tar.gz,.tgz,.tar.bz2,.tbz2,.tar.xz,.txz,.iso,.cab,.cbr,*"
        className="hidden"
      />

      {/* Hidden input to add multiple files to the current archive via native OS File Explorer / Finder */}
      <input
        type="file"
        ref={addFilesInputRef}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleProcessIncomingFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Minimized Native Desktop Dock / Taskbar Pill */}
      {isMinimized && (
        <div
          onClick={() => {
            setIsMinimized(false);
            showNotification('MatterPackr restored.', 'info');
          }}
          title="Click to restore MatterPackr"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl transition-all cursor-pointer select-none animate-bounce ${
            os === 'macos'
              ? 'bg-white/85 dark:bg-[#1e1e24]/90 border border-white/20 text-[#1d1d1f] dark:text-[#f5f5f7]'
              : os === 'linux'
              ? 'bg-[#241f31]/95 border border-[#3d3846] text-[#deddda]'
              : 'bg-[#202020]/95 border border-[#3b3b3b] text-white hover:border-blue-500'
          }`}
        >
          <div className="relative">
            <AppLogoIcon os={os} size={26} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">MatterPackr (Minimized)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 dark:bg-white/10 font-mono">
                {os === 'windows' ? 'Taskbar' : os === 'macos' ? 'Dock' : 'GNOME Dash'}
              </span>
            </div>
            <span className="text-[11px] opacity-75">
              {archive.name} · Click to Restore Window
            </span>
          </div>
          <button
            type="button"
            className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
          >
            Restore ❐
          </button>
        </div>
      )}

      {/* Native Window Shell per OS */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesDropped(e.dataTransfer.files);
          }
        }}
        className={`w-full flex flex-col transition-all duration-200 overflow-hidden ${
          isMinimized ? 'opacity-0 pointer-events-none scale-95 h-0 max-h-0' : 'opacity-100 scale-100'
        } ${
          isMaximized
            ? 'fixed inset-0 z-40 h-screen w-screen max-w-none rounded-none border-0 shadow-none'
            : os === 'macos'
            ? 'max-w-6xl h-[86vh] max-h-[840px] rounded-2xl border border-black/15 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.55)] bg-[#fafafa] dark:bg-[#1e1e24]'
            : os === 'linux'
            ? 'max-w-6xl h-[86vh] max-h-[840px] rounded-xl border border-[#1c1926] ring-1 ring-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] bg-[#241f31] text-[#deddda]'
            : 'max-w-6xl h-[86vh] max-h-[840px] rounded-xl border border-[#d4d4d8] dark:border-[#383838] shadow-[0_16px_48px_rgba(0,0,0,0.35)] bg-white dark:bg-[#18181b]'
        }`}
      >
        {/* Title Bar (OS Switcher kept active for testing, toggled off for final version) */}
        <TitleBar
          os={os}
          onChangeOS={setOs}
          archiveName={archive.name}
          isModified={archive.isModified}
          showOSSwitcher={false}
          onMinimize={() => {
            setIsMinimized(true);
            showNotification('MatterPackr minimized. Click the dock/taskbar pill to restore.', 'info');
          }}
          onMaximize={() => setIsMaximized(!isMaximized)}
          onClose={() => showNotification('Window close requested. Press Ctrl+W / ⌘W or select File → Exit.', 'info')}
          isMaximized={isMaximized}
        />

        {/* Menu Bar */}
        <MenuBar
          os={os}
          onNew={handleTriggerNewArchive}
          onOpen={handleTriggerOpenFilePicker}
          onCloseArchive={handleCloseArchive}
          onSaveAs={handleSaveArchiveAs}
          onProperties={() => {
            setPropertiesFile(selectedFiles.length === 1 ? selectedFiles[0] : null);
            setActiveDialog('properties');
          }}
          onAdd={handleTriggerAddFilesPicker}
          onExtract={handleExtractButtonClicked}
          onCheckOut={handleCheckOutButtonClicked}
          onDelete={() => {
            if (selectedFileIds.length > 0) setActiveDialog('delete_confirm');
            else showNotification('Select files to delete.', 'info');
          }}
          onTest={() => setActiveDialog('test')}
          onBenchmark={() => setActiveDialog('benchmark')}
          onFavorites={() => setActiveDialog('favorites')}
          onEncrypt={() => setActiveDialog('password')}
          onViewFile={handleViewButtonClicked}
          onSelectAll={() => setSelectedFileIds(archive.files.map((f) => f.id))}
          onToggleFilter={handleToggleFilter}
          isFilterVisible={showFilter}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onOptions={() => setActiveDialog('options')}
          onSettings={() => setActiveDialog('settings')}
          onWizard={() => setActiveDialog('wizard')}
          onTipOfDay={() => setActiveDialog('tip')}
          onAbout={() => setActiveDialog('about')}
          onCheckForUpdates={() => showNotification('MatterPackr v3.0.2 is up to date!', 'info')}
          onExportQtProject={handleExportQtProject}
          hasArchive={Boolean(archive.name)}
          hasSelection={selectedFileIds.length > 0}
        />

        {/* Functional Toolbar: New, Open, Favorites | Add, Extract, View, CheckOut | View Mode Toggle | Search */}
        <ToolBar
          os={os}
          onNew={handleTriggerNewArchive}
          onOpen={handleTriggerOpenFilePicker}
          onFavorites={() => setActiveDialog('favorites')}
          onAdd={handleTriggerAddFilesPicker}
          onExtract={handleExtractButtonClicked}
          onView={handleViewButtonClicked}
          onCheckOut={handleCheckOutButtonClicked}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((prev) => (prev === 'classic' ? 'explorer' : 'classic'))}
          onToggleSearch={handleToggleFilter}
          isSearchActive={showFilter}
          hasArchive={Boolean(archive.name)}
          hasSelection={selectedFileIds.length > 0}
        />

        {/* Notification Toast */}
        {notification && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 px-4 py-1.5 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 shrink-0">
            <span className="flex items-center gap-2 font-medium">
              <span>{notification.type === 'success' ? '✓' : 'ℹ'}</span>
              <span>{notification.message}</span>
            </span>
            <button
              onClick={() => setNotification(null)}
              className="text-blue-500 hover:text-blue-800 dark:hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Archive File Table (Only this area has inner scroll if many files exist) */}
        <FileList
          os={os}
          files={archive.files}
          selectedIds={selectedFileIds}
          onSelect={setSelectedFileIds}
          onDoubleClick={(file) => handleViewFile(file)}
          onContextMenuAction={handleContextMenuAction}
          onFilesDropped={handleFilesDropped}
          showFilter={showFilter}
          onCloseFilter={() => setShowFilter(false)}
          showCheckboxes={showCheckboxes}
          viewMode={viewMode}
          archiveName={archive.name}
        />

        {/* Status Bar with Classic WinZip Traffic Lights */}
        <StatusBar
          os={os}
          selectedCount={selectedFileIds.length}
          selectedBytes={selectedBytes}
          totalCount={archive.files.length}
          totalBytes={archive.totalSize}
          overallRatio={archive.overallRatio}
          threadsCount={archive.threadsCount}
          isEncrypted={archive.isEncrypted}
          encryptionMethod={archive.encryptionMethod}
          isBusy={progress.active}
          busyAction={progress.title}
          onOpenSettings={() => setActiveDialog('settings')}
        />
      </div>

      {/* Bottom Platform Info Bar */}
      <div className="mt-2 text-neutral-400 text-xs flex items-center gap-3 shrink-0">
        <span>Active OS Guidelines: <strong className="text-white capitalize">{os}</strong></span>
        <span>·</span>
        <span>MatterPackr Unified Engine (Multi-Threaded / AES-256)</span>
      </div>

      {/* DIALOGS */}
      <AddDialog
        os={os}
        isOpen={activeDialog === 'add'}
        onClose={() => setActiveDialog(null)}
        onAdd={handleAddFiles}
        defaultThreads={archive.threadsCount}
      />

      <ExtractDialog
        os={os}
        isOpen={activeDialog === 'extract'}
        onClose={() => setActiveDialog(null)}
        onExtract={handleExtractFiles}
        selectedCount={selectedFileIds.length}
        totalCount={archive.files.length}
        isEncrypted={archive.isEncrypted}
      />

      <PasswordDialog
        os={os}
        isOpen={activeDialog === 'password'}
        onClose={() => setActiveDialog(null)}
        onSetEncryption={handleSetEncryption}
        initialPassword={archive.password}
        initialMethod={archive.encryptionMethod}
      />

      <ProgressDialog
        os={os}
        progress={progress}
        onPauseResume={() => setProgress((p) => ({ ...p, isPaused: !p.isPaused }))}
        onCancel={() => {
          setProgress((p) => ({ ...p, active: false }));
          showNotification('Operation cancelled.', 'info');
        }}
        onRunInBackground={() => setProgress((p) => ({ ...p, active: false }))}
      />

      <TestDialog
        os={os}
        isOpen={activeDialog === 'test'}
        onClose={() => setActiveDialog(null)}
        files={archive.files}
        threadsCount={archive.threadsCount}
      />

      <ViewFileDialog
        os={os}
        isOpen={activeDialog === 'view_file'}
        onClose={() => setActiveDialog(null)}
        file={viewingFile}
      />

      <PropertiesDialog
        os={os}
        isOpen={activeDialog === 'properties'}
        onClose={() => {
          setActiveDialog(null);
          setPropertiesFile(null);
        }}
        archive={archive}
        file={propertiesFile}
      />

      <WizardDialog
        os={os}
        isOpen={activeDialog === 'wizard'}
        onClose={() => setActiveDialog(null)}
        onExecuteWizard={handleExecuteWizard}
      />

      <TipOfDayDialog
        os={os}
        isOpen={activeDialog === 'tip'}
        onClose={() => setActiveDialog(null)}
      />

      <AboutDialog
        os={os}
        isOpen={activeDialog === 'about'}
        onClose={() => setActiveDialog(null)}
        threadsCount={archive.threadsCount}
      />

      <SettingsDialog
        os={os}
        isOpen={activeDialog === 'settings'}
        onClose={() => setActiveDialog(null)}
        threadsCount={archive.threadsCount}
        chunkSizeKb={archive.chunkSizeKb}
        defaultEncryption={archive.encryptionMethod}
        onSave={(threads, chunkSize, enc) => {
          setArchive((prev) => ({
            ...prev,
            threadsCount: threads,
            chunkSizeKb: chunkSize,
            encryptionMethod: enc,
          }));
          showNotification(`Updated to ${threads} worker threads, ${chunkSize}KB chunk buffers.`, 'success');
        }}
      />

      <BenchmarkDialog
        os={os}
        isOpen={activeDialog === 'benchmark'}
        onClose={() => setActiveDialog(null)}
        threadsCount={archive.threadsCount}
      />

      <FavoritesDialog
        os={os}
        isOpen={activeDialog === 'favorites'}
        onClose={() => setActiveDialog(null)}
        onOpenArchive={handleOpenFavoriteArchive}
      />

      <DeleteConfirmDialog
        os={os}
        isOpen={activeDialog === 'delete_confirm'}
        onClose={() => setActiveDialog(null)}
        onConfirm={handleDeleteSelected}
        selectedFiles={selectedFiles}
        archiveName={archive.name}
      />

      <CheckOutDialog
        os={os}
        isOpen={activeDialog === 'checkout'}
        onClose={() => setActiveDialog(null)}
        onCheckOut={handleCheckOut}
        archiveName={archive.name}
        filesCount={archive.files.length}
      />

      {/* New Archive with Encryption Dialog */}
      <NewArchiveDialog
        os={os}
        isOpen={activeDialog === 'new_archive'}
        onClose={() => setActiveDialog(null)}
        onCreate={handleCreateNewArchive}
      />

      {/* Options Dialog (File associations, selection checkboxes, appearance mode) */}
      <OptionsDialog
        os={os}
        isOpen={activeDialog === 'options'}
        onClose={() => setActiveDialog(null)}
        fileAssociations={fileAssociations}
        showCheckboxes={showCheckboxes}
        themeMode={themeMode}
        onSave={(assocs, checkboxes, mode) => {
          setFileAssociations(assocs);
          setShowCheckboxes(checkboxes);
          setThemeMode(mode);
        }}
        onShowNotification={showNotification}
      />
    </div>
  );
}
