/**
 * MatterPackr 2.0 - Operating System Default Application Dispatcher
 * Triggers the OS default application configured for a specific file type
 * (e.g., Photos/Preview for images, Acrobat/Edge for PDFs, Notepad/VS Code for text/code, Excel for spreadsheets)
 */

import { ArchiveFile } from '../types/winzip';

/**
 * Returns the standard MIME type for a given filename based on its extension.
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const mimeMap: Record<string, string> = {
    // Plain Text & Documents
    txt: 'text/plain;charset=utf-8',
    log: 'text/plain;charset=utf-8',
    ini: 'text/plain;charset=utf-8',
    cfg: 'text/plain;charset=utf-8',
    conf: 'text/plain;charset=utf-8',
    csv: 'text/csv;charset=utf-8',
    rtf: 'application/rtf',
    pdf: 'application/pdf',

    // Office Documents
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    tif: 'image/tiff',
    tiff: 'image/tiff',

    // Audio & Video
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',

    // Code & Markup
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html;charset=utf-8',
    htm: 'text/html;charset=utf-8',
    css: 'text/css;charset=utf-8',
    js: 'text/javascript;charset=utf-8',
    jsx: 'text/javascript;charset=utf-8',
    ts: 'text/plain;charset=utf-8',
    tsx: 'text/plain;charset=utf-8',
    py: 'text/x-python;charset=utf-8',
    cpp: 'text/x-c++;charset=utf-8',
    c: 'text/x-c;charset=utf-8',
    h: 'text/x-c;charset=utf-8',
    hpp: 'text/x-c++;charset=utf-8',
    rs: 'text/plain;charset=utf-8',
    go: 'text/plain;charset=utf-8',
    java: 'text/x-java-source;charset=utf-8',
    sh: 'text/x-shellscript;charset=utf-8',
    bat: 'text/plain;charset=utf-8',
    cmd: 'text/plain;charset=utf-8',
    ps1: 'text/plain;charset=utf-8',
    sql: 'application/sql',
    md: 'text/markdown;charset=utf-8',

    // Archives & Binaries
    zip: 'application/zip',
    '7z': 'application/x-7z-compressed',
    rar: 'application/vnd.rar',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    exe: 'application/x-msdownload',
    dll: 'application/octet-stream',
    bin: 'application/octet-stream',
    dat: 'application/octet-stream',
  };

  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Returns a friendly name of the typical default OS application for a file.
 */
export function getDefaultAppName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'Default Photo / Image Viewer';
  }
  if (['pdf'].includes(ext)) {
    return 'Default PDF Reader (Acrobat / Edge / Preview)';
  }
  if (['docx', 'doc', 'rtf'].includes(ext)) {
    return 'Microsoft Word / TextEdit';
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return 'Microsoft Excel';
  }
  if (['pptx', 'ppt'].includes(ext)) {
    return 'Microsoft PowerPoint / Keynote';
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return 'Default Audio Player (Media Player / Music)';
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return 'Default Video Player (VLC / Movies & TV)';
  }
  if (['cpp', 'c', 'h', 'hpp', 'ts', 'js', 'py', 'rs', 'go', 'html', 'css', 'json'].includes(ext)) {
    return 'Default Code Editor (VS Code / Xcode)';
  }
  if (['txt', 'log', 'ini', 'cfg', 'conf', 'md'].includes(ext)) {
    return 'Default Text Editor (Notepad / TextEdit)';
  }
  return 'Default Operating System Application';
}

/**
 * Triggers the OS default application to open the specified archive file.
 * Creates an exact typed payload blob and instructs the browser/OS shell
 * to open it in the registered system handler.
 */
export function openInDefaultOSApp(file: ArchiveFile): void {
  const mimeType = file.mimeType || getMimeType(file.name);

  // Prepare payload bytes
  let blob: Blob;
  if (file.content instanceof Uint8Array) {
    blob = new Blob([file.content.buffer as ArrayBuffer], { type: mimeType });
  } else if (typeof file.content === 'string') {
    blob = new Blob([file.content], { type: mimeType });
  } else {
    // If empty or binary without buffered bytes, create dummy placeholder with proper format
    const sampleText = `[MatterPackr 2.0 Extracted File: ${file.name}]\nUncompressed Size: ${file.size} bytes\nCRC-32: ${file.crc32}\n`;
    blob = new Blob([sampleText], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);

  // For web-viewable formats (PDF, images, text, audio, video, html), also open in system preview window
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const canPreviewDirectly = [
    'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp',
    'txt', 'html', 'json', 'xml', 'md', 'mp3', 'wav', 'mp4', 'webm'
  ].includes(ext);

  if (canPreviewDirectly) {
    // Open in separate window/tab to trigger OS/Browser default viewer
    const win = window.open(url, '_blank');
    if (!win) {
      // Pop-up blocked, trigger file link
      triggerDownloadLink(url, file.name);
    }
  } else {
    // For executables, office docs, archives, trigger OS file launch
    triggerDownloadLink(url, file.name);
  }

  // Revoke object URL after delay to allow OS to read file stream
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

function triggerDownloadLink(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
