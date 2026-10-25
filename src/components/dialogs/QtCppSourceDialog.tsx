import React, { useState } from 'react';
import JSZip from 'jszip';
import { cppProjectFiles, CppSourceFile } from '../../utils/cppProjectSource';
import { PlatformOS } from '../../types/winzip';
import { CppQtIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface QtCppSourceDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
}

export const QtCppSourceDialog: React.FC<QtCppSourceDialogProps> = ({ os, isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<CppSourceFile>(cppProjectFiles[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadProjectZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      cppProjectFiles.forEach((file) => {
        zip.file(file.filename, file.content);
      });

      const buildReadme = `# MatterPackr - Qt 6 / C++20 Multi-Threaded Archiver (v2.0.0)

Targeting:
* Windows 11 (Fluent Design, DWM Mica integration)
* macOS Sequoia / Sonoma (Human Interface Guidelines, unified toolbar)
* Linux GNOME 45+ (Libadwaita / Wayland / FreeDesktop XDG)

## Prerequisites
* Qt 6.5+ LTS or Qt 5.15+ (Core, Gui, Widgets, Concurrent)
* CMake 3.22+
* C++20 compatible compiler (MSVC 2022, Clang 15+, GCC 12+)
* OpenSSL 3.0+ & zlib 1.2.11+

## Build Instructions
\`\`\`bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release
\`\`\`

## Run
\`\`\`bash
./MatterPackr
\`\`\`
`;
      zip.file('README.md', buildReadme);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MatterPackr_2.0_Qt6_Cpp_Project.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
      <div
        className={`w-full max-w-4xl shadow-2xl rounded-2xl border overflow-hidden flex flex-col h-[85vh] max-h-[740px] transition-all duration-200 ${
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
          title="Native C++ & Qt Framework Architecture"
          icon={<CppQtIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Action Banner */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-100/70 dark:bg-neutral-800/40 border-b border-neutral-200/70 dark:border-neutral-800 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span>Platform Support:</span>
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium">Windows 11</span>
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium">macOS Sequoia</span>
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium">Linux GNOME</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadProjectZip}
            disabled={isExporting}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>📦</span>
            <span>{isExporting ? 'Generating ZIP...' : 'Download C++ Project (.zip)'}</span>
          </button>
        </div>

        {/* Code Workspace */}
        <div className="flex flex-1 overflow-hidden p-4 gap-3">
          {/* File Sidebar */}
          <div className="w-56 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-y-auto p-1.5 space-y-1 shrink-0 text-xs">
            <span className="text-[10px] font-bold text-neutral-400 uppercase px-2 py-1 block tracking-wider">
              Source Tree
            </span>
            {cppProjectFiles.map((file) => (
              <button
                key={file.filename}
                type="button"
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 truncate cursor-pointer transition-colors ${
                  selectedFile.filename === file.filename
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <span>{file.filename.endsWith('.h') ? '📄' : file.filename.endsWith('.cpp') ? '⚙️' : '📋'}</span>
                <span className="truncate">{file.filename}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-neutral-950 text-neutral-200 rounded-xl border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0 text-xs">
              <div>
                <span className="font-mono font-bold text-white">{selectedFile.filename}</span>
                <span className="text-[10.5px] text-neutral-400 block">{selectedFile.description}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
              >
                {copied ? '✓ Copied' : 'Copy Code'}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-neutral-300 select-text">
              <pre className="m-0 font-mono">{selectedFile.content}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3 border-t border-neutral-200/70 dark:border-neutral-800 shrink-0 text-xs text-neutral-500">
          <span>Qt 6.5 LTS / C++20 Standard · Memory-Mapped High Concurrency Architecture</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
