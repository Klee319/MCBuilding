/**
 * UnlikePost Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnlikePost } from '../../../../src/usecase/social/unlike-post.js';
import type { LikeRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
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
    likeCount: overrides?.likeCount ?? 1,
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

describe('UnlikePost Usecase', () => {
  let likeRepository: LikeRepositoryPort;
  let postRepository: PostRepositoryPort;
  let usecase: UnlikePost;

  beforeEach(() => {
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

    usecase = UnlikePost.create(likeRepository, postRepository);
  });

  describe('execute', () => {
    it('should remove a like when user has liked the post', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123', likeCount: 5 });
      const userId = 'user-789';
      const existingLike = createMockLike('post-123', userId);

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(existingLike);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ postId: 'post-123', userId });

      // Assert
      expect(likeRepository.delete).toHaveBeenCalledWith('post-123', userId);
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          likeCount: 4, // decremented from 5
        })
      );
    });

    it('should be idempotent - no error when user has not liked the post', async () => {
      // Arrange
      const post = createMockPost({ id: 'post-123' });
      const userId = 'user-789';

      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(likeRepository.findByPostAndUser).mockResolvedValue(null);

      // Act & Assert - should not throw
      await expect(usecase.execute({ postId: 'post-123', userId })).resolves.not.toThrow();

      // Should not delete or update
      expect(likeRepository.delete).not.toHaveBeenCalled();
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

    it('should throw error when postId is empty', async () => {
      await expect(
        usecase.execute({ postId: '', userId: 'user-123' })
      ).rejects.toThrow('postId cannot be empty');
    });

    it('should throw error when userId is empty', async () => {
      await expect(
        usecase.execute({ postId: 'post-123', userId: '' })
      ).rejects.toThrow('userId cannot be empty');
    });
  });

  describe('create factory method', () => {
    it('should create an UnlikePost instance with valid dependencies', () => {
      const instance = UnlikePost.create(likeRepository, postRepository);
      expect(instance).toBeInstanceOf(UnlikePost);
    });
  });
});
