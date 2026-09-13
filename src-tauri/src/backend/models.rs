use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// How to handle a file that already exists at the extraction destination.
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ConflictMode {
    /// Replace the existing file (default).
    #[default]
    Overwrite,
    /// Append " (N)" before the extension until the name is unique.
    Rename,
    /// Abort the entire extraction — no files are written.
    Cancel,
}

/// Resolve the final output path for a single file according to `mode`.
/// Returns `None` when `mode` is `Cancel` and the file already exists,
/// signalling that the entire extraction should be aborted.
pub fn resolve_output_path(path: &Path, mode: &ConflictMode) -> Option<PathBuf> {
    if !path.exists() {
        return Some(path.to_path_buf());
    }
    match mode {
        ConflictMode::Overwrite => Some(path.to_path_buf()),
        ConflictMode::Cancel => None,
        ConflictMode::Rename => {
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
            let ext = path.extension().and_then(|e| e.to_str());
            let parent = path.parent().unwrap_or(Path::new("."));
            for n in 1..=9999u32 {
                let new_name = match ext {
                    Some(e) => format!("{} ({}).{}", stem, n, e),
                    None => format!("{} ({})", stem, n),
                };
                let candidate = parent.join(&new_name);
                if !candidate.exists() {
                    return Some(candidate);
                }
            }
            // Extremely unlikely — fall back to overwrite
            Some(path.to_path_buf())
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptionStatus {
    pub is_encrypted: bool,
    pub password_valid: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveEntry {
    pub name: String,
    pub kind: String,
    pub size: u64,
    pub compressed_size: u64,
    pub modified: Option<String>,
    pub is_dir: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveCapabilities {
    pub format: String,
    pub can_create: bool,
    pub can_add: bool,
    pub can_remove: bool,
    pub can_extract: bool,
    pub can_test: bool,
    pub can_encrypt: bool,
    pub can_view: bool,
    pub password_support: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveFormatInfo {
    pub id: String,
    pub label: String,
    pub extensions: Vec<String>,
    pub can_create: bool,
    pub can_add: bool,
    pub can_remove: bool,
    pub can_extract: bool,
    pub can_test: bool,
    pub can_encrypt: bool,
    pub can_view: bool,
    pub password_support: bool,
    pub single_file_only: bool,
    pub implemented: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateArchiveRequest {
    pub output_path: String,
    pub input_paths: Vec<String>,
    pub compression: String,
    pub password: Option<String>,
}

pub fn file_kind(path: &Path) -> String {
    match path.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase().as_str() {
        "txt" | "md" | "rs" | "ts" | "tsx" | "js" | "jsx" | "json" | "csv" | "log" | "xml" | "yaml" | "yml" => "Text Document",
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "ico" => "Image",
        "pdf" => "PDF Document",
        "doc" | "docx" => "Word Document",
        "xls" | "xlsx" => "Spreadsheet",
        "zip" | "7z" | "rar" | "tar" | "gz" | "bz2" | "xz" | "zst" | "tgz" | "tbz2" | "txz" => "Archive",
        "iso" | "img" | "nrg" => "Disk Image",
        _ => "File",
    }.to_string()
}

pub fn format_from_path(path: &Path) -> String {
    let name = path.file_name().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
    if name.ends_with(".tar.gz") || name.ends_with(".tgz") { return "tar.gz".into(); }
    if name.ends_with(".tar.bz2") || name.ends_with(".tbz2") { return "tar.bz2".into(); }
    if name.ends_with(".tar.xz") || name.ends_with(".txz") { return "tar.xz".into(); }
    if name.ends_with(".tar.zst") { return "tar.zst".into(); }
    let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
    if ext == "a" {
        return "ar".into();
    }
    ext
}

pub fn format_catalog() -> Vec<ArchiveFormatInfo> {
    vec![
        // Formats with full Create, Open, Extract, Inspect, Add, Remove, Test, Single-entry View
        ArchiveFormatInfo {
            id: "zip".into(),
            label: "ZIP — standard archive".into(),
            extensions: vec!["zip".into()],
            can_create: true,
            can_add: true,
            can_remove: true,
            can_extract: true,
            can_test: true,
            can_encrypt: true,
            can_view: true,
            password_support: true,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "7z".into(),
            label: "7Z — high compression".into(),
            extensions: vec!["7z".into()],
            can_create: true,
            can_add: true,
            can_remove: true,
            can_extract: true,
            can_test: true,
            can_encrypt: true,
            can_view: true,
            password_support: true,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "tar".into(),
            label: "TAR — uncompressed archive".into(),
            extensions: vec!["tar".into()],
            can_create: true,
            can_add: true,
            can_remove: true,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "tar.gz".into(),
            label: "TAR.GZ — TAR + GZip".into(),
            extensions: vec!["tar.gz".into(), "tgz".into()],
            can_create: true,
            can_add: true,
            can_remove: true,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "gz".into(),
            label: "GZ — compressed file".into(),
            extensions: vec!["gz".into()],
            can_create: true,
            can_add: true,
            can_remove: true,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: true,
            implemented: true,
        },

        // Formats with Open, Extract, Inspect, Test, Single-entry View, Password support only
        ArchiveFormatInfo {
            id: "rar".into(),
            label: "RAR — extract & view only (RARLabs engine)".into(),
            extensions: vec!["rar".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: true,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "tar.bz2".into(),
            label: "TAR.BZ2 — TAR + BZip2 (read-only)".into(),
            extensions: vec!["tar.bz2".into(), "tbz2".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "tar.xz".into(),
            label: "TAR.XZ — TAR + XZ (read-only)".into(),
            extensions: vec!["tar.xz".into(), "txz".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "tar.zst".into(),
            label: "TAR.ZST — TAR + Zstandard (read-only)".into(),
            extensions: vec!["tar.zst".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "bz2".into(),
            label: "BZ2 — single compressed file (read-only)".into(),
            extensions: vec!["bz2".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: true,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "cab".into(),
            label: "CAB — extract & view only (libarchive)".into(),
            extensions: vec!["cab".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "iso".into(),
            label: "ISO — extract & view only (libarchive)".into(),
            extensions: vec!["iso".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "img".into(),
            label: "IMG — extract & view only (libarchive)".into(),
            extensions: vec!["img".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "cpio".into(),
            label: "CPIO — extract & view only (libarchive)".into(),
            extensions: vec!["cpio".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
        ArchiveFormatInfo {
            id: "ar".into(),
            label: "AR — extract & view only (libarchive)".into(),
            extensions: vec!["ar".into(), "a".into()],
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: true,
            can_test: true,
            can_encrypt: false,
            can_view: true,
            password_support: false,
            single_file_only: false,
            implemented: true,
        },
    ]
}

pub fn capabilities_for_path(path: &Path) -> ArchiveCapabilities {
    let format = format_from_path(path);
    let info = format_catalog().into_iter().find(|item| item.extensions.iter().any(|ext| ext == &format));
    match info {
        Some(item) => ArchiveCapabilities {
            format: item.id.to_uppercase(),
            can_create: item.can_create,
            can_add: item.can_add,
            can_remove: item.can_remove,
            can_extract: item.can_extract,
            can_test: item.can_test,
            can_encrypt: item.can_encrypt,
            can_view: item.can_view,
            password_support: item.password_support,
        },
        None => ArchiveCapabilities {
            format: "Unknown".into(),
            can_create: false,
            can_add: false,
            can_remove: false,
            can_extract: false,
            can_test: false,
            can_encrypt: false,
            can_view: false,
            password_support: false,
        },
    }
}
