import { Hono } from 'hono';
import transcribe from './transcribe';
import generate from './generate';
import detectQuestion from './detect-question';

const openai = new Hono();

// Mount sub-routes
openai.route('/transcribe', transcribe);
openai.route('/generate', generate);
openai.route('/detect-question', detectQuestion);

export default openai;
