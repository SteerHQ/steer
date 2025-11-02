import { ApiClient } from './api-client';
import type { AssistantMode, GenerateRequest } from '@steer/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('InterviewService');

export interface GenerateOptions {
  transcript: string;
  mode: AssistantMode;
  context?: Array<{ question: string; answer: string }>;
  apiKey: string;
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
    const { transcript, mode, context, apiKey } = options;

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
      }>(
        '/api/generate',
        requestBody,
        {
          Authorization: `Bearer ${apiKey}`,
        }
      );

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
  async transcribeAudio(audioData: Uint8Array, apiKey: string): Promise<string> {
    logger.info('Transcribing audio');

    try {
      const response = await this.apiClient.post<{
        success: boolean;
        transcription: {
          text: string;
          language: string;
          duration: number;
        };
      }>(
        '/api/transcribe',
        { audio: Array.from(audioData) },
        {
          Authorization: `Bearer ${apiKey}`,
        }
      );

      if (!response.success) {
        throw new Error('Failed to transcribe audio');
      }

      logger.info('Audio transcribed successfully');
      return response.transcription.text;
    } catch (error) {
      logger.error('Failed to transcribe audio', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
