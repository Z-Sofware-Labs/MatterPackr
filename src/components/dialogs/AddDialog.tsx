import React, { useState } from 'react';
import { CompressionLevel, EncryptionMethod, PlatformOS } from '../../types/winzip';
import { formatBytes } from '../../utils/crc32';
import { AddFilesIcon } from '../PlatformIcons';
import { FileTypeIcon } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface AddDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (files: File[], level: CompressionLevel, threads: number, chunkSizeKb: number, encrypt: boolean, method: EncryptionMethod) => void;
  defaultThreads: number;
}

export const AddDialog: React.FC<AddDialogProps> = ({
  os,
  isOpen,
  onClose,
  onAdd,
  defaultThreads = 8,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<CompressionLevel>('maximum');
  const [threads, setThreads] = useState<number>(defaultThreads);
  const [chunkSizeKb, setChunkSizeKb] = useState<number>(1024);
  const [encrypt, setEncrypt] = useState<boolean>(true);
  const [method, setMethod] = useState<EncryptionMethod>('aes-256');
  const [includeSubfolders, setIncludeSubfolders] = useState<boolean>(true);
  const [storePath, setStorePath] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Please select files from your computer to compress and add.');
      return;
    }
    setError('');
    onAdd(selectedFiles, level, threads, chunkSizeKb, encrypt, method);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-lg shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
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
          title="Add Files to Archive"
          icon={<AddFilesIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* File Picker Section */}
          <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 space-y-2 border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-neutral-800 dark:text-neutral-200">Select Files from Computer:</label>
            </div>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="w-full text-xs text-neutral-600 dark:text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 cursor-pointer"
            />
            {error && (
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11px]">
                ⚠️ {error}
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="mt-2 p-2 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 max-h-28 overflow-y-auto space-y-1">
                <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 px-1 pb-0.5 border-b border-neutral-200 dark:border-neutral-700/50">
                  {selectedFiles.length} file(s) queued for compression:
                </div>
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-1 py-0.5 text-xs">
                    <FileTypeIcon fileName={f.name} isEncrypted={encrypt} os={os} size={15} />
                    <span className="font-medium truncate text-neutral-800 dark:text-neutral-200">{f.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono ml-auto shrink-0">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Compression Settings */}
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 space-y-2.5">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block border-b border-neutral-200 dark:border-neutral-800 pb-1">
                Compression Engine
              </span>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Compression Level:</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as CompressionLevel)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value="maximum">Maximum (PPMd / Deflate-64)</option>
                  <option value="normal">Normal (Enhanced Deflate)</option>
                  <option value="fast">Fast (Standard)</option>
                  <option value="superfast">Super Fast (Real-Time)</option>
                  <option value="none">None (Store Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">QThreadPool Workers:</label>
                <select
                  value={threads}
                  onChange={(e) => setThreads(Number(e.target.value))}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-xs font-mono outline-none"
                >
                  <option value={1}>1 Worker Thread (Single Core)</option>
                  <option value={2}>2 Worker Threads (Dual Core)</option>
                  <option value={4}>4 Worker Threads (Quad Core)</option>
                  <option value={8}>8 Worker Threads (Optimized)</option>
                  <option value={16}>16 Worker Threads (Workstation)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Chunk Buffer Size:</label>
                <select
                  value={chunkSizeKb}
                  onChange={(e) => setChunkSizeKb(Number(e.target.value))}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1.5 text-xs font-mono outline-none"
                >
                  <option value={256}>256 KB (Low RAM)</option>
                  <option value={1024}>1024 KB (1 MB Balanced)</option>
                  <option value={4096}>4096 KB (4 MB High Performance)</option>
                </select>
              </div>
            </div>

            {/* Encryption & Options */}
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 space-y-2.5">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block border-b border-neutral-200 dark:border-neutral-800 pb-1">
                Security & Storage
              </span>

              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={encrypt}
                  onChange={(e) => setEncrypt(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <span>Encrypt added files</span>
              </label>

              {encrypt && (
                <div className="pl-4 space-y-1.5">
                  <label className="block text-[10.5px] text-neutral-500">Encryption Method:</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as EncryptionMethod)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none text-emerald-600 dark:text-emerald-400"
                  >
                    <option value="aes-256">256-bit AES (Strongest)</option>
                    <option value="aes-128">128-bit AES</option>
                    <option value="zip20">Standard Zip 2.0 (Legacy)</option>
                  </select>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    Conforms to WinZip AE-2 specification with PBKDF2 key derivation.
                  </span>
                </div>
              )}

              <div className="pt-1 space-y-1 text-neutral-600 dark:text-neutral-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSubfolders}
                    onChange={(e) => setIncludeSubfolders(e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                  <span>Include subfolders</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storePath}
                    onChange={(e) => setStorePath(e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                  <span>Store path information</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-200/70 dark:border-neutral-800">
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
              Add to Archive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
