import React from 'react';
import { PlatformOS } from '../types/winzip';

export type FileCategory =
  | 'folder'
  | 'cpp'
  | 'code'
  | 'text'
  | 'doc'
  | 'pdf'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'audio'
  | 'video'
  | 'executable'
  | 'library'
  | 'archive'
  | 'config'
  | 'database'
  | 'security'
  | 'generic';

export interface FileTypeIconProps {
  fileName?: string;
  isDirectory?: boolean;
  isEncrypted?: boolean;
  os?: PlatformOS;
  size?: number;
  className?: string;
  category?: FileCategory;
  showLockBadge?: boolean;
}

/**
 * Maps a file name or extension to its semantic file category
 */
export function getFileCategory(fileName: string = '', isDirectory: boolean = false): FileCategory {
  if (isDirectory || fileName.endsWith('/')) {
    return 'folder';
  }

  const cleanName = fileName.trim().toLowerCase();
  const ext = cleanName.includes('.') ? cleanName.split('.').pop() || '' : '';

  if (!ext) {
    return 'generic';
  }

  // C / C++ Source & Headers
  if (['cpp', 'cxx', 'cc', 'c', 'h', 'hpp', 'hxx', 'inl', 'tpp'].includes(ext)) {
    return 'cpp';
  }

  // Code & Scripts
  if ([
    'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
    'py', 'pyw', 'rs', 'go', 'java', 'kt', 'kts', 'scala',
    'cs', 'fs', 'swift', 'rb', 'php',
    'sh', 'bash', 'zsh', 'fish', 'ps1',
    'json', 'json5', 'xml', 'yaml', 'yml', 'toml',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'sql', 'graphql', 'vue', 'svelte',
  ].includes(ext)) {
    return 'code';
  }

  // PDF
  if (ext === 'pdf') {
    return 'pdf';
  }

  // Word / Rich Text
  if (['doc', 'docx', 'odt', 'pages', 'rtf'].includes(ext)) {
    return 'doc';
  }

  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers', 'xlsm'].includes(ext)) {
    return 'spreadsheet';
  }

  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return 'presentation';
  }

  // Text & Logs
  if (['txt', 'log', 'md', 'markdown', 'nfo', 'diz', 'me'].includes(ext)) {
    return 'text';
  }

  // Images
  if (['bmp', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'tiff', 'tif', 'psd', 'ai', 'raw', 'heic', 'avif'].includes(ext)) {
    return 'image';
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'wma', 'mid', 'midi', 'aiff'].includes(ext)) {
    return 'audio';
  }

  // Video
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg'].includes(ext)) {
    return 'video';
  }

  // Executables
  if (['exe', 'app', 'bin', 'msi', 'bat', 'cmd', 'com', 'run', 'out'].includes(ext)) {
    return 'executable';
  }

  // Libraries & Extensions
  if (['dll', 'so', 'dylib', 'lib', 'a', 'sys', 'drv', 'o', 'ko'].includes(ext)) {
    return 'library';
  }

  // Archives (Read & Write: zip, 7z, tar, tar+gz, gz, bz2+tar, xz+tar; Read Only: rar, iso, cab, img, cpio, ar)
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz', 'iso', 'img', 'cab', 'cpio', 'ar', 'deb', 'dmg', 'pkg', 'rpm', 'jar', 'war', 'z'].includes(ext)) {
    return 'archive';
  }

  // Configuration
  if (['ini', 'cfg', 'conf', 'env', 'properties', 'inf', 'reg', 'desktop'].includes(ext)) {
    return 'config';
  }

  // Database / Dat
  if (['dat', 'db', 'sqlite', 'sqlite3', 'mdb', 'accdb', 'dump', 'bak', 'frm', 'ibd'].includes(ext)) {
    return 'database';
  }

  // Security Keys / Certificates
  if (['key', 'pem', 'crt', 'cer', 'pfx', 'p12', 'asc', 'pub', 'sig', 'gpg'].includes(ext)) {
    return 'security';
  }

  return 'generic';
}

/**
 * Returns a human-friendly description for the file type
 */
export function getFriendlyFileTypeName(fileName: string, isDirectory: boolean = false): string {
  if (isDirectory) return 'Folder';
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || '' : '';
  const cat = getFileCategory(fileName, isDirectory);

  switch (cat) {
    case 'cpp':
      return ext === 'H' || ext === 'HPP' ? 'C/C++ Header File' : 'C++ Source File';
    case 'code':
      if (['TS', 'TSX'].includes(ext)) return 'TypeScript Source File';
      if (['JS', 'JSX'].includes(ext)) return 'JavaScript Source File';
      if (ext === 'PY') return 'Python Script';
      if (ext === 'RS') return 'Rust Source File';
      if (ext === 'JSON') return 'JSON Data Document';
      if (ext === 'XML') return 'XML Document';
      return `${ext} Source File`;
    case 'text':
      if (ext === 'MD') return 'Markdown Document';
      if (ext === 'LOG') return 'System Log File';
      return 'Plain Text Document';
    case 'doc':
      return ext.startsWith('DOC') ? 'Microsoft Word Document' : 'Rich Text Document';
    case 'pdf':
      return 'Adobe Acrobat Document (PDF)';
    case 'spreadsheet':
      if (ext === 'CSV') return 'Comma-Separated Values (CSV)';
      return 'Microsoft Excel Spreadsheet';
    case 'presentation':
      return 'Presentation Slides Document';
    case 'image':
      if (ext === 'BMP') return 'Bitmap Image';
      if (ext === 'PNG') return 'Portable Network Graphics (PNG)';
      if (ext === 'JPG' || ext === 'JPEG') return 'JPEG Image';
      if (ext === 'SVG') return 'Scalable Vector Graphics (SVG)';
      return `${ext} Image`;
    case 'audio':
      return `${ext} Audio Stream`;
    case 'video':
      return `${ext} Video File`;
    case 'executable':
      return ext === 'EXE' ? 'Application Executable' : 'Executable Binary';
    case 'library':
      if (ext === 'DLL') return 'Dynamic Link Library';
      if (ext === 'SO') return 'Shared Object Library';
      if (ext === 'DYLIB') return 'Mach-O Dynamic Library';
      return 'System Library File';
    case 'archive':
      if (ext === 'ZIP') return 'Zip Archive Package';
      if (ext === '7Z') return '7-Zip High-Compression Archive';
      if (ext === 'RAR') return 'Roshal Archive (unRAR)';
      if (ext === 'TAR') return 'Tape Archive (TAR)';
      if (ext === 'GZ' || ext === 'TGZ') return 'Gzip Compressed Tarball';
      if (ext === 'BZ2' || ext === 'TBZ2') return 'Bzip2 Compressed Tarball';
      if (ext === 'XZ' || ext === 'TXZ') return 'XZ Compressed Tarball';
      if (ext === 'ISO') return 'Optical Disc Image';
      if (ext === 'IMG') return 'Disk Image Container';
      if (ext === 'CAB') return 'Microsoft Cabinet File';
      if (ext === 'CPIO') return 'Unix CPIO Archive';
      if (ext === 'AR' || ext === 'DEB') return 'Unix Archiver / Debian Package';
      return `${ext} Compressed Archive`;
    case 'config':
      if (ext === 'INI') return 'Configuration Settings (.INI)';
      return 'Configuration File';
    case 'database':
      return ext === 'DAT' ? 'Binary Data / Database Record' : `${ext} Database File`;
    case 'security':
      return ext === 'KEY' ? 'Cryptographic Key Container' : `${ext} Certificate File`;
    default:
      return ext ? `${ext} File` : 'File';
  }
}

// ----------------------------------------------------------------------------
// VECTOR ICON RENDERERS
// ----------------------------------------------------------------------------

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  fileName = '',
  isDirectory = false,
  isEncrypted = false,
  os = 'windows',
  size = 18,
  className = '',
  category,
  showLockBadge = true,
}) => {
  const cat = category || getFileCategory(fileName, isDirectory);

  // Render base icon by category
  let iconGraphic: React.ReactNode = null;

  switch (cat) {
    case 'folder':
      iconGraphic = <FolderIconGraphic os={os} />;
      break;
    case 'cpp':
      iconGraphic = <CppIconGraphic os={os} />;
      break;
    case 'code':
      iconGraphic = <CodeIconGraphic os={os} />;
      break;
    case 'text':
      iconGraphic = <TextIconGraphic os={os} />;
      break;
    case 'doc':
      iconGraphic = <DocIconGraphic os={os} />;
      break;
    case 'pdf':
      iconGraphic = <PdfIconGraphic os={os} />;
      break;
    case 'spreadsheet':
      iconGraphic = <SpreadsheetIconGraphic os={os} />;
      break;
    case 'presentation':
      iconGraphic = <PresentationIconGraphic os={os} />;
      break;
    case 'image':
      iconGraphic = <ImageIconGraphic os={os} />;
      break;
    case 'audio':
      iconGraphic = <AudioIconGraphic os={os} />;
      break;
    case 'video':
      iconGraphic = <VideoIconGraphic os={os} />;
      break;
    case 'executable':
      iconGraphic = <ExecutableIconGraphic os={os} />;
      break;
    case 'library':
      iconGraphic = <LibraryIconGraphic os={os} />;
      break;
    case 'archive':
      iconGraphic = <ArchiveIconGraphic os={os} />;
      break;
    case 'config':
      iconGraphic = <ConfigIconGraphic os={os} />;
      break;
    case 'database':
      iconGraphic = <DatabaseIconGraphic os={os} />;
      break;
    case 'security':
      iconGraphic = <SecurityIconGraphic os={os} />;
      break;
    case 'generic':
    default:
      iconGraphic = <GenericFileIconGraphic os={os} />;
      break;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title={isEncrypted ? `${getFriendlyFileTypeName(fileName, isDirectory)} (AES Encrypted)` : getFriendlyFileTypeName(fileName, isDirectory)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
      >
        {iconGraphic}
      </svg>

      {/* Lock Badge for Encrypted Items */}
      {isEncrypted && showLockBadge && (
        <span
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-amber-500 text-neutral-900 border border-white dark:border-neutral-900 shadow-xs"
          style={{ width: Math.max(10, size * 0.48), height: Math.max(10, size * 0.48) }}
          title="AES-256 Encrypted Entry"
        >
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ width: '70%', height: '70%' }}
          >
            <path
              fillRule="evenodd"
              d="M4 5a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V5zm2 2h4V5a2 2 0 1 0-4 0v2zm2 3a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0v-1a1 1 0 0 0-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// GRAPHIC SUB-COMPONENTS (32x32 ViewBox, Pixel-Aligned)
// ----------------------------------------------------------------------------

/** 1. Folder Icon (OS-Adapted) */
const FolderIconGraphic: React.FC<{ os: PlatformOS }> = ({ os }) => {
  if (os === 'macos') {
    // macOS Aqua Folder
    return (
      <g>
        <defs>
          <linearGradient id="mac_f_back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="mac_f_front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* Back plate with tab */}
        <path d="M3 8 C3 6.3 4.3 5 6 5 L12 5 C13.5 5 14.8 6 15.5 7 L17 9 L26 9 C27.7 9 29 10.3 29 12 L29 24 C29 25.7 27.7 27 26 27 L6 27 C4.3 27 3 25.7 3 24 Z" fill="url(#mac_f_back)" />
        {/* Front flap */}
        <rect x="3" y="11" width="26" height="15" rx="3" fill="url(#mac_f_front)" stroke="#0284c7" strokeWidth="0.5" />
        <rect x="5" y="12" width="22" height="1" fill="#bae6fd" opacity="0.6" />
      </g>
    );
  }

  if (os === 'linux') {
    // Linux GNOME Adwaita Folder
    return (
      <g>
        <path d="M3 6 C3 4.9 3.9 4 5 4 H13 L16 8 H27 C28.1 8 29 8.9 29 10 V25 C29 26.1 28.1 27 27 27 H5 C3.9 27 3 26.1 3 25 Z" fill="#3584e4" />
        <path d="M3 12 H29 V25 C29 26.1 28.1 27 27 27 H5 C3.9 27 3 26.1 3 25 Z" fill="#62a0ea" />
        <line x1="4" y1="12" x2="28" y2="12" stroke="#99c1f1" strokeWidth="1" />
      </g>
    );
  }

  // Windows 11 Fluent Manila Folder
  return (
    <g>
      <defs>
        <linearGradient id="win_f_back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="win_f_front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Back flap */}
      <path d="M4 6.5 C4 5.7 4.7 5 5.5 5 H12.5 L15 8 H26.5 C27.3 8 28 8.7 28 9.5 V24.5 C28 25.3 27.3 26 26.5 26 H5.5 C4.7 26 4 25.3 4 24.5 Z" fill="url(#win_f_back)" />
      {/* Front flap with soft shadow */}
      <path d="M3.5 12 H28.5 V25 C28.5 26.1 27.6 27 26.5 27 H5.5 C4.4 27 3.5 26.1 3.5 25 Z" fill="url(#win_f_front)" stroke="#b45309" strokeWidth="0.5" />
      <line x1="4" y1="13" x2="28" y2="13" stroke="#fef3c7" strokeWidth="0.8" opacity="0.8" />
    </g>
  );
};

/** 2. C / C++ Source File Icon */
const CppIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <defs>
      <linearGradient id="cpp_sheet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0f9ff" />
        <stop offset="100%" stopColor="#e0f2fe" />
      </linearGradient>
    </defs>
    {/* Document sheet with folded corner */}
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="url(#cpp_sheet)" stroke="#0284c7" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.8" strokeLinejoin="round" />
    {/* C++ Emblem Badge */}
    <rect x="9" y="14" width="14" height="12" rx="2" fill="#0369a1" />
    {/* Stylized 'C' and '++' */}
    <path d="M14 18 C13.5 17.4 12.7 17.2 12 17.6 C11.2 18.2 11.2 19.8 12 20.4 C12.7 20.8 13.5 20.6 14 20" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
    {/* First '+' */}
    <path d="M16 19 H18 M17 18 V20" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />
    {/* Second '+' */}
    <path d="M20 19 H22 M21 18 V20" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** 3. General Code / Script File Icon */
const CodeIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <defs>
      <linearGradient id="code_sheet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#faf5ff" />
        <stop offset="100%" stopColor="#f3e8ff" />
      </linearGradient>
    </defs>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="url(#code_sheet)" stroke="#7e22ce" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#e9d5ff" stroke="#7e22ce" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Indigo Code Badge */}
    <rect x="9" y="14" width="14" height="12" rx="2" fill="#6b21a8" />
    {/* Brackets < / > */}
    <path d="M13 18 L11 20 L13 22" stroke="#e9d5ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 18 L21 20 L19 22" stroke="#e9d5ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="17" x2="15" y2="23" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** 4. Plain Text File Icon */
const TextIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <defs>
      <linearGradient id="text_sheet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
    </defs>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="url(#text_sheet)" stroke="#64748b" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Text Lines */}
    <line x1="10" y1="13" x2="22" y2="13" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10" y1="17" x2="22" y2="17" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="21" x2="20" y2="21" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="25" x2="16" y2="25" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
  </g>
);

/** 5. Document / Word Icon */
const DocIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#eff6ff" stroke="#2563eb" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#bfdbfe" stroke="#2563eb" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Blue Word Emblem */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#1d4ed8" />
    <text x="12" y="23" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif">W</text>
  </g>
);

/** 6. PDF Document Icon */
const PdfIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#fff1f2" stroke="#e11d48" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#fecdd3" stroke="#e11d48" strokeWidth="0.8" strokeLinejoin="round" />
    {/* PDF Ruby Ribbon */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#dc2626" />
    <text x="9.5" y="23" fill="#ffffff" fontSize="7" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">PDF</text>
  </g>
);

/** 7. Spreadsheet / Excel / CSV Icon */
const SpreadsheetIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#f0fdf4" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#bbf7d0" stroke="#16a34a" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Emerald Table Emblem */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#15803d" />
    {/* Grid Lines */}
    <line x1="8" y1="18" x2="24" y2="18" stroke="#86efac" strokeWidth="0.8" />
    <line x1="8" y1="22" x2="24" y2="22" stroke="#86efac" strokeWidth="0.8" />
    <line x1="14" y1="14" x2="14" y2="26" stroke="#86efac" strokeWidth="0.8" />
    <line x1="19" y1="14" x2="19" y2="26" stroke="#86efac" strokeWidth="0.8" />
  </g>
);

/** 8. Presentation / Slides Icon */
const PresentationIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#fff7ed" stroke="#ea580c" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#ffedd5" stroke="#ea580c" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Coral Slide Emblem */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#c2410c" />
    {/* Pie Chart / Bar */}
    <circle cx="16" cy="20" r="3.5" fill="#fdba74" />
    <path d="M16 20 L16 16.5 A3.5 3.5 0 0 1 19.5 20 Z" fill="#ea580c" />
  </g>
);

/** 9. Image / Graphic File Icon */
const ImageIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#f8fafc" stroke="#0284c7" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Image Frame */}
    <rect x="8" y="13" width="16" height="13" rx="1.5" fill="#0f172a" />
    {/* Sun */}
    <circle cx="12" cy="17" r="1.5" fill="#facc15" />
    {/* Mountains */}
    <path d="M9 24 L14 18 L18 22 L20 20 L23 24 Z" fill="#38bdf8" />
  </g>
);

/** 10. Audio / Music File Icon */
const AudioIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#fffbeb" stroke="#d97706" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Audio Emblem */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#b45309" />
    {/* Musical Notes */}
    <path d="M13 22 A1.5 1.5 0 1 1 11.5 20.5 C12.2 20.5 13 21 13 22 V17 H18 V21 A1.5 1.5 0 1 1 16.5 19.5 C17.2 19.5 18 20 18 21" stroke="#fef3c7" strokeWidth="1" fill="#fef3c7" />
    <line x1="13" y1="17.5" x2="18" y2="17.5" stroke="#fef3c7" strokeWidth="1.2" />
  </g>
);

/** 11. Video File Icon */
const VideoIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#faf5ff" stroke="#9333ea" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#f3e8ff" stroke="#9333ea" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Clapperboard / Film Emblem */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#7e22ce" />
    {/* Play Triangle */}
    <polygon points="14,17 14,23 20,20" fill="#f3e8ff" />
  </g>
);

/** 12. Executable / Binary App Icon */
const ExecutableIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#ecfeff" stroke="#0891b2" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#cffafe" stroke="#0891b2" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Application Window Frame */}
    <rect x="8" y="13" width="16" height="14" rx="2" fill="#0e7490" />
    <rect x="8" y="13" width="16" height="4" fill="#155e75" />
    <circle cx="10.5" cy="15" r="0.8" fill="#f43f5e" />
    <circle cx="13" cy="15" r="0.8" fill="#eab308" />
    {/* Microchip / Gear inside */}
    <rect x="13" y="19" width="6" height="6" rx="1" fill="#67e8f9" />
    <line x1="16" y1="18" x2="16" y2="19" stroke="#67e8f9" strokeWidth="0.8" />
    <line x1="16" y1="25" x2="16" y2="26" stroke="#67e8f9" strokeWidth="0.8" />
    <line x1="12" y1="22" x2="13" y2="22" stroke="#67e8f9" strokeWidth="0.8" />
    <line x1="19" y1="22" x2="20" y2="22" stroke="#67e8f9" strokeWidth="0.8" />
  </g>
);

/** 13. System Library (.DLL / .SO / .DYLIB) Icon */
const LibraryIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Metal Library Cog Badge */}
    <rect x="8" y="13" width="16" height="13" rx="2" fill="#334155" />
    {/* Cog Gear */}
    <circle cx="16" cy="19.5" r="3.2" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
    <circle cx="16" cy="19.5" r="1.2" fill="#334155" />
    {/* Teeth */}
    <path d="M16 15 V16 M16 23 V24 M12 19.5 H13 M19 19.5 H20 M13 16.5 L13.8 17.3 M18.2 21.7 L19 22.5 M13 22.5 L13.8 21.7 M18.2 17.3 L19 16.5" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
  </g>
);

/** 14. Archive / Zip Package Icon */
const ArchiveIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <defs>
      <linearGradient id="arch_box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
    </defs>
    {/* Folder / Package Shape */}
    <rect x="4" y="6" width="24" height="20" rx="3" fill="url(#arch_box)" stroke="#a16207" strokeWidth="0.8" />
    {/* Central Zipper Band */}
    <rect x="13.5" y="6" width="5" height="20" fill="#ca8a04" />
    {/* Teeth */}
    <line x1="14" y1="8" x2="17" y2="8" stroke="#fef9c3" strokeWidth="1" strokeDasharray="1.2 1" />
    <line x1="15" y1="11" x2="18" y2="11" stroke="#fef9c3" strokeWidth="1" strokeDasharray="1.2 1" />
    <line x1="14" y1="14" x2="17" y2="14" stroke="#fef9c3" strokeWidth="1" strokeDasharray="1.2 1" />
    <line x1="15" y1="17" x2="18" y2="17" stroke="#fef9c3" strokeWidth="1" strokeDasharray="1.2 1" />
    {/* Zipper Pull Clasp */}
    <rect x="13" y="19" width="6" height="5" rx="1" fill="#713f12" stroke="#fef08a" strokeWidth="0.6" />
    <circle cx="16" cy="21.5" r="0.8" fill="#fef08a" />
  </g>
);

/** 15. Configuration / INI File Icon */
const ConfigIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#fffbeb" stroke="#d97706" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#fde68a" stroke="#d97706" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Settings Sliders Badge */}
    <rect x="8" y="14" width="16" height="12" rx="2" fill="#78350f" />
    {/* Slider 1 */}
    <line x1="10" y1="17" x2="22" y2="17" stroke="#fde68a" strokeWidth="1" strokeLinecap="round" />
    <circle cx="13" cy="17" r="1.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.6" />
    {/* Slider 2 */}
    <line x1="10" y1="21" x2="22" y2="21" stroke="#fde68a" strokeWidth="1" strokeLinecap="round" />
    <circle cx="19" cy="21" r="1.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.6" />
    {/* Slider 3 */}
    <line x1="10" y1="24" x2="22" y2="24" stroke="#fde68a" strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="15" cy="24" r="1.2" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.5" />
  </g>
);

/** 16. Database / DAT File Icon */
const DatabaseIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#ecfeff" stroke="#0891b2" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#a5f3fc" stroke="#0891b2" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Database Cylinders Badge */}
    <rect x="8" y="13" width="16" height="14" rx="2" fill="#0f766e" />
    {/* Disk 1 */}
    <ellipse cx="16" cy="16.5" rx="5.5" ry="1.8" fill="#2dd4bf" stroke="#ffffff" strokeWidth="0.6" />
    {/* Disk 2 */}
    <path d="M10.5 17 V20 C10.5 21 13 21.8 16 21.8 C19 21.8 21.5 21 21.5 20 V17" fill="none" stroke="#2dd4bf" strokeWidth="1.2" />
    {/* Disk 3 */}
    <path d="M10.5 21 V24 C10.5 25 13 25.8 16 25.8 C19 25.8 21.5 25 21.5 24 V21" fill="none" stroke="#2dd4bf" strokeWidth="1.2" />
  </g>
);

/** 17. Security Key / Certificate File Icon */
const SecurityIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#fffbeb" stroke="#b45309" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Brass Shield / Key Badge */}
    <rect x="8" y="13" width="16" height="14" rx="2" fill="#92400e" />
    {/* Gold Security Key */}
    <circle cx="13.5" cy="18" r="2.5" fill="none" stroke="#fcd34d" strokeWidth="1.2" />
    <circle cx="13.5" cy="18" r="1" fill="#92400e" />
    <path d="M16 18 H21.5 V20.5 M19 18 V20" stroke="#fcd34d" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/** 18. Generic / Unknown Binary File Icon */
const GenericFileIconGraphic: React.FC<{ os: PlatformOS }> = () => (
  <g>
    <path d="M6 4 C6 2.9 6.9 2 8 2 H20 L26 8 V28 C26 29.1 25.1 30 24 30 H8 C6.9 30 6 29.1 6 28 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" />
    <path d="M20 2 V8 H26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" strokeLinejoin="round" />
    {/* Binary dots or subtle corner fold */}
    <circle cx="12" cy="16" r="1" fill="#94a3b8" />
    <circle cx="16" cy="16" r="1" fill="#cbd5e1" />
    <circle cx="20" cy="16" r="1" fill="#94a3b8" />
    <circle cx="12" cy="20" r="1" fill="#cbd5e1" />
    <circle cx="16" cy="20" r="1" fill="#94a3b8" />
    <circle cx="20" cy="20" r="1" fill="#cbd5e1" />
    <circle cx="12" cy="24" r="1" fill="#94a3b8" />
    <circle cx="16" cy="24" r="1" fill="#cbd5e1" />
    <circle cx="20" cy="24" r="1" fill="#94a3b8" />
  </g>
);
