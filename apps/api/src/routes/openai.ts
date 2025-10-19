import { Hono } from 'hono';

const openai = new Hono();

// POST /api/transcribe
// This endpoint will be implemented in task 7.4
openai.post('/transcribe', async (c) => {
  return c.json({ 
    message: 'Transcription endpoint - to be implemented in task 7.4' 
  }, 501);
});

// POST /api/generate
// This endpoint will be implemented in task 7.4
openai.post('/generate', async (c) => {
  return c.json({ 
    message: 'Generation endpoint - to be implemented in task 7.4' 
  }, 501);
});

export default openai;
