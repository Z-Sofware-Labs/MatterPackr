import React, { useState, useEffect, useRef } from 'react';
import { PlatformOS } from '../types/winzip';

interface MenuBarProps {
  os: PlatformOS;
  onNew: () => void;
  onOpen: () => void;
  onCloseArchive: () => void;
  onSaveAs: () => void;
  onProperties: () => void;
  onAdd: () => void;
  onExtract: () => void;
  onDelete: () => void;
  onTest: () => void;
  onBenchmark?: () => void;
  onFavorites?: () => void;
  onCheckOut?: () => void;
  onEncrypt: () => void;
  onViewFile: () => void;
  onSelectAll: () => void;
  onToggleFilter?: () => void;
  isFilterVisible?: boolean;
  viewMode?: 'classic' | 'explorer';
  onSetViewMode?: (mode: 'classic' | 'explorer') => void;
  onOptions: () => void;
  onSettings: () => void;
  onWizard?: () => void;
  onTipOfDay?: () => void;
  onAbout: () => void;
  onExportQtProject?: () => void;
  hasArchive: boolean;
  hasSelection: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  os,
  onNew,
  onOpen,
  onCloseArchive,
  onSaveAs,
  onProperties,
  onAdd,
  onExtract,
  onDelete,
  onTest,
  onBenchmark,
  onFavorites,
  onCheckOut,
  onEncrypt,
  onViewFile,
  onSelectAll,
  onToggleFilter,
  isFilterVisible = false,
  viewMode = 'classic',
  onSetViewMode,
  onOptions,
  onSettings,
  onWizard,
  onTipOfDay,
  onAbout,
  onExportQtProject,
  hasArchive,
  hasSelection,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (name: string) => {
    setActiveMenu(activeMenu === name ? null : name);
  };

  const handleMenuHover = (name: string) => {
    if (activeMenu !== null) {
      setActiveMenu(name);
    }
  };

  const closeAnd = (action: () => void) => () => {
    setActiveMenu(null);
    action();
  };

  const cmdSymbol = os === 'macos' ? '⌘' : 'Ctrl+';

  return (
    <div
      ref={menuRef}
      className={`relative flex items-center px-2 py-1 text-xs select-none border-b transition-colors duration-200 ${
        os === 'macos'
          ? 'bg-[#f5f5f7]/90 dark:bg-[#18181b]/90 border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
          : os === 'linux'
          ? 'bg-[#2a2638] border-[#1f1c29] text-[#deddda]'
          : 'bg-[#fafafa] dark:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
      }`}
    >
      {/* FILE */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('File')}
          onMouseEnter={() => handleMenuHover('File')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            activeMenu === 'File'
              ? 'bg-neutral-200 dark:bg-neutral-700 font-semibold text-black dark:text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          File
        </button>

        {activeMenu === 'File' && (
          <div className="absolute top-full left-0 z-50 min-w-56 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
            <button
              onClick={closeAnd(onNew)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
            >
              <span>New Archive...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}N</span>
            </button>
            <button
              onClick={closeAnd(onOpen)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
            >
              <span>Open Archive...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}O</span>
            </button>
            <button
              disabled={!hasArchive}
              onClick={closeAnd(onCloseArchive)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Close Archive</span>
            </button>
            <button
              disabled={!hasArchive}
              onClick={closeAnd(onSaveAs)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Save Archive As...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}S</span>
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            <button
              disabled={!hasArchive}
              onClick={closeAnd(onProperties)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Archive Properties...</span>
            </button>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('Actions')}
          onMouseEnter={() => handleMenuHover('Actions')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            activeMenu === 'Actions'
              ? 'bg-neutral-200 dark:bg-neutral-700 font-semibold text-black dark:text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          Actions
        </button>

        {activeMenu === 'Actions' && (
          <div className="absolute top-full left-0 z-50 min-w-60 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
            <button
              onClick={closeAnd(onAdd)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
            >
              <span>Add Files to Archive...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}A</span>
            </button>
            <button
              disabled={!hasArchive}
              onClick={closeAnd(onExtract)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Extract Files...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}E</span>
            </button>
            {onCheckOut && (
              <button
                disabled={!hasArchive}
                onClick={closeAnd(onCheckOut)}
                className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                  hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <span>CheckOut Archive...</span>
              </button>
            )}
            <button
              disabled={!hasSelection}
              onClick={closeAnd(onDelete)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasSelection ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Delete Selected Files</span>
              <span className="opacity-50 text-[11px]">Del</span>
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            <button
              disabled={!hasSelection}
              onClick={closeAnd(onViewFile)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasSelection ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>View Selected File...</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}V</span>
            </button>
            <button
              disabled={!hasArchive}
              onClick={closeAnd(onSelectAll)}
              className={`w-full text-left px-3 py-1.5 flex justify-between rounded-sm ${
                hasArchive ? 'hover:bg-blue-500 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Select All Entries</span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}Shift+A</span>
            </button>
          </div>
        )}
      </div>

      {/* OPTIONS */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('Options')}
          onMouseEnter={() => handleMenuHover('Options')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            activeMenu === 'Options'
              ? 'bg-neutral-200 dark:bg-neutral-700 font-semibold text-black dark:text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          Options
        </button>

        {activeMenu === 'Options' && (
          <div className="absolute top-full left-0 z-50 min-w-64 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
            <button
              onClick={closeAnd(onOptions)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between items-center cursor-pointer rounded-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <span>⚙️</span>
                <span>Configuration Options...</span>
              </span>
              <span className="opacity-50 text-[11px]">{cmdSymbol},</span>
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            <button
              onClick={closeAnd(onSettings)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
            >
              <span>Multi-Threaded Engine Settings...</span>
            </button>
            {onWizard && (
              <button
                onClick={closeAnd(onWizard)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
              >
                <span>MatterPackr Wizard Mode...</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* VIEW: Exactly 3 options: Filter files, separator, Classic view or Explorer view */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('View')}
          onMouseEnter={() => handleMenuHover('View')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            activeMenu === 'View'
              ? 'bg-neutral-200 dark:bg-neutral-700 font-semibold text-black dark:text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          View
        </button>

        {activeMenu === 'View' && (
          <div className="absolute top-full left-0 z-50 min-w-64 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
            {/* 1. Filter files (existing, leave it as it is) */}
            <button
              onClick={closeAnd(() => onToggleFilter && onToggleFilter())}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between items-center cursor-pointer rounded-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 text-center text-blue-600 dark:text-blue-400 font-bold">
                  {isFilterVisible ? '✓' : ''}
                </span>
                <span>Filter files (Search)</span>
              </span>
              <span className="opacity-50 text-[11px]">{cmdSymbol}F</span>
            </button>

            {/* Separation line */}
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

            {/* 2. Classic view (with check on what is enabled) */}
            <button
              onClick={closeAnd(() => onSetViewMode && onSetViewMode('classic'))}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between items-center cursor-pointer rounded-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 text-center text-blue-600 dark:text-blue-400 font-bold">
                  {viewMode === 'classic' ? '✓' : ''}
                </span>
                <span>Classic view</span>
              </span>
              <span className="opacity-50 text-[11px]">{viewMode === 'classic' ? 'Enabled' : ''}</span>
            </button>

            {/* 3. Explorer view (with check on what is enabled) */}
            <button
              onClick={closeAnd(() => onSetViewMode && onSetViewMode('explorer'))}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between items-center cursor-pointer rounded-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-3 text-center text-blue-600 dark:text-blue-400 font-bold">
                  {viewMode === 'explorer' ? '✓' : ''}
                </span>
                <span>Explorer view</span>
              </span>
              <span className="opacity-50 text-[11px]">{viewMode === 'explorer' ? 'Enabled' : ''}</span>
            </button>
          </div>
        )}
      </div>

      {/* HELP: Only About MatterPackr */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('Help')}
          onMouseEnter={() => handleMenuHover('Help')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            activeMenu === 'Help'
              ? 'bg-neutral-200 dark:bg-neutral-700 font-semibold text-black dark:text-white'
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
          }`}
        >
          Help
        </button>

        {activeMenu === 'Help' && (
          <div className="absolute top-full left-0 z-50 min-w-56 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs">
            <button
              onClick={closeAnd(onAbout)}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between cursor-pointer rounded-sm"
            >
              <span>About MatterPackr...</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
