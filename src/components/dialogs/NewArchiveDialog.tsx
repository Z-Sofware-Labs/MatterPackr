import React, { useState, useRef, useEffect } from 'react';
import { EncryptionMethod, PlatformOS } from '../../types/winzip';
import { NewArchiveIcon, EncryptIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface NewArchiveDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    format: string,
    encrypt: boolean,
    password?: string,
    method?: EncryptionMethod,
    destinationFolder?: string
  ) => void;
}

export const NewArchiveDialog: React.FC<NewArchiveDialogProps> = ({
  os,
  isOpen,
  onClose,
  onCreate,
}) => {
  const [archiveName, setArchiveName] = useState<string>('NEW_VAULT_2026');
  const [format, setFormat] = useState<string>('zip');
  const [destinationFolder, setDestinationFolder] = useState<string>(() =>
    os === 'macos' ? '~/Documents/Archives/' : os === 'linux' ? '~/Documents/Archives/' : 'C:\\ARCHIVES\\'
  );
  const [encrypt, setEncrypt] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [method, setMethod] = useState<EncryptionMethod>('aes-256');
  const [maskPassword, setMaskPassword] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Hidden folder input for OS file manager folder browsing fallback
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Sync default path when OS changes
  useEffect(() => {
    setDestinationFolder(
      os === 'macos' ? '~/Documents/Archives/' : os === 'linux' ? '~/Documents/Archives/' : 'C:\\ARCHIVES\\'
    );
  }, [os]);

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

  // Browse button handler: Opens OS' File Manager to choose destination directory
  const handleBrowseDestination = async () => {
    // 1. Modern File System Access directory picker (Chromium, Edge, desktop webviews)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents',
        });
        if (dirHandle && dirHandle.name) {
          const chosenPath =
            os === 'windows'
              ? `C:\\Users\\User\\${dirHandle.name}\\`
              : `~/${dirHandle.name}/`;
          setDestinationFolder(chosenPath);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User closed the Explorer window
      }
    }

    // 2. Modern Save File Picker fallback (select exact destination file path in Explorer)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: `${archiveName}.${format}`,
          types: [
            {
              description: `${format.toUpperCase()} Archive`,
              accept: { 'application/zip': [`.${format}`] },
            },
          ],
        });
        if (fileHandle && fileHandle.name) {
          const baseName = fileHandle.name.replace(/\.[^/.]+$/, '');
          setArchiveName(baseName);
          setDestinationFolder(os === 'windows' ? 'C:\\SelectedDestination\\' : '~/SelectedDestination/');
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // 3. Fallback: Native folder input element triggers OS Explorer folder selection
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const handleFolderInputSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const relPath = (file as any).webkitRelativePath;
      const folderName = relPath ? relPath.split('/')[0] : 'Documents';
      setDestinationFolder(os === 'windows' ? `C:\\${folderName}\\` : `~/${folderName}/`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = archiveName.trim() || 'NEW_ARCHIVE';
    const fullName = cleanName.toLowerCase().endsWith(`.${format}`)
      ? cleanName
      : `${cleanName}.${format.toUpperCase()}`;

    if (encrypt) {
      if (!password) {
        setError('Please enter a passphrase to encrypt files in this archive.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-type.');
        return;
      }
    }

    setError('');
    onCreate(
      fullName,
      format,
      encrypt,
      encrypt ? password : undefined,
      encrypt ? method : undefined,
      destinationFolder
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      {/* Hidden input to open OS File Manager folder selection */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputSelected}
        // @ts-expect-error webkitdirectory is standard in HTML5 for OS folder picking
        webkitdirectory=""
        directory=""
        className="hidden"
      />

      <div
        className={`w-full max-w-lg shadow-2xl rounded-2xl border overflow-hidden transition-all duration-200 ${
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
          title="Create New Archive"
          icon={<NewArchiveIcon os={os} size={20} />}
          onClose={onClose}
        />

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Destination Location with Browse Button to open OS File Manager */}
          <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <span>📁</span>
                <span>Destination Folder:</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
                <span>Quick:</span>
                <button
                  type="button"
                  onClick={() =>
                    setDestinationFolder(os === 'macos' ? '~/Desktop/' : os === 'linux' ? '~/Desktop/' : 'C:\\Desktop\\')
                  }
                  className="hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer"
                >
                  Desktop
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() =>
                    setDestinationFolder(
                      os === 'macos' ? '~/Documents/Archives/' : os === 'linux' ? '~/Documents/Archives/' : 'C:\\ARCHIVES\\'
                    )
                  }
                  className="hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer"
                >
                  Documents
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() =>
                    setDestinationFolder(
                      os === 'macos' ? '~/Downloads/' : os === 'linux' ? '~/Downloads/' : 'C:\\Downloads\\'
                    )
                  }
                  className="hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer"
                >
                  Downloads
                </button>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={destinationFolder}
                  onChange={(e) => setDestinationFolder(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-3 pr-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Destination path..."
                />
              </div>

              {/* BROWSE BUTTON */}
              <button
                type="button"
                onClick={handleBrowseDestination}
                title="Open OS File Manager (Explorer / Finder) to select destination folder"
                className="px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 font-semibold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-98"
              >
                <span>📂</span>
                <span>Browse...</span>
              </button>
            </div>
            <span className="text-[10px] text-neutral-400 block">
              Opens {os === 'windows' ? 'Windows File Explorer' : os === 'macos' ? 'macOS Finder' : 'Linux File Manager'} to select destination directory.
            </span>
          </div>

          {/* Archive Name & Format */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Archive Name:
              </label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="ARCHIVE_NAME..."
                autoFocus
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Format:
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-2 font-medium text-xs outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="zip">ZIP Archive (.zip)</option>
                <option value="7z">7-Zip Archive (.7z)</option>
                <option value="tar">Tape Archive (.tar)</option>
                <option value="tar.gz">TAR + GZIP (.tar.gz, .tgz)</option>
                <option value="gz">GZIP Stream (.gz)</option>
                <option value="tar.bz2">BZIP2 + TAR (.tar.bz2, .tbz2)</option>
                <option value="tar.xz">XZ + TAR (.tar.xz, .txz)</option>
              </select>
            </div>
          </div>

          {/* Encryption Section */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-900 dark:text-neutral-100">
                <input
                  type="checkbox"
                  checked={encrypt}
                  onChange={(e) => {
                    setEncrypt(e.target.checked);
                    setError('');
                  }}
                  className="rounded text-blue-600 cursor-pointer w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <EncryptIcon os={os} size={16} />
                  Protect archive with encryption (Password Protected)
                </span>
              </label>
              {encrypt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                  AES-256 Active
                </span>
              )}
            </div>

            {encrypt && (
              <div className="space-y-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-700/70">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-neutral-600 dark:text-neutral-400">
                      Passphrase:
                    </label>
                    <input
                      type={maskPassword ? 'password' : 'text'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-blue-500"
                      placeholder="Enter passphrase..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-neutral-600 dark:text-neutral-400">
                      Confirm Passphrase:
                    </label>
                    <input
                      type={maskPassword ? 'password' : 'text'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-xs outline-none focus:border-blue-500"
                      placeholder="Retype passphrase..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maskPassword}
                      onChange={(e) => setMaskPassword(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span>Mask passphrase characters</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span>Strength:</span>
                    <span className={`font-semibold ${strength.score >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {strength.label}
                    </span>
                  </div>
                </div>

                {/* Cipher selection */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <label
                    className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between transition-colors ${
                      method === 'aes-256'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <input
                        type="radio"
                        name="newEncMethod"
                        checked={method === 'aes-256'}
                        onChange={() => setMethod('aes-256')}
                      />
                      <span>AES-256</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1">WinZip AE-2 Standard</span>
                  </label>

                  <label
                    className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between transition-colors ${
                      method === 'aes-128'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <input
                        type="radio"
                        name="newEncMethod"
                        checked={method === 'aes-128'}
                        onChange={() => setMethod('aes-128')}
                      />
                      <span>AES-128</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1">High Speed Cipher</span>
                  </label>

                  <label
                    className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between transition-colors ${
                      method === 'zip20'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <input
                        type="radio"
                        name="newEncMethod"
                        checked={method === 'zip20'}
                        onChange={() => setMethod('zip20')}
                      />
                      <span>Zip 2.0</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1">Legacy Compatible</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11.5px] flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Footer Action Buttons */}
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
              <NewArchiveIcon os={os} size={16} />
              <span>Create Archive</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
