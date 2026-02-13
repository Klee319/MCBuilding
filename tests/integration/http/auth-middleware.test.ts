/**
 * Auth Middleware Integration Tests
 *
 * Tests JWT authentication middleware behavior across the HTTP layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  type JwtService,
} from '../../../src/infra/http/middleware/auth-middleware.js';
import { MockJwtService } from '../../../src/infra/http/services/simple-jwt-service.js';

describe('Auth Middleware Integration', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new MockJwtService();
  });

  // ========================================
  // createAuthMiddleware Tests
  // ========================================

  describe('createAuthMiddleware', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      const authRequired = createAuthMiddleware(jwtService);

      app.use('/protected/*', authRequired);
      app.get('/protected/resource', (c) => {
        const user = c.get('user');
        return c.json({ success: true, data: { userId: user.id, email: user.email } });
      });

      app.get('/public/resource', (c) => {
        return c.json({ success: true, data: { message: 'public' } });
      });
    });

    it('allows access with valid Bearer token', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Bearer test-token-user-123',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe('user-123');
      expect(body.data.email).toBe('user-123@test.com');
    });

    it('returns 401 when no Authorization header provided', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource');

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('認証');
    });

    it('returns 401 when Authorization header is not Bearer type', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNz',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when token is invalid', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Bearer invalid-token-format',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('無効');
    });

    it('returns 401 when Bearer prefix is present but token is empty', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Bearer ',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it('allows access to non-protected routes without auth', async () => {
      // Arrange
      const request = new Request('http://localhost/public/resource');

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('public');
    });
  });

  // ========================================
  // createOptionalAuthMiddleware Tests
  // ========================================

  describe('createOptionalAuthMiddleware', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      const authOptional = createOptionalAuthMiddleware(jwtService);

      app.use('/optional/*', authOptional);
      app.get('/optional/resource', (c) => {
        const user = c.get('user');
        if (user) {
          return c.json({
            success: true,
            data: { authenticated: true, userId: user.id },
          });
        }
        return c.json({
          success: true,
          data: { authenticated: false },
        });
      });
    });

    it('sets user when valid token is provided', async () => {
      // Arrange
      const request = new Request('http://localhost/optional/resource', {
        headers: {
          Authorization: 'Bearer test-token-user-456',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.authenticated).toBe(true);
      expect(body.data.userId).toBe('user-456');
    });

    it('allows access without authentication', async () => {
      // Arrange
      const request = new Request('http://localhost/optional/resource');

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.authenticated).toBe(false);
    });

    it('allows access with invalid token but does not set user', async () => {
      // Arrange
      const request = new Request('http://localhost/optional/resource', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.authenticated).toBe(false);
    });

    it('allows access with malformed Authorization header', async () => {
      // Arrange
      const request = new Request('http://localhost/optional/resource', {
        headers: {
          Authorization: 'NotBearer token',
        },
      });

      // Act
      const response = await app.request(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.authenticated).toBe(false);
    });
  });

  // ========================================
  // Token Format Edge Cases
  // ========================================

  describe('Token Format Edge Cases', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      const authRequired = createAuthMiddleware(jwtService);
      app.use('/protected/*', authRequired);
      app.get('/protected/resource', (c) => {
        return c.json({ success: true });
      });
    });

    it('handles token with special characters in user ID', async () => {
      // Arrange - MockJwtService accepts "test-token-{userId}"
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Bearer test-token-user_with-special.chars',
        },
      });

      // Act
      const response = await app.request(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('handles very long user ID', async () => {
      // Arrange
      const longUserId = 'a'.repeat(100);
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: `Bearer test-token-${longUserId}`,
        },
      });

      // Act
      const response = await app.request(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('handles Authorization header with extra whitespace', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'Bearer  test-token-user-123', // Extra space
        },
      });

      // Act
      const response = await app.request(request);

      // Assert - Should fail because token starts with space
      expect(response.status).toBe(401);
    });

    it('handles case-sensitive Bearer keyword', async () => {
      // Arrange
      const request = new Request('http://localhost/protected/resource', {
        headers: {
          Authorization: 'bearer test-token-user-123', // lowercase
        },
      });

      // Act
      const response = await app.request(request);

      // Assert - Bearer is case-sensitive
      expect(response.status).toBe(401);
    });
  });
});
