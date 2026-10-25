import React from 'react';
import { PlatformOS } from '../types/winzip';
import { formatBytes, formatNumber } from '../utils/crc32';

interface StatusBarProps {
  os: PlatformOS;
  selectedCount: number;
  selectedBytes: number;
  totalCount: number;
  totalBytes: number;
  overallRatio: number;
  threadsCount: number;
  isEncrypted: boolean;
  encryptionMethod?: string;
  isBusy?: boolean;
  busyAction?: string;
  onOpenSettings?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  os,
  selectedCount,
  selectedBytes,
  totalCount,
  totalBytes,
  overallRatio,
  threadsCount,
  isEncrypted,
  encryptionMethod = 'AES-256',
  isBusy = false,
  busyAction = '',
  onOpenSettings,
}) => {
  return (
    <div
      className={`h-[28px] flex items-center justify-between px-2.5 border-t text-[11px] select-none font-sans transition-colors duration-200 shrink-0 ${
        os === 'macos'
          ? 'bg-[#ececf0] dark:bg-[#1a1a1e] border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
          : os === 'linux'
          ? 'bg-[#252030] border-[#1a1722] text-[#deddda]'
          : 'bg-[#f0f0f0] dark:bg-[#1b1b1b] border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
      }`}
    >
      {/* Panel 1: Activity Status & Operation */}
      <div className="flex items-center gap-2 truncate min-w-[130px]">
        <span className="font-medium truncate">
          {isBusy ? (busyAction || 'Processing...') : 'Ready'}
        </span>
      </div>

      {/* Panel 2: Selected and Total Files Stats */}
      <div className="hidden sm:flex items-center gap-2 text-neutral-500 dark:text-neutral-400 truncate px-2 border-l border-neutral-300 dark:border-neutral-700/60">
        <span>
          {selectedCount > 0
            ? `${formatNumber(selectedCount)} selected (${formatBytes(selectedBytes)})`
            : '0 items selected'}
        </span>
        <span aria-hidden="true" className="opacity-40">|</span>
        <span>
          Total {formatNumber(totalCount)} items ({formatBytes(totalBytes)})
        </span>
        {totalCount > 0 && (
          <>
            <span aria-hidden="true" className="opacity-40">|</span>
            <span className="font-mono tabular-nums">
              Savings: {overallRatio}%
            </span>
          </>
        )}
      </div>

      {/* Panel 3: Classic WinZip Traffic Light Status Indicator & Threads */}
      <div className="flex items-center gap-3 shrink-0 pl-2 border-l border-neutral-300 dark:border-neutral-700/60">
        {/* Multi-thread indicator */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Engine worker threads"
          className="hidden md:flex items-center gap-1.5 hover:text-black dark:hover:text-white transition-colors cursor-pointer text-[10.5px]"
        >
          <span className="font-mono tabular-nums">{threadsCount} Threads</span>
        </button>

        {isEncrypted && (
          <div className="hidden md:flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span>🔒</span>
            <span>{encryptionMethod.toUpperCase()}</span>
          </div>
        )}

        {/* CLASSIC WINZIP STATUS TRAFFIC LIGHTS */}
        <div
          title={isBusy ? 'Engine status: BUSY (Packing / Unpacking)' : 'Engine status: READY'}
          className="flex items-center gap-2 px-2 py-0.5 rounded border border-neutral-300/80 dark:border-neutral-700 bg-neutral-200/70 dark:bg-black/40 shadow-inner"
        >
          {/* Red Light */}
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                isBusy
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444] ring-1 ring-red-400 animate-pulse'
                  : 'bg-red-950/30 dark:bg-red-950/50 border border-red-900/30 opacity-40'
              }`}
            />
            {isBusy && (
              <span className="text-[9.5px] font-bold text-red-600 dark:text-red-400 font-mono tracking-wider">
                BUSY
              </span>
            )}
          </div>

          {/* Green Light */}
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                !isBusy
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] ring-1 ring-emerald-400'
                  : 'bg-emerald-950/30 dark:bg-emerald-950/50 border border-emerald-900/30 opacity-40'
              }`}
            />
            {!isBusy && (
              <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
                READY
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
