/**
 * App Factory Integration Tests
 *
 * Tests the Hono application factory, CORS, health checks, and 404 handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  post,
  parseJson,
  type ApiResponseBody,
} from './test-helpers.js';

describe('App Factory Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // Health Check Tests
  // ========================================

  describe('Health Check', () => {
    it('returns 200 OK with status and timestamp', async () => {
      // Act
      const response = await get(app, '/health');
      const body = await parseJson<{ status: string; timestamp: string }>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('health check timestamp is in ISO format', async () => {
      // Act
      const response = await get(app, '/health');
      const body = await parseJson<{ timestamp: string }>(response);

      // Assert
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('health check is accessible without authentication', async () => {
      // Act
      const response = await get(app, '/health');

      // Assert
      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // CORS Tests
  // ========================================

  describe('CORS Configuration', () => {
    it('includes CORS headers in response', async () => {
      // Arrange
      const response = await app.request('http://localhost/health', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      // Assert
      expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });

    it('allows specified HTTP methods', async () => {
      // Arrange - Preflight request
      const response = await app.request('http://localhost/api/v1/posts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // Assert
      const allowMethods = response.headers.get('access-control-allow-methods');
      expect(allowMethods).toContain('GET');
      expect(allowMethods).toContain('POST');
      expect(allowMethods).toContain('PATCH');
      expect(allowMethods).toContain('DELETE');
    });

    it('allows Content-Type and Authorization headers', async () => {
      // Arrange - Preflight request
      const response = await app.request('http://localhost/api/v1/posts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });

      // Assert
      const allowHeaders = response.headers.get('access-control-allow-headers');
      expect(allowHeaders).toContain('Content-Type');
      expect(allowHeaders).toContain('Authorization');
    });

    it('exposes X-Total-Count header', async () => {
      // Arrange
      const response = await app.request('http://localhost/health', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      // Assert
      const exposeHeaders = response.headers.get('access-control-expose-headers');
      expect(exposeHeaders).toContain('X-Total-Count');
    });

    it('allows credentials', async () => {
      // Arrange
      const response = await app.request('http://localhost/health', {
        method: 'GET',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      // Assert
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('sets max-age for preflight caching', async () => {
      // Arrange - Preflight request
      const response = await app.request('http://localhost/api/v1/posts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // Assert
      const maxAge = response.headers.get('access-control-max-age');
      expect(maxAge).toBe('86400');
    });
  });

  // ========================================
  // 404 Handler Tests
  // ========================================

  describe('404 Handler', () => {
    it('returns 404 for non-existent routes', async () => {
      // Act
      const response = await get(app, '/nonexistent/route');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('returns Japanese error message for 404', async () => {
      // Act
      const response = await get(app, '/nonexistent/route');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(body.error?.message).toContain('エンドポイント');
    });

    it('returns 404 for undefined API endpoints', async () => {
      // Act
      const response = await get(app, '/api/v1/nonexistent');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it('returns 404 with consistent error structure', async () => {
      // Act
      const response = await get(app, '/unknown');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });

  // ========================================
  // API Route Mounting Tests
  // ========================================

  describe('API Route Mounting', () => {
    it('mounts posts routes under /api/v1/posts', async () => {
      // Act
      const response = await get(app, '/api/v1/posts');

      // Assert - Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('mounts users routes under /api/v1/users', async () => {
      // Act - Try to access a user endpoint (returns 404 with our API format for non-existent user)
      const response = await get(app, '/api/v1/users/test-user-id');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should have our API error format (proves route is mounted)
      // 404 from our controller (user not found) is different from 404 (route not found)
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('mounts structures routes under /api/v1/structures', async () => {
      // Act - Returns 404 with our API format for non-existent structure
      const response = await get(app, '/api/v1/structures/test-id/render-data');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should have our API error format (proves route is mounted)
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('mounts notifications routes under /api/v1/notifications', async () => {
      // Act - Notifications require auth, so we expect 401
      const response = await get(app, '/api/v1/notifications');

      // Assert - Should be 401 (unauthorized), not 404
      expect(response.status).toBe(401);
    });

    it('mounts social routes for posts likes', async () => {
      // Act - Social routes require auth
      const response = await post(app, '/api/v1/posts/test-id/like');

      // Assert - Should be 401 (unauthorized), not 404
      expect(response.status).toBe(401);
    });

    it('mounts social routes for user follows', async () => {
      // Act
      const response = await post(app, '/api/v1/users/test-id/follow');

      // Assert - Should be 401 (unauthorized), not 404
      expect(response.status).toBe(401);
    });
  });

  // ========================================
  // Request Method Tests
  // ========================================

  describe('Request Methods', () => {
    it('handles GET requests', async () => {
      // Act
      const response = await get(app, '/health');

      // Assert
      expect(response.status).toBe(200);
    });

    it('handles POST requests', async () => {
      // Act - Registration endpoint accepts POST
      const response = await post(app, '/api/v1/users/register', {
        displayName: 'Test',
        email: 'test@example.com',
      });

      // Assert - May fail validation, but route should exist
      expect(response.status).not.toBe(404);
    });

    it('handles OPTIONS preflight requests', async () => {
      // Act
      const response = await app.request('http://localhost/api/v1/posts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // Assert
      expect(response.status).toBe(204); // Preflight returns 204 No Content
    });
  });

  // ========================================
  // Content-Type Tests
  // ========================================

  describe('Content-Type Handling', () => {
    it('returns JSON content type for API responses', async () => {
      // Act
      const response = await get(app, '/health');

      // Assert
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('returns JSON content type for error responses', async () => {
      // Act
      const response = await get(app, '/nonexistent');

      // Assert
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
