import { Context } from 'hono';
import type { ErrorResponse } from '@steer/types';

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class AudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const errorHandler = (err: Error, c: Context) => {
  // Error logging will be handled by the logger middleware

  if (err instanceof OpenAIError) {
    return handleOpenAIError(err, c);
  }

  if (err instanceof AudioError) {
    return handleAudioError(err, c);
  }

  if (err instanceof ValidationError) {
    return handleValidationError(err, c);
  }

  return handleGenericError(err, c);
};

function handleOpenAIError(error: OpenAIError, c: Context) {
  const retryable = error.status === 429 || error.status >= 500;
  
  const response: ErrorResponse = {
    error: error.message,
    code: error.code,
    retryable,
  };

  return c.json(response, error.status);
}

function handleAudioError(error: AudioError, c: Context) {
  const response: ErrorResponse = {
    error: error.message,
    code: 'AUDIO_ERROR',
    retryable: false,
  };

  return c.json(response, 400);
}

function handleValidationError(error: ValidationError, c: Context) {
  const response: ErrorResponse = {
    error: error.message,
    code: 'VALIDATION_ERROR',
    retryable: false,
  };

  return c.json(response, 400);
}

function handleGenericError(error: Error, c: Context) {
  const response: ErrorResponse = {
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    retryable: false,
  };

  return c.json(response, 500);
}
