// Prevents extra terminal window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::Deserialize;
use tauri::command;
use tauri::Manager;

// For reading/writing JSON state
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
struct TranscriptionResponse {
    text: String,
}

//
// -------------------------------------------------------------
// Whisper Transcription Command
// -------------------------------------------------------------
#[command]
async fn transcribe_audio(audio: Vec<u8>, api_key: String) -> Result<String, String> {
    let client = Client::new();

    let part = reqwest::multipart::Part::bytes(audio)
        .file_name("audio.webm")
        .mime_str("audio/webm")
        .map_err(|e| format!("Mime error: {e}"))?;

    let form = reqwest::multipart::Form::new()
        .text("model", "gpt-4o-transcribe")
        .part("file", part);

    let res = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Request error: {e}"))?;

    let status = res.status();
    let body = res
        .text()
        .await
        .map_err(|e| format!("Response read error: {e}"))?;

    if !status.is_success() {
        return Err(format!("OpenAI error {status}: {body}"));
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
        return Ok("{}".into()); // return empty JSON
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
async fn write_data_file(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = state_file_path(&app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dirs: {}", e))?;
    }

    fs::write(path, contents).map_err(|e| format!("Failed to write file: {}", e))
}

//
// -------------------------------------------------------------
// Tauri Entry
// -------------------------------------------------------------
fn main() {
    tauri::Builder::default()
        // plugins you use
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        // register all commands
        .invoke_handler(tauri::generate_handler![
            transcribe_audio,
            read_data_file,
            write_data_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
