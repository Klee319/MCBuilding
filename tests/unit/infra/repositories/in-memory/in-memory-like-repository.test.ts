/**
 * InMemoryLikeRepository テスト
 *
 * LikeRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、インデックス検索、エッジケース
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLikeRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-like-repository';
import { Like } from '../../../../../src/domain/entities/like';

describe('InMemoryLikeRepository', () => {
  let repository: InMemoryLikeRepository;

  // テストヘルパー: 有効ないいねプロパティを生成
  const createLikeProps = (overrides: Partial<{
    id: string;
    postId: string;
    userId: string;
    createdAt: Date;
  }> = {}) => ({
    id: overrides.id ?? 'like-123',
    postId: overrides.postId ?? 'post-456',
    userId: overrides.userId ?? 'user-789',
    createdAt: overrides.createdAt ?? new Date('2024-01-15T00:00:00Z'),
  });

  // テストヘルパー: いいねを作成
  const createLike = (overrides: Partial<{
    id: string;
    postId: string;
    userId: string;
    createdAt: Date;
  }> = {}) => Like.create(createLikeProps(overrides));

  beforeEach(() => {
    repository = new InMemoryLikeRepository();
  });

  describe('save()', () => {
    it('新規いいねを保存できる', async () => {
      const like = createLike();
      const saved = await repository.save(like);

      expect(saved).toBe(like);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('複数のいいねを保存できる', async () => {
      const like1 = createLike({ id: 'l1', postId: 'p1', userId: 'u1' });
      const like2 = createLike({ id: 'l2', postId: 'p1', userId: 'u2' });
      const like3 = createLike({ id: 'l3', postId: 'p2', userId: 'u1' });

      await repository.save(like1);
      await repository.save(like2);
      await repository.save(like3);

      expect(repository.getAll()).toHaveLength(3);
    });

    it('同じpost/userの組み合わせで上書き保存できる', async () => {
      const like1 = createLike({ id: 'l1', postId: 'p1', userId: 'u1' });
      const like2 = createLike({ id: 'l2', postId: 'p1', userId: 'u1' }); // 同じ組み合わせ

      await repository.save(like1);
      await repository.save(like2);

      // 同じキーで上書きされるので1件
      expect(repository.getAll()).toHaveLength(1);

      const found = await repository.findByPostAndUser('p1', 'u1');
      expect(found?.id).toBe('l2'); // 後から保存した方
    });
  });

  describe('findByPostAndUser()', () => {
    it('存在するいいねを取得できる', async () => {
      const like = createLike({ postId: 'post-1', userId: 'user-1' });
      await repository.save(like);

      const found = await repository.findByPostAndUser('post-1', 'user-1');

      expect(found).not.toBeNull();
      expect(found?.postId).toBe('post-1');
      expect(found?.userId).toBe('user-1');
    });

    it('存在しない組み合わせでnullを返す', async () => {
      const like = createLike({ postId: 'post-1', userId: 'user-1' });
      await repository.save(like);

      const found = await repository.findByPostAndUser('post-1', 'user-2');

      expect(found).toBeNull();
    });

    it('削除後はnullを返す', async () => {
      const like = createLike({ postId: 'post-1', userId: 'user-1' });
      await repository.save(like);
      await repository.delete('post-1', 'user-1');

      const found = await repository.findByPostAndUser('post-1', 'user-1');
      expect(found).toBeNull();
    });
  });

  describe('findByPost()', () => {
    beforeEach(async () => {
      // テストデータを準備
      await repository.save(createLike({ id: 'l1', postId: 'post-1', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l2', postId: 'post-1', userId: 'user-2' }));
      await repository.save(createLike({ id: 'l3', postId: 'post-1', userId: 'user-3' }));
      await repository.save(createLike({ id: 'l4', postId: 'post-2', userId: 'user-1' }));
    });

    it('投稿のいいね一覧を取得できる', async () => {
      const likes = await repository.findByPost('post-1');

      expect(likes).toHaveLength(3);
      expect(likes.every(l => l.postId === 'post-1')).toBe(true);
    });

    it('別の投稿のいいねは含まない', async () => {
      const likes = await repository.findByPost('post-2');

      expect(likes).toHaveLength(1);
      expect(likes[0].userId).toBe('user-1');
    });

    it('存在しない投稿で空配列を返す', async () => {
      const likes = await repository.findByPost('non-existent');

      expect(likes).toHaveLength(0);
    });
  });

  describe('findByUser()', () => {
    beforeEach(async () => {
      // テストデータを準備
      await repository.save(createLike({ id: 'l1', postId: 'post-1', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l2', postId: 'post-2', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l3', postId: 'post-3', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l4', postId: 'post-1', userId: 'user-2' }));
    });

    it('ユーザーのいいね一覧を取得できる', async () => {
      const likes = await repository.findByUser('user-1');

      expect(likes).toHaveLength(3);
      expect(likes.every(l => l.userId === 'user-1')).toBe(true);
    });

    it('別のユーザーのいいねは含まない', async () => {
      const likes = await repository.findByUser('user-2');

      expect(likes).toHaveLength(1);
      expect(likes[0].postId).toBe('post-1');
    });

    it('存在しないユーザーで空配列を返す', async () => {
      const likes = await repository.findByUser('non-existent');

      expect(likes).toHaveLength(0);
    });
  });

  describe('delete()', () => {
    it('存在するいいねを削除できる', async () => {
      const like = createLike({ postId: 'post-1', userId: 'user-1' });
      await repository.save(like);

      await repository.delete('post-1', 'user-1');

      expect(repository.getAll()).toHaveLength(0);
    });

    it('投稿インデックスも更新される', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'post-1', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l2', postId: 'post-1', userId: 'user-2' }));

      await repository.delete('post-1', 'user-1');

      const likes = await repository.findByPost('post-1');
      expect(likes).toHaveLength(1);
      expect(likes[0].userId).toBe('user-2');
    });

    it('ユーザーインデックスも更新される', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'post-1', userId: 'user-1' }));
      await repository.save(createLike({ id: 'l2', postId: 'post-2', userId: 'user-1' }));

      await repository.delete('post-1', 'user-1');

      const likes = await repository.findByUser('user-1');
      expect(likes).toHaveLength(1);
      expect(likes[0].postId).toBe('post-2');
    });

    it('存在しないいいねの削除はエラーにならない', async () => {
      // PortErrorをスローしない（deleteは静かに処理）
      await expect(repository.delete('non-existent', 'user-1')).resolves.not.toThrow();
    });

    it('インデックスが空になると削除される', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'post-1', userId: 'user-1' }));
      await repository.delete('post-1', 'user-1');

      // 再度同じ投稿/ユーザーで検索しても問題ない
      const postLikes = await repository.findByPost('post-1');
      const userLikes = await repository.findByUser('user-1');

      expect(postLikes).toHaveLength(0);
      expect(userLikes).toHaveLength(0);
    });
  });

  describe('clear()', () => {
    it('全てのいいねを削除する', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'p1', userId: 'u1' }));
      await repository.save(createLike({ id: 'l2', postId: 'p1', userId: 'u2' }));
      await repository.save(createLike({ id: 'l3', postId: 'p2', userId: 'u1' }));

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('インデックスもクリアされる', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'p1', userId: 'u1' }));

      repository.clear();

      const postLikes = await repository.findByPost('p1');
      const userLikes = await repository.findByUser('u1');

      expect(postLikes).toHaveLength(0);
      expect(userLikes).toHaveLength(0);
    });

    it('空の状態でもエラーにならない', () => {
      expect(() => repository.clear()).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('保存された全いいねを返す', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'p1', userId: 'u1' }));
      await repository.save(createLike({ id: 'l2', postId: 'p2', userId: 'u2' }));
      await repository.save(createLike({ id: 'l3', postId: 'p3', userId: 'u3' }));

      const all = repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('大量のいいねを処理できる', async () => {
      // 1投稿に100件のいいね
      const likes = Array.from({ length: 100 }, (_, i) =>
        createLike({
          id: `like-${i}`,
          postId: 'popular-post',
          userId: `user-${i}`,
        })
      );

      for (const like of likes) {
        await repository.save(like);
      }

      expect(repository.getAll()).toHaveLength(100);

      const postLikes = await repository.findByPost('popular-post');
      expect(postLikes).toHaveLength(100);
    });

    it('1ユーザーが多数の投稿にいいねできる', async () => {
      // 1ユーザーが50投稿にいいね
      const likes = Array.from({ length: 50 }, (_, i) =>
        createLike({
          id: `like-${i}`,
          postId: `post-${i}`,
          userId: 'active-user',
        })
      );

      for (const like of likes) {
        await repository.save(like);
      }

      const userLikes = await repository.findByUser('active-user');
      expect(userLikes).toHaveLength(50);
    });

    it('同時に複数の操作を行っても整合性が保たれる', async () => {
      // 保存と削除を交互に実行
      await repository.save(createLike({ id: 'l1', postId: 'p1', userId: 'u1' }));
      await repository.save(createLike({ id: 'l2', postId: 'p1', userId: 'u2' }));
      await repository.delete('p1', 'u1');
      await repository.save(createLike({ id: 'l3', postId: 'p1', userId: 'u3' }));
      await repository.delete('p1', 'u2');

      const likes = await repository.findByPost('p1');
      expect(likes).toHaveLength(1);
      expect(likes[0].userId).toBe('u3');
    });

    it('いいね解除後に再いいねできる', async () => {
      await repository.save(createLike({ id: 'l1', postId: 'p1', userId: 'u1' }));
      await repository.delete('p1', 'u1');
      await repository.save(createLike({ id: 'l2', postId: 'p1', userId: 'u1' }));

      const found = await repository.findByPostAndUser('p1', 'u1');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('l2');
    });
  });
});
