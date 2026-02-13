/**
 * DeleteComment Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteComment, DeleteCommentError } from '../../../../src/usecase/social/delete-comment.js';
import type { CommentRepositoryPort, PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import { Comment } from '../../../../src/domain/entities/comment.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';

// ========================================
// Test Helpers
// ========================================

function createMockComment(overrides?: Partial<{
  id: string;
  postId: string;
  authorId: string;
  content: string;
}>): Comment {
  return Comment.create({
    id: overrides?.id ?? 'comment-123',
    postId: overrides?.postId ?? 'post-456',
    authorId: overrides?.authorId ?? 'author-789',
    parentCommentId: null,
    content: overrides?.content ?? 'Test comment content',
    createdAt: new Date(),
  });
}

function createMockPost(overrides?: Partial<{
  id: string;
  commentCount: number;
}>): Post {
  const now = new Date();
  return Post.create({
    id: overrides?.id ?? 'post-456',
    authorId: 'author-456',
    structureId: 'struct-789',
    title: 'Test Post',
    description: 'Test description',
    tags: [Tag.create('test')],
    visibility: Visibility.public(),
    unlistedUrl: null,
    requiredMods: [],
    likeCount: 0,
    downloadCount: 0,
    commentCount: overrides?.commentCount ?? 1,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

// ========================================
// Tests
// ========================================

describe('DeleteComment Usecase', () => {
  let commentRepository: CommentRepositoryPort;
  let postRepository: PostRepositoryPort;
  let usecase: DeleteComment;

  beforeEach(() => {
    // Create mock implementations
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

    usecase = DeleteComment.create(commentRepository, postRepository);
  });

  describe('execute', () => {
    it('should soft delete comment when requester is the author', async () => {
      // Arrange
      const comment = createMockComment({
        id: 'comment-123',
        postId: 'post-456',
        authorId: 'user-789',
      });
      const post = createMockPost({ id: 'post-456', commentCount: 5 });

      vi.mocked(commentRepository.findById).mockResolvedValue(comment);
      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(commentRepository.softDelete).mockResolvedValue(undefined);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ commentId: 'comment-123', requesterId: 'user-789' });

      // Assert
      expect(commentRepository.findById).toHaveBeenCalledWith('comment-123');
      expect(commentRepository.softDelete).toHaveBeenCalledWith('comment-123');
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          commentCount: 4, // decremented from 5
        })
      );
    });

    it('should throw error when comment is not found', async () => {
      // Arrange
      vi.mocked(commentRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        usecase.execute({ commentId: 'nonexistent-comment', requesterId: 'user-123' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: 'nonexistent-comment', requesterId: 'user-123' })
      ).rejects.toThrow('Comment not found');
    });

    it('should throw error when requester is not the comment author', async () => {
      // Arrange
      const comment = createMockComment({
        id: 'comment-123',
        authorId: 'author-789',
      });

      vi.mocked(commentRepository.findById).mockResolvedValue(comment);

      // Act & Assert
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: 'different-user' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: 'different-user' })
      ).rejects.toThrow('Not authorized to delete this comment');
    });

    it('should handle case when post is not found (orphaned comment)', async () => {
      // Arrange
      const comment = createMockComment({
        id: 'comment-123',
        postId: 'nonexistent-post',
        authorId: 'user-789',
      });

      vi.mocked(commentRepository.findById).mockResolvedValue(comment);
      vi.mocked(postRepository.findById).mockResolvedValue(null);
      vi.mocked(commentRepository.softDelete).mockResolvedValue(undefined);

      // Act - should not throw, just delete the comment
      await usecase.execute({ commentId: 'comment-123', requesterId: 'user-789' });

      // Assert
      expect(commentRepository.softDelete).toHaveBeenCalledWith('comment-123');
      expect(postRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when commentId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ commentId: '', requesterId: 'user-123' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: '', requesterId: 'user-123' })
      ).rejects.toThrow('commentId cannot be empty');
    });

    it('should throw error when requesterId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: '' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: '' })
      ).rejects.toThrow('requesterId cannot be empty');
    });

    it('should throw error when commentId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ commentId: '   ', requesterId: 'user-123' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: '   ', requesterId: 'user-123' })
      ).rejects.toThrow('commentId cannot be empty');
    });

    it('should throw error when requesterId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: '   ' })
      ).rejects.toThrow(DeleteCommentError);
      await expect(
        usecase.execute({ commentId: 'comment-123', requesterId: '   ' })
      ).rejects.toThrow('requesterId cannot be empty');
    });

    it('should correctly decrement comment count from 1 to 0', async () => {
      // Arrange
      const comment = createMockComment({
        id: 'comment-123',
        postId: 'post-456',
        authorId: 'user-789',
      });
      const post = createMockPost({ id: 'post-456', commentCount: 1 });

      vi.mocked(commentRepository.findById).mockResolvedValue(comment);
      vi.mocked(postRepository.findById).mockResolvedValue(post);
      vi.mocked(commentRepository.softDelete).mockResolvedValue(undefined);
      vi.mocked(postRepository.save).mockImplementation(async (p) => p);

      // Act
      await usecase.execute({ commentId: 'comment-123', requesterId: 'user-789' });

      // Assert
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          commentCount: 0,
        })
      );
    });
  });

  describe('create factory method', () => {
    it('should create a DeleteComment instance with valid dependencies', () => {
      const instance = DeleteComment.create(commentRepository, postRepository);
      expect(instance).toBeInstanceOf(DeleteComment);
    });
  });
});
