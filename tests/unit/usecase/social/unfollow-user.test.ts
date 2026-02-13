/**
 * UnfollowUser Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnfollowUser, UnfollowUserError } from '../../../../src/usecase/social/unfollow-user.js';
import type { FollowRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import { Follow } from '../../../../src/domain/entities/follow.js';

// ========================================
// Test Helpers
// ========================================

function createMockFollow(followerId: string, followeeId: string): Follow {
  return Follow.create({
    id: `follow-${followerId}-${followeeId}`,
    followerId,
    followeeId,
    createdAt: new Date(),
  });
}

// ========================================
// Tests
// ========================================

describe('UnfollowUser Usecase', () => {
  let followRepository: FollowRepositoryPort;
  let usecase: UnfollowUser;

  beforeEach(() => {
    // Create mock implementations
    followRepository = {
      findByFollowerAndFollowee: vi.fn(),
      findFollowers: vi.fn(),
      findFollowing: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    usecase = UnfollowUser.create(followRepository);
  });

  describe('execute', () => {
    it('should delete follow when follow relationship exists', async () => {
      // Arrange
      const existingFollow = createMockFollow('follower-789', 'followee-456');

      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(existingFollow);
      vi.mocked(followRepository.delete).mockResolvedValue(undefined);

      // Act
      await usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' });

      // Assert
      expect(followRepository.findByFollowerAndFollowee).toHaveBeenCalledWith('follower-789', 'followee-456');
      expect(followRepository.delete).toHaveBeenCalledWith('follower-789', 'followee-456');
    });

    it('should be idempotent - no error when not following', async () => {
      // Arrange
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);

      // Act & Assert - should not throw
      await expect(
        usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' })
      ).resolves.not.toThrow();

      // Should not attempt to delete
      expect(followRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle self-unfollow gracefully (idempotent, nothing to unfollow)', async () => {
      // Arrange
      const userId = 'user-123';
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);

      // Act & Assert - idempotent, should not throw even for self
      await expect(
        usecase.execute({ followerId: userId, followeeId: userId })
      ).resolves.not.toThrow();

      expect(followRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when followerId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: '', followeeId: 'followee-123' })
      ).rejects.toThrow(UnfollowUserError);
      await expect(
        usecase.execute({ followerId: '', followeeId: 'followee-123' })
      ).rejects.toThrow('followerId cannot be empty');
    });

    it('should throw error when followeeId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '' })
      ).rejects.toThrow(UnfollowUserError);
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '' })
      ).rejects.toThrow('followeeId cannot be empty');
    });

    it('should throw error when followerId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: '   ', followeeId: 'followee-123' })
      ).rejects.toThrow(UnfollowUserError);
      await expect(
        usecase.execute({ followerId: '   ', followeeId: 'followee-123' })
      ).rejects.toThrow('followerId cannot be empty');
    });

    it('should throw error when followeeId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '   ' })
      ).rejects.toThrow(UnfollowUserError);
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '   ' })
      ).rejects.toThrow('followeeId cannot be empty');
    });

    it('should not call delete when follow does not exist', async () => {
      // Arrange
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);

      // Act
      await usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' });

      // Assert
      expect(followRepository.findByFollowerAndFollowee).toHaveBeenCalledWith('follower-789', 'followee-456');
      expect(followRepository.delete).not.toHaveBeenCalled();
    });

    it('should call repository methods in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      const existingFollow = createMockFollow('follower-789', 'followee-456');

      vi.mocked(followRepository.findByFollowerAndFollowee).mockImplementation(async () => {
        callOrder.push('findByFollowerAndFollowee');
        return existingFollow;
      });
      vi.mocked(followRepository.delete).mockImplementation(async () => {
        callOrder.push('delete');
      });

      // Act
      await usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' });

      // Assert
      expect(callOrder).toEqual(['findByFollowerAndFollowee', 'delete']);
    });
  });

  describe('create factory method', () => {
    it('should create an UnfollowUser instance with valid dependencies', () => {
      const instance = UnfollowUser.create(followRepository);
      expect(instance).toBeInstanceOf(UnfollowUser);
    });
  });
});
