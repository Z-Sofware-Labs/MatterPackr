#[cfg(windows)]
#[allow(non_snake_case, non_camel_case_types)]
pub mod windows_impl {
    use std::{
        ffi::OsString,
        fs,
        os::windows::ffi::{OsStrExt, OsStringExt},
        path::PathBuf,
        sync::Mutex,
    };
    use windows_sys::{
        core::{GUID, HRESULT},
        Win32::{
            Foundation::{E_NOINTERFACE, HWND, S_OK},
            System::Com::{
                CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
                CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize,
            },
            UI::Shell::{
                SHCreateItemFromParsingName, SIGDN_FILESYSPATH,
            },
        },
    };

    // Use IFileSaveDialog with FOS_PICKFOLDERS so Windows permits typing a new folder name without displaying "does not exist" error
    const CLSID_FILE_SAVE_DIALOG: GUID = GUID {
        data1: 0xC0B4E2F3,
        data2: 0xBA21,
        data3: 0x4773,
        data4: [0x8D, 0xBA, 0x33, 0x5E, 0xC9, 0x46, 0xEB, 0x8B],
    };

    const IID_IFILE_SAVE_DIALOG: GUID = GUID {
        data1: 0x84BCCD23,
        data2: 0x5FDE,
        data3: 0x4CDB,
        data4: [0xAE, 0xA4, 0xAF, 0x64, 0xB8, 0x3D, 0x78, 0xAB],
    };

    const IID_ISHELL_ITEM: GUID = GUID {
        data1: 0x43826D1E,
        data2: 0xE718,
        data3: 0x42EE,
        data4: [0xBC, 0x55, 0xA2, 0xE2, 0x61, 0xC3, 0x7B, 0xFE],
    };

    // Dialog option flags
    const FOS_OVERWRITEPROMPT: u32 = 0x00000002;
    const FOS_PICKFOLDERS: u32 = 0x00000020;
    const FOS_FORCEFILESYSTEM: u32 = 0x00000040;
    const FOS_NOVALIDATE: u32 = 0x00000100;
    const FOS_PATHMUSTEXIST: u32 = 0x00000800;
    const FOS_FILEMUSTEXIST: u32 = 0x00001000;
    const FOS_NOREADONLYRETURN: u32 = 0x00008000;
    const FOS_NOTESTFILECREATE: u32 = 0x00010000;
    const FOS_DONTADDTORECENT: u32 = 0x02000000;

    #[repr(C)]
    struct IUnknownVtbl {
        QueryInterface: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            riid: *const GUID,
            ppv: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        AddRef: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
        Release: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> u32,
    }

    #[repr(C)]
    struct IModalWindowVtbl {
        parent: IUnknownVtbl,
        Show: unsafe extern "system" fn(this: *mut std::ffi::c_void, hwndParent: HWND) -> HRESULT,
    }

    #[repr(C)]
    struct IFileDialogVtbl {
        parent: IModalWindowVtbl,
        SetFileTypes: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            cFileTypes: u32,
            rgFilterSpec: *const std::ffi::c_void,
        ) -> HRESULT,
        SetFileTypeIndex:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, iFileType: u32) -> HRESULT,
        GetFileTypeIndex:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, piFileType: *mut u32) -> HRESULT,
        Advise: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfde: *mut std::ffi::c_void,
            pdwCookie: *mut u32,
        ) -> HRESULT,
        Unadvise:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, dwCookie: u32) -> HRESULT,
        SetOptions: unsafe extern "system" fn(this: *mut std::ffi::c_void, fos: u32) -> HRESULT,
        GetOptions:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pfos: *mut u32) -> HRESULT,
        SetDefaultFolder:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, psi: *mut std::ffi::c_void) -> HRESULT,
        SetFolder:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, psi: *mut std::ffi::c_void) -> HRESULT,
        GetFolder: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            ppsi: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        GetCurrentSelection: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            ppsi: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        SetFileName:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pszName: *const u16) -> HRESULT,
        GetFileName:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pszName: *mut *mut u16) -> HRESULT,
        SetTitle:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pszTitle: *const u16) -> HRESULT,
        SetOkButtonLabel:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pszText: *const u16) -> HRESULT,
        SetFileNameLabel:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, pszLabel: *const u16) -> HRESULT,
        GetResult: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            ppsi: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        AddPlace: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            psi: *mut std::ffi::c_void,
            fdap: u32,
        ) -> HRESULT,
        SetDefaultExtension: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pszDefaultExtension: *const u16,
        ) -> HRESULT,
        Close: unsafe extern "system" fn(this: *mut std::ffi::c_void, hr: HRESULT) -> HRESULT,
        SetClientGuid:
            unsafe extern "system" fn(this: *mut std::ffi::c_void, guid: *const GUID) -> HRESULT,
        ClearClientData: unsafe extern "system" fn(this: *mut std::ffi::c_void) -> HRESULT,
        SetFilter: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pFilter: *mut std::ffi::c_void,
        ) -> HRESULT,
    }

    #[repr(C)]
    struct IFileDialogEventsVtbl {
        parent: IUnknownVtbl,
        OnFileOk: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
        ) -> HRESULT,
        OnFolderChanging: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
            psiFolder: *mut std::ffi::c_void,
        ) -> HRESULT,
        OnFolderChange: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
        ) -> HRESULT,
        OnSelectionChange: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
        ) -> HRESULT,
        OnShareViolation: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
            psi: *mut std::ffi::c_void,
            pResponse: *mut u32,
        ) -> HRESULT,
        OnTypeChange: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
        ) -> HRESULT,
        OnOverwrite: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pfd: *mut std::ffi::c_void,
            psi: *mut std::ffi::c_void,
            pResponse: *mut u32,
        ) -> HRESULT,
    }

    #[repr(C)]
    struct IShellItemVtbl {
        parent: IUnknownVtbl,
        BindToHandler: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            pbc: *mut std::ffi::c_void,
            bhid: *const GUID,
            riid: *const GUID,
            ppv: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        GetParent: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            ppsi: *mut *mut std::ffi::c_void,
        ) -> HRESULT,
        GetDisplayName: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            sigdnName: u32,
            ppszName: *mut *mut u16,
        ) -> HRESULT,
        GetAttributes: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            sfgaoMask: u32,
            psfgaoAttribs: *mut u32,
        ) -> HRESULT,
        Compare: unsafe extern "system" fn(
            this: *mut std::ffi::c_void,
            psi: *mut std::ffi::c_void,
            hint: u32,
            piOrder: *mut i32,
        ) -> HRESULT,
    }

    fn to_wide(s: &str) -> Vec<u16> {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    unsafe fn wide_to_string(ptr: *const u16) -> String {
        if ptr.is_null() {
            return String::new();
        }
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        let slice = std::slice::from_raw_parts(ptr, len);
        OsString::from_wide(slice).to_string_lossy().to_string()
    }

    #[repr(C)]
    struct ExtractionDialogEvents {
        vtbl: &'static IFileDialogEventsVtbl,
        ref_count: u32,
        created_path: Mutex<Option<PathBuf>>,
    }

    static EVENT_VTBL: IFileDialogEventsVtbl = IFileDialogEventsVtbl {
        parent: IUnknownVtbl {
            QueryInterface: event_query_interface,
            AddRef: event_add_ref,
            Release: event_release,
        },
        OnFileOk: event_on_file_ok,
        OnFolderChanging: event_on_folder_changing,
        OnFolderChange: event_on_folder_change,
        OnSelectionChange: event_on_selection_change,
        OnShareViolation: event_on_share_violation,
        OnTypeChange: event_on_type_change,
        OnOverwrite: event_on_overwrite,
    };

    unsafe extern "system" fn event_query_interface(
        this: *mut std::ffi::c_void,
        riid: *const GUID,
        ppv: *mut *mut std::ffi::c_void,
    ) -> HRESULT {
        if ppv.is_null() || riid.is_null() {
            return E_NOINTERFACE;
        }
        let iid_unknown = GUID {
            data1: 0x00000000,
            data2: 0x0000,
            data3: 0x0000,
            data4: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46],
        };
        let iid_file_dialog_events = GUID {
            data1: 0x973510DB,
            data2: 0x7D7F,
            data3: 0x452B,
            data4: [0x89, 0x75, 0x74, 0xA8, 0x58, 0x28, 0xD3, 0x54],
        };

        let r = *riid;
        if (r.data1 == iid_unknown.data1 && r.data4 == iid_unknown.data4)
            || (r.data1 == iid_file_dialog_events.data1 && r.data4 == iid_file_dialog_events.data4)
        {
            *ppv = this;
            event_add_ref(this);
            S_OK
        } else {
            *ppv = std::ptr::null_mut();
            E_NOINTERFACE
        }
    }

    unsafe extern "system" fn event_add_ref(this: *mut std::ffi::c_void) -> u32 {
        let events = this as *mut ExtractionDialogEvents;
        (*events).ref_count += 1;
        (*events).ref_count
    }

    unsafe extern "system" fn event_release(this: *mut std::ffi::c_void) -> u32 {
        let events = this as *mut ExtractionDialogEvents;
        if (*events).ref_count > 0 {
            (*events).ref_count -= 1;
        }
        (*events).ref_count
    }

    unsafe extern "system" fn event_on_file_ok(
        this: *mut std::ffi::c_void,
        pfd: *mut std::ffi::c_void,
    ) -> HRESULT {
        let events = this as *mut ExtractionDialogEvents;
        if pfd.is_null() {
            return S_OK;
        }

        let vtbl = *(pfd as *const *const IFileDialogVtbl);

        // 1. Check if the user typed a name in the Folder edit box
        let mut file_name_w: *mut u16 = std::ptr::null_mut();
        let _ = ((*vtbl).GetFileName)(pfd, &mut file_name_w);
        let file_name = if !file_name_w.is_null() {
            let name = wide_to_string(file_name_w);
            CoTaskMemFree(file_name_w as _);
            name.trim().to_string()
        } else {
            String::new()
        };

        // 2. Get current folder
        let mut folder_item: *mut std::ffi::c_void = std::ptr::null_mut();
        let hr_folder = ((*vtbl).GetFolder)(pfd, &mut folder_item);
        let folder_path = if hr_folder == S_OK && !folder_item.is_null() {
            let folder_vtbl = *(folder_item as *const *const IShellItemVtbl);
            let mut folder_path_w: *mut u16 = std::ptr::null_mut();
            let hr_disp = ((*folder_vtbl).GetDisplayName)(
                folder_item,
                SIGDN_FILESYSPATH as u32,
                &mut folder_path_w,
            );
            let path = if hr_disp == S_OK && !folder_path_w.is_null() {
                let p = wide_to_string(folder_path_w);
                CoTaskMemFree(folder_path_w as _);
                PathBuf::from(p)
            } else {
                PathBuf::new()
            };
            let _ = ((*folder_vtbl).parent.Release)(folder_item);
            path
        } else {
            PathBuf::new()
        };

        // 3. If the user typed a name, create that directory
        if !file_name.is_empty() {
            let candidate = PathBuf::from(&file_name);
            let target_path = if candidate.is_absolute() {
                candidate
            } else if !folder_path.as_os_str().is_empty() {
                folder_path.join(&file_name)
            } else {
                candidate
            };

            let _ = fs::create_dir_all(&target_path);
            *(*events).created_path.lock().unwrap() = Some(target_path);
        } else if !folder_path.as_os_str().is_empty() {
            let _ = fs::create_dir_all(&folder_path);
            *(*events).created_path.lock().unwrap() = Some(folder_path);
        }

        S_OK
    }

    unsafe extern "system" fn event_on_folder_changing(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
        _psi: *mut std::ffi::c_void,
    ) -> HRESULT {
        S_OK
    }

    unsafe extern "system" fn event_on_folder_change(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
    ) -> HRESULT {
        S_OK
    }

    unsafe extern "system" fn event_on_selection_change(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
    ) -> HRESULT {
        S_OK
    }

    unsafe extern "system" fn event_on_share_violation(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
        _psi: *mut std::ffi::c_void,
        _response: *mut u32,
    ) -> HRESULT {
        S_OK
    }

    unsafe extern "system" fn event_on_type_change(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
    ) -> HRESULT {
        S_OK
    }

    unsafe extern "system" fn event_on_overwrite(
        _this: *mut std::ffi::c_void,
        _pfd: *mut std::ffi::c_void,
        _psi: *mut std::ffi::c_void,
        _response: *mut u32,
    ) -> HRESULT {
        S_OK
    }

    pub fn pick_folder_with_autocreate(
        title: Option<&str>,
        default_path: Option<&str>,
    ) -> Option<String> {
        unsafe {
            let coinit = (COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE) as u32;
            let _ = CoInitializeEx(std::ptr::null_mut(), coinit);

            let mut dialog: *mut std::ffi::c_void = std::ptr::null_mut();
            let hr = CoCreateInstance(
                &CLSID_FILE_SAVE_DIALOG,
                std::ptr::null_mut(),
                CLSCTX_INPROC_SERVER,
                &IID_IFILE_SAVE_DIALOG,
                &mut dialog as *mut _ as *mut *mut std::ffi::c_void,
            );

            if hr != S_OK || dialog.is_null() {
                CoUninitialize();
                return None;
            }

            let dialog_vtbl = *(dialog as *const *const IFileDialogVtbl);

            let mut options = 0u32;
            let _ = ((*dialog_vtbl).GetOptions)(dialog, &mut options);
            // Disable overwrite prompt and path existence checks so a new folder name can be typed freely
            options &= !FOS_OVERWRITEPROMPT;
            options &= !FOS_PATHMUSTEXIST;
            options &= !FOS_FILEMUSTEXIST;
            // Configure folder picking
            options |= FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_NOVALIDATE | FOS_NOTESTFILECREATE | FOS_NOREADONLYRETURN | FOS_DONTADDTORECENT;
            let _ = ((*dialog_vtbl).SetOptions)(dialog, options);

            if let Some(t) = title {
                let wide_title = to_wide(t);
                let _ = ((*dialog_vtbl).SetTitle)(dialog, wide_title.as_ptr());
            }

            let wide_btn = to_wide("Select Folder");
            let _ = ((*dialog_vtbl).SetOkButtonLabel)(dialog, wide_btn.as_ptr());

            let wide_label = to_wide("Folder:");
            let _ = ((*dialog_vtbl).SetFileNameLabel)(dialog, wide_label.as_ptr());

            if let Some(d) = default_path {
                let canon = fs::canonicalize(d).unwrap_or_else(|_| PathBuf::from(d));
                let folder_to_set = if canon.is_dir() {
                    Some(canon)
                } else if let Some(parent) = canon.parent() {
                    if parent.is_dir() {
                        Some(parent.to_path_buf())
                    } else {
                        None
                    }
                } else {
                    None
                };

                if let Some(f) = folder_to_set {
                    let wide_path = to_wide(&f.to_string_lossy());
                    let mut folder_item: *mut std::ffi::c_void = std::ptr::null_mut();
                    let hr_item = SHCreateItemFromParsingName(
                        wide_path.as_ptr(),
                        std::ptr::null_mut(),
                        &IID_ISHELL_ITEM,
                        &mut folder_item as *mut _ as *mut *mut std::ffi::c_void,
                    );
                    if hr_item == S_OK && !folder_item.is_null() {
                        let folder_vtbl = *(folder_item as *const *const IShellItemVtbl);
                        let _ = ((*dialog_vtbl).SetFolder)(dialog, folder_item);
                        let _ = ((*folder_vtbl).parent.Release)(folder_item);
                    }
                }
            }

            let mut events = Box::new(ExtractionDialogEvents {
                vtbl: &EVENT_VTBL,
                ref_count: 1,
                created_path: Mutex::new(None),
            });

            let mut cookie = 0u32;
            let _ = ((*dialog_vtbl).Advise)(
                dialog,
                &mut events.vtbl as *mut _ as *mut std::ffi::c_void,
                &mut cookie,
            );

            let show_hr = ((*dialog_vtbl).parent.Show)(dialog, std::ptr::null_mut() as HWND);

            let _ = ((*dialog_vtbl).Unadvise)(dialog, cookie);

            let created = events.created_path.lock().unwrap().take();
            let result = if let Some(created_path) = created {
                let _ = fs::create_dir_all(&created_path);
                Some(created_path.to_string_lossy().to_string())
            } else if show_hr == S_OK {
                let mut result_item: *mut std::ffi::c_void = std::ptr::null_mut();
                let hr_result = ((*dialog_vtbl).GetResult)(dialog, &mut result_item);
                if hr_result == S_OK && !result_item.is_null() {
                    let result_vtbl = *(result_item as *const *const IShellItemVtbl);
                    let mut path_w: *mut u16 = std::ptr::null_mut();
                    let hr_disp = ((*result_vtbl).GetDisplayName)(
                        result_item,
                        SIGDN_FILESYSPATH as u32,
                        &mut path_w,
                    );
                    let res = if hr_disp == S_OK && !path_w.is_null() {
                        let s = wide_to_string(path_w);
                        CoTaskMemFree(path_w as _);
                        let _ = fs::create_dir_all(&s);
                        Some(s)
                    } else {
                        None
                    };
                    let _ = ((*result_vtbl).parent.Release)(result_item);
                    res
                } else {
                    None
                }
            } else {
                None
            };

            let _ = ((*dialog_vtbl).parent.parent.Release)(dialog);
            CoUninitialize();
            result
        }
    }
}
