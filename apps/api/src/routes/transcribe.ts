import { Hono } from "hono";
import { OpenAIService } from "../services/openai-service";
import { ValidationError } from "../middleware/error-handler";

const transcribe = new Hono();

// POST /api/transcribe
// Transcribe audio using OpenAI gpt-4o-transcribe model
// Requirements: 2.3
// Accepts raw binary WAV data in request body (Content-Type: audio/wav or application/octet-stream)
transcribe.post("/", async (c) => {
  try {
    // Get API key from environment only (server-side)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ValidationError("Server API key not configured");
    }

    // Get raw binary data from request body
    const arrayBuffer = await c.req.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new ValidationError("Missing audio data in request body");
    }

    // Convert to Uint8Array for validation
    const audioArray = new Uint8Array(arrayBuffer);

    // Validate WAV format
    if (audioArray.length < 44) {
      throw new ValidationError(
        "Invalid audio data: file too small to be a valid WAV"
      );
    }

    // Check RIFF header (bytes 0-3 should be "RIFF")
    const riffHeader = String.fromCharCode(...audioArray.slice(0, 4));
    if (riffHeader !== "RIFF") {
      throw new ValidationError("Invalid audio format: missing RIFF header");
    }

    // Check WAVE format (bytes 8-11 should be "WAVE")
    const waveFormat = String.fromCharCode(...audioArray.slice(8, 12));
    if (waveFormat !== "WAVE") {
      throw new ValidationError("Invalid audio format: not a WAV file");
    }

    // Check fmt chunk (bytes 12-15 should be "fmt ")
    const fmtChunk = String.fromCharCode(...audioArray.slice(12, 16));
    if (fmtChunk !== "fmt ") {
      throw new ValidationError("Invalid WAV format: missing fmt chunk");
    }

    const audioBlob = new Blob([audioArray], { type: "audio/wav" });

    // Create OpenAI service instance
    const openaiService = new OpenAIService(apiKey);

    // Transcribe audio
    const result = await openaiService.transcribeAudio(audioBlob);
    console.log(result);
    return c.json({
      success: true,
      transcription: result,
    });
  } catch (error) {
    // Let error handler middleware handle the error
    console.log(error);
    throw error;
  }
});

export default transcribe;
