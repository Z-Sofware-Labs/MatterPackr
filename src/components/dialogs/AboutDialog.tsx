import React from 'react';
import { PlatformOS } from '../../types/winzip';
import matterpackrIcon from '../../assets/matterpackr-icon.png';
import zSoftwareLabsIcon from '../../assets/z-software-labs-icon.svg';
import { DialogHeader } from './DialogHeader';

interface AboutDialogProps {
  os: PlatformOS;
  isOpen: boolean;
  onClose: () => void;
  threadsCount?: number;
}

const MIT_LICENSE_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export const AboutDialog: React.FC<AboutDialogProps> = ({
  os,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div
        className={`w-full max-w-sm sm:max-w-md border rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col items-center relative font-sans transition-all ${
          os === 'macos'
            ? 'bg-[#181920]/95 border-[#2b2d38]'
            : os === 'linux'
            ? 'bg-[#242031] border-[#1f1c29]'
            : 'bg-[#16171c] border-[#2b2d38]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar following native OS guidelines */}
        <DialogHeader
          os={os}
          title="About MatterPackr"
          onClose={onClose}
        />

        <div className="w-full p-6 pt-3 flex flex-col items-center text-center">
          {/* App Icon */}
          <div className="my-2.5">
            <img
              src={matterpackrIcon}
              alt="MatterPackr"
              className="w-16 h-16 object-contain select-none drop-shadow-md"
              draggable={false}
            />
          </div>

          {/* App Title & Version */}
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            MatterPackr
          </h2>
          <span className="text-xs text-neutral-400 mt-0.5 font-medium">
            Version 3.0.12
          </span>

          {/* Copyright Line with Z Software Labs SVG Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 mt-2">
            <span>Copyright © 2026</span>
            <img
              src={zSoftwareLabsIcon}
              alt="Z Software Labs"
              className="w-3.5 h-3.5 object-contain inline-block"
            />
            <span>Z Software Labs. All rights reserved.</span>
          </div>

          {/* Description Paragraph */}
          <p className="text-xs text-neutral-300 text-center mt-3 leading-relaxed max-w-[340px]">
            MatterPackr is a lightweight, utility-driven desktop archive manager designed for fast, effortless compression workflows.
          </p>

          {/* License Link */}
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-center gap-1">
            <span>This application is licensed under</span>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#38bdf8] hover:text-[#67e8f9] font-medium inline-flex items-center gap-0.5"
            >
              MIT
              <svg
                className="w-2.5 h-2.5 inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>

          {/* Scrollable License Box (MIT + Third-Party Credits) */}
          <div className="w-full mt-3.5 bg-[#101115] border border-[#252733] rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-neutral-300 select-text text-left">
            <p className="whitespace-pre-line opacity-90 mb-3">
              {MIT_LICENSE_TEXT}
            </p>
            <hr className="border-neutral-700/60 my-2" />
            <p className="font-sans font-semibold text-neutral-200 text-xs mb-1">
              Third-Party Licenses
            </p>
            <p className="mb-1 text-[10.5px]">
              <strong className="text-neutral-200 font-sans">libarchive:</strong> Copyright © 2003-2007 Tim Kientzle. BSD License.
            </p>
            <p className="mb-1 text-[10.5px]">
              <strong className="text-neutral-200 font-sans">7-Zip:</strong> Copyright © 1999-2026 Igor Pavlov. GNU Lesser GPL.
            </p>
            <p className="text-[10.5px]">
              <strong className="text-neutral-200 font-sans">UnRAR:</strong> Copyright © Alexander Roshal. Freeware license.
            </p>
          </div>

          {/* OK Button */}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-8 py-1.5 rounded-lg bg-[#272a36] hover:bg-[#343849] active:bg-[#1e2029] border border-[#3e4255] text-neutral-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-w-[96px]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
