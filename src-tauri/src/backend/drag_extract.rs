use super::libarchive::tar_cmd;
use super::models::format_from_path;
use std::{
    collections::HashSet,
    fs::{self, File},
    io,
    path::{Path, PathBuf},
};
use flate2::read::GzDecoder;
use bzip2::read::BzDecoder;
use unrar::Archive as RarArchive;
use zip::ZipArchive;

fn temp_workspace(prefix: &str) -> Result<PathBuf, io::Error> {
    let mut path = std::env::temp_dir();
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    path.push(format!("matterpackr-{}-{}-{}", prefix, std::process::id(), stamp));
    fs::create_dir_all(&path)?;
    Ok(path)
}

fn normalize_path(path: &str) -> String {
    path.replace('\\', "/").trim_matches('/').to_string()
}

/// Check if a given entry inside the archive matches any of the requested target paths.
/// If `target` is a folder or prefix, all entries within that subtree match.
fn entry_matches(entry_name: &str, requested_prefixes: &[String]) -> bool {
    let norm_entry = normalize_path(entry_name);
    for prefix in requested_prefixes {
        let norm_prefix = normalize_path(prefix);
        if norm_entry == norm_prefix || norm_entry.starts_with(&format!("{}/", norm_prefix)) {
            return true;
        }
    }
    false
}

/// Prepares files and directories for drag-and-drop extraction by extracting only
/// the selected entries (and recursively preserving folder hierarchies for directory entries).
/// Returns the absolute filesystem paths inside `target_dir` that should be dragged out to the OS.
pub fn prepare_drag_extraction(
    archive_path: &Path,
    entry_paths: &[String],
    password: Option<&str>,
) -> Result<(PathBuf, Vec<PathBuf>), io::Error> {
    let stage = temp_workspace("drag")?;
    let format = format_from_path(archive_path);

    let norm_targets: Vec<String> = entry_paths.iter().map(|s| normalize_path(s)).collect();
    if norm_targets.is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "No items selected for extraction"));
    }

    match format.as_str() {
        "zip" => extract_zip_selective(archive_path, &stage, &norm_targets, password)?,
        "7z" => extract_7z_selective(archive_path, &stage, &norm_targets, password)?,
        "rar" => extract_rar_selective(archive_path, &stage, &norm_targets, password)?,
        "gz" | "bz2" => extract_raw_compressed_selective(archive_path, &stage, &format)?,
        "iso" | "img" => super::disk_image::extract_disk_image_selective(archive_path, &stage, &norm_targets)?,
        "tar" | "tar.gz" | "tar.bz2" | "tar.xz" | "tar.zst" | "cab" | "cpio" | "ar" => {
            extract_libarchive_selective(archive_path, &stage, &norm_targets)?
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::Unsupported,
                format!("Drag extraction is not supported for .{} archives", format),
            ));
        }
    }

    // Now determine the top-level dragged items to hand over to the OS.
    // For each requested target, its root relative path is the first component of the relative path,
    // or the exact path if it exists directly in `stage`.
    let mut exposed_paths = Vec::new();
    let mut added_set = HashSet::new();

    for target in &norm_targets {
        // e.g. "a/b/c" -> check if stage.join("a/b/c") exists.
        // If the user dragged a nested folder "folder/subfolder", they expect to drop "subfolder" or "folder" into explorer.
        // Preserving the exact folder dragged means stage.join(target).
        let item_path = stage.join(target);
        if item_path.exists() {
            let canon = fs::canonicalize(&item_path).unwrap_or(item_path);
            if added_set.insert(canon.clone()) {
                exposed_paths.push(canon);
            }
        } else {
            // Check if top-level or parent path exists
            let first_part = target.split('/').next().unwrap_or(target);
            let top_item = stage.join(first_part);
            if top_item.exists() {
                let canon = fs::canonicalize(&top_item).unwrap_or(top_item);
                if added_set.insert(canon.clone()) {
                    exposed_paths.push(canon);
                }
            }
        }
    }

    // Fallback: If for some reason none of the target paths matched directly, expose any entries in `stage`
    if exposed_paths.is_empty() {
        if let Ok(entries) = fs::read_dir(&stage) {
            for entry in entries.flatten() {
                exposed_paths.push(entry.path());
            }
        }
    }

    if exposed_paths.is_empty() {
        let _ = fs::remove_dir_all(&stage);
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            "No files were extracted from the archive",
        ));
    }

    Ok((stage, exposed_paths))
}

fn extract_zip_selective(
    archive_path: &Path,
    destination: &Path,
    targets: &[String],
    password: Option<&str>,
) -> Result<(), io::Error> {
    let file = File::open(archive_path)?;
    let reader = std::io::BufReader::with_capacity(128 * 1024, file);
    let mut archive = ZipArchive::new(reader).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    for i in 0..archive.len() {
        let raw_name = {
            let raw_entry = archive.by_index_raw(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            raw_entry.name().to_string()
        };

        if !entry_matches(&raw_name, targets) {
            continue;
        }

        let mut entry = match password {
            Some(pwd) => archive.by_index_decrypt(i, pwd.as_bytes()).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
            None => archive.by_index(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
        };

        let enclosed = entry.enclosed_name().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid entry path: {}", entry.name()))
        })?.to_owned();

        let out = destination.join(&enclosed);
        if entry.is_dir() {
            fs::create_dir_all(&out)?;
        } else {
            if let Some(parent) = out.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut outfile = File::create(&out)?;
            io::copy(&mut entry, &mut outfile)?;
        }
    }

    Ok(())
}

fn extract_7z_selective(
    archive_path: &Path,
    destination: &Path,
    targets: &[String],
    password: Option<&str>,
) -> Result<(), io::Error> {
    // Unpack 7z to temp staging, then copy matching files/folders preserving hierarchy
    let stage = temp_workspace("drag-7z-temp")?;
    let result = (|| {
        match password {
            Some(pwd) => sevenz_rust2::decompress_file_with_password(archive_path, &stage, pwd.into())
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
            None => sevenz_rust2::decompress_file(archive_path, &stage)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
        }

        copy_matching_tree(&stage, &stage, destination, targets)?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

fn extract_rar_selective(
    archive_path: &Path,
    destination: &Path,
    targets: &[String],
    password: Option<&str>,
) -> Result<(), io::Error> {
    let rar_error = |e: unrar::error::UnrarError| io::Error::new(io::ErrorKind::Other, format!("RAR error: {}", e));

    let archive = match password {
        Some(value) => RarArchive::with_password(archive_path, value.as_bytes()),
        None => RarArchive::new(archive_path),
    };

    let mut archive = archive.open_for_processing().map_err(rar_error)?;
    while let Some(current) = archive.read_header().map_err(rar_error)? {
        let entry = current.entry();
        let filename = entry.filename.to_string_lossy();

        if !entry_matches(&filename, targets) {
            archive = current.skip().map_err(rar_error)?;
            continue;
        }

        let safe_name = normalize_path(&filename);
        let target = destination.join(&safe_name);

        if entry.is_directory() {
            fs::create_dir_all(&target)?;
            archive = current.skip().map_err(rar_error)?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            archive = current.extract_to(&target).map_err(rar_error)?;
        }
    }

    Ok(())
}

fn extract_raw_compressed_selective(
    archive_path: &Path,
    destination: &Path,
    format: &str,
) -> Result<(), io::Error> {
    let file = File::open(archive_path)?;
    let original_name = archive_path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| {
            let lower = n.to_lowercase();
            if lower.ends_with(".gz") {
                &n[..n.len() - 3]
            } else if lower.ends_with(".bz2") {
                &n[..n.len() - 4]
            } else {
                n
            }
        })
        .unwrap_or("extracted_file");

    let out_path = destination.join(original_name);
    let mut outfile = File::create(out_path)?;

    match format {
        "gz" => {
            let mut decoder = GzDecoder::new(file);
            io::copy(&mut decoder, &mut outfile)?;
        }
        "bz2" => {
            let mut decoder = BzDecoder::new(file);
            io::copy(&mut decoder, &mut outfile)?;
        }
        _ => return Err(io::Error::new(io::ErrorKind::Unsupported, "Unsupported raw format")),
    }
    Ok(())
}

pub(crate) fn extract_libarchive_selective(
    archive_path: &Path,
    destination: &Path,
    targets: &[String],
) -> Result<(), io::Error> {
    let temp_stage = temp_workspace("drag-tar-temp")?;
    let result = (|| {
        let output = tar_cmd()
            .arg("-xf")
            .arg(archive_path)
            .arg("-C")
            .arg(&temp_stage)
            .output()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to run tar extraction: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("tar extraction error: {}", stderr.trim()),
            ));
        }

        copy_matching_tree(&temp_stage, &temp_stage, destination, targets)?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&temp_stage);
    result
}

fn copy_matching_tree(
    root: &Path,
    current: &Path,
    destination: &Path,
    targets: &[String],
) -> Result<(), io::Error> {
    if !current.exists() {
        return Ok(());
    }

    if current != root {
        let rel = current.strip_prefix(root).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        let rel_str = rel.to_string_lossy().replace('\\', "/");
        if entry_matches(&rel_str, targets) {
            let dest_item = destination.join(rel);
            if current.is_dir() {
                fs::create_dir_all(&dest_item)?;
                for entry in fs::read_dir(current)? {
                    let entry = entry?;
                    copy_tree(&entry.path(), &dest_item.join(entry.file_name()))?;
                }
            } else {
                if let Some(parent) = dest_item.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(current, &dest_item)?;
            }
            return Ok(());
        }
    }

    if current.is_dir() {
        for entry in fs::read_dir(current)? {
            let entry = entry?;
            copy_matching_tree(root, &entry.path(), destination, targets)?;
        }
    }

    Ok(())
}

fn copy_tree(src: &Path, dst: &Path) -> Result<(), io::Error> {
    if src.is_dir() {
        fs::create_dir_all(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            copy_tree(&entry.path(), &dst.join(entry.file_name()))?;
        }
    } else {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(src, dst)?;
    }
    Ok(())
}
