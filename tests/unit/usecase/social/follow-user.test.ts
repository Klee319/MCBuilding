/**
 * FollowUser Usecase Tests
 *
 * TDD: RED phase - Write tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FollowUser, FollowUserError } from '../../../../src/usecase/social/follow-user.js';
import type { FollowRepositoryPort, UserRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { NotificationPort } from '../../../../src/usecase/ports/gateway-ports.js';
import { Follow } from '../../../../src/domain/entities/follow.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ========================================
// Test Helpers
// ========================================

function createMockUser(overrides?: Partial<{
  id: string;
  displayName: string;
}>): User {
  const now = new Date();
  return User.create({
    id: overrides?.id ?? 'user-123',
    displayName: overrides?.displayName ?? 'Test User',
    email: Email.create('test@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

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

describe('FollowUser Usecase', () => {
  let followRepository: FollowRepositoryPort;
  let userRepository: UserRepositoryPort;
  let notificationPort: NotificationPort;
  let usecase: FollowUser;

  beforeEach(() => {
    // Create mock implementations
    followRepository = {
      findByFollowerAndFollowee: vi.fn(),
      findFollowers: vi.fn(),
      findFollowing: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    notificationPort = {
      notify: vi.fn(),
      notifyBulk: vi.fn(),
    };

    usecase = FollowUser.create(followRepository, userRepository, notificationPort);
  });

  describe('execute', () => {
    it('should create a follow when user has not followed before', async () => {
      // Arrange
      const followee = createMockUser({ id: 'followee-456' });
      const followerId = 'follower-789';

      vi.mocked(userRepository.findById).mockResolvedValue(followee);
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);
      vi.mocked(followRepository.save).mockImplementation(async (follow) => follow);

      // Act
      await usecase.execute({ followerId, followeeId: 'followee-456' });

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('followee-456');
      expect(followRepository.findByFollowerAndFollowee).toHaveBeenCalledWith(followerId, 'followee-456');
      expect(followRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          followerId,
          followeeId: 'followee-456',
        })
      );
    });

    it('should throw error when trying to follow yourself', async () => {
      // Arrange
      const userId = 'user-123';

      // Act & Assert
      await expect(
        usecase.execute({ followerId: userId, followeeId: userId })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: userId, followeeId: userId })
      ).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error when followee user does not exist', async () => {
      // Arrange
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: 'nonexistent-user' })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: 'nonexistent-user' })
      ).rejects.toThrow('User not found');
    });

    it('should be idempotent - no error when already following', async () => {
      // Arrange
      const followee = createMockUser({ id: 'followee-456' });
      const existingFollow = createMockFollow('follower-789', 'followee-456');

      vi.mocked(userRepository.findById).mockResolvedValue(followee);
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(existingFollow);

      // Act & Assert - should not throw
      await expect(
        usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' })
      ).resolves.not.toThrow();

      // Should not create a new follow
      expect(followRepository.save).not.toHaveBeenCalled();
    });

    it('should send notification to followee', async () => {
      // Arrange
      const followee = createMockUser({ id: 'followee-456' });
      const followerId = 'follower-789';

      vi.mocked(userRepository.findById).mockResolvedValue(followee);
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);
      vi.mocked(followRepository.save).mockImplementation(async (follow) => follow);

      // Act
      await usecase.execute({ followerId, followeeId: 'followee-456' });

      // Assert
      expect(notificationPort.notify).toHaveBeenCalledWith(
        'followee-456',
        expect.objectContaining({
          type: 'follow',
          metadata: { followerId },
        })
      );
    });

    it('should not send notification when already following (idempotent)', async () => {
      // Arrange
      const followee = createMockUser({ id: 'followee-456' });
      const existingFollow = createMockFollow('follower-789', 'followee-456');

      vi.mocked(userRepository.findById).mockResolvedValue(followee);
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(existingFollow);

      // Act
      await usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' });

      // Assert
      expect(notificationPort.notify).not.toHaveBeenCalled();
    });

    it('should throw error when followerId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: '', followeeId: 'followee-123' })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: '', followeeId: 'followee-123' })
      ).rejects.toThrow('followerId cannot be empty');
    });

    it('should throw error when followeeId is empty', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '' })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '' })
      ).rejects.toThrow('followeeId cannot be empty');
    });

    it('should throw error when followerId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: '   ', followeeId: 'followee-123' })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: '   ', followeeId: 'followee-123' })
      ).rejects.toThrow('followerId cannot be empty');
    });

    it('should throw error when followeeId is whitespace only', async () => {
      // Act & Assert
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '   ' })
      ).rejects.toThrow(FollowUserError);
      await expect(
        usecase.execute({ followerId: 'follower-123', followeeId: '   ' })
      ).rejects.toThrow('followeeId cannot be empty');
    });

    it('should generate a unique follow ID', async () => {
      // Arrange
      const followee = createMockUser({ id: 'followee-456' });
      let savedFollow: Follow | null = null;

      vi.mocked(userRepository.findById).mockResolvedValue(followee);
      vi.mocked(followRepository.findByFollowerAndFollowee).mockResolvedValue(null);
      vi.mocked(followRepository.save).mockImplementation(async (follow) => {
        savedFollow = follow;
        return follow;
      });

      // Act
      await usecase.execute({ followerId: 'follower-789', followeeId: 'followee-456' });

      // Assert
      expect(savedFollow).not.toBeNull();
      expect(savedFollow!.id).toContain('follow-');
      expect(savedFollow!.id).toContain('follower-789');
      expect(savedFollow!.id).toContain('followee-456');
    });
  });

  describe('create factory method', () => {
    it('should create a FollowUser instance with valid dependencies', () => {
      const instance = FollowUser.create(followRepository, userRepository, notificationPort);
      expect(instance).toBeInstanceOf(FollowUser);
    });
  });
});
