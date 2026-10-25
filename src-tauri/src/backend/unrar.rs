use super::models::{file_kind, resolve_output_path, ArchiveEntry, ConflictMode, EncryptionStatus};
use std::{
    fs,
    io,
    path::{Path, PathBuf},
};
use unrar::Archive as RarArchive;

fn safe_relative(name: &str) -> Result<PathBuf, io::Error> {
    let path = Path::new(name);
    if path.is_absolute() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Absolute path not allowed: {}", name)));
    }
    let mut safe = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(part) => safe.push(part),
            std::path::Component::CurDir => {},
            _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid path component: {}", name))),
        }
    }
    if safe.as_os_str().is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Empty relative path: {}", name)));
    }
    Ok(safe)
}

fn rar_error(error: unrar::error::UnrarError) -> io::Error {
    io::Error::new(io::ErrorKind::Other, format!("RAR error: {}", error))
}

pub fn inspect_rar(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let archive = RarArchive::new(path)
        .open_for_listing()
        .map_err(rar_error)?;

    let mut entries = Vec::new();
    for item in archive {
        let header = item.map_err(rar_error)?;
        let name = header.filename.to_string_lossy().replace('\\', "/");
        let is_dir = header.is_directory();
        entries.push(ArchiveEntry {
            kind: if is_dir { "Folder".into() } else { file_kind(Path::new(&name)) },
            size: header.unpacked_size,
            compressed_size: 0,
            modified: None,
            is_dir,
            name,
        });
    }
    Ok(entries)
}

pub fn extract_rar(path: &Path, destination: &Path, password: Option<&str>, mode: &ConflictMode) -> Result<(), io::Error> {
    fs::create_dir_all(destination)?;

    let archive = match password {
        Some(value) => RarArchive::with_password(path, value.as_bytes()),
        None => RarArchive::new(path),
    };

    let mut archive = archive.open_for_processing().map_err(rar_error)?;
    while let Some(current) = archive.read_header().map_err(rar_error)? {
        let entry = current.entry();
        let safe_name = safe_relative(&entry.filename.to_string_lossy())?;
        let target = destination.join(&safe_name);

        if entry.is_directory() {
            fs::create_dir_all(&target)?;
            archive = current.skip().map_err(rar_error)?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            let resolved = resolve_output_path(&target, mode).ok_or_else(|| {
                io::Error::new(io::ErrorKind::AlreadyExists, format!("File already exists: {}", target.display()))
            })?;
            archive = current.extract_to(&resolved).map_err(rar_error)?;
        }
    }

    Ok(())
}

pub fn test_rar(path: &Path, password: Option<&str>) -> Result<(), io::Error> {
    let archive = match password {
        Some(value) => RarArchive::with_password(path, value.as_bytes()),
        None => RarArchive::new(path),
    };

    let mut archive = archive.open_for_processing().map_err(rar_error)?;
    while let Some(current) = archive.read_header().map_err(rar_error)? {
        archive = current.skip().map_err(rar_error)?;
    }
    Ok(())
}

pub fn check_rar_encryption(path: &Path, password: Option<&str>) -> Result<EncryptionStatus, io::Error> {
    let test_res = test_rar(path, None);
    if test_res.is_ok() {
        return Ok(EncryptionStatus {
            is_encrypted: false,
            password_valid: true,
            error_message: None,
        });
    }

    let pwd = match password {
        Some(p) if !p.is_empty() => p,
        _ => {
            return Ok(EncryptionStatus {
                is_encrypted: true,
                password_valid: false,
                error_message: Some("Password required".into()),
            });
        }
    };

    let test_pwd_res = test_rar(path, Some(pwd));
    match test_pwd_res {
        Ok(_) => Ok(EncryptionStatus {
            is_encrypted: true,
            password_valid: true,
            error_message: None,
        }),
        Err(e) => Ok(EncryptionStatus {
            is_encrypted: true,
            password_valid: false,
            error_message: Some(format!("Invalid password: {}", e)),
        }),
    }
}

