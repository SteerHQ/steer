import { Hono } from 'hono';
import { OpenAIService } from '../services/openai-service';
import { ValidationError } from '../middleware/error-handler';

const openai = new Hono();

// POST /api/transcribe
// Transcribe audio using OpenAI Whisper API
// Requirements: 2.3
openai.post('/transcribe', async (c) => {
  try {
    // Get API key from environment or headers
    const apiKey = process.env.OPENAI_API_KEY || c.req.header('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      throw new ValidationError('Missing API key');
    }

    // Validate request body
    const body = await c.req.json();
    if (!body.audio) {
      throw new ValidationError('Missing required field: audio');
    }

    // Convert audio array back to Blob (data is already in WAV format from /api/audio/process)
    const audioArray = new Uint8Array(body.audio);
    const audioBlob = new Blob([audioArray], { type: 'audio/wav' });

    
    // Save debug file
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      
      const debugDir = path.join(os.homedir(), 'Documents', 'VoiceAssistant', 'debug');
      await fs.mkdir(debugDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const debugPath = path.join(debugDir, `transcribe_${timestamp}.wav`);
      
      await fs.writeFile(debugPath, Buffer.from(audioArray));
      console.log('Debug WAV saved to:', debugPath);
    } catch (debugError) {
      console.warn('Failed to save debug file:', debugError);
    }

    // Create OpenAI service instance
    const openaiService = new OpenAIService(apiKey);

    // Transcribe audio
    const result = await openaiService.transcribeAudio(audioBlob);

    return c.json({
      success: true,
      transcription: result,
    });

  } catch (error) {
    // Let error handler middleware handle the error
    throw error;
  }
});

// POST /api/generate
// Generate response using OpenAI GPT-4o API
// Requirements: 3.3
openai.post('/generate', async (c) => {
  try {
    // Get API key from environment or headers
    const apiKey = process.env.OPENAI_API_KEY || c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      throw new ValidationError('Missing API key');
    }

    // Validate request body
    const body = await c.req.json();
    
    if (!body.transcript) {
      throw new ValidationError('Missing required field: transcript');
    }

    if (typeof body.transcript !== 'string' || body.transcript.trim() === '') {
      throw new ValidationError('Transcript must be a non-empty string');
    }

    // Validate mode if provided
    const validModes = ['general', 'interview', 'algorithm', 'cheatsheet'];
    const mode = body.mode || 'general';
    
    if (!validModes.includes(mode)) {
      throw new ValidationError(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
    }

    // Create OpenAI service instance
    const openaiService = new OpenAIService(apiKey);

    // Generate response with mode and context
    const response = await openaiService.generateResponse(
      body.transcript,
      mode,
      body.context
    );

    return c.json({
      success: true,
      response,
      mode,
    });

  } catch (error) {
    // Let error handler middleware handle the error
    throw error;
  }
});

export default openai;
