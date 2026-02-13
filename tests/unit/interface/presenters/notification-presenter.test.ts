/**
 * Notification Presenter Unit Tests
 *
 * TDD tests for NotificationPresenter class.
 * Tests notification entity formatting for API responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationPresenter } from '../../../../src/interface/presenters/notification-presenter.js';
import { Notification, type NotificationType } from '../../../../src/domain/entities/notification.js';

// ========================================
// Mock Data Factory
// ========================================
function createMockNotification(overrides: Partial<{
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  targetId: string;
  isRead: boolean;
  createdAt: Date;
}> = {}): Notification {
  return Notification.create({
    id: overrides.id ?? 'notif-123',
    userId: overrides.userId ?? 'user-receiver',
    type: overrides.type ?? 'like',
    actorId: overrides.actorId ?? 'user-actor',
    targetId: overrides.targetId ?? 'post-123',
    isRead: overrides.isRead ?? false,
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z'),
  });
}

// ========================================
// Test: toOutput method
// ========================================
describe('NotificationPresenter.toOutput', () => {
  it('returns correct notification output structure', () => {
    const notification = createMockNotification();
    const result = NotificationPresenter.toOutput(notification);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('relatedUserId');
    expect(result).toHaveProperty('relatedPostId');
    expect(result).toHaveProperty('isRead');
    expect(result).toHaveProperty('createdAt');
  });

  it('formats notification id correctly', () => {
    const notification = createMockNotification({ id: 'notif-abc-123' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('notif-abc-123');
  });

  it('formats type correctly', () => {
    const notification = createMockNotification({ type: 'comment' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.type).toBe('comment');
  });

  it('formats relatedUserId from actorId', () => {
    const notification = createMockNotification({ actorId: 'actor-456' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.relatedUserId).toBe('actor-456');
  });

  it('formats relatedPostId from targetId', () => {
    const notification = createMockNotification({ targetId: 'post-789' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.relatedPostId).toBe('post-789');
  });

  it('formats isRead correctly for unread notification', () => {
    const notification = createMockNotification({ isRead: false });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.isRead).toBe(false);
  });

  it('formats isRead correctly for read notification', () => {
    const notification = createMockNotification({ isRead: true });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.isRead).toBe(true);
  });

  it('formats createdAt as ISO string', () => {
    const date = new Date('2025-06-15T12:30:00.000Z');
    const notification = createMockNotification({ createdAt: date });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.createdAt).toBe('2025-06-15T12:30:00.000Z');
  });
});

// ========================================
// Test: generateMessage for each notification type
// ========================================
describe('NotificationPresenter generateMessage', () => {
  it('generates correct message for like notification', () => {
    const notification = createMockNotification({ type: 'like' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.message).toBe('あなたの投稿にいいねがつきました');
  });

  it('generates correct message for comment notification', () => {
    const notification = createMockNotification({ type: 'comment' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.message).toBe('あなたの投稿にコメントがつきました');
  });

  it('generates correct message for follow notification', () => {
    const notification = createMockNotification({ type: 'follow' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.message).toBe('新しいフォロワーがいます');
  });

  it('generates correct message for mention notification', () => {
    const notification = createMockNotification({ type: 'mention' });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.message).toBe('あなたがメンションされました');
  });

  it('generates default message for unknown notification type', () => {
    // Create notification with valid type first
    const notification = createMockNotification({ type: 'like' });

    // Manually override the type for testing edge case
    // This tests the default case in the switch statement
    const modifiedNotification = {
      ...notification,
      get type() { return 'unknown' as NotificationType; },
      get id() { return notification.id; },
      get userId() { return notification.userId; },
      get actorId() { return notification.actorId; },
      get targetId() { return notification.targetId; },
      get isRead() { return notification.isRead; },
      get createdAt() { return notification.createdAt; },
    } as Notification;

    const result = NotificationPresenter.toOutput(modifiedNotification);

    expect(result.message).toBe('新しい通知があります');
  });
});

// ========================================
// Test: format method
// ========================================
describe('NotificationPresenter.format', () => {
  it('returns success response with notification data', () => {
    const notification = createMockNotification();
    const result = NotificationPresenter.format(notification);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes full notification output in data', () => {
    const notification = createMockNotification({
      id: 'notif-format-123',
      type: 'comment',
    });
    const result = NotificationPresenter.format(notification);

    expect(result.data.id).toBe('notif-format-123');
    expect(result.data.type).toBe('comment');
    expect(result.data.message).toBe('あなたの投稿にコメントがつきました');
  });

  it('data structure matches toOutput result', () => {
    const notification = createMockNotification();
    const formatResult = NotificationPresenter.format(notification);
    const toOutputResult = NotificationPresenter.toOutput(notification);

    expect(formatResult.data).toEqual(toOutputResult);
  });
});

// ========================================
// Test: formatPaginated method
// ========================================
describe('NotificationPresenter.formatPaginated', () => {
  let notifications: Notification[];

  beforeEach(() => {
    notifications = [
      createMockNotification({ id: 'notif-1', type: 'like' }),
      createMockNotification({ id: 'notif-2', type: 'comment' }),
      createMockNotification({ id: 'notif-3', type: 'follow' }),
    ];
  });

  it('returns success response with paginated data', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 3);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('formats all notifications in data array', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 3);

    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe('notif-1');
    expect(result.data[1].id).toBe('notif-2');
    expect(result.data[2].id).toBe('notif-3');
  });

  it('includes correct messages for each notification type', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 3);

    expect(result.data[0].message).toBe('あなたの投稿にいいねがつきました');
    expect(result.data[1].message).toBe('あなたの投稿にコメントがつきました');
    expect(result.data[2].message).toBe('新しいフォロワーがいます');
  });

  it('includes correct pagination metadata', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 2, 20, 50);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.total).toBe(50);
  });

  it('calculates hasMore correctly when more pages exist', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 30);

    expect(result.meta.hasMore).toBe(true);
  });

  it('calculates hasMore correctly when no more pages', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 3, 10, 25);

    expect(result.meta.hasMore).toBe(false);
  });

  it('calculates hasMore correctly at exact boundary', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 10);

    expect(result.meta.hasMore).toBe(false);
  });

  it('handles empty notifications array', () => {
    const result = NotificationPresenter.formatPaginated([], 1, 10, 0);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('data items match toOutput format', () => {
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 3);

    for (let i = 0; i < notifications.length; i++) {
      const expected = NotificationPresenter.toOutput(notifications[i]);
      expect(result.data[i]).toEqual(expected);
    }
  });

  it('handles mixed read/unread notifications', () => {
    const mixedNotifications = [
      createMockNotification({ id: 'notif-1', isRead: true }),
      createMockNotification({ id: 'notif-2', isRead: false }),
      createMockNotification({ id: 'notif-3', isRead: true }),
    ];
    const result = NotificationPresenter.formatPaginated(mixedNotifications, 1, 10, 3);

    expect(result.data[0].isRead).toBe(true);
    expect(result.data[1].isRead).toBe(false);
    expect(result.data[2].isRead).toBe(true);
  });
});

// ========================================
// Test: All notification types
// ========================================
describe('NotificationPresenter all notification types', () => {
  it('handles like notification completely', () => {
    const notification = createMockNotification({
      id: 'like-notif',
      type: 'like',
      actorId: 'liker-id',
      targetId: 'liked-post-id',
    });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('like-notif');
    expect(result.type).toBe('like');
    expect(result.message).toBe('あなたの投稿にいいねがつきました');
    expect(result.relatedUserId).toBe('liker-id');
    expect(result.relatedPostId).toBe('liked-post-id');
  });

  it('handles comment notification completely', () => {
    const notification = createMockNotification({
      id: 'comment-notif',
      type: 'comment',
      actorId: 'commenter-id',
      targetId: 'commented-post-id',
    });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('comment-notif');
    expect(result.type).toBe('comment');
    expect(result.message).toBe('あなたの投稿にコメントがつきました');
    expect(result.relatedUserId).toBe('commenter-id');
    expect(result.relatedPostId).toBe('commented-post-id');
  });

  it('handles follow notification completely', () => {
    const notification = createMockNotification({
      id: 'follow-notif',
      type: 'follow',
      actorId: 'follower-id',
      targetId: 'followed-user-id',
    });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('follow-notif');
    expect(result.type).toBe('follow');
    expect(result.message).toBe('新しいフォロワーがいます');
    expect(result.relatedUserId).toBe('follower-id');
    expect(result.relatedPostId).toBe('followed-user-id');
  });

  it('handles mention notification completely', () => {
    const notification = createMockNotification({
      id: 'mention-notif',
      type: 'mention',
      actorId: 'mentioner-id',
      targetId: 'mentioned-post-id',
    });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('mention-notif');
    expect(result.type).toBe('mention');
    expect(result.message).toBe('あなたがメンションされました');
    expect(result.relatedUserId).toBe('mentioner-id');
    expect(result.relatedPostId).toBe('mentioned-post-id');
  });
});

// ========================================
// Edge Cases
// ========================================
describe('NotificationPresenter edge cases', () => {
  it('handles notification with long IDs', () => {
    const longId = 'notif-' + 'a'.repeat(100);
    const notification = createMockNotification({ id: longId });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe(longId);
  });

  it('handles notification with special characters in IDs', () => {
    const notification = createMockNotification({
      id: 'notif-123-abc_def',
      actorId: 'user-456_xyz',
      targetId: 'post-789-abc',
    });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.id).toBe('notif-123-abc_def');
    expect(result.relatedUserId).toBe('user-456_xyz');
    expect(result.relatedPostId).toBe('post-789-abc');
  });

  it('handles very old notification date', () => {
    const oldDate = new Date('2020-01-01T00:00:00.000Z');
    const notification = createMockNotification({ createdAt: oldDate });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('handles future notification date', () => {
    const futureDate = new Date('2030-12-31T23:59:59.000Z');
    const notification = createMockNotification({ createdAt: futureDate });
    const result = NotificationPresenter.toOutput(notification);

    expect(result.createdAt).toBe('2030-12-31T23:59:59.000Z');
  });

  it('handles large pagination values', () => {
    const notifications = [createMockNotification()];
    const result = NotificationPresenter.formatPaginated(notifications, 1000, 100, 150000);

    expect(result.meta.page).toBe(1000);
    expect(result.meta.limit).toBe(100);
    expect(result.meta.total).toBe(150000);
    // page * limit = 1000 * 100 = 100000, total = 150000, so hasMore = true
    expect(result.meta.hasMore).toBe(true);
  });

  it('handles single notification in paginated response', () => {
    const notifications = [createMockNotification({ id: 'single-notif' })];
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 1);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('single-notif');
    expect(result.meta.total).toBe(1);
    expect(result.meta.hasMore).toBe(false);
  });

  it('preserves notification order in paginated response', () => {
    const notifications = [
      createMockNotification({ id: 'notif-1', type: 'like' }),
      createMockNotification({ id: 'notif-2', type: 'comment' }),
      createMockNotification({ id: 'notif-3', type: 'follow' }),
      createMockNotification({ id: 'notif-4', type: 'mention' }),
    ];
    const result = NotificationPresenter.formatPaginated(notifications, 1, 10, 4);

    expect(result.data.map(n => n.id)).toEqual(['notif-1', 'notif-2', 'notif-3', 'notif-4']);
  });
});
