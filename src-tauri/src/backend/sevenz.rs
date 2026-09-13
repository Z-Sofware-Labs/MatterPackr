use super::models::{file_kind, resolve_output_path, ArchiveEntry, ConflictMode, EncryptionStatus};
use sevenz_rust2::{
    encoder_options::{AesEncoderOptions, Lzma2Options},
    Archive as SevenZipArchive, ArchiveWriter as SevenZipWriter,
};
use std::{
    fs,
    io,
    path::{Path, PathBuf},
};

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

fn copy_tree_with_conflict(src: &Path, dst: &Path, mode: &ConflictMode) -> Result<(), io::Error> {
    if src.is_dir() {
        fs::create_dir_all(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            copy_tree_with_conflict(&entry.path(), &dst.join(entry.file_name()), mode)?;
        }
    } else {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        let resolved = resolve_output_path(dst, mode).ok_or_else(|| {
            io::Error::new(io::ErrorKind::AlreadyExists, format!("File already exists: {}", dst.display()))
        })?;
        fs::copy(src, &resolved)?;
    }
    Ok(())
}

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
            _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid path component in: {}", name))),
        }
    }
    if safe.as_os_str().is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Empty relative path: {}", name)));
    }
    Ok(safe)
}

fn remove_named_paths(root: &Path, names: &[String]) -> Result<(), io::Error> {
    for name in names {
        let safe = safe_relative(name)?;
        let target = root.join(safe);
        if target.exists() {
            if target.is_dir() {
                fs::remove_dir_all(target)?;
            } else {
                fs::remove_file(target)?;
            }
        }
    }
    Ok(())
}

pub fn create_7z(output: &Path, inputs: &[String], password: Option<&str>) -> Result<(), io::Error> {
    let mut writer = SevenZipWriter::create(output)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    if let Some(pwd) = password {
        writer.set_content_methods(vec![
            AesEncoderOptions::new(pwd.into()).into(),
            Lzma2Options::from_level(6).into(),
        ]);
    }
    for input in inputs {
        let path = PathBuf::from(input);
        if !path.exists() {
            return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", input)));
        }
        writer.push_source_path_non_solid(&path, |_| true)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    }
    writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    Ok(())
}

pub fn inspect_7z(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let archive = SevenZipArchive::open(path)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    Ok(archive.files.iter().map(|entry| ArchiveEntry {
        name: entry.name().to_string(),
        kind: if entry.is_directory() { "Folder".into() } else { file_kind(Path::new(entry.name())) },
        size: entry.size(),
        compressed_size: entry.compressed_size,
        modified: None,
        is_dir: entry.is_directory(),
    }).collect())
}

pub fn extract_7z(path: &Path, output: &Path, password: Option<&str>, mode: &ConflictMode) -> Result<(), io::Error> {
    fs::create_dir_all(output)?;
    let stage = temp_workspace("extract-7z")?;
    let result = (|| {
        match password {
            Some(pwd) => sevenz_rust2::decompress_file_with_password(path, &stage, pwd.into())
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
            None => sevenz_rust2::decompress_file(path, &stage)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
        }
        copy_tree_with_conflict(&stage, output, mode)
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn test_7z(path: &Path) -> Result<(), io::Error> {
    let stage = temp_workspace("test-7z")?;
    let result = sevenz_rust2::decompress_file(path, &stage)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()));
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn add_to_7z(archive_path: &Path, inputs: &[String], password: Option<&str>, target_dir: Option<&str>) -> Result<(), io::Error> {
    let stage = temp_workspace("7z-add")?;
    let result = (|| {
        // Decrypt with password if the archive is encrypted.
        match password {
            Some(pwd) => sevenz_rust2::decompress_file_with_password(archive_path, &stage, pwd.into())
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
            None => sevenz_rust2::decompress_file(archive_path, &stage)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
        }

        let dest_base = match target_dir {
            Some(d) if !d.trim_matches('/').is_empty() => {
                let target_path = stage.join(safe_relative(d.trim_matches('/'))?);
                fs::create_dir_all(&target_path)?;
                target_path
            }
            _ => stage.clone(),
        };

        for input in inputs {
            let src = PathBuf::from(input);
            if !src.exists() {
                return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", input)));
            }
            let name = src.file_name().ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid input filename: {}", input))
            })?;
            copy_tree(&src, &dest_base.join(name))?;
        }
        let mut writer = SevenZipWriter::create(archive_path)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        // Re-apply encryption if the original archive was encrypted.
        if let Some(pwd) = password {
            writer.set_content_methods(vec![
                AesEncoderOptions::new(pwd.into()).into(),
                Lzma2Options::from_level(6).into(),
            ]);
        }
        for entry in fs::read_dir(&stage)? {
            writer.push_source_path_non_solid(&entry?.path(), |_| true)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        }
        writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn remove_from_7z(archive_path: &Path, names: &[String], password: Option<&str>) -> Result<(), io::Error> {
    let stage = temp_workspace("7z-remove")?;
    let result = (|| {
        // Decrypt with password if the archive is encrypted.
        match password {
            Some(pwd) => sevenz_rust2::decompress_file_with_password(archive_path, &stage, pwd.into())
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
            None => sevenz_rust2::decompress_file(archive_path, &stage)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?,
        }
        remove_named_paths(&stage, names)?;
        let mut writer = SevenZipWriter::create(archive_path)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        // Re-apply encryption if the original archive was encrypted.
        if let Some(pwd) = password {
            writer.set_content_methods(vec![
                AesEncoderOptions::new(pwd.into()).into(),
                Lzma2Options::from_level(6).into(),
            ]);
        }
        for entry in fs::read_dir(&stage)? {
            writer.push_source_path_non_solid(&entry?.path(), |_| true)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        }
        writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        Ok(())
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn check_7z_encryption(path: &Path, password: Option<&str>) -> Result<EncryptionStatus, io::Error> {
    let test_without_pwd = test_7z(path);
    if test_without_pwd.is_ok() {
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

    let stage = temp_workspace("check-7z")?;
    let res = sevenz_rust2::decompress_file_with_password(path, &stage, pwd.into());
    let _ = fs::remove_dir_all(&stage);
    match res {
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

