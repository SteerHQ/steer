import { Hono } from "hono";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { upgradeWebSocket } from "../ws";

const OPENAI_REALTIME_URL =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

const realtime = new Hono();

/**
 * GET /api/realtime
 * WebSocket-прокси к OpenAI Realtime API.
 * API-ключ остаётся на сервере — клиент (desktop) его не видит.
 *
 * Протокол:
 *  - Клиент отправляет JSON-события OpenAI Realtime формата (session.update,
 *    input_audio_buffer.append, response.create, и т.д.)
 *  - Сервер проксирует их в OpenAI и возвращает ответные события обратно.
 *  - Аудио передаётся как base64 внутри input_audio_buffer.append.
 */
realtime.get(
  "/",
  upgradeWebSocket((_c) => {
    const apiKey = process.env.OPENAI_API_KEY;

    let openaiWs: WebSocket | null = null;
    let clientWs: WSContext | null = null;

    // Буфер событий до открытия соединения с OpenAI
    const pendingMessages: string[] = [];

    function connectToOpenAI(ws: WSContext) {
      if (!apiKey) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: {
              code: "NO_API_KEY",
              message: "Server API key not configured",
            },
          })
        );
        ws.close();
        return;
      }

      openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        // @ts-ignore — Bun поддерживает headers в WebSocket constructor
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      } as unknown as string[]);

      openaiWs.onopen = () => {
        console.log("[realtime] Connected to OpenAI Realtime API");
        // Сбрасываем буфер
        for (const msg of pendingMessages) {
          openaiWs!.send(msg);
        }
        pendingMessages.length = 0;
      };

      openaiWs.onmessage = (event: MessageEvent) => {
        // Проксируем событие от OpenAI клиенту
        if (clientWs) {
          try {
            clientWs.send(
              typeof event.data === "string"
                ? event.data
                : JSON.stringify(event.data)
            );
          } catch {
            // клиент уже отключился
          }
        }
      };

      openaiWs.onerror = (event: Event) => {
        console.error("[realtime] OpenAI WebSocket error:", event);
        if (clientWs) {
          try {
            clientWs.send(
              JSON.stringify({
                type: "error",
                error: {
                  code: "OPENAI_WS_ERROR",
                  message: "OpenAI connection error",
                },
              })
            );
          } catch {
            // ignore
          }
        }
      };

      openaiWs.onclose = (event: CloseEvent) => {
        console.log(
          `[realtime] OpenAI connection closed: ${event.code} ${event.reason}`
        );
        if (clientWs) {
          try {
            clientWs.close();
          } catch {
            // ignore
          }
        }
      };
    }

    return {
      onOpen(_event: Event, ws: WSContext) {
        clientWs = ws;
        console.log("[realtime] Client connected");
        connectToOpenAI(ws);
      },

      onMessage(event: MessageEvent<WSMessageReceive>, _ws: WSContext) {
        const data =
          typeof event.data === "string"
            ? event.data
            : JSON.stringify(event.data);

        if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
          // OpenAI ещё не подключён — буферизуем
          pendingMessages.push(data);
          return;
        }

        openaiWs.send(data);
      },

      onClose(_event: Event) {
        console.log("[realtime] Client disconnected");
        clientWs = null;
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }
        openaiWs = null;
      },

      onError(event: Event) {
        console.error("[realtime] Client WebSocket error:", event);
      },
    };
  })
);

export default realtime;
