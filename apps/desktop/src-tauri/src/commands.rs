use crate::audio::AudioCapture;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{State, AppHandle, Emitter, Manager};

/// Global state for audio capture
pub struct AudioState {
    capture: Mutex<Option<AudioCapture>>,
    level_emitter_running: Arc<Mutex<bool>>,
}

impl AudioState {
    pub fn new() -> Self {
        AudioState {
            capture: Mutex::new(None),
            level_emitter_running: Arc::new(Mutex::new(false)),
        }
    }
}

/// Start audio level event emitter
/// Emits audio level events every 100ms instead of polling
#[tauri::command]
pub async fn start_audio_level_emitter(
    app: AppHandle,
) -> Result<String, String> {
    let state = app.state::<AudioState>();
    let mut is_running = state.level_emitter_running.lock().unwrap();
    
    if *is_running {
        return Ok("Audio level emitter already running".to_string());
    }
    
    *is_running = true;
    drop(is_running);
    
    let is_running_clone = Arc::clone(&state.level_emitter_running);
    let app_clone = app.clone();
    
    thread::spawn(move || {
        tracing::info!("Audio level emitter started");
        
        while *is_running_clone.lock().unwrap() {
            // Get state from app handle
            let state = app_clone.state::<AudioState>();
            
            // Calculate audio level
            if let Ok(capture_guard) = state.capture.lock() {
                if let Some(ref capture) = *capture_guard {
                    let buffer = capture.get_buffer();
                    
                    if !buffer.is_empty() {
                        // Calculate RMS for last 0.5 seconds
                        const MAX_SAMPLES: usize = 48000;
                        let total_samples = buffer.len() / 2;
                        let samples_to_analyze = total_samples.min(MAX_SAMPLES);
                        let start_offset = if total_samples > MAX_SAMPLES {
                            (total_samples - MAX_SAMPLES) * 2
                        } else {
                            0
                        };
                        
                        let mut sum: f64 = 0.0;
                        for i in 0..samples_to_analyze {
                            let idx = start_offset + (i * 2);
                            if idx + 1 < buffer.len() {
                                let sample = i16::from_le_bytes([buffer[idx], buffer[idx + 1]]);
                                let normalized = sample as f64 / 32768.0;
                                sum += normalized * normalized;
                            }
                        }
                        
                        let rms = (sum / samples_to_analyze as f64).sqrt();
                        let level = (rms * 2.0).min(1.0) as f32;
                        
                        // Emit event
                        let _ = app_clone.emit("audio-level", level);
                    } else {
                        // Emit zero level
                        let _ = app_clone.emit("audio-level", 0.0f32);
                    }
                }
            }
            
            thread::sleep(Duration::from_millis(100));
        }
        
        tracing::info!("Audio level emitter stopped");
    });
    
    Ok("Audio level emitter started".to_string())
}

/// Stop audio level event emitter
#[tauri::command]
pub async fn stop_audio_level_emitter(app: AppHandle) -> Result<String, String> {
    let state = app.state::<AudioState>();
    let mut is_running = state.level_emitter_running.lock().unwrap();
    *is_running = false;
    Ok("Audio level emitter stopped".to_string())
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

/// Get buffer size without clearing it (for monitoring)
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<usize, String>` - Buffer size in bytes
#[tauri::command]
pub async fn get_buffer_size(state: State<'_, AudioState>) -> Result<usize, String> {
    let capture_guard = state.capture.lock().unwrap();
    
    if let Some(ref capture) = *capture_guard {
        let buffer = capture.get_buffer();
        Ok(buffer.len())
    } else {
        Ok(0)
    }
}

/// Get current audio level (volume)
/// 
/// # Arguments
/// * `state` - Tauri state containing AudioCapture instance
/// 
/// # Returns
/// * `Result<f32, String>` - Audio level from 0.0 to 1.0
#[tauri::command]
pub async fn get_audio_level(state: State<'_, AudioState>) -> Result<f32, String> {
    let capture_guard = state.capture.lock().unwrap();
    
    if let Some(ref capture) = *capture_guard {
        let buffer = capture.get_buffer();
        
        if buffer.is_empty() {
            return Ok(0.0);
        }
        
        // Calculate RMS (Root Mean Square) for audio level
        // For performance, only analyze last 0.5 seconds of audio (48000 samples = 96000 bytes)
        const MAX_SAMPLES_TO_ANALYZE: usize = 48000; // 0.5 seconds at 48kHz
        let total_samples = buffer.len() / 2; // 16-bit samples = 2 bytes each
        let samples_to_analyze = total_samples.min(MAX_SAMPLES_TO_ANALYZE);
        let start_offset = if total_samples > MAX_SAMPLES_TO_ANALYZE {
            (total_samples - MAX_SAMPLES_TO_ANALYZE) * 2 // Start from recent data
        } else {
            0
        };
        
        let mut sum: f64 = 0.0;
        
        for i in 0..samples_to_analyze {
            let idx = start_offset + (i * 2);
            if idx + 1 < buffer.len() {
                // Convert bytes to i16 sample
                let sample = i16::from_le_bytes([buffer[idx], buffer[idx + 1]]);
                let normalized = sample as f64 / 32768.0; // Normalize to -1.0 to 1.0
                sum += normalized * normalized;
            }
        }
        
        let rms = (sum / samples_to_analyze as f64).sqrt();
        let level = (rms * 2.0).min(1.0) as f32; // Scale and clamp to 0.0-1.0
        
        Ok(level)
    } else {
        Ok(0.0)
    }
}

/// Get list of available audio devices (both input and output)
/// 
/// # Returns
/// * `Result<Vec<String>, String>` - List of device names or error
#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<String>, String> {
    use cpal::traits::{HostTrait, DeviceTrait};
    
    let mut device_names = Vec::new();
    
    // Add WASAPI Loopback as first option on Windows
    #[cfg(windows)]
    {
        device_names.push("WASAPI Loopback (System Audio - No Virtual Device Needed)".to_string());
        tracing::info!("Added WASAPI Loopback option");
    }
    
    let host = cpal::default_host();
    
    // Get input devices
    tracing::info!("Enumerating input devices...");
    if let Ok(devices) = host.input_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                tracing::info!("Found input device: {}", name);
                device_names.push(format!("{} (Input)", name));
            }
        }
    }
    
    // Get output devices (for loopback capture)
    tracing::info!("Enumerating output devices...");
    if let Ok(devices) = host.output_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                tracing::info!("Found output device: {}", name);
                // Check if this output device supports input (loopback)
                if device.default_input_config().is_ok() {
                    device_names.push(format!("{} (Output/Loopback)", name));
                } else {
                    device_names.push(format!("{} (Output)", name));
                }
            }
        }
    }
    
    if device_names.is_empty() {
        tracing::warn!("No audio devices found");
        return Err("No audio devices found".to_string());
    }
    
    tracing::info!("Total devices found: {}", device_names.len());
    Ok(device_names)
}

/// Trim silence from PCM buffer (removes silence from start and end)
/// 
/// # Arguments
/// * `buffer` - PCM audio data (16-bit mono)
/// * `threshold` - Silence threshold (0.0 to 1.0, default 0.02)
/// 
/// # Returns
/// * Trimmed buffer with padding
fn trim_silence(buffer: &[u8], threshold: f32) -> Vec<u8> {
    if buffer.len() < 2 {
        return buffer.to_vec();
    }
    
    let sample_count = buffer.len() / 2;
    let threshold_i16 = (threshold * 32768.0) as i16;
    
    // Find first non-silent sample
    let mut start_idx = 0;
    for i in 0..sample_count {
        let idx = i * 2;
        if idx + 1 < buffer.len() {
            let sample = i16::from_le_bytes([buffer[idx], buffer[idx + 1]]);
            if sample.abs() > threshold_i16 {
                start_idx = i;
                break;
            }
        }
    }
    
    // Find last non-silent sample
    let mut end_idx = sample_count;
    for i in (0..sample_count).rev() {
        let idx = i * 2;
        if idx + 1 < buffer.len() {
            let sample = i16::from_le_bytes([buffer[idx], buffer[idx + 1]]);
            if sample.abs() > threshold_i16 {
                end_idx = i + 1;
                break;
            }
        }
    }
    
    // Add padding (0.2 seconds before and after)
    let padding_samples = (48000.0 * 0.2) as usize; // 0.2 seconds at 48kHz
    let start_with_padding = start_idx.saturating_sub(padding_samples);
    let end_with_padding = (end_idx + padding_samples).min(sample_count);
    
    // Extract trimmed audio
    let start_byte = start_with_padding * 2;
    let end_byte = end_with_padding * 2;
    
    if start_byte >= buffer.len() || end_byte > buffer.len() || start_byte >= end_byte {
        return buffer.to_vec();
    }
    
    let trimmed = buffer[start_byte..end_byte].to_vec();
    
    tracing::info!(
        "Trimmed silence: {} samples -> {} samples (removed {} from start, {} from end, added {} padding)",
        sample_count,
        trimmed.len() / 2,
        start_idx - start_with_padding,
        sample_count - end_idx,
        padding_samples
    );
    
    trimmed
}

/// Convert PCM buffer to WAV format in memory (fast, no disk I/O)
/// Automatically trims silence from start and end
/// 
/// # Arguments
/// * `buffer` - PCM audio data (16-bit mono)
/// * `sample_rate` - Sample rate of the audio
/// 
/// # Returns
/// * `Result<Vec<u8>, String>` - WAV file data or error
#[tauri::command]
pub async fn convert_pcm_to_wav(buffer: Vec<u8>, sample_rate: u32) -> Result<Vec<u8>, String> {
    // Trim silence from buffer (threshold 2%)
    let trimmed_buffer = trim_silence(&buffer, 0.02);
    
    // WAV header parameters
    let num_channels: u16 = 1; // mono
    let bits_per_sample: u16 = 16;
    let byte_rate = sample_rate * num_channels as u32 * bits_per_sample as u32 / 8;
    let block_align = num_channels * bits_per_sample / 8;
    let data_size = trimmed_buffer.len() as u32;
    
    let mut wav_data = Vec::with_capacity(44 + trimmed_buffer.len());
    
    // RIFF header
    wav_data.extend_from_slice(b"RIFF");
    wav_data.extend_from_slice(&(36 + data_size).to_le_bytes());
    wav_data.extend_from_slice(b"WAVE");
    
    // fmt chunk
    wav_data.extend_from_slice(b"fmt ");
    wav_data.extend_from_slice(&16u32.to_le_bytes()); // chunk size
    wav_data.extend_from_slice(&1u16.to_le_bytes()); // audio format (PCM)
    wav_data.extend_from_slice(&num_channels.to_le_bytes());
    wav_data.extend_from_slice(&sample_rate.to_le_bytes());
    wav_data.extend_from_slice(&byte_rate.to_le_bytes());
    wav_data.extend_from_slice(&block_align.to_le_bytes());
    wav_data.extend_from_slice(&bits_per_sample.to_le_bytes());
    
    // data chunk
    wav_data.extend_from_slice(b"data");
    wav_data.extend_from_slice(&data_size.to_le_bytes());
    wav_data.extend_from_slice(&trimmed_buffer);
    
    tracing::debug!(
        "Converted {} bytes PCM to {} bytes WAV (trimmed from {} bytes)",
        trimmed_buffer.len(),
        wav_data.len(),
        buffer.len()
    );
    
    Ok(wav_data)
}

/// Read WAV file and return its contents as bytes
/// 
/// # Arguments
/// * `path` - Path to the WAV file
/// 
/// # Returns
/// * `Result<Vec<u8>, String>` - File contents or error
#[tauri::command]
pub async fn read_wav_file(path: String) -> Result<Vec<u8>, String> {
    use std::fs;
    
    fs::read(&path).map_err(|e| format!("Failed to read WAV file: {}", e))
}

/// Save audio buffer to WAV file for debugging
/// Automatically trims silence from start and end
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
    
    // Trim silence from buffer
    let trimmed_buffer = trim_silence(&buffer, 0.02);
    
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
    let data_size = trimmed_buffer.len() as u32;
    
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
    file.write_all(&trimmed_buffer).map_err(|e| format!("Write error: {}", e))?;
    
    let path_str = debug_path.to_string_lossy().to_string();
    tracing::info!(
        "Saved debug audio to: {} (trimmed from {} to {} bytes)",
        path_str,
        buffer.len(),
        trimmed_buffer.len()
    );
    
    Ok(path_str)
}

/// Получить sample rate текущего захватываемого устройства.
/// Используется на фронтенде для передачи правильного SR в Silero VAD.
#[tauri::command]
pub async fn get_device_sample_rate(state: State<'_, AudioState>) -> Result<u32, String> {
    let capture_guard = state.capture.lock().unwrap();
    if let Some(ref capture) = *capture_guard {
        Ok(capture.get_device_sample_rate())
    } else {
        // Возвращаем стандартное значение если захват ещё не запущен
        Ok(48000)
    }
}

/// Получить новые PCM16 байты с момента предыдущего вызова, ресемплированные до 16000 Hz.
///
/// Используется RealtimeService на десктопе для стриминга аудио в OpenAI Realtime API.
/// Не очищает основной буфер — старый pipeline (get_audio_data) продолжает работать.
///
/// # Returns
/// * `Result<Vec<u8>, String>` - PCM16 mono 16000 Hz байты или пустой вектор если новых данных нет
#[tauri::command]
pub async fn get_audio_chunk(state: State<'_, AudioState>) -> Result<Vec<u8>, String> {
    let capture_guard = state.capture.lock().unwrap();

    let capture = match capture_guard.as_ref() {
        Some(c) => c,
        None => return Ok(Vec::new()),
    };

    let raw_chunk = capture.get_audio_chunk();
    if raw_chunk.is_empty() {
        return Ok(Vec::new());
    }

    let src_rate = capture.get_device_sample_rate();
    let dst_rate: u32 = 16000;

    // Если устройство уже отдаёт 16kHz — возвращаем как есть
    if src_rate == dst_rate {
        return Ok(raw_chunk);
    }

    // Конвертируем Vec<u8> (PCM16 LE) → Vec<f32>
    let src_f32: Vec<f32> = raw_chunk
        .chunks_exact(2)
        .map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.0)
        .collect();

    // Ресемплируем через rubato (SincFixedIn)
    let resampled = resample_pcm_f32(&src_f32, src_rate, dst_rate)
        .map_err(|e| format!("Resample error: {}", e))?;

    // Конвертируем обратно в PCM16 LE
    let out: Vec<u8> = resampled
        .iter()
        .flat_map(|&s| {
            let clamped = (s * 32767.0).clamp(-32768.0, 32767.0) as i16;
            clamped.to_le_bytes()
        })
        .collect();

    Ok(out)
}

/// Ресемплинг PCM f32 mono с помощью rubato SincFixedIn.
fn resample_pcm_f32(
    input: &[f32],
    src_rate: u32,
    dst_rate: u32,
) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>> {
    use rubato::{
        Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType,
        WindowFunction,
    };

    let ratio = dst_rate as f64 / src_rate as f64;

    let params = SincInterpolationParameters {
        sinc_len: 64,
        f_cutoff: 0.95,
        interpolation: SincInterpolationType::Linear,
        oversampling_factor: 64,
        window: WindowFunction::BlackmanHarris2,
    };

    // Chunk size: ~10ms при src_rate
    let chunk_size = (src_rate as usize * 10) / 1000;

    let mut resampler = SincFixedIn::<f32>::new(ratio, 2.0, params, chunk_size, 1)?;

    let mut output = Vec::new();
    let mut pos = 0;

    while pos < input.len() {
        let end = (pos + chunk_size).min(input.len());
        let mut chunk = input[pos..end].to_vec();

        // Дополняем до chunk_size нулями если это последний блок
        if chunk.len() < chunk_size {
            chunk.resize(chunk_size, 0.0);
        }

        let out_chunk = resampler.process(&[chunk], None)?;
        output.extend_from_slice(&out_chunk[0]);
        pos += chunk_size;
    }

    Ok(output)
}
