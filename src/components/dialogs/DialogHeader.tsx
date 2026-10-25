import React from 'react';
import { PlatformOS } from '../../types/winzip';

export interface DialogHeaderProps {
  os: PlatformOS;
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  className?: string;
  isDanger?: boolean;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  os,
  title,
  icon,
  onClose,
  actions,
  className = '',
  isDanger = false,
}) => {
  if (os === 'macos') {
    return (
      <div
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-[#f6f6f6]/95 dark:bg-[#252528]/95 border-b border-neutral-200/80 dark:border-neutral-700/80 select-none shrink-0 ${className}`}
      >
        {/* Left: macOS Red Traffic Light Button (Close only for sub-windows) */}
        <div className="flex items-center gap-2 group shrink-0">
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close dialog"
            className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#eb483f] active:bg-[#c93b33] border border-[#e0443e] flex items-center justify-center text-black/75 cursor-pointer shadow-xs transition-transform active:scale-90"
          >
            <svg
              className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              viewBox="0 0 6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <path d="M1 1l4 4M5 1l-4 4" />
            </svg>
          </button>
        </div>

        {/* Center: Title & Icon */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2 min-w-0">
          <div className="flex items-center gap-1.5 max-w-full truncate">
            {icon && <span className="shrink-0">{icon}</span>}
            <span
              className={`font-semibold text-xs tracking-tight truncate ${
                isDanger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
              }`}
            >
              {title}
            </span>
          </div>
        </div>

        {/* Right: Actions or Empty spacer for visual balance */}
        <div className="flex items-center gap-2 shrink-0 min-w-[20px] justify-end">
          {actions || <div className="w-3" aria-hidden="true" />}
        </div>
      </div>
    );
  }

  if (os === 'linux') {
    return (
      <div
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-[#241f31] border-b border-[#1c1926] text-[#deddda] select-none shrink-0 ${className}`}
      >
        {/* Left: Libadwaita Title & Icon */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0">
            <span
              className={`font-bold text-xs truncate block leading-tight ${
                isDanger ? 'text-red-400' : 'text-[#deddda]'
              }`}
            >
              {title}
            </span>
          </div>
        </div>

        {/* Right: Actions + Close button ONLY (Libadwaita circular style) */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close dialog"
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#c01c28] text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs shrink-0 shadow-xs"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Windows Fluent Design (Close button ONLY on the top-right)
  return (
    <div
      className={`w-full flex items-center justify-between pl-4 pr-1 py-1 bg-[#f8f9fa] dark:bg-[#202020] border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 select-none shrink-0 ${className}`}
    >
      {/* Left: Title & Icon */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="min-w-0">
          <span
            className={`font-semibold text-xs truncate block leading-tight ${
              isDanger
                ? 'text-red-600 dark:text-red-400'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {title}
          </span>
        </div>
      </div>

      {/* Right: Actions + Windows Close Button ONLY (no min/max on dialogs) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {actions}
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close dialog"
          className="w-10 h-7 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-[#c42b1c] hover:text-white active:bg-[#a82315] transition-colors cursor-pointer text-xs shrink-0 font-sans select-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
