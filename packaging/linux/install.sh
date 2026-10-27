#!/usr/bin/env bash
# MatterPackr Linux Desktop Integration & File Association Installer
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo "Installing MatterPackr..."
mkdir -p "$BIN_DIR" "$APP_DIR" "$ICON_DIR" "$MIME_ICON_DIR"

# Install binary
if [ -f "$SCRIPT_DIR/bin/MatterPackr" ]; then
    cp "$SCRIPT_DIR/bin/MatterPackr" "$BIN_DIR/MatterPackr"
elif [ -f "$SCRIPT_DIR/MatterPackr" ]; then
    cp "$SCRIPT_DIR/MatterPackr" "$BIN_DIR/MatterPackr"
fi
chmod +x "$BIN_DIR/MatterPackr"

# Install application icon
if [ -f "$SCRIPT_DIR/share/icons/hicolor/256x256/apps/matterpackr.png" ]; then
    cp "$SCRIPT_DIR/share/icons/hicolor/256x256/apps/matterpackr.png" "$ICON_DIR/matterpackr.png"
elif [ -f "$SCRIPT_DIR/matterpackr.png" ]; then
    cp "$SCRIPT_DIR/matterpackr.png" "$ICON_DIR/matterpackr.png"
fi

# Install custom filetype MIME icons
MIME_SRC_DIR="$SCRIPT_DIR/share/icons/hicolor/256x256/mimetypes"
if [ ! -d "$MIME_SRC_DIR" ]; then
    MIME_SRC_DIR="$SCRIPT_DIR/icons/hicolor/256x256/mimetypes"
fi

if [ -d "$MIME_SRC_DIR" ]; then
    cp -r "$MIME_SRC_DIR/"* "$MIME_ICON_DIR/"
fi

# Install desktop entry
DESKTOP_SRC="$SCRIPT_DIR/share/applications/matterpackr.desktop"
if [ ! -f "$DESKTOP_SRC" ]; then
    DESKTOP_SRC="$SCRIPT_DIR/matterpackr.desktop"
fi

if [ -f "$DESKTOP_SRC" ]; then
    cp "$DESKTOP_SRC" "$APP_DIR/matterpackr.desktop"
    sed -i "s|Exec=MatterPackr|Exec=$BIN_DIR/MatterPackr|g" "$APP_DIR/matterpackr.desktop"
    chmod +x "$APP_DIR/matterpackr.desktop"
fi

# Associate archive MIME types
MIME_TYPES=(
    "application/zip"
    "application/x-zip-compressed"
    "application/x-7z-compressed"
    "application/x-rar"
    "application/x-rar-compressed"
    "application/vnd.rar"
    "application/x-tar"
    "application/x-compressed-tar"
    "application/x-gzip"
    "application/gzip"
    "application/x-bzip2"
    "application/x-bzip-compressed-tar"
    "application/x-xz"
    "application/x-xz-compressed-tar"
    "application/x-iso9660-image"
    "application/x-raw-disk-image"
    "application/vnd.ms-cab-compressed"
    "application/x-cpio"
    "application/x-archive"
)

if command -v xdg-mime >/dev/null 2>&1; then
    for mime in "${MIME_TYPES[@]}"; do
        xdg-mime default matterpackr.desktop "$mime" 2>/dev/null || true
    done
fi

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APP_DIR" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICON_DIR")")" 2>/dev/null || true
fi

echo "MatterPackr installed successfully! File associations have been registered."
