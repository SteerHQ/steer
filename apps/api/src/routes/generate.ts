import { Hono } from 'hono';
import { OpenAIService } from '../services/openai-service';
import { ValidationError } from '../middleware/error-handler';

const generate = new Hono();

// POST /api/generate
// Generate response with streaming (default)
// Requirements: 3.3
generate.post('/', async (c) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new ValidationError('Server API key not configured');
    }

    const body = await c.req.json();
    
    if (!body.transcript) {
      throw new ValidationError('Missing required field: transcript');
    }

    if (typeof body.transcript !== 'string' || body.transcript.trim() === '') {
      throw new ValidationError('Transcript must be a non-empty string');
    }

    const validModes = ['general', 'interview', 'algorithm', 'cheatsheet'];
    const mode = body.mode || 'general';
    
    if (!validModes.includes(mode)) {
      throw new ValidationError(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
    }

    const openaiService = new OpenAIService(apiKey);

    // Set up SSE (Server-Sent Events) headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    // Create readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of openaiService.generateResponseStream(
            body.transcript,
            mode,
            body.context
          )) {
            // Send chunk as SSE
            const data = `data: ${JSON.stringify({ chunk })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
          
          // Send done signal
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    throw error;
  }
});

export default generate;
