import React from 'react';
import { PlatformOS } from '../types/winzip';
import matterpackrLogo from '../assets/matterpackr-icon.png';

interface PlatformIconProps {
  os: PlatformOS;
  size?: number;
  className?: string;
}

// ----------------------------------------------------------------------
// 1. APP LOGO (Official MatterPackr Zipper Folder Icon)
// ----------------------------------------------------------------------
export const AppLogoIcon: React.FC<PlatformIconProps> = ({ size = 32, className = '' }) => {
  return (
    <img
      src={matterpackrLogo}
      width={size}
      height={size}
      alt="MatterPackr"
      className={`object-contain select-none shrink-0 ${className}`}
      draggable={false}
    />
  );
};

// ----------------------------------------------------------------------
// 2. NEW ARCHIVE ICON
// ----------------------------------------------------------------------
export const NewArchiveIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  if (os === 'macos') {
    // macOS: Apple Finder style document sliding into sky-blue folder with glass sparkle
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="mac_new_f" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path d="M4 9 C4 7.5 5 7 6.5 7 H12 L15 9.5 H26 C27.5 9.5 28 10.5 28 11.5 V23 C28 24.5 27.5 25 26 25 H6.5 C5 25 4 24.5 4 23 Z" fill="url(#mac_new_f)" />
        {/* Apple Blank Sheet */}
        <rect x="9" y="5" width="14" height="16" rx="1.5" fill="#ffffff" stroke="#93c5fd" strokeWidth="0.8" />
        <line x1="12" y1="9" x2="20" y2="9" stroke="#cbd5e1" strokeWidth="1.2" />
        <line x1="12" y1="12" x2="18" y2="12" stroke="#cbd5e1" strokeWidth="1.2" />
        {/* Apple Sparkle Star */}
        <circle cx="24" cy="7" r="4" fill="#38bdf8" />
        <path d="M24 4 L24.8 6.2 L27 7 L24.8 7.8 L24 10 L23.2 7.8 L21 7 L23.2 6.2 Z" fill="#ffffff" />
      </svg>
    );
  }

  if (os === 'linux') {
    // GNOME: Adwaita bold folder with gold star
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 8 C3 7 4 6.5 5 6.5 H12 L14.5 9 H27 C28 9 29 9.5 29 10.5 V24 C29 25 28 25.5 27 25.5 H5 C4 25.5 3 25 3 24 Z" fill="#f6d32d" stroke="#e5a50a" strokeWidth="1" />
        <rect x="8" y="5" width="14" height="15" rx="1" fill="#ffffff" stroke="#c0bfbc" strokeWidth="0.8" />
        <circle cx="23" cy="8" r="5" fill="#3584e4" stroke="#1c71d8" strokeWidth="0.8" />
        <path d="M23 5.5 V10.5 M20.5 8 H25.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // Windows 11 Fluent: Vibrant yellow folder with smooth rounded corners & sparkling document
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="win_new_g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M3 8 C3 6.5 4.5 5.5 6 5.5 H12 L15 8 H26 C27.5 8 29 9.5 29 11 V23 C29 24.5 27.5 26 26 26 H6 C4.5 26 3 24.5 3 23 Z" fill="url(#win_new_g)" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.1))" />
      <rect x="9" y="4" width="14" height="16" rx="2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="12" y1="8" x2="20" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="12" y1="11" x2="18" y2="11" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M23 4 L24.2 6.8 L27 8 L24.2 9.2 L23 12 L21.8 9.2 L19 8 L21.8 6.8 Z" fill="#0078d4" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 3. OPEN ARCHIVE (Filing Cabinet / Storage Drawer)
// ----------------------------------------------------------------------
export const OpenArchiveIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  if (os === 'macos') {
    // macOS: Polished aluminum archive vault drawer with Apple blue folders
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="5" y="4" width="22" height="24" rx="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        <rect x="7" y="17" width="18" height="9" rx="1.5" fill="#94a3b8" />
        <rect x="13" y="20" width="6" height="2.5" rx="1.2" fill="#f1f5f9" />
        {/* Top open drawer with blue files */}
        <rect x="8" y="6" width="14" height="7" rx="1.5" fill="#3b82f6" />
        <path d="M4 11 H28 L26 18 H6 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8" />
        <rect x="13" y="13.5" width="6" height="2.5" rx="1.2" fill="#ffffff" />
      </svg>
    );
  }

  if (os === 'linux') {
    // GNOME: Adwaita dark slate cabinet with warm Manila folders
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="5" y="4" width="22" height="24" rx="2" fill="#5e5c64" stroke="#241f31" strokeWidth="1" />
        <rect x="7" y="17" width="18" height="9" rx="1" fill="#3d3846" />
        <rect x="13" y="20.5" width="6" height="2" rx="1" fill="#deddda" />
        <rect x="8" y="7" width="15" height="7" rx="1" fill="#f6d32d" />
        <path d="M4 11 H28 L26 18 H6 Z" fill="#77767b" stroke="#241f31" strokeWidth="0.8" />
        <rect x="13" y="13.5" width="6" height="2" rx="1" fill="#ffffff" />
      </svg>
    );
  }

  // Windows 11 Fluent: Modern metallic blue/gray cabinet with Fluent yellow files
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="win_cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect x="5" y="4" width="22" height="24" rx="2.5" fill="url(#win_cab)" stroke="#334155" strokeWidth="1" />
      <rect x="7" y="17" width="18" height="9" rx="1.5" fill="#334155" />
      <rect x="13" y="20.5" width="6" height="2.5" rx="1.2" fill="#ffffff" />
      <rect x="9" y="6" width="14" height="7" rx="1.5" fill="#ffb900" />
      <path d="M4 11 H28 L26 18 H6 Z" fill="#e2e8f0" stroke="#0078d4" strokeWidth="0.8" />
      <rect x="13" y="13.5" width="6" height="2.5" rx="1.2" fill="#0078d4" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 4. FAVORITES ICON
// ----------------------------------------------------------------------
export const FavoritesIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  const starColor = os === 'macos' ? '#f59e0b' : os === 'linux' ? '#e5a50a' : '#ffb900';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8 C3 6.5 4.5 6 6 6 H12 L15 8.5 H26 C27.5 8.5 29 9.5 29 11 V23 C29 24.5 27.5 25.5 26 25.5 H6 C4.5 25.5 3 24.5 3 23 Z" fill={os === 'macos' ? '#38bdf8' : os === 'linux' ? '#3584e4' : '#0078d4'} />
      <path d="M21 13 L23 18 L28 18.5 L24 22 L25.5 27 L21 24.5 L16.5 27 L18 22 L14 18.5 L19 18 Z" fill={starColor} stroke="#ffffff" strokeWidth="1" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 5. ADD FILES (Modern Industrial Screw Clamp Press)
// ----------------------------------------------------------------------
export const AddFilesIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  if (os === 'macos') {
    // macOS: Space-gray precision screw press with Apple emerald badge
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="8" y="12" width="16" height="3" rx="0.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
        <rect x="7" y="15" width="18" height="3" rx="0.5" fill="#fde047" stroke="#ca8a04" strokeWidth="0.5" />
        <rect x="8" y="18" width="16" height="3" rx="0.5" fill="#93c5fd" stroke="#2563eb" strokeWidth="0.5" />
        {/* Vice Jaw */}
        <path d="M4 7 H28 V11 H23 V9 H9 V11 H4 Z" fill="#334155" />
        <rect x="14" y="2" width="4" height="7" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />
        <rect x="9" y="1" width="14" height="3" rx="1.5" fill="#e2e8f0" stroke="#334155" strokeWidth="0.5" />
        <path d="M4 22 H28 V26 C28 27.5 26.5 28.5 25 28.5 H7 C5.5 28.5 4 27.5 4 26 Z" fill="#334155" />
        {/* Apple Emerald Add Badge */}
        <circle cx="25" cy="24" r="5.5" fill="#34c759" stroke="#ffffff" strokeWidth="1.2" />
        <path d="M25 21 V27 M22 24 H28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (os === 'linux') {
    // GNOME: Adwaita Emerald vice with bold vector plus
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="7" y="13" width="18" height="3" fill="#ffffff" stroke="#c0bfbc" strokeWidth="0.5" />
        <rect x="6" y="16" width="20" height="3" fill="#f6d32d" stroke="#e5a50a" strokeWidth="0.5" />
        <path d="M4 7 H28 V11 H23 V9 H9 V11 H4 Z" fill="#2ec27e" stroke="#26a269" strokeWidth="0.8" />
        <rect x="14" y="1.5" width="4" height="7" rx="0.5" fill="#deddda" stroke="#5e5c64" strokeWidth="0.8" />
        <rect x="9" y="0.5" width="14" height="3" rx="1" fill="#f6f5f4" stroke="#5e5c64" strokeWidth="0.8" />
        <path d="M4 22 H28 V26 C28 27.5 26.5 28.5 25 28.5 H7 C5.5 28.5 4 27.5 4 26 Z" fill="#2ec27e" stroke="#26a269" strokeWidth="0.8" />
        <circle cx="25" cy="24" r="5.5" fill="#26a269" stroke="#ffffff" strokeWidth="1" />
        <path d="M25 21 V27 M22 24 H28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // Windows 11 Fluent: Fluent Teal vice clamp with vibrant Microsoft green badge
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="7" y="13" width="18" height="3" rx="0.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
      <rect x="6" y="16" width="20" height="3" rx="0.5" fill="#ffb900" stroke="#d83b01" strokeWidth="0.5" />
      <path d="M4 7 C4 5.5 5.5 5 7 5 H25 C26.5 5 28 5.5 28 7 V11 H23 V8.5 H9 V11 H4 Z" fill="#008272" />
      <rect x="14" y="1" width="4" height="7" rx="1" fill="#ffffff" stroke="#004e8c" strokeWidth="0.5" />
      <rect x="9" y="0.5" width="14" height="3" rx="1.5" fill="#f3f3f3" stroke="#004e8c" strokeWidth="0.5" />
      <path d="M4 22 H28 V25.5 C28 27.5 26.5 28.5 24.5 28.5 H7.5 C5.5 28.5 4 27.5 4 25.5 Z" fill="#008272" />
      <circle cx="25" cy="24" r="5.5" fill="#107c41" stroke="#ffffff" strokeWidth="1.2" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.2))" />
      <path d="M25 21 V27 M22 24 H28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 6. EXTRACT FILES (Unzipping Folder with Outward Flow)
// ----------------------------------------------------------------------
export const ExtractFilesIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  if (os === 'macos') {
    // macOS: Apple Finder folder with metallic unzipped teeth & upward arrow
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 11 C3 9.5 4 9 5.5 9 H12 L15 11.5 H26 C27.5 11.5 28 12.5 28 13.5 V23 C28 24.5 27.5 25 26 25 H5.5 C4 25 3 24.5 3 23 Z" fill="#38bdf8" />
        <g transform="rotate(-15 14 8)">
          <rect x="7" y="2" width="12" height="13" rx="1" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
        </g>
        <line x1="5" y1="19" x2="16" y2="15" stroke="#475569" strokeWidth="1.5" strokeDasharray="1.5 1" />
        <line x1="27" y1="19" x2="16" y2="15" stroke="#475569" strokeWidth="1.5" strokeDasharray="1.5 1" />
        <circle cx="16" cy="15" r="2.5" fill="#eab308" />
        <path d="M16 26 V16 M12 20 L16 15 L20 20" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (os === 'linux') {
    // GNOME: Adwaita folder unzipping with action arrow
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 11 C3 10 4 9.5 5 9.5 H12 L14.5 12 H27 C28 12 29 12.5 29 13.5 V24 C29 25 28 25.5 27 25.5 H5 C4 25.5 3 25 3 24 Z" fill="#f6d32d" stroke="#e5a50a" strokeWidth="1" />
        <rect x="10" y="2" width="12" height="13" rx="1" fill="#ffffff" stroke="#c0bfbc" strokeWidth="0.8" transform="rotate(-12 16 8)" />
        <path d="M16 26 V15 M12 19 L16 14 L20 19" stroke="#3584e4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Windows 11 Fluent: Fluent blue folder unzipping with Fluent arrow
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 10 C3 8.5 4.5 7.5 6 7.5 H12 L15 10 H26 C27.5 10 29 11.5 29 13 V23 C29 24.5 27.5 26 26 26 H6 C4.5 26 3 24.5 3 23 Z" fill="#0078d4" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))" />
      <rect x="9" y="3" width="13" height="14" rx="1.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" transform="rotate(-14 15 10)" />
      <path d="M16 25 V15 M12 19 L16 14 L20 19" stroke="#ffb900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 7. VIEW FILE (Magnifying Glass over Document)
// ----------------------------------------------------------------------
export const ViewFileIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="4" width="18" height="23" rx="1.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="#475569" strokeWidth="1.2" />
      <line x1="8" y1="12" x2="18" y2="12" stroke="#64748b" strokeWidth="1.2" />
      <line x1="8" y1="16" x2="15" y2="16" stroke="#94a3b8" strokeWidth="1.2" />
      {/* Lens */}
      <circle cx="19" cy="17" r="7" fill="#e0f2fe" fillOpacity="0.8" stroke={os === 'macos' ? '#0284c7' : os === 'linux' ? '#1c71d8' : '#0078d4'} strokeWidth="2" />
      <path d="M17 13 A4 4 0 0 1 22 15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="24" y="22" width="3.5" height="9" rx="1" transform="rotate(-40 24 22)" fill={os === 'macos' ? '#334155' : os === 'linux' ? '#5e5c64' : '#004e8c'} />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 8. CHECKOUT (Executive Clipboard)
// ----------------------------------------------------------------------
export const CheckOutIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="4" width="22" height="25" rx="2" fill={os === 'macos' ? '#cbd5e1' : os === 'linux' ? '#77767b' : '#94a3b8'} stroke="#475569" strokeWidth="1" />
      <rect x="7" y="8" width="18" height="19" rx="1" fill="#ffffff" />
      <rect x="12" y="2" width="8" height="4.5" rx="1" fill="#334155" />
      <path d="M9 13 L11 15 L14 11" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="22" y2="13" stroke="#475569" strokeWidth="1.2" />
      <path d="M9 18 L11 20 L14 16" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="18" x2="22" y2="18" stroke="#475569" strokeWidth="1.2" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 9. WIZARD (Magic Wand with Sparkling Stars)
// ----------------------------------------------------------------------
export const WizardIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="24" width="4.5" height="21" rx="1" transform="rotate(-45 6 24)" fill={os === 'macos' ? '#1e293b' : os === 'linux' ? '#241f31' : '#004e8c'} />
      <rect x="18" y="12" width="4.5" height="7" rx="1" transform="rotate(-45 18 12)" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.6" />
      <path d="M23 2 L24.5 5.5 L28 7 L24.5 8.5 L23 12 L21.5 8.5 L18 7 L21.5 5.5 Z" fill="#facc15" stroke="#b45309" strokeWidth="0.8" />
      <path d="M12 3 L13 5 L15 6 L13 7 L12 9 L11 7 L9 6 L11 5 Z" fill="#38bdf8" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 10. ENCRYPT (Padlock with AES-256 Badge & Key)
// ----------------------------------------------------------------------
export const EncryptIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  if (os === 'macos') {
    // macOS: Apple FileVault style solid gold padlock with Apple key & AES badge
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 13 V8 C10 4.5 12.5 2.5 16 2.5 C19.5 2.5 22 4.5 22 8 V13" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="6" y="12" width="20" height="17" rx="3.5" fill="#eab308" stroke="#a16207" strokeWidth="1" />
        <circle cx="16" cy="18" r="2.2" fill="#713f12" />
        <polygon points="15,18 17,18 18,23 14,23" fill="#713f12" />
        <rect x="10" y="24" width="12" height="3.5" rx="1" fill="#0f172a" />
        <text x="16" y="26.8" fontSize="2.8" fontWeight="bold" fill="#38bdf8" textAnchor="middle" fontFamily="monospace">AES-256</text>
        <circle cx="28" cy="7" r="3" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
        <line x1="28" y1="10" x2="28" y2="16" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="28" y1="13" x2="30" y2="13" stroke="#ca8a04" strokeWidth="1.2" />
      </svg>
    );
  }

  if (os === 'linux') {
    // GNOME: GnuPG / Seahorse padlock with key and 256-bit AES
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M10 13 V8 C10 4.5 12.5 2.5 16 2.5 C19.5 2.5 22 4.5 22 8 V13" stroke="#77767b" strokeWidth="3" strokeLinecap="round" />
        <rect x="6" y="12" width="20" height="17" rx="2" fill="#f6d32d" stroke="#e5a50a" strokeWidth="1" />
        <circle cx="16" cy="18" r="2" fill="#241f31" />
        <polygon points="15,18 17,18 18,23 14,23" fill="#241f31" />
        <rect x="9" y="24" width="14" height="3.5" rx="0.5" fill="#241f31" />
        <text x="16" y="26.8" fontSize="2.8" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">AES-256</text>
      </svg>
    );
  }

  // Windows 11 Fluent: Windows Hello style security shield & Fluent gold padlock
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 13 V8 C10 4.5 12.5 2.5 16 2.5 C19.5 2.5 22 4.5 22 8 V13" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="12" width="20" height="17" rx="3" fill="#ffb900" stroke="#d83b01" strokeWidth="1" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))" />
      <circle cx="16" cy="18" r="2" fill="#451a03" />
      <polygon points="15,18 17,18 18,23 14,23" fill="#451a03" />
      <rect x="10" y="24" width="12" height="3.5" rx="1" fill="#004e8c" />
      <text x="16" y="26.8" fontSize="2.8" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">AES-256</text>
      <circle cx="28" cy="7" r="3" fill="#facc15" stroke="#d83b01" strokeWidth="0.8" />
      <line x1="28" y1="10" x2="28" y2="16" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="28" y1="13" x2="30.5" y2="13" stroke="#ca8a04" strokeWidth="1.2" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 11. TEST ARCHIVE (Lightning Bolt & Diagnostic Checkmark)
// ----------------------------------------------------------------------
export const TestArchiveIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="4" width="20" height="24" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
      <circle cx="10" cy="10" r="2.2" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
      <path d="M8.5 10 L9.5 11 L11.5 9" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="10" x2="21" y2="10" stroke="#64748b" strokeWidth="1.2" />
      <circle cx="10" cy="16" r="2.2" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
      <path d="M8.5 16 L9.5 17 L11.5 15" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="16" x2="20" y2="16" stroke="#64748b" strokeWidth="1.2" />
      {/* 3D Lightning Bolt */}
      <path d="M22 3 L15 16 L20 16 L17 28 L27 12 L22 12 Z" fill="#facc15" stroke={os === 'macos' ? '#ca8a04' : os === 'linux' ? '#e5a50a' : '#d83b01'} strokeWidth="1" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 12. C++ / Qt CODE (Qt Framework Badge)
// ----------------------------------------------------------------------
export const CppQtIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  const bgGrad = os === 'macos' ? '#10b981' : os === 'linux' ? '#2ec27e' : '#41cd52';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="4" width="26" height="24" rx={os === 'macos' ? 6 : os === 'linux' ? 2 : 4} fill={bgGrad} stroke="#065f46" strokeWidth="1" />
      <text x="11.5" y="20.5" fontSize="14" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">Qt</text>
      <text x="22.5" y="14" fontSize="8" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">C++</text>
      <rect x="20" y="17.5" width="6.5" height="5" rx="0.8" fill="#000000" fillOpacity="0.3" />
      <text x="23.2" y="21.2" fontSize="3.8" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">x86</text>
    </svg>
  );
};

// ----------------------------------------------------------------------
// 13. DELETE (7-Zip & WinZip Delete)
// ----------------------------------------------------------------------
export const DeleteIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8 9 L10 27 C10 28.5 11 29 12.5 29 H19.5 C21 29 22 28.5 22 27 L24 9" fill={os === 'macos' ? '#cbd5e1' : '#f1f5f9'} stroke="#ef4444" strokeWidth="1.5" />
      <path d="M5 8 H27" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 5 C12 4 13 3 14 3 H18 C19 3 20 4 20 5 V8 H12 V5 Z" fill="#ef4444" />
      <line x1="13" y1="13" x2="13" y2="23" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="13" x2="19" y2="23" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 14. BENCHMARK (7-Zip Multi-Threaded Speed Benchmark)
// ----------------------------------------------------------------------
export const BenchmarkIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Speedometer gauge */}
      <path d="M6 23 A11 11 0 1 1 26 23" stroke={os === 'macos' ? '#0284c7' : '#0078d4'} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="18" r="2.5" fill="#e11d48" />
      <line x1="16" y1="18" x2="22" y2="11" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13 L11 15 M16 8 V11 M23 13 L21 15" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 15. INFO (7-Zip & WinZip Technical Archive Inspector)
// ----------------------------------------------------------------------
export const InfoIcon: React.FC<PlatformIconProps> = ({ os, size = 30, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="12" fill={os === 'macos' ? '#38bdf8' : os === 'linux' ? '#3584e4' : '#0078d4'} />
      <circle cx="16" cy="11" r="1.8" fill="#ffffff" />
      <path d="M14.5 15 H16 V22 H17.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 16. VIEW MODE TOGGLE (Classic List vs Dual-Pane Explorer)
// ----------------------------------------------------------------------
export const ViewModeToggleIcon: React.FC<PlatformIconProps & { viewMode?: 'classic' | 'explorer' }> = ({
  os,
  size = 26,
  viewMode = 'classic',
  className = '',
}) => {
  if (viewMode === 'explorer') {
    // Two-pane split icon (Tree + Table)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="4" width="26" height="24" rx="3" fill="#ffffff" stroke={os === 'macos' ? '#3b82f6' : '#0078d4'} strokeWidth="1.8" />
        <line x1="11" y1="4" x2="11" y2="28" stroke={os === 'macos' ? '#3b82f6' : '#0078d4'} strokeWidth="1.5" />
        {/* Left tree indicator */}
        <line x1="6" y1="9" x2="9" y2="9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="14" x2="9" y2="14" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="19" x2="9" y2="19" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right list rows */}
        <line x1="14" y1="9" x2="25" y2="9" stroke={os === 'macos' ? '#3b82f6' : '#0078d4'} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="14" x2="25" y2="14" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="19" x2="25" y2="19" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="24" x2="25" y2="24" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Classic table list icon
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="4" width="26" height="24" rx="3" fill="#ffffff" stroke={os === 'macos' ? '#64748b' : '#475569'} strokeWidth="1.8" />
      <line x1="3" y1="10" x2="29" y2="10" stroke={os === 'macos' ? '#64748b' : '#475569'} strokeWidth="1.5" />
      <line x1="11" y1="10" x2="11" y2="28" stroke="#cbd5e1" strokeWidth="1.2" />
      <line x1="19" y1="10" x2="19" y2="28" stroke="#cbd5e1" strokeWidth="1.2" />
      <line x1="6" y1="15" x2="26" y2="15" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 2" />
      <line x1="6" y1="20" x2="26" y2="20" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 2" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 17. SHIELD (Windows UAC / OS Elevation)
// ----------------------------------------------------------------------
export const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="shield_g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M12 2 L4 5 V11 C4 16.5 7.4 21.3 12 22 C16.6 21.3 20 16.5 20 11 V5 L12 2 Z"
        fill="url(#shield_g1)"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <path d="M12 7 V17 M9.5 12 H14.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 18. SEARCH / FILTER ICON (Toolbar Magnifying Glass)
// ----------------------------------------------------------------------
export const SearchToolIcon: React.FC<PlatformIconProps> = ({ os, size = 26, className = '' }) => {
  const accentColor = os === 'macos' ? '#007aff' : os === 'linux' ? '#3584e4' : '#0078d4';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="13.5" cy="13.5" r="8.5" fill="#ffffff" stroke={accentColor} strokeWidth="2.2" />
      <circle cx="13.5" cy="13.5" r="5.5" fill={accentColor} fillOpacity="0.15" />
      <path d="M19.5 19.5 L27 27" stroke={os === 'macos' ? '#3b82f6' : '#334155'} strokeWidth="3" strokeLinecap="round" />
      <circle cx="11.5" cy="11.5" r="2" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
};
