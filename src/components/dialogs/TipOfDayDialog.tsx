import React, { useState } from 'react';
import { PlatformOS } from '../../types/winzip';
import { DialogHeader } from './DialogHeader';

interface TipOfDayDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
}

const tips = [
  "You can drag and drop files from Windows Explorer, macOS Finder, or Linux Nautilus directly into the archiver to compress them with multi-threading.",
  "Toggle between Windows 11, macOS Sequoia, and Linux GNOME at the top bar to inspect how the iconography dynamically transforms to match each OS's design guidelines.",
  "Double-clicking any archive item opens the integrated viewer, giving you both a syntax-highlighted text preview and a raw binary hex dump.",
  "The 256-bit AES encryption complies with the WinZip AE-2 specification using 10,000 PBKDF2 iterations for protection against brute-force attacks.",
  "Under the hood, memory-mapped I/O (QFile::map) streams data directly from disk into CPU worker threads, allowing multi-gigabyte archives to process with minimal RAM overhead.",
  "Click 'C++ / Qt Engine' on the toolbar to inspect or download the complete cross-platform C++20 Qt 6 source code package with CMake build scripts.",
];

export const TipOfDayDialog: React.FC<TipOfDayDialogProps> = ({ os, isOpen, onClose }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);

  if (!isOpen) return null;

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
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
          title="MatterPackr Tips & Tricks"
          icon={<span className="text-base">💡</span>}
          onClose={onClose}
        />

        <div className="p-6 space-y-5 text-xs font-sans">
          <div className="p-4 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider block">
              Tip {currentTipIndex + 1} of {tips.length}
            </span>
            <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed text-xs">
              {tips[currentTipIndex]}
            </p>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleNextTip}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
            >
              Next Tip &rarr;
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
