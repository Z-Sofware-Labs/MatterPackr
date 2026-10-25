#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Mitigate WebKitGTK DMA-BUF renderer stalls and buffer renegotiation delays
        // that cause lag in native window minimize, maximize, and close controls on Wayland and X11.
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    matterpackr_lib::run();
}
