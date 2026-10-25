import React, { useState } from 'react';
import { EncryptionMethod, PlatformOS } from '../../types/winzip';
import { EncryptIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface PasswordDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onSetEncryption: (password: string, method: EncryptionMethod) => void;
  initialPassword?: string;
  initialMethod?: EncryptionMethod;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  os,
  isOpen,
  onClose,
  onSetEncryption,
  initialPassword = '',
  initialMethod = 'aes-256',
}) => {
  const [password, setPassword] = useState<string>(initialPassword);
  const [confirmPassword, setConfirmPassword] = useState<string>(initialPassword);
  const [method, setMethod] = useState<EncryptionMethod>(initialMethod);
  const [maskPassword, setMaskPassword] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-neutral-300' };
    if (pass.length < 6) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (pass.length < 10) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) {
      return { score: 4, label: 'Maximum (AES-256 Grade)', color: 'bg-emerald-600' };
    }
    return { score: 3, label: 'Strong', color: 'bg-blue-600' };
  };

  const strength = calculateStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please specify a password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords you typed do not match. Please retype.');
      return;
    }
    setError('');
    onSetEncryption(password, method);
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
          title="File Encryption & Passphrase"
          icon={<EncryptIcon os={os} size={20} />}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Passwords */}
          <div className="space-y-3">
            <div>
              <label className="block font-medium mb-1">Passphrase:</label>
              <input
                type={maskPassword ? 'password' : 'text'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono text-xs outline-none"
                placeholder="Enter strong passphrase..."
                autoFocus
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Confirm Passphrase:</label>
              <input
                type={maskPassword ? 'password' : 'text'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono text-xs outline-none"
                placeholder="Confirm passphrase..."
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={maskPassword}
                  onChange={(e) => setMaskPassword(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <span>Mask passphrase</span>
              </label>

              {/* Password Strength */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-neutral-400">Strength:</span>
                <span className={`font-semibold ${strength.score >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {strength.label}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11px]">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Encryption Algorithm Selection */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 space-y-2.5">
            <span className="font-semibold block border-b border-neutral-200 dark:border-neutral-800 pb-1">
              Cipher Algorithm
            </span>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="encMethod"
                checked={method === 'aes-256'}
                onChange={() => setMethod('aes-256')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">256-bit AES Encryption</span>
                <span className="text-[11px] text-neutral-500 block">
                  Strongest protection conforming to WinZip AE-2 and OpenSSL CTR specifications.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="encMethod"
                checked={method === 'aes-128'}
                onChange={() => setMethod('aes-128')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold">128-bit AES Encryption</span>
                <span className="text-[11px] text-neutral-500 block">
                  High security standard with lower cryptographic compute overhead.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="encMethod"
                checked={method === 'zip20'}
                onChange={() => setMethod('zip20')}
                className="mt-0.5"
              />
              <div>
                <span className="font-bold">Standard Zip 2.0 (Legacy)</span>
                <span className="text-[11px] text-neutral-500 block">
                  Compatible with older operating systems and unarchivers.
                </span>
              </div>
            </label>
          </div>

          {/* Buttons */}
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Apply Encryption
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
