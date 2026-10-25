pub mod associations;
pub mod disk_image;
pub mod drag_extract;
pub mod libarchive;
pub mod models;
pub mod sevenz;
pub mod unrar;
pub mod windows_dialog;
pub mod zip;

#[cfg(windows)]
pub fn pick_extraction_folder(title: Option<&str>, default_path: Option<&str>) -> Option<String> {
    windows_dialog::windows_impl::pick_folder_with_autocreate(title, default_path)
}

#[cfg(not(windows))]
pub fn pick_extraction_folder(_title: Option<&str>, _default_path: Option<&str>) -> Option<String> {
    None
}

use models::{format_from_path, ArchiveEntry, CreateArchiveRequest};
use std::{
    fs, io,
    path::{Path, PathBuf},
};

pub use associations::{apply_associations_direct, get_registered_associations, trigger_elevated_associations, SUPPORTED_ASSOCIATIONS};
pub use models::{capabilities_for_path, format_catalog, resolve_output_path, ArchiveCapabilities, ArchiveFormatInfo, ConflictMode, ConflictResolver, EncryptionStatus};

pub fn check_encryption(path: &Path, password: Option<&str>) -> Result<EncryptionStatus, io::Error> {
    let format = format_from_path(path);
    match format.as_str() {
        "zip" => zip::check_zip_encryption(path, password),
        "7z" => sevenz::check_7z_encryption(path, password),
        "rar" => unrar::check_rar_encryption(path, password),
        _ => Ok(EncryptionStatus {
            is_encrypted: false,
            password_valid: true,
            error_message: None,
        }),
    }
}

/// Validate and prepare an extraction destination.
///
/// The destination is allowed to be the same directory that contains the source
/// archive. This is a valid extraction target and must not be rejected merely
/// because the two paths resolve to the same directory. If the destination (or
/// any of its parents) does not exist yet, create_dir_all creates it before any
/// conflict check or extraction begins.
pub fn prepare_extraction_destination(archive_path: &Path, output_dir: &Path) -> Result<PathBuf, io::Error> {
    if output_dir.as_os_str().is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Extraction destination cannot be empty",
        ));
    }

    // create_dir_all is intentionally performed before canonicalization so a
    // newly typed destination can be treated exactly like an existing folder.
    fs::create_dir_all(output_dir)?;

    let source_dir = archive_path.parent().unwrap_or_else(|| Path::new("."));
    let source_dir_canonical = fs::canonicalize(source_dir).ok();
    let output_dir_canonical = fs::canonicalize(output_dir).ok();

    if source_dir_canonical.is_some() && source_dir_canonical == output_dir_canonical {
        log::info!(
            "Extraction destination matches source directory; proceeding in place: {}",
            output_dir.display()
        );
    }

    Ok(output_dir.to_path_buf())
}

pub fn check_conflicts(archive_path: &Path, output_dir: &Path) -> Result<Vec<String>, io::Error> {
    let output_dir = prepare_extraction_destination(archive_path, output_dir)?;
    let entries = inspect_archive(archive_path)?;
    let mut conflicts = Vec::new();
    for entry in entries {
        if entry.is_dir {
            continue;
        }
        let rel = Path::new(&entry.name);
        let dest = output_dir.join(rel);
        if dest.is_file() {
            conflicts.push(entry.name);
        }
    }
    Ok(conflicts)
}

pub fn inspect_archive(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let format = format_from_path(path);
    match format.as_str() {
        "zip" => zip::inspect_zip(path),
        "7z" => sevenz::inspect_7z(path),
        "rar" => unrar::inspect_rar(path),
        "gz" | "bz2" => libarchive::inspect_raw_compressed(path, &format),
        "iso" | "img" => disk_image::inspect_disk_image(path),
        "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | "tar.zst" | "cab" | "cpio" | "ar" => {
            libarchive::inspect_via_libarchive(path)
        }
        _ => Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!("Unsupported archive format: .{}", format),
        )),
    }
}

pub fn extract_archive(
    archive_path: &Path,
    output_dir: &Path,
    password: Option<&str>,
    mode: &ConflictMode,
) -> Result<(), io::Error> {
    let output_dir = prepare_extraction_destination(archive_path, output_dir)?;
    let format = format_from_path(archive_path);
    match format.as_str() {
        "zip" => zip::extract_zip(archive_path, &output_dir, password, mode),
        "7z" => sevenz::extract_7z(archive_path, &output_dir, password, mode),
        "rar" => unrar::extract_rar(archive_path, &output_dir, password, mode),
        "gz" | "bz2" => libarchive::extract_raw_compressed(archive_path, &output_dir, &format, mode),
        "iso" | "img" => disk_image::extract_disk_image(archive_path, &output_dir, mode),
        "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | "tar.zst" | "cab" | "cpio" | "ar" => {
            libarchive::extract_via_libarchive(archive_path, &output_dir, mode)
        }
        _ => Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!("Extraction not supported for .{} archives", format),
        )),
    }
}

pub fn test_archive(path: &Path) -> Result<(), io::Error> {
    let format = format_from_path(path);
    match format.as_str() {
        "zip" => zip::test_zip(path),
        "7z" => sevenz::test_7z(path),
        "rar" => unrar::test_rar(path, None),
        "gz" | "bz2" => {
            libarchive::inspect_raw_compressed(path, &format)?;
            Ok(())
        }
        "iso" | "img" => disk_image::test_disk_image(path),
        "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | "tar.zst" | "cab" | "cpio" | "ar" => {
            libarchive::test_via_libarchive(path)
        }
        _ => Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!("Testing not supported for .{} archives", format),
        )),
    }
}

pub fn create_archive(request: &CreateArchiveRequest) -> Result<Vec<ArchiveEntry>, io::Error> {
    let output = PathBuf::from(&request.output_path);
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let format = format_from_path(&output);

    if request.password.as_deref().map(|p| p.is_empty()).unwrap_or(false) {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Password cannot be empty"));
    }
    if request.password.is_some() && !matches!(format.as_str(), "zip" | "7z") {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "Password encryption is currently supported for ZIP and 7Z only",
        ));
    }

    match format.as_str() {
        "zip" => zip::create_zip(&output, &request.input_paths, &request.compression, request.password.as_deref())?,
        "7z" => sevenz::create_7z(&output, &request.input_paths, request.password.as_deref())?,
        "tar" | "tar.gz" => {
            libarchive::create_tar_archive(&output, &request.input_paths, &format, &request.compression)?
        }
        "gz" => libarchive::create_raw_compressed(&output, &request.input_paths, &format, &request.compression)?,
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::Unsupported,
                format!("Creating .{} archives is not supported (read/extract only)", format),
            ));
        }
    }

    inspect_archive(&output)
}

pub fn add_files(archive_path: &Path, input_paths: &[String], compression: &str, password: Option<&str>, target_dir: Option<&str>) -> Result<Vec<ArchiveEntry>, io::Error> {
    let format = format_from_path(archive_path);
    match format.as_str() {
        "zip" => zip::add_to_zip(archive_path, input_paths, compression, target_dir)?,
        "7z" => sevenz::add_to_7z(archive_path, input_paths, password, target_dir)?,
        "tar" | "tar.gz" => {
            libarchive::add_to_tar_like(archive_path, input_paths, &format, compression, target_dir)?
        }
        "gz" => {
            if input_paths.len() != 1 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    ".gz archives contain one compressed file; select exactly one input file to update",
                ));
            }
            libarchive::create_raw_compressed(archive_path, input_paths, &format, compression)?;
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::Unsupported,
                format!("Adding files to .{} is not supported (read/extract only)", format),
            ));
        }
    }
    inspect_archive(archive_path)
}

pub fn remove_entries(archive_path: &Path, names: &[String], compression: &str, password: Option<&str>) -> Result<Vec<ArchiveEntry>, io::Error> {
    let format = format_from_path(archive_path);
    match format.as_str() {
        "zip" => zip::remove_from_zip(archive_path, names)?,
        "7z" => sevenz::remove_from_7z(archive_path, names, password)?,
        "tar" | "tar.gz" => {
            libarchive::remove_from_tar_like(archive_path, names, &format, compression)?
        }
        "gz" => {
            return Err(io::Error::new(
                io::ErrorKind::Unsupported,
                "Removing entries from a single-file .gz archive is not supported",
            ));
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::Unsupported,
                format!("Removing entries from .{} is not supported (read/extract only)", format),
            ));
        }
    }
    inspect_archive(archive_path)
}
