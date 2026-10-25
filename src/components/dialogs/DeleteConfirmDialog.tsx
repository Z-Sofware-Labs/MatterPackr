import React from 'react';
import { ArchiveFile, PlatformOS } from '../../types/winzip';
import { DeleteIcon } from '../PlatformIcons';
import { FileTypeIcon } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface DeleteConfirmDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedFiles: ArchiveFile[];
  archiveName: string;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  os,
  isOpen,
  onClose,
  onConfirm,
  selectedFiles,
  archiveName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-md shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
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
          title="Confirm Deletion"
          icon={<DeleteIcon os={os} size={20} />}
          onClose={onClose}
          isDanger={true}
        />

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-sans">
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Are you sure you want to delete <strong className="text-red-600 dark:text-red-400">{selectedFiles.length}</strong> file(s) from{' '}
            <strong className="font-mono text-neutral-900 dark:text-neutral-100">{archiveName}</strong>?
          </p>

          <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 p-2.5 bg-neutral-50 dark:bg-neutral-900/40 space-y-1.5 font-mono text-[11px]">
            {selectedFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-2 truncate text-neutral-700 dark:text-neutral-300">
                <FileTypeIcon
                  fileName={f.name}
                  isDirectory={f.isDirectory}
                  isEncrypted={f.encrypted}
                  os={os}
                  size={16}
                />
                <span className="truncate">{f.name}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-neutral-400">
            This will update the ZIP table of contents and recompute archive statistics.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Delete Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
