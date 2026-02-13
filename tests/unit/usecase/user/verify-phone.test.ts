/**
 * VerifyPhone Usecase Tests
 *
 * TDD: RED phase - Write tests first
 * Tests for phone verification flow and account level upgrade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerifyPhone, VerifyPhoneError } from '../../../../src/usecase/user/verify-phone.js';
import type { UserRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ========================================
// Test Helpers
// ========================================

function createMockUser(overrides?: Partial<{
  id: string;
  email: string;
  displayName: string;
  accountLevel: AccountLevel;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}>): User {
  const now = new Date();
  return User.create({
    id: overrides?.id ?? 'user-123',
    displayName: overrides?.displayName ?? 'Test User',
    email: Email.create(overrides?.email ?? 'test@example.com'),
    accountLevel: overrides?.accountLevel ?? AccountLevel.registered(),
    isEmailVerified: overrides?.isEmailVerified ?? true,
    isPhoneVerified: overrides?.isPhoneVerified ?? false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

// ========================================
// Tests
// ========================================

describe('VerifyPhone Usecase', () => {
  let userRepository: UserRepositoryPort;
  let usecase: VerifyPhone;

  beforeEach(() => {
    // Create mock implementations
    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    usecase = VerifyPhone.create(userRepository);
  });

  describe('execute', () => {
    // ========================================
    // Success Cases
    // ========================================

    it('should successfully verify phone and upgrade account level to verified', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: false,
        accountLevel: AccountLevel.registered(),
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isPhoneVerified).toBe(true);
      expect(result.accountLevel.value).toBe('verified');
    });

    it('should call userRepository.findById with correct userId', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isPhoneVerified: false });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should save the updated user to repository', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isPhoneVerified: false });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isPhoneVerified: true,
        })
      );
    });

    it('should set account level to verified for registered users', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: false,
        accountLevel: AccountLevel.registered(),
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isVerified()).toBe(true);
    });

    it('should upgrade guest to verified when phone is verified', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: false,
        accountLevel: AccountLevel.guest(),
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isVerified()).toBe(true);
    });

    // ========================================
    // Already Verified (Idempotent)
    // ========================================

    it('should return existing user when phone is already verified (idempotent)', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: true,
        accountLevel: AccountLevel.verified(),
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(user);
      expect(result.isPhoneVerified).toBe(true);
    });

    it('should not save when phone is already verified', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: true,
        accountLevel: AccountLevel.verified(),
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should not modify account level when already verified', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isPhoneVerified: true,
        accountLevel: AccountLevel.premium(), // Higher level
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isPremium()).toBe(true); // Should keep premium level
    });

    // ========================================
    // Error Cases - User Not Found
    // ========================================

    it('should throw VerifyPhoneError when user is not found', async () => {
      // Arrange
      const input = {
        userId: 'nonexistent-user',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyPhoneError);
      await expect(usecase.execute(input)).rejects.toThrow('User not found');
    });

    it('should not save when user is not found', async () => {
      // Arrange
      const input = {
        userId: 'nonexistent-user',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    // ========================================
    // Error Cases - Invalid Code
    // ========================================

    it('should throw VerifyPhoneError when verificationCode is empty', async () => {
      // Arrange
      const input = {
        userId: 'user-123',
        verificationCode: '',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyPhoneError);
      await expect(usecase.execute(input)).rejects.toThrow('verificationCode cannot be empty');
    });

    it('should throw VerifyPhoneError when verificationCode is whitespace only', async () => {
      // Arrange
      const input = {
        userId: 'user-123',
        verificationCode: '   ',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyPhoneError);
      await expect(usecase.execute(input)).rejects.toThrow('verificationCode cannot be empty');
    });

    // ========================================
    // Error Cases - Invalid UserId
    // ========================================

    it('should throw VerifyPhoneError when userId is empty', async () => {
      // Arrange
      const input = {
        userId: '',
        verificationCode: '123456',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyPhoneError);
      await expect(usecase.execute(input)).rejects.toThrow('userId cannot be empty');
    });

    it('should throw VerifyPhoneError when userId is whitespace only', async () => {
      // Arrange
      const input = {
        userId: '   ',
        verificationCode: '123456',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyPhoneError);
      await expect(usecase.execute(input)).rejects.toThrow('userId cannot be empty');
    });

    // ========================================
    // Edge Cases - Code Validation
    // ========================================

    // Note: In current implementation, code validation is simplified.
    // These tests document expected behavior for future code validation.

    it('should accept any non-empty code (current simplified implementation)', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isPhoneVerified: false });
      const input = {
        userId: 'user-123',
        verificationCode: 'any-code-format',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isPhoneVerified).toBe(true);
    });

    it('should accept numeric verification codes', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isPhoneVerified: false });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isPhoneVerified).toBe(true);
    });

    it('should accept alphanumeric verification codes', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isPhoneVerified: false });
      const input = {
        userId: 'user-123',
        verificationCode: 'ABC123',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isPhoneVerified).toBe(true);
    });

    // ========================================
    // Edge Cases - State Preservation
    // ========================================

    it('should preserve email verification status when verifying phone', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: true,
        isPhoneVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isEmailVerified).toBe(true);
    });

    it('should preserve user displayName when verifying phone', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        displayName: 'Original Name',
        isPhoneVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.displayName).toBe('Original Name');
    });

    it('should preserve user email address when verifying phone', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        email: 'original@example.com',
        isPhoneVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.email.value).toBe('original@example.com');
    });

    it('should preserve follower and following counts when verifying phone', async () => {
      // Arrange
      const now = new Date();
      const user = User.create({
        id: 'user-123',
        displayName: 'Test User',
        email: Email.create('test@example.com'),
        accountLevel: AccountLevel.registered(),
        isEmailVerified: true,
        isPhoneVerified: false,
        linkedSns: ['twitter'],
        pinnedPostIds: ['post-1', 'post-2'],
        followerCount: 100,
        followingCount: 50,
        createdAt: now,
        updatedAt: now,
      });
      const input = {
        userId: 'user-123',
        verificationCode: '123456',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.followerCount).toBe(100);
      expect(result.followingCount).toBe(50);
      expect(result.linkedSns).toEqual(['twitter']);
      expect(result.pinnedPostIds).toEqual(['post-1', 'post-2']);
    });
  });

  describe('create factory method', () => {
    it('should create a VerifyPhone instance with valid dependencies', () => {
      const instance = VerifyPhone.create(userRepository);
      expect(instance).toBeInstanceOf(VerifyPhone);
    });
  });

  describe('VerifyPhoneError', () => {
    it('should have correct error name', () => {
      const error = new VerifyPhoneError('test message');
      expect(error.name).toBe('VerifyPhoneError');
    });

    it('should preserve error message', () => {
      const error = new VerifyPhoneError('custom error message');
      expect(error.message).toBe('custom error message');
    });

    it('should be instanceof Error', () => {
      const error = new VerifyPhoneError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof VerifyPhoneError', () => {
      const error = new VerifyPhoneError('test');
      expect(error).toBeInstanceOf(VerifyPhoneError);
    });
  });
});
