use crate::audio::{AudioCapture, AudioError};
use std::sync::Mutex;
use tauri::State;

/// Global state for audio capture
pub struct AudioState {
    pub capture: Mutex<Option<AudioCapture>>,
}

impl AudioState {
    pub fn new() -> Self {
        AudioState {
            capture: Mutex::new(None),
        }
    }
}

/// Start audio capture from VB-Cable device
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<String, String>` - Success message or error
#[tauri::command]
pub async fn start_audio_capture(state: State<'_, AudioState>) -> Result<String, String> {
    let mut capture_guard = state.capture.lock().unwrap();
    
    // Create new AudioCapture instance if not exists
    if capture_guard.is_none() {
        match AudioCapture::new("VB-Cable") {
            Ok(capture) => {
                *capture_guard = Some(capture);
            }
            Err(AudioError::DeviceNotFound(msg)) => {
                return Err(format!(
                    "VB-Cable device not found. Please ensure VB-Cable is installed and configured. Details: {}",
                    msg
                ));
            }
            Err(e) => {
                return Err(format!("Failed to initialize audio capture: {}", e));
            }
        }
    }
    
    // Start capture
    if let Some(ref mut capture) = *capture_guard {
        capture.start_capture().map_err(|e| {
            format!("Failed to start audio capture: {}", e)
        })?;
        
        Ok("Audio capture started successfully".to_string())
    } else {
        Err("Failed to initialize audio capture".to_string())
    }
}

/// Get audio data from the buffer
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<Vec<u8>, String>` - Audio buffer data or error
#[tauri::command]
pub async fn get_audio_data(state: State<'_, AudioState>) -> Result<Vec<u8>, String> {
    let mut capture_guard = state.capture.lock().unwrap();
    
    if let Some(ref mut capture) = *capture_guard {
        let buffer = capture.get_buffer();
        
        // Clear buffer after extraction
        capture.clear_buffer();
        
        Ok(buffer)
    } else {
        Err("Audio capture not initialized. Please start capture first.".to_string())
    }
}

/// Stop audio capture
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<String, String>` - Success message or error
#[tauri::command]
pub async fn stop_audio_capture(state: State<'_, AudioState>) -> Result<String, String> {
    let mut capture_guard = state.capture.lock().unwrap();
    
    if let Some(ref mut capture) = *capture_guard {
        capture.stop_capture().map_err(|e| {
            format!("Failed to stop audio capture: {}", e)
        })?;
        
        Ok("Audio capture stopped successfully".to_string())
    } else {
        Err("Audio capture not initialized".to_string())
    }
}

/// Get audio capture status
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<bool, String>` - True if capture is initialized, false otherwise
#[tauri::command]
pub async fn get_capture_status(state: State<'_, AudioState>) -> Result<bool, String> {
    let capture_guard = state.capture.lock().unwrap();
    Ok(capture_guard.is_some())
}
