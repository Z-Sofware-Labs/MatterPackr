import React from 'react';
import { ArchiveFile, ArchiveState, PlatformOS } from '../../types/winzip';
import { formatBytes, formatNumber } from '../../utils/crc32';
import { AppLogoIcon } from '../PlatformIcons';
import { FileTypeIcon, getFriendlyFileTypeName } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface PropertiesDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  archive: ArchiveState;
  file?: ArchiveFile | null;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  os,
  isOpen,
  onClose,
  archive,
  file,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-md shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
          os === 'macos'
            ? 'bg-white/95 dark:bg-[#1e1e24]/95 border-neutral-200/80 dark:border-neutral-700/80 text-[#1d1d1f] dark:text-[#f5f5f7]'
            : os === 'linux'
            ? 'bg-[#2a2638] border-[#1f1c29] text-[#deddda]'
            : 'bg-white dark:bg-[#202020] border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {/* Header following native OS guidelines */}
        <DialogHeader
          os={os}
          title={file ? 'File Entry Properties' : 'Archive Properties'}
          icon={
            file ? (
              <FileTypeIcon
                fileName={file.name}
                isDirectory={file.isDirectory}
                isEncrypted={file.encrypted}
                os={os}
                size={22}
              />
            ) : (
              <AppLogoIcon os={os} size={20} />
            )
          }
          onClose={onClose}
        />

        <div className="p-5 space-y-4 text-xs font-sans">
          {file ? (
            /* Individual File Properties */
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Item Type:</span>
                <span className="font-bold font-sans text-neutral-900 dark:text-neutral-100">
                  {getFriendlyFileTypeName(file.name, file.isDirectory)}
                </span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Archive Path:</span>
                <span className="font-semibold">{file.path || '(Root Directory)'}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Uncompressed Size:</span>
                <span className="font-bold">{formatBytes(file.size)} ({formatNumber(file.size)} bytes)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Packed Size:</span>
                <span className="font-bold">{formatBytes(file.packedSize)} ({formatNumber(file.packedSize)} bytes)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Space Saved:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {file.ratio}% ratio ({formatBytes(file.size - file.packedSize)} saved)
                </span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Modified Timestamp:</span>
                <span className="font-semibold">{file.date} {file.time}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">CRC-32 Checksum:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{file.crc32}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-sans">Security Cipher:</span>
                <span className={`font-bold ${file.encrypted ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                  {file.encrypted
                    ? `${file.encryptionMethod?.toUpperCase() || 'AES-256'} (WinZip Standard)`
                    : 'Unencrypted (Standard Deflate)'}
                </span>
              </div>
            </div>
          ) : (
            /* Archive Properties */
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-900/40 p-4 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Total Files:</span>
                <span className="font-bold">{formatNumber(archive.files.length)} entries</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Uncompressed Size:</span>
                <span className="font-bold">{formatBytes(archive.totalSize)}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Packed Size:</span>
                <span className="font-bold">{formatBytes(archive.totalPackedSize)}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Compression Savings:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBytes(archive.totalSize - archive.totalPackedSize)} ({archive.overallRatio}%)
                </span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Container Format:</span>
                <span className="font-bold">ZIP64 / MatterPackr Specification</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-800 pb-1.5">
                <span className="text-neutral-500 font-sans">Encryption Status:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {archive.isEncrypted ? '256-bit AES (PBKDF2-HMAC-SHA1)' : 'Unencrypted'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-sans">CPU Thread Concurrency:</span>
                <span className="font-bold">{archive.threadsCount} Worker Cores (Active)</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
