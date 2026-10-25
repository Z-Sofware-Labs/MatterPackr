import React, { useState } from 'react';
import { PlatformOS } from '../../types/winzip';
import { CheckOutIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface CheckOutDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onCheckOut: (targetFolder: string, groupName: string, openWhenDone: boolean) => void;
  archiveName: string;
  filesCount: number;
}

export const CheckOutDialog: React.FC<CheckOutDialogProps> = ({
  os,
  isOpen,
  onClose,
  onCheckOut,
  archiveName,
  filesCount,
}) => {
  const defaultDir =
    os === 'macos'
      ? `~/Downloads/MatterPackr_CheckOut/${archiveName.replace(/\.zip$/i, '')}`
      : os === 'linux'
      ? `/tmp/matterpackr_checkout/${archiveName.replace(/\.zip$/i, '')}`
      : `C:\\TEMP\\matterpackr_checkout\\${archiveName.replace(/\.zip$/i, '')}`;

  const [folder, setFolder] = useState<string>(defaultDir);
  const [groupName, setGroupName] = useState<string>(archiveName.replace(/\.zip$/i, ''));
  const [maxIcons, setMaxIcons] = useState<number>(50);
  const [openWhenDone, setOpenWhenDone] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckOut(folder, groupName, openWhenDone);
    onClose();
  };

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
          title="MatterPackr CheckOut"
          icon={<CheckOutIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 rounded-xl p-3 text-[11.5px] text-blue-900 dark:text-blue-200">
            CheckOut prepares <strong>{filesCount} file(s)</strong> from <strong>{archiveName}</strong> for inspection by temporarily unpacking them to a staging folder.
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              CheckOut Directory Path:
            </label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Workspace / Program Group Name:
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-medium text-neutral-700 dark:text-neutral-300">
              Maximum desktop launcher icons:
            </label>
            <input
              type="number"
              min={1}
              max={250}
              value={maxIcons}
              onChange={(e) => setMaxIcons(Number(e.target.value))}
              className="w-20 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline-none text-xs font-mono text-center"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={openWhenDone}
              onChange={(e) => setOpenWhenDone(e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span className="text-neutral-700 dark:text-neutral-300">
              Open destination folder / view files immediately after CheckOut
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 cursor-pointer"
            >
              CheckOut Archive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
