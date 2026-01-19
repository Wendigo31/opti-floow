// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Get the main window
            if let Some(window) = app.get_webview_window("main") {
                // Set window title
                let _ = window.set_title("OptiFlow - Line Optimizer");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OptiFlow - Line Optimizer");
}
