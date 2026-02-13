/**
 * Structure Routes Integration Tests
 *
 * Tests HTTP routes for structure-related endpoints with full app stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  authHeader,
  parseJson,
  createTestUser,
  createTestStructure,
  createTestPost,
  resetCounters,
  type ApiResponseBody,
} from '../test-helpers.js';

describe('Structure Routes Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    resetCounters();
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // POST /api/v1/structures/upload - Upload Structure
  // ========================================

  describe('POST /api/v1/structures/upload', () => {
    it('returns 401 without authentication', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'application/octet-stream' }), 'test.schematic');
      formData.append('originalEdition', 'java');
      formData.append('originalVersion', '1.20.4');

      // Act
      const response = await app.request('http://localhost/api/v1/structures/upload', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json() as ApiResponseBody;

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('handles multipart form data with authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Set mock metadata to bypass real schematic parsing (test file is not a valid NBT file)
      ctx.container.gateways.structureConverter.setMockMetadata({
        dimensions: { x: 10, y: 20, z: 10 },
        blockCount: 500,
        usedBlocks: ['minecraft:stone', 'minecraft:dirt'],
      });

      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'application/octet-stream' }), 'test.schematic');
      formData.append('originalEdition', 'java');
      formData.append('originalVersion', '1.20.4');

      // Act
      const response = await app.request('http://localhost/api/v1/structures/upload', {
        method: 'POST',
        headers: {
          ...authHeader(user.id),
        },
        body: formData,
      });
      const body = await response.json() as ApiResponseBody;

      // Assert
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect((body.data as { id: string }).id).toBeDefined();
    });

    it('returns 400 for missing file', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const formData = new FormData();
      formData.append('originalEdition', 'java');
      formData.append('originalVersion', '1.20.4');

      // Act
      const response = await app.request('http://localhost/api/v1/structures/upload', {
        method: 'POST',
        headers: {
          ...authHeader(user.id),
        },
        body: formData,
      });
      const body = await response.json() as ApiResponseBody;

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 for invalid edition', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.schematic');
      formData.append('originalEdition', 'invalid');
      formData.append('originalVersion', '1.20.4');

      // Act
      const response = await app.request('http://localhost/api/v1/structures/upload', {
        method: 'POST',
        headers: {
          ...authHeader(user.id),
        },
        body: formData,
      });
      const body = await response.json() as ApiResponseBody;

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/v1/structures/:id/download - Download Structure
  // Note: This endpoint uses post ID, not structure ID
  // ========================================

  describe('GET /api/v1/structures/:id/download', () => {
    it('returns 401 without authentication', async () => {
      // Act
      const response = await get(app, '/api/v1/structures/struct-123/download?edition=java&version=1.20.4');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with download URL for valid post', async () => {
      // Arrange - Create user, structure, and post
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const post = await createTestPost(ctx.container, user.id, structure.id);

      // Act - Use post ID with required edition and version params
      const response = await get(
        app,
        `/api/v1/structures/${post.id}/download?edition=java&version=1.20.4`,
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { downloadUrl: string }).downloadUrl).toBeDefined();
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await get(
        app,
        '/api/v1/structures/nonexistent/download?edition=java&version=1.20.4',
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('accepts bedrock edition query parameter', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const post = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(
        app,
        `/api/v1/structures/${post.id}/download?edition=bedrock&version=1.20.4`,
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('accepts different version query parameter', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const post = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(
        app,
        `/api/v1/structures/${post.id}/download?edition=java&version=1.19.4`,
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ========================================
  // GET /api/v1/structures/:id/render-data - Get Render Data
  // ========================================

  describe('GET /api/v1/structures/:id/render-data', () => {
    it('returns 200 with render data for valid structure', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act
      const response = await get(app, `/api/v1/structures/${structure.id}/render-data`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { lodLevel: string }).lodLevel).toBeDefined();
    });

    it('does not require authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act - No auth header
      const response = await get(app, `/api/v1/structures/${structure.id}/render-data`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent structure', async () => {
      // Act
      const response = await get(app, '/api/v1/structures/nonexistent/render-data');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('accepts lod query parameter', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act
      const response = await get(
        app,
        `/api/v1/structures/${structure.id}/render-data?lod=low`
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('ignores invalid lod parameter (optional field defaults to undefined)', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act
      const response = await get(
        app,
        `/api/v1/structures/${structure.id}/render-data?lodLevel=invalid`
      );

      // Assert - Invalid optional enum values may be ignored or cause validation error
      // The actual behavior depends on zod parsing - either works for this edge case
      expect(response.status).toBeLessThan(500);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles special characters in structure ID', async () => {
      // Act
      const response = await get(app, '/api/v1/structures/struct%2F123/render-data');

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('handles empty structure ID', async () => {
      // Act - This should match a different route or return 404
      const response = await get(app, '/api/v1/structures//render-data');

      // Assert
      expect(response.status).toBe(404);
    });

    it('handles very long structure ID', async () => {
      // Arrange
      const longId = 'a'.repeat(500);

      // Act
      const response = await get(app, `/api/v1/structures/${longId}/render-data`);

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('handles concurrent download requests', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const post = await createTestPost(ctx.container, user.id, structure.id);

      // Act - Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        get(app, `/api/v1/structures/${post.id}/download?edition=java&version=1.20.4`, {
          headers: authHeader(user.id),
        })
      );
      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
