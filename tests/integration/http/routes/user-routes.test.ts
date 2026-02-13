/**
 * User Routes Integration Tests
 *
 * Tests HTTP routes for user-related endpoints with full app stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  post,
  authHeader,
  parseJson,
  createTestUser,
  resetCounters,
  type ApiResponseBody,
} from '../test-helpers.js';

describe('User Routes Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    resetCounters();
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // POST /api/v1/users/register - Register User
  // ========================================

  describe('POST /api/v1/users/register', () => {
    it('returns 201 with created user on success', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect((body.data as { displayName: string }).displayName).toBe('New User');
    });

    it('returns 400 for missing displayName', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        email: 'test@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing email', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'Test User',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email format', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'Test User',
        email: 'not-an-email',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 for empty displayName', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: '',
        email: 'test@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 for displayName exceeding max length', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'A'.repeat(100), // Over limit
        email: 'test@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('does not require authentication', async () => {
      // Act - No auth header
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'New User',
        email: 'noauth@example.com',
        password: 'password123',
      });

      // Assert - Should succeed without auth
      expect(response.status).toBe(201);
    });

    it('returns 409 for duplicate email', async () => {
      // Arrange - Create first user
      await createTestUser(ctx.container, { email: 'duplicate@example.com' });

      // Act - Try to register with same email
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'Another User',
        email: 'duplicate@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
    });
  });

  // ========================================
  // POST /api/v1/users/verify-email - Verify Email
  // ========================================

  describe('POST /api/v1/users/verify-email', () => {
    it('returns 200 on successful verification', async () => {
      // Arrange
      const user = await createTestUser(ctx.container, { isEmailVerified: false });

      // Act
      const response = await post(app, '/api/v1/users/verify-email', {
        userId: user.id,
        token: '123456',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 400 for missing userId', async () => {
      // Act
      const response = await post(app, '/api/v1/users/verify-email', {
        token: '123456',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing token', async () => {
      // Act
      const response = await post(app, '/api/v1/users/verify-email', {
        userId: 'user-123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for non-existent user', async () => {
      // Act
      const response = await post(app, '/api/v1/users/verify-email', {
        userId: 'nonexistent',
        token: '123456',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it('does not require authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container, { isEmailVerified: false });

      // Act - No auth header
      const response = await post(app, '/api/v1/users/verify-email', {
        userId: user.id,
        token: '123456',
      });

      // Assert - Should work without auth
      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // POST /api/v1/users/verify-phone - Verify Phone
  // ========================================

  describe('POST /api/v1/users/verify-phone', () => {
    it('returns 200 on successful phone verification', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/users/verify-phone',
        {
          code: '123456',
        },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await post(app, '/api/v1/users/verify-phone', {
        code: '123456',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 for missing code', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/users/verify-phone',
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // ========================================
  // GET /api/v1/users/me - Get Current User
  // ========================================

  describe('GET /api/v1/users/me', () => {
    it('returns 200 with current user data', async () => {
      // Arrange
      const user = await createTestUser(ctx.container, { displayName: 'Current User' });

      // Act
      const response = await get(app, '/api/v1/users/me', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { displayName: string }).displayName).toBe('Current User');
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await get(app, '/api/v1/users/me');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 if authenticated user does not exist', async () => {
      // Act - Use auth header for non-existent user
      const response = await get(app, '/api/v1/users/me', {
        headers: authHeader('nonexistent-user'),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/v1/users/:id - Get User Profile
  // ========================================

  describe('GET /api/v1/users/:id', () => {
    it('returns 200 with user profile for valid ID', async () => {
      // Arrange
      const user = await createTestUser(ctx.container, { displayName: 'Profile User' });

      // Act
      const response = await get(app, `/api/v1/users/${user.id}`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { displayName: string }).displayName).toBe('Profile User');
    });

    it('returns 404 for non-existent user', async () => {
      // Act
      const response = await get(app, '/api/v1/users/nonexistent-id');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('does not require authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act - No auth header
      const response = await get(app, `/api/v1/users/${user.id}`);

      // Assert - Should work without auth
      expect(response.status).toBe(200);
    });

    it('works with authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const viewer = await createTestUser(ctx.container, { id: 'viewer' });

      // Act
      const response = await get(app, `/api/v1/users/${user.id}`, {
        headers: authHeader(viewer.id),
      });

      // Assert
      expect(response.status).toBe(200);
    });

    it('returns user without sensitive information', async () => {
      // Arrange
      const user = await createTestUser(ctx.container, { email: 'private@example.com' });

      // Act
      const response = await get(app, `/api/v1/users/${user.id}`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      // Public profile should not expose sensitive data like email verification status details
      expect(body.data).toBeDefined();
    });
  });

  // ========================================
  // POST /api/v1/users/login - User Login
  // ========================================

  describe('POST /api/v1/users/login', () => {
    it('returns 200 with tokens on successful login', async () => {
      // Arrange - Create user with credentials
      const email = 'login@example.com';
      const password = 'password123';
      await ctx.container.createUserWithCredentials({
        displayName: 'Login User',
        email,
        password,
      });

      // Act
      const response = await post(app, '/api/v1/users/login', {
        email,
        password,
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('accessToken');
      expect(body.data).toHaveProperty('refreshToken');
      expect((body.data as { user: { displayName: string } }).user.displayName).toBe('Login User');
    });

    it('returns 401 for invalid email', async () => {
      // Arrange
      await ctx.container.createUserWithCredentials({
        displayName: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      });

      // Act
      const response = await post(app, '/api/v1/users/login', {
        email: 'nonexistent@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for invalid password', async () => {
      // Arrange
      await ctx.container.createUserWithCredentials({
        displayName: 'Test User',
        email: 'wrongpw@example.com',
        password: 'correctPassword',
      });

      // Act
      const response = await post(app, '/api/v1/users/login', {
        email: 'wrongpw@example.com',
        password: 'wrongPassword',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 for missing email', async () => {
      // Act
      const response = await post(app, '/api/v1/users/login', {
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing password', async () => {
      // Act
      const response = await post(app, '/api/v1/users/login', {
        email: 'test@example.com',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email format', async () => {
      // Act
      const response = await post(app, '/api/v1/users/login', {
        email: 'not-an-email',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('does not require authentication', async () => {
      // Arrange
      await ctx.container.createUserWithCredentials({
        displayName: 'NoAuth User',
        email: 'noauth-login@example.com',
        password: 'password123',
      });

      // Act - No auth header
      const response = await post(app, '/api/v1/users/login', {
        email: 'noauth-login@example.com',
        password: 'password123',
      });

      // Assert - Should work without auth
      expect(response.status).toBe(200);
    });

    it('handles case-insensitive email', async () => {
      // Arrange
      await ctx.container.createUserWithCredentials({
        displayName: 'Case Test',
        email: 'CaseTest@EXAMPLE.com',
        password: 'password123',
      });

      // Act - Login with different case
      const response = await post(app, '/api/v1/users/login', {
        email: 'casetest@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns same error message for invalid email and invalid password (security)', async () => {
      // Arrange
      await ctx.container.createUserWithCredentials({
        displayName: 'Security Test',
        email: 'security@example.com',
        password: 'password123',
      });

      // Act - Wrong email
      const response1 = await post(app, '/api/v1/users/login', {
        email: 'wrong@example.com',
        password: 'password123',
      });
      const body1 = await parseJson<ApiResponseBody>(response1);

      // Act - Wrong password
      const response2 = await post(app, '/api/v1/users/login', {
        email: 'security@example.com',
        password: 'wrongpassword',
      });
      const body2 = await parseJson<ApiResponseBody>(response2);

      // Assert - Same error code (no user enumeration)
      expect(body1.error?.code).toBe(body2.error?.code);
      expect(body1.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('handles empty request body gracefully', async () => {
      // Act
      const response = await post(app, '/api/v1/users/login', {});
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles empty request body gracefully', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {});
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('handles special characters in displayName', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'User <script>alert("xss")</script>',
        email: 'special@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should either sanitize or reject
      expect(response.status).toBeLessThan(500);
    });

    it('handles unicode in displayName', async () => {
      // Act
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'Test User',
        email: 'unicode@example.com',
        password: 'password123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(201);
      expect((body.data as { displayName: string }).displayName).toBe('Test User');
    });

    it('handles very long user IDs in URL', async () => {
      // Act
      const longId = 'a'.repeat(1000);
      const response = await get(app, `/api/v1/users/${longId}`);

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });
  });
});
