// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod commands;
mod logger;

use commands::AudioState;

fn main() {
    // Initialize logging system
    if let Err(e) = logger::init_logger() {
        eprintln!("Failed to initialize logger: {}", e);
    }
    
    tracing::info!("VoiceAssistant starting...");
    
    tauri::Builder::<tauri::Wry>::default()
        .manage(AudioState::new())
        .invoke_handler(tauri::generate_handler![
            commands::start_audio_capture,
            commands::get_audio_data,
            commands::stop_audio_capture,
            commands::get_capture_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
