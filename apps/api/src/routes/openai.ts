import { Hono } from "hono";
import { GroqService, parseGroqApiKeys } from "../services/groq-service";
import { ValidationError } from "../middleware/error-handler";

/** Читает ключи из GROQ_API_KEYS (запятая) или GROQ_API_KEY (один ключ) */
function getGroqKeys(): string[] {
  return parseGroqApiKeys(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY);
}

/** Читает прокси из GROQ_PROXY (опционально) */
function getGroqProxy(): string | undefined {
  return process.env.GROQ_PROXY || undefined;
}

const openai = new Hono();

// POST /api/transcribe
// Транскрибировать аудио через Groq Whisper large-v3
// Принимает raw binary WAV в теле запроса
// Query param: ?context=<предыдущий текст>
openai.post("/transcribe", async (c) => {
  const apiKeys = getGroqKeys();
  if (apiKeys.length === 0) {
    throw new ValidationError(
      "GROQ_API_KEYS (or GROQ_API_KEY) not configured on server",
    );
  }

  const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

  // Early validation: check Content-Length header before buffering
  const contentLength = c.req.header("Content-Length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > MAX_AUDIO_SIZE) {
      throw new ValidationError(
        `Audio file too large: ${size} bytes (maximum ${MAX_AUDIO_SIZE} bytes)`,
      );
    }
  }

  const arrayBuffer = await c.req.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new ValidationError("Missing audio data in request body");
  }

  // Fallback validation: check actual size after buffering (defense-in-depth)
  if (arrayBuffer.byteLength > MAX_AUDIO_SIZE) {
    throw new ValidationError(
      `Audio file too large: ${arrayBuffer.byteLength} bytes (maximum ${MAX_AUDIO_SIZE} bytes)`,
    );
  }

  const audioArray = new Uint8Array(arrayBuffer);
  if (audioArray.length < 44) {
    throw new ValidationError(
      "Invalid audio data: file too small to be a valid WAV",
    );
  }

  const riffHeader = String.fromCharCode(...audioArray.slice(0, 4));
  if (riffHeader !== "RIFF") {
    throw new ValidationError("Invalid audio format: missing RIFF header");
  }

  const waveFormat = String.fromCharCode(...audioArray.slice(8, 12));
  if (waveFormat !== "WAVE") {
    throw new ValidationError("Invalid audio format: not a WAV file");
  }

  const fmtChunk = String.fromCharCode(...audioArray.slice(12, 16));
  if (fmtChunk !== "fmt ") {
    throw new ValidationError("Invalid WAV format: missing fmt chunk");
  }

  const previousContext = c.req.query("context") ?? undefined;
  const audioBlob = new Blob([audioArray], { type: "audio/wav" });

  const groqService = new GroqService(apiKeys, getGroqProxy());
  const result = await groqService.transcribeAudio(audioBlob, previousContext);

  console.log("[transcription]: success, length:", result.text.length);
  return c.json({ success: true, transcription: result });
});

// POST /api/generate
// Сгенерировать подсказку через Groq Llama с опциональным стримингом
// Query param: ?stream=false для без-стриминга (по умолчанию stream=true)
openai.post("/generate", async (c) => {
  const apiKeys = getGroqKeys();
  if (apiKeys.length === 0) {
    throw new ValidationError(
      "GROQ_API_KEYS (or GROQ_API_KEY) not configured on server",
    );
  }

  const body = await c.req.json();
  if (!body.transcript) {
    throw new ValidationError("Missing required field: transcript");
  }
  if (typeof body.transcript !== "string" || body.transcript.trim() === "") {
    throw new ValidationError("Transcript must be a non-empty string");
  }
  if (body.context !== undefined) {
    if (!Array.isArray(body.context)) {
      throw new ValidationError("Field 'context' must be an array");
    }
    for (let i = 0; i < body.context.length; i++) {
      const item = body.context[i];
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.question !== "string" ||
        typeof item.answer !== "string"
      ) {
        throw new ValidationError(
          `context[${i}] must be an object with string fields 'question' and 'answer'`,
        );
      }
    }
  }
  if (
    body.jobDescription !== undefined &&
    typeof body.jobDescription !== "string"
  ) {
    throw new ValidationError("Field 'jobDescription' must be a string");
  }
  if (body.resume !== undefined && typeof body.resume !== "string") {
    throw new ValidationError("Field 'resume' must be a string");
  }

  const validModes = [
    "general",
    "interview",
    "algorithm",
    "cheatsheet",
  ] as const;
  type Mode = (typeof validModes)[number];
  const mode: Mode = validModes.includes(body.mode) ? body.mode : "general";

  const useStreaming = c.req.query("stream") !== "false";
  const groqService = new GroqService(apiKeys, getGroqProxy());

  if (!useStreaming) {
    const response = await groqService.generateResponse(
      body.transcript,
      mode,
      body.context,
      body.jobDescription,
      body.resume,
    );
    return c.json({ success: true, response, mode, streaming: false });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of groqService.generateResponseStream(
          body.transcript,
          mode,
          body.context,
          body.jobDescription,
          body.resume,
        )) {
          const data = `data: ${JSON.stringify({ chunk })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// POST /api/detect-question
// Определить, является ли текст вопросом (быстрая Llama 8B)
openai.post("/detect-question", async (c) => {
  const apiKeys = getGroqKeys();
  if (apiKeys.length === 0) {
    throw new ValidationError(
      "GROQ_API_KEYS (or GROQ_API_KEY) not configured on server",
    );
  }

  const body = await c.req.json();
  if (!body.transcript || typeof body.transcript !== "string") {
    throw new ValidationError("Missing required field: transcript");
  }

  const groqService = new GroqService(apiKeys, getGroqProxy());
  const isQuestion = await groqService.detectQuestion(body.transcript);

  return c.json({ success: true, isQuestion, transcript: body.transcript });
});

export default openai;
