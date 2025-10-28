import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const WindowControls: React.FC = () => {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleClose = () => {
    appWindow.close();
  };

  return (
    <div
      data-tauri-drag-region
      className="window-controls"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 10px",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        cursor: "move",
      }}
    >
      <div style={{ fontSize: "12px", color: "#fff", userSelect: "none" }}>
        Voice Assistant
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleMinimize}
          style={{
            width: "20px",
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
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
          }
        >
          −
        </button>
        <button
          onClick={handleClose}
          style={{
            width: "20px",
            height: "20px",
            border: "none",
            borderRadius: "3px",
            backgroundColor: "rgba(255, 0, 0, 0.6)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 0, 0, 0.8)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 0, 0, 0.6)")
          }
        >
          ×
        </button>
      </div>
    </div>
  );
};
