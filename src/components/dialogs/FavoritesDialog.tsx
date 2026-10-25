import React from 'react';
import { PlatformOS } from '../../types/winzip';
import { FavoritesIcon } from '../PlatformIcons';
import { FileTypeIcon } from '../FileTypeIcons';
import { DialogHeader } from './DialogHeader';

interface FavoritesDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onOpenArchive: (path: string) => void;
}

const sampleFavoriteArchives = [
  { name: 'MATTERPACKR_ASSETS.ZIP', path: 'C:\\ARCHIVES\\MATTERPACKR_ASSETS.ZIP', size: '4.2 MB', date: '04/18/2002', count: 12 },
  { name: 'SYSTEM_BACKUP_2026.7Z', path: '~/Documents/SYSTEM_BACKUP_2026.7Z', size: '128.4 MB', date: '10/02/2026', count: 48 },
  { name: 'ENCRYPTED_VAULT_AES256.ZIP', path: '~/SecureVault/ENCRYPTED_VAULT_AES256.ZIP', size: '16.8 MB', date: '09/15/2026', count: 12 },
  { name: 'QT6_CPP_ENGINE_CORE.ZIP', path: '~/Development/QT6_CPP_ENGINE_CORE.ZIP', size: '2.8 MB', date: '10/08/2026', count: 9 },
];

export const FavoritesDialog: React.FC<FavoritesDialogProps> = ({
  os,
  isOpen,
  onClose,
  onOpenArchive,
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
          title="Favorite Archives & Bookmarks"
          icon={<FavoritesIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Content */}
        <div className="p-5 space-y-3 text-xs font-sans">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sampleFavoriteArchives.map((fav, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onOpenArchive(fav.name);
                  onClose();
                }}
                className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <FileTypeIcon fileName={fav.name} os={os} size={24} />
                  <div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {fav.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono block truncate max-w-[220px]">
                      {fav.path}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[11px] text-neutral-500 block">{fav.size}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                    {fav.count} files
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
