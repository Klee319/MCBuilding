/**
 * Error Handling Middleware
 *
 * Global error handler for the application.
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { PortError } from '../../../usecase/ports/types.js';

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/**
 * Map error to HTTP status and response
 */
export function errorHandler(err: unknown, c: Context): Response {
  // Handle non-Error throws (string, null, undefined, etc.)
  if (!(err instanceof Error)) {
    // Don't log non-Error types to avoid test environment issues
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました',
      },
    };
    return c.json(response, 500 as const);
  }

  // Log errors in a safe way (avoid issues with complex error objects in test environments)
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err.message);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力値が不正です',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    };
    return c.json(response, 400 as const);
  }

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: getCodeFromStatus(err.status),
        message: err.message || getMessageFromStatus(err.status),
      },
    };
    return c.json(response, err.status);
  }

  // Handle Port errors from infrastructure
  if (err instanceof PortError) {
    const status = getStatusFromPortError(err.code) as 400 | 404 | 409 | 500;
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    return c.json(response, status);
  }

  // Handle domain-specific errors (custom error classes with "Invalid" prefix)
  // Exclude generic "Error" name to avoid catching all errors as domain errors
  if (err.name !== 'Error' && (err.name.includes('Invalid') || err.name.endsWith('Error'))) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'DOMAIN_ERROR',
        message: err.message,
      },
    };
    return c.json(response, 400 as const);
  }

  // Generic server error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました',
    },
  };
  return c.json(response, 500 as const);
}

function getCodeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function getMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'リクエストが不正です';
    case 401:
      return '認証が必要です';
    case 403:
      return '権限がありません';
    case 404:
      return 'リソースが見つかりません';
    case 409:
      return '競合が発生しました';
    case 429:
      return 'リクエストが多すぎます';
    default:
      return 'サーバーエラーが発生しました';
  }
}

function getStatusFromPortError(code: string): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'DUPLICATE_EMAIL':
      return 409;
    case 'UNSUPPORTED_VERSION':
    case 'INVALID_FORMAT':
    case 'PARSE_ERROR':
      return 400;
    case 'SEND_FAILED':
    case 'GENERATION_FAILED':
    case 'CONVERSION_FAILED':
    case 'FETCH_FAILED':
    case 'STORAGE_ERROR':
      return 500;
    default:
      return 500;
  }
}
