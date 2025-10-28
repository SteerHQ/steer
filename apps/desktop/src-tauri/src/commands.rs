use crate::audio::{AudioCapture, AudioError};
use std::sync::Mutex;
use tauri::State;

/// Global state for audio capture
pub struct AudioState {
    capture: Mutex<Option<AudioCapture>>,
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
                let err_msg = format!(
                    "VB-Cable device not found. Please ensure VB-Cable is installed and configured. Details: {}",
                    msg
                );
                tracing::error!("{}", err_msg);
                return Err(err_msg);
            }
            Err(e) => {
                let err_msg = format!("Failed to initialize audio capture: {}", e);
                tracing::error!("{}", err_msg);
                return Err(err_msg);
            }
        }
    }
    
    // Start capture
    if let Some(ref mut capture) = *capture_guard {
        capture.start_capture().map_err(|e| {
            let err_msg = format!("Failed to start audio capture: {}", e);
            tracing::error!("{}", err_msg);
            err_msg
        })?;
        
        Ok("Audio capture started successfully".to_string())
    } else {
        let err_msg = "Failed to initialize audio capture".to_string();
        tracing::error!("{}", err_msg);
        Err(err_msg)
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
        let err_msg = "Audio capture not initialized. Please start capture first.".to_string();
        tracing::warn!("{}", err_msg);
        Err(err_msg)
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
            let err_msg = format!("Failed to stop audio capture: {}", e);
            tracing::error!("{}", err_msg);
            err_msg
        })?;
        
        Ok("Audio capture stopped successfully".to_string())
    } else {
        let err_msg = "Audio capture not initialized".to_string();
        tracing::warn!("{}", err_msg);
        Err(err_msg)
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

/// Get list of available audio input devices
/// 
/// # Returns
/// * `Result<Vec<String>, String>` - List of device names or error
#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<String>, String> {
    use cpal::traits::{HostTrait, DeviceTrait};
    
    let host = cpal::default_host();
    
    let devices = host
        .input_devices()
        .map_err(|e| format!("Failed to enumerate devices: {}", e))?;
    
    let mut device_names = Vec::new();
    for device in devices {
        if let Ok(name) = device.name() {
            tracing::info!("Found audio device: {}", name);
            device_names.push(name);
        }
    }
    
    if device_names.is_empty() {
        tracing::warn!("No audio input devices found");
        return Err("No audio input devices found".to_string());
    }
    
    Ok(device_names)
}
