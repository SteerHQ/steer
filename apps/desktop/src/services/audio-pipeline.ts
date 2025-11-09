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
   * Process audio buffer - convert PCM to WAV format
   * Requirement: 2.1
   */
  private async processAudioBuffer(buffer: number[]): Promise<number[]> {
    console.log('Converting PCM to WAV, size:', buffer.length, 'bytes');
    
    // WAV file parameters
    const sampleRate = 48000; // Match Tauri's sample rate
    const numChannels = 1; // mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = buffer.length;
    const headerSize = 44;
    const fileSize = headerSize + dataSize;
    
    // Create WAV header
    const wavBuffer = new Uint8Array(fileSize);
    const view = new DataView(wavBuffer.buffer);
    
    // RIFF chunk descriptor
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, fileSize - 8, true); // File size - 8
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));
    
    // fmt sub-chunk
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample
    
    // data sub-chunk
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, dataSize, true); // Subchunk2Size
    
    // Copy audio data
    wavBuffer.set(new Uint8Array(buffer), headerSize);
    
    // Verify header
    const header = String.fromCharCode(wavBuffer[0], wavBuffer[1], wavBuffer[2], wavBuffer[3]);
    console.log('Created WAV file:', wavBuffer.length, 'bytes, header:', header);
    
    return Array.from(wavBuffer);
  }

  /**
   * Transcribe audio using Whisper API
   * Requirements: 2.1, 2.3
   */
  private async transcribeAudio(wavData: number[]): Promise<WhisperResponse> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Verify WAV data before sending
    console.log('Sending to transcribe, size:', wavData.length, 'bytes');
    if (wavData.length > 4) {
      const header = String.fromCharCode(...wavData.slice(0, 4));
      console.log('WAV header before transcribe:', header === 'RIFF' ? '✓ Valid' : '✗ Invalid', header, 'First bytes:', wavData.slice(0, 12));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          audio: wavData,
        }),
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
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
