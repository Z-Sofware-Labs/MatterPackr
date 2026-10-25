import { ArchiveFile, ArchiveState } from '../types/winzip';
import { computeCrc32 } from './crc32';

const readmeText = `========================================================================
MATTERPACKR 2.0 - ARCHIVE ARCHITECTURE & RUNTIME
========================================================================
Welcome to MatterPackr 2.0 Multi-Threaded Edition.

This archive demonstration features:
* Native Qt 6 / C++20 core architecture with adaptive OS design
* Multi-threaded chunked compression algorithms (Qt QThreadPool)
* 256-bit AES encryption support conforming to modern AES-CTR specifications
* High performance memory-mapped stream processing
* Dual progress indicators with real-time throughput metrics
* Semantic vector file type iconography across all desktop platforms

Copyright (c) MatterPackr Core Engineering. All rights reserved.
Built for Windows 11 Fluent, macOS Sequoia, and Linux GNOME.
`;

const configIni = `[General]
AppName=MatterPackr
Version=2.0.0
ThreadPoolWorkers=8
ChunkSizeKB=1024
CompressionLevel=Maximum
DefaultEncryption=AES-256
MemoryMappedIO=Enabled

[Security]
Cipher=AES-256-CTR
KeyDerivation=PBKDF2-HMAC-SHA1
Iterations=10000
SaltLength=16
`;

const mainCppSnippet = `// Qt 6 / C++20 Multi-threaded Compression Engine
#include <QCoreApplication>
#include <QThreadPool>
#include <QDebug>
#include "CompressionWorker.h"
#include "ZipArchiveEngine.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);
    qInfo() << "WinZip Engine Core initialized with" << QThread::idealThreadCount() << "worker threads.";
    return 0;
}
`;

export const defaultSampleFiles: ArchiveFile[] = [
  {
    id: 'f1',
    name: 'README.TXT',
    path: '',
    size: readmeText.length,
    packedSize: Math.floor(readmeText.length * 0.48),
    ratio: 52,
    date: '04/18/2002',
    time: '10:42 AM',
    crc32: computeCrc32(readmeText),
    encrypted: false,
    type: 'Text Document',
    content: readmeText,
    mimeType: 'text/plain',
  },
  {
    id: 'f2',
    name: 'MATTERPACKR_CONFIG.INI',
    path: '',
    size: configIni.length,
    packedSize: 88,
    ratio: 47,
    date: '05/02/2002',
    time: '02:15 PM',
    crc32: computeCrc32(configIni),
    encrypted: false,
    type: 'Configuration Settings',
    content: configIni,
    mimeType: 'text/plain',
  },
  {
    id: 'f3',
    name: 'MAIN.CPP',
    path: 'src/',
    size: mainCppSnippet.length,
    packedSize: Math.floor(mainCppSnippet.length * 0.45),
    ratio: 55,
    date: '06/11/2002',
    time: '09:30 AM',
    crc32: computeCrc32(mainCppSnippet),
    encrypted: false,
    type: 'C++ Source File',
    content: mainCppSnippet,
    mimeType: 'text/x-c++',
  },
  {
    id: 'f4',
    name: 'CLIENT_PAYROLL_2002.DAT',
    path: 'secure/',
    size: 245760,
    packedSize: 98304,
    ratio: 60,
    date: '07/14/2002',
    time: '04:55 PM',
    crc32: 'E3B0C442',
    encrypted: true,
    encryptionMethod: 'aes-256',
    type: 'Encrypted Database File',
    content: '[ENCRYPTED DATA: 256-bit AES cipher block with HMAC-SHA1 signature. Provide decryption password to unlock payload.]',
    mimeType: 'application/octet-stream',
  },
  {
    id: 'f5',
    name: 'SPLASH_BANNER.BMP',
    path: 'graphics/',
    size: 512400,
    packedSize: 184320,
    ratio: 64,
    date: '03/29/2002',
    time: '11:12 AM',
    crc32: '89A4C0B1',
    encrypted: false,
    type: 'Bitmap Image',
    content: 'BM... (Bitmap 640x480x24bpp raw image header and raster bitstream)',
    mimeType: 'image/bmp',
  },
  {
    id: 'f6',
    name: 'SECURITY_KEYS.KEY',
    path: 'secure/',
    size: 4096,
    packedSize: 1536,
    ratio: 62,
    date: '08/01/2002',
    time: '06:05 PM',
    crc32: '5D41402F',
    encrypted: true,
    encryptionMethod: 'aes-256',
    type: 'AES Key Ring',
    content: '[ENCRYPTED AES-256 KEY CONTAINER: Protected by master archive passphrase]',
    mimeType: 'application/octet-stream',
  },
  {
    id: 'f7',
    name: 'SYSTEM_KERNEL.DLL',
    path: 'bin/',
    size: 1420800,
    packedSize: 639360,
    ratio: 55,
    date: '02/10/2002',
    time: '01:22 PM',
    crc32: '7C6A2B99',
    encrypted: false,
    type: 'Application Extension',
    content: 'MZ... PE header / Win32 Dynamic Link Library compiled x86 binary',
    mimeType: 'application/octet-stream',
  },
  {
    id: 'f8',
    name: 'MATTERPACKR_SPEC.PDF',
    path: 'docs/',
    size: 348160,
    packedSize: 153190,
    ratio: 56,
    date: '09/15/2002',
    time: '11:40 AM',
    crc32: '4A1B99C2',
    encrypted: false,
    type: 'Adobe Acrobat Document (PDF)',
    content: '%PDF-1.4 MatterPackr 2.0 Architectural Specification & Multi-Core Compression Whitepaper',
    mimeType: 'application/pdf',
  },
  {
    id: 'f9',
    name: 'FINANCIAL_REPORT_Q2.XLSX',
    path: 'finance/',
    size: 184320,
    packedSize: 73728,
    ratio: 60,
    date: '06/30/2002',
    time: '03:15 PM',
    crc32: '93D17E08',
    encrypted: true,
    encryptionMethod: 'aes-256',
    type: 'Microsoft Excel Spreadsheet',
    content: '[ENCRYPTED PAYLOAD: AES-256 Cipherstream - Enterprise Q2 Balance Sheet & Asset Ledger]',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'f10',
    name: 'PACKR_CLI.EXE',
    path: 'bin/',
    size: 2150400,
    packedSize: 860160,
    ratio: 60,
    date: '05/18/2002',
    time: '04:10 PM',
    crc32: 'A8B2C4F1',
    encrypted: false,
    type: 'Application Executable',
    content: 'MZ... Win32 Portable Executable / MatterPackr Command-Line Archiver Utility',
    mimeType: 'application/octet-stream',
  },
  {
    id: 'f11',
    name: 'STARTUP_CHIME.WAV',
    path: 'media/',
    size: 524288,
    packedSize: 262144,
    ratio: 50,
    date: '04/01/2002',
    time: '08:00 AM',
    crc32: 'F31A8820',
    encrypted: false,
    type: 'Waveform Audio',
    content: 'RIFF....WAVEfmt ... 16-bit 44.1kHz Stereo PCM Audio Data',
    mimeType: 'audio/wav',
  },
  {
    id: 'f12',
    name: 'BUILD_SCRIPT.TS',
    path: 'scripts/',
    size: 4280,
    packedSize: 1840,
    ratio: 57,
    date: '07/20/2002',
    time: '01:50 PM',
    crc32: '28C76DF3',
    encrypted: false,
    type: 'TypeScript Source File',
    content: 'import { exec } from "child_process";\nconsole.log("Compiling Qt 6 C++20 MatterPackr binary...");',
    mimeType: 'text/typescript',
  },
];

export function calculateArchiveStats(files: ArchiveFile[]) {
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const totalPackedSize = files.reduce((acc, f) => acc + f.packedSize, 0);
  const overallRatio = totalSize > 0 ? Math.round(((totalSize - totalPackedSize) / totalSize) * 100) : 0;
  const isEncrypted = files.some(f => f.encrypted);

  return { totalSize, totalPackedSize, overallRatio, isEncrypted };
}

export const initialArchiveState: ArchiveState = {
  name: 'NEW_ARCHIVE.ZIP',
  path: 'C:\\ARCHIVES\\NEW_ARCHIVE.ZIP',
  files: [],
  encryptionMethod: 'none',
  totalSize: 0,
  totalPackedSize: 0,
  overallRatio: 0,
  isEncrypted: false,
  isModified: false,
  threadsCount: 8,
  chunkSizeKb: 1024,
};
