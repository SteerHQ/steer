import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import audioRoutes from './routes/audio';
import openaiRoutes from './routes/openai';
import { errorHandler } from './middleware/error-handler';

const app = new Hono();

// CORS configuration for Tauri local communication
app.use('/*', cors({
  origin: ['tauri://localhost', 'http://localhost:*', 'https://tauri.localhost'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logger middleware
app.use('/*', logger());

// Health check endpoint
app.get('/', (c) => {
  return c.json({ message: 'Voice Assistant API', status: 'running' });
});

// API routes
app.route('/api/audio', audioRoutes);
app.route('/api', openaiRoutes);

// Error handling middleware (must be last)
app.onError(errorHandler);

// Start server
const port = process.env.PORT || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
