/**
 * PostController Unit Tests
 *
 * Tests for post-related HTTP request handling.
 * Follows TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostController, type PostControllerDeps } from '../../../../src/interface/controllers/post-controller.js';
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockPost,
  createMockUser,
  createMockUsecase,
  createFailingUsecase,
  createMockUserRepository,
  createMockStructureRepository,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
} from './test-helpers.js';
import type { PaginatedResult } from '../../../../src/usecase/ports/types.js';
import type { Post } from '../../../../src/domain/entities/post.js';

describe('PostController', () => {
  let controller: PostController;
  let mockDeps: PostControllerDeps;

  // ========================================
  // Setup
  // ========================================

  beforeEach(() => {
    const mockPost = createMockPost();
    const mockUser = createMockUser();

    mockDeps = {
      createPost: createMockUsecase(mockPost),
      updatePost: createMockUsecase(mockPost),
      deletePost: createMockUsecase(undefined),
      searchPosts: createMockUsecase({
        items: [mockPost],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      } as PaginatedResult<Post>),
      getPostDetail: createMockUsecase(mockPost),
      userRepository: createMockUserRepository(),
      structureRepository: createMockStructureRepository(),
    };

    controller = PostController.create(mockDeps);
  });

  // ========================================
  // search() Tests
  // ========================================

  describe('search()', () => {
    it('returns paginated posts on success', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
      expect(mockDeps.searchPosts.execute).toHaveBeenCalled();
    });

    it('applies keyword filter when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { keyword: 'minecraft castle' },
      });

      // Act
      await controller.search(ctx);

      // Assert
      expect(mockDeps.searchPosts.execute).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: 'minecraft castle' })
      );
    });

    it('applies edition filter when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { edition: 'java,bedrock' },
      });

      // Act
      await controller.search(ctx);

      // Assert
      expect(mockDeps.searchPosts.execute).toHaveBeenCalledWith(
        expect.objectContaining({ edition: ['java', 'bedrock'] })
      );
    });

    it('applies sizeCategory filter when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { sizeCategory: 'small,medium' },
      });

      // Act
      await controller.search(ctx);

      // Assert
      expect(mockDeps.searchPosts.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sizeCategory: ['small', 'medium'] })
      );
    });

    it('applies authorId filter when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { authorId: 'user-456' },
      });

      // Act
      await controller.search(ctx);

      // Assert
      expect(mockDeps.searchPosts.execute).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'user-456' })
      );
    });

    it('returns 400 for invalid query parameters', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { page: 'invalid' },
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 500 when usecase throws unexpected error', async () => {
      // Arrange
      mockDeps.searchPosts = createFailingUsecase(new Error('Database connection failed'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('returns 500 when author not found for post', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        query: {},
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getById() Tests
  // ========================================

  describe('getById()', () => {
    it('returns post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.getPostDetail.execute).toHaveBeenCalledWith(
        expect.objectContaining({ postId: 'post-123' })
      );
    });

    it('passes requesterId when user is authenticated', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-456' },
      });

      // Act
      await controller.getById(ctx);

      // Assert
      expect(mockDeps.getPostDetail.execute).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: 'user-456' })
      );
    });

    it('works without authentication for public posts', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('returns 400 for invalid post ID format', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when post not found', async () => {
      // Arrange
      mockDeps.getPostDetail = createFailingUsecase(new Error('Post not found'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 404 when author not found', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.getPostDetail = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getByUnlistedToken() Tests
  // ========================================

  describe('getByUnlistedToken()', () => {
    it('returns unlisted post with valid token', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { token: 'valid-token-abc123' },
      });

      // Act
      const response = await controller.getByUnlistedToken(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.getPostDetail.execute).toHaveBeenCalledWith(
        expect.objectContaining({ unlistedToken: 'valid-token-abc123' })
      );
    });

    it('returns 400 for invalid token format', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { token: '' },
      });

      // Act
      const response = await controller.getByUnlistedToken(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when unlisted post not found', async () => {
      // Arrange
      mockDeps.getPostDetail = createFailingUsecase(new Error('Post not found'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { token: 'invalid-token' },
      });

      // Act
      const response = await controller.getByUnlistedToken(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });
  });

  // ========================================
  // create() Tests
  // ========================================

  describe('create()', () => {
    it('creates post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          title: 'My New Post',
          description: 'A great structure',
          visibility: 'public',
          structureId: 'struct-123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockDeps.createPost.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My New Post',
          authorId: 'user-123',
        })
      );
    });

    it('creates post with optional fields', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          title: 'My New Post',
          description: 'A great structure',
          visibility: 'public',
          structureId: 'struct-123',
          tags: ['castle', 'medieval'],
          requiredMods: ['worldedit'],
        },
        user: { id: 'user-123' },
      });

      // Act
      await controller.create(ctx);

      // Assert
      expect(mockDeps.createPost.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['castle', 'medieval'],
          requiredMods: ['worldedit'],
        })
      );
    });

    it('creates unlisted post with expiry', async () => {
      // Arrange
      const expiryDate = '2025-12-31T23:59:59Z';
      const ctx = createMockContext({
        body: {
          title: 'My Unlisted Post',
          visibility: 'unlisted',
          structureId: 'struct-123',
          unlistedExpiry: expiryDate,
        },
        user: { id: 'user-123' },
      });

      // Act
      await controller.create(ctx);

      // Assert
      expect(mockDeps.createPost.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'unlisted',
          unlistedExpiry: expect.any(Date),
        })
      );
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        body: {
          title: 'My New Post',
          visibility: 'public',
          structureId: 'struct-123',
        },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid input', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          title: '', // Empty title
          visibility: 'public',
          structureId: 'struct-123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for missing required fields', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          title: 'My Post',
          // Missing visibility and structureId
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 when usecase throws validation error', async () => {
      // Arrange
      mockDeps.createPost = createFailingUsecase(new Error('Structure not found'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          title: 'My New Post',
          visibility: 'public',
          structureId: 'nonexistent',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.createPost = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          title: 'My New Post',
          visibility: 'public',
          structureId: 'struct-123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // update() Tests
  // ========================================

  describe('update()', () => {
    it('updates post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: {
          title: 'Updated Title',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.updatePost.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-123',
          requesterId: 'user-123',
          title: 'Updated Title',
        })
      );
    });

    it('updates multiple fields', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: {
          title: 'Updated Title',
          description: 'Updated description',
          visibility: 'private',
        },
        user: { id: 'user-123' },
      });

      // Act
      await controller.update(ctx);

      // Assert
      expect(mockDeps.updatePost.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated description',
          visibility: 'private',
        })
      );
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
        body: { title: 'Updated Title' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid post ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        body: { title: 'Updated Title' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 403 when user is not post author', async () => {
      // Arrange
      mockDeps.updatePost = createFailingUsecase(new Error('Not authorized'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { title: 'Updated Title' },
        user: { id: 'other-user' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 400 when usecase throws validation error', async () => {
      // Arrange
      mockDeps.updatePost = createFailingUsecase(new Error('title cannot be empty'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { description: 'Just description' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });
  });

  // ========================================
  // delete() Tests
  // ========================================

  describe('delete()', () => {
    it('deletes post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.deleted', true);
      expect(mockDeps.deletePost.execute).toHaveBeenCalledWith({
        postId: 'post-123',
        requesterId: 'user-123',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid post ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 403 when user is not post author', async () => {
      // Arrange
      mockDeps.deletePost = createFailingUsecase(new Error('Not authorized'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'other-user' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 404 when post not found', async () => {
      // Arrange
      mockDeps.deletePost = createFailingUsecase(new Error('Post not found'));
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.deletePost = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = PostController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.delete(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles null body gracefully', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: null,
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.update(ctx);

      // Assert
      // Should either succeed with empty update or return validation error
      expect(response.status).toBeLessThan(500);
    });

    it('handles undefined query parameters', async () => {
      // Arrange
      const ctx = createMockContext({
        query: {
          keyword: undefined,
          edition: undefined,
        },
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('handles very long title in create', async () => {
      // Arrange
      const longTitle = 'A'.repeat(300); // Over 200 char limit
      const ctx = createMockContext({
        body: {
          title: longTitle,
          visibility: 'public',
          structureId: 'struct-123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.create(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('handles special characters in search keyword', async () => {
      // Arrange
      const ctx = createMockContext({
        query: { keyword: 'test<script>alert("xss")</script>' },
      });

      // Act
      const response = await controller.search(ctx);

      // Assert
      // Should handle safely - either succeed or return validation error
      expect(response.status).toBeLessThan(500);
    });
  });
});
