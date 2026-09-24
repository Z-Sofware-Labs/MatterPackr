use super::models::{file_kind, resolve_output_path, ArchiveEntry, ConflictMode, ConflictResolver};
use std::{
    fs::{self, File},
    io::{self, Read, Write},
    path::{Path, PathBuf},
    process::Command,
};
use flate2::{read::GzDecoder, write::GzEncoder, Compression as GzCompression};
use bzip2::{read::BzDecoder, write::BzEncoder, Compression as BzCompression};
use tar::Builder as TarBuilder;

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

fn copy_tree_with_conflict(
    src: &Path,
    dst: &Path,
    mode: &ConflictMode,
    resolver: &mut ConflictResolver,
) -> Result<(), io::Error> {
    if src.is_dir() {
        fs::create_dir_all(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            copy_tree_with_conflict(&entry.path(), &dst.join(entry.file_name()), mode, resolver)?;
        }
    } else {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent)?;
        }
        let resolved = resolver.resolve_path(dst, mode).ok_or_else(|| {
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
            _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid path component: {}", name))),
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

fn stage_inputs(input_paths: &[String]) -> Result<PathBuf, io::Error> {
    if input_paths.is_empty() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "No input files selected"));
    }
    let workspace = temp_workspace("stage")?;
    for input in input_paths {
        let src = PathBuf::from(input);
        if !src.exists() {
            let _ = fs::remove_dir_all(&workspace);
            return Err(io::Error::new(io::ErrorKind::NotFound, format!("Input does not exist: {}", input)));
        }
        let name = src.file_name().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid input filename: {}", input))
        })?;
        copy_tree(&src, &workspace.join(name))?;
    }
    Ok(workspace)
}

fn add_tar_path<W: Write>(builder: &mut TarBuilder<W>, path: &Path) -> Result<(), io::Error> {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("item");
    if path.is_dir() {
        builder.append_dir_all(name, path)?;
    } else {
        let mut file = File::open(path)?;
        builder.append_file(name, &mut file)?;
    }
    Ok(())
}

fn gz_compression_level(level: &str) -> GzCompression {
    match level {
        "Fast" => GzCompression::fast(),
        "Maximum" => GzCompression::best(),
        _ => GzCompression::default(),
    }
}

fn parse_bsdtar_tvf_line(line: &str) -> Option<ArchiveEntry> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() < 6 {
        // Fallback for simple file name output
        let is_dir = trimmed.ends_with('/') || trimmed.ends_with('\\');
        let name = trimmed.trim_end_matches('/').trim_end_matches('\\').to_string();
        return Some(ArchiveEntry {
            kind: if is_dir { "Folder".into() } else { file_kind(Path::new(&name)) },
            size: 0,
            compressed_size: 0,
            modified: None,
            is_dir,
            name,
        });
    }

    let is_dir = parts[0].starts_with('d') || trimmed.ends_with('/');
    // In `drwxr-xr-x  0 0 0  1234 Aug 20 18:27 filename/path`
    // Size is typically at index 4 (or 5)
    let mut size_idx = 4;
    while size_idx < parts.len() && !parts[size_idx].chars().all(|c| c.is_ascii_digit()) {
        size_idx += 1;
    }
    let size = if size_idx < parts.len() {
        parts[size_idx].parse::<u64>().unwrap_or(0)
    } else {
        0
    };

    // Date/time is typically 2 tokens after size (e.g. Month Day Time)
    let name_start_idx = if size_idx + 3 < parts.len() {
        size_idx + 4
    } else {
        parts.len() - 1
    };

    let modified = if size_idx + 3 < parts.len() {
        Some(format!("{} {} {}", parts[size_idx + 1], parts[size_idx + 2], parts[size_idx + 3]))
    } else {
        None
    };

    let name = parts[name_start_idx..].join(" ");
    let clean_name = name.trim_start_matches("./").trim_start_matches(".\\").to_string();
    if clean_name.is_empty() {
        return None;
    }

    Some(ArchiveEntry {
        kind: if is_dir { "Folder".into() } else { file_kind(Path::new(&clean_name)) },
        size,
        compressed_size: 0,
        modified,
        is_dir,
        name: clean_name,
    })
}

#[inline]
pub(crate) fn tar_cmd() -> Command {
    if cfg!(windows) {
        Command::new("tar.exe")
    } else {
        Command::new("tar")
    }
}

pub fn inspect_via_libarchive(path: &Path) -> Result<Vec<ArchiveEntry>, io::Error> {
    let output = tar_cmd()
        .arg("-tvf")
        .arg(path)
        .output()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to run libarchive engine: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("libarchive inspect error: {}", stderr.trim()),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut entries = Vec::new();
    for line in stdout.lines() {
        if let Some(entry) = parse_bsdtar_tvf_line(line) {
            entries.push(entry);
        }
    }
    Ok(entries)
}

pub fn extract_via_libarchive(path: &Path, destination: &Path, mode: &ConflictMode) -> Result<(), io::Error> {
    fs::create_dir_all(destination)?;

    // In Overwrite mode, extract directly into destination without staging
    if matches!(mode, ConflictMode::Overwrite) {
        let output = tar_cmd()
            .arg("-xf")
            .arg(path)
            .arg("-C")
            .arg(destination)
            .output()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to run libarchive extraction: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("libarchive extraction error: {}", stderr.trim()),
            ));
        }
        return Ok(());
    }

    let mut conflict_resolver = ConflictResolver::new();
    let stage = temp_workspace("extract-tar")?;
    let result = (|| {
        let output = tar_cmd()
            .arg("-xf")
            .arg(path)
            .arg("-C")
            .arg(&stage)
            .output()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to run libarchive extraction: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("libarchive extraction error: {}", stderr.trim()),
            ));
        }
        copy_tree_with_conflict(&stage, destination, mode, &mut conflict_resolver)
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn test_via_libarchive(path: &Path) -> Result<(), io::Error> {
    let output = tar_cmd()
        .arg("-tf")
        .arg(path)
        .output()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to test archive via libarchive: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("libarchive test failed: {}", stderr.trim()),
        ));
    }
    Ok(())
}

pub fn rebuild_tar_from_directory(source_dir: &Path, output: &Path, format: &str, level: &str) -> Result<(), io::Error> {
    let file = File::create(output)?;
    match format {
        "tar" => {
            let mut builder = TarBuilder::new(file);
            for entry in fs::read_dir(source_dir)? {
                add_tar_path(&mut builder, &entry?.path())?;
            }
            builder.finish()?;
        }
        "tar.gz" => {
            let encoder = GzEncoder::new(file, gz_compression_level(level));
            let mut builder = TarBuilder::new(encoder);
            for entry in fs::read_dir(source_dir)? {
                add_tar_path(&mut builder, &entry?.path())?;
            }
            let encoder = builder.into_inner()?;
            encoder.finish()?;
        }
        "tar.bz2" => {
            let encoder = BzEncoder::new(file, BzCompression::best());
            let mut builder = TarBuilder::new(encoder);
            for entry in fs::read_dir(source_dir)? {
                add_tar_path(&mut builder, &entry?.path())?;
            }
            let encoder = builder.into_inner()?;
            encoder.finish()?;
        }
        "tar.xz" | "tar.zst" => {
            // Use bsdtar command to create tar.xz or tar.zst
            let mut cmd = tar_cmd();
            cmd.arg("-cf").arg(output);
            if format == "tar.xz" {
                cmd.arg("-J");
            } else {
                cmd.arg("--zstd");
            }
            cmd.arg("-C").arg(source_dir).arg(".");
            let res = cmd.output().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
            if !res.status.success() {
                return Err(io::Error::new(io::ErrorKind::Other, String::from_utf8_lossy(&res.stderr).to_string()));
            }
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Unsupported format: {}", format))),
    }
    Ok(())
}

pub fn create_tar_archive(output: &Path, inputs: &[String], format: &str, level: &str) -> Result<(), io::Error> {
    let stage = stage_inputs(inputs)?;
    let result = rebuild_tar_from_directory(&stage, output, format, level);
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn create_raw_compressed(output: &Path, inputs: &[String], format: &str, level: &str) -> Result<(), io::Error> {
    if inputs.len() != 1 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!(".{} archives contain one compressed file; select exactly one input", format),
        ));
    }
    let src = PathBuf::from(&inputs[0]);
    if !src.is_file() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "GZ/BZ2 creation requires a file"));
    }
    let mut input = File::open(&src)?;
    let output_file = File::create(output)?;
    match format {
        "gz" => {
            let mut encoder = GzEncoder::new(output_file, gz_compression_level(level));
            io::copy(&mut input, &mut encoder)?;
            encoder.finish()?;
        }
        "bz2" => {
            let mut encoder = BzEncoder::new(output_file, BzCompression::best());
            io::copy(&mut input, &mut encoder)?;
            encoder.finish()?;
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Unsupported format: {}", format))),
    }
    Ok(())
}

pub fn add_to_tar_like(archive_path: &Path, inputs: &[String], format: &str, compression: &str, target_dir: Option<&str>) -> Result<(), io::Error> {
    let stage = temp_workspace("tar-add")?;
    let result = (|| {
        extract_via_libarchive(archive_path, &stage, &ConflictMode::Overwrite)?;

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
                return Err(io::Error::new(io::ErrorKind::NotFound, format!("Input does not exist: {}", input)));
            }
            let name = src.file_name().ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid filename: {}", input))
            })?;
            copy_tree(&src, &dest_base.join(name))?;
        }
        rebuild_tar_from_directory(&stage, archive_path, format, compression)
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn remove_from_tar_like(archive_path: &Path, names: &[String], format: &str, compression: &str) -> Result<(), io::Error> {
    let stage = temp_workspace("tar-remove")?;
    let result = (|| {
        extract_via_libarchive(archive_path, &stage, &ConflictMode::Overwrite)?;
        remove_named_paths(&stage, names)?;
        rebuild_tar_from_directory(&stage, archive_path, format, compression)
    })();
    let _ = fs::remove_dir_all(&stage);
    result
}

pub fn inspect_raw_compressed(path: &Path, format: &str) -> Result<Vec<ArchiveEntry>, io::Error> {
    let meta = fs::metadata(path)?;
    let compressed = meta.len();
    let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("compressed-file").to_string();
    let size = match format {
        "gz" => {
            // GZIP format stores the original uncompressed size modulo 2^32 in the last 4 bytes (ISIZE).
            if compressed >= 4 {
                use std::io::Seek;
                let mut f = File::open(path)?;
                f.seek(std::io::SeekFrom::End(-4))?;
                let mut isize_bytes = [0u8; 4];
                f.read_exact(&mut isize_bytes)?;
                u32::from_le_bytes(isize_bytes) as u64
            } else {
                compressed
            }
        }
        "bz2" => {
            // BZ2 header does not store uncompressed size, so fallback to stream reading with buffer
            let mut decoder = BzDecoder::new(std::io::BufReader::with_capacity(64 * 1024, File::open(path)?));
            io::copy(&mut decoder, &mut io::sink())?
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Unsupported format: {}", format))),
    };
    Ok(vec![ArchiveEntry {
        name: stem,
        kind: "File".into(),
        size,
        compressed_size: compressed,
        modified: None,
        is_dir: false,
    }])
}

pub fn extract_raw_compressed(path: &Path, output: &Path, format: &str, mode: &ConflictMode) -> Result<(), io::Error> {
    fs::create_dir_all(output)?;
    let stem = path.file_stem().and_then(|x| x.to_str()).unwrap_or("output");
    let out = output.join(stem);
    let resolved = resolve_output_path(&out, mode).ok_or_else(|| {
        io::Error::new(io::ErrorKind::AlreadyExists, format!("File already exists: {}", out.display()))
    })?;
    let input = File::open(path)?;
    let mut file = File::create(resolved)?;
    match format {
        "gz" => {
            let mut decoder = GzDecoder::new(input);
            io::copy(&mut decoder, &mut file)?;
        }
        "bz2" => {
            let mut decoder = BzDecoder::new(input);
            io::copy(&mut decoder, &mut file)?;
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Unsupported format: {}", format))),
    }
    Ok(())
}
