import { Hono } from 'hono';
import transcribe from './transcribe';
import generate from './generate';

const openai = new Hono();

// Mount sub-routes
openai.route('/transcribe', transcribe);
openai.route('/generate', generate);

export default openai;
