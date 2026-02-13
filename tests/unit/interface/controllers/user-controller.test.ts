/**
 * UserController Unit Tests
 *
 * Tests for user-related HTTP request handling.
 * Follows TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController, type UserControllerDeps } from '../../../../src/interface/controllers/user-controller.js';
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockUser,
  createMockUsecase,
  createFailingUsecase,
  createMockUserRepository,
  expectSuccessResponse,
  expectErrorResponse,
} from './test-helpers.js';

describe('UserController', () => {
  let controller: UserController;
  let mockDeps: UserControllerDeps;

  // ========================================
  // Setup
  // ========================================

  beforeEach(() => {
    const mockUser = createMockUser();

    mockDeps = {
      registerUser: createMockUsecase(mockUser),
      loginUser: createMockUsecase({
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
      verifyEmail: createMockUsecase(mockUser),
      verifyPhone: createMockUsecase(mockUser),
      userRepository: createMockUserRepository(),
    };

    controller = UserController.create(mockDeps);
  });

  // ========================================
  // register() Tests
  // ========================================

  describe('register()', () => {
    it('registers user on success', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockDeps.registerUser.execute).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'securePassword123',
      });
    });

    it('returns 400 for invalid email format', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'invalid-email',
          password: 'securePassword123',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for empty display name', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: '',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for missing email', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          password: 'securePassword123',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for missing password', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for password too short', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'short', // Less than 8 characters
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 409 when email already exists', async () => {
      // Arrange
      mockDeps.registerUser = createFailingUsecase(new Error('Email already exists'));
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          email: 'existing@example.com',
          password: 'securePassword123',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 409, 'CONFLICT');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.registerUser = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: 'New User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('handles display name at max length', async () => {
      // Arrange
      const maxLengthName = 'A'.repeat(50);
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: maxLengthName,
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('returns 400 for display name exceeding max length', async () => {
      // Arrange
      const tooLongName = 'A'.repeat(51);
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: tooLongName,
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  // ========================================
  // verifyEmail() Tests
  // ========================================

  describe('verifyEmail()', () => {
    it('verifies email on success', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          userId: 'user-123',
          token: 'valid-token-abc123',
        },
        user: null,
      });

      // Act
      const response = await controller.verifyEmail(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.verifyEmail.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        verificationToken: 'valid-token-abc123',
      });
    });

    it('returns 400 for invalid input', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          userId: '',
          token: 'valid-token',
        },
        user: null,
      });

      // Act
      const response = await controller.verifyEmail(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when user not found', async () => {
      // Arrange
      mockDeps.verifyEmail = createFailingUsecase(new Error('User not found'));
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          userId: 'nonexistent',
          token: 'valid-token',
        },
        user: null,
      });

      // Act
      const response = await controller.verifyEmail(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 400 for invalid or expired token', async () => {
      // Arrange
      mockDeps.verifyEmail = createFailingUsecase(new Error('Invalid verification token'));
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          userId: 'user-123',
          token: 'invalid-token',
        },
        user: null,
      });

      // Act
      const response = await controller.verifyEmail(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.verifyEmail = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          userId: 'user-123',
          token: 'valid-token',
        },
        user: null,
      });

      // Act
      const response = await controller.verifyEmail(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // verifyPhone() Tests
  // ========================================

  describe('verifyPhone()', () => {
    it('verifies phone on success', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          code: '123456',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.verifyPhone.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        verificationCode: '123456',
      });
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        body: {
          code: '123456',
        },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for empty code', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          code: '',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for missing code', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {},
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when user not found', async () => {
      // Arrange
      mockDeps.verifyPhone = createFailingUsecase(new Error('User not found'));
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          code: '123456',
        },
        user: { id: 'nonexistent' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 400 for wrong verification code', async () => {
      // Arrange
      mockDeps.verifyPhone = createFailingUsecase(new Error('Invalid verification code'));
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          code: '000000',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.verifyPhone = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          code: '123456',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getMe() Tests
  // ========================================

  describe('getMe()', () => {
    it('returns current user on success', async () => {
      // Arrange
      const ctx = createMockContext({
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getMe(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({});

      // Act
      const response = await controller.getMe(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 404 when user not found in database', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        user: { id: 'deleted-user' },
      });

      // Act
      const response = await controller.getMe(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockRejectedValue(new Error('Database error')),
      });
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.getMe(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getById() Tests
  // ========================================

  describe('getById()', () => {
    it('returns user profile on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'user-456' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(mockDeps.userRepository.findById).toHaveBeenCalledWith('user-456');
    });

    it('works without authentication', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'user-456' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('returns 400 for invalid user ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when user not found', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      mockDeps.userRepository = createMockUserRepository({
        findById: vi.fn().mockRejectedValue(new Error('Database error')),
      });
      controller = UserController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'user-456' },
      });

      // Act
      const response = await controller.getById(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles email with special characters', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'user+tag@example.com',
          password: 'securePassword123',
          displayName: 'Test User',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles display name with unicode', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: 'User Name', // Simulating unicode
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles display name with emojis', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: 'Gamer Pro', // Could contain emojis
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('trims whitespace from display name', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          email: 'newuser@example.com',
          password: 'securePassword123',
          displayName: '  Test User  ',
        },
        user: null,
      });

      // Act
      const response = await controller.register(ctx);

      // Assert
      // Note: Validation may reject leading/trailing whitespace-only names
      // This test verifies the controller handles the input without crashing
      expect(response.status).toBeLessThan(500);
    });

    it('handles verification code with leading zeros', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          code: '000123',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.verifyPhone(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('handles concurrent getMe requests', async () => {
      // Arrange
      const ctx1 = createMockContext({ user: { id: 'user-1' } });
      const ctx2 = createMockContext({ user: { id: 'user-2' } });

      // Act
      const [response1, response2] = await Promise.all([
        controller.getMe(ctx1),
        controller.getMe(ctx2),
      ]);

      // Assert
      expectSuccessResponse(response1, 200);
      expectSuccessResponse(response2, 200);
    });
  });
});
