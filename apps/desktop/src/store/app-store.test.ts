import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./app-store";

describe("AppStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("should initialize with default state", () => {
    const state = useAppStore.getState();
    expect(state.isCapturing).toBe(false);
    expect(state.isProcessing).toBe(false);
    expect(state.messages).toEqual([]);
  });

  it("should start capture", () => {
    useAppStore.getState().startCapture();
    expect(useAppStore.getState().isCapturing).toBe(true);
  });

  it("should add messages", () => {
    useAppStore.getState().addMessage("user", "Test message");
    const messages = useAppStore.getState().messages;

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe("user");
    expect(messages[0].content).toBe("Test message");
  });

  it("should clear messages", () => {
    useAppStore.getState().addMessage("user", "Test");
    useAppStore.getState().clearMessages();

    expect(useAppStore.getState().messages).toEqual([]);
  });

  it("should set error and stop capture", () => {
    useAppStore.getState().startCapture();
    useAppStore.getState().setError({
      error: "Test error",
      code: "TEST_ERROR",
      retryable: true,
    });

    const state = useAppStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.isCapturing).toBe(false);
  });
});
