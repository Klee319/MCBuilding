/**
 * UpdatePost Usecase Unit Tests
 *
 * TDD tests for the UpdatePost usecase.
 * Tests cover: success, post not found, not authorized,
 * partial updates (title only, description only, visibility change).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePost, UpdatePostError, type UpdatePostInput } from '../../../../src/usecase/post/update-post.js';
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
    save: vi.fn((post: Post) => Promise.resolve(post)),
    delete: vi.fn(),
    incrementDownloadCount: vi.fn(),
  };
}

function createMockPost(overrides: Partial<{
  id: string;
  authorId: string;
  title: string;
  description: string;
  visibility: Visibility;
}> = {}): Post {
  const now = new Date();
  return Post.create({
    id: overrides.id ?? 'post-123',
    authorId: overrides.authorId ?? 'user-456',
    structureId: 'structure-789',
    title: overrides.title ?? 'Original Title',
    description: overrides.description ?? 'Original Description',
    tags: [Tag.create('minecraft')],
    visibility: overrides.visibility ?? Visibility.public(),
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

function createValidInput(overrides: Partial<UpdatePostInput> = {}): UpdatePostInput {
  return {
    postId: 'post-123',
    requesterId: 'user-456',
    title: 'Updated Title',
    description: 'Updated Description',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('UpdatePost Usecase', () => {
  let mockPostRepository: PostRepositoryPort;
  let usecase: UpdatePost;

  beforeEach(() => {
    mockPostRepository = createMockPostRepository();
    usecase = UpdatePost.create(mockPostRepository);
  });

  describe('execute - Success Cases', () => {
    it('updates a post successfully with title and description', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput({
        title: 'New Title',
        description: 'New Description',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeInstanceOf(Post);
      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(mockPostRepository.findById).toHaveBeenCalledWith(input.postId);
      expect(mockPostRepository.save).toHaveBeenCalledTimes(1);
    });

    it('updates title only when description is not provided', async () => {
      // Arrange
      const originalDescription = 'Original Description';
      const mockPost = createMockPost({ description: originalDescription });
      const input = createValidInput({
        title: 'New Title',
        description: undefined,
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.description).toBe(originalDescription);
    });

    it('updates description only when title is not provided', async () => {
      // Arrange
      const originalTitle = 'Original Title';
      const mockPost = createMockPost({ title: originalTitle });
      const input = createValidInput({
        title: undefined,
        description: 'New Description',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.title).toBe(originalTitle);
      expect(result.description).toBe('New Description');
    });

    it('changes visibility from public to private', async () => {
      // Arrange
      const mockPost = createMockPost({ visibility: Visibility.public() });
      const input = createValidInput({
        title: undefined,
        description: undefined,
        visibility: 'private',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isPrivate()).toBe(true);
      expect(result.unlistedUrl).toBeNull();
    });

    it('changes visibility from public to unlisted and generates URL', async () => {
      // Arrange
      const mockPost = createMockPost({ visibility: Visibility.public() });
      const input = createValidInput({
        title: undefined,
        description: undefined,
        visibility: 'unlisted',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isUnlisted()).toBe(true);
      expect(result.unlistedUrl).not.toBeNull();
      expect(result.unlistedUrl?.token.length).toBeGreaterThanOrEqual(32);
    });

    it('changes visibility to unlisted with custom expiry', async () => {
      // Arrange
      const mockPost = createMockPost({ visibility: Visibility.public() });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const input = createValidInput({
        title: undefined,
        description: undefined,
        visibility: 'unlisted',
        unlistedExpiry: futureDate,
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isUnlisted()).toBe(true);
      expect(result.unlistedUrl?.expiresAt?.getTime()).toBe(futureDate.getTime());
    });

    it('changes visibility from unlisted to public and clears unlisted URL', async () => {
      // Arrange
      const unlistedUrl = UnlistedUrl.generate(null);
      const mockPost = Post.create({
        id: 'post-123',
        authorId: 'user-456',
        structureId: 'structure-789',
        title: 'Title',
        description: 'Description',
        tags: [],
        visibility: Visibility.unlisted(),
        unlistedUrl,
        requiredMods: [],
        likeCount: 0,
        downloadCount: 0,
        commentCount: 0,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const input = createValidInput({
        title: undefined,
        description: undefined,
        visibility: 'public',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isPublic()).toBe(true);
      expect(result.unlistedUrl).toBeNull();
    });

    it('preserves existing data when no updates provided', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input: UpdatePostInput = {
        postId: 'post-123',
        requesterId: 'user-456',
        // No updates
      };
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.title).toBe(mockPost.title);
      expect(result.description).toBe(mockPost.description);
      expect(result.visibility.equals(mockPost.visibility)).toBe(true);
    });

    it('preserves likeCount, downloadCount, commentCount after update', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput({ title: 'New Title' });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.likeCount).toBe(mockPost.likeCount);
      expect(result.downloadCount).toBe(mockPost.downloadCount);
      expect(result.commentCount).toBe(mockPost.commentCount);
    });
  });

  describe('execute - Failure Cases', () => {
    it('throws error when post is not found', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(mockPostRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not found');
    });

    it('throws error when requester is not the author (not authorized)', async () => {
      // Arrange
      const mockPost = createMockPost({ authorId: 'different-user' });
      const input = createValidInput({
        requesterId: 'user-456',
      });
      vi.mocked(mockPostRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to update this post');
    });

    it('throws error when postId is empty', async () => {
      // Arrange
      const input = createValidInput({
        postId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('throws error when postId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        postId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('throws error when requesterId is empty', async () => {
      // Arrange
      const input = createValidInput({
        requesterId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('requesterId cannot be empty');
    });

    it('throws error when requesterId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        requesterId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(UpdatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('requesterId cannot be empty');
    });
  });

  describe('create factory', () => {
    it('creates an UpdatePost instance with repository', () => {
      // Act
      const instance = UpdatePost.create(mockPostRepository);

      // Assert
      expect(instance).toBeInstanceOf(UpdatePost);
    });
  });
});
