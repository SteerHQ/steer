// WASAPI Loopback Audio Capture for Windows
// Captures system audio without virtual audio devices

#[cfg(windows)]
use windows::{
    Win32::Media::Audio::*,
    Win32::System::Com::*,
};

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[derive(Debug)]
pub enum WasapiError {
    InitializationError(String),
}

impl std::fmt::Display for WasapiError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            WasapiError::InitializationError(msg) => write!(f, "Initialization error: {}", msg),
        }
    }
}

impl std::error::Error for WasapiError {}

#[cfg(windows)]
impl From<windows::core::Error> for WasapiError {
    fn from(err: windows::core::Error) -> Self {
        WasapiError::InitializationError(err.to_string())
    }
}

pub struct WasapiCapture {
    buffer: Arc<Mutex<Vec<u8>>>,
    is_capturing: Arc<Mutex<bool>>,
    capture_thread: Option<thread::JoinHandle<()>>,
}

impl WasapiCapture {
    /// Create a new WASAPI loopback capture instance
    /// This captures all system audio without requiring virtual audio devices
    pub fn new() -> std::result::Result<Self, WasapiError> {
        tracing::info!("Initializing WASAPI loopback capture");
        
        Ok(WasapiCapture {
            buffer: Arc::new(Mutex::new(Vec::new())),
            is_capturing: Arc::new(Mutex::new(false)),
            capture_thread: None,
        })
    }

    /// Start capturing system audio via WASAPI loopback
    pub fn start_capture(&mut self) -> std::result::Result<(), WasapiError> {
            let mut is_capturing = self.is_capturing.lock().unwrap();
            if *is_capturing {
                return Ok(()); // Already capturing
            }

            *is_capturing = true;
            drop(is_capturing);

            let buffer = Arc::clone(&self.buffer);
            let is_capturing_clone = Arc::clone(&self.is_capturing);

            tracing::info!("Starting WASAPI loopback capture thread");

            let handle = thread::spawn(move || {
                if let Err(e) = Self::capture_loop(buffer, is_capturing_clone) {
                    tracing::error!("WASAPI capture loop error: {}", e);
                }
            });

            self.capture_thread = Some(handle);
            Ok(())
    }

    #[cfg(windows)]
    fn capture_loop(
        buffer: Arc<Mutex<Vec<u8>>>,
        is_capturing: Arc<Mutex<bool>>,
    ) -> std::result::Result<(), WasapiError> {
        unsafe {
            // Initialize COM for this thread
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED).ok();

            let result = (|| -> std::result::Result<(), WasapiError> {
                // Create device enumerator
                let enumerator: IMMDeviceEnumerator = CoCreateInstance(
                    &MMDeviceEnumerator,
                    None,
                    CLSCTX_ALL,
                )?;

                // Get default audio endpoint (speakers/headphones)
                let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;

                tracing::info!("Got default audio endpoint");

                // Activate audio client
                let audio_client: IAudioClient = device.Activate(CLSCTX_ALL, None)?;

                // Get mix format
                let mix_format = audio_client.GetMixFormat()?;

                let sample_rate = (*mix_format).nSamplesPerSec;
                let channels = (*mix_format).nChannels;
                let bits_per_sample = (*mix_format).wBitsPerSample;
                
                tracing::info!(
                    "Audio format: {} Hz, {} channels, {} bits",
                    sample_rate,
                    channels,
                    bits_per_sample
                );

                // Initialize audio client in loopback mode
                audio_client.Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK,
                    10_000_000, // 1 second buffer
                    0,
                    mix_format,
                    None,
                )?;

                // Get capture client
                let capture_client: IAudioCaptureClient = audio_client.GetService()?;

                // Start audio client
                audio_client.Start()?;

                tracing::info!("WASAPI capture started successfully");

                // Capture loop
                while *is_capturing.lock().unwrap() {
                    thread::sleep(Duration::from_millis(10));

                    let packet_length = match capture_client.GetNextPacketSize() {
                        Ok(len) => len,
                        Err(_) => continue,
                    };

                    if packet_length > 0 {
                        let mut data_ptr: *mut u8 = std::ptr::null_mut();
                        let mut num_frames = 0u32;
                        let mut flags = 0u32;

                        if capture_client
                            .GetBuffer(&mut data_ptr, &mut num_frames, &mut flags, None, None)
                            .is_err()
                        {
                            continue;
                        }

                        if num_frames > 0 && !data_ptr.is_null() {
                            let channels = (*mix_format).nChannels as usize;
                            let bytes_per_sample = ((*mix_format).wBitsPerSample / 8) as usize;
                            let frame_size = channels * bytes_per_sample;
                            let data_size = num_frames as usize * frame_size;

                            // Copy audio data to buffer
                            let audio_data = std::slice::from_raw_parts(data_ptr, data_size);
                            
                            // Convert to 16-bit mono PCM
                            let mut buffer_guard = buffer.lock().unwrap();
                            
                            for frame in 0..num_frames as usize {
                                let frame_offset = frame * frame_size;
                                
                                // Average all channels to mono
                                let mut sample_sum: i32 = 0;
                                for ch in 0..channels {
                                    let sample_offset = frame_offset + (ch * bytes_per_sample);
                                    
                                    // Assume float32 format (most common)
                                    if bytes_per_sample == 4 {
                                        let sample_bytes = [
                                            audio_data[sample_offset],
                                            audio_data[sample_offset + 1],
                                            audio_data[sample_offset + 2],
                                            audio_data[sample_offset + 3],
                                        ];
                                        let sample_f32 = f32::from_le_bytes(sample_bytes);
                                        sample_sum += (sample_f32 * 32767.0) as i32;
                                    }
                                }
                                
                                // Average and convert to i16
                                let sample_i16 = (sample_sum / channels as i32).clamp(-32768, 32767) as i16;
                                buffer_guard.extend_from_slice(&sample_i16.to_le_bytes());
                            }

                            // Limit buffer to 30 seconds (48kHz * 2 bytes * 30s)
                            const MAX_BUFFER_SIZE: usize = 2_880_000;
                            if buffer_guard.len() > MAX_BUFFER_SIZE {
                                let len = buffer_guard.len();
                                buffer_guard.drain(0..(len - MAX_BUFFER_SIZE));
                            }
                        }

                        capture_client.ReleaseBuffer(num_frames).ok();
                    }
                }

                // Stop audio client
                audio_client.Stop().ok();
                tracing::info!("WASAPI capture stopped");

                Ok(())
            })();

            CoUninitialize();
            result
        }
    }

    /// Stop capturing audio
    pub fn stop_capture(&mut self) -> std::result::Result<(), WasapiError> {
        let mut is_capturing = self.is_capturing.lock().unwrap();
        *is_capturing = false;
        drop(is_capturing);

        if let Some(handle) = self.capture_thread.take() {
            handle.join().ok();
        }

        Ok(())
    }

    /// Get the current audio buffer
    pub fn get_buffer(&self) -> Vec<u8> {
        let buffer = self.buffer.lock().unwrap();
        buffer.clone()
    }

    /// Clear the audio buffer
    pub fn clear_buffer(&mut self) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.clear();
    }

}

impl Drop for WasapiCapture {
    fn drop(&mut self) {
        self.stop_capture().ok();
    }
}
