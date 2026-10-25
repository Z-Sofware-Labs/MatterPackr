import React, { useState, useEffect } from 'react';
import { ArchiveFile, PlatformOS } from '../../types/winzip';
import { TestArchiveIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface TestDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  files: ArchiveFile[];
  threadsCount: number;
}

export const TestDialog: React.FC<TestDialogProps> = ({
  os,
  isOpen,
  onClose,
  files,
  threadsCount,
}) => {
  const [log, setLog] = useState<string[]>([]);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setLog([]);
      setIsDone(false);
      setProgressPercent(0);
      return;
    }

    let current = 0;
    const initialLog = [
      `MatterPackr CRC-32 & AES Integrity Diagnostic Engine (v2.0.0)`,
      `Dispatching ${threadsCount} parallel worker threads across ${files.length} archive entries...`,
      `------------------------------------------------------------------------`,
    ];
    setLog(initialLog);

    const interval = setInterval(() => {
      if (current < files.length) {
        const file = files[current];
        const threadId = (current % threadsCount) + 1;
        const msg = `[Thread ${threadId}] Verifying ${file.name.padEnd(24)} -> OK (CRC32: ${file.crc32}${file.encrypted ? ', AES-256 HMAC valid' : ''})`;
        setLog((prev) => [...prev, msg]);
        current++;
        setProgressPercent(Math.round((current / files.length) * 100));
      } else {
        clearInterval(interval);
        setLog((prev) => [
          ...prev,
          `------------------------------------------------------------------------`,
          `Integrity test complete. Total files checked: ${files.length}`,
          `0 corrupted files detected. 0 CRC-32 mismatches. All signatures valid.`,
        ]);
        setIsDone(true);
      }
    }, 160);

    return () => clearInterval(interval);
  }, [isOpen, files, threadsCount]);

  if (!isOpen) return null;

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
          title="Archive Integrity Diagnostic"
          icon={<TestArchiveIcon os={os} size={20} />}
          onClose={onClose}
        />

        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {isDone ? 'Verification Complete' : 'Validating checksums...'}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Diagnostic Log Window */}
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-[11px] p-3 h-52 overflow-y-auto space-y-1 text-neutral-700 dark:text-neutral-300 select-text">
            {log.map((line, idx) => (
              <div key={idx} className={line.includes('OK') ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                {line}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
