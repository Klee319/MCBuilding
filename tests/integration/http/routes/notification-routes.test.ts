/**
 * Notification Routes Integration Tests
 *
 * Tests HTTP routes for notification-related endpoints with full app stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import {
  createTestApp,
  type TestAppContext,
  get,
  patch,
  authHeader,
  parseJson,
  createTestUser,
  resetCounters,
  type ApiResponseBody,
} from '../test-helpers.js';
import { Notification } from '../../../../src/domain/entities/notification.js';

describe('Notification Routes Integration', () => {
  let ctx: TestAppContext;
  let app: Hono;

  beforeEach(() => {
    resetCounters();
    ctx = createTestApp();
    app = ctx.app;
  });

  // ========================================
  // Helper to create test notification
  // ========================================

  let notificationCounter = 0;

  async function createTestNotification(
    userId: string,
    overrides: {
      id?: string;
      type?: 'like' | 'comment' | 'follow' | 'mention';
      isRead?: boolean;
      actorId?: string;
      targetId?: string;
    } = {}
  ): Promise<Notification> {
    notificationCounter++;
    const notification = Notification.create({
      id: overrides.id ?? `notif-${Date.now()}-${notificationCounter}`,
      userId,
      type: overrides.type ?? 'like',
      actorId: overrides.actorId ?? 'user-actor',
      targetId: overrides.targetId ?? 'post-123',
      isRead: overrides.isRead ?? false,
      createdAt: new Date(),
    });

    await ctx.container.repositories.notification.save(notification);
    return notification;
  }

  // ========================================
  // GET /api/v1/notifications - Get Notifications
  // ========================================

  describe('GET /api/v1/notifications', () => {
    it('returns 200 with empty list when no notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('returns 200 with notifications list', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id);
      await createTestNotification(user.id);

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect((body.data as unknown[]).length).toBe(2);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await get(app, '/api/v1/notifications');
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('only returns notifications for authenticated user', async () => {
      // Arrange
      const user1 = await createTestUser(ctx.container, { id: 'user-notif-1' });
      const user2 = await createTestUser(ctx.container, { id: 'user-notif-2' });
      await createTestNotification(user1.id);
      await createTestNotification(user2.id);

      // Act - Get notifications for user1
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user1.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as unknown[]).length).toBe(1);
    });

    it('supports pagination with page parameter', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      for (let i = 0; i < 5; i++) {
        await createTestNotification(user.id, { id: `notif-page-${i}` });
      }

      // Act
      const response = await get(app, '/api/v1/notifications?page=1&limit=2', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.meta?.page).toBe(1);
      expect(body.meta?.limit).toBe(2);
    });

    it('filters to unread only by default (includeRead=false)', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { id: 'notif-read', isRead: true });
      await createTestNotification(user.id, { id: 'notif-unread', isRead: false });

      // Act - default is includeRead=false
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - should only return unread notifications
      expect(response.status).toBe(200);
      expect((body.data as unknown[]).length).toBe(1);
    });

    it('returns all notifications when includeRead=true', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { id: 'notif-read-2', isRead: true });
      await createTestNotification(user.id, { id: 'notif-unread-2', isRead: false });

      // Act
      const response = await get(app, '/api/v1/notifications?includeRead=true', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - should return both read and unread notifications
      expect(response.status).toBe(200);
      expect((body.data as unknown[]).length).toBe(2);
    });
  });

  // ========================================
  // PATCH /api/v1/notifications/:id/read - Mark as Read
  // ========================================

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('returns 200 on successful mark as read', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const notification = await createTestNotification(user.id, { isRead: false });

      // Act
      const response = await patch(
        app,
        `/api/v1/notifications/${notification.id}/read`,
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 401 without authentication', async () => {
      // Act
      const response = await patch(app, '/api/v1/notifications/notif-123/read', {});
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 for non-existent notification', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await patch(
        app,
        '/api/v1/notifications/nonexistent/read',
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(404);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 403 when trying to mark another users notification', async () => {
      // Arrange
      const user1 = await createTestUser(ctx.container, { id: 'notif-owner' });
      const user2 = await createTestUser(ctx.container, { id: 'notif-intruder' });
      const notification = await createTestNotification(user1.id);

      // Act
      const response = await patch(
        app,
        `/api/v1/notifications/${notification.id}/read`,
        {},
        { headers: authHeader(user2.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(403);
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('handles already read notification gracefully', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const notification = await createTestNotification(user.id, { isRead: true });

      // Act
      const response = await patch(
        app,
        `/api/v1/notifications/${notification.id}/read`,
        {},
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert - Should succeed even if already read
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('does not require request body', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const notification = await createTestNotification(user.id);

      // Act - Empty body
      const response = await patch(
        app,
        `/api/v1/notifications/${notification.id}/read`,
        undefined,
        { headers: authHeader(user.id) }
      );
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ========================================
  // Notification Types
  // ========================================

  describe('Notification Types', () => {
    it('returns like notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { type: 'like' });

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as Array<{ type: string }>)[0].type).toBe('like');
    });

    it('returns comment notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { type: 'comment' });

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as Array<{ type: string }>)[0].type).toBe('comment');
    });

    it('returns follow notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { type: 'follow' });

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as Array<{ type: string }>)[0].type).toBe('follow');
    });

    it('returns mention notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      await createTestNotification(user.id, { type: 'mention' });

      // Act
      const response = await get(app, '/api/v1/notifications', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as Array<{ type: string }>)[0].type).toBe('mention');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles very long notification ID in URL', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const longId = 'a'.repeat(500);

      // Act
      const response = await patch(
        app,
        `/api/v1/notifications/${longId}/read`,
        {},
        { headers: authHeader(user.id) }
      );

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('handles special characters in notification ID', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);

      // Act
      const response = await patch(
        app,
        '/api/v1/notifications/notif%2F123/read',
        {},
        { headers: authHeader(user.id) }
      );

      // Assert - Should not crash
      expect(response.status).toBeLessThan(500);
    });

    it('handles concurrent read requests', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      const notification = await createTestNotification(user.id);

      // Act - Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        patch(
          app,
          `/api/v1/notifications/${notification.id}/read`,
          {},
          { headers: authHeader(user.id) }
        )
      );
      const responses = await Promise.all(requests);

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('handles large number of notifications', async () => {
      // Arrange
      const user = await createTestUser(ctx.container);
      for (let i = 0; i < 100; i++) {
        await createTestNotification(user.id, { id: `notif-bulk-${i}` });
      }

      // Act
      const response = await get(app, '/api/v1/notifications?limit=100', {
        headers: authHeader(user.id),
      });
      const body = await parseJson<ApiResponseBody>(response);

      // Assert
      expect(response.status).toBe(200);
      expect((body.data as unknown[]).length).toBe(100);
    });
  });
});
