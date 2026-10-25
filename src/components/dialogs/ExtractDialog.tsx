import React, { useState } from 'react';
import { PlatformOS } from '../../types/winzip';
import { ExtractFilesIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface ExtractDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onExtract: (extractPath: string, extractAll: boolean, password?: string, preservePath?: boolean) => void;
  selectedCount: number;
  totalCount: number;
  isEncrypted: boolean;
}

export const ExtractDialog: React.FC<ExtractDialogProps> = ({
  os,
  isOpen,
  onClose,
  onExtract,
  selectedCount,
  totalCount,
  isEncrypted,
}) => {
  const [extractPath, setExtractPath] = useState<string>(
    os === 'macos' ? '~/Downloads/Extracted_Archive/' : os === 'linux' ? '~/Downloads/extracted/' : 'C:\\Extracted_Files\\'
  );
  const [extractAll, setExtractAll] = useState<boolean>(selectedCount === 0);
  const [password, setPassword] = useState<string>('');
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [useFolderNames, setUseFolderNames] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExtract(extractPath, extractAll, password, useFolderNames);
    onClose();
  };

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
          title="Extract Files"
          icon={<ExtractFilesIcon os={os} size={20} />}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Target Folder Path */}
          <div className="space-y-1.5">
            <label className="font-semibold block">Destination Folder:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={extractPath}
                onChange={(e) => setExtractPath(e.target.value)}
                className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setExtractPath(os === 'macos' ? '~/Desktop/Extracted/' : 'C:\\Extracted\\')}
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Files Selection */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 space-y-2">
            <span className="font-semibold block border-b border-neutral-200 dark:border-neutral-800 pb-1">
              File Selection
            </span>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="extractMode"
                checked={extractAll}
                onChange={() => setExtractAll(true)}
              />
              <span>All files in archive ({totalCount} files)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="extractMode"
                checked={!extractAll}
                onChange={() => setExtractAll(false)}
                disabled={selectedCount === 0}
              />
              <span className={selectedCount === 0 ? 'text-neutral-400' : ''}>
                Selected files only ({selectedCount} files)
              </span>
            </label>
          </div>

          {/* Decryption password if archive is encrypted */}
          {isEncrypted && (
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-1.5">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 block flex items-center gap-1.5">
                <span>🔒</span> Decryption Passphrase:
              </span>
              <input
                type="password"
                placeholder="Enter password to decrypt AES-256 payload..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-lg px-3 py-2 font-mono text-xs outline-none"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span>Overwrite existing files</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFolderNames}
                onChange={(e) => setUseFolderNames(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span>Preserve directory tree structure</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Extract Files
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
