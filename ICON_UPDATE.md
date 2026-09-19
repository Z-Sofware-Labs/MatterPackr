# MatterPackr Icon Update

The supplied blue application icon (`app-icon.png`) is now the official MatterPackr application icon. It is used for the application window/launcher and bundled Windows application icon.

The supplied transparent folder/archive icon (`archive-file.png`) is now the file-association icon:
- **Windows**: Every supported archive/disk-image association points to `icons/filetypes/archive.ico` registered in the Windows Registry.
- **Linux**: Scalable SVG MIME icons (`src-tauri/icons/linux/*.svg`) generated from `src/assets/filetypes/matterpackr-archive.svg` are packaged in `.deb` and `.rpm` bundles to `/usr/share/icons/hicolor/scalable/mimetypes/` under both standard names and dedicated names (`matterpackr-*.svg`). An accompanying shared-mime-info definition (`/usr/share/mime/packages/matterpackr.xml`) explicitly binds supported archive and disk image MIME types to the dedicated MatterPackr icons, allowing desktop environments (e.g. KDE Plasma/Breeze, GNOME/Adwaita) to resolve the custom icons rather than falling back to system theme defaults. Icon and MIME cache update hooks run on postinstall/postremove.

The source artwork is kept as `src/assets/matterpackr-icon.png` and `src/assets/filetypes/matterpackr-archive.svg`; platform assets are regenerated from the supplied artwork.

