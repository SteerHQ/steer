import { Hono } from 'hono';
import { OpenAIService } from '../services/openai-service';
import { ValidationError } from '../middleware/error-handler';

const generate = new Hono();

// POST /api/generate
// Generate response using OpenAI GPT-4o API
// Requirements: 3.3
generate.post('/', async (c) => {
  try {
    // Get API key from environment only (server-side)
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new ValidationError('Server API key not configured');
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

export default generate;
