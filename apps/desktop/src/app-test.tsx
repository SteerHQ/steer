import React from "react";
import { AudioDebug } from "./components/audio-debug";
import { WindowControls } from "./components/window-controls";

/**
 * Тестовое приложение для отладки записи аудио
 * БЕЗ отправки в ChatGPT
 */
function AppTest() {
  return (
    <div className="app-container">
      <WindowControls />
      
      <div style={{ padding: "20px" }}>
        <AudioDebug />
      </div>
    </div>
  );
}

export default AppTest;
