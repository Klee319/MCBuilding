/**
 * AddComment Usecase Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddComment } from '../../../../src/usecase/social/add-comment.js';
import type { CommentRepositoryPort, PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { NotificationPort, SpamDetectorPort } from '../../../../src/usecase/ports/gateway-ports.js';
import { Comment } from '../../../../src/domain/entities/comment.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';

function createMockPost(overrides?: Partial<{ id: string; authorId: string; commentCount: number }>): Post {
  const now = new Date();
  return Post.create({
    id: overrides?.id ?? 'post-123',
    authorId: overrides?.authorId ?? 'author-456',
    structureId: 'struct-789',
    title: 'Test Post',
    description: 'Test description',
    tags: [Tag.create('test')],
    visibility: Visibility.public(),
    unlistedUrl: null,
    requiredMods: [],
    likeCount: 0,
    downloadCount: 0,
    commentCount: overrides?.commentCount ?? 0,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

describe('AddComment Usecase', () => {
  let commentRepository: CommentRepositoryPort;
  let postRepository: PostRepositoryPort;
  let notificationPort: NotificationPort;
  let spamDetectorPort: SpamDetectorPort;
  let usecase: AddComment;

  beforeEach(() => {
    commentRepository = {
      findById: vi.fn(),
      findByPost: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn(),
    };

    postRepository = {
      findById: vi.fn(),
      findByUnlistedUrl: vi.fn(),
      search: vi.fn(),
      findByAuthor: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      incrementDownloadCount: vi.fn(),
    };

    notificationPort = {
      notify: vi.fn(),
      notifyBulk: vi.fn(),
    };

    spamDetectorPort = {
      checkRateLimit: vi.fn(),
      checkContent: vi.fn(),
    };

    usecase = AddComment.create(commentRepository, postRepository, notificationPort, spamDetectorPort);
  });

  describe('execute', () => {
    it('should create a comment successfully', async () => {
      const post = createMockPost({ id: 'post-123', authorId: 'author-456' });

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({ allowed: true });
      vi.mocked(commentRepository.save).mockImplementation(async (c) => c);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      const result = await usecase.execute({
        postId: 'post-123',
        authorId: 'user-789',
        content: 'Great post!',
      });

      expect(result.postId).toBe('post-123');
      expect(result.authorId).toBe('user-789');
      expect(result.content).toBe('Great post!');
      expect(result.parentCommentId).toBeNull();
    });

    it('should create a reply comment with parentCommentId', async () => {
      const post = createMockPost();
      const parentComment = Comment.create({
        id: 'comment-parent',
        postId: 'post-123',
        authorId: 'other-user',
        parentCommentId: null,
        content: 'Parent comment',
        createdAt: new Date(),
      });

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(commentRepository.findById).mockResolvedValue(parentComment);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({ allowed: true });
      vi.mocked(commentRepository.save).mockImplementation(async (c) => c);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      const result = await usecase.execute({
        postId: 'post-123',
        authorId: 'user-789',
        content: 'Reply!',
        parentCommentId: 'comment-parent',
      });

      expect(result.parentCommentId).toBe('comment-parent');
    });

    it('should increment post comment count', async () => {
      const post = createMockPost({ commentCount: 5 });

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({ allowed: true });
      vi.mocked(commentRepository.save).mockImplementation(async (c) => c);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      await usecase.execute({
        postId: 'post-123',
        authorId: 'user-789',
        content: 'Comment',
      });

      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ commentCount: 6 })
      );
    });

    it('should send notification to post author', async () => {
      const post = createMockPost({ authorId: 'author-456' });

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({ allowed: true });
      vi.mocked(commentRepository.save).mockImplementation(async (c) => c);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      await usecase.execute({
        postId: 'post-123',
        authorId: 'user-789',
        content: 'Comment',
      });

      expect(notificationPort.notify).toHaveBeenCalledWith(
        'author-456',
        expect.objectContaining({ type: 'comment' })
      );
    });

    it('should not send notification when commenting on own post', async () => {
      const post = createMockPost({ authorId: 'user-789' });

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({ allowed: true });
      vi.mocked(commentRepository.save).mockImplementation(async (c) => c);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      await usecase.execute({
        postId: 'post-123',
        authorId: 'user-789',
        content: 'Self comment',
      });

      expect(notificationPort.notify).not.toHaveBeenCalled();
    });

    it('should throw error when post not found', async () => {
      vi.mocked(postRepository.findById).mockResolvedValue(null);

      await expect(
        usecase.execute({ postId: 'nonexistent', authorId: 'user', content: 'text' })
      ).rejects.toThrow('Post not found');
    });

    it('should throw error when rate limited', async () => {
      const post = createMockPost();
      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({
        allowed: false,
        retryAfter: 60
      });

      await expect(
        usecase.execute({ postId: 'post-123', authorId: 'user', content: 'text' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should throw error when content is spam', async () => {
      const post = createMockPost();
      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(spamDetectorPort.checkRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(spamDetectorPort.checkContent).mockResolvedValue({
        allowed: false,
        reason: 'Spam detected'
      });

      await expect(
        usecase.execute({ postId: 'post-123', authorId: 'user', content: 'spam' })
      ).rejects.toThrow('Content not allowed');
    });

    it('should throw error when content is empty', async () => {
      await expect(
        usecase.execute({ postId: 'post-123', authorId: 'user', content: '' })
      ).rejects.toThrow('content cannot be empty');
    });
  });
});
