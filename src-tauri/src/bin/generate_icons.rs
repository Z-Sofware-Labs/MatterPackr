use image::imageops::FilterType;
use image::GenericImageView;
use std::fs;
use std::io::{BufWriter, Cursor, Write};
use std::path::{Path, PathBuf};

fn png_to_ico(png_path: &Path, ico_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let img = image::open(png_path)?;
    let (orig_w, orig_h) = img.dimensions();

    // Standard Windows icon sizes
    let sizes = [16u32, 24, 32, 48, 64, 128, 256];
    let mut png_buffers = Vec::new();

    for &size in &sizes {
        let resized = if orig_w == size && orig_h == size {
            img.clone()
        } else {
            img.resize_exact(size, size, FilterType::Lanczos3)
        };

        let mut buf = Vec::new();
        let mut cursor = Cursor::new(&mut buf);
        resized.write_to(&mut cursor, image::ImageFormat::Png)?;
        png_buffers.push((size, buf));
    }

    // Encode ICO container with PNG frames
    let mut ico_data = Vec::new();
    let mut writer = BufWriter::new(&mut ico_data);

    // ICONDIR
    writer.write_all(&0u16.to_le_bytes())?; // Reserved
    writer.write_all(&1u16.to_le_bytes())?; // 1 = ICO
    writer.write_all(&(sizes.len() as u16).to_le_bytes())?; // Count

    let header_size = 6 + (16 * sizes.len());
    let mut current_offset = header_size as u32;

    for (size, png) in &png_buffers {
        let w = if *size >= 256 { 0u8 } else { *size as u8 };
        let h = w;
        writer.write_all(&[w, h, 0, 0])?; // Width, Height, ColorCount, Reserved
        writer.write_all(&1u16.to_le_bytes())?; // Planes
        writer.write_all(&32u16.to_le_bytes())?; // BitCount (32-bit RGBA)
        writer.write_all(&(png.len() as u32).to_le_bytes())?; // BytesInRes
        writer.write_all(&current_offset.to_le_bytes())?; // ImageOffset
        current_offset += png.len() as u32;
    }

    for (_, png) in &png_buffers {
        writer.write_all(png)?;
    }

    writer.flush()?;
    drop(writer);

    fs::write(ico_path, ico_data)?;
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src_assets = manifest_dir.join("../src/assets/filetypes");
    let target_icons = manifest_dir.join("icons/filetypes");

    fs::create_dir_all(&target_icons)?;

    // Mapping from png source filename to target .ico name
    let mapping = [
        ("zip.png", "zip.ico"),
        ("7z.png", "7z.ico"),
        ("rar.png", "rar.ico"),
        ("tar.png", "tar.ico"),
        ("tgz.png", "tgz.ico"),
        ("tbz2.png", "tbz2.ico"),
        ("txz.png", "txz.ico"),
        ("gz.png", "gz.ico"),
        ("bz2.png", "bz2.ico"),
        ("iso.png", "iso.ico"),
        ("img.png", "img.ico"),
        ("cab.png", "cab.ico"),
        ("cpio.png", "cpio.ico"),
        ("ar.png", "ar.ico"),
        ("tarzst.png", "archive.ico"),
        ("gz.png", "compression.ico"),
        ("iso.png", "disk.ico"),
    ];

    println!("Converting new PNG icons to multi-resolution Windows .ico files...");
    for (png_name, ico_name) in mapping {
        let png_path = src_assets.join(png_name);
        if !png_path.exists() {
            eprintln!("Warning: PNG not found: {}", png_path.display());
            continue;
        }

        let ico_path = target_icons.join(ico_name);
        png_to_ico(&png_path, &ico_path)?;
        println!("Generated: {} from {}", ico_name, png_name);
    }

    println!("All .ico files successfully generated!");
    Ok(())
}
