/**
 * Error Middleware Integration Tests
 *
 * Tests global error handling across the HTTP layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError, z } from 'zod';
import { errorHandler } from '../../../src/infra/http/middleware/error-middleware.js';
import { PortError } from '../../../src/usecase/ports/types.js';

describe('Error Middleware Integration', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);
  });

  // ========================================
  // Zod Validation Error Tests
  // ========================================

  describe('Zod Validation Errors', () => {
    it('returns 400 with validation details for ZodError', async () => {
      // Arrange - Create ZodError directly and throw it
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0),
      });

      app.get('/validate', () => {
        // Pre-create the error for consistent testing
        try {
          schema.parse({ email: 'invalid', age: -5 });
        } catch (e) {
          throw e;
        }
        return new Response('ok');
      });

      // Act
      const response = await app.request('http://localhost/validate');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('入力値');
      expect(body.error.details).toBeDefined();
      expect(body.error.details.length).toBeGreaterThan(0);
    });

    it('includes field paths in validation error details', async () => {
      // Arrange
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      app.get('/validate', () => {
        try {
          schema.parse({ user: { email: 'not-an-email' } });
        } catch (e) {
          throw e;
        }
        return new Response('ok');
      });

      // Act
      const response = await app.request('http://localhost/validate');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'user.email',
        })
      );
    });

    it('handles missing required fields', async () => {
      // Arrange
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      app.get('/validate', () => {
        try {
          schema.parse({});
        } catch (e) {
          throw e;
        }
        return new Response('ok');
      });

      // Act
      const response = await app.request('http://localhost/validate');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details.length).toBe(2);
    });
  });

  // ========================================
  // HTTP Exception Tests
  // ========================================

  describe('HTTP Exceptions', () => {
    it('handles 400 Bad Request', async () => {
      // Arrange
      app.get('/bad-request', () => {
        throw new HTTPException(400, { message: 'Invalid request data' });
      });

      // Act
      const response = await app.request('http://localhost/bad-request');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toBe('Invalid request data');
    });

    it('handles 401 Unauthorized', async () => {
      // Arrange
      app.get('/unauthorized', () => {
        throw new HTTPException(401);
      });

      // Act
      const response = await app.request('http://localhost/unauthorized');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('認証');
    });

    it('handles 403 Forbidden', async () => {
      // Arrange
      app.get('/forbidden', () => {
        throw new HTTPException(403);
      });

      // Act
      const response = await app.request('http://localhost/forbidden');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('権限');
    });

    it('handles 404 Not Found', async () => {
      // Arrange
      app.get('/not-found', () => {
        throw new HTTPException(404, { message: 'Resource not found' });
      });

      // Act
      const response = await app.request('http://localhost/not-found');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('handles 409 Conflict', async () => {
      // Arrange
      app.get('/conflict', () => {
        throw new HTTPException(409);
      });

      // Act
      const response = await app.request('http://localhost/conflict');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('handles 429 Too Many Requests', async () => {
      // Arrange
      app.get('/rate-limited', () => {
        throw new HTTPException(429);
      });

      // Act
      const response = await app.request('http://localhost/rate-limited');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMITED');
    });
  });

  // ========================================
  // Port Error Tests
  // ========================================

  describe('Port Errors', () => {
    it('handles NOT_FOUND PortError as 404', async () => {
      // Arrange
      app.get('/port-not-found', () => {
        throw new PortError('NOT_FOUND', 'User not found');
      });

      // Act
      const response = await app.request('http://localhost/port-not-found');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('User not found');
    });

    it('handles DUPLICATE_EMAIL PortError as 409', async () => {
      // Arrange
      app.get('/duplicate', () => {
        throw new PortError('DUPLICATE_EMAIL', 'Email already registered');
      });

      // Act
      const response = await app.request('http://localhost/duplicate');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('handles UNSUPPORTED_VERSION PortError as 400', async () => {
      // Arrange
      app.get('/unsupported', () => {
        throw new PortError('UNSUPPORTED_VERSION', 'Version 1.0 is not supported');
      });

      // Act
      const response = await app.request('http://localhost/unsupported');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('UNSUPPORTED_VERSION');
    });

    it('handles INVALID_FORMAT PortError as 400', async () => {
      // Arrange
      app.get('/invalid-format', () => {
        throw new PortError('INVALID_FORMAT', 'Invalid file format');
      });

      // Act
      const response = await app.request('http://localhost/invalid-format');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_FORMAT');
    });

    it('handles STORAGE_ERROR PortError as 500', async () => {
      // Arrange
      app.get('/storage-error', () => {
        throw new PortError('STORAGE_ERROR', 'Failed to save file');
      });

      // Act
      const response = await app.request('http://localhost/storage-error');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe('STORAGE_ERROR');
    });

    it('handles SEND_FAILED PortError as 500', async () => {
      // Arrange
      app.get('/send-failed', () => {
        throw new PortError('SEND_FAILED', 'Email delivery failed');
      });

      // Act
      const response = await app.request('http://localhost/send-failed');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.error.code).toBe('SEND_FAILED');
    });
  });

  // ========================================
  // Domain Error Tests
  // ========================================

  describe('Domain Errors', () => {
    it('handles domain errors with Invalid in name as 400', async () => {
      // Arrange
      app.get('/invalid-domain', () => {
        const error = new Error('Email format is invalid');
        error.name = 'InvalidEmailError';
        throw error;
      });

      // Act
      const response = await app.request('http://localhost/invalid-domain');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('DOMAIN_ERROR');
      expect(body.error.message).toBe('Email format is invalid');
    });

    it('handles domain errors with Error in name as 400', async () => {
      // Arrange
      app.get('/domain-error', () => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        throw error;
      });

      // Act
      const response = await app.request('http://localhost/domain-error');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('DOMAIN_ERROR');
    });
  });

  // ========================================
  // Generic Error Tests
  // ========================================

  describe('Generic Errors', () => {
    it('handles unknown errors as 500', async () => {
      // Arrange
      app.get('/unknown', () => {
        const error = new Error('Something went wrong');
        error.name = 'SomeRandomThing';
        throw error;
      });

      // Act
      const response = await app.request('http://localhost/unknown');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toContain('サーバーエラー');
    });

    // Note: Tests for thrown strings/null removed.
    // Hono only passes Error instances to onError handler.
    // Non-Error throws propagate and are not caught.

    it('does not leak stack traces in production', async () => {
      // Arrange
      app.get('/leak-test', () => {
        throw new Error('Secret internal error with stack');
      });

      // Act
      const response = await app.request('http://localhost/leak-test');
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(JSON.stringify(body)).not.toContain('at ');
      expect(JSON.stringify(body)).not.toContain('Error:');
    });
  });

  // ========================================
  // Response Format Tests
  // ========================================

  describe('Response Format', () => {
    it('always returns JSON content type', async () => {
      // Arrange
      app.get('/error', () => {
        throw new Error('Test error');
      });

      // Act
      const response = await app.request('http://localhost/error');

      // Assert
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('returns consistent error response structure', async () => {
      // Arrange
      app.get('/error', () => {
        throw new HTTPException(400, { message: 'Test' });
      });

      // Act
      const response = await app.request('http://localhost/error');
      const body = await response.json();

      // Assert
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });
});
