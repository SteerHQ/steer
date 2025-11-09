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
   * Generate response with interview mode support
   */
  async generateResponse(options: GenerateOptions): Promise<string> {
    const { transcript, mode, context } = options;

    logger.info('Generating response', { mode, hasContext: !!context });

    try {
      const requestBody: GenerateRequest = {
        transcript,
        mode,
        context,
      };

      const response = await this.apiClient.post<{
        success: boolean;
        response: string;
        mode: AssistantMode;
      }>('/api/generate', requestBody);

      if (!response.success) {
        throw new Error('Failed to generate response');
      }

      logger.info('Response generated successfully', { mode: response.mode });
      return response.response;
    } catch (error) {
      logger.error('Failed to generate response', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Transcribe audio (wrapper for existing functionality)
   */
  async transcribeAudio(audioData: Uint8Array): Promise<string> {
    logger.info('Transcribing audio');

    try {
      // Send raw binary data directly instead of JSON
      const response = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
        },
        body: audioData as unknown as BodyInit,
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
}
