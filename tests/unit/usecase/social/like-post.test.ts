/**
 * LikePost Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LikePost } from '../../../../src/usecase/social/like-post.js';
import type { LikeRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { NotificationPort } from '../../../../src/usecase/ports/gateway-ports.js';
import { Like } from '../../../../src/domain/entities/like.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';

// ========================================
// Test Helpers
// ========================================

function createMockPost(overrides?: Partial<{
  id: string;
  authorId: string;
  likeCount: number;
}>): Post {
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
    likeCount: overrides?.likeCount ?? 0,
    downloadCount: 0,
    commentCount: 0,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createMockLike(postId: string, userId: string): Like {
  return Like.create({
    id: `like-${postId}-${userId}`,
    postId,
    userId,
    createdAt: new Date(),
  });
}

// ========================================
// Tests
// ========================================

describe('LikePost Usecase', () => {
  let likeRepository: LikeRepositoryPort;
  let postRepository: PostRepositoryPort;
  let notificationPort: NotificationPort;
  let usecase: LikePost;

  beforeEach(() => {
    // Create mock implementations
    likeRepository = {
      findByPostAndUser: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findByPost: vi.fn(),
      findByUser: vi.fn(),
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

    usecase = LikePost.create(likeRepository, postRepository, notificationPort);
  });

  describe('execute', () => {
    it('should create a like when user has not liked the post before', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123', authorId: 'author-456' });
      const userId = 'user-789';

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(null);
      vi.mocked(likeRepository.save).mockImplementation(async (like) => like);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ postId: 'post-123', userId });

      // Assert
      expect(likeRepository.findByPostAndUser).toHaveBeenCalledWith('post-123', userId);
      expect(likeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-123',
          userId,
        })
      );
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          likeCount: 1, // incremented from 0
        })
      );
    });

    it('should be idempotent - no error when user has already liked the post', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123' });
      const userId = 'user-789';
      const existingLike = createMockLike('post-123', userId);

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(existingLike);

      // Act & Assert - should not throw
      await expect(usecase.execute({ postId: 'post-123', userId })).resolves.not.toThrow();

      // Should not create a new like
      expect(likeRepository.save).not.toHaveBeenCalled();
      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when post does not exist', async () => {
      // Arrange
      vi.mocked(postRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        usecase.execute({ postId: 'nonexistent-post', userId: 'user-123' })
      ).rejects.toThrow('Post not found');
    });

    it('should send notification to post author', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123', authorId: 'author-456' });
      const userId = 'user-789';

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(null);
      vi.mocked(likeRepository.save).mockImplementation(async (like) => like);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ postId: 'post-123', userId });

      // Assert
      expect(notificationPort.notify).toHaveBeenCalledWith(
        'author-456',
        expect.objectContaining({
          type: 'like',
        })
      );
    });

    it('should not send notification when user likes their own post', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123', authorId: 'user-789' });
      const userId = 'user-789'; // Same as author

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(null);
      vi.mocked(likeRepository.save).mockImplementation(async (like) => like);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ postId: 'post-123', userId });

      // Assert
      expect(notificationPort.notify).not.toHaveBeenCalled();
    });

    it('should not send notification when already liked (idempotent)', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123', authorId: 'author-456' });
      const userId = 'user-789';
      const existingLike = createMockLike('post-123', userId);

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(existingLike);

      // Act
      await usecase.execute({ postId: 'post-123', userId });

      // Assert
      expect(notificationPort.notify).not.toHaveBeenCalled();
    });

    it('should throw error when postId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ postId: '', userId: 'user-123' })
      ).rejects.toThrow('postId cannot be empty');
    });

    it('should throw error when userId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ postId: 'post-123', userId: '' })
      ).rejects.toThrow('userId cannot be empty');
    });
  });

  describe('create factory method', () => {
    it('should create a LikePost instance with valid dependencies', () => {
      const instance = LikePost.create(likeRepository, postRepository, notificationPort);
      expect(instance).toBeInstanceOf(LikePost);
    });
  });
});
