import { ApiClient } from './api-client';
import type { AssistantMode, GenerateRequest } from '@steer/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('InterviewService');

export interface GenerateOptions {
  transcript: string;
  mode: AssistantMode;
  context?: Array<{ question: string; answer: string }>;
}

export class InterviewService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
  }

  /**
   * Generate response with streaming (updates callback in real-time)
   */
  async generateResponseStream(
    options: GenerateOptions,
    onChunk: (chunk: string) => void,
    useStreaming: boolean = false
  ): Promise<string> {
    const { transcript, mode, context } = options;

    logger.info('Generating response', { mode, hasContext: !!context, streaming: useStreaming });

    try {
      const requestBody: GenerateRequest = {
        transcript,
        mode,
        context,
      };

      // Add stream query parameter
      const url = `http://localhost:3000/api/generate${useStreaming ? '?stream=true' : '?stream=false'}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response');
      }

      // Non-streaming mode
      if (!useStreaming) {
        const data = await response.json();
        const fullResponse = data.response;
        onChunk(fullResponse); // Call once with full response
        logger.info('Response generated (non-streaming)', { mode });
        return fullResponse;
      }

      // Streaming mode
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              logger.info('Streaming completed', { totalLength: fullResponse.length });
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                fullResponse += parsed.chunk;
                onChunk(fullResponse); // Update with full response so far
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      logger.info('Response generated successfully', { mode });
      return fullResponse;
    } catch (error) {
      logger.error('Failed to generate response', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate response with interview mode support (non-streaming fallback)
   */
  async generateResponse(options: GenerateOptions): Promise<string> {
    // Use streaming but collect full response
    let fullResponse = '';
    await this.generateResponseStream(options, (response) => {
      fullResponse = response;
    });
    return fullResponse;
  }

  /**
   * Transcribe audio (wrapper for existing functionality)
   */
  async transcribeAudio(audioData: Uint8Array): Promise<string> {
    // Check if audio data is empty or too small
    const MIN_WAV_SIZE = 1000; // Minimum 1KB for meaningful audio
    if (!audioData || audioData.length < MIN_WAV_SIZE) {
      throw new Error(`Audio data too small: ${audioData?.length || 0} bytes (minimum ${MIN_WAV_SIZE} bytes)`);
    }

    logger.info('Transcribing audio', { size: audioData.length });

    try {
      // Create a new Blob to avoid "Body already used" error
      // Copy the data to ensure it's a proper ArrayBuffer
      const buffer = new Uint8Array(audioData);
      const blob = new Blob([buffer], { type: 'audio/wav' });
      
      // Send raw binary data directly instead of JSON
      const response = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
        },
        body: blob,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to transcribe audio');
      }

      logger.info('Audio transcribed successfully');
      return data.transcription.text;
    } catch (error) {
      logger.error('Failed to transcribe audio', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Detect if transcript contains a question
   */
  async detectQuestion(transcript: string): Promise<boolean> {
    logger.info('Detecting question', { transcript });

    try {
      const response = await this.apiClient.post<{
        success: boolean;
        isQuestion: boolean;
        transcript: string;
      }>('/api/detect-question', { transcript });

      if (!response.success) {
        throw new Error('Failed to detect question');
      }

      logger.info('Question detection result', { isQuestion: response.isQuestion });
      return response.isQuestion;
    } catch (error) {
      logger.error('Failed to detect question', error instanceof Error ? error : new Error(String(error)));
      // В случае ошибки считаем что это вопрос (безопаснее)
      return true;
    }
  }

  /**
   * Transcribe interviewer question from microphone
   */
  async transcribeQuestion(audioData: Uint8Array): Promise<string> {
    logger.info('Transcribing interviewer question', { size: audioData.length });

    // Use same transcription logic but mark as question
    const transcript = await this.transcribeAudio(audioData);
    
    logger.info('Question transcribed', { question: transcript });
    return transcript;
  }
}
