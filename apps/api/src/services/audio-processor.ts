import type { AudioBuffer, AudioMetadata } from '@steer/types';

export class AudioProcessor {
  private readonly MIN_DURATION_SECONDS = 2;
  private readonly DEFAULT_SAMPLE_RATE = 16000;
  private readonly DEFAULT_BIT_DEPTH = 16;
  private readonly DEFAULT_CHANNELS = 1; // mono

  /**
   * Process audio buffer from Uint8Array
   * Validates duration and prepares for conversion
   */
  async processAudioBuffer(buffer: Uint8Array, sampleRate: number = this.DEFAULT_SAMPLE_RATE): Promise<AudioBuffer> {
    const channels = this.DEFAULT_CHANNELS;
    const bytesPerSample = this.DEFAULT_BIT_DEPTH / 8;
    const totalSamples = buffer.length / bytesPerSample;
    const duration = totalSamples / sampleRate;

    // Validate minimum duration (Requirement 2.1)
    if (!this.validateAudioDuration(duration)) {
      throw new Error(`Audio duration ${duration.toFixed(2)}s is less than minimum ${this.MIN_DURATION_SECONDS}s`);
    }

    return {
      data: buffer,
      sampleRate,
      channels,
      duration,
    };
  }

  /**
   * Convert PCM audio buffer to WAV format
   * Creates proper WAV header for OpenAI transcription API compatibility
   */
  async convertToWav(buffer: Uint8Array, sampleRate: number = this.DEFAULT_SAMPLE_RATE): Promise<Blob> {
    const channels = this.DEFAULT_CHANNELS;
    const bitDepth = this.DEFAULT_BIT_DEPTH;
    const byteRate = sampleRate * channels * (bitDepth / 8);
    const blockAlign = channels * (bitDepth / 8);
    const dataSize = buffer.length;
    const headerSize = 44;
    const fileSize = headerSize + dataSize;

    // Create WAV header
    const wavHeader = new ArrayBuffer(headerSize);
    const view = new DataView(wavHeader);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true); // File size - 8
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, channels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Combine header and audio data
    const wavBuffer = new Uint8Array(fileSize);
    wavBuffer.set(new Uint8Array(wavHeader), 0);
    wavBuffer.set(buffer, headerSize);

    // Verify header was written correctly
    const headerCheck = String.fromCharCode(wavBuffer[0], wavBuffer[1], wavBuffer[2], wavBuffer[3]);
    if (headerCheck !== 'RIFF') {
      console.error('WAV header creation failed! Got:', headerCheck, 'bytes:', Array.from(wavBuffer.slice(0, 4)));
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Validate audio duration meets minimum requirement
   */
  validateAudioDuration(duration: number): boolean {
    return duration >= this.MIN_DURATION_SECONDS;
  }

  /**
   * Helper method to write string to DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Get audio metadata from buffer
   */
  getMetadata(buffer: Uint8Array, sampleRate: number = this.DEFAULT_SAMPLE_RATE): AudioMetadata {
    return {
      format: 'pcm',
      bitDepth: this.DEFAULT_BIT_DEPTH,
      sampleRate: sampleRate as 16000 | 44100 | 48000,
    };
  }
}
