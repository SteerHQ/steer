import { useState, useEffect } from "react";
import "./push-to-talk.css";

interface PushToTalkProps {
  onSpeakingChange: (isSpeaking: boolean) => void;
  disabled?: boolean;
}

export const PushToTalk: React.FC<PushToTalkProps> = ({
  onSpeakingChange,
  disabled = false,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingDuration, setDuration] = useState(0);

  // Timer for speaking duration
  useEffect(() => {
    let interval: number | null = null;
    
    if (isSpeaking) {
      interval = window.setInterval(() => {
        setDuration((prev) => prev + 0.1);
      }, 100);
    } else {
      setDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeaking]);

  const toggleSpeaking = () => {
    if (disabled) return;
    
    const newState = !isSpeaking;
    setIsSpeaking(newState);
    onSpeakingChange(newState);
    
    console.log(newState ? "Candidate is speaking (pausing processing)" : "Listening for questions");
  };

  // Keyboard shortcuts (SPACE key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !disabled) {
        e.preventDefault();
        if (!isSpeaking) {
          setIsSpeaking(true);
          onSpeakingChange(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !disabled) {
        e.preventDefault();
        if (isSpeaking) {
          setIsSpeaking(false);
          onSpeakingChange(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpeaking, disabled, onSpeakingChange]);

  return (
    <div className="ptt-container">
      <button
        className={`ptt-button ${isSpeaking ? "speaking" : "listening"} ${disabled ? "disabled" : ""}`}
        onClick={toggleSpeaking}
        disabled={disabled}
        title={isSpeaking ? "Нажмите когда закончите отвечать" : "Нажмите когда начнете отвечать (или зажмите SPACE)"}
      >
        <span className="ptt-icon">{isSpeaking ? "⏸️" : "🔴"}</span>
        <span className="ptt-text">
          {isSpeaking
            ? `Я отвечаю... ${speakingDuration.toFixed(1)}s`
            : "Слушаю вопросы"}
        </span>
      </button>
      
      <div className="ptt-hint">
        {isSpeaking ? (
          <>Отпустите <kbd>SPACE</kbd> когда закончите</>
        ) : (
          <>Зажмите <kbd>SPACE</kbd> когда отвечаете</>
        )}
      </div>

      <div className="ptt-status">
        {isSpeaking ? (
          <span className="status-paused">⏸️ Обработка приостановлена</span>
        ) : (
          <span className="status-active">🎧 Слушаю вопросы интервьюера</span>
        )}
      </div>
    </div>
  );
};
