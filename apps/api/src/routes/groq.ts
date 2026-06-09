import { Hono } from "hono";
import { GroqService } from "../services/groq-service";
import { ValidationError } from "../middleware/error-handler";

const groq = new Hono();

// POST /api/groq/transcribe
// Транскрибировать аудио через Groq Whisper large-v3
// Принимает raw binary WAV в теле запроса
// Query param: ?context=<предыдущий текст> — для сшивания смысла между чанками
groq.post("/transcribe", async (c) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new ValidationError("GROQ_API_KEY not configured on server");
  }

  const arrayBuffer = await c.req.arrayBuffer();

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new ValidationError("Missing audio data in request body");
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

  const previousContext = c.req.query("context") ?? undefined;
  const audioBlob = new Blob([audioArray], { type: "audio/wav" });

  const groqService = new GroqService(apiKey);
  const result = await groqService.transcribeAudio(audioBlob, previousContext);

  console.log("[Groq transcription]:", result.text);

  return c.json({ success: true, transcription: result });
});

// POST /api/groq/generate
// Сгенерировать подсказку через Groq Llama с опциональным стримингом
// Query param: ?stream=false для без-стриминга (по умолчанию stream=true)
groq.post("/generate", async (c) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new ValidationError("GROQ_API_KEY not configured on server");
  }

  const body = await c.req.json();

  if (!body.transcript) {
    throw new ValidationError("Missing required field: transcript");
  }

  if (typeof body.transcript !== "string" || body.transcript.trim() === "") {
    throw new ValidationError("Transcript must be a non-empty string");
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
  const groqService = new GroqService(apiKey);

  // Без стриминга
  if (!useStreaming) {
    const response = await groqService.generateResponse(
      body.transcript,
      mode,
      body.context,
    );
    return c.json({ success: true, response, mode, streaming: false });
  }

  // Стриминг через SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of groqService.generateResponseStream(
          body.transcript,
          mode,
          body.context,
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

// POST /api/groq/detect-question
// Определить, является ли текст вопросом (быстрая Llama 8B)
groq.post("/detect-question", async (c) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new ValidationError("GROQ_API_KEY not configured on server");
  }

  const body = await c.req.json();

  if (!body.transcript || typeof body.transcript !== "string") {
    throw new ValidationError("Missing required field: transcript");
  }

  const groqService = new GroqService(apiKey);
  const isQuestion = await groqService.detectQuestion(body.transcript);

  return c.json({ success: true, isQuestion });
});

export default groq;
