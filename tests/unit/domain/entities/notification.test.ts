/**
 * Notification Entity Tests
 *
 * TDD-first tests for Notification entity following DDD principles.
 * Tests cover: creation, validation, getters, markAsRead, immutability, equals
 */

import { describe, it, expect } from 'vitest';
import {
  Notification,
  InvalidNotificationError,
  NotificationType,
} from '../../../../src/domain/entities/notification';

describe('Notification Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'notif-123',
    userId: 'user-receiver',
    type: 'like' as NotificationType,
    actorId: 'user-actor',
    targetId: 'post-456',
    isRead: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  });

  describe('Notification.create()', () => {
    it('creates a valid Notification with all properties', () => {
      const props = createValidProps();
      const notification = Notification.create(props);

      expect(notification.id).toBe('notif-123');
      expect(notification.userId).toBe('user-receiver');
      expect(notification.type).toBe('like');
      expect(notification.actorId).toBe('user-actor');
      expect(notification.targetId).toBe('post-456');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('creates Notification with type "like"', () => {
      const props = { ...createValidProps(), type: 'like' as NotificationType };
      const notification = Notification.create(props);

      expect(notification.type).toBe('like');
    });

    it('creates Notification with type "comment"', () => {
      const props = { ...createValidProps(), type: 'comment' as NotificationType };
      const notification = Notification.create(props);

      expect(notification.type).toBe('comment');
    });

    it('creates Notification with type "follow"', () => {
      const props = { ...createValidProps(), type: 'follow' as NotificationType };
      const notification = Notification.create(props);

      expect(notification.type).toBe('follow');
    });

    it('creates Notification with type "mention"', () => {
      const props = { ...createValidProps(), type: 'mention' as NotificationType };
      const notification = Notification.create(props);

      expect(notification.type).toBe('mention');
    });

    it('creates Notification with isRead true', () => {
      const props = { ...createValidProps(), isRead: true };
      const notification = Notification.create(props);

      expect(notification.isRead).toBe(true);
    });

    it('throws InvalidNotificationError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidNotificationError for whitespace-only id', () => {
      const props = { ...createValidProps(), id: '   ' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidNotificationError for empty userId', () => {
      const props = { ...createValidProps(), userId: '' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('userId cannot be empty');
    });

    it('throws InvalidNotificationError for whitespace-only userId', () => {
      const props = { ...createValidProps(), userId: '   ' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('userId cannot be empty');
    });

    it('throws InvalidNotificationError for empty actorId', () => {
      const props = { ...createValidProps(), actorId: '' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('actorId cannot be empty');
    });

    it('throws InvalidNotificationError for whitespace-only actorId', () => {
      const props = { ...createValidProps(), actorId: '   ' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('actorId cannot be empty');
    });

    it('throws InvalidNotificationError for empty targetId', () => {
      const props = { ...createValidProps(), targetId: '' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('targetId cannot be empty');
    });

    it('throws InvalidNotificationError for whitespace-only targetId', () => {
      const props = { ...createValidProps(), targetId: '   ' };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('targetId cannot be empty');
    });

    it('throws InvalidNotificationError for invalid type', () => {
      const props = { ...createValidProps(), type: 'invalid' as NotificationType };

      expect(() => Notification.create(props)).toThrow(InvalidNotificationError);
      expect(() => Notification.create(props)).toThrow('type must be one of');
    });
  });

  describe('Notification.reconstruct()', () => {
    it('reconstructs a Notification from persisted data', () => {
      const props = createValidProps();
      const notification = Notification.reconstruct(props);

      expect(notification.id).toBe('notif-123');
      expect(notification.userId).toBe('user-receiver');
      expect(notification.type).toBe('like');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = Notification.create(props);
      const reconstructed = Notification.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });

    it('still validates data on reconstruct', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Notification.reconstruct(props)).toThrow(InvalidNotificationError);
    });
  });

  describe('markAsRead()', () => {
    it('returns a new Notification with isRead set to true', () => {
      const props = { ...createValidProps(), isRead: false };
      const notification = Notification.create(props);
      const readNotification = notification.markAsRead();

      expect(readNotification.isRead).toBe(true);
      expect(notification.isRead).toBe(false); // Original unchanged
    });

    it('returns a new instance even if already read', () => {
      const props = { ...createValidProps(), isRead: true };
      const notification = Notification.create(props);
      const readNotification = notification.markAsRead();

      expect(readNotification.isRead).toBe(true);
      expect(notification).not.toBe(readNotification);
    });

    it('preserves all other properties', () => {
      const notification = Notification.create(createValidProps());
      const readNotification = notification.markAsRead();

      expect(readNotification.id).toBe(notification.id);
      expect(readNotification.userId).toBe(notification.userId);
      expect(readNotification.type).toBe(notification.type);
      expect(readNotification.actorId).toBe(notification.actorId);
      expect(readNotification.targetId).toBe(notification.targetId);
      expect(readNotification.createdAt.getTime()).toBe(notification.createdAt.getTime());
    });
  });

  describe('Getters (immutability)', () => {
    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const notification = Notification.create(props);

      const date1 = notification.createdAt;
      const date2 = notification.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('modifying returned Date does not affect entity', () => {
      const props = createValidProps();
      const notification = Notification.create(props);

      const date = notification.createdAt;
      date.setFullYear(2000);

      expect(notification.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('equals()', () => {
    it('returns true for Notifications with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), userId: 'different-user' };
      const notification1 = Notification.create(props1);
      const notification2 = Notification.create(props2);

      expect(notification1.equals(notification2)).toBe(true);
    });

    it('returns false for Notifications with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const notification1 = Notification.create(props1);
      const notification2 = Notification.create(props2);

      expect(notification1.equals(notification2)).toBe(false);
    });

    it('returns true for the same Notification instance', () => {
      const notification = Notification.create(createValidProps());

      expect(notification.equals(notification)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('Notification instance is frozen', () => {
      const notification = Notification.create(createValidProps());

      expect(Object.isFrozen(notification)).toBe(true);
    });

    it('cannot add new properties to Notification', () => {
      const notification = Notification.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        notification.newProp = 'value';
      }).toThrow();
    });

    it('cannot modify existing properties', () => {
      const notification = Notification.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        notification._id = 'new-id';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles Date objects correctly across timezones', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date };
      const notification = Notification.create(props);

      expect(notification.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('handles unicode characters in ids', () => {
      const props = {
        ...createValidProps(),
        userId: 'user-',
        actorId: 'actor-',
        targetId: 'target-',
      };
      const notification = Notification.create(props);

      expect(notification.userId).toBe('user-');
      expect(notification.actorId).toBe('actor-');
      expect(notification.targetId).toBe('target-');
    });

    it('allows same userId and actorId (self-notification for own actions)', () => {
      const props = {
        ...createValidProps(),
        userId: 'same-user',
        actorId: 'same-user',
      };
      // This is allowed - user can receive notifications about their own actions
      const notification = Notification.create(props);

      expect(notification.userId).toBe('same-user');
      expect(notification.actorId).toBe('same-user');
    });
  });
});
