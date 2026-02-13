/**
 * GetPostDetail Usecase Unit Tests
 *
 * TDD tests for the GetPostDetail usecase.
 * Tests cover: success, post not found, private post unauthorized,
 * unlisted post with/without token.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPostDetail, GetPostDetailError, type GetPostDetailInput } from '../../../../src/usecase/post/get-post-detail.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import { UnlistedUrl } from '../../../../src/domain/value-objects/unlisted-url.js';
import type { PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';

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
    delete: vi.fn(),
    incrementDownloadCount: vi.fn(),
  };
}

function createMockPost(options: {
  id?: string;
  authorId?: string;
  visibility?: Visibility;
  unlistedUrl?: UnlistedUrl | null;
} = {}): Post {
  const now = new Date();
  const visibility = options.visibility ?? Visibility.public();
  const unlistedUrl = visibility.isUnlisted()
    ? (options.unlistedUrl ?? UnlistedUrl.generate(null))
    : null;

  return Post.create({
    id: options.id ?? 'post-123',
    authorId: options.authorId ?? 'user-456',
    structureId: 'structure-789',
    title: 'Test Post',
    description: 'Test Description',
    tags: [Tag.create('minecraft')],
    visibility,
    unlistedUrl,
    requiredMods: [],
    likeCount: 10,
    downloadCount: 5,
    commentCount: 3,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

// ============================================
// Tests
// ============================================

describe('GetPostDetail Usecase', () => {
  let mockPostRepository: PostRepositoryPort;
  let usecase: GetPostDetail;

  beforeEach(() => {
    mockPostRepository = createMockPostRepository();
    usecase = GetPostDetail.create(mockPostRepository);
  });

  describe('execute - Public Post Success Cases', () => {
    it('returns a public post successfully without authentication', async () => {
      // Arrange
      const mockPost = createMockPost({ visibility: Visibility.public() });
      const input: GetPostDetailInput = { postId: 'post-123' };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-123');
    });

    it('returns a public post when requester is not the owner', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.public(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'different-user',
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('returns a public post when requester is the owner', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.public(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'user-456',
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });
  });

  describe('execute - Private Post Cases', () => {
    it('returns a private post when requester is the owner', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.private(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'user-456',
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('throws error when accessing private post without authentication', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.private(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        // No requesterId
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not accessible');
    });

    it('throws error when accessing private post as non-owner', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.private(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'different-user',
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not accessible');
    });
  });

  describe('execute - Unlisted Post Cases', () => {
    it('returns an unlisted post when requester is the owner (no token needed)', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.unlisted(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'user-456',
        // No token provided, but owner should still access
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('returns an unlisted post when correct token is provided', async () => {
      // Arrange
      const unlistedUrl = UnlistedUrl.generate(null);
      const mockPost = createMockPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        unlistedToken: unlistedUrl.token,
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('returns an unlisted post when non-owner provides correct token', async () => {
      // Arrange
      const unlistedUrl = UnlistedUrl.generate(null);
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'different-user',
        unlistedToken: unlistedUrl.token,
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('throws error when accessing unlisted post without token (non-owner)', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.unlisted(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'different-user',
        // No token
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not accessible');
    });

    it('throws error when accessing unlisted post with wrong token', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.unlisted(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'different-user',
        unlistedToken: 'wrong-token-that-is-at-least-32-characters-long',
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not accessible');
    });

    it('throws error when accessing unlisted post without authentication and without token', async () => {
      // Arrange
      const mockPost = createMockPost({
        visibility: Visibility.unlisted(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        // No requesterId, no token
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not accessible');
    });
  });

  describe('execute - Not Found Case', () => {
    it('throws error when post is not found', async () => {
      // Arrange
      const input: GetPostDetailInput = { postId: 'nonexistent-post' };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not found');
    });
  });

  describe('execute - Validation', () => {
    it('throws error when postId is empty', async () => {
      // Arrange
      const input: GetPostDetailInput = { postId: '' };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('throws error when postId is whitespace only', async () => {
      // Arrange
      const input: GetPostDetailInput = { postId: '   ' };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetPostDetailError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });
  });

  describe('create factory', () => {
    it('creates a GetPostDetail instance with repository', () => {
      // Act
      const instance = GetPostDetail.create(mockPostRepository);

      // Assert
      expect(instance).toBeInstanceOf(GetPostDetail);
    });
  });

  describe('edge cases', () => {
    it('handles undefined requesterId correctly for public posts', async () => {
      // Arrange
      const mockPost = createMockPost({ visibility: Visibility.public() });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: undefined,
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });

    it('handles undefined unlistedToken correctly for unlisted posts accessed by owner', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'user-456',
        visibility: Visibility.unlisted(),
      });
      const input: GetPostDetailInput = {
        postId: 'post-123',
        requesterId: 'user-456',
        unlistedToken: undefined,
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockPost);
    });
  });
});
