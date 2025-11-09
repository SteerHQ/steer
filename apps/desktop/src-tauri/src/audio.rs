use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, StreamConfig};
use std::sync::{Arc, Mutex};

#[cfg(windows)]
use crate::audio_wasapi::{WasapiCapture, WasapiError};

#[derive(Debug)]
pub enum AudioError {
    DeviceNotFound(String),
    StreamError(String),
    ConfigError(String),
    WasapiError(String),
}

impl std::fmt::Display for AudioError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AudioError::DeviceNotFound(msg) => write!(f, "Device not found: {}", msg),
            AudioError::StreamError(msg) => write!(f, "Stream error: {}", msg),
            AudioError::ConfigError(msg) => write!(f, "Config error: {}", msg),
            AudioError::WasapiError(msg) => write!(f, "WASAPI error: {}", msg),
        }
    }
}

#[cfg(windows)]
impl From<WasapiError> for AudioError {
    fn from(err: WasapiError) -> Self {
        AudioError::WasapiError(err.to_string())
    }
}

impl std::error::Error for AudioError {}

pub enum CaptureBackend {
    Cpal {
        device: Device,
        buffer: Arc<Mutex<Vec<u8>>>,
        is_capturing: Arc<Mutex<bool>>,
    },
    #[cfg(windows)]
    Wasapi(WasapiCapture),
}

pub struct AudioCapture {
    backend: CaptureBackend,
    sample_rate: u32,
}

impl AudioCapture {
    /// Create a new AudioCapture instance
    /// 
    /// # Arguments
    /// * `device_name` - Name of the audio device
    ///   - "WASAPI Loopback" - Use Windows WASAPI loopback (no virtual device needed)
    ///   - Other names - Use CPAL with specified device (VB-Cable, Stereo Mix, etc.)
    /// 
    /// # Returns
    /// * `Result<Self, AudioError>` - AudioCapture instance or error
    pub fn new(device_name: &str) -> Result<Self, AudioError> {
        // Check if user wants WASAPI loopback
        #[cfg(windows)]
        if device_name.to_lowercase().contains("wasapi") || device_name.to_lowercase().contains("loopback") {
            tracing::info!("Using WASAPI loopback mode");
            let wasapi = WasapiCapture::new()?;
            let sample_rate = wasapi.sample_rate();
            return Ok(AudioCapture {
                backend: CaptureBackend::Wasapi(wasapi),
                sample_rate,
            });
        }
        
        // Fall back to CPAL for specific devices
        Self::new_cpal(device_name)
    }
    
    /// Create a new AudioCapture instance using CPAL
    fn new_cpal(device_name: &str) -> Result<Self, AudioError> {
        let host = cpal::default_host();
        
        // List all available devices for debugging
        tracing::info!("Searching for audio device: {}", device_name);
        
        // Clean device name (remove suffixes like " (Input)", " (Output)", " (Output/Loopback)")
        let clean_device_name = device_name
            .replace(" (Input)", "")
            .replace(" (Output)", "")
            .replace(" (Output/Loopback)", "")
            .trim()
            .to_string();
        
        tracing::info!("Cleaned device name: {}", clean_device_name);
        
        let mut available_devices = Vec::new();
        
        // Check input devices
        if let Ok(devices) = host.input_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    tracing::info!("Found input device: {}", name);
                    available_devices.push((name.clone(), device));
                }
            }
        }
        
        // Check output devices (for loopback like VB-Cable)
        if let Ok(devices) = host.output_devices() {
            for device in devices {
                if let Ok(name) = device.name() {
                    tracing::info!("Found output device: {}", name);
                    // Only add if it supports input config (loopback)
                    if device.default_input_config().is_ok() {
                        available_devices.push((name.clone(), device));
                    }
                }
            }
        }
        
        // Find the device by multiple matching strategies
        let device = available_devices
            .iter()
            // Strategy 1: Exact match with original name
            .find(|(name, _)| name == device_name)
            .or_else(|| {
                // Strategy 2: Exact match with cleaned name
                available_devices.iter().find(|(name, _)| name == &clean_device_name)
            })
            .or_else(|| {
                // Strategy 3: Case-insensitive exact match
                let search_lower = clean_device_name.to_lowercase();
                available_devices.iter().find(|(name, _)| {
                    name.to_lowercase() == search_lower
                })
            })
            .or_else(|| {
                // Strategy 4: Partial match (contains)
                let search_lower = clean_device_name.to_lowercase();
                available_devices.iter().find(|(name, _)| {
                    let name_lower = name.to_lowercase();
                    name_lower.contains(&search_lower) || search_lower.contains(&name_lower)
                })
            })
            .map(|(_, device)| device.clone())
            .ok_or_else(|| {
                let available_names: Vec<String> = available_devices.iter()
                    .map(|(name, _)| name.clone())
                    .collect();
                let err = AudioError::DeviceNotFound(format!(
                    "Device '{}' not found. Available devices: {}",
                    device_name,
                    available_names.join(", ")
                ));
                tracing::error!("{}", err);
                err
            })?;

        // Get default config and verify it supports our requirements
        let config = device
            .default_input_config()
            .map_err(|e| {
                let err = AudioError::ConfigError(format!("Failed to get default config: {}", e));
                tracing::error!("{}", err);
                err
            })?;

        let sample_rate = config.sample_rate().0;

        Ok(AudioCapture {
            backend: CaptureBackend::Cpal {
                device,
                buffer: Arc::new(Mutex::new(Vec::new())),
                is_capturing: Arc::new(Mutex::new(false)),
            },
            sample_rate,
        })
    }

    /// Start capturing audio from the device
    /// 
    /// Uses the device's default configuration and starts capturing audio data.
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn start_capture(&mut self) -> Result<(), AudioError> {
        match &mut self.backend {
            #[cfg(windows)]
            CaptureBackend::Wasapi(wasapi) => {
                wasapi.start_capture()?;
                Ok(())
            }
            CaptureBackend::Cpal { device, buffer, is_capturing } => {
                let mut is_capturing_guard = is_capturing.lock().unwrap();
                if *is_capturing_guard {
                    return Ok(()); // Already capturing
                }

                // Get the default configuration from the device
                let supported_config = device
                    .default_input_config()
                    .map_err(|e| {
                        let err = AudioError::ConfigError(format!("Failed to get default config: {}", e));
                        tracing::error!("{}", err);
                        err
                    })?;

                tracing::info!("Using device config: {:?}", supported_config);
                
                let config: StreamConfig = supported_config.into();

                let buffer_clone = Arc::clone(buffer);
                let err_buffer = Arc::clone(buffer);
                let is_capturing_clone = Arc::clone(is_capturing);

                // Build the input stream with f32 samples (most common format)
                let stream = device
                    .build_input_stream(
                        &config,
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            // Convert f32 samples to i16 PCM bytes
                            let mut buffer = buffer_clone.lock().unwrap();
                            for &sample in data.iter() {
                                // Convert f32 (-1.0 to 1.0) to i16 (-32768 to 32767)
                                let sample_i16 = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
                                let bytes = sample_i16.to_le_bytes();
                                buffer.extend_from_slice(&bytes);
                            }
                            
                            // Limit buffer to 10 seconds of audio
                            const MAX_BUFFER_SIZE: usize = 960_000;
                            if buffer.len() > MAX_BUFFER_SIZE {
                                let len = buffer.len();
                                buffer.drain(0..(len - MAX_BUFFER_SIZE));
                            }
                        },
                        move |err| {
                            tracing::error!("Audio stream error: {}", err);
                            // Clear buffer on error
                            if let Ok(mut buf) = err_buffer.lock() {
                                buf.clear();
                            }
                            if let Ok(mut capturing) = is_capturing_clone.lock() {
                                *capturing = false;
                            }
                        },
                        None,
                    )
                    .map_err(|e| {
                        let err = AudioError::StreamError(format!("Failed to build stream: {}", e));
                        tracing::error!("{}", err);
                        err
                    })?;

                // Start the stream
                stream
                    .play()
                    .map_err(|e| {
                        let err = AudioError::StreamError(format!("Failed to start stream: {}", e));
                        tracing::error!("{}", err);
                        err
                    })?;

                *is_capturing_guard = true;
                
                // Leak the stream to keep it alive
                std::mem::forget(stream);

                Ok(())
            }
        }
    }

    /// Stop capturing audio
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn stop_capture(&mut self) -> Result<(), AudioError> {
        match &mut self.backend {
            #[cfg(windows)]
            CaptureBackend::Wasapi(wasapi) => {
                wasapi.stop_capture()?;
                Ok(())
            }
            CaptureBackend::Cpal { is_capturing, .. } => {
                let mut is_capturing = is_capturing.lock().unwrap();
                *is_capturing = false;
                Ok(())
            }
        }
    }

    /// Get the current audio buffer contents
    /// 
    /// # Returns
    /// * `Vec<u8>` - Copy of the buffer data
    pub fn get_buffer(&self) -> Vec<u8> {
        match &self.backend {
            #[cfg(windows)]
            CaptureBackend::Wasapi(wasapi) => wasapi.get_buffer(),
            CaptureBackend::Cpal { buffer, .. } => {
                let buffer = buffer.lock().unwrap();
                buffer.clone()
            }
        }
    }

    /// Clear the audio buffer
    pub fn clear_buffer(&mut self) {
        match &mut self.backend {
            #[cfg(windows)]
            CaptureBackend::Wasapi(wasapi) => wasapi.clear_buffer(),
            CaptureBackend::Cpal { buffer, .. } => {
                let mut buffer = buffer.lock().unwrap();
                buffer.clear();
            }
        }
    }

    /// Get the sample rate of the audio capture
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_capture_creation() {
        // This test will fail if VB-Cable is not installed
        // In a real scenario, you'd mock the device
        let result = AudioCapture::new("VB-Cable");
        
        // We expect either success or a specific error
        match result {
            Ok(_) => println!("VB-Cable device found"),
            Err(AudioError::DeviceNotFound(_)) => {
                println!("VB-Cable not found (expected in test environment)")
            }
            Err(e) => panic!("Unexpected error: {}", e),
        }
    }
}
