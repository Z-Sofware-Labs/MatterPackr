use std::{
    io,
    path::Path,
};
#[cfg(windows)]
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use log::info;

pub struct AssociationItem {
    pub ext: &'static str,
    pub prog_id: &'static str,
    pub description: &'static str,
    pub icon_name: &'static str,
}

pub const SUPPORTED_ASSOCIATIONS: &[AssociationItem] = &[
    AssociationItem { ext: "zip", prog_id: "MatterPackr.zip", description: "ZIP Archive", icon_name: "zip.ico" },
    AssociationItem { ext: "7z", prog_id: "MatterPackr.7z", description: "7-Zip Archive", icon_name: "7z.ico" },
    AssociationItem { ext: "rar", prog_id: "MatterPackr.rar", description: "RAR Archive", icon_name: "rar.ico" },
    AssociationItem { ext: "tar", prog_id: "MatterPackr.tar", description: "TAR Archive", icon_name: "tar.ico" },
    AssociationItem { ext: "tgz", prog_id: "MatterPackr.tgz", description: "GZ Compressed TAR Archive", icon_name: "tgz.ico" },
    AssociationItem { ext: "tbz2", prog_id: "MatterPackr.tbz2", description: "BZip2 Compressed TAR Archive", icon_name: "tbz2.ico" },
    AssociationItem { ext: "txz", prog_id: "MatterPackr.txz", description: "XZ Compressed TAR Archive", icon_name: "txz.ico" },
    AssociationItem { ext: "gz", prog_id: "MatterPackr.gz", description: "GZip File", icon_name: "gz.ico" },
    AssociationItem { ext: "bz2", prog_id: "MatterPackr.bz2", description: "BZip2 File", icon_name: "bz2.ico" },
    AssociationItem { ext: "iso", prog_id: "MatterPackr.iso", description: "ISO Disk Image", icon_name: "iso.ico" },
    AssociationItem { ext: "img", prog_id: "MatterPackr.img", description: "Disk Image", icon_name: "img.ico" },
    AssociationItem { ext: "cab", prog_id: "MatterPackr.cab", description: "Cabinet Archive", icon_name: "cab.ico" },
    AssociationItem { ext: "cpio", prog_id: "MatterPackr.cpio", description: "CPIO Archive", icon_name: "cpio.ico" },
    AssociationItem { ext: "ar", prog_id: "MatterPackr.ar", description: "UNIX Archive", icon_name: "ar.ico" },
    AssociationItem { ext: "a", prog_id: "MatterPackr.a", description: "Static Library Archive", icon_name: "ar.ico" },
];

#[cfg(windows)]
extern "system" {
    fn SHChangeNotify(
        w_event_id: i32,
        u_flags: u32,
        dw_item1: *const std::ffi::c_void,
        dw_item2: *const std::ffi::c_void,
    );

    fn RegOpenKeyExW(
        hKey: isize,
        lpSubKey: *const u16,
        ulOptions: u32,
        samDesired: u32,
        phkResult: *mut isize,
    ) -> i32;

    fn RegQueryValueExW(
        hKey: isize,
        lpValueName: *const u16,
        lpReserved: *mut u32,
        lpType: *mut u32,
        lpData: *mut u8,
        lpcbData: *mut u32,
    ) -> i32;

    fn RegCloseKey(hKey: isize) -> i32;
}

#[cfg(windows)]
const HKEY_CLASSES_ROOT: isize = -2147483648; // 0x80000000 as isize
#[cfg(windows)]
const KEY_READ: u32 = 0x20019;

pub fn notify_shell_associations_changed() {
    #[cfg(windows)]
    unsafe {
        // 0x08000000 = SHCNE_ASSOCCHANGED, 0x0000 = SHCNF_IDLIST
        SHChangeNotify(0x0800_0000, 0, std::ptr::null(), std::ptr::null());
    }
}

#[cfg(windows)]
fn query_hkcr_default(sub_key: &str) -> Option<String> {
    unsafe {
        let sub_key_wide: Vec<u16> = sub_key.encode_utf16().chain(std::iter::once(0)).collect();
        let mut hkey: isize = 0;
        if RegOpenKeyExW(HKEY_CLASSES_ROOT, sub_key_wide.as_ptr(), 0, KEY_READ, &mut hkey) != 0 {
            return None;
        }

        let mut data_type: u32 = 0;
        let mut data_len: u32 = 0;
        if RegQueryValueExW(
            hkey,
            std::ptr::null(),
            std::ptr::null_mut(),
            &mut data_type,
            std::ptr::null_mut(),
            &mut data_len,
        ) != 0
            || data_len == 0
        {
            RegCloseKey(hkey);
            return None;
        }

        let mut buffer: Vec<u8> = vec![0u8; data_len as usize];
        let status = RegQueryValueExW(
            hkey,
            std::ptr::null(),
            std::ptr::null_mut(),
            &mut data_type,
            buffer.as_mut_ptr(),
            &mut data_len,
        );
        RegCloseKey(hkey);

        if status != 0 {
            return None;
        }

        let u16_count = (data_len as usize) / std::mem::size_of::<u16>();
        let u16_slice = std::slice::from_raw_parts(buffer.as_ptr() as *const u16, u16_count);
        let s = String::from_utf16_lossy(u16_slice);
        Some(s.trim_matches('\0').trim().to_string())
    }
}

pub fn get_registered_associations() -> Vec<String> {
    #[cfg(windows)]
    {
        let mut active = Vec::new();
        for item in SUPPORTED_ASSOCIATIONS {
            let key = format!(".{}", item.ext);
            if let Some(val) = query_hkcr_default(&key) {
                if val.eq_ignore_ascii_case(item.prog_id) || val.contains(item.prog_id) {
                    active.push(item.ext.to_string());
                }
            }
        }
        active
    }
    #[cfg(not(windows))]
    {
        SUPPORTED_ASSOCIATIONS.iter().map(|item| item.ext.to_string()).collect()
    }
}

#[cfg(windows)]
fn get_embedded_icon(icon_name: &str) -> Option<&'static [u8]> {
    match icon_name {
        "zip.ico" => Some(include_bytes!("../../icons/filetypes/zip.ico")),
        "7z.ico" => Some(include_bytes!("../../icons/filetypes/7z.ico")),
        "rar.ico" => Some(include_bytes!("../../icons/filetypes/rar.ico")),
        "tar.ico" => Some(include_bytes!("../../icons/filetypes/tar.ico")),
        "tgz.ico" => Some(include_bytes!("../../icons/filetypes/tgz.ico")),
        "tbz2.ico" => Some(include_bytes!("../../icons/filetypes/tbz2.ico")),
        "txz.ico" => Some(include_bytes!("../../icons/filetypes/txz.ico")),
        "gz.ico" => Some(include_bytes!("../../icons/filetypes/gz.ico")),
        "bz2.ico" => Some(include_bytes!("../../icons/filetypes/bz2.ico")),
        "iso.ico" => Some(include_bytes!("../../icons/filetypes/iso.ico")),
        "img.ico" => Some(include_bytes!("../../icons/filetypes/img.ico")),
        "cab.ico" => Some(include_bytes!("../../icons/filetypes/cab.ico")),
        "cpio.ico" => Some(include_bytes!("../../icons/filetypes/cpio.ico")),
        "ar.ico" => Some(include_bytes!("../../icons/filetypes/ar.ico")),
        "archive.ico" => Some(include_bytes!("../../icons/filetypes/archive.ico")),
        _ => None,
    }
}

#[cfg(windows)]
fn ensure_extracted_icon(exe_dir: &Path, icon_name: &str) -> Option<std::path::PathBuf> {
    // 1. Extract embedded icon to AppData so it ALWAYS exists and stays up-to-date
    if let Some(bytes) = get_embedded_icon(icon_name) {
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let target_dir = Path::new(&local_appdata).join("MatterPackr").join("icons").join("filetypes");
            if std::fs::create_dir_all(&target_dir).is_ok() {
                let target_file = target_dir.join(icon_name);
                let should_write = match std::fs::metadata(&target_file) {
                    Ok(meta) => meta.len() != bytes.len() as u64,
                    Err(_) => true,
                };
                if should_write {
                    let _ = std::fs::write(&target_file, bytes);
                }
                if target_file.exists() {
                    return Some(target_file);
                }
            }
        }
    }

    // 2. Check next to exe as fallback
    let candidates = [
        exe_dir.join("icons").join("filetypes").join(icon_name),
        exe_dir.join("resources").join("icons").join("filetypes").join(icon_name),
        exe_dir.join(icon_name),
    ];
    for p in &candidates {
        if p.exists() {
            return Some(p.clone());
        }
    }

    None
}

pub fn apply_associations_direct(exe_path: &Path, selected_exts: &[String]) -> Result<(), io::Error> {
    #[cfg(windows)]
    {
        let exe_str = exe_path.to_string_lossy().to_string();
        let exe_dir = exe_path.parent().unwrap_or(Path::new(""));
        info!("Applying file associations directly for {} items", selected_exts.len());

        const CREATE_NO_WINDOW: u32 = 0x08000000;

        for item in SUPPORTED_ASSOCIATIONS {
            let ext_key = format!("HKCR\\.{}", item.ext);
            let prog_key = format!("HKCR\\{}", item.prog_id);
            let icon_key = format!("HKCR\\{}\\DefaultIcon", item.prog_id);
            let cmd_key = format!("HKCR\\{}\\shell\\open\\command", item.prog_id);
            let open_with_key = format!("HKCR\\.{}\\OpenWithProgids", item.ext);

            let is_selected = selected_exts.iter().any(|e| e.trim_start_matches('.').eq_ignore_ascii_case(item.ext));

            if is_selected {
                // Determine icon path
                let icon_val = if let Some(icon_path) = ensure_extracted_icon(exe_dir, item.icon_name) {
                    format!("\"{}\"", icon_path.to_string_lossy())
                } else {
                    format!("\"{}\",0", exe_str)
                };

                // Register association in HKCR
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &ext_key, "/ve", "/d", item.prog_id, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &open_with_key, "/v", item.prog_id, "/t", "REG_NONE", "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &prog_key, "/ve", "/d", item.description, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &icon_key, "/ve", "/d", &icon_val, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &cmd_key, "/ve", "/d", &format!("\"{}\" \"%1\"", exe_str), "/f"]).status();

                // Also register in HKCU\Software\Classes for current user priority
                let hkcu_ext = format!("HKCU\\Software\\Classes\\.{}", item.ext);
                let hkcu_open_with = format!("HKCU\\Software\\Classes\\.{}\\OpenWithProgids", item.ext);
                let hkcu_prog = format!("HKCU\\Software\\Classes\\{}", item.prog_id);
                let hkcu_icon = format!("HKCU\\Software\\Classes\\{}\\DefaultIcon", item.prog_id);
                let hkcu_cmd = format!("HKCU\\Software\\Classes\\{}\\shell\\open\\command", item.prog_id);

                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &hkcu_ext, "/ve", "/d", item.prog_id, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &hkcu_open_with, "/v", item.prog_id, "/t", "REG_NONE", "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &hkcu_prog, "/ve", "/d", item.description, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &hkcu_icon, "/ve", "/d", &icon_val, "/f"]).status();
                let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["add", &hkcu_cmd, "/ve", "/d", &format!("\"{}\" \"%1\"", exe_str), "/f"]).status();
            } else {
                // If it was associated to MatterPackr, remove the association
                let check = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["query", &ext_key, "/ve"]).output();
                if let Ok(out) = check {
                    if out.status.success() {
                        let text = String::from_utf8_lossy(&out.stdout);
                        if text.contains(item.prog_id) {
                            let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["delete", &ext_key, "/ve", "/f"]).status();
                            let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["delete", &prog_key, "/f"]).status();
                        }
                    }
                }
                let hkcu_ext = format!("HKCU\\Software\\Classes\\.{}", item.ext);
                let hkcu_prog = format!("HKCU\\Software\\Classes\\{}", item.prog_id);
                let hkcu_check = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["query", &hkcu_ext, "/ve"]).output();
                if let Ok(out) = hkcu_check {
                    if out.status.success() {
                        let text = String::from_utf8_lossy(&out.stdout);
                        if text.contains(item.prog_id) {
                            let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["delete", &hkcu_ext, "/ve", "/f"]).status();
                            let _ = Command::new("reg").creation_flags(CREATE_NO_WINDOW).args(["delete", &hkcu_prog, "/f"]).status();
                        }
                    }
                }
            }
        }

        notify_shell_associations_changed();
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = exe_path;
        let _ = selected_exts;
        Ok(())
    }
}

pub fn trigger_elevated_associations(selected_exts: &[String]) -> Result<(), String> {
    #[cfg(windows)]
    {
        let exe = std::env::current_exe().map_err(|e| format!("Could not get current executable path: {}", e))?;
        let exe_str = exe.to_string_lossy();
        let exts_arg = selected_exts.join(",");
        let arg_list = format!("--set-associations {}", exts_arg);

        info!("Triggering UAC admin elevation for file associations: {}", exts_arg);

        let ps_command = format!(
            "Start-Process -FilePath '{}' -ArgumentList '{}' -Verb RunAs -Wait -WindowStyle Hidden",
            exe_str.replace('\'', "''"),
            arg_list.replace('\'', "''")
        );

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let output = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_command])
            .output()
            .map_err(|e| format!("Failed to execute elevation command: {}", e))?;

        if output.status.success() {
            notify_shell_associations_changed();
            Ok(())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("cancelled") || stderr.contains("canceled") || output.status.code() == Some(1) {
                Err("Administrator elevation was cancelled by user.".into())
            } else {
                Err(format!("Elevation failed: {}", stderr.trim()))
            }
        }
    }
    #[cfg(not(windows))]
    {
        let _ = selected_exts;
        Ok(())
    }
}
