import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Voice Assistant API' });
});

// API routes will be added in subsequent tasks
// - /api/audio/process (task 6.2)
// - /api/transcribe (task 7.4)
// - /api/generate (task 7.4)

export default app;
