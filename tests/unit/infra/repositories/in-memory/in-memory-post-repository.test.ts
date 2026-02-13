/**
 * InMemoryPostRepository テスト
 *
 * PostRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、検索、ページネーション、エッジケース
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPostRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-post-repository';
import { Post } from '../../../../../src/domain/entities/post';
import { Tag } from '../../../../../src/domain/value-objects/tag';
import { Visibility } from '../../../../../src/domain/value-objects/visibility';
import { UnlistedUrl } from '../../../../../src/domain/value-objects/unlisted-url';
import { PortError } from '../../../../../src/usecase/ports/types';
import type { PostQuery } from '../../../../../src/usecase/ports/types';

describe('InMemoryPostRepository', () => {
  let repository: InMemoryPostRepository;

  // テストヘルパー: 有効な投稿プロパティを生成
  const createPostProps = (overrides: Partial<{
    id: string;
    authorId: string;
    title: string;
    description: string;
    visibility: Visibility;
    unlistedUrl: UnlistedUrl | null;
    tags: Tag[];
    requiredMods: string[];
    likeCount: number;
    downloadCount: number;
    createdAt: Date;
  }> = {}) => {
    const createdAt = overrides.createdAt ?? new Date('2024-01-15T00:00:00Z');
    return {
      id: overrides.id ?? 'post-123',
      authorId: overrides.authorId ?? 'user-456',
      structureId: 'structure-789',
      title: overrides.title ?? 'Test Post',
      description: overrides.description ?? 'Test description',
      tags: overrides.tags ?? [Tag.create('minecraft'), Tag.create('building')],
      visibility: overrides.visibility ?? Visibility.public(),
      unlistedUrl: overrides.unlistedUrl ?? null,
      requiredMods: overrides.requiredMods ?? [],
      likeCount: overrides.likeCount ?? 0,
      downloadCount: overrides.downloadCount ?? 0,
      commentCount: 0,
      isPinned: false,
      createdAt,
      updatedAt: createdAt, // createdAt と同じにする
    };
  };

  // テストヘルパー: 投稿を作成
  const createPost = (overrides: Partial<{
    id: string;
    authorId: string;
    title: string;
    description: string;
    visibility: Visibility;
    unlistedUrl: UnlistedUrl | null;
    tags: Tag[];
    requiredMods: string[];
    likeCount: number;
    downloadCount: number;
    createdAt: Date;
  }> = {}) => Post.create(createPostProps(overrides));

  beforeEach(() => {
    repository = new InMemoryPostRepository();
  });

  describe('save()', () => {
    it('新規投稿を保存できる', async () => {
      const post = createPost();
      const saved = await repository.save(post);

      expect(saved).toBe(post);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('既存投稿を更新できる', async () => {
      const post = createPost();
      await repository.save(post);

      const updatedPost = post.withTitle('Updated Title');
      const saved = await repository.save(updatedPost);

      expect(saved.title).toBe('Updated Title');
      expect(repository.getAll()).toHaveLength(1);
    });

    it('限定公開URLを持つ投稿を保存できる', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 1日後
      const unlistedUrl = UnlistedUrl.generate(futureDate);
      const post = createPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });

      await repository.save(post);

      const found = await repository.findByUnlistedUrl(unlistedUrl.token);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(post.id);
    });

    it('限定公開URL変更時に古いインデックスを削除する', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const oldUrl = UnlistedUrl.generate(futureDate);
      const newUrl = UnlistedUrl.generate(futureDate);

      const post = createPost({
        visibility: Visibility.unlisted(),
        unlistedUrl: oldUrl,
      });
      await repository.save(post);

      const updatedPost = post.withVisibility(Visibility.unlisted(), newUrl);
      await repository.save(updatedPost);

      const foundOld = await repository.findByUnlistedUrl(oldUrl.token);
      const foundNew = await repository.findByUnlistedUrl(newUrl.token);

      expect(foundOld).toBeNull();
      expect(foundNew?.id).toBe(post.id);
    });
  });

  describe('findById()', () => {
    it('存在する投稿を取得できる', async () => {
      const post = createPost({ id: 'find-me' });
      await repository.save(post);

      const found = await repository.findById('find-me');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('find-me');
    });

    it('存在しないIDでnullを返す', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByUnlistedUrl()', () => {
    it('限定公開トークンで投稿を検索できる', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const unlistedUrl = UnlistedUrl.generate(futureDate);
      const post = createPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      await repository.save(post);

      const found = await repository.findByUnlistedUrl(unlistedUrl.token);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(post.id);
    });

    it('期限切れのURLでnullを返す', async () => {
      // 過去の日付（UnlistedUrl.createは過去の日付を拒否するため、手動でテストケースを構築）
      // このテストでは、リポジトリの期限チェックロジックをテスト
      // 実際にはUnlistedUrl.generateは過去の日付を受け付けないため、
      // リポジトリ内部で期限チェックが行われることを想定

      const futureDate = new Date(Date.now() + 1000); // 1秒後
      const unlistedUrl = UnlistedUrl.generate(futureDate);
      const post = createPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      await repository.save(post);

      // 期限が切れるのを待つ（テスト目的で2秒待機）
      await new Promise(resolve => setTimeout(resolve, 1500));

      const found = await repository.findByUnlistedUrl(unlistedUrl.token);
      expect(found).toBeNull();
    }, 5000);

    it('存在しないトークンでnullを返す', async () => {
      const found = await repository.findByUnlistedUrl('non-existent-token');

      expect(found).toBeNull();
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      // テストデータを準備
      const posts = [
        createPost({
          id: 'post-1',
          authorId: 'author-1',
          title: 'Castle Building',
          tags: [Tag.create('castle'), Tag.create('medieval')],
          likeCount: 100,
          downloadCount: 50,
          createdAt: new Date('2024-01-10T00:00:00Z'),
        }),
        createPost({
          id: 'post-2',
          authorId: 'author-1',
          title: 'Modern House',
          tags: [Tag.create('house'), Tag.create('modern')],
          likeCount: 50,
          downloadCount: 100,
          requiredMods: ['mod1'],
          createdAt: new Date('2024-01-15T00:00:00Z'),
        }),
        createPost({
          id: 'post-3',
          authorId: 'author-2',
          title: 'Pixel Art Castle',
          tags: [Tag.create('pixel'), Tag.create('castle')],
          likeCount: 200,
          downloadCount: 30,
          createdAt: new Date('2024-01-20T00:00:00Z'),
        }),
        createPost({
          id: 'post-4',
          authorId: 'author-2',
          visibility: Visibility.private(),
          title: 'Private Building',
          createdAt: new Date('2024-01-25T00:00:00Z'),
        }),
      ];

      for (const post of posts) {
        await repository.save(post);
      }
    });

    it('全ての公開投稿を返す（authorIdなし）', async () => {
      const result = await repository.search({});

      // 公開投稿のみ（post-4はprivate）
      expect(result.items.length).toBe(3);
    });

    it('キーワードでタイトルを検索できる', async () => {
      const result = await repository.search({ keyword: 'castle' });

      expect(result.items.length).toBe(2);
      expect(result.items.map(p => p.id)).toContain('post-1');
      expect(result.items.map(p => p.id)).toContain('post-3');
    });

    it('キーワードでタグを検索できる', async () => {
      const result = await repository.search({ keyword: 'modern' });

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe('post-2');
    });

    it('authorIdで作者をフィルタリングできる', async () => {
      const result = await repository.search({ authorId: 'author-1' });

      expect(result.items.length).toBe(2);
      expect(result.items.every(p => p.authorId === 'author-1')).toBe(true);
    });

    it('authorId指定時はプライベート投稿も含む', async () => {
      const result = await repository.search({ authorId: 'author-2' });

      expect(result.items.length).toBe(2);
      expect(result.items.map(p => p.id)).toContain('post-4');
    });

    it('hasRequiredModsでフィルタリングできる', async () => {
      const result = await repository.search({ hasRequiredMods: true });

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe('post-2');
    });

    it('hasRequiredMods=falseでMod不要の投稿を検索', async () => {
      const result = await repository.search({ hasRequiredMods: false });

      expect(result.items.length).toBe(2);
      expect(result.items.map(p => p.id)).not.toContain('post-2');
    });

    it('newest順でソートできる', async () => {
      const result = await repository.search({ sortBy: 'newest' });

      const ids = result.items.map(p => p.id);
      expect(ids[0]).toBe('post-3');
      expect(ids[1]).toBe('post-2');
      expect(ids[2]).toBe('post-1');
    });

    it('popular順でソートできる', async () => {
      const result = await repository.search({ sortBy: 'popular' });

      const ids = result.items.map(p => p.id);
      expect(ids[0]).toBe('post-3'); // 200 likes
      expect(ids[1]).toBe('post-1'); // 100 likes
      expect(ids[2]).toBe('post-2'); // 50 likes
    });

    it('downloads順でソートできる', async () => {
      const result = await repository.search({ sortBy: 'downloads' });

      const ids = result.items.map(p => p.id);
      expect(ids[0]).toBe('post-2'); // 100 downloads
      expect(ids[1]).toBe('post-1'); // 50 downloads
      expect(ids[2]).toBe('post-3'); // 30 downloads
    });

    it('ページネーションが正しく機能する', async () => {
      const result = await repository.search({ page: 1, limit: 2 });

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('2ページ目を取得できる', async () => {
      const result = await repository.search({ page: 2, limit: 2 });

      expect(result.items.length).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('空の結果を返す場合の処理', async () => {
      const result = await repository.search({ keyword: 'nonexistent-keyword' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('findByAuthor()', () => {
    beforeEach(async () => {
      await repository.save(createPost({
        id: 'post-1',
        authorId: 'author-1',
        createdAt: new Date('2024-01-10T00:00:00Z'),
      }));
      await repository.save(createPost({
        id: 'post-2',
        authorId: 'author-1',
        visibility: Visibility.private(),
        createdAt: new Date('2024-01-15T00:00:00Z'),
      }));
      await repository.save(createPost({
        id: 'post-3',
        authorId: 'author-2',
        createdAt: new Date('2024-01-20T00:00:00Z'),
      }));
    });

    it('作者の公開投稿のみを返す（デフォルト）', async () => {
      const posts = await repository.findByAuthor('author-1');

      expect(posts.length).toBe(1);
      expect(posts[0].id).toBe('post-1');
    });

    it('includePrivate=trueでプライベート投稿も含む', async () => {
      const posts = await repository.findByAuthor('author-1', true);

      expect(posts.length).toBe(2);
    });

    it('新しい順でソートされる', async () => {
      const posts = await repository.findByAuthor('author-1', true);

      // 新しい順
      expect(posts[0].id).toBe('post-2');
      expect(posts[1].id).toBe('post-1');
    });

    it('存在しない作者で空配列を返す', async () => {
      const posts = await repository.findByAuthor('non-existent');

      expect(posts).toHaveLength(0);
    });
  });

  describe('delete()', () => {
    it('存在する投稿を削除できる', async () => {
      const post = createPost({ id: 'delete-me' });
      await repository.save(post);

      await repository.delete('delete-me');

      expect(repository.getAll()).toHaveLength(0);
    });

    it('限定公開URLインデックスも削除される', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const unlistedUrl = UnlistedUrl.generate(futureDate);
      const post = createPost({
        id: 'delete-unlisted',
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      await repository.save(post);

      await repository.delete('delete-unlisted');

      const found = await repository.findByUnlistedUrl(unlistedUrl.token);
      expect(found).toBeNull();
    });

    it('存在しないIDで削除するとPortErrorをスローする', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(PortError);
      await expect(repository.delete('non-existent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('incrementDownloadCount()', () => {
    it('ダウンロード数をインクリメントできる', async () => {
      const post = createPost({ id: 'post-1', downloadCount: 10 });
      await repository.save(post);

      await repository.incrementDownloadCount('post-1');

      const found = await repository.findById('post-1');
      expect(found?.downloadCount).toBe(11);
    });

    it('複数回インクリメントできる', async () => {
      const post = createPost({ id: 'post-1', downloadCount: 0 });
      await repository.save(post);

      await repository.incrementDownloadCount('post-1');
      await repository.incrementDownloadCount('post-1');
      await repository.incrementDownloadCount('post-1');

      const found = await repository.findById('post-1');
      expect(found?.downloadCount).toBe(3);
    });

    it('存在しないIDでPortErrorをスローする', async () => {
      await expect(repository.incrementDownloadCount('non-existent')).rejects.toThrow(PortError);
      await expect(repository.incrementDownloadCount('non-existent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('clear()', () => {
    it('全ての投稿を削除する', async () => {
      await repository.save(createPost({ id: 'post-1' }));
      await repository.save(createPost({ id: 'post-2' }));

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('限定公開URLインデックスもクリアされる', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const unlistedUrl = UnlistedUrl.generate(futureDate);
      const post = createPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      await repository.save(post);

      repository.clear();

      const found = await repository.findByUnlistedUrl(unlistedUrl.token);
      expect(found).toBeNull();
    });
  });

  describe('getAll()', () => {
    it('保存された全投稿を返す', async () => {
      await repository.save(createPost({ id: 'post-1' }));
      await repository.save(createPost({ id: 'post-2' }));
      await repository.save(createPost({ id: 'post-3' }));

      const all = repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('大量の投稿を処理できる', async () => {
      const posts = Array.from({ length: 100 }, (_, i) =>
        createPost({ id: `post-${i}` })
      );

      for (const post of posts) {
        await repository.save(post);
      }

      expect(repository.getAll()).toHaveLength(100);

      const searchResult = await repository.search({ page: 1, limit: 10 });
      expect(searchResult.items.length).toBe(10);
      expect(searchResult.total).toBe(100);
    });

    it('日本語タイトルで検索できる', async () => {
      const post = createPost({
        id: 'japanese-post',
        title: '美しい城',
        description: 'これは美しい城です',
      });
      await repository.save(post);

      const result = await repository.search({ keyword: '城' });

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe('japanese-post');
    });

    it('大文字小文字を区別しない検索', async () => {
      const post = createPost({
        id: 'case-test',
        title: 'CaStLe Building',
      });
      await repository.save(post);

      const result = await repository.search({ keyword: 'castle' });

      expect(result.items.length).toBe(1);
    });
  });
});
