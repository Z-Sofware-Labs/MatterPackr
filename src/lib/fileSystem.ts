import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export type Compression = 'Fast' | 'Normal' | 'Maximum';
export type ArchiveType = 'zip' | '7z' | 'tar' | 'tar.gz' | 'gz';

export type ArchiveFormatInfo = {
  id: string;
  label: string;
  extensions: string[];
  canCreate: boolean;
  canAdd: boolean;
  canRemove: boolean;
  canExtract: boolean;
  canTest: boolean;
  canEncrypt: boolean;
  canView: boolean;
  passwordSupport: boolean;
  singleFileOnly: boolean;
  implemented: boolean;
};

export type ArchiveEntry = {
  name: string;
  kind: string;
  size: number;
  compressedSize: number;
  modified?: string;
  isDir: boolean;
};

export type ArchiveCapabilities = {
  format: string;
  canCreate: boolean;
  canAdd: boolean;
  canRemove: boolean;
  canExtract: boolean;
  canTest: boolean;
  canEncrypt: boolean;
  canView: boolean;
  passwordSupport: boolean;
};

const archiveExtensions = ['zip', '7z', 'tar', 'gz', 'bz2', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'tgz', 'tbz2', 'txz', 'rar', 'cab', 'iso', 'img', 'cpio', 'ar'];

export async function chooseInputFiles(): Promise<string[]> {
  const selected = await open({ multiple: true, directory: false, title: 'Choose files to add' });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export async function chooseArchive(): Promise<string | null> {
  const selected = await open({ multiple: false, directory: false, title: 'Open archive', filters: [{ name: 'MatterPackr supported files', extensions: archiveExtensions }] });
  return typeof selected === 'string' ? selected : null;
}

export async function chooseExtractionDirectory(defaultPath?: string): Promise<string | null> {
  try {
    const res = await invoke<string | null>('choose_extraction_directory_command', {
      title: 'Choose extraction folder',
      defaultPath: defaultPath || null,
    });
    if (typeof res === 'string' && res.trim().length > 0) {
      return res;
    }
  } catch {
    // Fall back below
  }

  // Cross-platform fallback (Linux, macOS, or when native picker is unavailable)
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Choose extraction folder',
    defaultPath,
  });
  return typeof selected === 'string' ? selected : null;
}

export async function browseForArchivePath(type: ArchiveType = 'zip'): Promise<string | null> {
  const config: Record<ArchiveType, { name: string; extension: string }> = {
    zip: { name: 'ZIP archive', extension: 'zip' },
    '7z': { name: '7-Zip archive', extension: '7z' },
    tar: { name: 'TAR archive', extension: 'tar' },
    'tar.gz': { name: 'GZip TAR archive', extension: 'tar.gz' },
    gz: { name: 'GZip compressed file', extension: 'gz' },
  };
  const selected = await save({
    title: `Create ${config[type].name}`,
    defaultPath: `archive.${config[type].extension}`,
    filters: [{ name: config[type].name, extensions: [config[type].extension] }],
  });
  return selected ?? null;
}

export async function createArchive(outputPath: string, inputPaths: string[], compression: Compression, password?: string): Promise<ArchiveEntry[]> {
  return invoke('create_archive', { request: { outputPath, inputPaths, compression, password: password || null } });
}

export async function getCliOpenPath(): Promise<string | null> {
  return invoke('get_cli_open_path');
}

export async function openArchive(path: string): Promise<ArchiveEntry[]> {
  return invoke('open_archive', { path });
}

export async function getCapabilities(path: string): Promise<ArchiveCapabilities> {
  return invoke('capabilities', { path });
}

export async function getFormatCatalog(): Promise<ArchiveFormatInfo[]> {
  return invoke('format_catalog_command');
}

export async function testArchive(path: string): Promise<void> {
  return invoke('test_archive', { path });
}

export async function addFiles(archivePath: string, inputPaths: string[], compression: Compression, password?: string, targetDir?: string): Promise<ArchiveEntry[]> {
  return invoke('add_files', { archivePath, inputPaths, compression, password: password || null, targetDir: targetDir || null });
}

export type EncryptionStatus = {
  isEncrypted: boolean;
  passwordValid: boolean;
  errorMessage?: string | null;
};

export async function checkArchiveEncryption(archivePath: string, password?: string): Promise<EncryptionStatus> {
  return invoke('check_archive_encryption', { archivePath, password: password || null });
}

export type ConflictMode = 'overwrite' | 'rename' | 'cancel';

export async function checkConflicts(archivePath: string, outputDir: string): Promise<string[]> {
  return invoke('check_conflicts', { archivePath, outputDir });
}

export async function ensureExtractionDestination(archivePath: string, outputDir: string): Promise<string> {
  return invoke<string>('prepare_extraction_destination', { archivePath, outputDir });
}

export async function extractArchive(
  archivePath: string,
  outputDir: string,
  password?: string,
  conflictMode: ConflictMode = 'overwrite',
): Promise<void> {
  return invoke('extract_archive', {
    archivePath,
    outputDir,
    password: password || null,
    conflictMode,
  });
}

export async function removeEntries(archivePath: string, names: string[], compression: Compression, password?: string): Promise<ArchiveEntry[]> {
  return invoke('remove_entries', { archivePath, names, compression, password: password || null });
}

export async function chooseArchiveOrImage(): Promise<string | null> {
  const selected = await open({ multiple: false, directory: false, title: 'Choose archive or disk image', filters: [{ name: 'MatterPackr files', extensions: archiveExtensions }] });
  return typeof selected === 'string' ? selected : null;
}

export async function extractImage(imagePath: string, outputDir: string, conflictMode: ConflictMode = 'overwrite'): Promise<void> {
  return invoke('extract_image', { imagePath, outputDir, conflictMode });
}

export async function viewArchiveEntry(archivePath: string, entryPath: string, password?: string): Promise<void> {
  return invoke('view_archive_entry', { archivePath, entryPath, password: password || null });
}

export async function openExternalUrl(url: string): Promise<void> {
  return invoke('open_external_url', { url });
}

export async function getFileAssociations(): Promise<string[]> {
  return invoke('get_file_associations_command');
}

export async function applyFileAssociations(selectedExtensions: string[]): Promise<void> {
  return invoke('apply_file_associations_command', { selectedExtensions });
}

export async function prepareDragExtraction(
  archivePath: string,
  entryPaths: string[],
  password?: string,
): Promise<string[]> {
  return invoke('prepare_drag_extraction', {
    archivePath,
    entryPaths,
    password: password || null,
  });
}
