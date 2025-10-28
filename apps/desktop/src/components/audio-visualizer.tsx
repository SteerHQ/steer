import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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

    // Poll audio level every 50ms for smooth animation
    const interval = setInterval(async () => {
      try {
        const level = await invoke<number>("get_audio_level");
        setAudioLevel(level);
      } catch (error) {
        console.error("Failed to get audio level:", error);
        setAudioLevel(0);
      }
    }, 50);

    return () => clearInterval(interval);
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
