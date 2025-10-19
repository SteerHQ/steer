import { Hono } from 'hono';

const audio = new Hono();

// POST /api/audio/process
// This endpoint will be implemented in task 6.2
audio.post('/process', async (c) => {
  return c.json({ 
    message: 'Audio processing endpoint - to be implemented in task 6.2' 
  }, 501);
});

export default audio;
