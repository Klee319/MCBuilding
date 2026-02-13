/**
 * Post Routes Integration Tests
 *
 * Tests HTTP routes for post-related endpoints with full app stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  post,
  patch,
  del,
  authHeader,
  parseJson,
  createTestUser,
  createTestStructure,
  createTestPost,
  resetCounters,
  type ApiResponseBody,
} from '../test-helpers.js';

describe('Post Routes Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    resetCounters();
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // GET /api/v1/posts - Search Posts
  // ========================================

  describe('GET /api/v1/posts', () => {
    it('returns 200 with empty list when no posts exist', async () => {
      // Act
      const response = await get(app, '/api/v1/posts');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.meta?.total).toBe(0);
    });

    it('returns 200 with posts when posts exist', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(app, '/api/v1/posts');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect((body.data as unknown[]).length).toBeGreaterThan(0);
    });

    it('returns paginated results', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      await createTestPost(ctx.container, user.id, structure.id);
      await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(app, '/api/v1/posts?page=1&limit=1');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.meta?.page).toBe(1);
      expect(body.meta?.limit).toBe(1);
    });

    it('filters posts by keyword', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      await createTestPost(ctx.container, user.id, structure.id, { title: 'Castle Building' });
      await createTestPost(ctx.container, user.id, structure.id, { title: 'Modern House' });

      // Act
      const response = await get(app, '/api/v1/posts?keyword=Castle');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('works without authentication', async () => {
      // Act
      const response = await get(app, '/api/v1/posts');

      // Assert
      expect(response.status).toBe(200);
    });

    it('works with authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await get(app, '/api/v1/posts', {
        headers: authHeader(user.id),
      });

      // Assert
      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // GET /api/v1/posts/:id - Get Post Detail
  // ========================================

  describe('GET /api/v1/posts/:id', () => {
    it('returns 200 with post data for valid ID', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(app, `/api/v1/posts/${createdPost.id}`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { id: string }).id).toBe(createdPost.id);
    });

    it('returns 404 for non-existent post', async () => {
      // Act
      const response = await get(app, '/api/v1/posts/nonexistent-id');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('works without authentication for public posts', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id, {
        visibility: 'public',
      });

      // Act
      const response = await get(app, `/api/v1/posts/${createdPost.id}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('returns 404 for private post without authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id, {
        visibility: 'private',
      });

      // Act
      const response = await get(app, `/api/v1/posts/${createdPost.id}`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });
  });

  // ========================================
  // POST /api/v1/posts - Create Post
  // ========================================

  describe('POST /api/v1/posts', () => {
    it('returns 201 with created post on success', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act
      const response = await post(
        app,
        '/api/v1/posts',
        {
          title: 'My New Post',
          description: 'A great structure',
          visibility: 'public',
          structureId: structure.id,
        },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect((body.data as { title: string }).title).toBe('My New Post');
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await post(app, '/api/v1/posts', {
        title: 'My New Post',
        visibility: 'public',
        structureId: 'struct-123',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 for missing required fields', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/posts',
        {
          title: 'Only Title',
          // Missing visibility and structureId
        },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid visibility value', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/posts',
        {
          title: 'My Post',
          visibility: 'invalid-visibility',
          structureId: 'struct-123',
        },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 for title exceeding max length', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);

      // Act
      const response = await post(
        app,
        '/api/v1/posts',
        {
          title: 'A'.repeat(300), // Over 200 char limit
          visibility: 'public',
          structureId: structure.id,
        },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // ========================================
  // PATCH /api/v1/posts/:id - Update Post
  // ========================================

  describe('PATCH /api/v1/posts/:id', () => {
    it('returns 200 with updated post on success', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await patch(
        app,
        `/api/v1/posts/${createdPost.id}`,
        { title: 'Updated Title' },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { title: string }).title).toBe('Updated Title');
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await patch(app, '/api/v1/posts/some-id', {
        title: 'Updated',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not the author', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-1' });
      const otherUser = await createTestUser(ctx.container, { id: 'other-user' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Act
      const response = await patch(
        app,
        `/api/v1/posts/${createdPost.id}`,
        { title: 'Hacked Title' },
        { headers: authHeader(otherUser.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(403);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await patch(
        app,
        '/api/v1/posts/nonexistent',
        { title: 'Updated' },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });
  });

  // ========================================
  // DELETE /api/v1/posts/:id - Delete Post
  // ========================================

  describe('DELETE /api/v1/posts/:id', () => {
    it('returns 200 on successful deletion', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await del(app, `/api/v1/posts/${createdPost.id}`, {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect((body.data as { deleted: boolean }).deleted).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await del(app, '/api/v1/posts/some-id');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not the author', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-2' });
      const otherUser = await createTestUser(ctx.container, { id: 'other-user-2' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Act
      const response = await del(app, `/api/v1/posts/${createdPost.id}`, {
        headers: authHeader(otherUser.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(403);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await del(app, '/api/v1/posts/nonexistent', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('post cannot be found after deletion', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act - Delete
      await del(app, `/api/v1/posts/${createdPost.id}`, {
        headers: authHeader(user.id),
      });

      // Act - Try to fetch
      const getResponse = await get(app, `/api/v1/posts/${createdPost.id}`);
      const body = await parseJson<ApiResponseBody>(getResponse);

      // Assert
      expect(getResponse.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });
  });

  // ========================================
  // GET /api/v1/posts/unlisted/:token - Get Unlisted Post
  // ========================================

  describe('GET /api/v1/posts/unlisted/:token', () => {
    it('returns 404 for invalid unlisted token', async () => {
      // Act
      const response = await get(app, '/api/v1/posts/unlisted/invalid-token');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });

    it('works without authentication', async () => {
      // Act
      const response = await get(app, '/api/v1/posts/unlisted/some-token');

      // Assert - Should be 404 (not found) not 401 (unauthorized)
      expect(response.status).toBe(404);
    });
  });
});
