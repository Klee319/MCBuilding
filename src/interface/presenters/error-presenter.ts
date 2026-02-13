/**
 * Error Presenter
 *
 * Formats error responses for API.
 */

import { ZodError } from 'zod';
import type { ErrorResponse, ErrorDetail } from './types.js';

// ========================================
// Error Codes
// ========================================
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_FORMAT: 'INVALID_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ========================================
// HTTP Status Mapping
// ========================================
export const errorCodeToStatus: Record<ErrorCodeType, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.UNSUPPORTED_VERSION]: 400,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
};

// ========================================
// Error Presenter Class
// ========================================
export class ErrorPresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a generic error
   */
  public static format(
    code: ErrorCodeType,
    message: string,
    details?: readonly ErrorDetail[]
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
    };
  }

  /**
   * Format a Zod validation error
   */
  public static fromZodError(error: ZodError): ErrorResponse {
    const details: ErrorDetail[] = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return this.format(ErrorCode.VALIDATION_ERROR, '入力値が不正です', details);
  }

  /**
   * Format a not found error
   */
  public static notFound(resource: string): ErrorResponse {
    return this.format(ErrorCode.NOT_FOUND, `${resource}が見つかりません`);
  }

  /**
   * Format an unauthorized error
   */
  public static unauthorized(message = '認証が必要です'): ErrorResponse {
    return this.format(ErrorCode.UNAUTHORIZED, message);
  }

  /**
   * Format a forbidden error
   */
  public static forbidden(message = '権限がありません'): ErrorResponse {
    return this.format(ErrorCode.FORBIDDEN, message);
  }

  /**
   * Format a conflict error
   */
  public static conflict(message: string): ErrorResponse {
    return this.format(ErrorCode.CONFLICT, message);
  }

  /**
   * Format a rate limited error
   */
  public static rateLimited(
    message = '投稿間隔が短すぎます。しばらくお待ちください'
  ): ErrorResponse {
    return this.format(ErrorCode.RATE_LIMITED, message);
  }

  /**
   * Format an internal error
   */
  public static internal(message = 'サーバーエラーが発生しました'): ErrorResponse {
    return this.format(ErrorCode.INTERNAL_ERROR, message);
  }

  /**
   * Format invalid credentials error
   */
  public static invalidCredentials(
    message = 'メールアドレスまたはパスワードが正しくありません'
  ): ErrorResponse {
    return this.format(ErrorCode.INVALID_CREDENTIALS, message);
  }

  /**
   * Get HTTP status code for error code
   */
  public static getStatusCode(code: ErrorCodeType): number {
    return errorCodeToStatus[code] ?? 500;
  }

  /**
   * Convert usecase error to API error
   */
  public static fromUsecaseError(error: Error): ErrorResponse {
    const message = error.message;

    // Map common error messages to appropriate error codes
    if (message.includes('not found') || message.includes('見つかり')) {
      return this.notFound(message.replace(/ not found$/, '').replace(/が見つかりません$/, ''));
    }

    if (message.includes('Not authorized') || message.includes('権限')) {
      return this.forbidden(message);
    }

    if (message.includes('already') || message.includes('既に')) {
      return this.conflict(message);
    }

    if (message.includes('cannot be empty') || message.includes('必須')) {
      return this.format(ErrorCode.VALIDATION_ERROR, message);
    }

    // Default to internal error
    return this.internal();
  }
}
