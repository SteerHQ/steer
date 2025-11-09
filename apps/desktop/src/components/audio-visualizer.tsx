import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./audio-visualizer.css";

interface AudioVisualizerProps {
  isActive: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setAudioLevel(0);
      return;
    }

    // Start event emitter in Rust
    invoke("start_audio_level_emitter").catch((error) => {
      console.error("Failed to start audio level emitter:", error);
    });

    // Listen for audio level events (push model instead of polling)
    const unlisten = listen<number>("audio-level", (event) => {
      setAudioLevel(event.payload);
    });

    return () => {
      // Stop event emitter
      invoke("stop_audio_level_emitter").catch((error) => {
        console.error("Failed to stop audio level emitter:", error);
      });
      
      // Unlisten from events
      unlisten.then((fn) => fn());
    };
  }, [isActive]);

  // Generate bars with center emphasis
  const barCount = 30;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
    const baseHeight = audioLevel * (1 - centerDistance * 0.4);
    const randomVariation = Math.random() * 0.15;
    const height = Math.max(0.05, baseHeight + randomVariation * audioLevel);
    return height;
  });

  return (
    <div className="audio-visualizer">
      <div className="visualizer-bars">
        {bars.map((height, index) => (
          <div
            key={index}
            className="visualizer-bar"
            style={{
              height: `${height * 100}%`,
              opacity: isActive ? 1 : 0.2,
              animationDelay: `${index * 0.02}s`,
            }}
          />
        ))}
      </div>
      {isActive && audioLevel > 0.1 && <div className="audio-pulse" />}
    </div>
  );
};
