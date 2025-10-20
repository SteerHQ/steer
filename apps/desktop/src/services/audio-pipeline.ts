import { invoke } from '@tauri-apps/api/core';
import type { WhisperResponse, ErrorResponse } from '@steer/types';

const API_BASE_URL = 'http://localhost:3000';

export class AudioPipeline {
  private apiKey: string;
  private isProcessing: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Process audio pipeline: capture -> process -> transcribe -> generate
   * Requirements: 1.5, 2.1, 2.3, 3.1, 3.3, 4.3
   */
  async processAudio(): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Audio processing already in progress');
    }

    this.isProcessing = true;

    try {
      // Step 1: Get audio data from Tauri
      const audioBuffer = await this.getAudioData();

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('No audio data available');
      }

      // Step 2: Process audio (convert to WAV)
      const processedAudio = await this.processAudioBuffer(audioBuffer);

      // Step 3: Transcribe audio using Whisper API
      const transcription = await this.transcribeAudio(processedAudio);

      if (!transcription.text || transcription.text.trim() === '') {
        throw new Error('Transcription is empty');
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
      const buffer = await invoke<number[]>('get_audio_data');
      return buffer;
    } catch (error) {
      throw new Error(`Failed to get audio data: ${error}`);
    }
  }

  /**
   * Process audio buffer via API
   * Requirement: 2.1
   */
  private async processAudioBuffer(buffer: number[]): Promise<number[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/audio/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buffer,
          sampleRate: 16000, // As per design: 16kHz
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to process audio');
      }

      const data = await response.json();
      return data.audio;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to process audio buffer');
    }
  }

  /**
   * Transcribe audio using Whisper API
   * Requirements: 2.1, 2.3
   */
  private async transcribeAudio(audioData: number[]): Promise<WhisperResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          audio: audioData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      return data.transcription;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Generate response using GPT-4o API
   * Requirements: 3.1, 3.3
   */
  private async generateResponse(transcript: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          transcript,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(errorData.error || 'Failed to generate response');
      }

      const data = await response.json();
      return data.response.message;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Check if pipeline is currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}
