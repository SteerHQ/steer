import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { websocket } from "./ws";
import openaiRoutes from "./routes/openai";
import groqRoutes from "./routes/groq";
import { errorHandler } from "./middleware/error-handler";

// .env is loaded automatically by Bun with --env-file flag in package.json
console.log("📁 Environment variables loaded from project root");

const app = new Hono();

// CORS configuration for Tauri local communication
app.use(
  "/*",
  cors({
    origin: (origin) => origin, // Allow all origins for development
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Logger middleware
app.use("/*", logger());

// Health check endpoint
app.get("/", (c) => {
  return c.json({ message: "Voice Assistant API", status: "running" });
});

// API routes
app.route("/api", openaiRoutes);
app.route("/api/groq", groqRoutes);

// Error handling middleware (must be last)
app.onError(errorHandler);

// Verify API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in environment variables!");
  console.error("   Please create .env file in project root with:");
  console.error("   OPENAI_API_KEY=your_key_here");
} else {
  const keyPreview = process.env.OPENAI_API_KEY.substring(0, 7) + "...";
  console.log(`✅ OPENAI_API_KEY loaded: ${keyPreview}`);
}

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "⚠️  GROQ_API_KEY not found — /api/groq/* routes will return 400",
  );
} else {
  const keyPreview = process.env.GROQ_API_KEY.substring(0, 7) + "...";
  console.log(`✅ GROQ_API_KEY loaded: ${keyPreview}`);
}

// Start server
const port = process.env.PORT || 3000;
console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
