/**
 * MockNotificationGateway Tests
 *
 * Mock Notification Gatewayの単体テスト
 * - 単一通知送信
 * - 一括通知送信
 * - 部分失敗シナリオ
 * - ヘルパーメソッド
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockNotificationGateway,
  type SentNotification,
} from '../../../../src/infra/gateways/mock/mock-notification-gateway.js';
import {
  PortError,
  type NotificationPayload,
  type BulkNotificationResult,
} from '../../../../src/usecase/ports/types.js';

describe('MockNotificationGateway', () => {
  let gateway: MockNotificationGateway;

  // テスト用のペイロードを作成
  function createPayload(overrides?: Partial<NotificationPayload>): NotificationPayload {
    return {
      type: 'like',
      title: 'Test Notification',
      body: 'Test notification body',
      ...overrides,
    };
  }

  beforeEach(() => {
    gateway = new MockNotificationGateway();
  });

  // ========================================
  // notify テスト
  // ========================================

  describe('notify', () => {
    it('単一ユーザーに通知を送信できること', async () => {
      // Arrange
      const userId = 'user-123';
      const payload = createPayload({ type: 'like', title: 'New Like' });

      // Act
      await gateway.notify(userId, payload);

      // Assert
      const notifications = gateway.getSentNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        userId,
        payload,
      });
    });

    it('送信日時が記録されること', async () => {
      const before = new Date();
      await gateway.notify('user-123', createPayload());
      const after = new Date();

      const notifications = gateway.getSentNotifications();
      expect(notifications[0].sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(notifications[0].sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('様々な通知タイプを送信できること', async () => {
      await gateway.notify('user-1', createPayload({ type: 'like' }));
      await gateway.notify('user-2', createPayload({ type: 'comment' }));
      await gateway.notify('user-3', createPayload({ type: 'follow' }));
      await gateway.notify('user-4', createPayload({ type: 'mention' }));
      await gateway.notify('user-5', createPayload({ type: 'system' }));

      const notifications = gateway.getSentNotifications();
      expect(notifications).toHaveLength(5);
      expect(notifications[0].payload.type).toBe('like');
      expect(notifications[1].payload.type).toBe('comment');
      expect(notifications[2].payload.type).toBe('follow');
      expect(notifications[3].payload.type).toBe('mention');
      expect(notifications[4].payload.type).toBe('system');
    });

    it('actionUrlを含むペイロードを送信できること', async () => {
      const payload = createPayload({
        actionUrl: 'https://example.com/posts/123',
      });

      await gateway.notify('user-123', payload);

      const notifications = gateway.getSentNotifications();
      expect(notifications[0].payload.actionUrl).toBe('https://example.com/posts/123');
    });

    it('metadataを含むペイロードを送信できること', async () => {
      const payload = createPayload({
        metadata: {
          postId: 'post-123',
          likerId: 'user-456',
        },
      });

      await gateway.notify('user-123', payload);

      const notifications = gateway.getSentNotifications();
      expect(notifications[0].payload.metadata).toEqual({
        postId: 'post-123',
        likerId: 'user-456',
      });
    });

    describe('shouldFail', () => {
      it('shouldFailがtrueの場合にエラーになること', async () => {
        gateway.setShouldFail(true);

        await expect(
          gateway.notify('user-123', createPayload())
        ).rejects.toThrow(PortError);
      });

      it('エラーコードがSEND_FAILEDであること', async () => {
        gateway.setShouldFail(true);

        try {
          await gateway.notify('user-123', createPayload());
        } catch (error) {
          expect((error as PortError).code).toBe('SEND_FAILED');
        }
      });

      it('エラー時に通知が保存されないこと', async () => {
        gateway.setShouldFail(true);

        try {
          await gateway.notify('user-123', createPayload());
        } catch {
          // Expected
        }

        expect(gateway.getSentNotifications()).toHaveLength(0);
      });
    });

    describe('failingUserIds', () => {
      it('特定のユーザーIDのみ失敗させられること', async () => {
        gateway.setFailingUserIds(['user-fail']);

        // 成功するユーザー
        await expect(
          gateway.notify('user-success', createPayload())
        ).resolves.not.toThrow();

        // 失敗するユーザー
        await expect(
          gateway.notify('user-fail', createPayload())
        ).rejects.toThrow(PortError);
      });

      it('複数のユーザーIDを失敗させられること', async () => {
        gateway.setFailingUserIds(['user-1', 'user-2', 'user-3']);

        await expect(gateway.notify('user-1', createPayload())).rejects.toThrow();
        await expect(gateway.notify('user-2', createPayload())).rejects.toThrow();
        await expect(gateway.notify('user-3', createPayload())).rejects.toThrow();
        await expect(gateway.notify('user-4', createPayload())).resolves.not.toThrow();
      });

      it('エラーメッセージにユーザーIDが含まれること', async () => {
        gateway.setFailingUserIds(['user-123']);

        try {
          await gateway.notify('user-123', createPayload());
        } catch (error) {
          expect((error as Error).message).toContain('user-123');
        }
      });
    });
  });

  // ========================================
  // notifyBulk テスト
  // ========================================

  describe('notifyBulk', () => {
    it('複数ユーザーに一括通知を送信できること', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      const payload = createPayload({ type: 'system' });

      // Act
      const result = await gateway.notifyBulk(userIds, payload);

      // Assert
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.failedUserIds).toEqual([]);

      const notifications = gateway.getSentNotifications();
      expect(notifications).toHaveLength(3);
    });

    it('空のユーザーIDリストでも動作すること', async () => {
      const result = await gateway.notifyBulk([], createPayload());

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.failedUserIds).toEqual([]);
    });

    it('全てのユーザーに同じペイロードが送信されること', async () => {
      const payload = createPayload({
        type: 'mention',
        title: 'You were mentioned',
        body: '@you check this out',
      });

      await gateway.notifyBulk(['user-1', 'user-2', 'user-3'], payload);

      const notifications = gateway.getSentNotifications();
      for (const notification of notifications) {
        expect(notification.payload).toEqual(payload);
      }
    });

    describe('部分失敗', () => {
      it('一部のユーザーのみ失敗する場合の結果を返すこと', async () => {
        gateway.setFailingUserIds(['user-2', 'user-4']);

        const result = await gateway.notifyBulk(
          ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
          createPayload()
        );

        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(2);
        expect(result.failedUserIds).toEqual(['user-2', 'user-4']);
      });

      it('失敗したユーザーの通知は保存されないこと', async () => {
        gateway.setFailingUserIds(['user-2']);

        await gateway.notifyBulk(['user-1', 'user-2', 'user-3'], createPayload());

        const notifications = gateway.getSentNotifications();
        const userIds = notifications.map((n) => n.userId);
        expect(userIds).toContain('user-1');
        expect(userIds).not.toContain('user-2');
        expect(userIds).toContain('user-3');
      });
    });

    describe('shouldFail', () => {
      it('shouldFailがtrueの場合は全員失敗すること', async () => {
        gateway.setShouldFail(true);

        const result = await gateway.notifyBulk(
          ['user-1', 'user-2', 'user-3'],
          createPayload()
        );

        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(3);
        expect(result.failedUserIds).toEqual(['user-1', 'user-2', 'user-3']);
      });

      it('shouldFailがtrueの場合は通知が保存されないこと', async () => {
        gateway.setShouldFail(true);

        await gateway.notifyBulk(['user-1', 'user-2', 'user-3'], createPayload());

        expect(gateway.getSentNotifications()).toHaveLength(0);
      });
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('送信済み通知をクリアできること', async () => {
      await gateway.notify('user-123', createPayload());
      expect(gateway.getSentNotifications()).toHaveLength(1);

      gateway.clear();

      expect(gateway.getSentNotifications()).toHaveLength(0);
    });

    it('shouldFailフラグもリセットされること', async () => {
      gateway.setShouldFail(true);
      gateway.clear();

      await expect(
        gateway.notify('user-123', createPayload())
      ).resolves.not.toThrow();
    });

    it('failingUserIdsもリセットされること', async () => {
      gateway.setFailingUserIds(['user-123']);
      gateway.clear();

      await expect(
        gateway.notify('user-123', createPayload())
      ).resolves.not.toThrow();
    });
  });

  describe('getSentNotifications', () => {
    it('空の場合は空配列を返すこと', () => {
      expect(gateway.getSentNotifications()).toEqual([]);
    });

    it('送信順に返すこと', async () => {
      await gateway.notify('user-1', createPayload({ title: 'First' }));
      await gateway.notify('user-2', createPayload({ title: 'Second' }));
      await gateway.notify('user-3', createPayload({ title: 'Third' }));

      const notifications = gateway.getSentNotifications();
      expect(notifications[0].payload.title).toBe('First');
      expect(notifications[1].payload.title).toBe('Second');
      expect(notifications[2].payload.title).toBe('Third');
    });
  });

  describe('setShouldFail', () => {
    it('falseに設定後は正常に送信できること', async () => {
      gateway.setShouldFail(true);
      gateway.setShouldFail(false);

      await expect(
        gateway.notify('user-123', createPayload())
      ).resolves.not.toThrow();
    });
  });

  describe('setFailingUserIds', () => {
    it('新しいリストで上書きされること', async () => {
      gateway.setFailingUserIds(['user-1', 'user-2']);
      gateway.setFailingUserIds(['user-3']); // 上書き

      // user-1, user-2 は成功
      await expect(gateway.notify('user-1', createPayload())).resolves.not.toThrow();
      await expect(gateway.notify('user-2', createPayload())).resolves.not.toThrow();
      // user-3 は失敗
      await expect(gateway.notify('user-3', createPayload())).rejects.toThrow();
    });

    it('空配列で失敗ユーザーをクリアできること', async () => {
      gateway.setFailingUserIds(['user-123']);
      gateway.setFailingUserIds([]);

      await expect(
        gateway.notify('user-123', createPayload())
      ).resolves.not.toThrow();
    });
  });

  // ========================================
  // エッジケース テスト
  // ========================================

  describe('エッジケース', () => {
    it('空文字列のユーザーIDでも送信できること', async () => {
      await gateway.notify('', createPayload());
      expect(gateway.getSentNotifications()[0].userId).toBe('');
    });

    it('空文字列のタイトルとボディでも送信できること', async () => {
      await gateway.notify('user-123', createPayload({ title: '', body: '' }));

      const notifications = gateway.getSentNotifications();
      expect(notifications[0].payload.title).toBe('');
      expect(notifications[0].payload.body).toBe('');
    });

    it('非常に長いボディでも送信できること', async () => {
      const longBody = 'a'.repeat(10000);
      await gateway.notify('user-123', createPayload({ body: longBody }));

      expect(gateway.getSentNotifications()[0].payload.body).toBe(longBody);
    });

    it('同じユーザーに複数回通知を送信できること', async () => {
      await gateway.notify('user-123', createPayload({ title: 'First' }));
      await gateway.notify('user-123', createPayload({ title: 'Second' }));
      await gateway.notify('user-123', createPayload({ title: 'Third' }));

      const notifications = gateway.getSentNotifications();
      expect(notifications.filter((n) => n.userId === 'user-123')).toHaveLength(3);
    });

    it('notifyとnotifyBulkを混在して使用できること', async () => {
      await gateway.notify('user-1', createPayload());
      await gateway.notifyBulk(['user-2', 'user-3'], createPayload());
      await gateway.notify('user-4', createPayload());

      expect(gateway.getSentNotifications()).toHaveLength(4);
    });

    it('大量のユーザーに一括送信できること', async () => {
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);

      const result = await gateway.notifyBulk(userIds, createPayload());

      expect(result.successCount).toBe(1000);
      expect(gateway.getSentNotifications()).toHaveLength(1000);
    });
  });
});
