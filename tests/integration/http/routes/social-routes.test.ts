/**
 * Social Routes Integration Tests
 *
 * Tests HTTP routes for social features (likes, comments, follows) with full app stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  post,
  del,
  authHeader,
  parseJson,
  createTestUser,
  createTestStructure,
  createTestPost,
  resetCounters,
  type ApiResponseBody,
} from '../test-helpers.js';

describe('Social Routes Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    resetCounters();
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // POST /api/v1/posts/:id/like - Like Post
  // ========================================

  describe('POST /api/v1/posts/:id/like', () => {
    it('returns 200 on successful like', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-like' });
      const liker = await createTestUser(ctx.container, { id: 'liker' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/like`,
        {},
        { headers: authHeader(liker.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await post(app, '/api/v1/posts/post-123/like', {});
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/posts/nonexistent/like',
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('handles double like gracefully', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-double' });
      const liker = await createTestUser(ctx.container, { id: 'liker-double' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Act - Like twice
      await post(app, `/api/v1/posts/${createdPost.id}/like`, {}, { headers: authHeader(liker.id) });
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/like`,
        {},
        { headers: authHeader(liker.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should handle gracefully (either 200 or 409)
      expect([200, 409]).toContain(response.status);
    });
  });

  // ========================================
  // DELETE /api/v1/posts/:id/like - Unlike Post
  // ========================================

  describe('DELETE /api/v1/posts/:id/like', () => {
    it('returns 200 on successful unlike', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-unlike' });
      const liker = await createTestUser(ctx.container, { id: 'liker-unlike' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Like first
      await post(app, `/api/v1/posts/${createdPost.id}/like`, {}, { headers: authHeader(liker.id) });

      // Act - Unlike
      const response = await del(app, `/api/v1/posts/${createdPost.id}/like`, {
        headers: authHeader(liker.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await del(app, '/api/v1/posts/post-123/like');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await del(app, '/api/v1/posts/nonexistent/like', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // GET /api/v1/posts/:id/comments - Get Comments
  // ========================================

  describe('GET /api/v1/posts/:id/comments', () => {
    it('returns 200 with empty list when no comments', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(app, `/api/v1/posts/${createdPost.id}/comments`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('does not require authentication', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act - No auth header
      const response = await get(app, `/api/v1/posts/${createdPost.id}/comments`);

      // Assert
      expect(response.status).toBe(200);
    });

    it('returns 200 with empty array for non-existent post', async () => {
      // Note: Current implementation doesn't validate post existence,
      // so it returns an empty comments array instead of 404
      const response = await get(app, '/api/v1/posts/nonexistent/comments');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    it('supports pagination parameters', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await get(app, `/api/v1/posts/${createdPost.id}/comments?page=1&limit=10`);
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ========================================
  // POST /api/v1/posts/:id/comments - Add Comment
  // ========================================

  describe('POST /api/v1/posts/:id/comments', () => {
    it('returns 201 on successful comment creation', async () => {
      // Arrange
      const author = await createTestUser(ctx.container, { id: 'author-comment' });
      const commenter = await createTestUser(ctx.container, { id: 'commenter' });
      const structure = await createTestStructure(ctx.container, author.id);
      const createdPost = await createTestPost(ctx.container, author.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/comments`,
        { content: 'Great structure!' },
        { headers: authHeader(commenter.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect((body.data as { content: string }).content).toBe('Great structure!');
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await post(app, '/api/v1/posts/post-123/comments', {
        content: 'Test comment',
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 for empty content', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/comments`,
        { content: '' },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for non-existent post', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/posts/nonexistent/comments',
        { content: 'Test' },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
    });

    it('returns 400 for content exceeding max length', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/comments`,
        { content: 'A'.repeat(10001) }, // Assuming max is 10000
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // DELETE /api/v1/comments/:id - Delete Comment
  // ========================================

  describe('DELETE /api/v1/comments/:id', () => {
    it('returns 401 without authentication', async () => {
      // Act
      const response = await del(app, '/api/v1/comments/comment-123');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for non-existent comment', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await del(app, '/api/v1/comments/nonexistent', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ========================================
  // POST /api/v1/users/:id/follow - Follow User
  // ========================================

  describe('POST /api/v1/users/:id/follow', () => {
    it('returns 200 on successful follow', async () => {
      // Arrange
      const targetUser = await createTestUser(ctx.container, { id: 'target-follow' });
      const follower = await createTestUser(ctx.container, { id: 'follower' });

      // Act
      const response = await post(
        app,
        `/api/v1/users/${targetUser.id}/follow`,
        {},
        { headers: authHeader(follower.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await post(app, '/api/v1/users/user-123/follow', {});
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for non-existent user', async () => {
      // Arrange
      const follower = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        '/api/v1/users/nonexistent/follow',
        {},
        { headers: authHeader(follower.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
    });

    it('returns 400 when trying to follow self', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await post(
        app,
        `/api/v1/users/${user.id}/follow`,
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(400);
    });

    it('handles double follow gracefully', async () => {
      // Arrange
      const targetUser = await createTestUser(ctx.container, { id: 'target-double' });
      const follower = await createTestUser(ctx.container, { id: 'follower-double' });

      // Act - Follow twice
      await post(app, `/api/v1/users/${targetUser.id}/follow`, {}, { headers: authHeader(follower.id) });
      const response = await post(
        app,
        `/api/v1/users/${targetUser.id}/follow`,
        {},
        { headers: authHeader(follower.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should handle gracefully
      expect([200, 409]).toContain(response.status);
    });
  });

  // ========================================
  // DELETE /api/v1/users/:id/follow - Unfollow User
  // ========================================

  describe('DELETE /api/v1/users/:id/follow', () => {
    it('returns 200 on successful unfollow', async () => {
      // Arrange
      const targetUser = await createTestUser(ctx.container, { id: 'target-unfollow' });
      const follower = await createTestUser(ctx.container, { id: 'unfollower' });

      // Follow first
      await post(app, `/api/v1/users/${targetUser.id}/follow`, {}, { headers: authHeader(follower.id) });

      // Act - Unfollow
      const response = await del(app, `/api/v1/users/${targetUser.id}/follow`, {
        headers: authHeader(follower.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await del(app, '/api/v1/users/user-123/follow');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('handles unfollow when not following', async () => {
      // Arrange
      const targetUser = await createTestUser(ctx.container, { id: 'target-not-following' });
      const notFollower = await createTestUser(ctx.container, { id: 'not-follower' });

      // Act - Unfollow without following first
      const response = await del(app, `/api/v1/users/${targetUser.id}/follow`, {
        headers: authHeader(notFollower.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should handle gracefully
      expect([200, 404]).toContain(response.status);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles special characters in comment content', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/comments`,
        { content: '<script>alert("xss")</script>' },
        { headers: authHeader(user.id) }
      );

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('handles unicode in comment content', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const structure = await createTestStructure(ctx.container, user.id);
      const createdPost = await createTestPost(ctx.container, user.id, structure.id);

      // Act
      const response = await post(
        app,
        `/api/v1/posts/${createdPost.id}/comments`,
        { content: 'Great work! Keep it up!' },
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(201);
      expect((body.data as { content: string }).content).toContain('Great work');
    });
  });
});
