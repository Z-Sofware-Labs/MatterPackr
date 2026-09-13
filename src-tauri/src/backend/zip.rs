use super::models::{file_kind, resolve_output_path, ArchiveEntry, ConflictMode, EncryptionStatus};
use std::{
    fs::{self, File},
    io::{self, BufReader, Write},
    path::{Path, PathBuf},
};
use zip::{
    write::{FileOptions, SimpleFileOptions},
    AesMode, CompressionMethod, ZipArchive, ZipWriter,
};

fn relative_name(base: &Path, path: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn compression_method(level: &str) -> (CompressionMethod, Option<i64>) {
    match level {
        "Fast" => (CompressionMethod::Deflated, Some(1)),
        "Maximum" => (CompressionMethod::Deflated, Some(9)),
        _ => (CompressionMethod::Deflated, Some(6)),
    }
}

fn add_path<'a, W: Write + io::Seek>(
    zip: &mut ZipWriter<W>,
    root: &Path,
    path: &Path,
    directory_options: FileOptions<'a, ()>,
    file_options: FileOptions<'a, ()>,
) -> Result<(), io::Error> {
    if path.is_dir() {
        let rel = relative_name(root, path);
        if !rel.is_empty() {
            zip.add_directory(format!("{}/", rel.trim_end_matches('/')), directory_options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        }
        for entry in fs::read_dir(path)? {
            add_path(zip, root, &entry?.path(), directory_options, file_options)?;
        }
        return Ok(());
    }

    let rel = relative_name(root, path);
    zip.start_file(rel, file_options)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let mut file = File::open(path)?;
    io::copy(&mut file, zip)?;
    Ok(())
}

pub fn create_zip(
    output: &Path,
    inputs: &[String],
    compression: &str,
    password: Option<&str>,
) -> Result<(), io::Error> {
    let (method, level) = compression_method(compression);
    let mut options = SimpleFileOptions::default().compression_method(method);
    if let Some(level) = level {
        options = options.compression_level(Some(level));
    }
    let encrypted_options = password.map(|pwd| options.with_aes_encryption(AesMode::Aes256, pwd));

    let file = File::create(output)?;
    let mut writer = ZipWriter::new(file);

    for input in inputs {
        let path = PathBuf::from(input);
        if !path.exists() {
            return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", input)));
        }
        add_path(
            &mut writer,
            path.parent().unwrap_or(&path),
            &path,
            options,
            encrypted_options.unwrap_or(options),
        )?;
    }

    writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    Ok(())
}

pub fn inspect_zip(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(128 * 1024, file);
    let mut archive = ZipArchive::new(reader).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let mut entries = Vec::with_capacity(archive.len());

    for i in 0..archive.len() {
        let entry = archive.by_index_raw(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        let is_dir = entry.is_dir();
        let name = entry.name().to_string();
        entries.push(ArchiveEntry {
            kind: if is_dir { "Folder".into() } else { file_kind(Path::new(&name)) },
            size: entry.size(),
            compressed_size: entry.compressed_size(),
            modified: entry.last_modified().map(|d| {
                format!("{:04}-{:02}-{:02} {:02}:{:02}", d.year(), d.month(), d.day(), d.hour(), d.minute())
            }),
            is_dir,
            name,
        });
    }

    Ok(entries)
}

pub fn extract_zip(path: &Path, destination: &Path, password: Option<&str>, mode: &ConflictMode) -> Result<(), io::Error> {
    fs::create_dir_all(destination)?;
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(128 * 1024, file);
    let mut archive = ZipArchive::new(reader).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    for i in 0..archive.len() {
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
            let resolved = resolve_output_path(&out, mode).ok_or_else(|| {
                io::Error::new(io::ErrorKind::AlreadyExists, format!("File already exists: {}", out.display()))
            })?;
            let mut outfile = File::create(&resolved)?;
            io::copy(&mut entry, &mut outfile)?;
        }
    }
    Ok(())
}

pub fn test_zip(path: &Path) -> Result<(), io::Error> {
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(128 * 1024, file);
    let mut archive = ZipArchive::new(reader).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        if !entry.is_dir() {
            io::copy(&mut entry, &mut io::sink())?;
        }
    }
    Ok(())
}

pub fn add_to_zip(path: &Path, input_paths: &[String], compression: &str, target_dir: Option<&str>) -> Result<(), io::Error> {
    let temp = PathBuf::from(format!("{}.matterpackr.tmp", path.display()));
    let existing = File::open(path)?;
    let mut old = ZipArchive::new(existing).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let output = File::create(&temp)?;
    let mut writer = ZipWriter::new(output);

    let (method, level) = compression_method(compression);
    let mut options = SimpleFileOptions::default().compression_method(method);
    if let Some(level) = level {
        options = options.compression_level(Some(level));
    }

    let clean_target = target_dir
        .map(|d| d.replace('\\', "/").trim_matches('/').to_string())
        .filter(|d| !d.is_empty());

    for i in 0..old.len() {
        let mut entry = old.by_index(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        if entry.is_dir() {
            writer.add_directory(entry.name().to_string(), options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        } else {
            writer.start_file(entry.name().to_string(), options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            io::copy(&mut entry, &mut writer)?;
        }
    }

    if let Some(ref dir) = clean_target {
        writer.add_directory(format!("{}/", dir), options)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    }

    for input in input_paths {
        let p = PathBuf::from(input);
        if !p.exists() {
            let _ = fs::remove_file(&temp);
            return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", input)));
        }
        add_path_to_dir(&mut writer, p.parent().unwrap_or(&p), &p, clean_target.as_deref(), options, options)?;
    }

    writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    fs::remove_file(path)?;
    fs::rename(&temp, path)?;
    Ok(())
}

fn add_path_to_dir<'a, W: Write + io::Seek>(
    zip: &mut ZipWriter<W>,
    root: &Path,
    path: &Path,
    target_dir: Option<&str>,
    directory_options: FileOptions<'a, ()>,
    file_options: FileOptions<'a, ()>,
) -> Result<(), io::Error> {
    let rel = relative_name(root, path);
    let entry_name = match target_dir {
        Some(dir) => format!("{}/{}", dir, rel),
        None => rel,
    };

    if path.is_dir() {
        if !entry_name.is_empty() {
            zip.add_directory(format!("{}/", entry_name.trim_end_matches('/')), directory_options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        }
        for entry in fs::read_dir(path)? {
            add_path_to_dir(zip, root, &entry?.path(), target_dir, directory_options, file_options)?;
        }
        return Ok(());
    }

    zip.start_file(entry_name, file_options)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let mut file = File::open(path)?;
    io::copy(&mut file, zip)?;
    Ok(())
}

pub fn remove_from_zip(path: &Path, names: &[String]) -> Result<(), io::Error> {
    let file = File::open(path)?;
    let mut old = ZipArchive::new(file).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let temp = PathBuf::from(format!("{}.matterpackr.tmp", path.display()));
    let output = File::create(&temp)?;
    let mut writer = ZipWriter::new(output);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    for i in 0..old.len() {
        let mut entry = old.by_index(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        let name = entry.name().to_string();
        if names.iter().any(|n| name == *n || name.starts_with(&format!("{}/", n.trim_end_matches('/')))) {
            continue;
        }
        if entry.is_dir() {
            writer.add_directory(name, options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        } else {
            writer.start_file(name, options)
                .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            io::copy(&mut entry, &mut writer)?;
        }
    }

    writer.finish().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    fs::remove_file(path)?;
    fs::rename(&temp, path)?;
    Ok(())
}

pub fn check_zip_encryption(path: &Path, password: Option<&str>) -> Result<EncryptionStatus, io::Error> {
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(128 * 1024, file);
    let mut archive = ZipArchive::new(reader).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
    let mut encrypted_idx = None;

    for i in 0..archive.len() {
        let is_enc = {
            let entry = archive.by_index_raw(i).map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            entry.encrypted()
        };
        if is_enc {
            encrypted_idx = Some(i);
            break;
        }
    }

    let enc_i = match encrypted_idx {
        Some(i) => i,
        None => {
            return Ok(EncryptionStatus {
                is_encrypted: false,
                password_valid: true,
                error_message: None,
            });
        }
    };

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

    let status = match archive.by_index_decrypt(enc_i, pwd.as_bytes()) {
        Ok(mut entry) => {
            let mut buf = [0u8; 64];
            match std::io::Read::read(&mut entry, &mut buf) {
                Ok(_) => EncryptionStatus {
                    is_encrypted: true,
                    password_valid: true,
                    error_message: None,
                },
                Err(e) => EncryptionStatus {
                    is_encrypted: true,
                    password_valid: false,
                    error_message: Some(format!("Invalid password: {}", e)),
                },
            }
        }
        Err(e) => EncryptionStatus {
            is_encrypted: true,
            password_valid: false,
            error_message: Some(format!("Invalid password: {}", e)),
        },
    };

    Ok(status)
}

