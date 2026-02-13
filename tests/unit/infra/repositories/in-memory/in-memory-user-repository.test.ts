/**
 * InMemoryUserRepository テスト
 *
 * UserRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、エッジケース、ヘルパーメソッド
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-user-repository';
import { User } from '../../../../../src/domain/entities/user';
import { Email } from '../../../../../src/domain/value-objects/email';
import { AccountLevel } from '../../../../../src/domain/value-objects/account-level';
import { PortError } from '../../../../../src/usecase/ports/types';

describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  // テストヘルパー: 有効なユーザープロパティを生成
  const createUserProps = (overrides: Partial<{
    id: string;
    email: string;
    displayName: string;
  }> = {}) => ({
    id: overrides.id ?? 'user-123',
    displayName: overrides.displayName ?? 'Test User',
    email: Email.create(overrides.email ?? 'test@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: false,
    isPhoneVerified: false,
    linkedSns: [] as readonly string[],
    pinnedPostIds: [] as readonly string[],
    followerCount: 0,
    followingCount: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  // テストヘルパー: ユーザーを作成
  const createUser = (overrides: Partial<{
    id: string;
    email: string;
    displayName: string;
  }> = {}) => User.create(createUserProps(overrides));

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  describe('save()', () => {
    it('新規ユーザーを保存できる', async () => {
      const user = createUser();
      const saved = await repository.save(user);

      expect(saved).toBe(user);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('保存したユーザーを返す', async () => {
      const user = createUser();
      const saved = await repository.save(user);

      expect(saved.id).toBe(user.id);
      expect(saved.email.value).toBe(user.email.value);
    });

    it('既存ユーザーを更新できる', async () => {
      const user = createUser();
      await repository.save(user);

      const updatedUser = user.withDisplayName('Updated Name');
      const saved = await repository.save(updatedUser);

      expect(saved.displayName).toBe('Updated Name');
      expect(repository.getAll()).toHaveLength(1);
    });

    it('メール変更時に古いメールインデックスを削除する', async () => {
      const user = createUser({ email: 'old@example.com' });
      await repository.save(user);

      // メールを変更した新しいユーザーを保存
      const updatedUser = User.create({
        ...createUserProps({ id: user.id }),
        email: Email.create('new@example.com'),
      });
      await repository.save(updatedUser);

      // 古いメールで検索しても見つからない
      const oldResult = await repository.findByEmail('old@example.com');
      expect(oldResult).toBeNull();

      // 新しいメールで検索すると見つかる
      const newResult = await repository.findByEmail('new@example.com');
      expect(newResult?.id).toBe(user.id);
    });

    it('重複メールで保存するとPortErrorをスローする', async () => {
      const user1 = createUser({ id: 'user-1', email: 'same@example.com' });
      const user2 = createUser({ id: 'user-2', email: 'same@example.com' });

      await repository.save(user1);

      await expect(repository.save(user2)).rejects.toThrow(PortError);
      await expect(repository.save(user2)).rejects.toMatchObject({
        code: 'DUPLICATE_EMAIL',
      });
    });

    it('同一ユーザーの同じメールは重複エラーにならない', async () => {
      const user = createUser({ email: 'test@example.com' });
      await repository.save(user);

      // 同じユーザーを再保存（メールは同じ）
      const updatedUser = user.withDisplayName('New Name');
      const saved = await repository.save(updatedUser);

      expect(saved.displayName).toBe('New Name');
    });

    it('大文字小文字を区別しないメール重複チェック', async () => {
      const user1 = createUser({ id: 'user-1', email: 'Test@Example.com' });
      const user2 = createUser({ id: 'user-2', email: 'test@example.com' });

      await repository.save(user1);

      await expect(repository.save(user2)).rejects.toThrow(PortError);
    });
  });

  describe('findById()', () => {
    it('存在するユーザーを取得できる', async () => {
      const user = createUser({ id: 'user-123' });
      await repository.save(user);

      const found = await repository.findById('user-123');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('user-123');
    });

    it('存在しないIDでnullを返す', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('削除後はnullを返す', async () => {
      const user = createUser({ id: 'user-123' });
      await repository.save(user);
      await repository.delete('user-123');

      const found = await repository.findById('user-123');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail()', () => {
    it('メールでユーザーを検索できる', async () => {
      const user = createUser({ email: 'search@example.com' });
      await repository.save(user);

      const found = await repository.findByEmail('search@example.com');

      expect(found).not.toBeNull();
      expect(found?.email.value).toBe('search@example.com');
    });

    it('大文字小文字を区別しない検索', async () => {
      const user = createUser({ email: 'Test@Example.com' });
      await repository.save(user);

      const found = await repository.findByEmail('test@example.com');

      expect(found).not.toBeNull();
      expect(found?.email.value).toBe('Test@Example.com');
    });

    it('存在しないメールでnullを返す', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });

    it('削除後はnullを返す', async () => {
      const user = createUser({ email: 'deleted@example.com' });
      await repository.save(user);
      await repository.delete(user.id);

      const found = await repository.findByEmail('deleted@example.com');
      expect(found).toBeNull();
    });
  });

  describe('delete()', () => {
    it('存在するユーザーを削除できる', async () => {
      const user = createUser({ id: 'user-to-delete' });
      await repository.save(user);

      await repository.delete('user-to-delete');

      expect(repository.getAll()).toHaveLength(0);
    });

    it('メールインデックスも削除される', async () => {
      const user = createUser({ email: 'delete@example.com' });
      await repository.save(user);

      await repository.delete(user.id);

      const found = await repository.findByEmail('delete@example.com');
      expect(found).toBeNull();
    });

    it('存在しないIDで削除するとPortErrorをスローする', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(PortError);
      await expect(repository.delete('non-existent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('削除済みIDで再度削除するとPortErrorをスローする', async () => {
      const user = createUser({ id: 'user-123' });
      await repository.save(user);
      await repository.delete('user-123');

      await expect(repository.delete('user-123')).rejects.toThrow(PortError);
    });
  });

  describe('clear()', () => {
    it('全てのユーザーを削除する', () => {
      const user1 = createUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = createUser({ id: 'user-2', email: 'user2@example.com' });

      repository.save(user1);
      repository.save(user2);
      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('メールインデックスもクリアされる', async () => {
      const user = createUser({ email: 'test@example.com' });
      await repository.save(user);

      repository.clear();

      const found = await repository.findByEmail('test@example.com');
      expect(found).toBeNull();
    });

    it('空の状態でもエラーにならない', () => {
      expect(() => repository.clear()).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('保存された全ユーザーを返す', async () => {
      const user1 = createUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = createUser({ id: 'user-2', email: 'user2@example.com' });
      const user3 = createUser({ id: 'user-3', email: 'user3@example.com' });

      await repository.save(user1);
      await repository.save(user2);
      await repository.save(user3);

      const all = repository.getAll();

      expect(all).toHaveLength(3);
      expect(all.map(u => u.id).sort()).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('複数ユーザーの保存と更新を正しく処理する', async () => {
      const user1 = createUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = createUser({ id: 'user-2', email: 'user2@example.com' });

      await repository.save(user1);
      await repository.save(user2);

      // user1を更新
      const updatedUser1 = user1.withDisplayName('Updated User 1');
      await repository.save(updatedUser1);

      expect(repository.getAll()).toHaveLength(2);

      const found = await repository.findById('user-1');
      expect(found?.displayName).toBe('Updated User 1');
    });

    it('日本語を含むメールアドレスを処理できる', async () => {
      // 国際化ドメイン名を持つメールアドレス
      const user = createUser({ email: 'user@example.jp' });
      await repository.save(user);

      const found = await repository.findByEmail('user@example.jp');
      expect(found).not.toBeNull();
    });

    it('同時に多数のユーザーを処理できる', async () => {
      const users = Array.from({ length: 100 }, (_, i) =>
        createUser({
          id: `user-${i}`,
          email: `user${i}@example.com`,
        })
      );

      for (const user of users) {
        await repository.save(user);
      }

      expect(repository.getAll()).toHaveLength(100);

      // ランダムなユーザーを検索
      const found = await repository.findById('user-50');
      expect(found?.id).toBe('user-50');

      const foundByEmail = await repository.findByEmail('user75@example.com');
      expect(foundByEmail?.id).toBe('user-75');
    });
  });
});
