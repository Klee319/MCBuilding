/**
 * InMemoryCommentRepository テスト
 *
 * CommentRepositoryPort の InMemory 実装に対する単体テスト
 * 対象: CRUD操作、投稿別取得、ソフトデリート、エッジケース
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCommentRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-comment-repository';
import { Comment } from '../../../../../src/domain/entities/comment';
import { PortError } from '../../../../../src/usecase/ports/types';

describe('InMemoryCommentRepository', () => {
  let repository: InMemoryCommentRepository;

  // テストヘルパー: 有効なコメントプロパティを生成
  const createCommentProps = (overrides: Partial<{
    id: string;
    postId: string;
    authorId: string;
    parentCommentId: string | null;
    content: string;
    createdAt: Date;
  }> = {}) => ({
    id: overrides.id ?? 'comment-123',
    postId: overrides.postId ?? 'post-456',
    authorId: overrides.authorId ?? 'user-789',
    parentCommentId: overrides.parentCommentId ?? null,
    content: overrides.content ?? 'Test comment content',
    createdAt: overrides.createdAt ?? new Date('2024-01-15T00:00:00Z'),
  });

  // テストヘルパー: コメントを作成
  const createComment = (overrides: Partial<{
    id: string;
    postId: string;
    authorId: string;
    parentCommentId: string | null;
    content: string;
    createdAt: Date;
  }> = {}) => Comment.create(createCommentProps(overrides));

  beforeEach(() => {
    repository = new InMemoryCommentRepository();
  });

  describe('save()', () => {
    it('新規コメントを保存できる', async () => {
      const comment = createComment();
      const saved = await repository.save(comment);

      expect(saved).toBe(comment);
      expect(repository.getAll()).toHaveLength(1);
    });

    it('複数のコメントを保存できる', async () => {
      const comment1 = createComment({ id: 'c1' });
      const comment2 = createComment({ id: 'c2' });
      const comment3 = createComment({ id: 'c3' });

      await repository.save(comment1);
      await repository.save(comment2);
      await repository.save(comment3);

      expect(repository.getAll()).toHaveLength(3);
    });

    it('同じ投稿に複数のコメントを保存できる', async () => {
      const comment1 = createComment({ id: 'c1', postId: 'post-1' });
      const comment2 = createComment({ id: 'c2', postId: 'post-1' });
      const comment3 = createComment({ id: 'c3', postId: 'post-1' });

      await repository.save(comment1);
      await repository.save(comment2);
      await repository.save(comment3);

      const postComments = await repository.findByPost('post-1');
      expect(postComments).toHaveLength(3);
    });

    it('既存コメントを更新できる', async () => {
      const comment = createComment({ id: 'c1', content: 'Original' });
      await repository.save(comment);

      const updatedComment = Comment.create({
        ...createCommentProps({ id: 'c1' }),
        content: 'Updated content',
      });
      await repository.save(updatedComment);

      expect(repository.getAll()).toHaveLength(1);
      const found = await repository.findById('c1');
      expect(found?.content).toBe('Updated content');
    });

    it('返信コメント（parentCommentId付き）を保存できる', async () => {
      const parentComment = createComment({ id: 'parent', postId: 'post-1' });
      const replyComment = createComment({
        id: 'reply',
        postId: 'post-1',
        parentCommentId: 'parent',
      });

      await repository.save(parentComment);
      await repository.save(replyComment);

      const found = await repository.findById('reply');
      expect(found?.parentCommentId).toBe('parent');
      expect(found?.isReply()).toBe(true);
    });
  });

  describe('findById()', () => {
    it('存在するコメントを取得できる', async () => {
      const comment = createComment({ id: 'find-me' });
      await repository.save(comment);

      const found = await repository.findById('find-me');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('find-me');
    });

    it('存在しないIDでnullを返す', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByPost()', () => {
    beforeEach(async () => {
      // テストデータを準備（ツリー構造）
      // post-1:
      //   - root1 (created: 10th)
      //     - reply1a (created: 12th)
      //     - reply1b (created: 14th)
      //   - root2 (created: 11th)
      //     - reply2a (created: 13th)
      // post-2:
      //   - comment (created: 15th)

      await repository.save(createComment({
        id: 'root1',
        postId: 'post-1',
        parentCommentId: null,
        createdAt: new Date('2024-01-10T00:00:00Z'),
      }));
      await repository.save(createComment({
        id: 'root2',
        postId: 'post-1',
        parentCommentId: null,
        createdAt: new Date('2024-01-11T00:00:00Z'),
      }));
      await repository.save(createComment({
        id: 'reply1a',
        postId: 'post-1',
        parentCommentId: 'root1',
        createdAt: new Date('2024-01-12T00:00:00Z'),
      }));
      await repository.save(createComment({
        id: 'reply2a',
        postId: 'post-1',
        parentCommentId: 'root2',
        createdAt: new Date('2024-01-13T00:00:00Z'),
      }));
      await repository.save(createComment({
        id: 'reply1b',
        postId: 'post-1',
        parentCommentId: 'root1',
        createdAt: new Date('2024-01-14T00:00:00Z'),
      }));
      await repository.save(createComment({
        id: 'other-post',
        postId: 'post-2',
        parentCommentId: null,
        createdAt: new Date('2024-01-15T00:00:00Z'),
      }));
    });

    it('投稿のコメントのみを取得する', async () => {
      const comments = await repository.findByPost('post-1');

      expect(comments).toHaveLength(5);
      expect(comments.every(c => c.postId === 'post-1')).toBe(true);
    });

    it('別の投稿のコメントは含まない', async () => {
      const comments = await repository.findByPost('post-2');

      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe('other-post');
    });

    it('存在しない投稿で空配列を返す', async () => {
      const comments = await repository.findByPost('non-existent');

      expect(comments).toHaveLength(0);
    });

    it('ルートコメントが返信より先にソートされる', async () => {
      const comments = await repository.findByPost('post-1');

      // ルートコメントは返信より先に来る
      const rootComments = comments.filter(c => c.parentCommentId === null);
      const firstRootIndex = comments.findIndex(c => c.parentCommentId === null);
      const firstReplyIndex = comments.findIndex(c => c.parentCommentId !== null);

      expect(firstRootIndex).toBeLessThan(firstReplyIndex);
    });

    it('同じ親を持つコメントは作成日時順', async () => {
      const comments = await repository.findByPost('post-1');
      const root1Replies = comments.filter(c => c.parentCommentId === 'root1');

      expect(root1Replies[0].id).toBe('reply1a');
      expect(root1Replies[1].id).toBe('reply1b');
    });
  });

  describe('softDelete()', () => {
    it('コメントを論理削除できる（内容が「[削除済み]」に置換）', async () => {
      const comment = createComment({ id: 'to-delete', content: 'Original content' });
      await repository.save(comment);

      await repository.softDelete('to-delete');

      const found = await repository.findById('to-delete');
      expect(found).not.toBeNull();
      expect(found?.content).toBe('[削除済み]');
    });

    it('論理削除後もコメントはリポジトリに残る', async () => {
      const comment = createComment({ id: 'to-delete' });
      await repository.save(comment);

      await repository.softDelete('to-delete');

      expect(repository.getAll()).toHaveLength(1);
    });

    it('論理削除後もfindByPostで取得できる', async () => {
      const comment = createComment({ id: 'to-delete', postId: 'post-1' });
      await repository.save(comment);

      await repository.softDelete('to-delete');

      const comments = await repository.findByPost('post-1');
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('[削除済み]');
    });

    it('その他のプロパティは保持される', async () => {
      const comment = createComment({
        id: 'to-delete',
        postId: 'post-123',
        authorId: 'author-456',
        parentCommentId: 'parent-789',
      });
      await repository.save(comment);

      await repository.softDelete('to-delete');

      const found = await repository.findById('to-delete');
      expect(found?.postId).toBe('post-123');
      expect(found?.authorId).toBe('author-456');
      expect(found?.parentCommentId).toBe('parent-789');
    });

    it('存在しないIDでPortErrorをスローする', async () => {
      await expect(repository.softDelete('non-existent')).rejects.toThrow(PortError);
      await expect(repository.softDelete('non-existent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('clear()', () => {
    it('全てのコメントを削除する', async () => {
      await repository.save(createComment({ id: 'c1' }));
      await repository.save(createComment({ id: 'c2' }));

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });

    it('投稿インデックスもクリアされる', async () => {
      await repository.save(createComment({ id: 'c1', postId: 'post-1' }));
      await repository.save(createComment({ id: 'c2', postId: 'post-1' }));

      repository.clear();

      const comments = await repository.findByPost('post-1');
      expect(comments).toHaveLength(0);
    });

    it('空の状態でもエラーにならない', () => {
      expect(() => repository.clear()).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('保存された全コメントを返す', async () => {
      await repository.save(createComment({ id: 'c1' }));
      await repository.save(createComment({ id: 'c2' }));
      await repository.save(createComment({ id: 'c3' }));

      const all = repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('空の場合は空配列を返す', () => {
      const all = repository.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('エッジケース', () => {
    it('大量のコメントを処理できる', async () => {
      const comments = Array.from({ length: 100 }, (_, i) =>
        createComment({ id: `comment-${i}`, postId: 'post-1' })
      );

      for (const comment of comments) {
        await repository.save(comment);
      }

      expect(repository.getAll()).toHaveLength(100);

      const postComments = await repository.findByPost('post-1');
      expect(postComments).toHaveLength(100);
    });

    it('深いネスト構造のコメントツリーを処理できる', async () => {
      // 5階層の返信チェーン
      let parentId: string | null = null;
      for (let i = 0; i < 5; i++) {
        const comment = createComment({
          id: `level-${i}`,
          postId: 'post-1',
          parentCommentId: parentId,
          createdAt: new Date(2024, 0, 10 + i),
        });
        await repository.save(comment);
        parentId = `level-${i}`;
      }

      const comments = await repository.findByPost('post-1');
      expect(comments).toHaveLength(5);
    });

    it('日本語コンテンツを正しく処理できる', async () => {
      const comment = createComment({
        id: 'japanese',
        content: 'これは日本語のコメントです。絵文字も含みます。',
      });
      await repository.save(comment);

      const found = await repository.findById('japanese');
      expect(found?.content).toBe('これは日本語のコメントです。絵文字も含みます。');
    });

    it('複数の投稿にまたがるコメントを正しく管理できる', async () => {
      // post-1に3件、post-2に2件のコメント
      await repository.save(createComment({ id: 'c1', postId: 'post-1' }));
      await repository.save(createComment({ id: 'c2', postId: 'post-1' }));
      await repository.save(createComment({ id: 'c3', postId: 'post-1' }));
      await repository.save(createComment({ id: 'c4', postId: 'post-2' }));
      await repository.save(createComment({ id: 'c5', postId: 'post-2' }));

      const post1Comments = await repository.findByPost('post-1');
      const post2Comments = await repository.findByPost('post-2');

      expect(post1Comments).toHaveLength(3);
      expect(post2Comments).toHaveLength(2);
      expect(repository.getAll()).toHaveLength(5);
    });
  });
});
