/**
 * GetNotifications Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetNotifications,
  GetNotificationsError,
} from '../../../../src/usecase/notification/get-notifications.js';
import type { NotificationRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { PaginatedResult } from '../../../../src/usecase/ports/types.js';
import { Notification } from '../../../../src/domain/entities/notification.js';

// ========================================
// Test Helpers
// ========================================

function createMockNotification(overrides?: Partial<{
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  actorId: string;
  targetId: string;
  isRead: boolean;
  createdAt: Date;
}>): Notification {
  const now = new Date();
  return Notification.create({
    id: overrides?.id ?? 'notif-123',
    userId: overrides?.userId ?? 'user-456',
    type: overrides?.type ?? 'like',
    actorId: overrides?.actorId ?? 'actor-789',
    targetId: overrides?.targetId ?? 'post-111',
    isRead: overrides?.isRead ?? false,
    createdAt: overrides?.createdAt ?? now,
  });
}

function createMockPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

// ========================================
// Tests
// ========================================

describe('GetNotifications Usecase', () => {
  let notificationRepository: NotificationRepositoryPort;
  let usecase: GetNotifications;

  beforeEach(() => {
    // Create mock implementations
    notificationRepository = {
      findById: vi.fn(),
      findByUser: vi.fn(),
      save: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };

    usecase = GetNotifications.create(notificationRepository);
  });

  describe('execute', () => {
    it('should return paginated notifications for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const notifications = [
        createMockNotification({ id: 'notif-1', userId }),
        createMockNotification({ id: 'notif-2', userId }),
        createMockNotification({ id: 'notif-3', userId }),
      ];
      const expectedResult = createMockPaginatedResult(notifications, 3, 1, 20);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      const result = await usecase.execute({ userId });

      // Assert
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
        includeRead: false,
      });
    });

    it('should throw error when userId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ userId: '' })
      ).rejects.toThrow(GetNotificationsError);

      await expect(
        usecase.execute({ userId: '' })
      ).rejects.toThrow('userId cannot be empty');
    });

    it('should throw error when userId is only whitespace', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ userId: '   ' })
      ).rejects.toThrow(GetNotificationsError);

      await expect(
        usecase.execute({ userId: '   ' })
      ).rejects.toThrow('userId cannot be empty');
    });

    it('should use default pagination when not specified', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedResult = createMockPaginatedResult([], 0, 1, 20);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      await usecase.execute({ userId });

      // Assert
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
        includeRead: false,
      });
    });

    it('should use custom pagination when specified', async () => {
      // Arrange
      const userId = 'user-123';
      const page = 3;
      const limit = 50;
      const expectedResult = createMockPaginatedResult([], 0, page, limit);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      await usecase.execute({ userId, page, limit });

      // Assert
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 3,
        limit: 50,
        includeRead: false,
      });
    });

    it('should cap limit at 100 when exceeding maximum', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedResult = createMockPaginatedResult([], 0, 1, 100);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      await usecase.execute({ userId, limit: 500 });

      // Assert
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 100,
        includeRead: false,
      });
    });

    it('should filter unread only by default', async () => {
      // Arrange
      const userId = 'user-123';
      const unreadNotifications = [
        createMockNotification({ id: 'notif-1', userId, isRead: false }),
        createMockNotification({ id: 'notif-2', userId, isRead: false }),
      ];
      const expectedResult = createMockPaginatedResult(unreadNotifications, 2, 1, 20);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      await usecase.execute({ userId });

      // Assert
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
        includeRead: false,
      });
    });

    it('should include read notifications when includeRead is true', async () => {
      // Arrange
      const userId = 'user-123';
      const allNotifications = [
        createMockNotification({ id: 'notif-1', userId, isRead: false }),
        createMockNotification({ id: 'notif-2', userId, isRead: true }),
        createMockNotification({ id: 'notif-3', userId, isRead: true }),
      ];
      const expectedResult = createMockPaginatedResult(allNotifications, 3, 1, 20);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      const result = await usecase.execute({ userId, includeRead: true });

      // Assert
      expect(result.items).toHaveLength(3);
      expect(notificationRepository.findByUser).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 20,
        includeRead: true,
      });
    });

    it('should return empty result when user has no notifications', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedResult = createMockPaginatedResult([], 0, 1, 20);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      const result = await usecase.execute({ userId });

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should correctly report hasMore when there are more pages', async () => {
      // Arrange
      const userId = 'user-123';
      const notifications = [
        createMockNotification({ id: 'notif-1', userId }),
        createMockNotification({ id: 'notif-2', userId }),
      ];
      // Total is 50, but we only get 2 items on page 1 with limit 2
      const expectedResult = createMockPaginatedResult(notifications, 50, 1, 2);

      vi.mocked(notificationRepository.findByUser).mockResolvedValue(expectedResult);

      // Act
      const result = await usecase.execute({ userId, page: 1, limit: 2 });

      // Assert
      expect(result.hasMore).toBe(true);
    });
  });

  describe('create factory method', () => {
    it('should create a GetNotifications instance with valid dependencies', () => {
      const instance = GetNotifications.create(notificationRepository);
      expect(instance).toBeInstanceOf(GetNotifications);
    });
  });

  describe('GetNotificationsError', () => {
    it('should have correct name property', () => {
      const error = new GetNotificationsError('test error');
      expect(error.name).toBe('GetNotificationsError');
    });

    it('should preserve error message', () => {
      const error = new GetNotificationsError('specific error message');
      expect(error.message).toBe('specific error message');
    });

    it('should be instanceof Error', () => {
      const error = new GetNotificationsError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof GetNotificationsError', () => {
      const error = new GetNotificationsError('test');
      expect(error).toBeInstanceOf(GetNotificationsError);
    });
  });
});
