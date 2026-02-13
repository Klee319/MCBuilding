/**
 * LoginUser Usecase Tests
 *
 * TDD: RED phase - Write tests first
 * Tests for user login flow with JWT token generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUser, LoginUserError } from '../../../../src/usecase/user/login-user.js';
import type { UserCredentialRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { PasswordHasherPort, JwtServicePort } from '../../../../src/usecase/ports/gateway-ports.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ========================================
// Test Helpers
// ========================================

/**
 * User with credentials for testing login
 */
interface UserWithCredentials {
  user: User;
  passwordHash: string;
}

function createMockUserWithCredentials(overrides?: Partial<{
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  isEmailVerified: boolean;
}>): UserWithCredentials {
  const now = new Date();
  const user = User.create({
    id: overrides?.id ?? 'user-123',
    displayName: overrides?.displayName ?? 'Test User',
    email: Email.create(overrides?.email ?? 'test@example.com'),
    accountLevel: AccountLevel.guest(),
    isEmailVerified: overrides?.isEmailVerified ?? true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  return {
    user,
    passwordHash: overrides?.passwordHash ?? 'hashed_password_123',
  };
}

// ========================================
// Tests
// ========================================

describe('LoginUser Usecase', () => {
  let userCredentialRepository: UserCredentialRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let jwtService: JwtServicePort;
  let usecase: LoginUser;

  beforeEach(() => {
    // Create mock implementations
    userCredentialRepository = {
      findByEmailWithCredentials: vi.fn(),
    };

    passwordHasher = {
      hash: vi.fn(),
      verify: vi.fn(),
    };

    jwtService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    usecase = LoginUser.create(userCredentialRepository, passwordHasher, jwtService);
  });

  describe('execute', () => {
    // ========================================
    // Success Cases
    // ========================================

    it('should successfully login with valid email and password', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'correctPassword123',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token_123');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token_456');

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email.value).toBe('test@example.com');
      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_456');
    });

    it('should call userCredentialRepository.findByEmailWithCredentials with provided email', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'correctPassword123',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token');

      // Act
      await usecase.execute(input);

      // Assert
      expect(userCredentialRepository.findByEmailWithCredentials).toHaveBeenCalledWith('test@example.com');
    });

    it('should call passwordHasher.verify with stored hash and input password', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'correctPassword123',
      };

      const mockUserWithCreds = createMockUserWithCredentials({
        email: 'test@example.com',
        passwordHash: 'stored_hash_abc',
      });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token');

      // Act
      await usecase.execute(input);

      // Assert
      expect(passwordHasher.verify).toHaveBeenCalledWith('correctPassword123', 'stored_hash_abc');
    });

    it('should call jwtService to generate access and refresh tokens', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'correctPassword123',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ id: 'user-456', email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token');

      // Act
      await usecase.execute(input);

      // Assert
      expect(jwtService.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user-456',
        email: 'test@example.com',
      });
      expect(jwtService.generateRefreshToken).toHaveBeenCalledWith({
        userId: 'user-456',
      });
    });

    // ========================================
    // Error Cases - User Not Found
    // ========================================

    it('should throw LoginUserError with INVALID_CREDENTIALS when user not found', async () => {
      // Arrange
      const input = {
        email: 'nonexistent@example.com',
        password: 'somePassword',
      };

      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should not call passwordHasher.verify when user not found', async () => {
      // Arrange
      const input = {
        email: 'nonexistent@example.com',
        password: 'somePassword',
      };

      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(null);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(passwordHasher.verify).not.toHaveBeenCalled();
    });

    // ========================================
    // Error Cases - Invalid Password
    // ========================================

    it('should throw LoginUserError with INVALID_CREDENTIALS when password is incorrect', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(false);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should not generate tokens when password is incorrect', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(false);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(jwtService.generateAccessToken).not.toHaveBeenCalled();
      expect(jwtService.generateRefreshToken).not.toHaveBeenCalled();
    });

    // ========================================
    // Error Cases - Empty Input
    // ========================================

    it('should throw LoginUserError when email is empty string', async () => {
      // Arrange
      const input = {
        email: '',
        password: 'somePassword',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('email cannot be empty');
    });

    it('should throw LoginUserError when email is whitespace only', async () => {
      // Arrange
      const input = {
        email: '   ',
        password: 'somePassword',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('email cannot be empty');
    });

    it('should throw LoginUserError when password is empty string', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: '',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('password cannot be empty');
    });

    it('should throw LoginUserError when password is whitespace only', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: '   ',
      };

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(LoginUserError);
      await expect(usecase.execute(input)).rejects.toThrow('password cannot be empty');
    });

    // ========================================
    // Security: Same Error Message for User Not Found and Wrong Password
    // ========================================

    it('should return same error message for user not found and wrong password (security)', async () => {
      // This prevents user enumeration attacks

      // Case 1: User not found
      const input1 = {
        email: 'nonexistent@example.com',
        password: 'somePassword',
      };
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(null);

      let error1Message = '';
      try {
        await usecase.execute(input1);
      } catch (error) {
        error1Message = (error as Error).message;
      }

      // Case 2: Wrong password
      const input2 = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };
      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(false);

      let error2Message = '';
      try {
        await usecase.execute(input2);
      } catch (error) {
        error2Message = (error as Error).message;
      }

      // Assert: Both errors should have the same message
      expect(error1Message).toBe(error2Message);
      expect(error1Message).toBe('INVALID_CREDENTIALS');
    });

    // ========================================
    // Edge Cases
    // ========================================

    it('should handle email case-insensitively', async () => {
      // Arrange
      const input = {
        email: 'TEST@EXAMPLE.COM',
        password: 'correctPassword',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token');

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.user).toBeDefined();
      // Repository should be called with lowercase email
      expect(userCredentialRepository.findByEmailWithCredentials).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle email with leading/trailing spaces by trimming', async () => {
      // Arrange
      const input = {
        email: '  test@example.com  ',
        password: 'correctPassword',
      };

      const mockUserWithCreds = createMockUserWithCredentials({ email: 'test@example.com' });
      vi.mocked(userCredentialRepository.findByEmailWithCredentials).mockResolvedValue(mockUserWithCreds);
      vi.mocked(passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(jwtService.generateAccessToken).mockResolvedValue('access_token');
      vi.mocked(jwtService.generateRefreshToken).mockResolvedValue('refresh_token');

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.user).toBeDefined();
      expect(userCredentialRepository.findByEmailWithCredentials).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('create factory method', () => {
    it('should create a LoginUser instance with valid dependencies', () => {
      const instance = LoginUser.create(userCredentialRepository, passwordHasher, jwtService);
      expect(instance).toBeInstanceOf(LoginUser);
    });
  });

  describe('LoginUserError', () => {
    it('should have correct error name', () => {
      const error = new LoginUserError('test message');
      expect(error.name).toBe('LoginUserError');
    });

    it('should preserve error message', () => {
      const error = new LoginUserError('custom error message');
      expect(error.message).toBe('custom error message');
    });

    it('should be instanceof Error', () => {
      const error = new LoginUserError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof LoginUserError', () => {
      const error = new LoginUserError('test');
      expect(error).toBeInstanceOf(LoginUserError);
    });

    it('should support error code property', () => {
      const error = new LoginUserError('INVALID_CREDENTIALS', 'INVALID_CREDENTIALS');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
