export type EncryptionMethod = 'aes-256' | 'aes-128' | 'zip20' | 'none';
export type CompressionLevel = 'maximum' | 'normal' | 'fast' | 'superfast' | 'none';
export type PlatformOS = 'windows' | 'macos' | 'linux';

export interface ArchiveFile {
  id: string;
  name: string;
  path: string;
  size: number; // in bytes
  packedSize: number; // in bytes
  ratio: number; // percentage saved, e.g. 54%
  date: string; // MM/DD/YYYY
  time: string; // HH:MM AM/PM
  crc32: string; // 8-char hex
  encrypted: boolean;
  encryptionMethod?: EncryptionMethod;
  type: string;
  content?: string | Uint8Array;
  mimeType?: string;
  isDirectory?: boolean;
}

export interface ArchiveState {
  name: string;
  path: string;
  files: ArchiveFile[];
  isEncrypted: boolean;
  encryptionMethod: EncryptionMethod;
  password?: string;
  totalSize: number;
  totalPackedSize: number;
  overallRatio: number;
  isModified: boolean;
  threadsCount: number;
  chunkSizeKb: number;
}

export interface CompressionSettings {
  level: CompressionLevel;
  threads: number;
  chunkSizeKb: number;
  encrypt: boolean;
  encryptionMethod: EncryptionMethod;
  password?: string;
  storePathInfo: boolean;
  includeSubfolders: boolean;
}

export interface ProgressState {
  active: boolean;
  action: 'compress' | 'extract' | 'test' | 'encrypt' | 'decrypt';
  title: string;
  currentFile: string;
  currentFileProgress: number; // 0 - 100
  totalProgress: number; // 0 - 100
  activeThread: number;
  totalThreads: number;
  throughputMBs: number;
  processedBytes: number;
  totalBytes: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  isPaused: boolean;
  canCancel: boolean;
}

export type AppThemeMode = 'device' | 'light' | 'dark';
export type AppViewMode = 'classic' | 'explorer';

export type DialogType =
  | 'add'
  | 'extract'
  | 'password'
  | 'test'
  | 'properties'
  | 'wizard'
  | 'about'
  | 'tip'
  | 'view_file'
  | 'settings'
  | 'options'
  | 'benchmark'
  | 'favorites'
  | 'checkout'
  | 'delete_confirm'
  | 'new_archive'
  | 'unlock_archive'
  | null;
