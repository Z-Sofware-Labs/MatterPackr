import React, { useState, useEffect } from 'react';
import { AppThemeMode, PlatformOS } from '../../types/winzip';
import { ShieldIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

export interface SupportedFileType {
  id: string;
  ext: string;
  shortLabel: string;
  name: string;
  category: 'read_write' | 'read_only';
  modeLabel: string;
  specs: string;
}

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [
  // --- READ AND WRITE (7 Formats) ---
  {
    id: 'zip',
    ext: '.zip',
    shortLabel: 'ZIP (Deflate / AES-256)',
    name: 'ZIP Archive',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'Deflate, BZip2, AES-256',
  },
  {
    id: '7z',
    ext: '.7z',
    shortLabel: '7z (LZMA / LZMA2)',
    name: '7-Zip Archive',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'LZMA, LZMA2, PPMd, BCJ2',
  },
  {
    id: 'tar',
    ext: '.tar',
    shortLabel: 'TAR (POSIX Container)',
    name: 'Tape Archive (TAR)',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'POSIX ustar, pax, GNU tar',
  },
  {
    id: 'tar.gz',
    ext: '.tar.gz',
    shortLabel: 'TAR+GZIP (.tgz)',
    name: 'Gzip Tarball (TAR+GZIP)',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'RFC 1952 Deflate stream',
  },
  {
    id: 'gz',
    ext: '.gz',
    shortLabel: 'GZIP (Single Stream)',
    name: 'GNU Zip (GZIP)',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'RFC 1952 single data stream',
  },
  {
    id: 'tar.bz2',
    ext: '.tar.bz2',
    shortLabel: 'BZIP2+TAR (.tbz2)',
    name: 'Bzip2 Tarball (BZIP2+TAR)',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'Burrows-Wheeler block sorting',
  },
  {
    id: 'tar.xz',
    ext: '.tar.xz',
    shortLabel: 'XZ+TAR (.txz)',
    name: 'XZ Tarball (XZ+TAR)',
    category: 'read_write',
    modeLabel: 'RW',
    specs: 'LZMA2 multi-stream compression',
  },

  // --- READ ONLY (6 Formats) ---
  {
    id: 'rar',
    ext: '.rar',
    shortLabel: 'RAR (unRAR v7.0)',
    name: 'Roshal Archive (through unRAR)',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'unRAR 7.0 (RAR 1.5–5.0+)',
  },
  {
    id: 'iso',
    ext: '.iso',
    shortLabel: 'ISO (Optical Disc)',
    name: 'Optical Disc Image (ISO)',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'ISO 9660, Joliet, UDF',
  },
  {
    id: 'cab',
    ext: '.cab',
    shortLabel: 'CAB (MS Cabinet)',
    name: 'Microsoft Cabinet (CAB)',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'MSZIP, Quantum, LZX',
  },
  {
    id: 'img',
    ext: '.img',
    shortLabel: 'IMG (Raw Disk Image)',
    name: 'Disk Image (IMG)',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'Sector-by-sector FAT/NTFS/ext4',
  },
  {
    id: 'cpio',
    ext: '.cpio',
    shortLabel: 'CPIO (Unix initramfs)',
    name: 'Unix CPIO Archive',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'POSIX SVR4 portable ASCII',
  },
  {
    id: 'ar',
    ext: '.ar',
    shortLabel: 'AR / DEB (Unix Archiver)',
    name: 'Unix Archiver (AR)',
    category: 'read_only',
    modeLabel: 'RO',
    specs: 'BSD / GNU ar, Debian .deb',
  },
];

interface OptionsDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  fileAssociations: string[];
  showCheckboxes: boolean;
  themeMode: AppThemeMode;
  onSave: (associations: string[], showCheckboxes: boolean, mode: AppThemeMode) => void;
  onShowNotification: (msg: string, type?: 'info' | 'success') => void;
}

export const OptionsDialog: React.FC<OptionsDialogProps> = ({
  os,
  isOpen,
  onClose,
  fileAssociations,
  showCheckboxes,
  themeMode,
  onSave,
  onShowNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'associations' | 'view_theme'>('associations');
  const [selectedAssocs, setSelectedAssocs] = useState<string[]>(fileAssociations);
  const [currentCheckboxes, setCurrentCheckboxes] = useState<boolean>(showCheckboxes);
  const [currentMode, setCurrentMode] = useState<AppThemeMode>(themeMode);
  const [showElevationPrompt, setShowElevationPrompt] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'ok' | 'apply' | null>(null);
  const [initialAssocs] = useState<string[]>(fileAssociations);

  useEffect(() => {
    if (isOpen) {
      setSelectedAssocs(fileAssociations);
      setCurrentCheckboxes(showCheckboxes);
      setCurrentMode(themeMode);
    }
  }, [isOpen, fileAssociations, showCheckboxes, themeMode]);

  if (!isOpen) return null;

  const hasAssocChanges = () => {
    if (selectedAssocs.length !== initialAssocs.length) return true;
    return selectedAssocs.some((a) => !initialAssocs.includes(a));
  };

  const toggleExt = (ext: string) => {
    if (selectedAssocs.includes(ext)) {
      setSelectedAssocs(selectedAssocs.filter((e) => e !== ext));
    } else {
      setSelectedAssocs([...selectedAssocs, ext]);
    }
  };

  const handleSelectAll = () => {
    setSelectedAssocs(SUPPORTED_FILE_TYPES.map((e) => e.ext));
  };

  const handleSelectReadWrite = () => {
    const rwExts = SUPPORTED_FILE_TYPES.filter((e) => e.category === 'read_write').map((e) => e.ext);
    setSelectedAssocs(Array.from(new Set([...selectedAssocs, ...rwExts])));
  };

  const handleSelectReadOnly = () => {
    const roExts = SUPPORTED_FILE_TYPES.filter((e) => e.category === 'read_only').map((e) => e.ext);
    setSelectedAssocs(Array.from(new Set([...selectedAssocs, ...roExts])));
  };

  const handleDeselectAll = () => {
    setSelectedAssocs([]);
  };

  const handleApplyClick = () => {
    if (hasAssocChanges()) {
      setPendingAction('apply');
      setShowElevationPrompt(true);
    } else {
      onSave(selectedAssocs, currentCheckboxes, currentMode);
      onShowNotification('Settings applied successfully.', 'success');
    }
  };

  const handleOkClick = () => {
    if (hasAssocChanges()) {
      setPendingAction('ok');
      setShowElevationPrompt(true);
    } else {
      onSave(selectedAssocs, currentCheckboxes, currentMode);
      onClose();
      onShowNotification('Configuration saved.', 'success');
    }
  };

  const handleConfirmElevation = () => {
    setShowElevationPrompt(false);
    onSave(selectedAssocs, currentCheckboxes, currentMode);
    onShowNotification(
      `Administrator privileges granted. File associations registered (${selectedAssocs.length} formats).`,
      'success'
    );
    if (pendingAction === 'ok') {
      onClose();
    }
    setPendingAction(null);
  };

  const handleCancelElevation = () => {
    setShowElevationPrompt(false);
    setPendingAction(null);
    onShowNotification('Privilege elevation cancelled. File associations were not modified.', 'info');
  };

  const readWriteTypes = SUPPORTED_FILE_TYPES.filter((f) => f.category === 'read_write');
  const readOnlyTypes = SUPPORTED_FILE_TYPES.filter((f) => f.category === 'read_only');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      {/* Compact Qt-style QDialog window frame */}
      <div
        className={`w-full max-w-lg shadow-2xl rounded-xl border overflow-hidden transition-all duration-200 flex flex-col font-sans text-xs ${
          os === 'macos'
            ? 'bg-white/95 dark:bg-[#1e1e24]/95 border-neutral-300/80 dark:border-neutral-700/80 text-[#1d1d1f] dark:text-[#f5f5f7]'
            : os === 'linux'
            ? 'bg-[#2a2638] border-[#1f1c29] text-[#deddda]'
            : 'bg-[#f0f0f0] dark:bg-[#202020] border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {/* Header following native OS guidelines */}
        <DialogHeader
          os={os}
          title="Options"
          icon={<span className="text-sm">⚙️</span>}
          onClose={onClose}
        />

        {/* Compact Qt QTabBar */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-neutral-300 dark:border-neutral-700 bg-neutral-200/50 dark:bg-neutral-800/40 text-[11px] shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('associations')}
            className={`px-3 py-1.5 rounded-t-md font-medium border-t border-l border-r transition-all cursor-pointer ${
              activeTab === 'associations'
                ? 'bg-white dark:bg-[#202020] border-neutral-300 dark:border-neutral-700 text-blue-600 dark:text-blue-400 font-bold -mb-[1px] shadow-2xs'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            File Formats
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('view_theme')}
            className={`px-3 py-1.5 rounded-t-md font-medium border-t border-l border-r transition-all cursor-pointer ${
              activeTab === 'view_theme'
                ? 'bg-white dark:bg-[#202020] border-neutral-300 dark:border-neutral-700 text-blue-600 dark:text-blue-400 font-bold -mb-[1px] shadow-2xs'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Appearance
          </button>
        </div>

        {/* Compact Content Area */}
        <div className="p-3 space-y-3 bg-white dark:bg-[#202020] overflow-y-auto max-h-[68vh]">
          {/* TAB 1: FILE FORMATS & ASSOCIATIONS */}
          {activeTab === 'associations' && (
            <div className="space-y-2.5">
              {/* Compact Qt-style Action Bar */}
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-neutral-500 font-medium">
                  Associated: <strong className="text-neutral-900 dark:text-neutral-100">{selectedAssocs.length}</strong> of {SUPPORTED_FILE_TYPES.length} formats
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer text-[10.5px]"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectReadWrite}
                    className="px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 cursor-pointer text-[10.5px]"
                  >
                    + R/W
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectReadOnly}
                    className="px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 cursor-pointer text-[10.5px]"
                  >
                    + R/O
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-pointer text-[10.5px]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Group 1: Read and Write Formats (Qt QGroupBox) */}
              <fieldset className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 pt-1.5 bg-neutral-50/50 dark:bg-neutral-900/30">
                <legend className="px-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>●</span>
                  <span>Read and Write Formats (7) — Full Creation & Compression</span>
                </legend>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                  {readWriteTypes.map((item) => {
                    const checked = selectedAssocs.includes(item.ext);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-medium'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExt(item.ext)}
                          className="rounded text-emerald-600 cursor-pointer w-3.5 h-3.5 shrink-0"
                        />
                        <span className="font-mono font-bold text-[11px] shrink-0 min-w-[48px]">
                          {item.ext}
                        </span>
                        <span className="text-[10.5px] text-neutral-600 dark:text-neutral-400 truncate">
                          {item.shortLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Group 2: Read Only Formats (Qt QGroupBox) */}
              <fieldset className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 pt-1.5 bg-neutral-50/50 dark:bg-neutral-900/30">
                <legend className="px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <span>●</span>
                  <span>Read Only Formats (6) — Decompression & Inspection</span>
                </legend>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                  {readOnlyTypes.map((item) => {
                    const checked = selectedAssocs.includes(item.ext);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                          checked
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-medium'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExt(item.ext)}
                          className="rounded text-amber-600 cursor-pointer w-3.5 h-3.5 shrink-0"
                        />
                        <span className="font-mono font-bold text-[11px] shrink-0 min-w-[48px]">
                          {item.ext}
                        </span>
                        <span className="text-[10.5px] text-neutral-600 dark:text-neutral-400 truncate">
                          {item.shortLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Compact Note on System Elevation */}
              <div className="flex items-center gap-1.5 text-[10.5px] text-neutral-500 dark:text-neutral-400 px-1 pt-0.5">
                <ShieldIcon size={13} />
                <span>Modifying system associations will request OS elevated privileges on Apply.</span>
              </div>
            </div>
          )}

          {/* TAB 2: COMBINED ARCHIVE VIEW CONTROLS & THEME */}
          {activeTab === 'view_theme' && (
            <div className="space-y-3">
              {/* Archive View Controls */}
              <fieldset className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-900/30">
                <legend className="px-1.5 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Archive View Controls
                </legend>

                <label className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={currentCheckboxes}
                    onChange={(e) => setCurrentCheckboxes(e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer w-4 h-4"
                  />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 block text-[11.5px]">
                      Show selection checkboxes in archive table rows
                    </span>
                    <span className="text-[10.5px] text-neutral-500 block">
                      Enables checkbox columns for touch and single-click multi-file batch operations.
                    </span>
                  </div>
                </label>
              </fieldset>

              {/* Theme Settings */}
              <fieldset className="border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-900/30">
                <legend className="px-1.5 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Theme
                </legend>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentMode === 'device'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200 shadow-2xs'
                        : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="themeModeOpt"
                      checked={currentMode === 'device'}
                      onChange={() => setCurrentMode('device')}
                      className="hidden"
                    />
                    <span className="text-base">🖥️</span>
                    <span className="text-[11px]">Device setting</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentMode === 'light'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200 shadow-2xs'
                        : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="themeModeOpt"
                      checked={currentMode === 'light'}
                      onChange={() => setCurrentMode('light')}
                      className="hidden"
                    />
                    <span className="text-base">☀️</span>
                    <span className="text-[11px]">Light mode</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border cursor-pointer flex flex-col items-center justify-center gap-1 text-center transition-all ${
                      currentMode === 'dark'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-200 shadow-2xs'
                        : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="themeModeOpt"
                      checked={currentMode === 'dark'}
                      onChange={() => setCurrentMode('dark')}
                      className="hidden"
                    />
                    <span className="text-base">🌙</span>
                    <span className="text-[11px]">Dark mode</span>
                  </label>
                </div>
              </fieldset>
            </div>
          )}
        </div>

        {/* Compact Qt QDialogButtonBox */}
        <div className="flex items-center justify-end px-3 py-2 border-t border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900/60 shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOkClick}
              className="px-3.5 py-1 rounded border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer text-xs min-w-[64px] shadow-2xs"
            >
              OK
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer text-xs min-w-[64px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyClick}
              className="px-3.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors cursor-pointer text-xs flex items-center gap-1 min-w-[64px]"
            >
              {hasAssocChanges() && <ShieldIcon size={12} />}
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>

      {/* UAC / Elevating Privileges Modal */}
      {showElevationPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#1c1c1f] border border-amber-300 dark:border-amber-600 shadow-2xl p-4 space-y-3 text-xs font-sans">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div>
                <span className="font-bold text-xs block leading-tight text-neutral-900 dark:text-neutral-100">
                  {os === 'windows' ? 'User Account Control (UAC)' : 'Administrator Privileges'}
                </span>
                <span className="text-[10.5px] text-neutral-500 block">
                  Qt Shell Registration: QSettings & MIME Handler
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
              Register system file associations for{' '}
              <strong className="font-mono text-blue-600 dark:text-blue-400">
                {selectedAssocs.length} formats
              </strong>{' '}
              with your operating system?
            </div>

            <div className="flex justify-end gap-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleCancelElevation}
                className="px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmElevation}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs text-xs"
              >
                <ShieldIcon size={12} />
                <span>Yes (Elevate)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
