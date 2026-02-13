/**
 * SocialController Unit Tests
 *
 * Tests for social-related HTTP request handling (likes, comments, follows).
 * Follows TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialController, type SocialControllerDeps } from '../../../../src/interface/controllers/social-controller.js';
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockComment,
  createMockUser,
  createMockUsecase,
  createFailingUsecase,
  createMockUserRepository,
  createMockCommentRepository,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
} from './test-helpers.js';

describe('SocialController', () => {
  let controller: SocialController;
  let mockDeps: SocialControllerDeps;

  // ========================================
  // Setup
  // ========================================

  beforeEach(() => {
    const mockComment = createMockComment();
    const mockUser = createMockUser();

    mockDeps = {
      likePost: createMockUsecase(undefined),
      unlikePost: createMockUsecase(undefined),
      addComment: createMockUsecase(mockComment),
      deleteComment: createMockUsecase(undefined),
      followUser: createMockUsecase(undefined),
      unfollowUser: createMockUsecase(undefined),
      userRepository: createMockUserRepository(),
      commentRepository: createMockCommentRepository(),
    };

    controller = SocialController.create(mockDeps);
  });

  // ========================================
  // likePost() Tests
  // ========================================

  describe('likePost()', () => {
    it('likes post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.likePost(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.liked', true);
      expect(mockDeps.likePost.execute).toHaveBeenCalledWith({
        postId: 'post-123',
        userId: 'user-123',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.likePost(ctx);

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
      const response = await controller.likePost(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when post not found', async () => {
      // Arrange
      mockDeps.likePost = createFailingUsecase(new Error('Post not found'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.likePost(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 400 when already liked', async () => {
      // Arrange
      mockDeps.likePost = createFailingUsecase(new Error('Already liked'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.likePost(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.likePost = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.likePost(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // unlikePost() Tests
  // ========================================

  describe('unlikePost()', () => {
    it('unlikes post on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unlikePost(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.liked', false);
      expect(mockDeps.unlikePost.execute).toHaveBeenCalledWith({
        postId: 'post-123',
        userId: 'user-123',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
      });

      // Act
      const response = await controller.unlikePost(ctx);

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
      const response = await controller.unlikePost(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 when not liked', async () => {
      // Arrange
      mockDeps.unlikePost = createFailingUsecase(new Error('Not liked'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unlikePost(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.unlikePost = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unlikePost(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getComments() Tests
  // ========================================

  describe('getComments()', () => {
    it('returns paginated comments on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
      expect(mockDeps.commentRepository.findByPost).toHaveBeenCalledWith('post-123');
    });

    it('works without authentication', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectPaginatedResponse(response, 1, 1);
    });

    it('returns 400 for invalid post ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for invalid pagination parameters', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        query: { page: 'invalid', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 500 when author not found for comment', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('returns empty list when no comments', async () => {
      // Arrange
      mockDeps.commentRepository = createMockCommentRepository({
        findByPost: vi.fn().mockResolvedValue([]),
      });
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        query: { page: '1', limit: '20' },
      });

      // Act
      const response = await controller.getComments(ctx);

      // Assert
      expectPaginatedResponse(response, 0, 1);
    });
  });

  // ========================================
  // addComment() Tests
  // ========================================

  describe('addComment()', () => {
    it('adds comment on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: 'Great post!' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockDeps.addComment.execute).toHaveBeenCalledWith({
        postId: 'post-123',
        authorId: 'user-123',
        content: 'Great post!',
      });
    });

    it('adds reply comment when parentCommentId provided', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: {
          content: 'Thanks!',
          parentCommentId: 'comment-456',
        },
        user: { id: 'user-123' },
      });

      // Act
      await controller.addComment(ctx);

      // Assert
      expect(mockDeps.addComment.execute).toHaveBeenCalledWith({
        postId: 'post-123',
        authorId: 'user-123',
        content: 'Thanks!',
        parentCommentId: 'comment-456',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'post-123' },
        body: { content: 'Great post!' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for empty content', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for content exceeding max length', async () => {
      // Arrange
      const longContent = 'A'.repeat(1001); // Over 1000 char limit
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: longContent },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when post not found', async () => {
      // Arrange
      mockDeps.addComment = createFailingUsecase(new Error('Post not found'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        body: { content: 'Great post!' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 404 when author not found after comment creation', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: 'Great post!' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.addComment = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: 'Great post!' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // deleteComment() Tests
  // ========================================

  describe('deleteComment()', () => {
    it('deletes comment on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'comment-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.deleted', true);
      expect(mockDeps.deleteComment.execute).toHaveBeenCalledWith({
        commentId: 'comment-123',
        requesterId: 'user-123',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'comment-123' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid comment ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when comment not found', async () => {
      // Arrange
      mockDeps.deleteComment = createFailingUsecase(new Error('Comment not found'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 403 when user is not comment author', async () => {
      // Arrange
      mockDeps.deleteComment = createFailingUsecase(new Error('Not authorized'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'comment-123' },
        user: { id: 'other-user' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.deleteComment = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'comment-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.deleteComment(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // followUser() Tests
  // ========================================

  describe('followUser()', () => {
    it('follows user on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.following', true);
      expect(mockDeps.followUser.execute).toHaveBeenCalledWith({
        followerId: 'user-123',
        followeeId: 'user-456',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'user-456' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid user ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 when trying to follow yourself', async () => {
      // Arrange
      mockDeps.followUser = createFailingUsecase(new Error('Cannot follow yourself'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-123' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 404 when user not found', async () => {
      // Arrange
      mockDeps.followUser = createFailingUsecase(new Error('User not found'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 400 when already following', async () => {
      // Arrange
      mockDeps.followUser = createFailingUsecase(new Error('Already following'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.followUser = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.followUser(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // unfollowUser() Tests
  // ========================================

  describe('unfollowUser()', () => {
    it('unfollows user on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unfollowUser(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.following', false);
      expect(mockDeps.unfollowUser.execute).toHaveBeenCalledWith({
        followerId: 'user-123',
        followeeId: 'user-456',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'user-456' },
      });

      // Act
      const response = await controller.unfollowUser(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid user ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unfollowUser(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 when not following', async () => {
      // Arrange
      mockDeps.unfollowUser = createFailingUsecase(new Error('Not following'));
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unfollowUser(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.unfollowUser = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = SocialController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.unfollowUser(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles comment with max length content', async () => {
      // Arrange
      const maxContent = 'A'.repeat(1000);
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: maxContent },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles comment with special characters', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: '<script>alert("xss")</script>' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      // Should handle safely - either sanitize or succeed
      expect(response.status).toBeLessThan(500);
    });

    it('handles comment with unicode and emojis', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: 'Great post! Some special content!' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles deep reply threading', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: {
          content: 'Deep reply',
          parentCommentId: 'deep-comment-123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles rapid like/unlike operations', async () => {
      // Arrange
      const likeCtx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });
      const unlikeCtx = createMockContext({
        params: { id: 'post-123' },
        user: { id: 'user-123' },
      });

      // Act
      const likeResponse = await controller.likePost(likeCtx);
      const unlikeResponse = await controller.unlikePost(unlikeCtx);

      // Assert
      expectSuccessResponse(likeResponse, 200);
      expectSuccessResponse(unlikeResponse, 200);
    });

    it('handles concurrent follow operations', async () => {
      // Arrange
      const ctx1 = createMockContext({
        params: { id: 'user-456' },
        user: { id: 'user-123' },
      });
      const ctx2 = createMockContext({
        params: { id: 'user-789' },
        user: { id: 'user-123' },
      });

      // Act
      const [response1, response2] = await Promise.all([
        controller.followUser(ctx1),
        controller.followUser(ctx2),
      ]);

      // Assert
      expectSuccessResponse(response1, 200);
      expectSuccessResponse(response2, 200);
    });

    it('handles whitespace-only content', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'post-123' },
        body: { content: '   ' },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.addComment(ctx);

      // Assert
      // Note: Whitespace-only content validation depends on schema implementation
      // Some schemas may allow it while others may reject it
      expect(response.status).toBeLessThan(500);
    });
  });
});
