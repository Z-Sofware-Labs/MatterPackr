import React, { useState, useEffect } from 'react';
import { PlatformOS } from '../../types/winzip';
import { BenchmarkIcon } from '../PlatformIcons';
import { DialogHeader } from './DialogHeader';

interface BenchmarkDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  threadsCount: number;
}

export const BenchmarkDialog: React.FC<BenchmarkDialogProps> = ({
  os,
  isOpen,
  onClose,
  threadsCount: initialThreads,
}) => {
  const [threads, setThreads] = useState<number>(initialThreads);
  const [dictSize, setDictSize] = useState<string>('32 MB');
  const [elapsed, setElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Live fluctuating benchmark numbers
  const [compSpeed, setCompSpeed] = useState<number>(44200);
  const [compRating, setCompRating] = useState<number>(46800);
  const [decompSpeed, setDecompSpeed] = useState<number>(53400);
  const [decompRating, setDecompRating] = useState<number>(56100);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      setIsRunning(true);
      return;
    }

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
      // Realistic multi-threaded MIPS fluctuations
      const baseComp = threads * 5800;
      const baseDecomp = threads * 6900;
      setCompSpeed(Math.round(baseComp + (Math.random() * 800 - 400)));
      setCompRating(Math.round(baseComp * 1.05 + (Math.random() * 600 - 300)));
      setDecompSpeed(Math.round(baseDecomp + (Math.random() * 900 - 450)));
      setDecompRating(Math.round(baseDecomp * 1.04 + (Math.random() * 700 - 350)));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, threads]);

  if (!isOpen) return null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 select-none">
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
          title="7-Zip Multi-Threaded Benchmark"
          icon={<BenchmarkIcon os={os} size={20} />}
          onClose={onClose}
        />

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Controls Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60">
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1 font-medium">Dictionary Size:</label>
              <select
                value={dictSize}
                onChange={(e) => setDictSize(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs outline-none"
              >
                <option value="16 MB">16 MB</option>
                <option value="32 MB">32 MB</option>
                <option value="64 MB">64 MB</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1 font-medium">CPU Threads:</label>
              <select
                value={threads}
                onChange={(e) => setThreads(Number(e.target.value))}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 font-mono text-xs outline-none"
              >
                <option value={1}>1 Thread</option>
                <option value={2}>2 Threads</option>
                <option value={4}>4 Threads</option>
                <option value={8}>8 Threads</option>
                <option value={16}>16 Threads</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1 font-medium">Elapsed Time:</label>
              <div className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200 py-0.5">
                {formatElapsed(elapsed)}
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/80 overflow-hidden text-xs">
            <table className="w-full border-collapse text-left font-sans">
              <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-[11px] text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Test Phase</th>
                  <th className="px-3 py-2 font-semibold text-right">Current Speed</th>
                  <th className="px-3 py-2 font-semibold text-right">Rating (MIPS)</th>
                  <th className="px-3 py-2 font-semibold text-right">CPU Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11.5px] tabular-nums">
                <tr>
                  <td className="px-3 py-2 font-sans font-semibold text-blue-600 dark:text-blue-400">
                    Compressing (LZMA2)
                  </td>
                  <td className="px-3 py-2 text-right">{compSpeed.toLocaleString()} KB/s</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {compRating.toLocaleString()} MIPS
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-500">{(threads * 96).toFixed(0)}%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans font-semibold text-sky-600 dark:text-sky-400">
                    Decompressing
                  </td>
                  <td className="px-3 py-2 text-right">{decompSpeed.toLocaleString()} KB/s</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {decompRating.toLocaleString()} MIPS
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-500">{(threads * 99).toFixed(0)}%</td>
                </tr>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60 font-bold">
                  <td className="px-3 py-2 font-sans">Total Rating</td>
                  <td className="px-3 py-2 text-right text-neutral-500">-</td>
                  <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 text-sm">
                    {Math.round((compRating + decompRating) / 2).toLocaleString()} MIPS
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-500">{(threads * 97.5).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-neutral-200/70 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-400">
              {threads} worker cores · Memory: {dictSize}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className="px-4 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
              >
                {isRunning ? 'Restart' : 'Start'}
              </button>
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
      </div>
    </div>
  );
};
