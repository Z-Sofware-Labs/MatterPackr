import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArchiveFile, PlatformOS } from '../types/winzip';
import { formatNumber } from '../utils/crc32';
import { FileTypeIcon, getFriendlyFileTypeName } from './FileTypeIcons';
import { AppLogoIcon } from './PlatformIcons';

interface FileListProps {
  os: PlatformOS;
  files: ArchiveFile[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onDoubleClick: (file: ArchiveFile) => void;
  onContextMenuAction: (action: 'view' | 'extract' | 'encrypt' | 'delete' | 'properties', file: ArchiveFile) => void;
  onFilesDropped: (files: FileList | File[]) => void;
  showFilter?: boolean;
  onCloseFilter?: () => void;
  showCheckboxes?: boolean;
  viewMode?: 'classic' | 'explorer';
  archiveName?: string;
}

type SortField = 'name' | 'type' | 'date' | 'size' | 'ratio' | 'packedSize' | 'crc32' | 'path';

export const FileList: React.FC<FileListProps> = ({
  os,
  files,
  selectedIds,
  onSelect,
  onDoubleClick,
  onContextMenuAction,
  onFilesDropped,
  showFilter = false,
  onCloseFilter,
  showCheckboxes = false,
  viewMode = 'classic',
  archiveName = 'Archive',
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: ArchiveFile } | null>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [flashKey, setFlashKey] = useState<number>(0);
  const prevShowFilterRef = useRef<boolean>(showFilter);
  const [selectedFolder, setSelectedFolder] = useState<string>('__ALL__');
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Auto-focus input and trigger flash when filter is opened
  useEffect(() => {
    if (showFilter) {
      if (!prevShowFilterRef.current) {
        setFlashKey((k) => k + 1);
      }
      setTimeout(() => {
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }, 50);
    } else {
      setSearchQuery('');
    }
    prevShowFilterRef.current = showFilter;
  }, [showFilter]);

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Distinct folder paths inside archive for Explorer View
  const folderTree = useMemo(() => {
    const foldersMap = new Map<string, number>();
    files.forEach((f) => {
      const p = f.path && f.path !== '.' ? f.path.replace(/\\/g, '/').replace(/\/$/, '') : 'Root';
      foldersMap.set(p, (foldersMap.get(p) || 0) + 1);
    });

    const list: { path: string; label: string; count: number }[] = [];
    foldersMap.forEach((count, path) => {
      list.push({ path, label: path, count });
    });

    list.sort((a, b) => {
      if (a.path === 'Root') return -1;
      if (b.path === 'Root') return 1;
      return a.path.localeCompare(b.path);
    });

    return list;
  }, [files]);

  // Files filtered by selected folder (in explorer view)
  const folderFilteredFiles = useMemo(() => {
    if (viewMode === 'classic' || selectedFolder === '__ALL__') return files;
    return files.filter((f) => {
      const p = f.path && f.path !== '.' ? f.path.replace(/\\/g, '/').replace(/\/$/, '') : 'Root';
      return p === selectedFolder;
    });
  }, [files, selectedFolder, viewMode]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return folderFilteredFiles;
    const q = searchQuery.toLowerCase();
    return folderFilteredFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.crc32.toLowerCase().includes(q)
    );
  }, [folderFilteredFiles, searchQuery]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortField === 'type') comparison = (a.type || getFriendlyFileTypeName(a.name)).localeCompare(b.type || getFriendlyFileTypeName(b.name));
      else if (sortField === 'date') comparison = a.date.localeCompare(b.date);
      else if (sortField === 'size') comparison = a.size - b.size;
      else if (sortField === 'packedSize') comparison = a.packedSize - b.packedSize;
      else if (sortField === 'ratio') comparison = a.ratio - b.ratio;
      else if (sortField === 'crc32') comparison = a.crc32.localeCompare(b.crc32);
      else if (sortField === 'path') comparison = a.path.localeCompare(b.path);
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredFiles, sortField, sortAsc]);

  // Handle master header checkbox state (indeterminate or checked)
  const isAllVisibleSelected = sortedFiles.length > 0 && sortedFiles.every((f) => selectedIds.includes(f.id));
  const isSomeVisibleSelected = sortedFiles.some((f) => selectedIds.includes(f.id)) && !isAllVisibleSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeVisibleSelected;
    }
  }, [isSomeVisibleSelected]);

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect visible files
      const visibleIds = new Set(sortedFiles.map((f) => f.id));
      onSelect(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all visible files
      const visibleIds = sortedFiles.map((f) => f.id);
      onSelect(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const handleRowCheckboxToggle = (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((item) => item !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  // Marquee selection box state
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const mouseDownInfoRef = useRef<{
    clientX: number;
    clientY: number;
    isCtrlOrCmd: boolean;
    initialSelectedIds: string[];
  } | null>(null);

  const isDraggingMarqueeRef = useRef<boolean>(false);
  const justFinishedMarqueeRef = useRef<boolean>(false);
  const [anchorId, setAnchorId] = useState<string | null>(null);

  // Keyboard shortcut listener: Ctrl+A / ⌘A to select all, Esc to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (sortedFiles.length > 0) {
          onSelect(sortedFiles.map((f) => f.id));
        }
      } else if (e.key === 'Escape') {
        onSelect([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedFiles, onSelect]);

  // Window listeners for smooth marquee drag selection across rows and outside viewport
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDownInfoRef.current) return;

      const dx = e.clientX - mouseDownInfoRef.current.clientX;
      const dy = e.clientY - mouseDownInfoRef.current.clientY;

      if (!isDraggingMarqueeRef.current) {
        if (Math.hypot(dx, dy) >= 4) {
          isDraggingMarqueeRef.current = true;
        }
      }

      if (isDraggingMarqueeRef.current) {
        setSelectionBox({
          startX: mouseDownInfoRef.current.clientX,
          startY: mouseDownInfoRef.current.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
        });

        // Compute intersecting rows using screen AABB collision
        const boxLeft = Math.min(mouseDownInfoRef.current.clientX, e.clientX);
        const boxRight = Math.max(mouseDownInfoRef.current.clientX, e.clientX);
        const boxTop = Math.min(mouseDownInfoRef.current.clientY, e.clientY);
        const boxBottom = Math.max(mouseDownInfoRef.current.clientY, e.clientY);

        const rows = tableContainerRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-file-id]');
        if (rows) {
          const intersectedIds: string[] = [];
          rows.forEach((row) => {
            const rect = row.getBoundingClientRect();
            const intersects = !(
              boxRight < rect.left ||
              boxLeft > rect.right ||
              boxBottom < rect.top ||
              boxTop > rect.bottom
            );
            if (intersects) {
              const id = row.getAttribute('data-file-id');
              if (id) intersectedIds.push(id);
            }
          });

          if (mouseDownInfoRef.current.isCtrlOrCmd) {
            // Union with initial selection
            const combined = Array.from(
              new Set([...mouseDownInfoRef.current.initialSelectedIds, ...intersectedIds])
            );
            onSelect(combined);
          } else {
            onSelect(intersectedIds);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (!mouseDownInfoRef.current) return;

      if (isDraggingMarqueeRef.current) {
        isDraggingMarqueeRef.current = false;
        justFinishedMarqueeRef.current = true;
        setSelectionBox(null);
        setTimeout(() => {
          justFinishedMarqueeRef.current = false;
        }, 60);
      }
      mouseDownInfoRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onSelect]);

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary click initiates drag

    const target = e.target as HTMLElement;
    // Don't initiate selection box when interacting with header controls, inputs, or buttons
    if (
      target.closest('thead') ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }

    mouseDownInfoRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      isCtrlOrCmd: e.ctrlKey || e.metaKey,
      initialSelectedIds: selectedIds,
    };
    isDraggingMarqueeRef.current = false;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (justFinishedMarqueeRef.current) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('tr[data-file-id]') ||
      target.closest('thead') ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }
    // Clicking empty background without Ctrl/Cmd clears the selection
    if (!e.ctrlKey && !e.metaKey) {
      onSelect([]);
    }
  };

  const handleRowClick = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) {
        onSelect(selectedIds.filter((item) => item !== id));
      } else {
        onSelect([...selectedIds, id]);
      }
      setAnchorId(id);
    } else if (e.shiftKey && sortedFiles.length > 0) {
      const effectiveAnchor = anchorId || (selectedIds.length > 0 ? selectedIds[0] : sortedFiles[0].id);
      const anchorIndex = sortedFiles.findIndex((f) => f.id === effectiveAnchor);
      const currentIndex = sortedFiles.findIndex((f) => f.id === id);
      const start = Math.min(anchorIndex >= 0 ? anchorIndex : 0, currentIndex >= 0 ? currentIndex : 0);
      const end = Math.max(anchorIndex >= 0 ? anchorIndex : 0, currentIndex >= 0 ? currentIndex : 0);
      const rangeIds = sortedFiles.slice(start, end + 1).map((f) => f.id);
      onSelect(Array.from(new Set([...selectedIds, ...rangeIds])));
    } else {
      onSelect([id]);
      setAnchorId(id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: ArchiveFile) => {
    e.preventDefault();
    if (!selectedIds.includes(file.id)) {
      onSelect([file.id]);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesDropped(e.dataTransfer.files);
    }
  };

  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const getSelectionBg = () => {
    if (os === 'macos') return 'bg-[#007aff] text-white';
    if (os === 'linux') return 'bg-[#3584e4] text-white';
    return 'bg-[#0067b8] text-white'; // Windows 11 Fluent Blue
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 bg-white dark:bg-[#18181b] flex flex-col min-h-[300px] overflow-hidden select-none"
    >
      {/* Modern Filter / Search Bar (Optional: Appears when chosen from menu or shortcut Ctrl+F/⌘F) */}
      {showFilter && (
        <div
          key={`filter-bar-${flashKey}`}
          className="animate-filter-flash flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/80 backdrop-blur-sm text-xs shrink-0 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-neutral-400">🔍</span>
            <input
              ref={filterInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else if (onCloseFilter) {
                    onCloseFilter();
                  }
                }
              }}
              placeholder="Filter files by name, path, type (Esc to dismiss)..."
              className="w-full bg-transparent outline-none text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer text-xs px-1"
                title="Clear filter text"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-neutral-500 text-[11px]">
            <span>
              Showing <strong className="text-neutral-800 dark:text-neutral-200 font-mono tabular-nums">{sortedFiles.length}</strong> of{' '}
              <strong className="text-neutral-800 dark:text-neutral-200 font-mono tabular-nums">{files.length}</strong> entries
            </span>
            {selectedIds.length > 0 && (
              <span>
                · <strong className="text-blue-600 dark:text-blue-400 font-mono tabular-nums">{selectedIds.length}</strong> selected
              </span>
            )}
            {onCloseFilter && (
              <button
                type="button"
                onClick={onCloseFilter}
                className="ml-2 px-1.5 py-0.5 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer text-xs"
                title="Close filter bar (Esc)"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modern Drag and Drop Active Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-[2px] border-2 border-dashed border-blue-500 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <div className="bg-white dark:bg-[#202020] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-2 max-w-md border border-blue-200 dark:border-blue-900">
            <span className="text-4xl animate-bounce">🗜️</span>
            <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              Drop Files to Compress with Multi-Threading
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Files will be parallelized across active CPU worker threads with optional AES-256 encryption.
            </span>
          </div>
        </div>
      )}

      {/* If no archive is opened or created, show the welcome message centered on the main UI */}
      {!archiveName ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none min-h-[300px]">
          <div className="flex flex-col items-center justify-center gap-3 max-w-md">
            <AppLogoIcon os={os} size={64} className="drop-shadow-md" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Create a new archive or open an existing one to begin.
            </p>
          </div>
        </div>
      ) : (
        /* Main Container: Flat layout (Classic View) or Two-Pane Split Layout (Explorer View) */
        <div className="flex-1 flex overflow-hidden">
        {/* Explorer Left Folder Tree Pane */}
        {viewMode === 'explorer' && (
          <div
            className={`w-52 shrink-0 border-r flex flex-col select-none overflow-y-auto text-xs transition-colors ${
              os === 'macos'
                ? 'bg-[#f6f6f8]/85 dark:bg-[#1a1a1e]/85 border-neutral-200 dark:border-neutral-800'
                : os === 'linux'
                ? 'bg-[#211d2c] border-[#181422] text-[#deddda]'
                : 'bg-[#f9f9fb] dark:bg-[#161618] border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {/* Explorer Tree Header */}
            <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-[11px] text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>Folders</span>
              <span className="text-[10px] lowercase opacity-75">{folderTree.length} paths</span>
            </div>

            {/* Folder Tree Items */}
            <div className="p-1.5 space-y-0.5">
              {/* Root / All files node */}
              <button
                type="button"
                onClick={() => setSelectedFolder('__ALL__')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                  selectedFolder === '__ALL__'
                    ? 'bg-blue-600 text-white font-medium shadow-xs'
                    : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">🗜️</span>
                  <span className="truncate">{archiveName} (All)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                    selectedFolder === '__ALL__'
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {files.length}
                </span>
              </button>

              {/* Subfolders */}
              {folderTree.map((item) => {
                const isSelected = selectedFolder === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setSelectedFolder(item.path)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">📁</span>
                      <span className="truncate font-mono text-[11px]">{item.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* High-Density Data Grid Table Container with Marquee Drag Support */}
        <div
          ref={tableContainerRef}
          onMouseDown={handleContainerMouseDown}
          onClick={handleContainerClick}
          className="flex-1 overflow-auto flex flex-col relative select-none cursor-default"
        >
          {/* Breadcrumb banner in Explorer Mode when a specific folder is chosen */}
          {viewMode === 'explorer' && selectedFolder !== '__ALL__' && (
            <div className="px-3 py-1 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300 shrink-0">
              <span className="flex items-center gap-1.5 font-medium">
                <span>📁 Folder:</span>
                <span className="font-mono bg-blue-100 dark:bg-blue-900/80 px-1.5 py-0.5 rounded text-[11px]">
                  {selectedFolder}
                </span>
                <span>({sortedFiles.length} items)</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedFolder('__ALL__')}
                className="text-[11px] underline hover:text-blue-600 cursor-pointer"
              >
                Show all files
              </button>
            </div>
          )}

          <table className="w-full border-collapse text-left text-xs font-sans">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
              <tr>
                {/* Optional Checkbox Column */}
                {showCheckboxes && (
                  <th className="w-8 px-2.5 py-2 text-center whitespace-nowrap">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleToggleSelectAll}
                      title="Select or deselect all visible files"
                      className="rounded text-blue-600 cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                )}
                <th
                  onClick={() => handleHeaderClick('name')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap min-w-[200px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Filename</span>
                    {sortField === 'name' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('type')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap min-w-[120px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    {sortField === 'type' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('date')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap min-w-[95px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Modified</span>
                    {sortField === 'date' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('size')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap text-right min-w-[85px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Size</span>
                    {sortField === 'size' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('ratio')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap text-right min-w-[70px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Ratio</span>
                    {sortField === 'ratio' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('packedSize')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap text-right min-w-[85px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Packed</span>
                    {sortField === 'packedSize' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderClick('crc32')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap text-center min-w-[85px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>CRC-32</span>
                    {sortField === 'crc32' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th className="px-3 py-2 cursor-default font-semibold whitespace-nowrap text-center min-w-[90px]">
                  Encryption
                </th>
                <th
                  onClick={() => handleHeaderClick('path')}
                  className="px-3 py-2 cursor-pointer font-semibold hover:text-black dark:hover:text-white transition-colors whitespace-nowrap min-w-[110px]"
                >
                  <div className="flex items-center justify-between">
                    <span>Path</span>
                    {sortField === 'path' && <span className="text-blue-500">{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            {sortedFiles.length > 0 && (
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {sortedFiles.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <tr
                      key={file.id}
                      data-file-id={file.id}
                      onClick={(e) => {
                        if (justFinishedMarqueeRef.current) return;
                        handleRowClick(e, file.id);
                      }}
                      onDoubleClick={() => onDoubleClick(file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? getSelectionBg()
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {/* Optional Selection Checkbox */}
                      {showCheckboxes && (
                        <td
                          className="w-8 px-2.5 py-1.5 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowCheckboxToggle(e, file.id)}
                            className="rounded text-blue-600 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                      )}

                      {/* Name / Filename */}
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileTypeIcon
                            fileName={file.name}
                            isDirectory={file.isDirectory}
                            isEncrypted={file.encrypted}
                            os={os}
                            size={18}
                          />
                          <span className="font-medium tracking-tight">{file.name}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-neutral-600 dark:text-neutral-400">
                        {file.type || getFriendlyFileTypeName(file.name)}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono tabular-nums text-[11px] opacity-80">
                        {file.date} {file.time}
                      </td>

                      {/* Size */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono tabular-nums text-right text-[11px]">
                        {formatNumber(file.size)}
                      </td>

                      {/* Ratio */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono tabular-nums text-right text-[11px]">
                        {file.ratio}%
                      </td>

                      {/* Packed */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono tabular-nums text-right text-[11px]">
                        {formatNumber(file.packedSize)}
                      </td>

                      {/* CRC-32 */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono tabular-nums text-center text-[11px] opacity-90">
                        {file.crc32}
                      </td>

                      {/* Encryption */}
                      <td className="px-3 py-1.5 whitespace-nowrap text-center text-[10.5px]">
                        {file.encrypted ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {file.encryptionMethod === 'aes-256'
                              ? 'AES-256'
                              : file.encryptionMethod === 'aes-128'
                              ? 'AES-128'
                              : 'Zip 2.0'}
                          </span>
                        ) : (
                          <span className="opacity-30">-</span>
                        )}
                      </td>

                      {/* Path */}
                      <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[11px] opacity-60">
                        {file.path || '.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>

          {/* Centered Empty Archive or Search Empty State */}
          {sortedFiles.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none min-h-[300px]">
              <div className="flex flex-col items-center justify-center gap-3 max-w-md">
                {searchQuery ? (
                  <>
                    <span className="text-4xl opacity-40">🔍</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      No matching files found
                    </span>
                    <span className="text-xs text-neutral-500 max-w-sm">
                      Try clearing the search query or adding new files.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl opacity-40">🗜️</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Archive is empty
                    </span>
                    <span className="text-xs text-neutral-500 max-w-sm">
                      Click 'Add' on the toolbar or drag and drop files here to add them to this archive.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Marquee Drag Selection Box Overlay */}
          {selectionBox && tableContainerRef.current && (() => {
            const containerRect = tableContainerRef.current.getBoundingClientRect();
            const left = Math.min(selectionBox.startX, selectionBox.currentX) - containerRect.left + tableContainerRef.current.scrollLeft;
            const top = Math.min(selectionBox.startY, selectionBox.currentY) - containerRect.top + tableContainerRef.current.scrollTop;
            const width = Math.abs(selectionBox.currentX - selectionBox.startX);
            const height = Math.abs(selectionBox.currentY - selectionBox.startY);

            return (
              <div
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                }}
                className={`absolute pointer-events-none z-30 transition-none ${
                  os === 'macos'
                    ? 'bg-[#007aff]/20 border border-[#007aff]/60 rounded-xs shadow-xs'
                    : os === 'linux'
                    ? 'bg-[#3584e4]/20 border border-[#3584e4]/60'
                    : 'bg-[#0067b8]/20 border border-[#0067b8]/60 shadow-xs'
                }`}
              />
            );
          })()}

          {/* Draggable empty area filling the remaining vertical space */}
          {sortedFiles.length > 0 && (
            <div className="flex-1 min-h-[60px]" data-empty-space="true" />
          )}
        </div>
      </div>
      )}

      {/* Modern Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-48 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 py-1 text-neutral-800 dark:text-neutral-200 text-xs select-none"
        >
          <button
            onClick={() => onContextMenuAction('view', contextMenu.file)}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
          >
            <FileTypeIcon
              fileName={contextMenu.file.name}
              isDirectory={contextMenu.file.isDirectory}
              isEncrypted={contextMenu.file.encrypted}
              os={os}
              size={16}
            />
            <span>View File ({contextMenu.file.name})</span>
          </button>
          <button
            onClick={() => onContextMenuAction('extract', contextMenu.file)}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <span>📂</span>
            <span>Extract Selected...</span>
          </button>
          <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
          <button
            onClick={() => onContextMenuAction('encrypt', contextMenu.file)}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <span>🔒</span>
            <span>Encrypt with AES-256...</span>
          </button>
          <button
            onClick={() => onContextMenuAction('delete', contextMenu.file)}
            className="w-full text-left px-3 py-1.5 hover:bg-red-500 hover:text-white flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
          >
            <span>🗑️</span>
            <span>Delete from Archive</span>
          </button>
          <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
          <button
            onClick={() => onContextMenuAction('properties', contextMenu.file)}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white flex items-center gap-2 cursor-pointer"
          >
            <span>ℹ️</span>
            <span>Properties...</span>
          </button>
        </div>
      )}
    </div>
  );
};
