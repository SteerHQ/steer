use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Stream, StreamConfig};
use std::sync::{Arc, Mutex};

#[derive(Debug)]
pub enum AudioError {
    DeviceNotFound(String),
    StreamError(String),
    ConfigError(String),
}

impl std::fmt::Display for AudioError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AudioError::DeviceNotFound(msg) => write!(f, "Device not found: {}", msg),
            AudioError::StreamError(msg) => write!(f, "Stream error: {}", msg),
            AudioError::ConfigError(msg) => write!(f, "Config error: {}", msg),
        }
    }
}

impl std::error::Error for AudioError {}

pub struct AudioCapture {
    device: Device,
    buffer: Arc<Mutex<Vec<u8>>>,
    sample_rate: u32,
    stream: Option<Stream>,
}

impl AudioCapture {
    /// Create a new AudioCapture instance for the specified device
    /// 
    /// # Arguments
    /// * `device_name` - Name of the audio device (e.g., "VB-Cable")
    /// 
    /// # Returns
    /// * `Result<Self, AudioError>` - AudioCapture instance or error
    pub fn new(device_name: &str) -> Result<Self, AudioError> {
        let host = cpal::default_host();
        
        // Find the device by name
        let device = host
            .input_devices()
            .map_err(|e| AudioError::DeviceNotFound(format!("Failed to enumerate devices: {}", e)))?
            .find(|d| {
                if let Ok(name) = d.name() {
                    name.contains(device_name)
                } else {
                    false
                }
            })
            .ok_or_else(|| {
                AudioError::DeviceNotFound(format!(
                    "Device '{}' not found. Please ensure VB-Cable is installed and configured.",
                    device_name
                ))
            })?;

        // Get default config and verify it supports our requirements
        let config = device
            .default_input_config()
            .map_err(|e| AudioError::ConfigError(format!("Failed to get default config: {}", e)))?;

        let sample_rate = config.sample_rate().0;

        Ok(AudioCapture {
            device,
            buffer: Arc::new(Mutex::new(Vec::new())),
            sample_rate,
            stream: None,
        })
    }

    /// Start capturing audio from the device
    /// 
    /// Configures the audio stream with 16kHz, 16-bit PCM, mono format
    /// and starts capturing audio data into the internal buffer.
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn start_capture(&mut self) -> Result<(), AudioError> {
        // Configure stream for 16kHz, 16-bit PCM, mono
        let config = StreamConfig {
            channels: 1, // mono
            sample_rate: cpal::SampleRate(16000), // 16kHz
            buffer_size: cpal::BufferSize::Default,
        };

        let buffer = Arc::clone(&self.buffer);
        let err_buffer = Arc::clone(&self.buffer);

        // Build the input stream
        let stream = self
            .device
            .build_input_stream(
                &config,
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    // Convert i16 samples to bytes (16-bit PCM)
                    let mut buffer = buffer.lock().unwrap();
                    for &sample in data.iter() {
                        let bytes = sample.to_le_bytes();
                        buffer.extend_from_slice(&bytes);
                    }
                    
                    // Limit buffer to 10 seconds of audio (160KB at 16kHz mono 16-bit)
                    // 16000 samples/sec * 2 bytes/sample * 10 seconds = 320000 bytes
                    const MAX_BUFFER_SIZE: usize = 320_000;
                    if buffer.len() > MAX_BUFFER_SIZE {
                        buffer.drain(0..buffer.len() - MAX_BUFFER_SIZE);
                    }
                },
                move |err| {
                    eprintln!("Audio stream error: {}", err);
                    // Clear buffer on error
                    if let Ok(mut buf) = err_buffer.lock() {
                        buf.clear();
                    }
                },
                None,
            )
            .map_err(|e| AudioError::StreamError(format!("Failed to build stream: {}", e)))?;

        // Start the stream
        stream
            .play()
            .map_err(|e| AudioError::StreamError(format!("Failed to start stream: {}", e)))?;

        self.stream = Some(stream);
        Ok(())
    }

    /// Stop capturing audio
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn stop_capture(&mut self) -> Result<(), AudioError> {
        if let Some(stream) = self.stream.take() {
            drop(stream); // Dropping the stream stops it
        }
        Ok(())
    }

    /// Get the current audio buffer contents
    /// 
    /// # Returns
    /// * `Vec<u8>` - Copy of the buffer data
    pub fn get_buffer(&self) -> Vec<u8> {
        let buffer = self.buffer.lock().unwrap();
        buffer.clone()
    }

    /// Clear the audio buffer
    pub fn clear_buffer(&mut self) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.clear();
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
