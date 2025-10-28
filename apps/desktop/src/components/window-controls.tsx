import React, { useState, useEffect } from "react";
import { Window } from "@tauri-apps/api/window";

export const WindowControls: React.FC = () => {
  const [appWindow] = useState(() => Window.getCurrent());
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, [appWindow]);

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
      console.log("Window minimized");
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
      console.log("Window maximized:", maximized);
    } catch (error) {
      console.error("Failed to maximize:", error);
    }
  };

  const handleClose = async () => {
    try {
      console.log("Attempting to close window...");
      await appWindow.close();
      console.log("Window closed");
    } catch (error) {
      console.error("Failed to close:", error);
      try {
        await appWindow.destroy();
        console.log("Window destroyed");
      } catch (destroyError) {
        console.error("Failed to destroy:", destroyError);
      }
    }
  };

  const buttonStyle: React.CSSProperties = {
    width: "30px",
    height: "20px",
    border: "none",
    borderRadius: "3px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  };

  return (
    <div
      className="window-controls"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(30, 30, 30, 0.95)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Drag region - занимает всё пространство кроме кнопок */}
      <div
        data-tauri-drag-region
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 120,
          bottom: 0,
          cursor: "move",
        }}
      />

      {/* Title */}
      <div
        style={{
          fontSize: "13px",
          color: "#fff",
          userSelect: "none",
          fontWeight: 500,
          paddingLeft: "10px",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        Voice Assistant
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          paddingRight: "10px",
          zIndex: 2,
        }}
      >
        <button
          onClick={handleMinimize}
          style={buttonStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
          }
          title="Свернуть"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line
              x1="0"
              y1="6"
              x2="12"
              y2="6"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          style={buttonStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
          }
          title={isMaximized ? "Восстановить" : "Развернуть"}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect
                x="2"
                y="2"
                width="8"
                height="8"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
              <rect
                x="3"
                y="1"
                width="8"
                height="8"
                stroke="white"
                strokeWidth="1.5"
                fill="rgba(30, 30, 30, 0.95)"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect
                x="1"
                y="1"
                width="10"
                height="10"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          style={{
            ...buttonStyle,
            backgroundColor: "rgba(220, 53, 69, 0.8)",
            width: "32px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(220, 53, 69, 1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(220, 53, 69, 0.8)")
          }
          title="Закрыть"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line
              x1="2"
              y1="2"
              x2="12"
              y2="12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="2"
              x2="2"
              y2="12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
