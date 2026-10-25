import React from 'react';
import { PlatformOS, ProgressState } from '../../types/winzip';
import { formatBytes } from '../../utils/crc32';
import { AppLogoIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface ProgressDialogProps {
  os: PlatformOS;
  progress: ProgressState;
  onPauseResume: () => void;
  onCancel: () => void;
  onRunInBackground?: () => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  os,
  progress,
  onPauseResume,
  onCancel,
  onRunInBackground,
}) => {
  if (!progress.active) return null;

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
          title={progress.title || 'Processing Archive...'}
          icon={<AppLogoIcon os={os} size={20} />}
          onClose={onCancel}
          actions={
            <span className="font-mono font-bold text-xs tabular-nums text-blue-600 dark:text-blue-400 mr-1">
              {Math.round(progress.totalProgress)}%
            </span>
          }
        />

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Current File Banner */}
          <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 flex items-center justify-between">
            <div className="truncate mr-3">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block tracking-wider">
                Active Target
              </span>
              <span className="font-mono font-medium truncate block text-neutral-800 dark:text-neutral-200">
                {progress.currentFile || 'Initializing worker tasks...'}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block tracking-wider">
                Speed
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {progress.throughputMBs.toFixed(1)} MB/s
              </span>
            </div>
          </div>

          {/* Progress Bar 1: Current File */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[300px]">
                Current File Chunk: {progress.currentFile || 'Idle'}
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {Math.round(progress.currentFileProgress)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-100"
                style={{ width: `${progress.currentFileProgress}%` }}
              />
            </div>
          </div>

          {/* Progress Bar 2: Total Archive */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Total Archive Progress
              </span>
              <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                {Math.round(progress.totalProgress)}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${progress.totalProgress}%` }}
              />
            </div>
          </div>

          {/* QThreadPool Concurrency Dispatcher */}
          <div className="p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 space-y-2">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-semibold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <span>⚙️</span> QThreadPool Dispatcher: {progress.totalThreads} CPU Cores Online
              </span>
              <span className="font-mono text-neutral-500 tabular-nums">
                {formatBytes(progress.processedBytes)} / {formatBytes(progress.totalBytes)}
              </span>
            </div>

            {/* Active Thread Indicators */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-0.5">
              {Array.from({ length: progress.totalThreads }).map((_, threadIdx) => {
                const isActive = (threadIdx + 1) <= progress.activeThread || progress.totalProgress < 100;
                return (
                  <div
                    key={threadIdx}
                    className={`py-1 px-1 rounded-md text-center text-[10px] font-mono transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'bg-neutral-200/50 dark:bg-neutral-700/30 text-neutral-400'
                    }`}
                  >
                    <span>T{threadIdx + 1}</span>
                    <div
                      className={`h-1 mt-0.5 rounded-full ${
                        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-mono">
              Estimated remaining: {progress.estimatedRemainingSeconds}s
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPauseResume}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
              >
                {progress.isPaused ? 'Resume' : 'Pause'}
              </button>

              {onRunInBackground && (
                <button
                  type="button"
                  onClick={onRunInBackground}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
                >
                  Background
                </button>
              )}

              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
