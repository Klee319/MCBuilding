/**
 * VerifyEmail Usecase Tests
 *
 * TDD: RED phase - Write tests first
 * Tests for email verification flow and account level upgrade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerifyEmail, VerifyEmailError } from '../../../../src/usecase/user/verify-email.js';
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
    accountLevel: overrides?.accountLevel ?? AccountLevel.guest(),
    isEmailVerified: overrides?.isEmailVerified ?? false,
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

describe('VerifyEmail Usecase', () => {
  let userRepository: UserRepositoryPort;
  let usecase: VerifyEmail;

  beforeEach(() => {
    // Create mock implementations
    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    usecase = VerifyEmail.create(userRepository);
  });

  describe('execute', () => {
    // ========================================
    // Success Cases
    // ========================================

    it('should successfully verify email and upgrade account level to registered', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: false,
        accountLevel: AccountLevel.guest(),
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-123456789',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isEmailVerified).toBe(true);
      expect(result.accountLevel.value).toBe('registered');
    });

    it('should call userRepository.findById with correct userId', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isEmailVerified: false });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
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
      const user = createMockUser({ id: 'user-123', isEmailVerified: false });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: true,
        })
      );
    });

    it('should set account level to registered for guest users', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: false,
        accountLevel: AccountLevel.guest(),
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isRegistered()).toBe(true);
    });

    // ========================================
    // Already Verified (Idempotent)
    // ========================================

    it('should return existing user when email is already verified (idempotent)', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: true,
        accountLevel: AccountLevel.registered(),
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBe(user);
      expect(result.isEmailVerified).toBe(true);
    });

    it('should not save when email is already verified', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: true,
        accountLevel: AccountLevel.registered(),
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
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
        isEmailVerified: true,
        accountLevel: AccountLevel.verified(), // Higher level
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isVerified()).toBe(true); // Should keep verified level
    });

    // ========================================
    // Error Cases - User Not Found
    // ========================================

    it('should throw VerifyEmailError when user is not found', async () => {
      // Arrange
      const input = {
        userId: 'nonexistent-user',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyEmailError);
      await expect(usecase.execute(input)).rejects.toThrow('User not found');
    });

    it('should not save when user is not found', async () => {
      // Arrange
      const input = {
        userId: 'nonexistent-user',
        verificationToken: 'verify-token',
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
    // Error Cases - Invalid Token
    // ========================================

    it('should throw VerifyEmailError when verificationToken is empty', async () => {
      // Arrange
      const input = {
        userId: 'user-123',
        verificationToken: '',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyEmailError);
      await expect(usecase.execute(input)).rejects.toThrow('verificationToken cannot be empty');
    });

    it('should throw VerifyEmailError when verificationToken is whitespace only', async () => {
      // Arrange
      const input = {
        userId: 'user-123',
        verificationToken: '   ',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyEmailError);
      await expect(usecase.execute(input)).rejects.toThrow('verificationToken cannot be empty');
    });

    // ========================================
    // Error Cases - Invalid UserId
    // ========================================

    it('should throw VerifyEmailError when userId is empty', async () => {
      // Arrange
      const input = {
        userId: '',
        verificationToken: 'verify-token',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyEmailError);
      await expect(usecase.execute(input)).rejects.toThrow('userId cannot be empty');
    });

    it('should throw VerifyEmailError when userId is whitespace only', async () => {
      // Arrange
      const input = {
        userId: '   ',
        verificationToken: 'verify-token',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(VerifyEmailError);
      await expect(usecase.execute(input)).rejects.toThrow('userId cannot be empty');
    });

    // ========================================
    // Edge Cases - Token Validation
    // ========================================

    // Note: In current implementation, token validation is simplified.
    // These tests document expected behavior for future token validation.

    it('should accept any non-empty token (current simplified implementation)', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123', isEmailVerified: false });
      const input = {
        userId: 'user-123',
        verificationToken: 'any-valid-token-format',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isEmailVerified).toBe(true);
    });

    // ========================================
    // Edge Cases - Account Level Transitions
    // ========================================

    it('should preserve phone verification status when verifying email', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        isEmailVerified: false,
        isPhoneVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.isPhoneVerified).toBe(false);
    });

    it('should preserve user displayName when verifying email', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        displayName: 'Original Name',
        isEmailVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.displayName).toBe('Original Name');
    });

    it('should preserve user email address when verifying email', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        email: 'original@example.com',
        isEmailVerified: false,
      });
      const input = {
        userId: 'user-123',
        verificationToken: 'verify-token',
      };

      vi.mocked(userRepository.findById).mockResolvedValue(user);
      vi.mocked(userRepository.save).mockImplementation(async (u) => u);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.email.value).toBe('original@example.com');
    });
  });

  describe('create factory method', () => {
    it('should create a VerifyEmail instance with valid dependencies', () => {
      const instance = VerifyEmail.create(userRepository);
      expect(instance).toBeInstanceOf(VerifyEmail);
    });
  });

  describe('VerifyEmailError', () => {
    it('should have correct error name', () => {
      const error = new VerifyEmailError('test message');
      expect(error.name).toBe('VerifyEmailError');
    });

    it('should preserve error message', () => {
      const error = new VerifyEmailError('custom error message');
      expect(error.message).toBe('custom error message');
    });

    it('should be instanceof Error', () => {
      const error = new VerifyEmailError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof VerifyEmailError', () => {
      const error = new VerifyEmailError('test');
      expect(error).toBeInstanceOf(VerifyEmailError);
    });
  });
});
