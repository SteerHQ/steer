/**
 * Overlay Window Component Tests
 *
 * Verifies:
 * - Requirement 4.2: Positioning in bottom-right corner
 * - Requirement 4.4: Auto-hide after 10 seconds
 * - Requirement 4.5: UTF-8 support for Russian text
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OverlayWindow } from "../overlay-window";

describe("OverlayWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render with message when visible", () => {
    const message = "Test message";
    const onHide = vi.fn();

    render(<OverlayWindow message={message} visible={true} onHide={onHide} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("should not render when not visible", () => {
    const message = "Test message";
    const onHide = vi.fn();

    const { container } = render(
      <OverlayWindow message={message} visible={false} onHide={onHide} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should auto-hide after default duration (10 seconds)", async () => {
    const message = "Test message";
    const onHide = vi.fn();

    render(<OverlayWindow message={message} visible={true} onHide={onHide} />);

    expect(onHide).not.toHaveBeenCalled();

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  it("should auto-hide after custom duration", async () => {
    const message = "Test message";
    const onHide = vi.fn();
    const customDuration = 5000; // 5 seconds

    render(
      <OverlayWindow
        message={message}
        visible={true}
        autoHideDuration={customDuration}
        onHide={onHide}
      />
    );

    expect(onHide).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  it("should support Russian text (UTF-8)", () => {
    const russianMessage = "Привет, это тестовое сообщение";
    const onHide = vi.fn();

    render(
      <OverlayWindow message={russianMessage} visible={true} onHide={onHide} />
    );

    expect(screen.getByText(russianMessage)).toBeInTheDocument();
  });

  it("should have correct positioning styles", () => {
    const message = "Test message";
    const onHide = vi.fn();

    const { container } = render(
      <OverlayWindow message={message} visible={true} onHide={onHide} />
    );

    const overlayElement = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(overlayElement);

    // Verify positioning
    expect(styles.position).toBe("fixed");
    expect(styles.bottom).toBe("20px");
    expect(styles.right).toBe("20px");
  });

  it("should clear timer when component unmounts", () => {
    const message = "Test message";
    const onHide = vi.fn();

    const { unmount } = render(
      <OverlayWindow message={message} visible={true} onHide={onHide} />
    );

    // Unmount before timer completes
    unmount();

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    // onHide should not be called because timer was cleared
    expect(onHide).not.toHaveBeenCalled();
  });

  it("should reset timer when visibility changes", async () => {
    const message = "Test message";
    const onHide = vi.fn();

    const { rerender } = render(
      <OverlayWindow message={message} visible={true} onHide={onHide} />
    );

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    // Hide and show again
    rerender(
      <OverlayWindow message={message} visible={false} onHide={onHide} />
    );

    rerender(
      <OverlayWindow message={message} visible={true} onHide={onHide} />
    );

    // Fast-forward another 5 seconds (total 10 seconds from start)
    vi.advanceTimersByTime(5000);

    // Should not hide yet because timer was reset
    expect(onHide).not.toHaveBeenCalled();

    // Fast-forward another 5 seconds (10 seconds from reset)
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  it("should display error styling when isError is true", () => {
    const message = "Error message";
    const onHide = vi.fn();

    const { container } = render(
      <OverlayWindow
        message={message}
        visible={true}
        isError={true}
        onHide={onHide}
      />
    );

    const overlayElement = container.firstChild as HTMLElement;

    // Check if error class is applied
    expect(overlayElement.classList.contains("error")).toBe(true);
  });

  it("should have high z-index for topmost display", () => {
    const message = "Test message";
    const onHide = vi.fn();

    const { container } = render(
      <OverlayWindow message={message} visible={true} onHide={onHide} />
    );

    const overlayElement = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(overlayElement);

    // Verify high z-index
    expect(parseInt(styles.zIndex)).toBeGreaterThanOrEqual(9999);
  });
});
