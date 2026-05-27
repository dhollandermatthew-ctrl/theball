// v3 — direct $HOME/Downloads, returns path string for confirmation
#[tauri::command]
fn save_to_downloads(filename: String, content: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|e| format!("HOME env not set: {}", e))?;
    let path = std::path::PathBuf::from(&home).join("Downloads").join(&filename);
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Write failed to {}: {}", path.display(), e))?;
    Ok(path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_to_downloads])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
