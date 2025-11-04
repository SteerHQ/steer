import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import AppTest from "./app-test";
import "./index.css";

// Проверяем переменную окружения или localStorage для режима тестирования
const isTestMode = 
  import.meta.env.VITE_TEST_MODE === "true" || 
  localStorage.getItem("test_mode") === "true";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isTestMode ? <AppTest /> : <App />}
  </React.StrictMode>
);
