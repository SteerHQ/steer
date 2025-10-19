export interface AudioBuffer {
  data: Uint8Array;
  sampleRate: number;
  channels: number;
  duration: number; // seconds
}

export interface AudioMetadata {
  format: 'pcm' | 'wav';
  bitDepth: 16;
  sampleRate: 16000 | 44100 | 48000;
}
