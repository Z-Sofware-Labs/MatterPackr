import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Iconic WinZip Vice & Folder Logo
export const WinZipLogoIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="wz_clamp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4a7c59" />
        <stop offset="50%" stopColor="#2d5a3b" />
        <stop offset="100%" stopColor="#1a3b24" />
      </linearGradient>
      <linearGradient id="wz_screw" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e0e0e0" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#8c8c8c" />
      </linearGradient>
      <linearGradient id="wz_folder" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe57f" />
        <stop offset="30%" stopColor="#ffd54f" />
        <stop offset="100%" stopColor="#ffb300" />
      </linearGradient>
    </defs>
    {/* Clamped Papers / Folder */}
    <rect x="8" y="10" width="20" height="18" rx="2" fill="url(#wz_folder)" stroke="#d97706" strokeWidth="1" />
    <path d="M10 10 L16 10 L18 13 L26 13 L26 15 L10 15 Z" fill="#ffe082" />
    {/* Zipper Teeth */}
    <line x1="18" y1="12" x2="18" y2="28" stroke="#546e7a" strokeWidth="2" strokeDasharray="2 1" />
    <rect x="16.5" y="18" width="3" height="5" rx="0.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
    
    {/* Industrial Screw Clamp / Vice Frame */}
    <path d="M4 8 H32 V11 H28 V7 C28 5.5 26.5 4 25 4 H11 C9.5 4 8 5.5 8 7 V11 H4 Z" fill="url(#wz_clamp)" stroke="#0f2b15" strokeWidth="1" />
    {/* Threaded Screw */}
    <rect x="16" y="1" width="4" height="8" fill="url(#wz_screw)" stroke="#424242" strokeWidth="0.5" />
    {/* T-bar Handle */}
    <rect x="11" y="0" width="14" height="3" rx="1.5" fill="url(#wz_screw)" stroke="#333333" strokeWidth="0.5" />
    {/* Bottom Jaw of Clamp */}
    <path d="M5 28 H31 V33 C31 34 30 35 29 35 H7 C6 35 5 34 5 33 Z" fill="url(#wz_clamp)" stroke="#0f2b15" strokeWidth="1" />
  </svg>
);

// NEW ARCHIVE - Golden Open Folder with Sparkle
export const NewArchiveIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="new_folder_back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="new_folder_front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="60%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="new_paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
    {/* Folder Back Tab */}
    <path d="M5 10 C5 8.5 6 8 7.5 8 H15 L18 11 H30 C31.5 11 32 12 32 13.5 V25 C32 26.5 31.5 27 30 27 H7.5 C6 27 5 26.5 5 25 Z" fill="url(#new_folder_back)" stroke="#92400e" strokeWidth="1" />
    {/* New Blank Paper Sheet */}
    <rect x="10" y="6" width="16" height="18" rx="1" fill="url(#new_paper)" stroke="#94a3b8" strokeWidth="1" />
    <line x1="13" y1="10" x2="23" y2="10" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="13" y1="14" x2="21" y2="14" stroke="#cbd5e1" strokeWidth="1.5" />
    <line x1="13" y1="18" x2="19" y2="18" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* Folder Front Open Flap */}
    <path d="M3 16 C3 14.5 4 14 5.5 14 H31.5 C33 14 34 14.5 33.5 16.5 L31 29 C30.5 30.5 29.5 31 28 31 H6 C4.5 31 3.5 30.5 3.2 29 Z" fill="url(#new_folder_front)" stroke="#b45309" strokeWidth="1" />
    {/* Sparkling Star */}
    <path d="M26 4 L27.5 8 L31.5 9.5 L27.5 11 L26 15 L24.5 11 L20.5 9.5 L24.5 8 Z" fill="#ffffff" stroke="#f59e0b" strokeWidth="0.8" />
    <circle cx="26" cy="9.5" r="1.5" fill="#fef08a" />
  </svg>
);

// OPEN ARCHIVE - Classic Wooden/Steel Filing Cabinet with open drawer
export const OpenArchiveIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="cabinet_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="drawer_open" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
      <linearGradient id="handle_metal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
    </defs>
    {/* Main Cabinet Box */}
    <rect x="6" y="5" width="24" height="27" rx="1.5" fill="url(#cabinet_body)" stroke="#334155" strokeWidth="1" />
    
    {/* Bottom Drawer (Closed) */}
    <rect x="8" y="20" width="20" height="10" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="1" />
    {/* Bottom Handle */}
    <rect x="15" y="24" width="6" height="2.5" rx="1" fill="url(#handle_metal)" stroke="#1e293b" strokeWidth="0.5" />
    {/* Label slot */}
    <rect x="16" y="21.5" width="4" height="1.5" fill="#ffffff" />

    {/* Folders in top open drawer */}
    <rect x="10" y="7" width="16" height="8" rx="1" fill="#f59e0b" stroke="#b45309" strokeWidth="0.5" />
    <rect x="12" y="9" width="13" height="7" rx="1" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />

    {/* Top Drawer (Pulled Open with 3D projection) */}
    <path d="M5 12 H31 L29 20 H7 Z" fill="url(#drawer_open)" stroke="#334155" strokeWidth="1" />
    {/* Top Handle */}
    <rect x="15" y="15" width="6" height="2.5" rx="1" fill="url(#handle_metal)" stroke="#334155" strokeWidth="0.5" />
  </svg>
);

// FAVORITES - Folder with glowing Star
export const FavoritesIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="fav_folder" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="60%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="fav_star" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <path d="M4 11 C4 9.5 5 9 6.5 9 H14 L17 12 H30 C31.5 12 32 13 32 14.5 V26 C32 27.5 31.5 28 30 28 H6.5 C5 28 4 27.5 4 26 Z" fill="url(#fav_folder)" stroke="#a16207" strokeWidth="1" />
    {/* 3D Glowing Star */}
    <path d="M24 16 L26.2 21.2 L31.8 21.6 L27.5 25.3 L28.9 30.8 L24 27.8 L19.1 30.8 L20.5 25.3 L16.2 21.6 L21.8 21.2 Z" fill="url(#fav_star)" stroke="#78350f" strokeWidth="1" />
    <circle cx="24" cy="24" r="2.5" fill="#fef08a" />
  </svg>
);

// ADD - Iconic WinZip Green Screw Clamp / File Press
export const AddIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="add_clamp_metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#15803d" />
        <stop offset="40%" stopColor="#166534" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="add_screw" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Pressed Documents stack */}
    <rect x="10" y="14" width="16" height="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
    <rect x="9" y="17" width="18" height="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
    <rect x="8" y="20" width="20" height="3" fill="#bae6fd" stroke="#0284c7" strokeWidth="0.5" />
    <rect x="9" y="23" width="18" height="4" rx="1" fill="#fcd34d" stroke="#d97706" strokeWidth="0.5" />

    {/* Upper Jaw of Vice Clamp */}
    <path d="M5 8 H31 V13 H26 V10 H10 V13 H5 Z" fill="url(#add_clamp_metal)" stroke="#052e16" strokeWidth="1" />
    {/* Central Screw Pillar */}
    <rect x="16" y="2" width="4" height="9" fill="url(#add_screw)" stroke="#334155" strokeWidth="0.5" />
    {/* Screw Thread marks */}
    <line x1="16" y1="4" x2="20" y2="4" stroke="#475569" strokeWidth="0.8" />
    <line x1="16" y1="6" x2="20" y2="6" stroke="#475569" strokeWidth="0.8" />
    <line x1="16" y1="8" x2="20" y2="8" stroke="#475569" strokeWidth="0.8" />
    {/* T-bar Crossbar Handle */}
    <rect x="10" y="0.5" width="16" height="3.5" rx="1.5" fill="url(#add_screw)" stroke="#1e293b" strokeWidth="0.6" />
    <circle cx="10" cy="2.2" r="2" fill="#94a3b8" />
    <circle cx="26" cy="2.2" r="2" fill="#94a3b8" />

    {/* Bottom Jaw of Clamp */}
    <path d="M5 27 H31 V32 C31 33.5 29.5 34.5 28 34.5 H8 C6.5 34.5 5 33.5 5 32 Z" fill="url(#add_clamp_metal)" stroke="#052e16" strokeWidth="1" />
    {/* Big Plus / Add symbol badge */}
    <circle cx="28" cy="28" r="6" fill="#22c55e" stroke="#14532d" strokeWidth="1" />
    <path d="M28 24.5 V31.5 M24.5 28 H31.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// EXTRACT - Unzipping Folder with Flying Documents
export const ExtractIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="ext_folder" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="60%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="ext_paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>
    {/* Lower Folder base */}
    <path d="M4 14 C4 12.5 5 12 6.5 12 H14 L17 15 H30 C31.5 15 32 16 32 17.5 V27 C32 28.5 31.5 29 30 29 H6.5 C5 29 4 28.5 4 27 Z" fill="url(#ext_folder)" stroke="#b45309" strokeWidth="1" />
    
    {/* Flying Papers shooting out */}
    <g transform="rotate(-15 16 10)">
      <rect x="8" y="2" width="13" height="15" rx="1" fill="url(#ext_paper)" stroke="#94a3b8" strokeWidth="0.8" />
      <line x1="10" y1="5" x2="18" y2="5" stroke="#64748b" strokeWidth="1" />
      <line x1="10" y1="8" x2="16" y2="8" stroke="#94a3b8" strokeWidth="1" />
    </g>
    <g transform="rotate(18 24 8)">
      <rect x="18" y="2" width="12" height="14" rx="1" fill="url(#ext_paper)" stroke="#94a3b8" strokeWidth="0.8" />
      <line x1="20" y1="5" x2="27" y2="5" stroke="#64748b" strokeWidth="1" />
      <line x1="20" y1="8" x2="25" y2="8" stroke="#94a3b8" strokeWidth="1" />
    </g>

    {/* Zipper mechanism splitting open */}
    <line x1="6" y1="23" x2="18" y2="18" stroke="#475569" strokeWidth="2" strokeDasharray="2 1" />
    <line x1="30" y1="23" x2="18" y2="18" stroke="#475569" strokeWidth="2" strokeDasharray="2 1" />
    <circle cx="18" cy="18" r="3" fill="#eab308" stroke="#854d0e" strokeWidth="1" />

    {/* Outward Extraction Arrow */}
    <path d="M18 29 V18 M14 22 L18 17 L22 22" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// VIEW - Brass Magnifying Glass over Document
export const ViewIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="view_paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f1f5f9" />
      </linearGradient>
      <linearGradient id="view_brass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
    </defs>
    {/* Document sheet */}
    <rect x="5" y="4" width="20" height="26" rx="1.5" fill="url(#view_paper)" stroke="#94a3b8" strokeWidth="1" />
    <line x1="8" y1="8" x2="18" y2="8" stroke="#475569" strokeWidth="1.5" />
    <line x1="8" y1="12" x2="20" y2="12" stroke="#64748b" strokeWidth="1" />
    <line x1="8" y1="16" x2="16" y2="16" stroke="#94a3b8" strokeWidth="1" />
    <line x1="8" y1="20" x2="22" y2="20" stroke="#94a3b8" strokeWidth="1" />
    <line x1="8" y1="24" x2="17" y2="24" stroke="#94a3b8" strokeWidth="1" />

    {/* Magnifying Glass Lens */}
    <circle cx="21" cy="18" r="8" fill="#e0f2fe" fillOpacity="0.75" stroke="url(#view_brass)" strokeWidth="2.5" />
    <circle cx="21" cy="18" r="6" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 2" />
    <path d="M18 14 A5 5 0 0 1 24 16" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

    {/* Brass Handle */}
    <rect x="27" y="24" width="4" height="10" rx="1" transform="rotate(-40 27 24)" fill="url(#view_brass)" stroke="#78350f" strokeWidth="1" />
  </svg>
);

// CHECKOUT - Clipboard with Checked Checkmarks
export const CheckOutIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="board_wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <linearGradient id="clip_metal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    {/* Wood Clipboard Base */}
    <rect x="6" y="5" width="24" height="28" rx="2" fill="url(#board_wood)" stroke="#451a03" strokeWidth="1" />
    {/* White Paper Sheet */}
    <rect x="8" y="9" width="20" height="22" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />

    {/* Silver Top Clip */}
    <rect x="13" y="3" width="10" height="5" rx="1" fill="url(#clip_metal)" stroke="#334155" strokeWidth="0.8" />
    <circle cx="18" cy="4.5" r="1.5" fill="#475569" />

    {/* Checkmarks and items */}
    <path d="M10 14 L12 16 L15 12" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="14" x2="25" y2="14" stroke="#475569" strokeWidth="1.2" />

    <path d="M10 19 L12 21 L15 17" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="19" x2="25" y2="19" stroke="#475569" strokeWidth="1.2" />

    <path d="M10 24 L12 26 L15 22" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="24" x2="23" y2="24" stroke="#475569" strokeWidth="1.2" />
  </svg>
);

// WIZARD - Magic Wand with Sparkling Stars
export const WizardIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="wand_body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="70%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    {/* Magic Wand Stick */}
    <rect x="6" y="27" width="5" height="24" rx="1" transform="rotate(-45 6 27)" fill="url(#wand_body)" stroke="#020617" strokeWidth="1" />
    {/* Silver Tip of Wand */}
    <rect x="20" y="13" width="5" height="8" rx="1" transform="rotate(-45 20 13)" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />

    {/* Sparkles & Star Bursts */}
    <path d="M26 3 L27.5 7 L31.5 8.5 L27.5 10 L26 14 L24.5 10 L20.5 8.5 L24.5 7 Z" fill="#facc15" stroke="#b45309" strokeWidth="0.8" />
    <path d="M14 4 L15 6.5 L17.5 7.5 L15 8.5 L14 11 L13 8.5 L10.5 7.5 L13 6.5 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="0.6" />
    <path d="M30 15 L31 17 L33 18 L31 19 L30 21 L29 19 L27 18 L29 17 Z" fill="#ec4899" stroke="#be185d" strokeWidth="0.6" />
    <circle cx="26" cy="8.5" r="1.5" fill="#ffffff" />
  </svg>
);

// ENCRYPT - Solid Brass Padlock with Key & AES 256 Badge
export const EncryptIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="lock_shackle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="lock_brass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    {/* Padlock Shackle */}
    <path d="M11 15 V9 C11 5.5 14 3 18 3 C22 3 25 5.5 25 9 V15" stroke="url(#lock_shackle)" strokeWidth="3.5" strokeLinecap="round" />
    {/* Padlock Brass Body */}
    <rect x="7" y="14" width="22" height="18" rx="3" fill="url(#lock_brass)" stroke="#78350f" strokeWidth="1.2" />
    {/* Keyhole */}
    <circle cx="18" cy="21" r="2.5" fill="#451a03" />
    <polygon points="17,21 19,21 20,27 16,27" fill="#451a03" />

    {/* AES Badge */}
    <rect x="11" y="27" width="14" height="4" rx="1" fill="#1e293b" />
    <text x="18" y="30" fontSize="3.2" fontWeight="bold" fill="#38bdf8" textAnchor="middle" fontFamily="monospace">AES-256</text>

    {/* Golden Key on side */}
    <circle cx="31" cy="7" r="3.5" fill="#facc15" stroke="#854d0e" strokeWidth="1" />
    <circle cx="31" cy="7" r="1.5" fill="#d4d0c8" />
    <line x1="31" y1="10.5" x2="31" y2="19" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
    <line x1="31" y1="14" x2="33.5" y2="14" stroke="#ca8a04" strokeWidth="1.5" />
    <line x1="31" y1="17" x2="34" y2="17" stroke="#ca8a04" strokeWidth="1.5" />
  </svg>
);

// TEST - Lightning Bolt & Diagnostic Verification Clipboard
export const TestIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="test_bolt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
    </defs>
    {/* Diagnostic Shield / Sheet */}
    <rect x="6" y="5" width="22" height="26" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
    <rect x="11" y="2" width="12" height="4.5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="0.8" />
    {/* Rows of tests with checkmarks */}
    <circle cx="11" cy="12" r="2.5" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M9.5 12 L10.5 13 L12.5 11" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16" y1="12" x2="24" y2="12" stroke="#64748b" strokeWidth="1.5" />

    <circle cx="11" cy="18" r="2.5" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M9.5 18 L10.5 19 L12.5 17" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16" y1="18" x2="22" y2="18" stroke="#64748b" strokeWidth="1.5" />

    <circle cx="11" cy="24" r="2.5" fill="#dcfce7" stroke="#16a34a" strokeWidth="0.8" />
    <path d="M9.5 24 L10.5 25 L12.5 23" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="16" y1="24" x2="23" y2="24" stroke="#64748b" strokeWidth="1.5" />

    {/* Bright 3D Lightning Bolt */}
    <path d="M25 4 L17 18 L23 18 L19 32 L31 14 L25 14 Z" fill="url(#test_bolt)" stroke="#a16207" strokeWidth="1.2" />
  </svg>
);

// C++ / Qt Code Architecture Icon
export const CppQtIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="qt_green" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#41cd52" />
        <stop offset="100%" stopColor="#1e8233" />
      </linearGradient>
    </defs>
    <rect x="4" y="5" width="28" height="26" rx="4" fill="url(#qt_green)" stroke="#0f4a1c" strokeWidth="1.2" />
    <text x="13" y="23" fontSize="16" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">Qt</text>
    <text x="25" y="16" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="sans-serif">C++</text>
    <rect x="22" y="20" width="7" height="6" rx="1" fill="#000000" fillOpacity="0.3" />
    <text x="25.5" y="24.5" fontSize="4.5" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="monospace">x86</text>
  </svg>
);
