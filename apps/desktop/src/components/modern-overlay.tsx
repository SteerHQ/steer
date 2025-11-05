import { useState, useEffect } from "react";
import "./modern-overlay.css";

interface ModernOverlayProps {
  message: string;
  visible: boolean;
  isProcessing?: boolean;
  onHide: () => void;
}

export function ModernOverlay({
  message,
  visible,
  isProcessing = false,
  onHide,
}: ModernOverlayProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);

  // Auto-hide after 15 seconds if not pinned
  useEffect(() => {
    if (visible && !isPinned && !isProcessing) {
      const timer = setTimeout(() => {
        onHide();
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [visible, isPinned, isProcessing, onHide]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".overlay-action")) {
      return; // Don't drag when clicking buttons
    }

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Parse message for better formatting
  const formatMessage = (text: string) => {
    if (!text) return null;

    // Split by bullet points or newlines
    const lines = text.split(/\n|•/).filter((line) => line.trim());

    if (lines.length === 1) {
      return <p className="overlay-text">{text}</p>;
    }

    return (
      <ul className="overlay-list">
        {lines.map((line, index) => (
          <li key={index}>{line.trim()}</li>
        ))}
      </ul>
    );
  };

  if (!visible) return null;

  return (
    <div
      className={`modern-overlay ${isDragging ? "dragging" : ""} ${
        isPinned ? "pinned" : ""
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-icon">🎯</span>
          <span>AI Assistant</span>
        </div>
        <div className="overlay-actions">
          <button
            className="overlay-action"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Открепить" : "Закрепить"}
          >
            {isPinned ? "📌" : "📍"}
          </button>
          <button
            className="overlay-action"
            onClick={onHide}
            title="Скрыть"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overlay-content">
        {isProcessing ? (
          <div className="overlay-processing">
            <div className="processing-spinner"></div>
            <p>Обработка...</p>
          </div>
        ) : (
          <>
            <div className="overlay-label">💡 Быстрый ответ:</div>
            {formatMessage(message)}
          </>
        )}
      </div>

      {/* Footer */}
      {!isProcessing && (
        <div className="overlay-footer">
          <span className="overlay-hint">
            Перетащите для перемещения • Закрепите для постоянного показа
          </span>
        </div>
      )}
    </div>
  );
}
