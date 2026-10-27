import React from 'react';
import { PlatformOS } from '../types/winzip';
import { AppLogoIcon } from './PlatformIcons';

interface TitleBarProps {
  os: PlatformOS;
  onChangeOS: (os: PlatformOS) => void;
  archiveName: string;
  isModified?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isMaximized?: boolean;
  showOSSwitcher?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  os,
  onChangeOS,
  archiveName,
  isModified = false,
  onMinimize,
  onMaximize,
  onClose,
  isMaximized = false,
  showOSSwitcher = false,
}) => {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 select-none border-b transition-colors duration-200 ${
        os === 'macos'
          ? 'bg-[#ececf1]/80 dark:bg-[#1e1e24]/80 backdrop-blur-md border-[#d2d2d7] dark:border-[#38383f] text-[#1d1d1f] dark:text-[#f5f5f7]'
          : os === 'linux'
          ? 'bg-[#241f31] border-[#1c1926] text-[#deddda]'
          : 'bg-[#f3f3f3] dark:bg-[#202020] border-[#e5e5e5] dark:border-[#2b2b2b] text-[#1a1a1a] dark:text-[#ffffff]'
      }`}
    >
      {/* LEFT ZONE: Mac Traffic Lights OR Windows/Linux App Lockup */}
      <div className="flex items-center gap-3 min-w-0">
        {os === 'macos' ? (
          /* macOS Sequoia Traffic Lights (Close, Minimize, Zoom/Maximize) */
          <div className="flex items-center gap-2 group py-0.5">
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close (⌘W)"
              className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#eb483f] active:bg-[#c93b33] border border-[#e0443e] flex items-center justify-center text-black/75 cursor-pointer shadow-xs transition-transform active:scale-90"
            >
              <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M1 1l4 4M5 1l-4 4" />
              </svg>
            </button>

            {/* Minimize */}
            <button
              type="button"
              onClick={onMinimize}
              title="Minimize (⌘M)"
              className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#eaab20] active:bg-[#c99014] border border-[#dea123] flex items-center justify-center text-black/75 cursor-pointer shadow-xs transition-transform active:scale-90"
            >
              <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 6 6" fill="currentColor">
                <rect x="0.5" y="2.5" width="5" height="1" rx="0.5" />
              </svg>
            </button>

            {/* Maximize / Zoom */}
            <button
              type="button"
              onClick={onMaximize}
              title={isMaximized ? 'Exit Full Screen' : 'Full Screen'}
              className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#1fb835] active:bg-[#189b2c] border border-[#1aab29] flex items-center justify-center text-black/75 cursor-pointer shadow-xs transition-transform active:scale-90"
            >
              <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 6 6" fill="currentColor">
                <polygon points="0,0 2.5,0 0,2.5" />
                <polygon points="6,6 3.5,6 6,3.5" />
              </svg>
            </button>
          </div>
        ) : (
          /* Windows / Linux Brand Lockup */
          <div className="flex items-center gap-2.5">
            <AppLogoIcon os={os} size={18} />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold tracking-tight truncate">
                MatterPackr
              </span>
              {archiveName ? (
                <>
                  <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">·</span>
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate max-w-[200px] sm:max-w-xs">
                    {archiveName}
                    {isModified && ' *'}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* CENTER ZONE: Centered Title on macOS / Linux GNOME Headerbar */}
      {os === 'macos' ? (
        <div className="flex items-center gap-2 text-xs font-medium text-center truncate px-2">
          <AppLogoIcon os={os} size={16} />
          <span className="truncate font-semibold">
            {archiveName ? `${archiveName}${isModified ? ' *' : ''}` : 'MatterPackr'}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">· Native Qt 6</span>
        </div>
      ) : os === 'linux' ? (
        <div className="hidden md:flex items-center gap-2 text-xs text-[#deddda] font-medium text-center">
          <span className="truncate">{archiveName ? `${archiveName}${isModified ? ' *' : ''}` : 'MatterPackr'}</span>
          <span className="text-[10px] text-emerald-400 font-mono">Qt 6.5</span>
        </div>
      ) : null}

      {/* RIGHT ZONE: OS Switcher (Development/Testing) & Native Windows/Linux Window Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* OS Platform Switcher Tabs (Kept for preview/testing; cleanly toggled off for final release) */}
        {showOSSwitcher && (
          <div className="flex items-center p-0.5 bg-black/5 dark:bg-white/10 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onChangeOS('windows')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                os === 'windows'
                  ? 'bg-white dark:bg-[#2d2d2d] text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
              title="Switch to Windows 11 Fluent Design & icon language"
            >
              <span>⊞</span>
              <span className="hidden sm:inline">Windows 11</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeOS('macos')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                os === 'macos'
                  ? 'bg-white dark:bg-[#2d2d2d] text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
              title="Switch to macOS Sequoia HIG & traffic lights"
            >
              <span></span>
              <span className="hidden sm:inline">macOS</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeOS('linux')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                os === 'linux'
                  ? 'bg-white dark:bg-[#2d2d2d] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white'
              }`}
              title="Switch to Linux GNOME Libadwaita & icon language"
            >
              <span>🐧</span>
              <span className="hidden sm:inline">Linux</span>
            </button>
          </div>
        )}

        {/* Windows 11 Native Fluent Caption Buttons */}
        {os === 'windows' && (
          <div className="flex items-center -mr-3 -my-2 h-9">
            {/* Minimize */}
            <button
              type="button"
              onClick={onMinimize}
              title="Minimize"
              className="w-11 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 1" fill="none">
                <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={onMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-11 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {isMaximized ? (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M2 2V0.5h7.5v7.5H8" />
                  <rect x="0.5" y="2" width="7.5" height="7.5" fill="none" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="0.5" y="0.5" width="9" height="9" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="w-11 h-full flex items-center justify-center hover:bg-[#c42b1c] hover:text-white text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
                <path d="M1 1l8 8M9 1L1 9" />
              </svg>
            </button>
          </div>
        )}

        {/* Linux GNOME / Libadwaita Window Control Buttons (Minimize, Maximize/Restore, Close) */}
        {os === 'linux' && (
          <div className="flex items-center gap-1.5 ml-1">
            {/* Minimize */}
            <button
              type="button"
              onClick={onMinimize}
              title="Minimize"
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-[#deddda] flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 8.5a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5H3.25A.75.75 0 0 1 2.5 8.5z" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={onMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-[#deddda] flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMaximized ? (
                <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <rect x="2.5" y="4.5" width="8" height="8" rx="1" />
                  <path d="M5.5 2.5h7a1 1 0 0 1 1 1v7" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="10" height="10" rx="1.5" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#c01c28] active:bg-[#a51d2d] text-[#deddda] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4l8 8M12 4L4 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
