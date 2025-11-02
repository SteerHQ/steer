import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { errorHandler } from "./error-handler";

describe("errorHandler", () => {
  it("should handle standard errors", async () => {
    const app = new Hono();
    app.onError(errorHandler);

    app.get("/test", () => {
      throw new Error("Test error");
    });

    const res = await app.request("/test");
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toHaveProperty("error");
    expect(json.error).toBe("Test error");
  });

  it("should handle HTTP errors with status codes", async () => {
    const app = new Hono();
    app.onError(errorHandler);

    app.get("/test", () => {
      const error = new Error("Not found");
      (error as any).status = 404;
      throw error;
    });

    const res = await app.request("/test");
    expect(res.status).toBe(404);
  });
});
