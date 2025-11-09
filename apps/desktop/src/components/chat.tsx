import React, { useEffect, useRef } from "react";
import "./chat.css";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatProps {
  messages: ChatMessage[];
  isProcessing?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, isProcessing }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>История разговора</h3>
        {messages.length > 0 && (
          <span className="message-count">{messages.length} сообщений</span>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <p>Начните говорить, и здесь появятся ваши сообщения</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${
                message.type === "user" ? "user-message" : "assistant-message"
              }`}
            >
              <div className="message-header">
                <span className="message-sender">
                  {message.type === "user" ? "❓ Вопрос интервьюера" : "✅ Готовый ответ"}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}

        {isProcessing && (
          <div className="chat-message assistant-message processing">
            <div className="message-header">
              <span className="message-sender">🤖 Ассистент</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
