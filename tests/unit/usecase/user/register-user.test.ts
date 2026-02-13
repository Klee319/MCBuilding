/**
 * RegisterUser Usecase Tests
 *
 * TDD: RED phase - Write tests first
 * Tests for user registration flow including email verification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUser, RegisterUserError } from '../../../../src/usecase/user/register-user.js';
import type { UserRepositoryPort, UserCredentialRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { EmailPort, PasswordHasherPort } from '../../../../src/usecase/ports/gateway-ports.js';
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
  isEmailVerified: boolean;
}>): User {
  const now = new Date();
  return User.create({
    id: overrides?.id ?? 'user-123',
    displayName: overrides?.displayName ?? 'Test User',
    email: Email.create(overrides?.email ?? 'test@example.com'),
    accountLevel: AccountLevel.guest(),
    isEmailVerified: overrides?.isEmailVerified ?? false,
    isPhoneVerified: false,
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

describe('RegisterUser Usecase', () => {
  let userRepository: UserRepositoryPort;
  let userCredentialRepository: UserCredentialRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let emailPort: EmailPort;
  let usecase: RegisterUser;

  beforeEach(() => {
    // Create mock implementations
    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    userCredentialRepository = {
      findByEmailWithCredentials: vi.fn(),
      saveCredentials: vi.fn(),
    };

    passwordHasher = {
      hash: vi.fn().mockResolvedValue('hashed_password_123'),
      verify: vi.fn(),
    };

    emailPort = {
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };

    usecase = RegisterUser.create({
      userRepository,
      userCredentialRepository,
      passwordHasher,
      emailPort,
    });
  });

  describe('execute', () => {
    // ========================================
    // Success Cases
    // ========================================

    it('should successfully register a new user with valid email, displayName, and password', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);
      vi.mocked(emailPort.sendVerificationEmail).mockResolvedValue(undefined);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.email.value).toBe('newuser@example.com');
      expect(result.displayName).toBe('New User');
      expect(result.accountLevel.value).toBe('guest');
      expect(result.isEmailVerified).toBe(false);
      expect(result.isPhoneVerified).toBe(false);
    });

    it('should call userRepository.findByEmail to check for existing user', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
    });

    it('should save the user to repository', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      await usecase.execute(input);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New User',
          isEmailVerified: false,
        })
      );
    });

    it('should hash the password and save credentials', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      await usecase.execute(input);

      // Assert
      expect(passwordHasher.hash).toHaveBeenCalledWith('securePassword123');
      expect(userCredentialRepository.saveCredentials).toHaveBeenCalledWith(
        expect.stringMatching(/^user-/),
        'hashed_password_123'
      );
    });

    it('should send verification email after successful registration', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);
      vi.mocked(emailPort.sendVerificationEmail).mockResolvedValue(undefined);

      // Act
      await usecase.execute(input);

      // Assert
      expect(emailPort.sendVerificationEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.stringContaining('verify-')
      );
    });

    it('should create user with guest account level', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.accountLevel.isGuest()).toBe(true);
    });

    it('should generate a unique user ID starting with "user-"', async () => {
      // Arrange
      const input = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.id).toMatch(/^user-/);
    });

    // ========================================
    // Error Cases - Email Already Exists
    // ========================================

    it('should throw RegisterUserError when email already exists', async () => {
      // Arrange
      const existingUser = createMockUser({ email: 'existing@example.com' });
      const input = {
        email: 'existing@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('Email already registered');
    });

    it('should not save user when email already exists', async () => {
      // Arrange
      const existingUser = createMockUser({ email: 'existing@example.com' });
      const input = {
        email: 'existing@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(existingUser);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should not send verification email when email already exists', async () => {
      // Arrange
      const existingUser = createMockUser({ email: 'existing@example.com' });
      const input = {
        email: 'existing@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(existingUser);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(emailPort.sendVerificationEmail).not.toHaveBeenCalled();
    });

    // ========================================
    // Error Cases - Invalid Email Format
    // ========================================

    it('should throw error for invalid email format - missing @', async () => {
      // Arrange
      const input = {
        email: 'invalidemailformat',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid email format - missing domain', async () => {
      // Arrange
      const input = {
        email: 'user@',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid email format - missing local part', async () => {
      // Arrange
      const input = {
        email: '@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow();
    });

    // ========================================
    // Error Cases - Empty Email
    // ========================================

    it('should throw RegisterUserError when email is empty string', async () => {
      // Arrange
      const input = {
        email: '',
        displayName: 'New User',
        password: 'securePassword123',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('email cannot be empty');
    });

    it('should throw RegisterUserError when email is whitespace only', async () => {
      // Arrange
      const input = {
        email: '   ',
        displayName: 'New User',
        password: 'securePassword123',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('email cannot be empty');
    });

    // ========================================
    // Error Cases - Empty DisplayName
    // ========================================

    it('should throw RegisterUserError when displayName is empty string', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: '',
        password: 'securePassword123',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('displayName cannot be empty');
    });

    it('should throw RegisterUserError when displayName is whitespace only', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: '   ',
        password: 'securePassword123',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('displayName cannot be empty');
    });

    // ========================================
    // Error Cases - Invalid Password
    // ========================================

    it('should throw RegisterUserError when password is too short', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: 'New User',
        password: 'short',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('password must be at least 8 characters');
    });

    it('should throw RegisterUserError when password is empty', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: 'New User',
        password: '',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(RegisterUserError);
      await expect(usecase.execute(input)).rejects.toThrow('password must be at least 8 characters');
    });

    // ========================================
    // Edge Cases
    // ========================================

    it('should handle email with leading/trailing spaces by using as-is for validation', async () => {
      // Arrange
      const input = {
        email: '  user@example.com  ',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      // The Email value object handles validation - spaces around @ are invalid
      await expect(usecase.execute(input)).rejects.toThrow();
    });

    it('should handle displayName with leading/trailing spaces', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: '  Valid Name  ',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert - displayName should preserve spaces as given
      expect(result.displayName).toBe('  Valid Name  ');
    });

    it('should create user with empty linkedSns array', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.linkedSns).toEqual([]);
    });

    it('should create user with empty pinnedPostIds array', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.pinnedPostIds).toEqual([]);
    });

    it('should create user with zero follower and following counts', async () => {
      // Arrange
      const input = {
        email: 'user@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.save).mockImplementation(async (user) => user);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.followerCount).toBe(0);
      expect(result.followingCount).toBe(0);
    });
  });

  describe('create factory method', () => {
    it('should create a RegisterUser instance with valid dependencies', () => {
      const instance = RegisterUser.create({
        userRepository,
        userCredentialRepository,
        passwordHasher,
        emailPort,
      });
      expect(instance).toBeInstanceOf(RegisterUser);
    });
  });

  describe('RegisterUserError', () => {
    it('should have correct error name', () => {
      const error = new RegisterUserError('test message');
      expect(error.name).toBe('RegisterUserError');
    });

    it('should preserve error message', () => {
      const error = new RegisterUserError('custom error message');
      expect(error.message).toBe('custom error message');
    });

    it('should be instanceof Error', () => {
      const error = new RegisterUserError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof RegisterUserError', () => {
      const error = new RegisterUserError('test');
      expect(error).toBeInstanceOf(RegisterUserError);
    });
  });
});
