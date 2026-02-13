/**
 * InMemoryNotificationRepository テスト
 *
 * NotificationRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、ユーザー別取得、既読管理、ページネーション、エッジケース
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-notification-repository';
import { Notification } from '../../../../../src/domain/entities/notification';
import { PortError } from '../../../../../src/usecase/ports/types';

describe('InMemoryNotificationRepository', () => {
  let repository: InMemoryNotificationRepository;

  // テストヘルパー: 有効な通知プロパティを生成
  const createNotificationProps = (overrides: Partial<{
    id: string;
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'mention';
    actorId: string;
    targetId: string;
    isRead: boolean;
    createdAt: Date;
  }> = {}) => ({
    id: overrides.id ?? 'notif-123',
    userId: overrides.userId ?? 'user-456',
    type: overrides.type ?? 'like',
    actorId: overrides.actorId ?? 'actor-789',
    targetId: overrides.targetId ?? 'target-000',
    isRead: overrides.isRead ?? false,
    createdAt: overrides.createdAt ?? new Date('2024-01-15T00:00:00Z'),
  });

  // テストヘルパー: 通知を作成
  const createNotification = (overrides: Partial<{
    id: string;
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'mention';
    actorId: string;
    targetId: string;
    isRead: boolean;
    createdAt: Date;
  }> = {}) => Notification.create(createNotificationProps(overrides));

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
  });

  describe('save()', () => {
    it('新規通知を保存できる', async () => {
      const notification = createNotification();
      const saved = await repository.save(notification);

      expect(saved).toBe(notification);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('複数の通知を保存できる', async () => {
      const notif1 = createNotification({ id: 'n1' });
      const notif2 = createNotification({ id: 'n2' });
      const notif3 = createNotification({ id: 'n3' });

      await repository.save(notif1);
      await repository.save(notif2);
      await repository.save(notif3);

      expect(repository.getAll()).toHaveLength(3);
    });

    it('異なるタイプの通知を保存できる', async () => {
      await repository.save(createNotification({ id: 'n1', type: 'like' }));
      await repository.save(createNotification({ id: 'n2', type: 'comment' }));
      await repository.save(createNotification({ id: 'n3', type: 'follow' }));
      await repository.save(createNotification({ id: 'n4', type: 'mention' }));

      expect(repository.getAll()).toHaveLength(4);
    });

    it('同じIDで上書き保存できる', async () => {
      const notif1 = createNotification({ id: 'n1', isRead: false });
      await repository.save(notif1);

      const notif2 = createNotification({ id: 'n1', isRead: true });
      await repository.save(notif2);

      expect(repository.getAll()).toHaveLength(1);
      const found = await repository.findById('n1');
      expect(found?.isRead).toBe(true);
    });
  });

  describe('findById()', () => {
    it('存在する通知を取得できる', async () => {
      const notification = createNotification({ id: 'find-me' });
      await repository.save(notification);

      const found = await repository.findById('find-me');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('find-me');
    });

    it('存在しないIDでnullを返す', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByUser()', () => {
    beforeEach(async () => {
      // テストデータを準備
      // user-1: 5件の通知（3件未読、2件既読）
      await repository.save(createNotification({
        id: 'n1',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date('2024-01-10T00:00:00Z'),
      }));
      await repository.save(createNotification({
        id: 'n2',
        userId: 'user-1',
        isRead: true,
        createdAt: new Date('2024-01-11T00:00:00Z'),
      }));
      await repository.save(createNotification({
        id: 'n3',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date('2024-01-12T00:00:00Z'),
      }));
      await repository.save(createNotification({
        id: 'n4',
        userId: 'user-1',
        isRead: true,
        createdAt: new Date('2024-01-13T00:00:00Z'),
      }));
      await repository.save(createNotification({
        id: 'n5',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date('2024-01-14T00:00:00Z'),
      }));
      // user-2: 1件の通知
      await repository.save(createNotification({
        id: 'n6',
        userId: 'user-2',
        isRead: false,
        createdAt: new Date('2024-01-15T00:00:00Z'),
      }));
    });

    it('ユーザーの未読通知のみを返す（デフォルト）', async () => {
      const result = await repository.findByUser('user-1');

      expect(result.items.length).toBe(3);
      expect(result.items.every(n => !n.isRead)).toBe(true);
    });

    it('includeRead=trueで既読通知も含む', async () => {
      const result = await repository.findByUser('user-1', { includeRead: true });

      expect(result.items.length).toBe(5);
    });

    it('新しい順でソートされる', async () => {
      const result = await repository.findByUser('user-1', { includeRead: true });

      expect(result.items[0].id).toBe('n5');
      expect(result.items[4].id).toBe('n1');
    });

    it('ページネーションが正しく機能する', async () => {
      const result = await repository.findByUser('user-1', {
        includeRead: true,
        page: 1,
        limit: 2,
      });

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('2ページ目を取得できる', async () => {
      const result = await repository.findByUser('user-1', {
        includeRead: true,
        page: 2,
        limit: 2,
      });

      expect(result.items.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('最後のページではhasMore=false', async () => {
      const result = await repository.findByUser('user-1', {
        includeRead: true,
        page: 3,
        limit: 2,
      });

      expect(result.items.length).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('存在しないユーザーで空の結果を返す', async () => {
      const result = await repository.findByUser('non-existent');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('別のユーザーの通知は含まない', async () => {
      const result = await repository.findByUser('user-2', { includeRead: true });

      expect(result.items.length).toBe(1);
      expect(result.items[0].userId).toBe('user-2');
    });
  });

  describe('markAsRead()', () => {
    it('通知を既読にできる', async () => {
      const notification = createNotification({ id: 'to-read', isRead: false });
      await repository.save(notification);

      await repository.markAsRead('to-read');

      const found = await repository.findById('to-read');
      expect(found?.isRead).toBe(true);
    });

    it('既に既読の通知も問題なく処理できる', async () => {
      const notification = createNotification({ id: 'already-read', isRead: true });
      await repository.save(notification);

      await repository.markAsRead('already-read');

      const found = await repository.findById('already-read');
      expect(found?.isRead).toBe(true);
    });

    it('存在しないIDでPortErrorをスローする', async () => {
      await expect(repository.markAsRead('non-existent')).rejects.toThrow(PortError);
      await expect(repository.markAsRead('non-existent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('markAllAsRead()', () => {
    beforeEach(async () => {
      // user-1: 3件の未読通知
      await repository.save(createNotification({ id: 'n1', userId: 'user-1', isRead: false }));
      await repository.save(createNotification({ id: 'n2', userId: 'user-1', isRead: false }));
      await repository.save(createNotification({ id: 'n3', userId: 'user-1', isRead: true }));
      // user-2: 1件の未読通知
      await repository.save(createNotification({ id: 'n4', userId: 'user-2', isRead: false }));
    });

    it('ユーザーの全通知を既読にできる', async () => {
      await repository.markAllAsRead('user-1');

      // findByIdで個別に確認（findByUserはソート時にcreatedAtにアクセスするため）
      const n1 = await repository.findById('n1');
      const n2 = await repository.findById('n2');
      const n3 = await repository.findById('n3');

      expect(n1?.isRead).toBe(true);
      expect(n2?.isRead).toBe(true);
      expect(n3?.isRead).toBe(true);
    });

    it('他のユーザーの通知は影響を受けない', async () => {
      await repository.markAllAsRead('user-1');

      const result = await repository.findByUser('user-2', { includeRead: true });
      expect(result.items[0].isRead).toBe(false);
    });

    it('通知がないユーザーでもエラーにならない', async () => {
      await expect(repository.markAllAsRead('non-existent')).resolves.not.toThrow();
    });

    it('既に全て既読の場合でも問題なく処理できる', async () => {
      await repository.markAllAsRead('user-1');
      await repository.markAllAsRead('user-1'); // 2回目

      // findByIdで個別に確認
      const n1 = await repository.findById('n1');
      const n2 = await repository.findById('n2');
      const n3 = await repository.findById('n3');

      expect(n1?.isRead).toBe(true);
      expect(n2?.isRead).toBe(true);
      expect(n3?.isRead).toBe(true);
    });
  });

  describe('clear()', () => {
    it('全ての通知を削除する', async () => {
      await repository.save(createNotification({ id: 'n1' }));
      await repository.save(createNotification({ id: 'n2' }));

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('ユーザーインデックスもクリアされる', async () => {
      await repository.save(createNotification({ id: 'n1', userId: 'user-1' }));

      repository.clear();

      const result = await repository.findByUser('user-1');
      expect(result.items).toHaveLength(0);
    });

    it('空の状態でもエラーにならない', () => {
      expect(() => repository.clear()).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('保存された全通知を返す', async () => {
      await repository.save(createNotification({ id: 'n1' }));
      await repository.save(createNotification({ id: 'n2' }));
      await repository.save(createNotification({ id: 'n3' }));

      const all = repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('大量の通知を処理できる', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) =>
        createNotification({
          id: `notif-${i}`,
          userId: 'user-1',
          isRead: i % 2 === 0, // 偶数は既読
        })
      );

      for (const notification of notifications) {
        await repository.save(notification);
      }

      expect(repository.getAll()).toHaveLength(100);

      // 未読のみ取得
      const unreadResult = await repository.findByUser('user-1');
      expect(unreadResult.total).toBe(50);

      // 全件取得
      const allResult = await repository.findByUser('user-1', { includeRead: true });
      expect(allResult.total).toBe(100);
    });

    it('複数ユーザーの通知を正しく管理できる', async () => {
      // 5人のユーザーにそれぞれ10件の通知
      for (let u = 0; u < 5; u++) {
        for (let n = 0; n < 10; n++) {
          await repository.save(createNotification({
            id: `notif-u${u}-n${n}`,
            userId: `user-${u}`,
          }));
        }
      }

      expect(repository.getAll()).toHaveLength(50);

      for (let u = 0; u < 5; u++) {
        const result = await repository.findByUser(`user-${u}`);
        expect(result.total).toBe(10);
      }
    });

    it('全タイプの通知を正しく処理できる', async () => {
      await repository.save(createNotification({ id: 'n1', type: 'like', userId: 'user-1' }));
      await repository.save(createNotification({ id: 'n2', type: 'comment', userId: 'user-1' }));
      await repository.save(createNotification({ id: 'n3', type: 'follow', userId: 'user-1' }));
      await repository.save(createNotification({ id: 'n4', type: 'mention', userId: 'user-1' }));

      const result = await repository.findByUser('user-1');

      expect(result.items).toHaveLength(4);
      const types = result.items.map(n => n.type);
      expect(types).toContain('like');
      expect(types).toContain('comment');
      expect(types).toContain('follow');
      expect(types).toContain('mention');
    });

    it('markAsRead後の状態を確認できる', async () => {
      await repository.save(createNotification({ id: 'n1', userId: 'user-1', isRead: false }));
      await repository.save(createNotification({ id: 'n2', userId: 'user-1', isRead: false }));
      await repository.save(createNotification({ id: 'n3', userId: 'user-1', isRead: false }));

      await repository.markAsRead('n1');

      // findByIdで個別に確認
      const n1 = await repository.findById('n1');
      const n2 = await repository.findById('n2');
      const n3 = await repository.findById('n3');

      expect(n1?.isRead).toBe(true);
      expect(n2?.isRead).toBe(false);
      expect(n3?.isRead).toBe(false);
    });

    it('ページネーションの境界値を正しく処理する', async () => {
      // ちょうど20件（デフォルトlimit）
      for (let i = 0; i < 20; i++) {
        await repository.save(createNotification({
          id: `notif-${i}`,
          userId: 'user-1',
          createdAt: new Date(2024, 0, i + 1),
        }));
      }

      const result = await repository.findByUser('user-1');

      expect(result.items.length).toBe(20);
      expect(result.total).toBe(20);
      expect(result.hasMore).toBe(false);
    });
  });
});
