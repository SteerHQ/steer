import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "./api-client";
import { ApiError, NetworkError } from "@steer/types";

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient("http://localhost:3000", 5000);
    vi.clearAllMocks();
  });

  it("should make successful GET request", async () => {
    const mockData = { message: "success" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await client.get("/test");
    expect(result).toEqual(mockData);
  });

  it("should make successful POST request", async () => {
    const mockData = { id: 1 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await client.post("/test", { name: "test" });
    expect(result).toEqual(mockData);
  });

  it("should throw ApiError on 4xx errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(client.get("/test")).rejects.toThrow(ApiError);
  });

  it("should retry on 5xx errors", async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    const result = await client.get("/test");
    expect(result).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  it("should throw NetworkError after max retries", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(client.get("/test")).rejects.toThrow(NetworkError);
  });
});
