// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
#[cfg(windows)]
mod audio_wasapi;
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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Включаем защиту от захвата экрана (stealth) с первого кадра.
            // На Windows это WDA_EXCLUDEFROMCAPTURE: окно видно пользователю,
            // но не попадает в демонстрацию экрана / запись (Zoom, Meet, OBS).
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.set_content_protected(true) {
                    tracing::warn!("Failed to enable content protection: {}", e);
                } else {
                    tracing::info!("Content protection (stealth) enabled at startup");
                }
            }
            Ok(())
        })
        .manage(AudioState::new())
        .invoke_handler(tauri::generate_handler![
            commands::start_audio_capture,
            commands::get_audio_data,
            commands::stop_audio_capture,
            commands::get_capture_status,
            commands::get_audio_devices,
            commands::save_audio_debug,
            commands::read_wav_file,
            commands::convert_pcm_to_wav,
            commands::get_audio_level,
            commands::get_buffer_size,
            commands::start_audio_level_emitter,
            commands::stop_audio_level_emitter,
            commands::get_audio_chunk,
            commands::get_device_sample_rate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
