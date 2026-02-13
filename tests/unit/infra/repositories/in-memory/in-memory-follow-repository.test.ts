/**
 * InMemoryFollowRepository テスト
 *
 * FollowRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、フォロワー/フォロイー検索、エッジケース
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFollowRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-follow-repository';
import { Follow } from '../../../../../src/domain/entities/follow';

describe('InMemoryFollowRepository', () => {
  let repository: InMemoryFollowRepository;

  // テストヘルパー: 有効なフォロープロパティを生成
  const createFollowProps = (overrides: Partial<{
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: Date;
  }> = {}) => ({
    id: overrides.id ?? 'follow-123',
    followerId: overrides.followerId ?? 'follower-456',
    followeeId: overrides.followeeId ?? 'followee-789',
    createdAt: overrides.createdAt ?? new Date('2024-01-15T00:00:00Z'),
  });

  // テストヘルパー: フォローを作成
  const createFollow = (overrides: Partial<{
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: Date;
  }> = {}) => Follow.create(createFollowProps(overrides));

  beforeEach(() => {
    repository = new InMemoryFollowRepository();
  });

  describe('save()', () => {
    it('新規フォローを保存できる', async () => {
      const follow = createFollow();
      const saved = await repository.save(follow);

      expect(saved).toBe(follow);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('複数のフォローを保存できる', async () => {
      const follow1 = createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' });
      const follow2 = createFollow({ id: 'f2', followerId: 'u1', followeeId: 'u3' });
      const follow3 = createFollow({ id: 'f3', followerId: 'u2', followeeId: 'u1' });

      await repository.save(follow1);
      await repository.save(follow2);
      await repository.save(follow3);

      expect(repository.getAll()).toHaveLength(3);
    });

    it('同じfollower/followeeの組み合わせで上書き保存できる', async () => {
      const follow1 = createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' });
      const follow2 = createFollow({ id: 'f2', followerId: 'u1', followeeId: 'u2' }); // 同じ組み合わせ

      await repository.save(follow1);
      await repository.save(follow2);

      // 同じキーで上書きされるので1件
      expect(repository.getAll()).toHaveLength(1);

      const found = await repository.findByFollowerAndFollowee('u1', 'u2');
      expect(found?.id).toBe('f2'); // 後から保存した方
    });
  });

  describe('findByFollowerAndFollowee()', () => {
    it('存在するフォローを取得できる', async () => {
      const follow = createFollow({ followerId: 'user-a', followeeId: 'user-b' });
      await repository.save(follow);

      const found = await repository.findByFollowerAndFollowee('user-a', 'user-b');

      expect(found).not.toBeNull();
      expect(found?.followerId).toBe('user-a');
      expect(found?.followeeId).toBe('user-b');
    });

    it('存在しない組み合わせでnullを返す', async () => {
      const follow = createFollow({ followerId: 'user-a', followeeId: 'user-b' });
      await repository.save(follow);

      const found = await repository.findByFollowerAndFollowee('user-a', 'user-c');

      expect(found).toBeNull();
    });

    it('逆方向のフォローは別として扱う', async () => {
      const follow = createFollow({ followerId: 'user-a', followeeId: 'user-b' });
      await repository.save(follow);

      // user-bがuser-aをフォローしているか（していない）
      const found = await repository.findByFollowerAndFollowee('user-b', 'user-a');

      expect(found).toBeNull();
    });

    it('削除後はnullを返す', async () => {
      const follow = createFollow({ followerId: 'user-a', followeeId: 'user-b' });
      await repository.save(follow);
      await repository.delete('user-a', 'user-b');

      const found = await repository.findByFollowerAndFollowee('user-a', 'user-b');
      expect(found).toBeNull();
    });
  });

  describe('findFollowers()', () => {
    beforeEach(async () => {
      // テストデータ: user-targetをフォローしている人々
      await repository.save(createFollow({
        id: 'f1',
        followerId: 'follower-1',
        followeeId: 'user-target',
      }));
      await repository.save(createFollow({
        id: 'f2',
        followerId: 'follower-2',
        followeeId: 'user-target',
      }));
      await repository.save(createFollow({
        id: 'f3',
        followerId: 'follower-3',
        followeeId: 'user-target',
      }));
      // 別のユーザーのフォロワー
      await repository.save(createFollow({
        id: 'f4',
        followerId: 'follower-1',
        followeeId: 'other-user',
      }));
    });

    it('ユーザーのフォロワー一覧を取得できる', async () => {
      const followers = await repository.findFollowers('user-target');

      expect(followers).toHaveLength(3);
      expect(followers.every(f => f.followeeId === 'user-target')).toBe(true);
    });

    it('別のユーザーのフォロワーは含まない', async () => {
      const followers = await repository.findFollowers('other-user');

      expect(followers).toHaveLength(1);
      expect(followers[0].followerId).toBe('follower-1');
    });

    it('フォロワーがいない場合は空配列を返す', async () => {
      const followers = await repository.findFollowers('no-followers-user');

      expect(followers).toHaveLength(0);
    });
  });

  describe('findFollowing()', () => {
    beforeEach(async () => {
      // テストデータ: user-activeがフォローしている人々
      await repository.save(createFollow({
        id: 'f1',
        followerId: 'user-active',
        followeeId: 'following-1',
      }));
      await repository.save(createFollow({
        id: 'f2',
        followerId: 'user-active',
        followeeId: 'following-2',
      }));
      await repository.save(createFollow({
        id: 'f3',
        followerId: 'user-active',
        followeeId: 'following-3',
      }));
      // 別のユーザーのフォロー
      await repository.save(createFollow({
        id: 'f4',
        followerId: 'other-user',
        followeeId: 'following-1',
      }));
    });

    it('ユーザーのフォロー一覧を取得できる', async () => {
      const following = await repository.findFollowing('user-active');

      expect(following).toHaveLength(3);
      expect(following.every(f => f.followerId === 'user-active')).toBe(true);
    });

    it('別のユーザーのフォローは含まない', async () => {
      const following = await repository.findFollowing('other-user');

      expect(following).toHaveLength(1);
      expect(following[0].followeeId).toBe('following-1');
    });

    it('誰もフォローしていない場合は空配列を返す', async () => {
      const following = await repository.findFollowing('no-following-user');

      expect(following).toHaveLength(0);
    });
  });

  describe('delete()', () => {
    it('存在するフォローを削除できる', async () => {
      const follow = createFollow({ followerId: 'user-a', followeeId: 'user-b' });
      await repository.save(follow);

      await repository.delete('user-a', 'user-b');

      expect(repository.getAll()).toHaveLength(0);
    });

    it('フォロワーインデックスも更新される', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'target' }));
      await repository.save(createFollow({ id: 'f2', followerId: 'u2', followeeId: 'target' }));

      await repository.delete('u1', 'target');

      const followers = await repository.findFollowers('target');
      expect(followers).toHaveLength(1);
      expect(followers[0].followerId).toBe('u2');
    });

    it('フォローインデックスも更新される', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'active', followeeId: 't1' }));
      await repository.save(createFollow({ id: 'f2', followerId: 'active', followeeId: 't2' }));

      await repository.delete('active', 't1');

      const following = await repository.findFollowing('active');
      expect(following).toHaveLength(1);
      expect(following[0].followeeId).toBe('t2');
    });

    it('存在しないフォローの削除はエラーにならない', async () => {
      await expect(repository.delete('non-existent', 'user')).resolves.not.toThrow();
    });

    it('インデックスが空になると削除される', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));
      await repository.delete('u1', 'u2');

      // 再度検索しても問題ない
      const followers = await repository.findFollowers('u2');
      const following = await repository.findFollowing('u1');

      expect(followers).toHaveLength(0);
      expect(following).toHaveLength(0);
    });
  });

  describe('clear()', () => {
    it('全てのフォローを削除する', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));
      await repository.save(createFollow({ id: 'f2', followerId: 'u2', followeeId: 'u3' }));
      await repository.save(createFollow({ id: 'f3', followerId: 'u3', followeeId: 'u1' }));

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('インデックスもクリアされる', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));

      repository.clear();

      const followers = await repository.findFollowers('u2');
      const following = await repository.findFollowing('u1');

      expect(followers).toHaveLength(0);
      expect(following).toHaveLength(0);
    });

    it('空の状態でもエラーにならない', () => {
      expect(() => repository.clear()).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('保存された全フォローを返す', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));
      await repository.save(createFollow({ id: 'f2', followerId: 'u2', followeeId: 'u3' }));
      await repository.save(createFollow({ id: 'f3', followerId: 'u3', followeeId: 'u1' }));

      const all = repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('大量のフォロワーを処理できる', async () => {
      // 1ユーザーに100人のフォロワー
      const follows = Array.from({ length: 100 }, (_, i) =>
        createFollow({
          id: `follow-${i}`,
          followerId: `follower-${i}`,
          followeeId: 'popular-user',
        })
      );

      for (const follow of follows) {
        await repository.save(follow);
      }

      expect(repository.getAll()).toHaveLength(100);

      const followers = await repository.findFollowers('popular-user');
      expect(followers).toHaveLength(100);
    });

    it('1ユーザーが多数のユーザーをフォローできる', async () => {
      // 1ユーザーが50人をフォロー
      const follows = Array.from({ length: 50 }, (_, i) =>
        createFollow({
          id: `follow-${i}`,
          followerId: 'active-user',
          followeeId: `user-${i}`,
        })
      );

      for (const follow of follows) {
        await repository.save(follow);
      }

      const following = await repository.findFollowing('active-user');
      expect(following).toHaveLength(50);
    });

    it('相互フォローを正しく処理できる', async () => {
      // user-aとuser-bが相互フォロー
      await repository.save(createFollow({
        id: 'f1',
        followerId: 'user-a',
        followeeId: 'user-b',
      }));
      await repository.save(createFollow({
        id: 'f2',
        followerId: 'user-b',
        followeeId: 'user-a',
      }));

      expect(repository.getAll()).toHaveLength(2);

      // user-aのフォロワー（user-bがいる）
      const aFollowers = await repository.findFollowers('user-a');
      expect(aFollowers).toHaveLength(1);
      expect(aFollowers[0].followerId).toBe('user-b');

      // user-aのフォロー（user-bをフォロー）
      const aFollowing = await repository.findFollowing('user-a');
      expect(aFollowing).toHaveLength(1);
      expect(aFollowing[0].followeeId).toBe('user-b');
    });

    it('フォロー解除後に再フォローできる', async () => {
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));
      await repository.delete('u1', 'u2');
      await repository.save(createFollow({ id: 'f2', followerId: 'u1', followeeId: 'u2' }));

      const found = await repository.findByFollowerAndFollowee('u1', 'u2');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('f2');
    });

    it('複雑なフォローネットワークを構築できる', async () => {
      // 循環フォロー: u1 -> u2 -> u3 -> u1
      await repository.save(createFollow({ id: 'f1', followerId: 'u1', followeeId: 'u2' }));
      await repository.save(createFollow({ id: 'f2', followerId: 'u2', followeeId: 'u3' }));
      await repository.save(createFollow({ id: 'f3', followerId: 'u3', followeeId: 'u1' }));
      // 追加のフォロー
      await repository.save(createFollow({ id: 'f4', followerId: 'u1', followeeId: 'u3' }));
      await repository.save(createFollow({ id: 'f5', followerId: 'u4', followeeId: 'u1' }));

      expect(repository.getAll()).toHaveLength(5);

      // u1のフォロワー: u3, u4
      const u1Followers = await repository.findFollowers('u1');
      expect(u1Followers).toHaveLength(2);

      // u1のフォロー: u2, u3
      const u1Following = await repository.findFollowing('u1');
      expect(u1Following).toHaveLength(2);
    });
  });
});
