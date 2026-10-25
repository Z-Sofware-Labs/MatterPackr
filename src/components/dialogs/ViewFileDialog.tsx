import React, { useState } from 'react';
import { ArchiveFile, PlatformOS } from '../../types/winzip';
import { formatBytes } from '../../utils/crc32';
import { FileTypeIcon, getFriendlyFileTypeName } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface ViewFileDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  file?: ArchiveFile;
}

export const ViewFileDialog: React.FC<ViewFileDialogProps> = ({
  os,
  isOpen,
  onClose,
  file,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'text' | 'hex'>('text');

  if (!isOpen || !file) return null;

  const contentStr =
    typeof file.content === 'string'
      ? file.content
      : file.content
      ? new TextDecoder().decode(file.content)
      : `[Binary Payload: ${formatBytes(file.size)}]\nNo inline plain-text preview available. Click Extract or Export to unpack this file to disk.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([contentStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderHexDump = () => {
    const sample = contentStr.slice(0, 512);
    const lines = [];
    for (let i = 0; i < sample.length; i += 16) {
      const chunk = sample.slice(i, i + 16);
      const hex = Array.from(chunk)
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const ascii = chunk.replace(/[^\x20-\x7E]/g, '.');
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      lines.push(`${offset}  ${hex.padEnd(48, ' ')}  |${ascii}|`);
    }
    return lines.join('\n');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-2xl shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
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
          title={`File Viewer — [${file.name}]`}
          icon={
            <FileTypeIcon
              fileName={file.name}
              isDirectory={file.isDirectory}
              isEncrypted={file.encrypted}
              os={os}
              size={22}
            />
          }
          onClose={onClose}
          actions={
            <div className="flex bg-neutral-200/60 dark:bg-neutral-800 p-0.5 rounded-lg text-[11px] font-medium mr-1">
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'text'
                    ? 'bg-white dark:bg-neutral-700 shadow-xs font-bold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hex')}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'hex'
                    ? 'bg-white dark:bg-neutral-700 shadow-xs font-bold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Hex
              </button>
            </div>
          }
        />

        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Content Viewer Area */}
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 font-mono text-[11px] h-72 overflow-auto select-text text-neutral-800 dark:text-neutral-200 whitespace-pre">
            {viewMode === 'text' ? contentStr : renderHexDump()}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
              >
                {copied ? '✓ Copied' : 'Copy Content'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
              >
                Export File...
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
