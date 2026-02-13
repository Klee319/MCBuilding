/**
 * NotificationController Unit Tests
 *
 * Tests for notification-related HTTP request handling.
 * Follows TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationController, type NotificationControllerDeps } from '../../../../src/interface/controllers/notification-controller.js';
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockNotification,
  createMockUsecase,
  createFailingUsecase,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
} from './test-helpers.js';
import type { Notification } from '../../../../src/domain/entities/notification.js';
import type { PaginatedResult } from '../../../../src/usecase/ports/types.js';

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockDeps: NotificationControllerDeps;

  // ========================================
  // Setup
  // ========================================

  beforeEach(() => {
    const mockNotification = createMockNotification();

    mockDeps = {
      getNotifications: createMockUsecase({
        items: [mockNotification],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>),
      markNotificationRead: createMockUsecase(undefined),
    };

    controller = NotificationController.create(mockDeps);
  });

  // ========================================
  // getNotifications() Tests
  // ========================================

  describe('getNotifications()', () => {
    it('returns paginated notifications on success', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: '1', limit: '20' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
      expect(mockDeps.getNotifications.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        page: 1,
        limit: 20,
        includeRead: false,
      });
    });

    it('passes includeRead filter when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: '1', limit: '20', includeRead: 'true' },
        user: { id: 'user-123' },
      });

      // Act
      await controller.getNotifications(ctx);

      // Assert
      expect(mockDeps.getNotifications.execute).toHaveBeenCalledWith(
        expect.objectContaining({ includeRead: true })
      );
    });

    it('excludes read notifications by default', async () => {
      // Arrange
      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      await controller.getNotifications(ctx);

      // Assert
      expect(mockDeps.getNotifications.execute).toHaveBeenCalledWith(
        expect.objectContaining({ includeRead: false })
      );
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid pagination parameters', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 'invalid' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for negative page number', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: '-1' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for limit exceeding maximum', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { limit: '200' }, // Assuming max is 100
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns empty list when no notifications', async () => {
      // Arrange
      mockDeps.getNotifications = createMockUsecase({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 0, 1);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.getNotifications = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('handles multiple notification types', async () => {
      // Arrange
      const notifications = [
        createMockNotification({ type: 'like', message: 'Someone liked your post' }),
        createMockNotification({ id: 'notif-2', type: 'comment', message: 'Someone commented on your post' }),
        createMockNotification({ id: 'notif-3', type: 'follow', message: 'Someone followed you' }),
      ];

      mockDeps.getNotifications = createMockUsecase({
        items: notifications,
        total: 3,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 3, 1);
    });

    it('handles pagination correctly', async () => {
      // Arrange
      mockDeps.getNotifications = createMockUsecase({
        items: [createMockNotification()],
        total: 50,
        page: 3,
        limit: 10,
        hasMore: true,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: { page: '3', limit: '10' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('meta.page', 3);
      expect(response.body).toHaveProperty('meta.limit', 10);
      expect(response.body).toHaveProperty('meta.total', 50);
      expect(response.body).toHaveProperty('meta.hasMore', true);
    });
  });

  // ========================================
  // markAsRead() Tests
  // ========================================

  describe('markAsRead()', () => {
    it('marks notification as read on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'notif-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.read', true);
      expect(mockDeps.markNotificationRead.execute).toHaveBeenCalledWith({
        notificationId: 'notif-123',
        userId: 'user-123',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'notif-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid notification ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when notification not found', async () => {
      // Arrange
      mockDeps.markNotificationRead = createFailingUsecase(new Error('Notification not found'));
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 403 when user is not notification owner', async () => {
      // Arrange
      mockDeps.markNotificationRead = createFailingUsecase(new Error('Not authorized'));
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'notif-123' },
        user: { id: 'other-user' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 403 when not owner (alternative error message)', async () => {
      // Arrange
      mockDeps.markNotificationRead = createFailingUsecase(new Error('User is not owner'));
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'notif-123' },
        user: { id: 'other-user' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.markNotificationRead = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'notif-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('handles already read notification idempotently', async () => {
      // Arrange - marking already read notification should succeed
      const ctx = createMockContext({
        params: { id: 'notif-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.markAsRead(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('handles concurrent mark read operations', async () => {
      // Arrange
      const ctx1 = createMockContext({
        params: { id: 'notif-1' },
        user: { id: 'user-123' },
      });
      const ctx2 = createMockContext({
        params: { id: 'notif-2' },
        user: { id: 'user-123' },
      });

      // Act
      const [response1, response2] = await Promise.all([
        controller.markAsRead(ctx1),
        controller.markAsRead(ctx2),
      ]);

      // Assert
      expectSuccessResponse(response1, 200);
      expectSuccessResponse(response2, 200);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles large number of notifications', async () => {
      // Arrange
      const manyNotifications = Array.from({ length: 100 }, (_, i) =>
        createMockNotification({ id: `notif-${i}` })
      );

      mockDeps.getNotifications = createMockUsecase({
        items: manyNotifications,
        total: 1000,
        page: 1,
        limit: 100,
        hasMore: true,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: { limit: '100' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('meta.total', 1000);
    });

    it('handles notifications with null related fields', async () => {
      // Arrange
      const systemNotification = createMockNotification({
        type: 'system',
        relatedUserId: null,
        relatedPostId: null,
        message: 'System maintenance scheduled',
      });

      mockDeps.getNotifications = createMockUsecase({
        items: [systemNotification],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
    });

    it('handles notification with special characters in message', async () => {
      // Arrange
      const notificationWithSpecialChars = createMockNotification({
        message: 'User <script>alert("xss")</script> liked your post',
      });

      mockDeps.getNotifications = createMockUsecase({
        items: [notificationWithSpecialChars],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
    });

    it('handles notification with unicode in message', async () => {
      // Arrange
      const notificationWithUnicode = createMockNotification({
        message: 'User Name liked your post',
      });

      mockDeps.getNotifications = createMockUsecase({
        items: [notificationWithUnicode],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
    });

    it('handles all notification types', async () => {
      // Arrange
      const notificationTypes = ['like', 'comment', 'follow', 'mention', 'system'];
      const notifications = notificationTypes.map((type, i) =>
        createMockNotification({ id: `notif-${i}`, type, message: `${type} notification` })
      );

      mockDeps.getNotifications = createMockUsecase({
        items: notifications,
        total: 5,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 5, 1);
    });

    it('handles default pagination when no params provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      await controller.getNotifications(ctx);

      // Assert
      expect(mockDeps.getNotifications.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('handles first page correctly', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: '1' },
        user: { id: 'user-123' },
      });

      // Act
      await controller.getNotifications(ctx);

      // Assert
      expect(mockDeps.getNotifications.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('handles very old notifications', async () => {
      // Arrange
      const oldNotification = createMockNotification({
        createdAt: new Date('2020-01-01T00:00:00Z'),
      });

      mockDeps.getNotifications = createMockUsecase({
        items: [oldNotification],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
    });

    it('handles mixed read and unread notifications', async () => {
      // Arrange
      const notifications = [
        createMockNotification({ id: 'notif-1', isRead: false }),
        createMockNotification({ id: 'notif-2', isRead: true }),
        createMockNotification({ id: 'notif-3', isRead: false }),
      ];

      mockDeps.getNotifications = createMockUsecase({
        items: notifications,
        total: 3,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Notification>);
      controller = NotificationController.create(mockDeps);

      const ctx = createMockContext({
        query: { includeRead: 'true' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getNotifications(ctx);

      // Assert
      expectPaginatedResponse(response, 3, 1);
    });
  });
});
