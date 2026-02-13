/**
 * Error Presenter Unit Tests
 *
 * TDD tests for ErrorPresenter class.
 * Tests error formatting, Zod error conversion, and HTTP status codes.
 */

import { describe, it, expect } from 'vitest';
import { ZodError, ZodIssueCode } from 'zod';
import {
  ErrorPresenter,
  ErrorCode,
  errorCodeToStatus,
  type ErrorCodeType,
} from '../../../../src/interface/presenters/error-presenter.js';

// ========================================
// Test: format method
// ========================================
describe('ErrorPresenter.format', () => {
  it('returns error response with success false', () => {
    const result = ErrorPresenter.format(ErrorCode.VALIDATION_ERROR, 'Test error');

    expect(result.success).toBe(false);
  });

  it('returns error response with correct code and message', () => {
    const result = ErrorPresenter.format(ErrorCode.NOT_FOUND, 'Resource not found');

    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Resource not found');
  });

  it('includes details when provided', () => {
    const details = [
      { field: 'email', message: 'Invalid email format' },
      { field: 'name', message: 'Name is required' },
    ];
    const result = ErrorPresenter.format(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);

    expect(result.error.details).toBeDefined();
    expect(result.error.details).toHaveLength(2);
    expect(result.error.details![0]).toEqual({ field: 'email', message: 'Invalid email format' });
    expect(result.error.details![1]).toEqual({ field: 'name', message: 'Name is required' });
  });

  it('omits details when not provided', () => {
    const result = ErrorPresenter.format(ErrorCode.INTERNAL_ERROR, 'Server error');

    expect(result.error.details).toBeUndefined();
  });

  it('omits details when empty array is provided', () => {
    const result = ErrorPresenter.format(ErrorCode.INTERNAL_ERROR, 'Server error', []);

    expect(result.error.details).toBeUndefined();
  });

  it('handles all error codes correctly', () => {
    const errorCodes: ErrorCodeType[] = [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.NOT_FOUND,
      ErrorCode.CONFLICT,
      ErrorCode.RATE_LIMITED,
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.INVALID_FORMAT,
      ErrorCode.FILE_TOO_LARGE,
      ErrorCode.UNSUPPORTED_VERSION,
    ];

    for (const code of errorCodes) {
      const result = ErrorPresenter.format(code, 'Test message');
      expect(result.error.code).toBe(code);
    }
  });
});

// ========================================
// Test: fromZodError method
// ========================================
describe('ErrorPresenter.fromZodError', () => {
  it('converts Zod error to validation error response', () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    const result = ErrorPresenter.fromZodError(zodError);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('入力値が不正です');
  });

  it('includes field path in details', () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        path: ['user', 'profile', 'name'],
        message: 'Required',
      },
    ]);

    const result = ErrorPresenter.fromZodError(zodError);

    expect(result.error.details).toBeDefined();
    expect(result.error.details![0].field).toBe('user.profile.name');
    expect(result.error.details![0].message).toBe('Required');
  });

  it('handles multiple Zod errors', () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        inclusive: true,
        type: 'string',
        path: ['title'],
        message: 'String must contain at least 1 character',
      },
      {
        code: ZodIssueCode.invalid_type,
        expected: 'number',
        received: 'string',
        path: ['price'],
        message: 'Expected number, received string',
      },
    ]);

    const result = ErrorPresenter.fromZodError(zodError);

    expect(result.error.details).toHaveLength(2);
    expect(result.error.details![0].field).toBe('title');
    expect(result.error.details![1].field).toBe('price');
  });

  it('handles empty path in Zod error', () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.custom,
        path: [],
        message: 'Invalid input',
      },
    ]);

    const result = ErrorPresenter.fromZodError(zodError);

    expect(result.error.details![0].field).toBe('');
  });
});

// ========================================
// Test: notFound method
// ========================================
describe('ErrorPresenter.notFound', () => {
  it('returns NOT_FOUND error with resource name', () => {
    const result = ErrorPresenter.notFound('User');

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Userが見つかりません');
  });

  it('handles various resource names', () => {
    const resources = ['Post', 'Comment', 'Structure', 'Notification'];

    for (const resource of resources) {
      const result = ErrorPresenter.notFound(resource);
      expect(result.error.message).toBe(`${resource}が見つかりません`);
    }
  });
});

// ========================================
// Test: unauthorized method
// ========================================
describe('ErrorPresenter.unauthorized', () => {
  it('returns UNAUTHORIZED error with default message', () => {
    const result = ErrorPresenter.unauthorized();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.message).toBe('認証が必要です');
  });

  it('returns UNAUTHORIZED error with custom message', () => {
    const result = ErrorPresenter.unauthorized('トークンが無効です');

    expect(result.error.message).toBe('トークンが無効です');
  });
});

// ========================================
// Test: forbidden method
// ========================================
describe('ErrorPresenter.forbidden', () => {
  it('returns FORBIDDEN error with default message', () => {
    const result = ErrorPresenter.forbidden();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.message).toBe('権限がありません');
  });

  it('returns FORBIDDEN error with custom message', () => {
    const result = ErrorPresenter.forbidden('この操作は管理者のみが実行できます');

    expect(result.error.message).toBe('この操作は管理者のみが実行できます');
  });
});

// ========================================
// Test: conflict method
// ========================================
describe('ErrorPresenter.conflict', () => {
  it('returns CONFLICT error with message', () => {
    const result = ErrorPresenter.conflict('このメールアドレスは既に登録されています');

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toBe('このメールアドレスは既に登録されています');
  });
});

// ========================================
// Test: rateLimited method
// ========================================
describe('ErrorPresenter.rateLimited', () => {
  it('returns RATE_LIMITED error with default message', () => {
    const result = ErrorPresenter.rateLimited();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('RATE_LIMITED');
    expect(result.error.message).toBe('投稿間隔が短すぎます。しばらくお待ちください');
  });

  it('returns RATE_LIMITED error with custom message', () => {
    const result = ErrorPresenter.rateLimited('1時間に10回までしかコメントできません');

    expect(result.error.message).toBe('1時間に10回までしかコメントできません');
  });
});

// ========================================
// Test: internal method
// ========================================
describe('ErrorPresenter.internal', () => {
  it('returns INTERNAL_ERROR error with default message', () => {
    const result = ErrorPresenter.internal();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).toBe('サーバーエラーが発生しました');
  });

  it('returns INTERNAL_ERROR error with custom message', () => {
    const result = ErrorPresenter.internal('データベース接続エラー');

    expect(result.error.message).toBe('データベース接続エラー');
  });
});

// ========================================
// Test: getStatusCode method
// ========================================
describe('ErrorPresenter.getStatusCode', () => {
  it('returns 400 for VALIDATION_ERROR', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.VALIDATION_ERROR)).toBe(400);
  });

  it('returns 401 for UNAUTHORIZED', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.UNAUTHORIZED)).toBe(401);
  });

  it('returns 403 for FORBIDDEN', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.FORBIDDEN)).toBe(403);
  });

  it('returns 404 for NOT_FOUND', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.NOT_FOUND)).toBe(404);
  });

  it('returns 409 for CONFLICT', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.CONFLICT)).toBe(409);
  });

  it('returns 429 for RATE_LIMITED', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.RATE_LIMITED)).toBe(429);
  });

  it('returns 500 for INTERNAL_ERROR', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.INTERNAL_ERROR)).toBe(500);
  });

  it('returns 400 for INVALID_FORMAT', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.INVALID_FORMAT)).toBe(400);
  });

  it('returns 413 for FILE_TOO_LARGE', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.FILE_TOO_LARGE)).toBe(413);
  });

  it('returns 400 for UNSUPPORTED_VERSION', () => {
    expect(ErrorPresenter.getStatusCode(ErrorCode.UNSUPPORTED_VERSION)).toBe(400);
  });

  it('returns 500 for unknown error code', () => {
    // Cast to bypass TypeScript for testing edge case
    const unknownCode = 'UNKNOWN_CODE' as ErrorCodeType;
    expect(ErrorPresenter.getStatusCode(unknownCode)).toBe(500);
  });
});

// ========================================
// Test: fromUsecaseError method
// ========================================
describe('ErrorPresenter.fromUsecaseError', () => {
  it('converts "not found" error to NOT_FOUND', () => {
    const error = new Error('User not found');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Userが見つかりません');
  });

  it('converts Japanese "見つかりません" error to NOT_FOUND', () => {
    const error = new Error('投稿が見つかりません');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('投稿が見つかりません');
  });

  it('converts "Not authorized" error to FORBIDDEN', () => {
    const error = new Error('Not authorized to perform this action');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.message).toBe('Not authorized to perform this action');
  });

  it('converts Japanese "権限" error to FORBIDDEN', () => {
    const error = new Error('この操作の権限がありません');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.message).toBe('この操作の権限がありません');
  });

  it('converts "already exists" error to CONFLICT', () => {
    const error = new Error('Email already exists');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toBe('Email already exists');
  });

  it('converts Japanese "既に" error to CONFLICT', () => {
    const error = new Error('このユーザー名は既に使用されています');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toBe('このユーザー名は既に使用されています');
  });

  it('converts "cannot be empty" error to VALIDATION_ERROR', () => {
    const error = new Error('Title cannot be empty');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('Title cannot be empty');
  });

  it('converts Japanese "必須" error to VALIDATION_ERROR', () => {
    const error = new Error('タイトルは必須です');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('タイトルは必須です');
  });

  it('converts unknown error to INTERNAL_ERROR', () => {
    const error = new Error('Some unexpected error');
    const result = ErrorPresenter.fromUsecaseError(error);

    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).toBe('サーバーエラーが発生しました');
  });
});

// ========================================
// Test: Error Code Constants
// ========================================
describe('ErrorCode constants', () => {
  it('defines all expected error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCode.INVALID_FORMAT).toBe('INVALID_FORMAT');
    expect(ErrorCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
    expect(ErrorCode.UNSUPPORTED_VERSION).toBe('UNSUPPORTED_VERSION');
  });
});

// ========================================
// Test: errorCodeToStatus Mapping
// ========================================
describe('errorCodeToStatus mapping', () => {
  it('maps all error codes to HTTP status codes', () => {
    expect(errorCodeToStatus[ErrorCode.VALIDATION_ERROR]).toBe(400);
    expect(errorCodeToStatus[ErrorCode.UNAUTHORIZED]).toBe(401);
    expect(errorCodeToStatus[ErrorCode.FORBIDDEN]).toBe(403);
    expect(errorCodeToStatus[ErrorCode.NOT_FOUND]).toBe(404);
    expect(errorCodeToStatus[ErrorCode.CONFLICT]).toBe(409);
    expect(errorCodeToStatus[ErrorCode.RATE_LIMITED]).toBe(429);
    expect(errorCodeToStatus[ErrorCode.INTERNAL_ERROR]).toBe(500);
    expect(errorCodeToStatus[ErrorCode.INVALID_FORMAT]).toBe(400);
    expect(errorCodeToStatus[ErrorCode.FILE_TOO_LARGE]).toBe(413);
    expect(errorCodeToStatus[ErrorCode.UNSUPPORTED_VERSION]).toBe(400);
  });
});
