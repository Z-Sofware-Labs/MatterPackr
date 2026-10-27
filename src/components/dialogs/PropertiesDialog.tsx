import React, { useState } from 'react';
import { ArchiveFile, ArchiveState, PlatformOS } from '../../types/winzip';
import { formatBytes, formatNumber } from '../../utils/crc32';
import { AppLogoIcon } from '../PlatformIcons';
import { FileTypeIcon, getFriendlyFileTypeName } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface PropertiesDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  archive: ArchiveState;
  file?: ArchiveFile | null;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  os,
  isOpen,
  onClose,
  archive,
  file,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'details' | 'permissions'>('general');
  const [macSectionGeneral, setMacSectionGeneral] = useState(true);
  const [macSectionMore, setMacSectionMore] = useState(true);
  const [macSectionPermissions, setMacSectionPermissions] = useState(true);

  if (!isOpen) return null;

  const fileName = file ? file.name : (archive.files.length > 0 ? 'Archive.zip' : 'NEW_ARCHIVE.ZIP');
  const uncompressedSize = file ? file.size : archive.totalSize;
  const packedSize = file ? file.packedSize : archive.totalPackedSize;
  const isEncrypted = file ? file.encrypted : archive.isEncrypted;

  // =========================================================================
  // WINDOWS NATIVE RIGHT-CLICK PROPERTIES DIALOG
  // =========================================================================
  const renderWindows = () => (
    <div className="w-full max-w-[420px] bg-[#f0f0f0] dark:bg-[#202020] text-black dark:text-neutral-100 rounded-lg shadow-2xl border border-[#999] dark:border-neutral-700 text-xs font-sans overflow-hidden select-none">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#e8e8e8] dark:bg-[#181818] border-b border-[#ccc] dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <AppLogoIcon os="windows" size={16} />
          <span className="font-normal text-[12px] truncate">{fileName} Properties</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-5 flex items-center justify-center hover:bg-red-600 hover:text-white rounded-xs transition-colors cursor-pointer text-xs"
        >
          ✕
        </button>
      </div>

      {/* Property Sheet Tabs */}
      <div className="flex px-2 pt-2 border-b border-[#d0d0d0] dark:border-neutral-700 bg-[#e4e4e4] dark:bg-[#252525] gap-1 text-[11px]">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1 rounded-t border-t border-l border-r cursor-pointer ${
            activeTab === 'general'
              ? 'bg-[#f0f0f0] dark:bg-[#202020] border-[#999] dark:border-neutral-600 font-semibold -mb-px pb-1.5'
              : 'bg-[#dedede] dark:bg-[#2a2a2a] border-transparent text-neutral-600 dark:text-neutral-400'
          }`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-3 py-1 rounded-t border-t border-l border-r cursor-pointer ${
            activeTab === 'details'
              ? 'bg-[#f0f0f0] dark:bg-[#202020] border-[#999] dark:border-neutral-600 font-semibold -mb-px pb-1.5'
              : 'bg-[#dedede] dark:bg-[#2a2a2a] border-transparent text-neutral-600 dark:text-neutral-400'
          }`}
        >
          Details
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3.5 bg-[#f0f0f0] dark:bg-[#202020] min-h-[340px]">
        {activeTab === 'general' ? (
          <>
            {/* Top row: Icon + Filename input */}
            <div className="flex items-center gap-3 pb-2 border-b border-[#d8d8d8] dark:border-neutral-700">
              <AppLogoIcon os="windows" size={36} />
              <input
                type="text"
                readOnly
                value={fileName}
                className="flex-1 px-2 py-1 bg-white dark:bg-[#2d2d2d] border border-[#a0a0a0] dark:border-neutral-600 rounded text-xs font-medium"
              />
            </div>

            {/* Type & Opens With */}
            <div className="space-y-1.5 pb-2 border-b border-[#d8d8d8] dark:border-neutral-700">
              <div className="grid grid-cols-[110px_1fr] items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Type of file:</span>
                <span className="font-medium">Compressed (zipped) Folder (.zip)</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Opens with:</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">MatterPackr</span>
                  <button
                    type="button"
                    className="px-2.5 py-0.5 border border-[#adadad] bg-neutral-100 dark:bg-neutral-800 rounded text-[11px] hover:bg-neutral-200 cursor-pointer"
                  >
                    Change...
                  </button>
                </div>
              </div>
            </div>

            {/* Location & Size */}
            <div className="space-y-1.5 pb-2 border-b border-[#d8d8d8] dark:border-neutral-700">
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Location:</span>
                <span className="truncate font-mono text-[11px]">C:\Users\Alvin\Documents</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Size:</span>
                <span>{formatBytes(uncompressedSize)} ({formatNumber(uncompressedSize)} bytes)</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Size on disk:</span>
                <span>{formatBytes(packedSize)} ({formatNumber(packedSize)} bytes)</span>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1.5 pb-2 border-b border-[#d8d8d8] dark:border-neutral-700">
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Created:</span>
                <span>Monday, October 26, 2026, 8:15:30 AM</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Modified:</span>
                <span>Tuesday, October 27, 2026, 8:04:12 AM</span>
              </div>
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-neutral-600 dark:text-neutral-400">Accessed:</span>
                <span>Today, October 27, 2026</span>
              </div>
            </div>

            {/* Attributes */}
            <div className="grid grid-cols-[110px_1fr] items-center pt-1">
              <span className="text-neutral-600 dark:text-neutral-400">Attributes:</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" readOnly className="rounded-xs" />
                    <span>Read-only</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" readOnly className="rounded-xs" />
                    <span>Hidden</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="px-2 py-0.5 border border-[#adadad] bg-neutral-100 dark:bg-neutral-800 rounded text-[11px] hover:bg-neutral-200 cursor-pointer"
                >
                  Advanced...
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between border-b pb-1">
              <span className="text-neutral-500">Total Entries</span>
              <span className="font-semibold">{archive.files.length} items</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-neutral-500">Compression Method</span>
              <span className="font-semibold">Deflate64 / AES-256</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-neutral-500">Encryption Standard</span>
              <span className="font-semibold text-blue-600">{isEncrypted ? '256-bit AES' : 'None'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-neutral-500">Multi-threading Cores</span>
              <span className="font-semibold">{archive.threadsCount} Active Cores</span>
            </div>
          </div>
        )}
      </div>

      {/* Windows Dialog Buttons (OK, Cancel, Apply) */}
      <div className="flex justify-end gap-2 p-3 bg-[#e8e8e8] dark:bg-[#1a1a1a] border-t border-[#d0d0d0] dark:border-neutral-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1 bg-white dark:bg-neutral-800 border border-[#adadad] rounded shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer text-xs"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1 bg-white dark:bg-neutral-800 border border-[#adadad] rounded shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled
          className="px-4 py-1 bg-neutral-100 dark:bg-neutral-900 border border-[#ccc] dark:border-neutral-800 text-neutral-400 rounded text-xs cursor-default"
        >
          Apply
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // MACOS FINDER NATIVE "GET INFO" INSPECTOR WINDOW (Cmd+I)
  // =========================================================================
  const renderMacOS = () => (
    <div className="w-full max-w-[360px] bg-[#ececec]/95 dark:bg-[#242426]/95 backdrop-blur-xl text-[#1d1d1f] dark:text-[#f5f5f7] rounded-xl shadow-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-sans overflow-hidden select-none">
      {/* macOS Traffic Lights Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-300 dark:border-neutral-700">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer hover:opacity-80"
          />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-60" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-60" />
        </div>
        <span className="font-semibold text-xs truncate max-w-[200px]">{fileName} Info</span>
        <div className="w-8" />
      </div>

      {/* Top File Summary Panel */}
      <div className="p-3 bg-white/70 dark:bg-[#1a1a1c]/70 border-b border-neutral-300 dark:border-neutral-700 flex items-center gap-3">
        <AppLogoIcon os="macos" size={42} />
        <div>
          <div className="font-semibold text-[13px]">{fileName}</div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {formatBytes(uncompressedSize)}, Modified today, 8:04 AM
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto text-[11px]">
        {/* ▼ General */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-2">
          <button
            type="button"
            onClick={() => setMacSectionGeneral(!macSectionGeneral)}
            className="w-full text-left font-bold text-xs flex items-center gap-1 cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            <span>{macSectionGeneral ? '▼' : '▶'}</span>
            <span>General:</span>
          </button>
          {macSectionGeneral && (
            <div className="mt-2 pl-3 space-y-1.5 text-neutral-600 dark:text-neutral-300">
              <div className="grid grid-cols-[70px_1fr]">
                <span className="text-neutral-400">Kind:</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">ZIP archive</span>
              </div>
              <div className="grid grid-cols-[70px_1fr]">
                <span className="text-neutral-400">Size:</span>
                <span>{formatBytes(uncompressedSize)} ({formatNumber(uncompressedSize)} bytes on disk)</span>
              </div>
              <div className="grid grid-cols-[70px_1fr]">
                <span className="text-neutral-400">Where:</span>
                <span className="truncate">Macintosh HD ▸ Users ▸ alvin ▸ Downloads</span>
              </div>
              <div className="grid grid-cols-[70px_1fr]">
                <span className="text-neutral-400">Created:</span>
                <span>Monday, October 26, 2026 at 8:15 AM</span>
              </div>
              <div className="grid grid-cols-[70px_1fr]">
                <span className="text-neutral-400">Modified:</span>
                <span>Tuesday, October 27, 2026 at 8:04 AM</span>
              </div>
            </div>
          )}
        </div>

        {/* ▼ More Info */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 pb-2">
          <button
            type="button"
            onClick={() => setMacSectionMore(!macSectionMore)}
            className="w-full text-left font-bold text-xs flex items-center gap-1 cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            <span>{macSectionMore ? '▼' : '▶'}</span>
            <span>More Info:</span>
          </button>
          {macSectionMore && (
            <div className="mt-2 pl-3 space-y-1.5 text-neutral-600 dark:text-neutral-300">
              <div className="grid grid-cols-[90px_1fr]">
                <span className="text-neutral-400">Compression:</span>
                <span>Multi-threaded Deflate64</span>
              </div>
              <div className="grid grid-cols-[90px_1fr]">
                <span className="text-neutral-400">Encryption:</span>
                <span className="font-semibold text-blue-500">{isEncrypted ? 'AES-256' : 'None'}</span>
              </div>
              <div className="grid grid-cols-[90px_1fr]">
                <span className="text-neutral-400">Total Items:</span>
                <span>{archive.files.length} archive entries</span>
              </div>
            </div>
          )}
        </div>

        {/* ▼ Sharing & Permissions */}
        <div>
          <button
            type="button"
            onClick={() => setMacSectionPermissions(!macSectionPermissions)}
            className="w-full text-left font-bold text-xs flex items-center gap-1 cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            <span>{macSectionPermissions ? '▼' : '▶'}</span>
            <span>Sharing & Permissions:</span>
          </button>
          {macSectionPermissions && (
            <div className="mt-2 border border-neutral-300 dark:border-neutral-700 rounded overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-neutral-200/60 dark:bg-neutral-800">
                  <tr>
                    <th className="p-1.5 font-semibold">Name</th>
                    <th className="p-1.5 font-semibold">Privilege</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  <tr>
                    <td className="p-1.5">alvin (Me)</td>
                    <td className="p-1.5 text-blue-600 dark:text-blue-400">Read & Write</td>
                  </tr>
                  <tr>
                    <td className="p-1.5">staff</td>
                    <td className="p-1.5 text-neutral-500">Read only</td>
                  </tr>
                  <tr>
                    <td className="p-1.5">everyone</td>
                    <td className="p-1.5 text-neutral-500">Read only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // LINUX (GNOME / NAUTILUS) NATIVE FILE PROPERTIES WINDOW
  // =========================================================================
  const renderLinux = () => (
    <div className="w-full max-w-[390px] bg-[#2a2638] text-[#deddda] rounded-xl shadow-2xl border border-[#1f1c29] text-xs font-sans overflow-hidden select-none">
      {/* GNOME Headerbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#242031] border-b border-[#1b1725]">
        <div className="flex items-center gap-2">
          <AppLogoIcon os="linux" size={20} />
          <span className="font-bold text-xs">{fileName} Properties</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-700/60 text-[#deddda] cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* GNOME Tabs */}
      <div className="flex justify-center p-2 bg-[#201c2c] border-b border-[#1b1725] gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-1 rounded-md font-medium cursor-pointer transition-colors ${
            activeTab === 'general' ? 'bg-[#3584e4] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-1 rounded-md font-medium cursor-pointer transition-colors ${
            activeTab === 'permissions' ? 'bg-[#3584e4] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Permissions
        </button>
      </div>

      {/* Linux Tab Content */}
      <div className="p-4 space-y-3 min-h-[300px]">
        {activeTab === 'general' ? (
          <>
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-700/50">
              <AppLogoIcon os="linux" size={40} />
              <div>
                <div className="font-bold text-sm text-white">{fileName}</div>
                <div className="text-[11px] text-neutral-400">Zip archive (application/zip)</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Contents:</span>
                <span>{archive.files.length} items, totalling {formatBytes(uncompressedSize)}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Size:</span>
                <span>{formatBytes(uncompressedSize)} ({formatNumber(uncompressedSize)} bytes)</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Parent Folder:</span>
                <span className="text-blue-400 truncate">/home/alvin/Downloads</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Created:</span>
                <span>26 Oct 2026, 08:15</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Modified:</span>
                <span>27 Oct 2026, 08:04</span>
              </div>
              <div className="grid grid-cols-[100px_1fr]">
                <span className="text-neutral-400">Accessed:</span>
                <span>27 Oct 2026, 08:34</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="border-b border-neutral-700/50 pb-2">
              <div className="font-bold text-white mb-1">Owner</div>
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-neutral-400">Owner:</span>
                <span>alvin - Alvin</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] mt-1">
                <span className="text-neutral-400">Access:</span>
                <span className="text-emerald-400">Read and write</span>
              </div>
            </div>

            <div className="border-b border-neutral-700/50 pb-2">
              <div className="font-bold text-white mb-1">Group</div>
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-neutral-400">Group:</span>
                <span>alvin</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] mt-1">
                <span className="text-neutral-400">Access:</span>
                <span>Read-only</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-white mb-1">Others</div>
              <div className="grid grid-cols-[80px_1fr]">
                <span className="text-neutral-400">Access:</span>
                <span>None</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Linux Footer */}
      <div className="flex justify-end p-3 bg-[#242031] border-t border-[#1b1725]">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 rounded-lg bg-[#3584e4] hover:bg-[#2871cc] text-white font-semibold transition-colors cursor-pointer text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {os === 'macos' ? renderMacOS() : os === 'linux' ? renderLinux() : renderWindows()}
    </div>
  );
};
