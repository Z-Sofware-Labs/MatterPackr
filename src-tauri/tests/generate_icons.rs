use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
};

fn encode_ico(png_data: &[u8]) -> Vec<u8> {
    let mut ico = Vec::new();
    // ICO Header (6 bytes)
    ico.extend_from_slice(&0u16.to_le_bytes()); // Reserved (0)
    ico.extend_from_slice(&1u16.to_le_bytes()); // Type (1 = ICO)
    ico.extend_from_slice(&1u16.to_le_bytes()); // Count (1 image)

    // Directory Entry (16 bytes)
    ico.push(0); // Width 256
    ico.push(0); // Height 256
    ico.push(0); // Color palette
    ico.push(0); // Reserved
    ico.extend_from_slice(&1u16.to_le_bytes()); // Color planes
    ico.extend_from_slice(&32u16.to_le_bytes()); // Bits per pixel
    ico.extend_from_slice(&(png_data.len() as u32).to_le_bytes()); // Image size
    ico.extend_from_slice(&22u32.to_le_bytes()); // Offset (6 + 16 = 22)

    // Image Data
    ico.extend_from_slice(png_data);
    ico
}

fn render_svg_to_png(svg_path: &Path, size: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let svg_data = fs::read(svg_path)?;
    let mut opt = resvg::usvg::Options::default();
    opt.fontdb_mut().load_system_fonts();

    let tree = resvg::usvg::Tree::from_data(&svg_data, &opt)?;

    let pixmap_size = resvg::tiny_skia::IntSize::from_wh(size, size).ok_or("Invalid size")?;
    let mut pixmap = resvg::tiny_skia::Pixmap::new(pixmap_size.width(), pixmap_size.height())
        .ok_or("Could not allocate pixmap")?;

    let sx = size as f32 / tree.size().width();
    let sy = size as f32 / tree.size().height();
    let transform = resvg::tiny_skia::Transform::from_scale(sx, sy);

    resvg::render(&tree, transform, &mut pixmap.as_mut());
    let png_bytes = pixmap.encode_png()?;
    Ok(png_bytes)
}

#[test]
fn generate_all_filetype_icons() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let svg_dir = root.parent().unwrap().join("src/assets/filetypes");
    let out_dir = root.join("icons/filetypes");
    fs::create_dir_all(&out_dir).unwrap();

    let source_svg = svg_dir.join("matterpackr-archive.svg");
    assert!(source_svg.exists(), "Archive association SVG missing: {}", source_svg.display());

    let mapping = [
        ("zip.ico"), ("7z.ico"), ("rar.ico"), ("tar.ico"), ("tgz.ico"),
        ("tbz2.ico"), ("txz.ico"), ("gz.ico"), ("bz2.ico"), ("iso.ico"),
        ("img.ico"), ("cab.ico"), ("cpio.ico"), ("ar.ico"), ("archive.ico"),
        ("compression.ico"), ("disk.ico"),
    ];

    for ico_name in mapping {
        let png_bytes = render_svg_to_png(&source_svg, 256).expect("Failed to render archive SVG");
        let ico_bytes = encode_ico(&png_bytes);

        let ico_path = out_dir.join(ico_name);
        let mut file = File::create(&ico_path).expect("Failed to create ico file");
        file.write_all(&ico_bytes).expect("Failed to write ico");
        println!("Generated association icon: {}", ico_path.display());
    }
}
