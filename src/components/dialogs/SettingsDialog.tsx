import React, { useState } from 'react';
import { EncryptionMethod, PlatformOS } from '../../types/winzip';
import { DialogHeader } from './DialogHeader';

interface SettingsDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  threadsCount: number;
  chunkSizeKb: number;
  defaultEncryption: EncryptionMethod;
  onSave: (threads: number, chunkSizeKb: number, enc: EncryptionMethod) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  os,
  isOpen,
  onClose,
  threadsCount,
  chunkSizeKb,
  defaultEncryption,
  onSave,
}) => {
  const [threads, setThreads] = useState<number>(threadsCount);
  const [chunkSize, setChunkSize] = useState<number>(chunkSizeKb);
  const [encMethod, setEncMethod] = useState<EncryptionMethod>(defaultEncryption);
  const [memoryMapped, setMemoryMapped] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(threads, chunkSize, encMethod);
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
          title="Engine Settings & Concurrency"
          icon={<span className="text-base">⚙️</span>}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-3">
            <span className="font-semibold block border-b border-neutral-200 dark:border-neutral-800 pb-1">
              Multi-Threaded Workstation Tuning
            </span>

            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">
                Active CPU Worker Threads:
              </label>
              <select
                value={threads}
                onChange={(e) => setThreads(Number(e.target.value))}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 font-mono text-xs outline-none"
              >
                <option value={1}>1 Worker Thread (Single Core)</option>
                <option value={2}>2 Worker Threads (Dual Core)</option>
                <option value={4}>4 Worker Threads (Quad Core)</option>
                <option value={8}>8 Worker Threads (Optimized Multi-Core)</option>
                <option value={16}>16 Worker Threads (High-Performance Rig)</option>
                <option value={32}>32 Worker Threads (Server Architecture)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-500 mb-1">
                Chunk Buffer Granularity:
              </label>
              <select
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 font-mono text-xs outline-none"
              >
                <option value={256}>256 KB (Minimum memory overhead)</option>
                <option value={1024}>1024 KB (1 MB - Recommended balance)</option>
                <option value={4096}>4096 KB (4 MB - Maximum throughput)</option>
                <option value={8192}>8192 KB (8 MB - Gigabyte-scale archives)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1 font-medium">
              <input
                type="checkbox"
                checked={memoryMapped}
                onChange={(e) => setMemoryMapped(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span>Enable QFile::map() Memory-Mapped Streaming</span>
            </label>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-2">
            <span className="font-semibold block border-b border-neutral-200 dark:border-neutral-800 pb-1">
              Default Encryption Protocol
            </span>
            <select
              value={encMethod}
              onChange={(e) => setEncMethod(e.target.value as EncryptionMethod)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none text-emerald-600 dark:text-emerald-400"
            >
              <option value="aes-256">256-bit AES (WinZip AE-2 Standard)</option>
              <option value="aes-128">128-bit AES</option>
              <option value="zip20">Standard Zip 2.0 (Legacy)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
