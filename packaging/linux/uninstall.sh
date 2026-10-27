#!/usr/bin/env bash
# MatterPackr Linux Desktop Uninstaller
set -e

if [ "$EUID" -eq 0 ]; then
    BIN_DIR="/usr/local/bin"
    APP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/icons/hicolor/256x256/apps"
    MIME_ICON_DIR="/usr/share/icons/hicolor/256x256/mimetypes"
else
    BIN_DIR="${HOME}/.local/bin"
    APP_DIR="${HOME}/.local/share/applications"
    ICON_DIR="${HOME}/.local/share/icons/hicolor/256x256/apps"
    MIME_ICON_DIR="${HOME}/.local/share/icons/hicolor/256x256/mimetypes"
fi

rm -f "$BIN_DIR/MatterPackr"
rm -f "$APP_DIR/matterpackr.desktop"
rm -f "$ICON_DIR/matterpackr.png"

# Remove custom MIME icons installed by MatterPackr
MIME_ICONS=(
    "application-zip.png"
    "application-x-zip-compressed.png"
    "application-x-7z-compressed.png"
    "application-x-rar.png"
    "application-x-rar-compressed.png"
    "application-vnd.rar.png"
    "application-x-tar.png"
    "application-x-compressed-tar.png"
    "application-x-tarz.png"
    "application-x-gzip.png"
    "application-gzip.png"
    "application-x-bzip2.png"
    "application-x-bzip.png"
    "application-x-bzip-compressed-tar.png"
    "application-x-xz.png"
    "application-x-xz-compressed-tar.png"
    "application-x-iso9660-image.png"
    "application-x-cd-image.png"
    "application-x-raw-disk-image.png"
    "application-vnd.ms-cab-compressed.png"
    "application-x-cpio.png"
    "application-x-archive.png"
    "application-x-ar.png"
)

for icon in "${MIME_ICONS[@]}"; do
    rm -f "$MIME_ICON_DIR/$icon"
done

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APP_DIR" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICON_DIR")")" 2>/dev/null || true
fi

echo "MatterPackr uninstalled successfully."
