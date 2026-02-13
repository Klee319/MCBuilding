/**
 * MarkNotificationRead Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MarkNotificationRead,
  MarkNotificationReadError,
} from '../../../../src/usecase/notification/mark-notification-read.js';
import type { NotificationRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
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

// ========================================
// Tests
// ========================================

describe('MarkNotificationRead Usecase', () => {
  let notificationRepository: NotificationRepositoryPort;
  let usecase: MarkNotificationRead;

  beforeEach(() => {
    // Create mock implementations
    notificationRepository = {
      findById: vi.fn(),
      findByUser: vi.fn(),
      save: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };

    usecase = MarkNotificationRead.create(notificationRepository);
  });

  describe('execute', () => {
    it('should mark a single notification as read successfully', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const userId = 'user-456';
      const notification = createMockNotification({
        id: notificationId,
        userId,
        isRead: false,
      });

      vi.mocked(notificationRepository.findById).mockResolvedValue(notification);
      vi.mocked(notificationRepository.markAsRead).mockResolvedValue();

      // Act
      await usecase.execute({ notificationId, userId });

      // Assert
      expect(notificationRepository.findById).toHaveBeenCalledWith(notificationId);
      expect(notificationRepository.markAsRead).toHaveBeenCalledWith(notificationId);
    });

    it('should be idempotent - no error when notification is already read', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const userId = 'user-456';
      const notification = createMockNotification({
        id: notificationId,
        userId,
        isRead: true, // Already read
      });

      vi.mocked(notificationRepository.findById).mockResolvedValue(notification);

      // Act & Assert - should not throw
      await expect(
        usecase.execute({ notificationId, userId })
      ).resolves.not.toThrow();

      // Should not call markAsRead since already read
      expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
    });

    it('should throw error when notification does not exist', async () => {
      // Arrange
      vi.mocked(notificationRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        usecase.execute({ notificationId: 'nonexistent-notif', userId: 'user-123' })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId: 'nonexistent-notif', userId: 'user-123' })
      ).rejects.toThrow('Notification not found');
    });

    it('should throw error when user is not the owner of the notification', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const ownerId = 'user-456';
      const requesterId = 'user-789'; // Different user
      const notification = createMockNotification({
        id: notificationId,
        userId: ownerId,
        isRead: false,
      });

      vi.mocked(notificationRepository.findById).mockResolvedValue(notification);

      // Act & Assert
      await expect(
        usecase.execute({ notificationId, userId: requesterId })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId, userId: requesterId })
      ).rejects.toThrow('Not authorized to access this notification');
    });

    it('should throw error when notificationId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ notificationId: '', userId: 'user-123' })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId: '', userId: 'user-123' })
      ).rejects.toThrow('notificationId cannot be empty');
    });

    it('should throw error when notificationId is only whitespace', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ notificationId: '   ', userId: 'user-123' })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId: '   ', userId: 'user-123' })
      ).rejects.toThrow('notificationId cannot be empty');
    });

    it('should throw error when userId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ notificationId: 'notif-123', userId: '' })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId: 'notif-123', userId: '' })
      ).rejects.toThrow('userId cannot be empty');
    });

    it('should throw error when userId is only whitespace', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ notificationId: 'notif-123', userId: '   ' })
      ).rejects.toThrow(MarkNotificationReadError);

      await expect(
        usecase.execute({ notificationId: 'notif-123', userId: '   ' })
      ).rejects.toThrow('userId cannot be empty');
    });

    it('should validate notificationId before userId', async () => {
      // Act & Assert - both empty, but notificationId should be validated first
      await expect(
        usecase.execute({ notificationId: '', userId: '' })
      ).rejects.toThrow('notificationId cannot be empty');
    });

    it('should handle notification with various types', async () => {
      // Arrange
      const notificationTypes: Array<'like' | 'comment' | 'follow' | 'mention'> = [
        'like',
        'comment',
        'follow',
        'mention',
      ];

      for (const type of notificationTypes) {
        const notificationId = `notif-${type}`;
        const userId = 'user-456';
        const notification = createMockNotification({
          id: notificationId,
          userId,
          type,
          isRead: false,
        });

        vi.mocked(notificationRepository.findById).mockResolvedValue(notification);
        vi.mocked(notificationRepository.markAsRead).mockResolvedValue();

        // Act & Assert - should work for all notification types
        await expect(
          usecase.execute({ notificationId, userId })
        ).resolves.not.toThrow();
      }
    });
  });

  describe('create factory method', () => {
    it('should create a MarkNotificationRead instance with valid dependencies', () => {
      const instance = MarkNotificationRead.create(notificationRepository);
      expect(instance).toBeInstanceOf(MarkNotificationRead);
    });
  });

  describe('MarkNotificationReadError', () => {
    it('should have correct name property', () => {
      const error = new MarkNotificationReadError('test error');
      expect(error.name).toBe('MarkNotificationReadError');
    });

    it('should preserve error message', () => {
      const error = new MarkNotificationReadError('specific error message');
      expect(error.message).toBe('specific error message');
    });

    it('should be instanceof Error', () => {
      const error = new MarkNotificationReadError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof MarkNotificationReadError', () => {
      const error = new MarkNotificationReadError('test');
      expect(error).toBeInstanceOf(MarkNotificationReadError);
    });
  });
});
