import { invoke } from "@tauri-apps/api/core";
import type { WhisperResponse, ErrorResponse } from "@steer/types";

const API_BASE_URL = "http://localhost:3000";

export class AudioPipeline {
  private isProcessing: boolean = false;

  constructor() {}

  /**
   * Process audio pipeline: capture -> process -> transcribe -> generate
   * Requirements: 1.5, 2.1, 2.3, 3.1, 3.3, 4.3
   */
  async processAudio(): Promise<string> {
    if (this.isProcessing) {
      throw new Error("Audio processing already in progress");
    }

    this.isProcessing = true;

    try {
      // Step 1: Get audio data from Tauri
      const audioBuffer = await this.getAudioData();

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("No audio data available");
      }

      // Step 2: Process audio (convert to WAV)
      const wavAudio = await this.processAudioBuffer(audioBuffer);

      // Step 3: Transcribe audio using Whisper API
      const transcription = await this.transcribeAudio(wavAudio);

      if (!transcription.text || transcription.text.trim() === "") {
        throw new Error("Transcription is empty");
      }

      // Step 4: Generate response using GPT-4o API
      const response = await this.generateResponse(transcription.text);

      // Step 5: Clear audio buffer (already done in getAudioData)

      return response;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get audio data from Tauri backend
   * Requirement: 1.5
   */
  private async getAudioData(): Promise<number[]> {
    try {
      const buffer = await invoke<number[]>("get_audio_data");

      // Save audio for debugging
      if (buffer && buffer.length > 0) {
        try {
          const path = await invoke<string>("save_audio_debug", {
            buffer: Array.from(buffer),
            sampleRate: 48000, // Adjust based on actual device sample rate
          });
          console.log("Debug audio saved to:", path);
        } catch (saveError) {
          console.warn("Failed to save debug audio:", saveError);
        }
      }

      return buffer;
    } catch (error) {
      throw new Error(`Failed to get audio data: ${error}`);
    }
  }

  /**
   * Process audio buffer - convert PCM to WAV format using Tauri
   * Uses save_audio_debug to create proper WAV file, then reads it back
   * Requirement: 2.1
   */
  private async processAudioBuffer(buffer: number[]): Promise<number[]> {
    console.log('Converting PCM to WAV using Tauri, size:', buffer.length, 'bytes');
    
    try {
      // Use Tauri's save_audio_debug to create a proper WAV file
      const wavPath = await invoke<string>("save_audio_debug", {
        buffer: buffer,
        sampleRate: 48000,
      });
      
      console.log('WAV file created at:', wavPath);
      
      // Read the WAV file back
      const wavData = await invoke<number[]>("read_wav_file", {
        path: wavPath,
      });
      
      console.log('Read WAV file:', wavData.length, 'bytes');
      
      // Verify header
      if (wavData.length > 4) {
        const header = String.fromCharCode(wavData[0], wavData[1], wavData[2], wavData[3]);
        console.log('WAV header:', header, 'First 12 bytes:', wavData.slice(0, 12));
      }
      
      return wavData;
    } catch (error) {
      console.error('Failed to process audio with Tauri:', error);
      throw new Error(`Failed to convert audio to WAV: ${error}`);
    }
  }

  /**
   * Transcribe audio using Whisper API
   * Requirements: 2.1, 2.3
   */
  private async transcribeAudio(wavData: number[]): Promise<WhisperResponse> {
    // Check if audio data is empty or too small
    const MIN_WAV_SIZE = 1000; // Minimum 1KB for meaningful audio
    if (!wavData || wavData.length < MIN_WAV_SIZE) {
      throw new Error(`Audio data too small: ${wavData?.length || 0} bytes (minimum ${MIN_WAV_SIZE} bytes)`);
    }

    // Verify WAV data before sending
    console.log('Sending to transcribe, size:', wavData.length, 'bytes');
    if (wavData.length > 4) {
      const header = String.fromCharCode(...wavData.slice(0, 4));
      console.log('WAV header before transcribe:', header === 'RIFF' ? '✓ Valid' : '✗ Invalid', header, 'First bytes:', wavData.slice(0, 12));
    }

    try {
      // Send raw binary data directly (much faster than JSON)
      const audioBlob = new Uint8Array(wavData);
      
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
        },
        body: audioBlob,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        throw new Error(errorData.error || "Failed to transcribe audio");
      }

      const data = await response.json();
      return data.transcription;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to transcribe audio");
    }
  }

  /**
   * Generate response using GPT-4o API
   * Requirements: 3.1, 3.3
   */
  private async generateResponse(transcript: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        throw new Error(errorData.error || "Failed to generate response");
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to generate response");
    }
  }

  /**
   * Check if pipeline is currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}
