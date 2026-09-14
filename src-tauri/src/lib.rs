pub mod backend;

use backend::models::{ArchiveCapabilities, ArchiveEntry, ArchiveFormatInfo, CreateArchiveRequest};
use log::{error, info};
use std::{
    fs, io,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_opener::OpenerExt;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("invalid path: {0}")]
    InvalidPath(String),
    #[error("could not open file with the system default application: {0}")]
    Opener(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Default)]
pub struct AppState {
    current_archive: Mutex<Option<PathBuf>>,
    view_workspaces: Mutex<Vec<PathBuf>>,
}

fn temp_workspace(prefix: &str) -> Result<PathBuf, AppError> {
    let mut path = std::env::temp_dir();
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    path.push(format!("matterpackr-{}-{}-{}", prefix, std::process::id(), stamp));
    fs::create_dir_all(&path)?;
    Ok(path)
}

fn safe_entry_path(entry: &str) -> Result<PathBuf, AppError> {
    let normalized = entry.replace('\\', "/");
    let path = Path::new(&normalized);
    if path.is_absolute() || normalized.split('/').any(|part| part == "..") {
        return Err(AppError::InvalidPath(entry.into()));
    }
    Ok(path.to_path_buf())
}

fn open_with_default_application(app: &AppHandle, path: &Path) -> Result<(), AppError> {
    if !path.is_file() {
        return Err(AppError::Io(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Temporary view file does not exist: {}", path.display()),
        )));
    }

    let resolved = fs::canonicalize(path)?;
    info!("Opening viewed file with system default application: {}", resolved.display());
    app.opener()
        .open_path(resolved.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|error| AppError::Opener(error.to_string()))?;
    Ok(())
}

#[tauri::command]
fn format_catalog_command() -> Vec<ArchiveFormatInfo> {
    backend::format_catalog()
}

#[tauri::command]
fn capabilities(path: String) -> Result<ArchiveCapabilities, AppError> {
    Ok(backend::capabilities_for_path(Path::new(&path)))
}

#[tauri::command]
fn get_cli_open_path() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|arg| !arg.starts_with('-') && Path::new(arg).exists())
}

#[tauri::command]
fn open_archive(path: String, state: State<'_, AppState>) -> Result<Vec<ArchiveEntry>, AppError> {
    info!("Opening archive: {}", path);
    let p = PathBuf::from(&path);
    let entries = backend::inspect_archive(&p)?;
    *state.current_archive.lock().unwrap() = Some(p);
    Ok(entries)
}

#[tauri::command]
fn inspect_archive(path: String, _state: State<'_, AppState>) -> Result<Vec<ArchiveEntry>, AppError> {
    backend::inspect_archive(Path::new(&path)).map_err(AppError::from)
}

#[tauri::command]
fn create_archive(request: CreateArchiveRequest, state: State<'_, AppState>) -> Result<Vec<ArchiveEntry>, AppError> {
    info!("Creating archive: {}", request.output_path);
    let out_path = PathBuf::from(&request.output_path);
    let entries = backend::create_archive(&request)?;
    *state.current_archive.lock().unwrap() = Some(out_path);
    Ok(entries)
}

#[tauri::command]
fn extract_archive(
    archive_path: String,
    output_dir: String,
    password: Option<String>,
    conflict_mode: Option<backend::models::ConflictMode>,
) -> Result<(), AppError> {
    let mode = conflict_mode.unwrap_or_default();
    info!("Extracting {} to {} (conflict_mode: {:?})", archive_path, output_dir, mode);
    backend::extract_archive(
        Path::new(&archive_path),
        Path::new(&output_dir),
        password.as_deref(),
        &mode,
    )
    .map_err(AppError::from)
}

#[tauri::command]
fn extract_image(
    image_path: String,
    output_dir: String,
    conflict_mode: Option<backend::models::ConflictMode>,
) -> Result<(), AppError> {
    let mode = conflict_mode.unwrap_or_default();
    info!("Extracting disk image: {} to {}", image_path, output_dir);
    backend::extract_archive(
        Path::new(&image_path),
        Path::new(&output_dir),
        None,
        &mode,
    )
    .map_err(AppError::from)
}

#[tauri::command]
fn prepare_extraction_destination(archive_path: String, output_dir: String) -> Result<String, AppError> {
    let prepared = backend::prepare_extraction_destination(
        Path::new(&archive_path),
        Path::new(&output_dir),
    )?;
    Ok(prepared.to_string_lossy().to_string())
}

#[tauri::command]
fn check_conflicts(archive_path: String, output_dir: String) -> Result<Vec<String>, AppError> {
    backend::check_conflicts(Path::new(&archive_path), Path::new(&output_dir)).map_err(AppError::from)
}

#[tauri::command]
fn check_archive_encryption(archive_path: String, password: Option<String>) -> Result<backend::models::EncryptionStatus, AppError> {
    backend::check_encryption(Path::new(&archive_path), password.as_deref()).map_err(AppError::from)
}

#[tauri::command]
fn test_archive(path: String) -> Result<(), AppError> {
    info!("Testing archive: {}", path);
    backend::test_archive(Path::new(&path)).map_err(AppError::from)
}

#[tauri::command]
fn add_files(
    archive_path: String,
    input_paths: Vec<String>,
    compression: String,
    password: Option<String>,
    target_dir: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ArchiveEntry>, AppError> {
    info!("Adding {} item(s) to {} (target_dir: {:?})", input_paths.len(), archive_path, target_dir);
    let p = PathBuf::from(&archive_path);
    let entries = backend::add_files(&p, &input_paths, &compression, password.as_deref(), target_dir.as_deref())?;
    *state.current_archive.lock().unwrap() = Some(p);
    Ok(entries)
}

#[tauri::command]
fn remove_entries(
    archive_path: String,
    names: Vec<String>,
    compression: String,
    password: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ArchiveEntry>, AppError> {
    info!("Removing {} item(s) from {}", names.len(), archive_path);
    let p = PathBuf::from(&archive_path);
    let entries = backend::remove_entries(&p, &names, &compression, password.as_deref())?;
    *state.current_archive.lock().unwrap() = Some(p);
    Ok(entries)
}

#[tauri::command]
fn view_archive_entry(
    app: AppHandle,
    archive_path: String,
    entry_path: String,
    password: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let archive = PathBuf::from(&archive_path);
    let _requested = safe_entry_path(&entry_path)?;
    info!("View requested: {} inside {}", entry_path, archive_path);
    let workspace = temp_workspace("view")?;
    info!("Created temporary View workspace: {}", workspace.display());

    let result = (|| {
        let (_temp_holder, extracted) = backend::drag_extract::prepare_drag_extraction(
            &archive,
            &[entry_path.clone()],
            password.as_deref(),
        )?;

        let target = match extracted.first() {
            Some(p) => p.clone(),
            None => {
                return Err(AppError::Io(io::Error::new(
                    io::ErrorKind::NotFound,
                    format!("The selected file was not found after extraction: {}", entry_path),
                )));
            }
        };

        info!("Resolved temporary View file: {}", target.display());
        if !target.is_file() {
            return Err(AppError::Io(io::Error::new(
                io::ErrorKind::NotFound,
                format!("The selected file was not found after extraction: {}", target.display()),
            )));
        }
        let metadata = fs::metadata(&target)?;
        info!("Temporary View file verified: {} bytes", metadata.len());
        open_with_default_application(&app, &target)?;
        info!("View launch completed for {}", target.display());
        Ok(())
    })();

    match result {
        Ok(()) => {
            state.view_workspaces.lock().unwrap().push(workspace);
            info!("Temporary View workspace retained until MatterPackr exits");
            Ok(())
        }
        Err(error) => {
            error!("View failed for {}: {}", entry_path, error);
            let _ = fs::remove_dir_all(&workspace);
            Err(error)
        }
    }
}

#[tauri::command]
fn prepare_drag_extraction(
    archive_path: String,
    entry_paths: Vec<String>,
    password: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, AppError> {
    info!(
        "Preparing drag extraction for {} item(s) from {}",
        entry_paths.len(),
        archive_path
    );
    let archive = PathBuf::from(&archive_path);
    let (workspace, files) = backend::drag_extract::prepare_drag_extraction(
        &archive,
        &entry_paths,
        password.as_deref(),
    )?;

    state.view_workspaces.lock().unwrap().push(workspace);
    let result_paths = files
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    Ok(result_paths)
}

#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> Result<(), AppError> {
    info!("Opening external URL: {}", url);
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| AppError::Opener(error.to_string()))?;
    Ok(())
}

#[tauri::command]
fn choose_extraction_directory_command(
    title: Option<String>,
    default_path: Option<String>,
) -> Option<String> {
    backend::pick_extraction_folder(title.as_deref(), default_path.as_deref())
}

#[tauri::command]
fn get_file_associations_command() -> Vec<String> {
    backend::associations::get_registered_associations()
}

#[tauri::command]
fn apply_file_associations_command(selected_extensions: Vec<String>) -> Result<(), String> {
    backend::associations::trigger_elevated_associations(&selected_extensions)
}

pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--set-associations") {
        let exts_str = args.get(pos + 1).cloned().unwrap_or_default();
        let selected: Vec<String> = exts_str
            .split(',')
            .map(|s| s.trim().trim_start_matches('.').to_string())
            .filter(|s| !s.is_empty())
            .collect();
        let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("matterpackr.exe"));
        if let Err(e) = backend::associations::apply_associations_direct(&exe, &selected) {
            eprintln!("Failed to apply file associations: {}", e);
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_archive,
            open_archive,
            inspect_archive,
            get_cli_open_path,
            capabilities,
            format_catalog_command,
            test_archive,
            add_files,
            extract_archive,
            extract_image,
            check_conflicts,
            prepare_extraction_destination,
            check_archive_encryption,
            view_archive_entry,
            remove_entries,
            prepare_drag_extraction,
            open_external_url,
            choose_extraction_directory_command,
            get_file_associations_command,
            apply_file_associations_command,
        ])
        .build(tauri::generate_context!())
        .expect("error while building MatterPackr")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                let state: State<'_, AppState> = app.state();
                let workspaces = std::mem::take(&mut *state.view_workspaces.lock().unwrap());
                for workspace in workspaces {
                    let _ = fs::remove_dir_all(workspace);
                }
            }
        });
}
