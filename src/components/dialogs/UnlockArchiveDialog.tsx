import React, { useState } from 'react';
import { PlatformOS } from '../../types/winzip';
import { EncryptIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface UnlockArchiveDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  archiveName: string;
  onClose: () => void;
  onUnlock: (password: string) => void;
}

export const UnlockArchiveDialog: React.FC<UnlockArchiveDialogProps> = ({
  os,
  isOpen,
  archiveName,
  onClose,
  onUnlock,
}) => {
  const [password, setPassword] = useState<string>('');
  const [mask, setMask] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the password to decrypt this archive.');
      return;
    }
    setError('');
    onUnlock(password);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
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
          title="Encrypted Archive Detected"
          icon={<EncryptIcon os={os} size={20} />}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-[11.5px] flex items-start gap-2.5">
            <span className="text-base shrink-0 mt-0.5">🔒</span>
            <div>
              <span className="font-semibold block">Password Protected Contents</span>
              <span className="opacity-90 leading-relaxed block mt-0.5">
                The archive <strong className="font-mono text-amber-900 dark:text-amber-200">{archiveName}</strong> is
                encrypted with AES-256 cipher. Enter the correct passphrase to inspect and extract files.
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
              Decryption Passphrase:
            </label>
            <input
              type={mask ? 'password' : 'text'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter archive password..."
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={mask}
                onChange={(e) => setMask(e.target.checked)}
                className="rounded text-blue-600 cursor-pointer"
              />
              <span>Mask password</span>
            </label>
            <span className="text-[10px] text-neutral-400 font-mono">WinZip AE-2 / 7-Zip AES</span>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11px]">
              ⚠️ {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-2"
            >
              <span>Unlock Archive</span>
              <span>🔓</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
