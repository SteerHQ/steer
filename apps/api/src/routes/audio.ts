import { Hono } from 'hono';
import { AudioProcessor } from '../services/audio-processor';

const audio = new Hono();
const audioProcessor = new AudioProcessor();

// POST /api/audio/process
// Process audio buffer and convert to WAV format
audio.post('/process', async (c) => {
  try {
    // Validate request body
    const body = await c.req.json();
    
    if (!body.buffer) {
      return c.json({ 
        error: 'Missing required field: buffer',
        code: 'INVALID_REQUEST',
        retryable: false
      }, 400);
    }

    if (!body.sampleRate) {
      return c.json({ 
        error: 'Missing required field: sampleRate',
        code: 'INVALID_REQUEST',
        retryable: false
      }, 400);
    }

    // Convert buffer array to Uint8Array
    const bufferData = new Uint8Array(body.buffer);
    const sampleRate = body.sampleRate;

    console.log('Processing audio:', bufferData.length, 'bytes at', sampleRate, 'Hz');

    // Validate buffer is not empty
    if (bufferData.length === 0) {
      return c.json({ 
        error: 'Audio buffer is empty',
        code: 'INVALID_AUDIO',
        retryable: false
      }, 400);
    }

    // Process audio buffer (validates duration)
    const processedAudio = await audioProcessor.processAudioBuffer(bufferData, sampleRate);

    // Convert to WAV format
    const wavBlob = await audioProcessor.convertToWav(bufferData, sampleRate);

    // Convert Blob to ArrayBuffer for response
    const arrayBuffer = await wavBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Verify WAV header
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    console.log('Created WAV file:', uint8Array.length, 'bytes, header:', header);

    // Return processed audio data
    return c.json({
      success: true,
      audio: Array.from(uint8Array),
      metadata: {
        format: 'wav',
        sampleRate: processedAudio.sampleRate,
        channels: processedAudio.channels,
        duration: processedAudio.duration,
        size: uint8Array.length
      }
    });

  } catch (error) {
    // Handle validation errors (e.g., duration too short)
    if (error instanceof Error) {
      const isDurationError = error.message.includes('duration');
      
      return c.json({
        error: error.message,
        code: isDurationError ? 'AUDIO_TOO_SHORT' : 'PROCESSING_ERROR',
        retryable: false
      }, 400);
    }

    // Handle unexpected errors
    return c.json({
      error: 'Internal server error during audio processing',
      code: 'INTERNAL_ERROR',
      retryable: true
    }, 500);
  }
});

export default audio;
