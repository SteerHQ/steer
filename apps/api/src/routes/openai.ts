import { Hono } from "hono";
import transcribe from "./transcribe";
import generate from "./generate";
import detectQuestion from "./detect-question";
import realtime from "./realtime";

const openai = new Hono();

// Mount sub-routes
openai.route("/transcribe", transcribe);
openai.route("/generate", generate);
openai.route("/detect-question", detectQuestion);
openai.route("/realtime", realtime);

export default openai;
