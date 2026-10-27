import React from 'react';
import { PlatformOS } from '../types/winzip';
import {
  NewArchiveIcon,
  OpenArchiveIcon,
  FavoritesIcon,
  AddFilesIcon,
  ExtractFilesIcon,
  ViewFileIcon,
  CheckOutIcon,
  ViewModeToggleIcon,
  SearchToolIcon,
} from './PlatformIcons';

interface ToolBarProps {
  os: PlatformOS;
  onNew: () => void;
  onOpen: () => void;
  onFavorites?: () => void;
  onAdd: () => void;
  onExtract: () => void;
  onView: () => void;
  onCheckOut: () => void;
  viewMode?: 'classic' | 'explorer';
  onToggleViewMode?: () => void;
  onToggleSearch?: () => void;
  isSearchActive?: boolean;
  hasArchive: boolean;
  hasSelection: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  os,
  onNew,
  onOpen,
  onFavorites,
  onAdd,
  onExtract,
  onView,
  onCheckOut,
  viewMode = 'classic',
  onToggleViewMode,
  onToggleSearch,
  isSearchActive = false,
  hasArchive,
  hasSelection,
}) => {
  return (
    <div
      className={`w-full h-[54px] flex items-center px-2 border-b select-none transition-colors duration-200 shrink-0 overflow-hidden ${
        os === 'macos'
          ? 'bg-[#fbfbfd] dark:bg-[#1c1c1f] border-neutral-200 dark:border-neutral-800'
          : os === 'linux'
          ? 'bg-[#2f2a3a] border-[#221e2c]'
          : 'bg-[#fafafa] dark:bg-[#1c1c1c] border-neutral-200 dark:border-neutral-800'
      }`}
    >
      {/* Functional Main Toolbar: New, Open, Favorites | Add, Extract, View, CheckOut */}
      <div className="flex items-center gap-0.5">
        {/* 1. NEW */}
        <button
          type="button"
          onClick={onNew}
          title="Create a new archive with optional encryption (Ctrl+N / ⌘N)"
          className="w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 transition-all cursor-pointer shrink-0"
        >
          <NewArchiveIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            New
          </span>
        </button>

        {/* 2. OPEN */}
        <button
          type="button"
          onClick={onOpen}
          title="Open archive from computer (File Explorer / Finder) (Ctrl+O / ⌘O)"
          className="w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 transition-all cursor-pointer shrink-0"
        >
          <OpenArchiveIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            Open
          </span>
        </button>

        {/* Section Divider */}
        <div className="h-7 w-px bg-neutral-300/80 dark:bg-neutral-700 mx-1 shrink-0" />

        {/* 4. ADD */}
        <button
          type="button"
          onClick={onAdd}
          title="Add files to archive (Ctrl+A / ⌘A)"
          className="w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 transition-all cursor-pointer shrink-0"
        >
          <AddFilesIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            Add
          </span>
        </button>

        {/* 5. EXTRACT */}
        <button
          type="button"
          disabled={!hasArchive}
          onClick={onExtract}
          title="Extract files from archive (Ctrl+E / ⌘E)"
          className={`w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded transition-all shrink-0 ${
            hasArchive
              ? 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 cursor-pointer'
              : 'opacity-35 cursor-not-allowed grayscale'
          }`}
        >
          <ExtractFilesIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            Extract
          </span>
        </button>

        {/* 6. VIEW */}
        <button
          type="button"
          onClick={onView}
          title="View selected file or first file (Ctrl+V / F3)"
          className="w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 transition-all cursor-pointer shrink-0"
        >
          <ViewFileIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            View
          </span>
        </button>

        {/* 7. CHECKOUT */}
        <button
          type="button"
          disabled={!hasArchive}
          onClick={onCheckOut}
          title="CheckOut archive files to staging folder"
          className={`w-[54px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded transition-all shrink-0 ${
            hasArchive
              ? 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 cursor-pointer'
              : 'opacity-35 cursor-not-allowed grayscale'
          }`}
        >
          <CheckOutIcon os={os} size={26} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            CheckOut
          </span>
        </button>

        {/* Section Divider */}
        <div className="h-7 w-px bg-neutral-300/80 dark:bg-neutral-700 mx-1 shrink-0" />

        {/* 8. VIEW MODE TOGGLE (Classic View vs Explorer View) */}
        <button
          type="button"
          onClick={onToggleViewMode}
          title={`Switch to ${viewMode === 'classic' ? 'Explorer View (Two-Pane Folder Tree)' : 'Classic View (Flat List)'}`}
          className="w-[54px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700 transition-all cursor-pointer shrink-0"
        >
          <ViewModeToggleIcon os={os} viewMode={viewMode} size={24} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            {viewMode === 'classic' ? 'Classic' : 'Explorer'}
          </span>
        </button>

        {/* 9. SEARCH / FILTER (After Classic Icon) */}
        <button
          type="button"
          onClick={onToggleSearch}
          title="Search & filter archive entries (Ctrl+F / ⌘F)"
          className={`w-[50px] h-[46px] flex flex-col items-center justify-center py-0.5 px-0.5 rounded transition-all cursor-pointer shrink-0 ${
            isSearchActive
              ? 'bg-blue-100 dark:bg-blue-950/60 ring-1 ring-blue-500/50 shadow-xs'
              : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700'
          }`}
        >
          <SearchToolIcon os={os} size={24} />
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 truncate w-full text-center leading-tight">
            Search
          </span>
        </button>
      </div>
    </div>
  );
};
