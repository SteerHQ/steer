use crate::audio_wasapi::{WasapiCapture, WasapiError};

#[derive(Debug)]
pub enum AudioError {
    WasapiError(String),
}

impl std::fmt::Display for AudioError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            AudioError::WasapiError(msg) => write!(f, "WASAPI error: {}", msg),
        }
    }
}

impl From<WasapiError> for AudioError {
    fn from(err: WasapiError) -> Self {
        AudioError::WasapiError(err.to_string())
    }
}

impl std::error::Error for AudioError {}

pub struct AudioCapture {
    wasapi: WasapiCapture,
}

impl AudioCapture {
    /// Create a new AudioCapture instance using WASAPI loopback
    /// 
    /// # Arguments
    /// * `_device_name` - Ignored, always uses WASAPI loopback
    /// 
    /// # Returns
    /// * `Result<Self, AudioError>` - AudioCapture instance or error
    pub fn new(_device_name: &str) -> Result<Self, AudioError> {
        tracing::info!("Using WASAPI loopback mode");
        let wasapi = WasapiCapture::new()?;
        Ok(AudioCapture { wasapi })
    }

    /// Start capturing audio from the device
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn start_capture(&mut self) -> Result<(), AudioError> {
        self.wasapi.start_capture()?;
        Ok(())
    }

    /// Stop capturing audio
    /// 
    /// # Returns
    /// * `Result<(), AudioError>` - Success or error
    pub fn stop_capture(&mut self) -> Result<(), AudioError> {
        self.wasapi.stop_capture()?;
        Ok(())
    }

    /// Get the current audio buffer contents
    /// 
    /// # Returns
    /// * `Vec<u8>` - Copy of the buffer data
    pub fn get_buffer(&self) -> Vec<u8> {
        self.wasapi.get_buffer()
    }

    /// Clear the audio buffer
    pub fn clear_buffer(&mut self) {
        self.wasapi.clear_buffer()
    }

    /// Получить sample rate устройства
    pub fn get_device_sample_rate(&self) -> u32 {
        self.wasapi.get_device_sample_rate()
    }

    /// Получить новые PCM16 байты с момента последнего вызова (для Realtime стриминга)
    pub fn get_audio_chunk(&self) -> Vec<u8> {
        self.wasapi.get_audio_chunk()
    }
}
