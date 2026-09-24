import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import matterpackrIcon from './assets/matterpackr-icon.png';
import zSoftwareLabsIcon from './assets/z-software-labs-icon.svg';
import zipIcon from './assets/filetypes/zip.svg';
import sevenZipIcon from './assets/filetypes/7z.svg';
import tarIcon from './assets/filetypes/tar.svg';
import tgzIcon from './assets/filetypes/tgz.svg';
import tbz2Icon from './assets/filetypes/tbz2.svg';
import txzIcon from './assets/filetypes/txz.svg';
import gzIcon from './assets/filetypes/gz.svg';
import bz2Icon from './assets/filetypes/bz2.svg';
import rarIcon from './assets/filetypes/rar.svg';
import cabIcon from './assets/filetypes/cab.svg';
import isoIcon from './assets/filetypes/iso.svg';
import imgIcon from './assets/filetypes/img.svg';
import cpioIcon from './assets/filetypes/cpio.svg';
import arIcon from './assets/filetypes/ar.svg';
import diskMasterIcon from './assets/filetypes/disk-master.svg';
import archiveMasterIcon from './assets/filetypes/archive-master.svg';
import { version as appVersion } from '../package.json';
import { attachConsole, error as logError, info as logInfo, warn as logWarn } from '@tauri-apps/plugin-log';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Archive, ChevronDown, ChevronRight, Download, Eye, FileClock, FilePlus, FileText, FolderOpen, FolderUp, Image, Info, LoaderCircle,
  Minus, Moon, Package, Plus, Search, Settings, Shield, Square, Sun, Trash2, X, MoreHorizontal, RefreshCw, CheckCircle2, AlertCircle, CheckSquare
} from 'lucide-react';
import { checkForAppUpdate, downloadAndInstallUpdate, type UpdateInfo } from './lib/updater';
import type { ArchiveCapabilities, ArchiveEntry, ArchiveFormatInfo, ArchiveType, Compression, ConflictMode } from './lib/fileSystem';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import {
  addFiles, applyFileAssociations, browseForArchivePath, checkArchiveEncryption, checkConflicts, checkIsLinux, chooseArchive, chooseArchiveOrImage, chooseExtractionDirectory,
  chooseInputFiles, createArchive, ensureExtractionDestination, extractArchive, extractImage, getCapabilities, getCliOpenPath, getFileAssociations, getFormatCatalog, openArchive, openExternalUrl, prepareDragExtraction, removeEntries, testArchive, viewArchiveEntry
} from './lib/fileSystem';

type SortKey = keyof ArchiveEntry;
type LogLevel = 'info' | 'warn' | 'error';
type LogEntry = { id: number; time: string; level: LogLevel; message: string };

const appWindow = getCurrentWindow();

// Forward Rust/Tauri log records to the WebView developer console while developing.
// This makes backend failures (including View/extraction failures) visible alongside
// the normal frontend console output.

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[i]}`;
};

const getFileIconSrc = (name: string): string | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return tgzIcon;
  if (lower.endsWith('.tar.bz2') || lower.endsWith('.tbz2')) return tbz2Icon;
  if (lower.endsWith('.tar.xz') || lower.endsWith('.txz')) return txzIcon;
  if (lower.endsWith('.tar.zst') || lower.endsWith('.zst')) return archiveMasterIcon;
  if (lower.endsWith('.zip')) return zipIcon;
  if (lower.endsWith('.7z')) return sevenZipIcon;
  if (lower.endsWith('.tar')) return tarIcon;
  if (lower.endsWith('.gz')) return gzIcon;
  if (lower.endsWith('.bz2')) return bz2Icon;
  if (lower.endsWith('.rar')) return rarIcon;
  if (lower.endsWith('.cab')) return cabIcon;
  if (lower.endsWith('.iso')) return isoIcon;
  if (lower.endsWith('.img')) return imgIcon;
  if (lower.endsWith('.cpio')) return cpioIcon;
  if (lower.endsWith('.ar') || lower.endsWith('.a')) return arIcon;
  if (lower.endsWith('.bin') || lower.endsWith('.cue') || lower.endsWith('.mdf') || lower.endsWith('.mds')) return diskMasterIcon;
  return null;
};

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

export const SUPPORTED_ASSOCIATIONS = [
  { ext: 'zip', name: 'ZIP Archive', extLabel: '.zip', icon: zipIcon },
  { ext: '7z', name: '7-Zip Archive', extLabel: '.7z', icon: sevenZipIcon },
  { ext: 'rar', name: 'RAR Archive', extLabel: '.rar', icon: rarIcon },
  { ext: 'tar', name: 'TAR Archive', extLabel: '.tar', icon: tarIcon },
  { ext: 'tgz', name: 'GZ Compressed TAR', extLabel: '.tgz', icon: tgzIcon },
  { ext: 'tbz2', name: 'BZip2 Compressed TAR', extLabel: '.tbz2', icon: tbz2Icon },
  { ext: 'txz', name: 'XZ Compressed TAR', extLabel: '.txz', icon: txzIcon },
  { ext: 'gz', name: 'GZip File', extLabel: '.gz', icon: gzIcon },
  { ext: 'bz2', name: 'BZip2 File', extLabel: '.bz2', icon: bz2Icon },
  { ext: 'iso', name: 'ISO Disk Image', extLabel: '.iso', icon: isoIcon },
  { ext: 'img', name: 'Disk Image', extLabel: '.img', icon: imgIcon },
  { ext: 'cab', name: 'Cabinet Archive', extLabel: '.cab', icon: cabIcon },
  { ext: 'cpio', name: 'CPIO Archive', extLabel: '.cpio', icon: cpioIcon },
  { ext: 'ar', name: 'UNIX Archive', extLabel: '.ar', icon: arIcon },
];

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  entry?: ArchiveEntry;
  children: TreeNode[];
};

type ArchiveTreeIndex = {
  roots: TreeNode[];
  byPath: Map<string, TreeNode>;
  flatList: TreeNode[];
};

const normalizeArchivePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

function buildArchiveTreeAndIndex(entries: ArchiveEntry[]): ArchiveTreeIndex {
  const roots: TreeNode[] = [];
  const byPath = new Map<string, TreeNode>();
  const flatList: TreeNode[] = [];

  const ensureDirectory = (parts: string[]) => {
    let parentChildren = roots;
    let currentPath = '';
    let node: TreeNode | undefined;
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      node = byPath.get(currentPath);
      if (!node) {
        node = { name: part, path: currentPath, isDir: true, children: [] };
        byPath.set(currentPath, node);
        parentChildren.push(node);
        flatList.push(node);
      }
      parentChildren = node.children;
    }
    return node;
  };

  for (const entry of entries) {
    const normalized = normalizeArchivePath(entry.name);
    if (!normalized) continue;
    const parts = normalized.split('/').filter(Boolean);
    const name = parts.pop()!;
    const parent = parts.length ? ensureDirectory(parts) : undefined;
    const children = parent ? parent.children : roots;
    const path = parts.length ? `${parts.join('/')}/${name}` : name;
    let node = byPath.get(path);
    if (!node) {
      node = { name, path, isDir: entry.isDir, entry, children: [] };
      byPath.set(path, node);
      children.push(node);
      flatList.push(node);
    } else {
      node.isDir = entry.isDir || node.isDir;
      node.entry = entry;
    }
  }

  return { roots, byPath, flatList };
}

function sortNodes(nodes: TreeNode[], sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    if (!sortConfig) return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    const av = a.entry?.[sortConfig.key];
    const bv = b.entry?.[sortConfig.key];
    if (sortConfig.key === 'name' || sortConfig.key === 'kind') {
      const result = String(av ?? a.name).localeCompare(String(bv ?? b.name), undefined, { numeric: true, sensitivity: 'base' });
      return result * (sortConfig.direction === 'asc' ? 1 : -1);
    }
    if (sortConfig.key === 'modified') {
      const aValue = String(av ?? '');
      const bValue = String(bv ?? '');
      if (aValue === bValue) return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return aValue.localeCompare(bValue) * (sortConfig.direction === 'asc' ? 1 : -1);
    }
    const aValue = Number(av ?? 0);
    const bValue = Number(bv ?? 0);
    if (aValue === bValue) return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    return (aValue < bValue ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1);
  });
}

export default function App() {
  const [files, setFiles] = useState<ArchiveEntry[]>([]);
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [showCheckboxes, setShowCheckboxes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('matterpackr.showCheckboxes');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleShowCheckboxes = useCallback(() => {
    setShowCheckboxes(prev => {
      const next = !prev;
      try {
        localStorage.setItem('matterpackr.showCheckboxes', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [activeModal, setActiveModal] = useState<'new' | 'options' | 'about' | 'extract' | 'update' | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready');
  const [compression, setCompression] = useState<Compression>('Normal');
  const [archiveType, setArchiveType] = useState<ArchiveType>('zip');
  const [newArchivePath, setNewArchivePath] = useState('');
  const [extractSource, setExtractSource] = useState<string | null>(null);
  const [extractDestination, setExtractDestination] = useState('');
  const [encryptArchive, setEncryptArchive] = useState(false);
  const [archivePassword, setArchivePassword] = useState('');
  const [confirmArchivePassword, setConfirmArchivePassword] = useState('');
  const [extractPassword, setExtractPassword] = useState('');
  const [openPassword, setOpenPassword] = useState<string | undefined>(undefined);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<{ source: string; dir: string } | null>(null);
  const [conflictPrompt, setConflictPrompt] = useState<{
    source: string;
    dir: string;
    password?: string;
    isImage?: boolean;
    conflicts: string[];
  } | null>(null);
  const [fileAssociations, setFileAssociations] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('matterpackr.fileAssociations') || localStorage.getItem('shrinkr.fileAssociations') || 'null');
      return saved ?? Object.fromEntries(SUPPORTED_ASSOCIATIONS.map(item => [item.ext, true]));
    } catch {
      return Object.fromEntries(SUPPORTED_ASSOCIATIONS.map(item => [item.ext, true]));
    }
  });
  const [assocStatus, setAssocStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [savingAssoc, setSavingAssoc] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ downloaded: number; total: number | null } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ type: 'idle' | 'available' | 'latest' | 'error'; message: string; update?: UpdateInfo } | null>(null);

  const [isLinux, setIsLinux] = useState(() => {
    return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('linux');
  });

  useEffect(() => {
    let detach: (() => void) | undefined;
    void attachConsole().then(unlisten => { detach = unlisten; });
    return () => { detach?.(); };
  }, []);
  const [capabilities, setCapabilities] = useState<ArchiveCapabilities | null>(null);
  const [formatCatalog, setFormatCatalog] = useState<ArchiveFormatInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [pendingView, setPendingView] = useState<{ archive: string; entryPath: string; name: string } | null>(null);
  const [viewPassword, setViewPassword] = useState('');
  const [dragOverlay, setDragOverlay] = useState<{
    status: 'disallowed' | 'allowed';
    x?: number;
    y?: number;
  } | null>(null);

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const isMouseDownRef = useRef(false);
  const mouseDownPosRef = useRef<{ clientX: number; clientY: number; target: EventTarget | null } | null>(null);
  const initialSelectionRef = useRef<string[]>([]);
  const isBoxSelectingRef = useRef(false);



  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const applySystemTheme = async () => {
      try {
        const systemTheme = await appWindow.theme();
        if (!disposed && systemTheme) {
          setTheme(systemTheme);
        }
      } catch {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
        if (!disposed) setTheme(prefersDark ? 'dark' : 'light');
      }
    };

    applySystemTheme();
    appWindow.onThemeChanged(({ payload }) => {
      if (!disposed) setTheme(payload);
    }).then(listener => {
      unlisten = listener;
    }).catch(() => { /* system theme sync is best-effort */ });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    getFormatCatalog().then(setFormatCatalog).catch(error => {
      void appendLog('error', `Could not load archive format catalog: ${String(error)}`);
    });
    getCliOpenPath().then(initialPath => {
      if (initialPath) {
        void run(async () => refresh(initialPath), `Opened ${initialPath.split(/[\\/]/).pop()}`);
      }
    }).catch(() => { });
    checkIsLinux().then(linux => {
      setIsLinux(linux);
    }).catch(() => { });
  }, []);

  const appendLog = async (level: LogLevel, text: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(current => [...current.slice(-199), { id: Date.now() + Math.random(), time, level, message: text }]);
    try {
      if (level === 'error') await logError(text);
      else if (level === 'warn') await logWarn(text);
      else await logInfo(text);
    } catch { /* logging must never interrupt an archive operation */ }
  };

  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 120);
    return () => clearTimeout(handler);
  }, [query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const createFormats = useMemo(() => formatCatalog.filter(format => format.canCreate), [formatCatalog]);
  const extractFormats = useMemo(() => formatCatalog.filter(format => format.canExtract && format.implemented), [formatCatalog]);
  const plannedExtractOnlyFormats = useMemo(() => formatCatalog.filter(format => !format.implemented && !format.canCreate && !format.canAdd && !format.canRemove), [formatCatalog]);
  const selectedCreateFormat = useMemo(() => formatCatalog.find(format => format.id === archiveType), [formatCatalog, archiveType]);

  const { roots: archiveTree, byPath: nodeByPath, flatList: allArchiveNodes } = useMemo(() => {
    return buildArchiveTreeAndIndex(files);
  }, [files]);

  const archiveFileName = useMemo(() => {
    if (!archivePath) return '';
    const clean = archivePath.replace(/\\/g, '/');
    return clean.substring(clean.lastIndexOf('/') + 1);
  }, [archivePath]);

  const pathSegments = useMemo(() => {
    return currentPath ? currentPath.split('/').filter(Boolean) : [];
  }, [currentPath]);

  const currentDirectoryNode = useMemo(() => {
    if (!currentPath) return null;
    return nodeByPath.get(currentPath) ?? null;
  }, [nodeByPath, currentPath]);

  const currentItems = useMemo(() => {
    let items: TreeNode[];
    if (debouncedQuery) {
      const needle = debouncedQuery.toLowerCase();
      items = allArchiveNodes.filter(n => n.name.toLowerCase().includes(needle) || n.path.toLowerCase().includes(needle));
    } else if (!currentPath) {
      items = archiveTree;
    } else {
      items = currentDirectoryNode ? currentDirectoryNode.children : [];
    }
    return sortNodes(items, sortConfig);
  }, [debouncedQuery, allArchiveNodes, currentPath, archiveTree, currentDirectoryNode, sortConfig]);

  const navigateUp = () => {
    if (!currentPath) return;
    const lastSlash = currentPath.lastIndexOf('/');
    const parent = lastSlash !== -1 ? currentPath.substring(0, lastSlash) : '';
    setCurrentPath(parent);
    setSelected([]);
  };

  const handleItemDoubleClick = (node: TreeNode) => {
    if (node.isDir) {
      setCurrentPath(node.path);
      setSelected([]);
      if (query) setQuery('');
      return;
    }
    void handleView(node.path);
  };

  const currentItemsRef = useRef(currentItems);
  useEffect(() => {
    currentItemsRef.current = currentItems;
  }, [currentItems]);

  const currentPathRef = useRef(currentPath);
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const debouncedQueryRef = useRef(debouncedQuery);
  useEffect(() => {
    debouncedQueryRef.current = debouncedQuery;
  }, [debouncedQuery]);

  const ROW_HEIGHT = 36;
  const rafSelectionRef = useRef<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const onTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    if (tableWrapRef.current) {
      setViewportHeight(tableWrapRef.current.clientHeight || 600);
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.height > 0) {
            setViewportHeight(entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(tableWrapRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | globalThis.MouseEvent) => {
      if (!isMouseDownRef.current || !mouseDownPosRef.current || !tableWrapRef.current) return;

      const dx = e.clientX - mouseDownPosRef.current.clientX;
      const dy = e.clientY - mouseDownPosRef.current.clientY;

      if (!isBoxSelectingRef.current) {
        if (Math.hypot(dx, dy) >= 4) {
          isBoxSelectingRef.current = true;
          tableWrapRef.current.classList.add('is-selecting');
        } else {
          return;
        }
      }

      const clientX = e.clientX;
      const clientY = e.clientY;
      const shiftKey = e.shiftKey;
      const ctrlKey = e.ctrlKey;
      const metaKey = e.metaKey;

      if (rafSelectionRef.current !== null) {
        cancelAnimationFrame(rafSelectionRef.current);
      }

      rafSelectionRef.current = requestAnimationFrame(() => {
        rafSelectionRef.current = null;
        if (!isMouseDownRef.current || !mouseDownPosRef.current || !tableWrapRef.current) return;

        const wrap = tableWrapRef.current;
        const rect = wrap.getBoundingClientRect();
        const headerElem = wrap.querySelector<HTMLElement>('.table-head');
        const headerHeight = headerElem ? headerElem.offsetHeight : 0;
        const minContentY = wrap.scrollTop + headerHeight;

        const rawStartY = mouseDownPosRef.current.clientY - rect.top + wrap.scrollTop;
        const rawCurrentY = clientY - rect.top + wrap.scrollTop;

        const startX = mouseDownPosRef.current.clientX - rect.left + wrap.scrollLeft;
        const startY = Math.max(minContentY, rawStartY);
        const currentX = clientX - rect.left + wrap.scrollLeft;
        const currentY = Math.max(minContentY, rawCurrentY);

        setSelectionBox({ startX, startY, currentX, currentY });

        // Calculate affected rows mathematically using row height
        const boxTopY = Math.min(startY, currentY) - headerHeight;
        const boxBottomY = Math.max(startY, currentY) - headerHeight;
        const items = currentItemsRef.current;

        // If in a subfolder and not searching, the first row (ROW_HEIGHT) is the '..' parent folder row
        const hasUpRow = Boolean(currentPathRef.current && !debouncedQueryRef.current);
        const upRowOffset = hasUpRow ? ROW_HEIGHT : 0;

        const adjustedTopY = Math.max(0, boxTopY - upRowOffset);
        const adjustedBottomY = Math.max(0, boxBottomY - upRowOffset);

        const intersectingPaths: string[] = [];
        if (boxBottomY >= upRowOffset && items.length > 0) {
          const startRowIdx = Math.max(0, Math.floor(adjustedTopY / ROW_HEIGHT));
          const endRowIdx = Math.min(items.length - 1, Math.floor(adjustedBottomY / ROW_HEIGHT));

          if (endRowIdx >= startRowIdx && startRowIdx < items.length) {
            for (let i = startRowIdx; i <= endRowIdx; i++) {
              intersectingPaths.push(items[i].path);
            }
          }
        }

        const isModifier = shiftKey || ctrlKey || metaKey;
        if (isModifier) {
          const combined = new Set([...initialSelectionRef.current, ...intersectingPaths]);
          setSelected(Array.from(combined));
        } else {
          setSelected(intersectingPaths);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafSelectionRef.current !== null) {
        cancelAnimationFrame(rafSelectionRef.current);
        rafSelectionRef.current = null;
      }
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        mouseDownPosRef.current = null;
        if (isBoxSelectingRef.current) {
          setSelectionBox(null);
          if (tableWrapRef.current) {
            tableWrapRef.current.classList.remove('is-selecting');
          }
          setTimeout(() => {
            isBoxSelectingRef.current = false;
          }, 50);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (rafSelectionRef.current !== null) {
        cancelAnimationFrame(rafSelectionRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleTableWrapMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('.context-menu') ||
      target.closest('.modal-panel') ||
      target.closest('.up-row') ||
      target.closest('.table-head')
    ) {
      return;
    }

    const fileRow = target.closest('.file-row') as HTMLElement | null;
    if (fileRow) {
      const rowPath = fileRow.getAttribute('data-entry-path');
      if (rowPath && selectedSet.has(rowPath)) {
        return;
      }
    }

    isMouseDownRef.current = true;
    mouseDownPosRef.current = { clientX: e.clientX, clientY: e.clientY, target: e.target };
    initialSelectionRef.current = (e.shiftKey || e.ctrlKey || e.metaKey) ? [...selected] : [];
    isBoxSelectingRef.current = false;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        if (currentPath) {
          e.preventDefault();
          navigateUp();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath]);

  // Keep ref to latest state so onDragDropEvent callback always sees fresh values
  const dropStateRef = useRef({
    archivePath,
    canAdd: !!capabilities?.canAdd,
    selected,
    nodeByPath,
    currentPath,
    compression,
    openPassword,
  });
  useEffect(() => {
    dropStateRef.current = {
      archivePath,
      canAdd: !!capabilities?.canAdd,
      selected,
      nodeByPath,
      currentPath,
      compression,
      openPassword,
    };
  }, [archivePath, capabilities, selected, nodeByPath, currentPath, compression, openPassword]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    appWindow.onDragDropEvent((event) => {
      const payload = event.payload;
      const { archivePath: currentArchive, canAdd } = dropStateRef.current;

      // "If no archive is open, do nothing"
      if (!currentArchive) {
        setDragOverlay(null);
        return;
      }

      if (payload.type === 'enter' || payload.type === 'over') {
        const x = payload.position.x / window.devicePixelRatio;
        const y = payload.position.y / window.devicePixelRatio;
        if (!canAdd) {
          // "If the archive does not support writing, do not do anything just show a red circle"
          setDragOverlay({ status: 'disallowed', x, y });
        } else {
          // "If an archive is open and the format allows writing, add file to the current directory"
          setDragOverlay({ status: 'allowed', x, y });
        }
      } else if (payload.type === 'leave') {
        setDragOverlay(null);
      } else if (payload.type === 'drop') {
        setDragOverlay(null);
        if (!canAdd) {
          // Disallowed: do not do anything
          return;
        }

        const droppedPaths = payload.paths;
        if (!droppedPaths || droppedPaths.length === 0) return;

        const { selected: sel, nodeByPath: byPath, currentPath: curPath, compression: comp, openPassword: pwd } = dropStateRef.current;
        let targetDir: string | undefined = curPath || undefined;
        if (sel.length === 1) {
          const selectedNode = byPath.get(sel[0]);
          if (selectedNode) {
            targetDir = selectedNode.isDir ? selectedNode.path : selectedNode.path.substring(0, selectedNode.path.lastIndexOf('/'));
          }
        }

        void run(async () => {
          await appendLog('info', `Adding ${droppedPaths.length} dropped item(s) to archive${targetDir ? ` in ${targetDir}` : ''}`);
          const updated = await addFiles(currentArchive, droppedPaths, comp, pwd, targetDir);
          setFiles(updated);
        }, 'Files added');
      }
    }).then(fn => {
      unlisten = fn;
    }).catch(err => {
      console.error('Failed to register drag drop listener:', err);
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const packedSize = files.reduce((sum, f) => sum + f.compressedSize, 0);

  const refresh = async (path: string) => {
    const [entries, caps] = await Promise.all([
      openArchive(path),
      getCapabilities(path),
    ]);
    setArchivePath(path);
    setFiles(entries);
    setCapabilities(caps);
    setSelected([]);
    setCurrentPath('');
    setOpenPassword(undefined);
  };

  const run = async (action: () => Promise<void>, success = 'Done') => {
    setBusy(true); setMessage('Working…');
    await appendLog('info', success === 'Done' ? 'Operation started' : success);
    try {
      await action();
      setMessage(success);
      await appendLog('info', success);
    } catch (error) {
      const text = String(error);
      setMessage(text);
      await appendLog('error', text);
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    const path = await chooseArchive();
    if (!path) return;
    await run(async () => refresh(path), `Opened ${path.split(/[\\/]/).pop()}`);
  };

  const archiveExtension = (type: ArchiveType) => type === 'tar.gz' ? 'tar.gz' : type;
  const archiveLabel = (type: ArchiveType) => selectedCreateFormat?.label.split(' — ')[0] ?? type.toUpperCase();
  const normalizeNewArchivePath = (path: string, type: ArchiveType) => {
    const ext = archiveExtension(type);
    const lower = path.toLowerCase();
    const known = ['.tar.gz', '.tgz', '.zip', '.7z', '.tar', '.gz'];
    const current = known.find(item => lower.endsWith(item));
    if (current) return path.slice(0, -current.length) + `.${ext}`;
    return path.endsWith('.') ? `${path}${ext}` : `${path}.${ext}`;
  };
  const handleArchiveTypeChange = (type: ArchiveType) => {
    setArchiveType(type);
    setNewArchivePath(current => current ? normalizeNewArchivePath(current, type) : '');
    if (!['zip', '7z'].includes(type)) {
      setEncryptArchive(false);
      setArchivePassword('');
      setConfirmArchivePassword('');
    }
  };

  const handleNew = async () => {
    const path = newArchivePath ? normalizeNewArchivePath(newArchivePath, archiveType) : await browseForArchivePath(archiveType);
    if (!path) return;
    const inputs = await chooseInputFiles();
    if (!inputs.length) return;
    await run(async () => {
      if (encryptArchive && archivePassword !== confirmArchivePassword) throw new Error('Passwords do not match');
      if (encryptArchive && archivePassword.length < 4) throw new Error('Password must be at least 4 characters');
      const entries = await createArchive(path, inputs, compression, encryptArchive ? archivePassword : undefined);
      const caps = await getCapabilities(path);
      setArchivePath(path); setFiles(entries); setCapabilities(caps); setSelected([]); setCurrentPath(''); setActiveModal(null);
    }, 'Archive created');
  };

  const handleAdd = async () => {
    if (!archivePath) { setMessage('Open or create an archive first'); await appendLog('warn', 'Add requested without an open archive'); return; }
    if (capabilities && !capabilities.canAdd) { setMessage('This format cannot add files'); await appendLog('warn', `Add is not supported for ${capabilities.format}`); return; }
    const inputs = await chooseInputFiles();
    if (!inputs.length) return;
    await run(async () => setFiles(await addFiles(archivePath, inputs, compression, openPassword)), 'Files added');
  };

  const performExtraction = async (
    source: string,
    dir: string,
    password?: string,
    isImage?: boolean,
    mode: ConflictMode = 'overwrite',
  ) => {
    setBusy(true);
    setMessage('Extracting…');
    await appendLog('info', `Extracting ${source.split(/[\\/]/).pop()} to ${dir}`);
    try {
      if (isImage) {
        await extractImage(source, dir, mode);
        setMessage('Disk image extracted');
        await appendLog('info', 'Disk image extracted');
      } else {
        await extractArchive(source, dir, password, mode);
        setMessage('Archive extracted');
        await appendLog('info', 'Archive extracted');
      }
    } catch (error) {
      const text = String(error);
      const lower = text.toLowerCase();
      const ext = source.toLowerCase().split('.').pop() || '';
      const supportsPassword = capabilities?.passwordSupport || capabilities?.canEncrypt || ['zip', '7z', 'rar'].includes(ext);
      const isPwdError = lower.includes('password') || lower.includes('encrypt') || lower.includes('decrypt') || lower.includes('aes') || (supportsPassword && !password && (lower.includes('checksum') || lower.includes('crc') || lower.includes('failed') || lower.includes('error')));

      if (supportsPassword && isPwdError && !password) {
        await appendLog('warn', `Extraction requires password: ${text}`);
        setPendingExtraction({ source, dir });
        setExtractPassword('');
        setPasswordPrompt(true);
        setMessage('Password required');
      } else {
        setMessage(text);
        await appendLog('error', text);
      }
    } finally {
      setBusy(false);
    }
  };

  const executeExtractionAfterAuth = async (
    source: string,
    dir: string,
    password?: string,
    isImage?: boolean,
  ) => {
    try {
      const conflicts = await checkConflicts(source, dir);
      if (conflicts && conflicts.length > 0) {
        setConflictPrompt({ source, dir, password, isImage, conflicts });
        return;
      }
    } catch {
      // If conflict checking encounters an issue, proceed with extraction
    }
    await performExtraction(source, dir, password, isImage, 'overwrite');
  };

  const handleExtract = async () => {
    let source = archivePath;
    if (!source) {
      source = await chooseArchiveOrImage();
      if (!source) return;
    }
    const parentDir = source.includes('\\') ? source.substring(0, source.lastIndexOf('\\')) : source.includes('/') ? source.substring(0, source.lastIndexOf('/')) : '';

    const dir = await chooseExtractionDirectory(parentDir || undefined);
    if (!dir || !dir.trim()) {
      return;
    }
    await startExtraction(source, dir.trim());
  };

  const startExtraction = async (source: string, dir: string) => {
    const trimmedDir = dir.trim();
    if (!trimmedDir) return;
    setActiveModal(null);

    // Prepare the destination before encryption/conflict checks. The backend
    // creates missing directories and deliberately permits the destination to
    // be the same directory that contains the source archive.
    let preparedDir: string;
    try {
      preparedDir = await ensureExtractionDestination(source, trimmedDir);
    } catch (error) {
      const text = String(error);
      setMessage(text);
      await appendLog('error', `Invalid extraction destination: ${text}`);
      return;
    }

    const lower = source.toLowerCase();
    const extension = lower.endsWith('.tar.gz') || lower.endsWith('.tgz') ? 'tar.gz' : lower.endsWith('.tar.bz2') || lower.endsWith('.tbz2') ? 'tar.bz2' : source.split('.').pop()?.toLowerCase();
    const isImage = extension === 'iso' || extension === 'img';
    if (isImage) {
      await executeExtractionAfterAuth(source, preparedDir, undefined, true);
      return;
    }

    try {
      const encStatus = await checkArchiveEncryption(source, openPassword);
      if (encStatus.isEncrypted && !encStatus.passwordValid) {
        await appendLog('info', 'Archive is encrypted. Requesting password before checking conflicts.');
        setPendingExtraction({ source, dir: preparedDir });
        setExtractPassword('');
        setPasswordPrompt(true);
        setMessage('Password required');
        return;
      }
    } catch {
      // If checkArchiveEncryption is unsupported for this format, proceed
    }

    await executeExtractionAfterAuth(source, preparedDir, openPassword, false);
  };

  const finishPasswordExtraction = async () => {
    if (!pendingExtraction) return;
    const pending = pendingExtraction;
    const pwd = extractPassword.trim();
    if (!pwd) return;

    try {
      const encStatus = await checkArchiveEncryption(pending.source, pwd);
      if (encStatus.isEncrypted && !encStatus.passwordValid) {
        const errorMsg = encStatus.errorMessage || 'Invalid password. Please try again.';
        setMessage(errorMsg);
        await appendLog('warn', `Extraction password check failed: ${errorMsg}`);
        return;
      }
    } catch {
      // If verification encounters error, continue with extraction attempt
    }

    setPasswordPrompt(false);
    setPendingExtraction(null);
    setOpenPassword(pwd);
    setExtractPassword('');
    await executeExtractionAfterAuth(pending.source, pending.dir, pwd, false);
  };

  useEffect(() => {
    if (activeModal === 'options') {
      setAssocStatus(null);
      getFileAssociations()
        .then(registered => {
          if (registered && registered.length > 0) {
            const next: Record<string, boolean> = {};
            SUPPORTED_ASSOCIATIONS.forEach(item => {
              next[item.ext] = registered.includes(item.ext);
            });
            setFileAssociations(next);
            localStorage.setItem('matterpackr.fileAssociations', JSON.stringify(next));
          }
        })
        .catch(() => { });
    }
  }, [activeModal]);

  const handleApplyAssociations = async () => {
    setSavingAssoc(true);
    setAssocStatus(null);
    try {
      const selected = SUPPORTED_ASSOCIATIONS.filter(item => !!fileAssociations[item.ext]).map(item => item.ext);
      await applyFileAssociations(selected);
      localStorage.setItem('matterpackr.fileAssociations', JSON.stringify(fileAssociations));
      await appendLog('info', `File associations updated: ${selected.join(', ') || 'none'}`);
      setMessage('File associations applied successfully');
      setActiveModal(null);
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to update file associations';
      setAssocStatus({ message: errorMsg, type: 'error' });
      await appendLog('warn', `File association update failed: ${errorMsg}`);
    } finally {
      setSavingAssoc(false);
    }
  };

  const handleCheckForUpdates = async (openDialog = false) => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    if (openDialog) {
      setActiveModal('update');
    }
    try {
      await appendLog('info', 'Checking for application updates from GitHub...');
      const info = await checkForAppUpdate();
      if (info.available && info.version) {
        setUpdateStatus({
          type: 'available',
          message: `Update v${info.version} is available!`,
          update: info,
        });
        await appendLog('info', `Update available: v${info.version}`);
        setActiveModal('update');
      } else {
        setUpdateStatus({
          type: 'latest',
          message: `MatterPackr is up to date (v${appVersion}).`,
          update: info,
        });
        await appendLog('info', `MatterPackr is up to date (v${appVersion}).`);
        if (openDialog) {
          setActiveModal('update');
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      setUpdateStatus({
        type: 'error',
        message: `Update check failed: ${msg}`,
      });
      await appendLog('warn', `Update check failed: ${msg}`);
      if (openDialog) {
        setActiveModal('update');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateStatus?.update?.available) return;
    setInstallingUpdate(true);
    setUpdateProgress({ downloaded: 0, total: null });
    try {
      await appendLog('info', `Downloading and installing update v${updateStatus.update.version}...`);
      await downloadAndInstallUpdate((downloaded, total) => {
        setUpdateProgress({ downloaded, total });
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      setUpdateStatus({
        type: 'error',
        message: `Failed to install update: ${msg}`,
      });
      await appendLog('error', `Failed to install update: ${msg}`);
      setInstallingUpdate(false);
    }
  };

  const saveAssociationPreferences = (next: Record<string, boolean>) => {
    setFileAssociations(next);
    localStorage.setItem('matterpackr.fileAssociations', JSON.stringify(next));
  };

  const handleDelete = async () => {
    if (!archivePath || !selected.length) return;
    if (capabilities && !capabilities.canRemove) { setMessage('This format cannot remove entries'); await appendLog('warn', `Remove is not supported for ${capabilities.format}`); return; }
    await run(async () => { setFiles(await removeEntries(archivePath, selected, compression, openPassword)); setSelected([]); }, 'Selection removed');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => current?.key === key && current.direction === 'asc'
      ? { key, direction: 'desc' }
      : { key, direction: 'asc' });
  };

  const collectNodePaths = (node: TreeNode): string[] => [
    node.path,
    ...node.children.flatMap(collectNodePaths),
  ];

  const toggleSelected = useCallback((path: string) => setSelected(current => {
    const node = nodeByPath.get(path);
    if (!node) {
      return current.includes(path)
        ? current.filter(x => x !== path)
        : [...current, path];
    }

    const paths = collectNodePaths(node);
    const allSelected = paths.every(item => current.includes(item));

    if (allSelected) {
      return current.filter(item => !paths.includes(item));
    }

    return [...current.filter(item => !paths.includes(item)), ...paths];
  }), [nodeByPath]);

  const handleRowSelect = useCallback((path: string, _event: MouseEvent<HTMLTableRowElement>) => {
    setContextMenu(null);
    if (isBoxSelectingRef.current) return;
    toggleSelected(path);
  }, [toggleSelected]);

  const handleDragStart = useCallback(async (draggedPath: string, event: React.DragEvent<HTMLTableRowElement>) => {
    if (!archivePath) return;
    event.preventDefault(); // Prevent default browser drag ghosting so native OS drag takes over

    // If multiple items are selected and the dragged row is part of the selection, drag all selected items.
    // Otherwise, drag just the single item clicked/dragged.
    const itemsToExtract = selected.includes(draggedPath) && selected.length > 1
      ? selected
      : [draggedPath];

    setMessage('Extracting for drag and drop…');
    await appendLog('info', `Drag extraction initiated for ${itemsToExtract.length} item(s)`);

    try {
      const extractedPaths = await prepareDragExtraction(archivePath, itemsToExtract, openPassword);
      if (!extractedPaths || extractedPaths.length === 0) {
        throw new Error('No files could be prepared for extraction');
      }

      await appendLog('info', `Extracted ${extractedPaths.length} items to staging. Starting native OS drag.`);
      setMessage('Drag to folder to extract');

      // Trigger native OS drag out to Explorer using tauri-plugin-drag
      await startDrag({
        item: extractedPaths,
        icon: matterpackrIcon,
      });
    } catch (error) {
      const text = String(error);
      const lower = text.toLowerCase();
      const isPwdError = lower.includes('password') || lower.includes('encrypt') || lower.includes('decrypt') || lower.includes('aes') || lower.includes('checksum') || lower.includes('crc');
      if (isPwdError || !openPassword) {
        await appendLog('warn', 'The archive requires a password to extract items.');
        const parentDir = archivePath.includes('\\') ? archivePath.substring(0, archivePath.lastIndexOf('\\')) : archivePath.includes('/') ? archivePath.substring(0, archivePath.lastIndexOf('/')) : '';
        setPendingExtraction({ source: archivePath, dir: parentDir });
        setExtractPassword('');
        setPasswordPrompt(true);
        setMessage('Password required to extract files');
      } else {
        setMessage(`Drag extraction failed: ${text}`);
        await appendLog('error', `Drag extraction failed: ${text}`);
      }
    }
  }, [archivePath, selected, openPassword]);

  const handleContextMenu = useCallback((path: string, event: MouseEvent<HTMLTableRowElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedSet.has(path)) setSelected([path]);
    const menuWidth = 190;
    const menuHeight = 170;
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      path,
    });
  }, [selectedSet]);

  const handleView = async (pathOverride?: string) => {
    setContextMenu(null);
    const path = pathOverride ?? (selected.length === 1 ? selected[0] : null);
    if (!path || !archivePath) return;
    const node = nodeByPath.get(path);
    if (!node || !node.entry || node.entry.isDir) return;
    await appendLog('info', `View requested: ${node.path}`);
    try {
      await viewArchiveEntry(archivePath, node.path, openPassword);
      await appendLog('info', `View launch request completed: ${node.path}`);
    } catch (error) {
      const text = String(error);
      await appendLog('error', `View failed for ${node.path}: ${text}`);
      const viewExtension = archivePath.toLowerCase().split('.').pop() || '';
      const lower = text.toLowerCase();
      const isPwdError = lower.includes('password') || lower.includes('encrypt') || lower.includes('decrypt') || lower.includes('aes') || lower.includes('checksum') || lower.includes('crc');
      if (capabilities?.canEncrypt || capabilities?.passwordSupport || ['rar', 'zip', '7z'].includes(viewExtension)) {
        if (isPwdError || !openPassword) {
          await appendLog('warn', 'The archive requires a password to view this file.');
          setPendingView({ archive: archivePath, entryPath: node.path, name: node.name });
          setViewPassword('');
        } else {
          setMessage(text);
        }
      } else {
        setMessage(text);
      }
    }
  };

  const finishPasswordView = async () => {
    if (!pendingView) return;
    const pending = pendingView;
    const pwd = viewPassword || undefined;
    setPendingView(null);
    if (pwd) {
      setOpenPassword(pwd);
    }
    await run(() => viewArchiveEntry(pending.archive, pending.entryPath, pwd), `View launch request completed: ${pending.name}`);
    setViewPassword('');
  };

  const handleContextExtract = async () => {
    setContextMenu(null);
    await handleExtract();
  };

  const handleContextRemove = async () => {
    setContextMenu(null);
    await handleDelete();
  };

  const beginWindowDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    void appWindow.startDragging().catch(error => {
      void appendLog('error', `Window drag failed: ${String(error)}`);
    });
  };

  const toggleWindowMaximize = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    void appWindow.toggleMaximize().catch(error => {
      void appendLog('error', `Window maximize failed: ${String(error)}`);
    });
  };

  const titlebar = (
    <div className={`titlebar ${isMac ? 'titlebar-mac' : 'titlebar-windows'}`} role="banner">
      <div
        className="titlebar-drag-region"
        data-tauri-drag-region
        onMouseDown={beginWindowDrag}
        onDoubleClick={toggleWindowMaximize}
        aria-hidden="true"
      />
      {isMac && (
        <div className="traffic-lights" onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
          <button type="button" className="traffic close" onClick={() => void appWindow.close().catch(error => appendLog('error', `Window close failed: ${String(error)}`))} aria-label="Close" />
          <button type="button" className="traffic minimize" onClick={() => void appWindow.minimize().catch(error => appendLog('error', `Window minimize failed: ${String(error)}`))} aria-label="Minimize" />
          <button type="button" className="traffic maximize" onClick={() => void appWindow.toggleMaximize().catch(error => appendLog('error', `Window maximize failed: ${String(error)}`))} aria-label="Maximize" />
        </div>
      )}
      <div className="titlebar-brand">
        <img src={matterpackrIcon} alt="" />
        <span>MatterPackr</span>
      </div>
      {!isMac && (
        <div className="window-controls" onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => void appWindow.minimize().catch(error => appendLog('error', `Window minimize failed: ${String(error)}`))} aria-label="Minimize"><Minus size={16} /></button>
          <button type="button" onClick={() => void appWindow.toggleMaximize().catch(error => appendLog('error', `Window maximize failed: ${String(error)}`))} aria-label="Maximize"><Square size={12} /></button>
          <button type="button" className="close-control" onClick={() => void appWindow.close().catch(error => appendLog('error', `Window close failed: ${String(error)}`))} aria-label="Close"><X size={15} /></button>
        </div>
      )}
    </div>
  );

  return (
    <main className="app-shell font-sans text-sm text-gray-900 dark:text-gray-100 transition-colors" onClick={() => contextMenu && setContextMenu(null)} onContextMenu={event => event.preventDefault()}>
      {!isLinux && titlebar}
      <section className="app-frame">
        <header className="toolbar">
          <div className="toolbar-left">
            <div className="tool-group">
              <ToolButton icon={<FilePlus />} label="New" onClick={() => setActiveModal('new')} />
              <ToolButton icon={<FolderOpen />} label="Open" onClick={handleOpen} />
              <ToolButton icon={<Plus />} label="Add" onClick={handleAdd} disabled={!archivePath || !!capabilities && !capabilities.canAdd} />
              <ToolButton icon={<Download />} label="Extract" onClick={handleExtract} disabled={!!archivePath && !!capabilities && !capabilities.canExtract} />
              <ToolButton icon={<Eye />} label="View" onClick={() => void handleView()} disabled={!archivePath || selected.length !== 1 || !!nodeByPath.get(selected[0])?.entry?.isDir || (!!capabilities && !capabilities.canView)} />
              <ToolButton icon={<Package />} label="Check" onClick={async () => { if (!archivePath) { setMessage('No archive open'); return; } await run(async () => { await testArchive(archivePath); }, 'Archive check passed'); }} disabled={!archivePath || !!capabilities && !capabilities.canTest} />
              <ToolButton icon={<Trash2 />} label="Remove" disabled={!selected.length || !!capabilities && !capabilities.canRemove} onClick={handleDelete} />
            </div>
          </div>
          <div className="toolbar-right">
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files…" />
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="icon-button" aria-label="Toggle theme" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <div className="archive-view">
          {archivePath && (
            <div className="path-bar">
              <button
                type="button"
                className="path-up-button"
                onClick={navigateUp}
                disabled={!currentPath}
                title={currentPath ? "Up to parent folder (Backspace)" : "Already at archive root"}
                aria-label="Up to parent folder"
              >
                <FolderUp size={16} />
              </button>
              <div className="path-breadcrumbs">
                <span
                  className={`breadcrumb-item ${!currentPath ? 'active' : ''}`}
                  onClick={() => { if (currentPath) { setCurrentPath(''); setSelected([]); } }}
                  title="Archive root"
                >
                  {archiveFileName || 'Archive'}
                </span>
                {pathSegments.map((segment, idx) => {
                  const segPath = pathSegments.slice(0, idx + 1).join('/');
                  const isCurrent = segPath === currentPath;
                  return (
                    <span key={segPath} className="breadcrumb-segment">
                      <span className="breadcrumb-sep">/</span>
                      <span
                        className={`breadcrumb-item ${isCurrent ? 'active' : ''}`}
                        onClick={() => {
                          if (!isCurrent) {
                            setCurrentPath(segPath);
                            setSelected([]);
                          }
                        }}
                        title={segPath}
                      >
                        {segment}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div
            ref={tableWrapRef}
            className="table-wrap"
            onScroll={onTableScroll}
            onMouseDown={handleTableWrapMouseDown}
          >
            {selectionBox && (
              <div
                className="selection-box"
                style={{
                  left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                  top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                  width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                  height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
                }}
              />
            )}
            <table className="w-full text-left border-collapse">
              <thead className="table-head">
                <tr>
                  {showCheckboxes && <th className="p-2 w-8"></th>}
                  {([['name', 'Name'], ['kind', 'Type'], ['modified', 'Modified'], ['size', 'Size'], ['compressedSize', 'Packed']] as [SortKey, string][]).map(([key, label]) => (
                    <th key={key} className="p-2 font-medium cursor-pointer" onClick={() => handleSort(key)}>{label}</th>
                  ))}
                  <th className="p-2 font-medium">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {currentPath && !query && (
                  <tr
                    className="file-row up-row cursor-pointer select-none"
                    onDoubleClick={navigateUp}
                    onClick={() => { setContextMenu(null); setSelected([]); }}
                    title="Parent folder (Double-click or Backspace to go up)"
                  >
                    {showCheckboxes && (
                      <td className="p-2 text-center">
                        <FolderUp size={16} className="text-blue-400 inline-block opacity-80" />
                      </td>
                    )}
                    <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
                      <span className="flex items-center gap-2">
                        {!showCheckboxes && <FolderUp size={16} className="text-blue-400 inline-block opacity-80" />}
                        <span className="font-bold text-sm">..</span>
                      </span>
                    </td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">Parent folder</td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">—</td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">—</td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">—</td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">—</td>
                  </tr>
                )}
                {(() => {
                  const totalCount = currentItems.length;
                  const itemHeight = ROW_HEIGHT;
                  const overscan = 15;
                  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
                  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);

                  const topSpacerHeight = startIndex * itemHeight;
                  const bottomSpacerHeight = (totalCount - endIndex) * itemHeight;
                  const visibleItems = currentItems.slice(startIndex, endIndex);
                  const tableColSpan = showCheckboxes ? 7 : 6;

                  return (
                    <>
                      {topSpacerHeight > 0 && (
                        <tr style={{ height: `${topSpacerHeight}px` }} aria-hidden="true">
                          <td colSpan={tableColSpan} style={{ padding: 0, border: 0 }} />
                        </tr>
                      )}
                      {visibleItems.map(node => (
                        <ArchiveItemRow
                          key={node.path}
                          node={node}
                          showFullPath={!!query.trim()}
                          showCheckbox={showCheckboxes}
                          isSelected={selectedSet.has(node.path)}
                          onToggleSelected={toggleSelected}
                          onRowSelect={handleRowSelect}
                          onDragStart={handleDragStart}
                          onDoubleClick={handleItemDoubleClick}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                      {bottomSpacerHeight > 0 && (
                        <tr style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true">
                          <td colSpan={tableColSpan} style={{ padding: 0, border: 0 }} />
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
            {!currentItems.length && !currentPath && <div className="empty-state">
              <Archive size={42} strokeWidth={1.25} />
              {archivePath ? (
                <p className="mt-3 font-medium">No matching files</p>
              ) : (
                <>
                  <p className="mt-3 font-medium">Create or open an archive to begin</p>
                  <p className="empty-supported">
                    <strong>Create &amp; extract:</strong> {createFormats.map(format => format.id.toUpperCase()).join(', ') || 'Loading…'}
                    <span className="empty-separator"> · </span>
                    <strong>Extract only:</strong> {extractFormats.filter(format => !format.canCreate).map(format => format.label.split(' — ')[0]).join(', ') || 'Loading…'}
                    {plannedExtractOnlyFormats.length > 0 && <>
                      <span className="empty-separator"> · </span>
                      <strong>Planned:</strong> {plannedExtractOnlyFormats.map(format => format.label.split(' — ')[0]).join(', ')}
                    </>}
                  </p>
                </>
              )}
            </div>}
            {!currentItems.length && currentPath && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>This folder is empty</p>
              </div>
            )}
          </div>
        </div>

        {contextMenu && (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={event => event.preventDefault()}
          >
            <button onClick={() => void handleView()} disabled={selected.length !== 1 || !nodeByPath.get(selected[0])?.entry || !!nodeByPath.get(selected[0])?.entry?.isDir || (!!capabilities && !capabilities.canView)}>
              <Eye size={15} /> View
            </button>
            <button onClick={() => void handleContextExtract()} disabled={!archivePath || !capabilities?.canExtract}>
              <Download size={15} /> Extract…
            </button>
            <button onClick={() => void handleContextRemove()} disabled={!archivePath || !selected.length || !capabilities?.canRemove}>
              <Trash2 size={15} /> Remove selected
            </button>
            <div className="context-divider" />
            <button onClick={() => { setSelected(currentItems.map(node => node.path)); setContextMenu(null); }}>
              <MoreHorizontal size={15} /> Select all
            </button>
            <button onClick={() => { toggleShowCheckboxes(); setContextMenu(null); }}>
              <CheckSquare size={15} /> {showCheckboxes ? 'Hide checkboxes' : 'Show checkboxes'}
            </button>
          </div>
        )}

        {pendingView && (
          <Modal title="Password Required" close={() => { setPendingView(null); setViewPassword(''); }}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">This archive is encrypted and requires a password to view this file.</p>
              <input type="password" autoFocus value={viewPassword} onChange={e => setViewPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void finishPasswordView(); }} placeholder="Archive password" className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700" autoComplete="current-password" />
              <button onClick={() => void finishPasswordView()} disabled={busy || !viewPassword.trim()} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">View</button>
            </div>
          </Modal>
        )}

        {showLogs && (
          <section className="log-panel">
            <div className="log-header">
              <span className="flex items-center gap-2"><FileClock size={15} /> Activity Log</span>
              <button onClick={() => setLogs([])} className="log-clear">Clear</button>
            </div>
            <div className="log-list">
              {logs.length === 0 ? <div className="log-empty">No events yet.</div> : logs.map(entry => (
                <div key={entry.id} className="log-entry">
                  <span className="log-time">{entry.time}</span>
                  <span className={`log-level ${entry.level}`}>{entry.level.toUpperCase()}</span>
                  <span className="truncate">{entry.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="status-bar">
          <div className="status-left">
            <span className="status-dot" />
            <span>{archivePath ? archivePath.split(/[\\/]/).pop() : 'No archive open'}</span>
            <span>{files.length} items</span>
            <span>{formatBytes(totalSize)} total</span>
            <span>{formatBytes(packedSize)} packed</span>
            <span className="status-message">{message}</span>
            {busy && <LoaderCircle size={13} className="animate-spin" />}
          </div>
          <div className="status-actions">
            <button
              onClick={() => void handleCheckForUpdates(true)}
              disabled={checkingUpdate || installingUpdate}
              className={`status-action ${checkingUpdate ? 'active' : ''}`}
              title="Check for updates on GitHub"
              aria-label="Check for updates"
            >
              <RefreshCw size={13} className={checkingUpdate ? 'animate-spin text-blue-400' : ''} />
              <span>{checkingUpdate ? 'Checking…' : installingUpdate ? 'Updating…' : 'Update'}</span>
            </button>
            <button onClick={() => setShowLogs(value => !value)} className={`status-action ${showLogs ? 'active' : ''}`} aria-label="Activity log"><FileClock size={14} /> Log</button>
            <button onClick={() => setActiveModal('options')} className="status-action"><Settings size={14} /> Options</button>
            <button onClick={() => setActiveModal('about')} className="status-action" title="About MatterPackr" aria-label="About MatterPackr"><Info size={14} /></button>
          </div>
        </footer>
      </section>

      {/* Drag & Drop Visual Indicators */}
      {dragOverlay?.status === 'disallowed' && (
        <>
          {/* Subtle blocked backdrop indicator */}
          <div className="fixed inset-0 pointer-events-none z-50 bg-red-950/10 transition-opacity" />
          {/* Floating red circle following the cursor */}
          {dragOverlay.x !== undefined && dragOverlay.y !== undefined ? (
            <div
              className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform duration-75"
              style={{ left: `${dragOverlay.x}px`, top: `${dragOverlay.y}px` }}
            >
              <div className="w-10 h-10 rounded-full border-4 border-red-500 bg-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/20 backdrop-blur-sm">
                <div className="w-5 h-1 bg-red-500 transform -rotate-45 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-red-500 bg-red-500/30 flex items-center justify-center shadow-xl shadow-red-500/20 backdrop-blur-sm">
                <div className="w-8 h-1.5 bg-red-500 transform -rotate-45 rounded-full" />
              </div>
            </div>
          )}
        </>
      )}

      {dragOverlay?.status === 'allowed' && (
        <div className="fixed inset-0 pointer-events-none z-50 border-2 border-dashed border-blue-500 bg-blue-500/10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-gray-900/90 text-white px-5 py-3 rounded-xl shadow-2xl border border-blue-500/40 flex items-center gap-3">
            <Plus size={22} className="text-blue-400 animate-pulse" />
            <span className="font-semibold text-sm">
              {selected.length === 1 && nodeByPath.get(selected[0])?.isDir
                ? `Drop to add files to /${nodeByPath.get(selected[0])?.path}`
                : currentPath ? `Drop to add files to /${currentPath}` : 'Drop to add files to archive root'}
            </span>
          </div>
        </div>
      )}

      {activeModal === 'new' && <Modal title="Create New Archive" close={() => setActiveModal(null)}>
        <div className="space-y-4 create-archive-form">
          <label className="block"><span className="font-medium">Archive type</span>
            <select value={archiveType} onChange={e => handleArchiveTypeChange(e.target.value as ArchiveType)} className="mt-1 w-full p-2 border rounded create-archive-control">
              {createFormats.map(format => <option key={format.id} value={format.id}>{format.label}</option>)}
            </select>
          </label>
          <label className="block"><span className="font-medium">Archive path</span><div className="flex gap-2 mt-1"><input value={newArchivePath} onChange={e => setNewArchivePath(e.target.value)} placeholder={`Save as archive.${archiveExtension(archiveType)}`} className="flex-1 p-2 border rounded create-archive-control" /><button onClick={async () => { const p = await browseForArchivePath(archiveType); if (p) setNewArchivePath(p); }} className="p-2 border rounded"><FolderOpen size={18} /></button></div></label>
          <label className="block"><span className="font-medium">Compression</span><select value={compression} onChange={e => setCompression(e.target.value as Compression)} className="mt-1 w-full p-2 border rounded create-archive-control"><option>Fast</option><option>Normal</option><option>Maximum</option></select></label>
          {selectedCreateFormat?.canEncrypt && <div className="space-y-2 rounded-lg border p-3 bg-black/5 dark:bg-white/5">
            <label className="flex items-center gap-2"><input type="checkbox" checked={encryptArchive} onChange={e => setEncryptArchive(e.target.checked)} /><span className="font-medium">Encrypt archive with password</span></label>
            {encryptArchive && <><input type="password" value={archivePassword} onChange={e => setArchivePassword(e.target.value)} placeholder="Password" className="w-full p-2 border rounded create-archive-control" autoComplete="new-password" /><input type="password" value={confirmArchivePassword} onChange={e => setConfirmArchivePassword(e.target.value)} placeholder="Confirm password" className="w-full p-2 border rounded create-archive-control" autoComplete="new-password" /><p className="text-xs text-gray-500">MatterPackr uses AES-256 for both ZIP and 7Z encryption.</p></>}
          </div>}
          <button onClick={handleNew} disabled={busy} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create Archive</button>
        </div>
      </Modal>}

      {activeModal === 'extract' && extractSource && <Modal title="Extract Archive" close={() => setActiveModal(null)}>
        <div className="space-y-4">
          <label className="block">
            <span className="font-medium">Archive</span>
            <input
              type="text"
              readOnly
              value={extractSource}
              className="mt-1 w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed text-xs"
            />
          </label>
          <label className="block">
            <span className="font-medium">Extract to folder</span>
            <div className="flex gap-2 mt-1">
              <input
                value={extractDestination}
                onChange={e => setExtractDestination(e.target.value)}
                placeholder="Folder path to extract to"
                className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                onKeyDown={e => {
                  if (e.key === 'Enter' && extractDestination.trim()) {
                    void startExtraction(extractSource, extractDestination);
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={async () => {
                  const p = await chooseExtractionDirectory(extractDestination || undefined);
                  if (p) setExtractDestination(p);
                }}
                className="p-2 border rounded hover:bg-black/5 dark:hover:bg-white/5"
                title="Browse folder"
              >
                <FolderOpen size={18} />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              If the specified directory does not exist, MatterPackr will create it automatically.
            </p>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex-1 p-2 border rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void startExtraction(extractSource, extractDestination)}
              disabled={busy || !extractDestination.trim()}
              className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Extract
            </button>
          </div>
        </div>
      </Modal>}

      {activeModal === 'options' && <Modal title="Options" maxWidth="max-w-md" padding="p-4 sm:p-5" close={() => setActiveModal(null)}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">File Associations</h3>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    SUPPORTED_ASSOCIATIONS.forEach(a => { all[a.ext] = true; });
                    setFileAssociations(all);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    const none: Record<string, boolean> = {};
                    SUPPORTED_ASSOCIATIONS.forEach(a => { none[a.ext] = false; });
                    setFileAssociations(none);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-tight">
              Select formats to open by default in MatterPackr:
            </p>

            <div className="associations-container grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 p-1.5 rounded-lg">
              {SUPPORTED_ASSOCIATIONS.map(item => (
                <label key={item.ext} className="associations-item flex items-center gap-1.5 text-xs py-1 px-2 rounded-md cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 scale-90"
                    checked={!!fileAssociations[item.ext]}
                    onChange={e => setFileAssociations(prev => ({ ...prev, [item.ext]: e.target.checked }))}
                  />
                  <div className="flex items-baseline gap-1 truncate">
                    <span className="ext-name font-semibold text-[11px]">{item.extLabel}</span>
                    <span className="desc-name text-[10px] truncate opacity-80">({item.name})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {assocStatus && (
            <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${assocStatus.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800'
              : assocStatus.type === 'error'
                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
              <Shield size={13} className="shrink-0" />
              <span className="text-[11px]">{assocStatus.message}</span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700/80">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">View & Selection</h3>
            <label className="flex items-center gap-2.5 text-xs py-1.5 px-2 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600"
                checked={showCheckboxes}
                onChange={toggleShowCheckboxes}
              />
              <div className="flex flex-col">
                <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">Show selection checkboxes</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Display checkbox column in the file list for click-to-check selection.</span>
              </div>
            </label>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700/80 flex flex-col gap-1.5">
            <button
              onClick={handleApplyAssociations}
              disabled={savingAssoc || busy}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <Shield size={14} />
              <span>{savingAssoc ? 'Applying File Associations...' : 'Apply File Associations'}</span>
            </button>
            <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 leading-tight">
              Administrative elevation may be required to apply system-wide changes.
            </p>
          </div>
        </div>
      </Modal>}

      {activeModal === 'about' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#24262b] dark:bg-[#202227] text-gray-200 rounded-2xl shadow-2xl border border-white/10 w-full max-w-[390px] p-5 pt-4 pb-4 relative flex flex-col items-center text-center">
            {/* Header row */}
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-300">About MatterPackr</span>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* App Icon */}
            <div className="mb-3 mt-1">
              <img src={matterpackrIcon} alt="MatterPackr" className="w-16 h-16 object-contain drop-shadow" />
            </div>

            {/* Title & Version */}
            <h3 className="text-lg font-bold text-white tracking-wide">MatterPackr</h3>
            <p className="text-xs text-gray-400 mt-0.5">Version {appVersion}</p>

            {/* Copyright with Z Software Labs icon */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-2">
              <span>Copyright &copy; 2026</span>
              <img src={zSoftwareLabsIcon} alt="Z Software Labs" className="w-3.5 h-3.5 object-contain inline-block" />
              <span>Z Software Labs. All rights reserved.</span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300 mt-3 px-2 leading-relaxed">
              MatterPackr is a lightweight, utility-driven desktop archive manager designed for fast, effortless compression workflows.
            </p>

            {/* MIT License link */}
            <div className="mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
              <span>This application is licensed under</span>
              <button
                type="button"
                onClick={() => void openExternalUrl('https://opensource.org/licenses/MIT')}
                className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5"
              >
                <span>MIT</span>
                <span className="text-[10px]">↗</span>
              </button>
            </div>

            {/* Scrollable license box */}
            <div className="w-full mt-3 h-24 overflow-y-auto bg-black/40 border border-white/10 rounded-lg p-2.5 text-left text-[11px] text-gray-400 leading-relaxed font-mono select-text">
              <p className="mb-2">
                Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
              </p>
              <p className="mb-2">
                The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
              </p>
              <p className="mb-2">
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
              </p>
              <hr className="border-white/10 my-2" />
              <p className="font-sans font-semibold text-gray-300 text-[11px] mb-1">Third-Party Licenses</p>
              <p className="mb-1">
                <strong className="text-gray-300 font-sans">libarchive:</strong> Copyright (c) 2003-2007 Tim Kientzle. BSD License.
              </p>
              <p className="mb-1">
                <strong className="text-gray-300 font-sans">7-Zip:</strong> Copyright (c) 1999-2026 Igor Pavlov. GNU Lesser GPL.
              </p>
              <p>
                <strong className="text-gray-300 font-sans">UnRAR:</strong> Copyright (c) Alexander Roshal. Freeware license.
              </p>
            </div>

            {/* OK Button */}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="mt-4 px-6 py-1.5 bg-[#32363e] hover:bg-[#3d424c] active:bg-[#282b31] text-gray-200 text-xs font-semibold rounded-lg border border-white/10 transition-colors shadow-sm min-w-[72px]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {activeModal === 'update' && (
        <Modal title="MatterPackr Update" maxWidth="max-w-md" close={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
              <span>Current Installed Version</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">v{appVersion}</span>
            </div>

            {checkingUpdate && (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-500 dark:text-gray-400">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs">Checking GitHub Releases for updates…</span>
              </div>
            )}

            {!checkingUpdate && updateStatus && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${updateStatus.type === 'available'
                    ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                    : updateStatus.type === 'latest'
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                  {updateStatus.type === 'available' ? (
                    <RefreshCw size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  ) : updateStatus.type === 'latest' ? (
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{updateStatus.message}</div>
                    {updateStatus.update?.date && (
                      <div className="text-[11px] opacity-80 mt-0.5">Released: {new Date(updateStatus.update.date).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>

                {updateStatus.update?.body && (
                  <div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Release Notes:</div>
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs font-mono whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed select-text">
                      {updateStatus.update.body}
                    </div>
                  </div>
                )}
              </div>
            )}

            {installingUpdate && (
              <div className="space-y-1.5 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <LoaderCircle size={12} className="animate-spin text-blue-600" />
                    Downloading & installing update…
                  </span>
                  <span>
                    {updateProgress?.total
                      ? `${Math.round((updateProgress.downloaded / updateProgress.total) * 100)}%`
                      : formatBytes(updateProgress?.downloaded ?? 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-150"
                    style={{
                      width: updateProgress?.total
                        ? `${Math.min(100, Math.round((updateProgress.downloaded / updateProgress.total) * 100))}%`
                        : '100%',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={installingUpdate}
                className="flex-1 p-2 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium disabled:opacity-50"
              >
                Close
              </button>

              {updateStatus?.type === 'available' ? (
                <button
                  type="button"
                  onClick={handleInstallUpdate}
                  disabled={installingUpdate}
                  className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>{installingUpdate ? 'Installing…' : 'Download & Restart'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCheckForUpdates(false)}
                  disabled={checkingUpdate || installingUpdate}
                  className="flex-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} className={checkingUpdate ? 'animate-spin' : ''} />
                  <span>{checkingUpdate ? 'Checking…' : 'Check Again'}</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {passwordPrompt && <Modal title="Password Required" close={() => { setPasswordPrompt(false); setPendingExtraction(null); }}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">This archive is encrypted and requires a password to extract.</p>
          <input
            type="password"
            autoFocus
            value={extractPassword}
            onChange={e => setExtractPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void finishPasswordExtraction(); }}
            placeholder="Archive password"
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            autoComplete="current-password"
          />
          <button
            onClick={() => void finishPasswordExtraction()}
            disabled={busy || !extractPassword.trim()}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Extract
          </button>
        </div>
      </Modal>}

      {conflictPrompt && <Modal title="File Conflict" close={() => { setConflictPrompt(null); void appendLog('info', 'Extraction cancelled by user'); setMessage('Extraction cancelled'); }}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The following {conflictPrompt.conflicts.length} file{conflictPrompt.conflicts.length > 1 ? 's' : ''} already exist{conflictPrompt.conflicts.length === 1 ? 's' : ''} in the destination folder:
          </p>
          <div className="max-h-36 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs font-mono space-y-1 border border-gray-200 dark:border-gray-700">
            {conflictPrompt.conflicts.map(name => (
              <div key={name} className="truncate" title={name}>• {name}</div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            How would you like to handle existing files?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={async () => {
                const prompt = conflictPrompt;
                setConflictPrompt(null);
                await performExtraction(prompt.source, prompt.dir, prompt.password, prompt.isImage, 'overwrite');
              }}
              disabled={busy}
              className="w-full p-2 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm"
            >
              Overwrite Existing Files
            </button>
            <button
              onClick={async () => {
                const prompt = conflictPrompt;
                setConflictPrompt(null);
                await performExtraction(prompt.source, prompt.dir, prompt.password, prompt.isImage, 'rename');
              }}
              disabled={busy}
              className="w-full p-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              Rename Automatically
            </button>
            <button
              onClick={() => {
                setConflictPrompt(null);
                void appendLog('info', 'Extraction cancelled by user');
                setMessage('Extraction cancelled');
              }}
              disabled={busy}
              className="w-full p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm"
            >
              Cancel Extraction
            </button>
          </div>
        </div>
      </Modal>}
    </main>
  );
}


const ArchiveItemRow = memo(function ArchiveItemRow({
  node,
  showFullPath,
  showCheckbox = true,
  isSelected,
  onToggleSelected,
  onRowSelect,
  onDragStart,
  onDoubleClick,
  onContextMenu,
}: {
  node: TreeNode;
  showFullPath?: boolean;
  showCheckbox?: boolean;
  isSelected: boolean;
  onToggleSelected: (path: string) => void;
  onRowSelect: (path: string, event: MouseEvent<HTMLTableRowElement>) => void;
  onDragStart: (path: string, event: React.DragEvent<HTMLTableRowElement>) => void;
  onDoubleClick: (node: TreeNode) => void;
  onContextMenu: (path: string, event: MouseEvent<HTMLTableRowElement>) => void;
}) {
  const entry = node.entry;
  const size = entry?.size ?? 0;
  const packed = entry?.compressedSize ?? 0;
  const ratio = size ? Math.round((1 - packed / size) * 100) : 0;
  const iconSrc = useMemo(() => getFileIconSrc(node.name), [node.name]);

  const renderIcon = () => {
    if (node.isDir) return <FolderOpen size={18} className="text-yellow-500" />;
    if (iconSrc) return <img src={iconSrc} alt="" className="filetype-icon" />;
    return entry?.kind === 'Image' ? <Image size={18} className="text-purple-500" /> : <FileText size={18} className="text-blue-500" />;
  };

  return (
    <tr
      className={`file-row ${isSelected ? 'selected-row' : ''}`}
      data-entry-path={node.path}
      draggable={isSelected}
      onDragStart={event => onDragStart(node.path, event)}
      onClick={event => onRowSelect(node.path, event)}
      onDoubleClick={() => onDoubleClick(node)}
      onContextMenu={event => onContextMenu(node.path, event)}
    >
      {showCheckbox && (
        <td className="p-2 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelected(node.path)}
            onClick={event => event.stopPropagation()}
            aria-label={`Select ${node.path}`}
          />
        </td>
      )}
      <td className="p-2 font-medium text-gray-800 dark:text-gray-200">
        <span className="flex items-center gap-2">
          <span className="file-tree-icon">{renderIcon()}</span>
          <span className="truncate max-w-[420px]" title={node.path}>
            {showFullPath ? node.path : node.name}
          </span>
        </span>
      </td>
      <td className="p-2 text-gray-600 dark:text-gray-400">{entry?.kind ?? (node.isDir ? 'Folder' : 'File')}</td>
      <td className="p-2 text-gray-600 dark:text-gray-400">{entry?.modified ?? '—'}</td>
      <td className="p-2 text-gray-600 dark:text-gray-400">{node.isDir && !entry ? '—' : formatBytes(size)}</td>
      <td className="p-2 text-gray-600 dark:text-gray-400">{node.isDir && !entry ? '—' : formatBytes(packed)}</td>
      <td className="p-2 text-gray-600 dark:text-gray-400">{node.isDir ? '—' : `${ratio}%`}</td>
    </tr>
  );
});

function ToolButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="tool-button" title={label}>{icon}<span>{label}</span></button>;
}

function Modal({
  title,
  close,
  children,
  maxWidth = 'max-w-md',
  padding = 'p-6',
  customHeader,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
  customHeader?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`modal-panel rounded-xl shadow-lg w-full ${maxWidth} ${padding} relative`}>
        <button onClick={close} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 z-10">
          <X size={18} />
        </button>
        {!customHeader && <h2 className="modal-title text-lg font-semibold mb-4 border-b pb-2">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
