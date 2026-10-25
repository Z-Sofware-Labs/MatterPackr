use matterpackr_lib::backend::{
    create_archive, extract_archive, inspect_archive, test_archive,
    models::{ConflictMode, CreateArchiveRequest},
    SUPPORTED_ASSOCIATIONS,
};
use std::{
    fs::{self, File},
    io::Write,
    path::PathBuf,
};

fn create_dummy_file(path: &PathBuf, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    let mut file = File::create(path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
}

#[test]
fn test_zip_lifecycle() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-zip-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("hello.txt");
    create_dummy_file(&sample_file, "Hello from MatterPackr!");

    let zip_path = temp_dir.join("archive.zip");
    let req = CreateArchiveRequest {
        output_path: zip_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: None,
    };

    let entries = create_archive(&req).expect("Failed to create zip");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "hello.txt");

    let inspected = inspect_archive(&zip_path).expect("Failed to inspect zip");
    assert_eq!(inspected.len(), 1);

    test_archive(&zip_path).expect("Failed to test zip integrity");

    let extract_dir = temp_dir.join("extracted");
    extract_archive(&zip_path, &extract_dir, None, &ConflictMode::Overwrite).expect("Failed to extract zip");
    let extracted_content = fs::read_to_string(extract_dir.join("hello.txt")).unwrap();
    assert_eq!(extracted_content, "Hello from MatterPackr!");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_encrypted_zip_lifecycle() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-enczip-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("secret.txt");
    create_dummy_file(&sample_file, "Secret password-protected content");

    let zip_path = temp_dir.join("encrypted.zip");
    let req = CreateArchiveRequest {
        output_path: zip_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: Some("mypassword123".into()),
    };

    let entries = create_archive(&req).expect("Failed to create encrypted zip");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "secret.txt");

    let inspected = inspect_archive(&zip_path).expect("Failed to inspect encrypted zip");
    assert_eq!(inspected.len(), 1);
    assert_eq!(inspected[0].name, "secret.txt");

    let extract_dir = temp_dir.join("extracted");
    extract_archive(&zip_path, &extract_dir, Some("mypassword123"), &ConflictMode::Overwrite).expect("Failed to extract encrypted zip");
    let extracted_content = fs::read_to_string(extract_dir.join("secret.txt")).unwrap();
    assert_eq!(extracted_content, "Secret password-protected content");

    // Test check_encryption
    let enc_status_no_pwd = matterpackr_lib::backend::check_encryption(&zip_path, None).expect("check_encryption failed");
    assert!(enc_status_no_pwd.is_encrypted);
    assert!(!enc_status_no_pwd.password_valid);

    let enc_status_wrong_pwd = matterpackr_lib::backend::check_encryption(&zip_path, Some("wrongpassword")).expect("check_encryption failed");
    assert!(enc_status_wrong_pwd.is_encrypted);
    assert!(!enc_status_wrong_pwd.password_valid);

    let enc_status_right_pwd = matterpackr_lib::backend::check_encryption(&zip_path, Some("mypassword123")).expect("check_encryption failed");
    assert!(enc_status_right_pwd.is_encrypted);
    assert!(enc_status_right_pwd.password_valid);

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_tar_lifecycle() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-tar-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("sample.txt");
    create_dummy_file(&sample_file, "Libarchive TAR backend test");

    let tar_path = temp_dir.join("archive.tar.gz");
    let req = CreateArchiveRequest {
        output_path: tar_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: None,
    };

    let entries = create_archive(&req).expect("Failed to create tar.gz");
    assert_eq!(entries.len(), 1);

    let inspected = inspect_archive(&tar_path).expect("Failed to inspect tar.gz");
    assert_eq!(inspected.len(), 1);

    test_archive(&tar_path).expect("Failed to test tar.gz integrity");

    let extract_dir = temp_dir.join("extracted");
    extract_archive(&tar_path, &extract_dir, None, &ConflictMode::Overwrite).expect("Failed to extract tar.gz");
    let extracted_content = fs::read_to_string(extract_dir.join("sample.txt")).unwrap();
    assert_eq!(extracted_content, "Libarchive TAR backend test");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_7z_lifecycle() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-7z-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("sevenz.txt");
    create_dummy_file(&sample_file, "7Z backend test content");

    let sevenz_path = temp_dir.join("archive.7z");
    let req = CreateArchiveRequest {
        output_path: sevenz_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: None,
    };

    let entries = create_archive(&req).expect("Failed to create 7z");
    assert_eq!(entries.len(), 1);

    let inspected = inspect_archive(&sevenz_path).expect("Failed to inspect 7z");
    assert_eq!(inspected.len(), 1);

    test_archive(&sevenz_path).expect("Failed to test 7z integrity");

    let extract_dir = temp_dir.join("extracted");
    extract_archive(&sevenz_path, &extract_dir, None, &ConflictMode::Overwrite).expect("Failed to extract 7z");
    let extracted_content = fs::read_to_string(extract_dir.join("sevenz.txt")).unwrap();
    assert_eq!(extracted_content, "7Z backend test content");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_supported_associations_catalog() {
    assert!(!SUPPORTED_ASSOCIATIONS.is_empty());
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "zip"));
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "7z"));
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "rar"));
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "tar"));
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "tgz"));
    assert!(SUPPORTED_ASSOCIATIONS.iter().any(|a| a.ext == "iso"));
}

#[test]
fn test_format_catalog_capabilities() {
    use matterpackr_lib::backend::{capabilities_for_path, format_catalog};
    use std::path::Path;

    let catalog = format_catalog();

    // Verify only zip, 7z, tar, tar.gz, and gz can create, add, and remove
    for item in &catalog {
        if matches!(item.id.as_str(), "zip" | "7z" | "tar" | "tar.gz" | "gz") {
            assert!(item.can_create, "{} should have can_create: true", item.id);
            assert!(item.can_add, "{} should have can_add: true", item.id);
            assert!(item.can_remove, "{} should have can_remove: true", item.id);
            assert!(item.can_extract, "{} should have can_extract: true", item.id);
            assert!(item.can_test, "{} should have can_test: true", item.id);
            assert!(item.can_view, "{} should have can_view: true", item.id);
        } else if item.implemented {
            assert!(!item.can_create, "{} should have can_create: false", item.id);
            assert!(!item.can_add, "{} should have can_add: false", item.id);
            assert!(!item.can_remove, "{} should have can_remove: false", item.id);
            assert!(item.can_extract, "{} should have can_extract: true", item.id);
            assert!(item.can_test, "{} should have can_test: true", item.id);
            assert!(item.can_view, "{} should have can_view: true", item.id);
        }
    }

    // RAR specific check: can_view = true, password_support = true, can_create = false
    let rar_cap = capabilities_for_path(Path::new("sample.rar"));
    assert_eq!(rar_cap.format, "RAR");
    assert!(!rar_cap.can_create);
    assert!(!rar_cap.can_add);
    assert!(!rar_cap.can_remove);
    assert!(rar_cap.can_extract);
    assert!(rar_cap.can_test);
    assert!(rar_cap.can_view);
    assert!(rar_cap.password_support);

    // ZIP specific check: can_create = true, can_add = true, can_remove = true, password_support = true
    let zip_cap = capabilities_for_path(Path::new("sample.zip"));
    assert_eq!(zip_cap.format, "ZIP");
    assert!(zip_cap.can_create);
    assert!(zip_cap.can_add);
    assert!(zip_cap.can_remove);
    assert!(zip_cap.can_extract);
    assert!(zip_cap.can_test);
    assert!(zip_cap.can_view);
    assert!(zip_cap.password_support);

    // Verify BIN/CUE and MDF/MDS are not in format catalog
    assert!(!catalog.iter().any(|item| item.id == "bin-cue"));
    assert!(!catalog.iter().any(|item| item.id == "mdf-mds"));
    assert_eq!(capabilities_for_path(Path::new("disk.bin")).format, "Unknown");
    assert_eq!(capabilities_for_path(Path::new("disk.cue")).format, "Unknown");
    assert_eq!(capabilities_for_path(Path::new("disk.mdf")).format, "Unknown");
    assert_eq!(capabilities_for_path(Path::new("disk.mds")).format, "Unknown");
}

#[test]
fn test_extract_to_new_nonexistent_directory() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-newdir-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("file.txt");
    create_dummy_file(&sample_file, "New directory extraction test");

    let zip_path = temp_dir.join("test_archive.zip");
    let req = CreateArchiveRequest {
        output_path: zip_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: None,
    };
    create_archive(&req).expect("Failed to create zip");

    // extraction directory does not exist yet (as if user typed a new folder name in the extract window)
    let new_custom_dir = temp_dir.join("my_newly_typed_folder").join("nested_folder");
    assert!(!new_custom_dir.exists());

    // check_conflicts should succeed and return empty conflicts for non-existent dir
    let conflicts = matterpackr_lib::backend::check_conflicts(&zip_path, &new_custom_dir).expect("check_conflicts failed");
    assert!(conflicts.is_empty());

    // extract_archive should create the directory and extract files
    extract_archive(&zip_path, &new_custom_dir, None, &ConflictMode::Overwrite).expect("Failed to extract into new dir");
    assert!(new_custom_dir.exists());
    assert!(new_custom_dir.join("file.txt").exists());
    assert_eq!(fs::read_to_string(new_custom_dir.join("file.txt")).unwrap(), "New directory extraction test");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_drag_extraction_hierarchy() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-drag-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let root_file = temp_dir.join("root.txt");
    let nested_dir = temp_dir.join("folder").join("subfolder");
    fs::create_dir_all(&nested_dir).unwrap();
    let nested_file = nested_dir.join("nested.txt");

    create_dummy_file(&root_file, "Root file content");
    create_dummy_file(&nested_file, "Nested file content");

    let zip_path = temp_dir.join("drag_test.zip");
    let req = CreateArchiveRequest {
        output_path: zip_path.to_string_lossy().to_string(),
        input_paths: vec![
            root_file.to_string_lossy().to_string(),
            temp_dir.join("folder").to_string_lossy().to_string(),
        ],
        compression: "Normal".into(),
        password: None,
    };
    create_archive(&req).expect("Failed to create zip with folder structure");

    // 1. Test dragging the entire directory: folder
    let (stage1, exposed1) = matterpackr_lib::backend::drag_extract::prepare_drag_extraction(
        &zip_path,
        &["folder".to_string()],
        None,
    ).expect("Failed to prepare folder drag extraction");

    assert!(!exposed1.is_empty());
    let folder_extracted = stage1.join("folder");
    assert!(folder_extracted.is_dir());
    assert!(folder_extracted.join("subfolder").join("nested.txt").is_file());
    assert_eq!(
        fs::read_to_string(folder_extracted.join("subfolder").join("nested.txt")).unwrap(),
        "Nested file content"
    );

    // 2. Test dragging a single file: root.txt
    let (stage2, exposed2) = matterpackr_lib::backend::drag_extract::prepare_drag_extraction(
        &zip_path,
        &["root.txt".to_string()],
        None,
    ).expect("Failed to prepare single file drag extraction");

    assert!(!exposed2.is_empty());
    let root_extracted = stage2.join("root.txt");
    assert!(root_extracted.is_file());
    assert_eq!(
        fs::read_to_string(root_extracted).unwrap(),
        "Root file content"
    );

    let _ = fs::remove_dir_all(&temp_dir);
    let _ = fs::remove_dir_all(&stage1);
    let _ = fs::remove_dir_all(&stage2);
}




#[test]
fn test_extract_to_source_directory() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-source-dest-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();

    let sample_file = temp_dir.join("same_dir.txt");
    create_dummy_file(&sample_file, "Source directory extraction test");

    let zip_path = temp_dir.join("same_dir.zip");
    let req = CreateArchiveRequest {
        output_path: zip_path.to_string_lossy().to_string(),
        input_paths: vec![sample_file.to_string_lossy().to_string()],
        compression: "Normal".into(),
        password: None,
    };
    create_archive(&req).expect("Failed to create zip");

    // The archive's containing directory is intentionally the extraction destination.
    // This must be accepted and must not silently skip extraction.
    let prepared = matterpackr_lib::backend::prepare_extraction_destination(&zip_path, &temp_dir)
        .expect("Failed to prepare source-directory destination");
    assert_eq!(fs::canonicalize(prepared).unwrap(), fs::canonicalize(&temp_dir).unwrap());

    extract_archive(&zip_path, &temp_dir, None, &ConflictMode::Overwrite)
        .expect("Failed to extract into source directory");
    assert_eq!(fs::read_to_string(&temp_dir.join("same_dir.txt")).unwrap(), "Source directory extraction test");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_prepare_extraction_destination_creates_nested_directory() {
    let temp_dir = std::env::temp_dir().join(format!("matterpackr-test-prepare-dir-{}", std::process::id()));
    fs::create_dir_all(&temp_dir).unwrap();
    let archive_path = temp_dir.join("archive.zip");
    File::create(&archive_path).unwrap();

    let destination = temp_dir.join("not-yet-created").join("nested");
    assert!(!destination.exists());
    let prepared = matterpackr_lib::backend::prepare_extraction_destination(&archive_path, &destination)
        .expect("Failed to create extraction destination");
    assert!(prepared.is_dir());

    let _ = fs::remove_dir_all(&temp_dir);
}
