// Prevents extra terminal window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::Deserialize;
use tauri::command;

#[derive(Deserialize)]
struct TranscriptionResponse {
    text: String,
}

#[command]
async fn transcribe_audio(audio: Vec<u8>, apiKey: String) -> Result<String, String> {
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
        .bearer_auth(apiKey)
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

fn main() {
    tauri::Builder::default()
        // Plugins you actually use
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        // ❌ REMOVE THIS — NOT VALID IN TAURI 2
        // .setup(|app| {
        //     tauri::plugin::capabilities::load(app, "default")?;
        //     Ok(())
        // })
        // Commands
        .invoke_handler(tauri::generate_handler![transcribe_audio])
        // Run
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
