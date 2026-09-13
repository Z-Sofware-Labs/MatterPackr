use super::models::{file_kind, resolve_output_path, ArchiveEntry, ConflictMode};
use hadris_optical::sync::OpenOpticalImage;
use hadris_optical::OpenPolicy;
use std::{
    fs::{self, File},
    io::{self, BufReader, Write},
    path::Path,
};

#[inline]
fn is_reserved_or_special_entry(raw_name: &str) -> bool {
    let trimmed = raw_name.trim_matches(|c: char| c == '\0' || c == '\u{1}').trim();
    trimmed.is_empty() || trimmed == "." || trimmed == ".."
}

/// Recursively collect all entries from an open UDF volume
fn walk_udf(
    udf: &hadris_optical::udf::sync::UdfVolume<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::udf::sync::UdfDir,
    current_prefix: &str,
    entries: &mut Vec<ArchiveEntry>,
) -> Result<(), io::Error> {
    for entry in dir.entries() {
        let name = entry.name();
        if is_reserved_or_special_entry(&name) {
            continue;
        }

        let rel_path = if current_prefix.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", current_prefix, name)
        };

        let is_dir = entry.is_dir();
        let size = if is_dir { 0 } else { entry.size };

        entries.push(ArchiveEntry {
            kind: if is_dir { "Folder".into() } else { file_kind(Path::new(&name)) },
            size,
            compressed_size: size,
            modified: None,
            is_dir,
            name: rel_path.clone(),
        });

        if is_dir {
            if let Ok(subdir) = udf.read_directory(&entry.icb) {
                let _ = walk_udf(udf, &subdir, &rel_path, entries);
            }
        }
    }
    Ok(())
}

/// Recursively collect all entries from an open ISO 9660 image
fn walk_iso(
    iso: &hadris_optical::iso::sync::IsoImage<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::iso::sync::read::IsoDir<'_, hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    current_prefix: &str,
    entries: &mut Vec<ArchiveEntry>,
) -> Result<(), io::Error> {
    for entry in dir.entries() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let raw_name = entry.display_name();
        if is_reserved_or_special_entry(&raw_name) {
            continue;
        }

        let name = raw_name.trim_matches(|c: char| c == '\0' || c == '\u{1}').trim();
        let rel_path = if current_prefix.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", current_prefix, name)
        };

        let is_dir = entry.is_directory();
        let size = if is_dir { 0 } else { entry.total_size() };

        entries.push(ArchiveEntry {
            kind: if is_dir { "Folder".into() } else { file_kind(Path::new(name)) },
            size,
            compressed_size: size,
            modified: None,
            is_dir,
            name: rel_path.clone(),
        });

        if is_dir {
            if let Ok(dir_ref) = entry.as_dir_ref(iso) {
                let sub_iso_dir = iso.open_dir(dir_ref);
                let _ = walk_iso(iso, &sub_iso_dir, &rel_path, entries);
            }
        }
    }
    Ok(())
}

/// Inspect optical disk image (.iso) completely in-process without mounting.
pub fn inspect_disk_image(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let file = File::open(path)?;
    let mut reader = BufReader::with_capacity(128 * 1024, file);

    let mut entries = Vec::new();
    let img = OpenOpticalImage::open(&mut reader, OpenPolicy::PreferUdf)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse optical image: {:?}", e)))?;

    match img {
        OpenOpticalImage::Udf(udf) => {
            let root = udf.root_dir()
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("UDF root dir error: {:?}", e)))?;
            walk_udf(&udf, &root, "", &mut entries)?;
        }
        OpenOpticalImage::Iso9660(iso) => {
            let root = iso.root_dir();
            let root_dir = root.iter(&iso);
            walk_iso(&iso, &root_dir, "", &mut entries)?;
        }
        _ => return Err(io::Error::new(io::ErrorKind::Unsupported, "Unsupported optical image filesystem")),
    }

    Ok(entries)
}

/// Recursively extract UDF directory to disk
fn extract_udf_dir(
    udf: &hadris_optical::udf::sync::UdfVolume<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::udf::sync::UdfDir,
    current_out: &Path,
    mode: &ConflictMode,
) -> Result<(), io::Error> {
    fs::create_dir_all(current_out)?;

    for entry in dir.entries() {
        let name = entry.name();
        if is_reserved_or_special_entry(&name) {
            continue;
        }

        let target_path = current_out.join(name);
        if entry.is_dir() {
            if let Ok(subdir) = udf.read_directory(&entry.icb) {
                extract_udf_dir(udf, &subdir, &target_path, mode)?;
            }
        } else {
            let resolved = match resolve_output_path(&target_path, mode) {
                Some(p) => p,
                None => continue, // skip if mode is skip
            };
            if let Some(parent) = resolved.parent() {
                fs::create_dir_all(parent)?;
            }
            if let Ok(file_bytes) = udf.read_file(&entry) {
                let mut out_file = File::create(&resolved)?;
                out_file.write_all(&file_bytes)?;
            }
        }
    }
    Ok(())
}

/// Recursively extract ISO 9660 directory to disk
fn extract_iso_dir(
    iso: &hadris_optical::iso::sync::IsoImage<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::iso::sync::read::IsoDir<'_, hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    current_out: &Path,
    mode: &ConflictMode,
) -> Result<(), io::Error> {
    fs::create_dir_all(current_out)?;

    for entry in dir.entries() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let raw_name = entry.display_name();
        if is_reserved_or_special_entry(&raw_name) {
            continue;
        }

        let name = raw_name.trim_matches(|c: char| c == '\0' || c == '\u{1}').trim();
        let target_path = current_out.join(name);
        if entry.is_directory() {
            if let Ok(dir_ref) = entry.as_dir_ref(iso) {
                let sub_iso_dir = iso.open_dir(dir_ref);
                extract_iso_dir(iso, &sub_iso_dir, &target_path, mode)?;
            }
        } else {
            let resolved = match resolve_output_path(&target_path, mode) {
                Some(p) => p,
                None => continue,
            };
            if let Some(parent) = resolved.parent() {
                fs::create_dir_all(parent)?;
            }
            if let Ok(file_bytes) = iso.read_file(&entry) {
                let mut out_file = File::create(&resolved)?;
                out_file.write_all(&file_bytes)?;
            }
        }
    }
    Ok(())
}

/// Extract entire optical image completely in-process.
pub fn extract_disk_image(
    image_path: &Path,
    output_dir: &Path,
    mode: &ConflictMode,
) -> Result<(), io::Error> {
    let file = File::open(image_path)?;
    let mut reader = BufReader::with_capacity(128 * 1024, file);

    let img = OpenOpticalImage::open(&mut reader, OpenPolicy::PreferUdf)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse optical image: {:?}", e)))?;

    match img {
        OpenOpticalImage::Udf(udf) => {
            let root = udf.root_dir()
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("UDF root dir error: {:?}", e)))?;
            extract_udf_dir(&udf, &root, output_dir, mode)?;
        }
        OpenOpticalImage::Iso9660(iso) => {
            let root = iso.root_dir();
            let root_dir = root.iter(&iso);
            extract_iso_dir(&iso, &root_dir, output_dir, mode)?;
        }
        _ => return Err(io::Error::new(io::ErrorKind::Unsupported, "Unsupported optical image filesystem")),
    }

    Ok(())
}

/// Test integrity of an optical disk image completely in-process.
pub fn test_disk_image(image_path: &Path) -> Result<(), io::Error> {
    let file = File::open(image_path)?;
    let mut reader = BufReader::with_capacity(128 * 1024, file);

    let img = OpenOpticalImage::open(&mut reader, OpenPolicy::PreferUdf)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse optical image: {:?}", e)))?;

    // Verifying header structures and root directories can be read
    match img {
        OpenOpticalImage::Udf(udf) => {
            let _ = udf.root_dir()
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Corrupted UDF root: {:?}", e)))?;
        }
        OpenOpticalImage::Iso9660(iso) => {
            let root = iso.root_dir();
            let _ = root.iter(&iso);
        }
        _ => return Err(io::Error::new(io::ErrorKind::Unsupported, "Unsupported optical image format")),
    }

    Ok(())
}

/// Helper for selective extraction in UDF
fn extract_selective_udf_recursive(
    udf: &hadris_optical::udf::sync::UdfVolume<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::udf::sync::UdfDir,
    current_prefix: &str,
    destination: &Path,
    target_clean: &str,
) -> Result<(), io::Error> {
    for entry in dir.entries() {
        let name = entry.name();
        if is_reserved_or_special_entry(&name) {
            continue;
        }

        let rel_path = if current_prefix.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", current_prefix, name)
        };

        if rel_path.eq_ignore_ascii_case(target_clean) || rel_path.to_ascii_lowercase().starts_with(&format!("{}/", target_clean.to_ascii_lowercase())) {
            let out_dest = destination.join(&rel_path);
            if entry.is_dir() {
                fs::create_dir_all(&out_dest)?;
                if let Ok(subdir) = udf.read_directory(&entry.icb) {
                    let _ = extract_selective_udf_recursive(udf, &subdir, &rel_path, destination, target_clean);
                }
            } else {
                if let Some(parent) = out_dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                if let Ok(bytes) = udf.read_file(&entry) {
                    let mut f = File::create(&out_dest)?;
                    f.write_all(&bytes)?;
                }
            }
        } else if entry.is_dir() && target_clean.to_ascii_lowercase().starts_with(&format!("{}/", rel_path.to_ascii_lowercase())) {
            if let Ok(subdir) = udf.read_directory(&entry.icb) {
                let _ = extract_selective_udf_recursive(udf, &subdir, &rel_path, destination, target_clean);
            }
        }
    }
    Ok(())
}

/// Helper for selective extraction in ISO 9660
fn extract_selective_iso_recursive(
    iso: &hadris_optical::iso::sync::IsoImage<hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    dir: &hadris_optical::iso::sync::read::IsoDir<'_, hadris_io::sync::Borrowed<'_, BufReader<File>>>,
    current_prefix: &str,
    destination: &Path,
    target_clean: &str,
) -> Result<(), io::Error> {
    for entry in dir.entries() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let raw_name = entry.display_name();
        if is_reserved_or_special_entry(&raw_name) {
            continue;
        }

        let name = raw_name.trim_matches(|c: char| c == '\0' || c == '\u{1}').trim();

        let rel_path = if current_prefix.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", current_prefix, name)
        };

        if rel_path.eq_ignore_ascii_case(target_clean) || rel_path.to_ascii_lowercase().starts_with(&format!("{}/", target_clean.to_ascii_lowercase())) {
            let out_dest = destination.join(&rel_path);
            if entry.is_directory() {
                fs::create_dir_all(&out_dest)?;
                if let Ok(dir_ref) = entry.as_dir_ref(iso) {
                    let subdir = iso.open_dir(dir_ref);
                    let _ = extract_selective_iso_recursive(iso, &subdir, &rel_path, destination, target_clean);
                }
            } else {
                if let Some(parent) = out_dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                if let Ok(bytes) = iso.read_file(&entry) {
                    let mut f = File::create(&out_dest)?;
                    f.write_all(&bytes)?;
                }
            }
        } else if entry.is_directory() && target_clean.to_ascii_lowercase().starts_with(&format!("{}/", rel_path.to_ascii_lowercase())) {
            if let Ok(dir_ref) = entry.as_dir_ref(iso) {
                let subdir = iso.open_dir(dir_ref);
                let _ = extract_selective_iso_recursive(iso, &subdir, &rel_path, destination, target_clean);
            }
        }
    }
    Ok(())
}

/// Selectively extract specific files/folders from optical image completely in-process.
pub fn extract_disk_image_selective(
    image_path: &Path,
    destination: &Path,
    targets: &[String],
) -> Result<(), io::Error> {
    let file = File::open(image_path)?;
    let mut reader = BufReader::with_capacity(128 * 1024, file);

    let img = OpenOpticalImage::open(&mut reader, OpenPolicy::PreferUdf)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse optical image: {:?}", e)))?;

    for target in targets {
        let clean = target.replace('\\', "/").trim_matches('/').to_string();
        if clean.is_empty() {
            continue;
        }

        match &img {
            OpenOpticalImage::Udf(udf) => {
                if let Ok(root) = udf.root_dir() {
                    let _ = extract_selective_udf_recursive(udf, &root, "", destination, &clean);
                }
            }
            OpenOpticalImage::Iso9660(iso) => {
                let root = iso.root_dir();
                let root_dir = root.iter(iso);
                let _ = extract_selective_iso_recursive(iso, &root_dir, "", destination, &clean);
            }
            _ => {}
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_special_entry_filter() {
        assert!(is_reserved_or_special_entry("\0"));
        assert!(is_reserved_or_special_entry("\u{1}"));
        assert!(is_reserved_or_special_entry("."));
        assert!(is_reserved_or_special_entry(".."));
        assert!(is_reserved_or_special_entry("  "));
        assert!(!is_reserved_or_special_entry("boot"));
        assert!(!is_reserved_or_special_entry("setup.exe"));
        assert!(!is_reserved_or_special_entry("sources"));
    }

    #[test]
    fn test_fedora_iso_no_crash() {
        let path = Path::new(r"C:\Users\Alvin\Downloads\Fedora-Workstation-Live-44-1.7.x86_64.iso");
        if path.exists() {
            let entries = inspect_disk_image(path).expect("Fedora ISO should be inspected without error");
            assert!(!entries.is_empty(), "Fedora ISO should have entries");
            assert!(entries.iter().any(|e| e.name == "boot" || e.name.starts_with("boot/")));
        }
    }

    #[test]
    fn test_windows_iso_no_crash() {
        let path = Path::new(r"C:\Users\Alvin\Downloads\Win11_25H2_English_x64_v2.iso");
        if path.exists() {
            let entries = inspect_disk_image(path).expect("Windows 11 ISO should be inspected without error");
            assert!(!entries.is_empty(), "Windows ISO should have entries");
            assert!(entries.iter().any(|e| e.name == "sources" || e.name.starts_with("sources/")));
        }
    }
}
