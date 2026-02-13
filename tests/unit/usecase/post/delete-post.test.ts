/**
 * DeletePost Usecase Unit Tests
 *
 * TDD tests for the DeletePost usecase.
 * Tests cover: success, post not found, not authorized.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePost, DeletePostError, type DeletePostInput } from '../../../../src/usecase/post/delete-post.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import type { PostRepositoryPort, StructureRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';

// ============================================
// Mock Factories
// ============================================

function createMockPostRepository(): PostRepositoryPort {
  return {
    findById: vi.fn(),
    findByUnlistedUrl: vi.fn(),
    search: vi.fn(),
    findByAuthor: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(() => Promise.resolve()),
    incrementDownloadCount: vi.fn(),
  };
}

function createMockStructureRepository(): StructureRepositoryPort {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(() => Promise.resolve()),
    getDownloadUrl: vi.fn(),
  };
}

function createMockPost(overrides: Partial<{
  id: string;
  authorId: string;
  structureId: string;
}> = {}): Post {
  const now = new Date();
  return Post.create({
    id: overrides.id ?? 'post-123',
    authorId: overrides.authorId ?? 'user-456',
    structureId: overrides.structureId ?? 'structure-789',
    title: 'Test Post',
    description: 'Test Description',
    tags: [Tag.create('minecraft')],
    visibility: Visibility.public(),
    unlistedUrl: null,
    requiredMods: [],
    likeCount: 10,
    downloadCount: 5,
    commentCount: 3,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createValidInput(overrides: Partial<DeletePostInput> = {}): DeletePostInput {
  return {
    postId: 'post-123',
    requesterId: 'user-456',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('DeletePost Usecase', () => {
  let mockPostRepository: PostRepositoryPort;
  let mockStructureRepository: StructureRepositoryPort;
  let usecase: DeletePost;

  beforeEach(() => {
    mockPostRepository = createMockPostRepository();
    mockStructureRepository = createMockStructureRepository();
    usecase = DeletePost.create(mockPostRepository, mockStructureRepository);
  });

  describe('execute - Success Cases', () => {
    it('deletes a post successfully when requester is the author', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput();
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.findById).toHaveBeenCalledWith(input.postId);
      expect(mockStructureRepository.delete).toHaveBeenCalledWith(mockPost.structureId);
      expect(mockPostRepository.delete).toHaveBeenCalledWith(input.postId);
    });

    it('deletes the associated structure before deleting the post', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput();
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      const callOrder: string[] = [];
      vi.mocked(mockStructureRepository.delete).mockImplementation(async () => {
        callOrder.push('structure');
      });
      vi.mocked(mockPostRepository.delete).mockImplementation(async () => {
        callOrder.push('post');
      });

      // Act
      await usecase.execute(input);

      // Assert
      expect(callOrder).toEqual(['structure', 'post']);
    });

    it('returns void (undefined) on successful deletion', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput();
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('execute - Failure Cases', () => {
    it('throws error when post is not found', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(mockPostRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not found');
      expect(mockStructureRepository.delete).not.toHaveBeenCalled();
      expect(mockPostRepository.delete).not.toHaveBeenCalled();
    });

    it('throws error when requester is not the author (not authorized)', async () => {
      // Arrange
      const mockPost = createMockPost({ authorId: 'different-user' });
      const input = createValidInput({
        requesterId: 'user-456',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to delete this post');
      expect(mockStructureRepository.delete).not.toHaveBeenCalled();
      expect(mockPostRepository.delete).not.toHaveBeenCalled();
    });

    it('throws error when postId is empty', async () => {
      // Arrange
      const input = createValidInput({
        postId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('throws error when postId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        postId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('throws error when requesterId is empty', async () => {
      // Arrange
      const input = createValidInput({
        requesterId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('requesterId cannot be empty');
    });

    it('throws error when requesterId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        requesterId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DeletePostError);
      await expect(usecase.execute(input)).rejects.toThrow('requesterId cannot be empty');
    });
  });

  describe('create factory', () => {
    it('creates a DeletePost instance with repositories', () => {
      // Act
      const instance = DeletePost.create(mockPostRepository, mockStructureRepository);

      // Assert
      expect(instance).toBeInstanceOf(DeletePost);
    });
  });
});
