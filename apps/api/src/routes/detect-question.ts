import { Hono } from 'hono';
import { OpenAIService } from '../services/openai-service';
import { ValidationError } from '../middleware/error-handler';

const detectQuestion = new Hono();

// POST /api/detect-question
// Detect if transcript contains a question that needs an answer
detectQuestion.post('/', async (c) => {
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

    const openaiService = new OpenAIService(apiKey);
    const isQuestion = await openaiService.detectQuestion(body.transcript);

    return c.json({
      success: true,
      isQuestion,
      transcript: body.transcript,
    });

  } catch (error) {
    throw error;
  }
});

export default detectQuestion;
