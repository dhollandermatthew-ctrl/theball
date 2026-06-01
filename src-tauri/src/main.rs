// Prevents extra terminal window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::Deserialize;
use tauri::{command, Manager};

// For reading/writing JSON state
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
struct TranscriptionResponse {
    text: String,
}

// -------------------------------------------------------------
// Whisper Transcription Command (Groq)
// -------------------------------------------------------------
#[command]
async fn transcribe_audio(audio: Vec<u8>, api_key: String) -> Result<String, String> {
    // Build client with timeout
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let part = reqwest::multipart::Part::bytes(audio)
        .file_name("audio.webm")
        .mime_str("audio/webm")
        .map_err(|e| format!("Mime error: {e}"))?;

    let form = reqwest::multipart::Form::new()
        .text("model", "whisper-large-v3")
        .part("file", part);

    // Try to send request with better error handling
    let res = client
        .post("https://api.groq.com/openai/v1/audio/transcriptions")
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Request timed out (30s). Check your internet connection.")
            } else if e.is_connect() {
                format!("Cannot connect to Groq API. Check your internet connection or try again later.")
            } else if e.is_request() {
                format!("Request failed: {}. You may be offline.", e)
            } else {
                format!("Network error: {}. Check your internet connection.", e)
            }
        })?;

    let status = res.status();
    let body = res
        .text()
        .await
        .map_err(|e| format!("Response read error: {e}"))?;

    if !status.is_success() {
        return Err(format!("Groq API error {status}: {body}"));
    }

    let parsed: TranscriptionResponse =
        serde_json::from_str(&body).map_err(|e| format!("JSON parse error: {e}, body: {body}"))?;

    Ok(parsed.text)
}

//
// -------------------------------------------------------------
// File-based persistence for Zustand (read/write state.json)
// -------------------------------------------------------------
fn state_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {e}"))?;

    Ok(dir.join("state.json"))
}

#[command]
async fn read_data_file(app: tauri::AppHandle) -> Result<String, String> {
    let path = state_file_path(&app)?;

    if !path.exists() {
        return Ok("{}".into());
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read file: {e}"))
}

#[command]
async fn write_data_file(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = state_file_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dirs: {e}"))?;
    }

    fs::write(path, contents).map_err(|e| format!("Failed to write file: {e}"))
}

//
// -------------------------------------------------------------
// Tauri Entry
// -------------------------------------------------------------
#[tauri::command]
fn save_to_downloads(filename: String, content: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|e| format!("HOME env not set: {}", e))?;
    let path = std::path::PathBuf::from(&home).join("Downloads").join(&filename);
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Write failed to {}: {}", path.display(), e))?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open Finder: {}", e))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window
                .eval("window.__TAURI_INTERNALS__.openDevTools()")
                .unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            transcribe_audio,
            read_data_file,
            write_data_file,
            save_to_downloads,
            reveal_in_finder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
