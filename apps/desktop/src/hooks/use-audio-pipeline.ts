import { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import { InterviewService } from "../services/interview-service";
import {
  SileroVADService,
  float32ToWavBlob,
} from "../services/silero-vad-service";

export type SpeechState = "idle" | "speaking" | "paused";

interface UseAudioPipelineOptions {
  deviceSampleRateRef: React.MutableRefObject<number>;
}

export function useAudioPipeline({
  deviceSampleRateRef,
}: UseAudioPipelineOptions) {
  const {
    mode,
    setError,
    setProcessing,
    setResponse,
    addMessage,
    addToInterviewContext,
    getInterviewContext,
    getJobDescription,
  } = useAppStore();

  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");

  const interviewServiceRef = useRef<InterviewService | null>(null);
  const sileroVADRef = useRef<SileroVADService | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // RMS fallback state
  const lastVoiceTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number>(0);
  const isSpeechActiveRef = useRef<boolean>(false);

  const initServices = useCallback(() => {
    interviewServiceRef.current = new InterviewService();

    SileroVADService.create({
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      minSpeechMs: 300,
      redemptionMs: 600,
      preSpeechPadMs: 50,
    })
      .then((vad) => {
        sileroVADRef.current = vad;
        console.log("✅ Silero VAD загружен и готов");
      })
      .catch((err) => {
        console.warn(
          "⚠️ Silero VAD не загрузился, используется RMS fallback:",
          err,
        );
      });
  }, []);

  const processWithSileroVAD = async () => {
    const audioLevel = await invoke<number>("get_audio_level");
    setCurrentAudioLevel(audioLevel);

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setProcessing(true);

    try {
      const audioBuffer = await invoke<number[]>("get_audio_data");
      if (!audioBuffer || audioBuffer.length === 0) return;

      console.log(`🧠 Silero VAD: анализирую ${audioBuffer.length} байт...`);
      console.time("🧠 Silero VAD");

      const segments = await sileroVADRef.current!.processBuffer(
        audioBuffer,
        deviceSampleRateRef.current,
      );

      console.timeEnd("🧠 Silero VAD");

      if (segments.length === 0) {
        console.log("🔇 Silero VAD: речь не обнаружена");
        setSpeechState("idle");
        return;
      }

      console.log(`✅ Silero VAD: найдено ${segments.length} сегмент(ов) речи`);
      setSpeechState("speaking");

      const totalLength = segments.reduce((sum, s) => sum + s.audio.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const seg of segments) {
        merged.set(seg.audio, offset);
        offset += seg.audio.length;
      }

      const wavBlob = float32ToWavBlob(merged, 16000);
      const audioData = new Uint8Array(await wavBlob.arrayBuffer());

      setSpeechState("idle");

      await processTranscript(audioData);
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
  };

  const processWithRMSFallback = async () => {
    const audioLevel = await invoke<number>("get_audio_level");
    setCurrentAudioLevel(audioLevel);

    const savedThreshold = localStorage.getItem("voice_threshold");
    const VOICE_THRESHOLD = savedThreshold ? parseFloat(savedThreshold) : 0.02;
    const now = Date.now();

    if (audioLevel >= VOICE_THRESHOLD) {
      lastVoiceTimeRef.current = now;
      if (!isSpeechActiveRef.current) {
        console.log("🎤 Speech started (RMS)");
        isSpeechActiveRef.current = true;
        silenceStartTimeRef.current = 0;
        setSpeechState("speaking");
      }
      return;
    }

    if (isSpeechActiveRef.current) {
      if (silenceStartTimeRef.current === 0) {
        silenceStartTimeRef.current = now;
        console.log("🔇 Silence started, waiting...");
        setSpeechState("paused");
      }

      const SILENCE_DURATION = 1500;
      const silenceDuration = now - silenceStartTimeRef.current;

      if (silenceDuration < SILENCE_DURATION) {
        console.log(`⏳ Silence: ${silenceDuration}ms / ${SILENCE_DURATION}ms`);
        return;
      }

      console.log("✅ Speech ended, waiting 500ms for post-roll...");
      isSpeechActiveRef.current = false;
      silenceStartTimeRef.current = 0;
      setSpeechState("idle");

      if (isProcessingRef.current) {
        console.log("⚠️ Already processing, skipping");
        return;
      }

      isProcessingRef.current = true;
      setProcessing(true);

      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("📥 Post-roll complete, getting audio data");
    } else {
      setSpeechState("idle");
      return;
    }

    const audioBuffer = await invoke<number[]>("get_audio_data");
    if (!audioBuffer || audioBuffer.length === 0) {
      console.log("⚠️ No audio data after silence");
      return;
    }

    console.log(
      `📊 Processing ${audioBuffer.length} bytes of accumulated audio`,
    );
    console.time("⚡ PCM to WAV conversion");

    const wavData = await invoke<number[]>("convert_pcm_to_wav", {
      buffer: audioBuffer,
      sampleRate: deviceSampleRateRef.current,
    });

    console.timeEnd("⚡ PCM to WAV conversion");
    console.log("✅ WAV data ready:", wavData.length, "bytes");

    const audioData = new Uint8Array(wavData);
    await processTranscript(audioData);
  };

  const processTranscript = async (audioData: Uint8Array) => {
    const transcript =
      await interviewServiceRef.current!.transcribeAudio(audioData);
    console.log("Transcript:", transcript);

    if (!transcript.trim()) return;

    const isQuestion =
      await interviewServiceRef.current!.detectQuestion(transcript);
    console.log("Is question:", isQuestion);

    if (!isQuestion) {
      addMessage("system", `Обнаружена речь (не вопрос): "${transcript}"`);
      return;
    }

    addMessage("user", transcript);

    const context = mode === "interview" ? getInterviewContext() : undefined;
    const jobDescription =
      mode === "interview" ? getJobDescription() : undefined;
    const streamingEnabled =
      localStorage.getItem("streaming_enabled") !== "false";

    console.log(
      `⚡ Starting response generation (streaming: ${streamingEnabled})...`,
    );
    console.time("⚡ Total response time");

    const response = await interviewServiceRef.current!.generateResponseStream(
      { transcript, mode, context, jobDescription },
      (partialResponse) => {
        setResponse(partialResponse);
        addMessage("assistant", partialResponse);
      },
      streamingEnabled,
    );

    console.timeEnd("⚡ Total response time");
    console.log(
      "✅ Response generation completed, final length:",
      response.length,
    );

    setResponse(response);
    if (mode === "interview") addToInterviewContext(transcript, response);
    setError(null);
  };

  const processAudioPipeline = useCallback(async () => {
    const analysisEnabled =
      localStorage.getItem("analysis_enabled") !== "false";

    if (!analysisEnabled || !interviewServiceRef.current) {
      return;
    }

    try {
      const bufferSize = await invoke<number>("get_buffer_size");

      if (bufferSize === 0) {
        setCurrentAudioLevel(0);
        return;
      }

      if (sileroVADRef.current) {
        await processWithSileroVAD();
      } else {
        await processWithRMSFallback();
      }
    } catch (error) {
      console.error("Audio pipeline error:", error);

      if (
        error instanceof Error &&
        (error.message.includes("No audio data") ||
          error.message.includes("too small"))
      ) {
        return;
      }

      if (error instanceof Error) {
        let errorCode = "PIPELINE_ERROR";
        if (error.message.includes("API key")) errorCode = "API_ERROR";
        else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        )
          errorCode = "NETWORK_ERROR";
        else if (error.message.includes("OpenAI")) errorCode = "OPENAI_ERROR";

        setError({ error: error.message, code: errorCode, retryable: true });
      }
    } finally {
      isProcessingRef.current = false;
      setProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    setError,
    setProcessing,
    setResponse,
    addMessage,
    addToInterviewContext,
    getInterviewContext,
    getJobDescription,
  ]);

  return {
    currentAudioLevel,
    speechState,
    interviewServiceRef,
    processAudioPipeline,
    initServices,
  };
}
