/**
 * SearchPosts Usecase Unit Tests
 *
 * TDD tests for the SearchPosts usecase.
 * Tests cover: default values, with filters, pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchPosts, type SearchPostsInput } from '../../../../src/usecase/post/search-posts.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import type { PostRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { PaginatedResult, PostQuery } from '../../../../src/usecase/ports/types.js';

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

function createMockPost(id: string): Post {
  const now = new Date();
  return Post.create({
    id,
    authorId: 'user-456',
    structureId: `structure-${id}`,
    title: `Post ${id}`,
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

function createPaginatedResult(
  posts: Post[],
  total: number,
  page: number = 1,
  limit: number = 20
): PaginatedResult<Post> {
  return {
    items: posts,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

// ============================================
// Tests
// ============================================

describe('SearchPosts Usecase', () => {
  let mockPostRepository: PostRepositoryPort;
  let usecase: SearchPosts;

  beforeEach(() => {
    mockPostRepository = createMockPostRepository();
    usecase = SearchPosts.create(mockPostRepository);
  });

  describe('execute - Default Values', () => {
    it('uses default sortBy "newest" when not provided', async () => {
      // Arrange
      const input: SearchPostsInput = {};
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'newest',
        })
      );
    });

    it('uses default page 1 when not provided', async () => {
      // Arrange
      const input: SearchPostsInput = {};
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
        })
      );
    });

    it('uses default limit 20 when not provided', async () => {
      // Arrange
      const input: SearchPostsInput = {};
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
        })
      );
    });

    it('caps limit at 100 when exceeding maximum', async () => {
      // Arrange
      const input: SearchPostsInput = { limit: 200 };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        })
      );
    });

    it('respects limit when under maximum', async () => {
      // Arrange
      const input: SearchPostsInput = { limit: 50 };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        })
      );
    });
  });

  describe('execute - With Filters', () => {
    it('includes keyword filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { keyword: 'castle' };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'castle',
        })
      );
    });

    it('includes edition filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { edition: ['java', 'bedrock'] };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          edition: ['java', 'bedrock'],
        })
      );
    });

    it('includes sizeCategory filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { sizeCategory: ['small', 'medium'] };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sizeCategory: ['small', 'medium'],
        })
      );
    });

    it('includes hasRequiredMods filter in query when true', async () => {
      // Arrange
      const input: SearchPostsInput = { hasRequiredMods: true };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          hasRequiredMods: true,
        })
      );
    });

    it('includes hasRequiredMods filter in query when false', async () => {
      // Arrange
      const input: SearchPostsInput = { hasRequiredMods: false };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          hasRequiredMods: false,
        })
      );
    });

    it('includes authorId filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { authorId: 'user-123' };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: 'user-123',
        })
      );
    });

    it('includes sortBy filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { sortBy: 'popular' };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'popular',
        })
      );
    });

    it('includes sortBy downloads filter in query', async () => {
      // Arrange
      const input: SearchPostsInput = { sortBy: 'downloads' };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'downloads',
        })
      );
    });

    it('combines multiple filters in query', async () => {
      // Arrange
      const input: SearchPostsInput = {
        keyword: 'castle',
        edition: ['java'],
        sizeCategory: ['large'],
        hasRequiredMods: false,
        authorId: 'user-123',
        sortBy: 'popular',
        page: 2,
        limit: 30,
      };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith({
        keyword: 'castle',
        edition: ['java'],
        sizeCategory: ['large'],
        hasRequiredMods: false,
        authorId: 'user-123',
        sortBy: 'popular',
        page: 2,
        limit: 30,
      });
    });
  });

  describe('execute - Pagination', () => {
    it('returns paginated results', async () => {
      // Arrange
      const mockPosts = [createMockPost('post-1'), createMockPost('post-2')];
      const mockResult = createPaginatedResult(mockPosts, 100, 1, 2);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);
      const input: SearchPostsInput = { page: 1, limit: 2 };

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore false when on last page', async () => {
      // Arrange
      const mockPosts = [createMockPost('post-1')];
      const mockResult = createPaginatedResult(mockPosts, 5, 3, 2);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);
      const input: SearchPostsInput = { page: 3, limit: 2 };

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.hasMore).toBe(false);
    });

    it('handles empty results', async () => {
      // Arrange
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);
      const input: SearchPostsInput = { keyword: 'nonexistent' };

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('respects custom page number', async () => {
      // Arrange
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);
      const input: SearchPostsInput = { page: 5 };

      // Act
      await usecase.execute(input);

      // Assert
      expect(mockPostRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 5,
        })
      );
    });
  });

  describe('execute - Result Structure', () => {
    it('returns result from repository', async () => {
      // Arrange
      const mockPosts = [
        createMockPost('post-1'),
        createMockPost('post-2'),
        createMockPost('post-3'),
      ];
      const mockResult = createPaginatedResult(mockPosts, 50, 1, 20);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);
      const input: SearchPostsInput = {};

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(mockResult);
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toBeInstanceOf(Post);
    });
  });

  describe('create factory', () => {
    it('creates a SearchPosts instance with repository', () => {
      // Act
      const instance = SearchPosts.create(mockPostRepository);

      // Assert
      expect(instance).toBeInstanceOf(SearchPosts);
    });
  });

  describe('omits undefined filters', () => {
    it('does not include undefined keyword in query', async () => {
      // Arrange
      const input: SearchPostsInput = { keyword: undefined };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      const calledQuery = vi.mocked(mockPostRepository.search).mock.calls[0][0];
      expect('keyword' in calledQuery).toBe(false);
    });

    it('does not include undefined edition in query', async () => {
      // Arrange
      const input: SearchPostsInput = { edition: undefined };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      const calledQuery = vi.mocked(mockPostRepository.search).mock.calls[0][0];
      expect('edition' in calledQuery).toBe(false);
    });

    it('does not include undefined sizeCategory in query', async () => {
      // Arrange
      const input: SearchPostsInput = { sizeCategory: undefined };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      const calledQuery = vi.mocked(mockPostRepository.search).mock.calls[0][0];
      expect('sizeCategory' in calledQuery).toBe(false);
    });

    it('does not include undefined hasRequiredMods in query', async () => {
      // Arrange
      const input: SearchPostsInput = { hasRequiredMods: undefined };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      const calledQuery = vi.mocked(mockPostRepository.search).mock.calls[0][0];
      expect('hasRequiredMods' in calledQuery).toBe(false);
    });

    it('does not include undefined authorId in query', async () => {
      // Arrange
      const input: SearchPostsInput = { authorId: undefined };
      const mockResult = createPaginatedResult([], 0);
      vi.mocked(mockPostRepository.search).mockResolvedValue(mockResult);

      // Act
      await usecase.execute(input);

      // Assert
      const calledQuery = vi.mocked(mockPostRepository.search).mock.calls[0][0];
      expect('authorId' in calledQuery).toBe(false);
    });
  });
});
