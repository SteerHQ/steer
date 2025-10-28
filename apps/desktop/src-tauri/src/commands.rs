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

/// Start audio capture from specified device
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// * `device_name` - Name of the audio device to use
/// 
/// # Returns
/// * `Result<String, String>` - Success message or error
#[tauri::command]
pub async fn start_audio_capture(
    state: State<'_, AudioState>,
    device_name: String,
) -> Result<String, String> {
    let mut capture_guard = state.capture.lock().unwrap();
    
    // Stop and remove existing capture if device changed
    if capture_guard.is_some() {
        tracing::info!("Stopping existing capture to switch device");
        *capture_guard = None;
    }
    
    // Create new AudioCapture instance with specified device
    tracing::info!("Starting audio capture with device: {}", device_name);
    match AudioCapture::new(&device_name) {
        Ok(capture) => {
            *capture_guard = Some(capture);
        }
        Err(AudioError::DeviceNotFound(msg)) => {
            let err_msg = format!(
                "Audio device '{}' not found. Details: {}",
                device_name, msg
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
    
    // Start capture
    if let Some(ref mut capture) = *capture_guard {
        capture.start_capture().map_err(|e| {
            let err_msg = format!("Failed to start audio capture: {}", e);
            tracing::error!("{}", err_msg);
            err_msg
        })?;
        
        Ok(format!("Audio capture started successfully with device: {}", device_name))
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

/// Save audio buffer to WAV file for debugging
/// 
/// # Arguments
/// * `buffer` - Audio buffer data (16-bit PCM)
/// * `sample_rate` - Sample rate of the audio
/// 
/// # Returns
/// * `Result<String, String>` - Path to saved file or error
#[tauri::command]
pub async fn save_audio_debug(buffer: Vec<u8>, sample_rate: u32) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;
    use std::path::PathBuf;
    
    // Create debug directory in user's documents
    let mut debug_path = dirs::document_dir()
        .ok_or_else(|| "Failed to get documents directory".to_string())?;
    debug_path.push("VoiceAssistant");
    debug_path.push("debug");
    
    std::fs::create_dir_all(&debug_path)
        .map_err(|e| format!("Failed to create debug directory: {}", e))?;
    
    // Generate filename with timestamp
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("audio_debug_{}.wav", timestamp);
    debug_path.push(filename);
    
    // Write WAV file
    let mut file = File::create(&debug_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    // WAV header
    let num_channels: u16 = 1; // mono
    let bits_per_sample: u16 = 16;
    let byte_rate = sample_rate * num_channels as u32 * bits_per_sample as u32 / 8;
    let block_align = num_channels * bits_per_sample / 8;
    let data_size = buffer.len() as u32;
    
    // RIFF header
    file.write_all(b"RIFF").map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&(36 + data_size).to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(b"WAVE").map_err(|e| format!("Write error: {}", e))?;
    
    // fmt chunk
    file.write_all(b"fmt ").map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&16u32.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?; // chunk size
    file.write_all(&1u16.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?; // audio format (PCM)
    file.write_all(&num_channels.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&sample_rate.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&byte_rate.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&block_align.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&bits_per_sample.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    
    // data chunk
    file.write_all(b"data").map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&data_size.to_le_bytes()).map_err(|e| format!("Write error: {}", e))?;
    file.write_all(&buffer).map_err(|e| format!("Write error: {}", e))?;
    
    let path_str = debug_path.to_string_lossy().to_string();
    tracing::info!("Saved debug audio to: {}", path_str);
    
    Ok(path_str)
}
