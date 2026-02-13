/**
 * InMemoryUserCredentialRepository Unit Tests
 *
 * Tests the in-memory user credential repository implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserCredentialRepository } from '../../../../../src/infra/repositories/in-memory/in-memory-user-credential-repository.js';
import type { UserCredentialRepositoryPort, UserWithCredentials } from '../../../../../src/usecase/ports/repository-ports.js';
import { User } from '../../../../../src/domain/entities/user.js';
import { Email } from '../../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../../src/domain/value-objects/account-level.js';

describe('InMemoryUserCredentialRepository', () => {
  let repository: InMemoryUserCredentialRepository;

  const createTestUser = (overrides: { id?: string; email?: string } = {}): User => {
    const now = new Date();
    return User.create({
      id: overrides.id ?? 'user-1',
      displayName: 'Test User',
      email: Email.create(overrides.email ?? 'test@example.com'),
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
  };

  beforeEach(() => {
    repository = new InMemoryUserCredentialRepository();
  });

  // ========================================
  // findByEmailWithCredentials() Tests
  // ========================================

  describe('findByEmailWithCredentials()', () => {
    it('returns null for non-existent email', async () => {
      // Act
      const result = await repository.findByEmailWithCredentials('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('returns user with credentials for existing email', async () => {
      // Arrange
      const user = createTestUser({ email: 'existing@example.com' });
      const passwordHash = '$2b$10$hashedpassword123';
      await repository.saveWithCredentials(user, passwordHash);

      // Act
      const result = await repository.findByEmailWithCredentials('existing@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(user.id);
      expect(result?.user.email.value).toBe('existing@example.com');
      expect(result?.passwordHash).toBe(passwordHash);
    });

    it('handles case-insensitive email lookup', async () => {
      // Arrange
      const user = createTestUser({ email: 'Test@EXAMPLE.com' });
      const passwordHash = 'hashedpassword';
      await repository.saveWithCredentials(user, passwordHash);

      // Act
      const result1 = await repository.findByEmailWithCredentials('test@example.com');
      const result2 = await repository.findByEmailWithCredentials('TEST@EXAMPLE.COM');
      const result3 = await repository.findByEmailWithCredentials('Test@Example.Com');

      // Assert
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result3).not.toBeNull();
      expect(result1?.user.id).toBe(user.id);
    });

    it('returns correct user among multiple users', async () => {
      // Arrange
      const user1 = createTestUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = createTestUser({ id: 'user-2', email: 'user2@example.com' });
      const user3 = createTestUser({ id: 'user-3', email: 'user3@example.com' });

      await repository.saveWithCredentials(user1, 'hash1');
      await repository.saveWithCredentials(user2, 'hash2');
      await repository.saveWithCredentials(user3, 'hash3');

      // Act
      const result = await repository.findByEmailWithCredentials('user2@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.user.id).toBe('user-2');
      expect(result?.passwordHash).toBe('hash2');
    });
  });

  // ========================================
  // saveWithCredentials() Tests
  // ========================================

  describe('saveWithCredentials()', () => {
    it('saves user with credentials', async () => {
      // Arrange
      const user = createTestUser();
      const passwordHash = 'hashed-password-123';

      // Act
      await repository.saveWithCredentials(user, passwordHash);
      const result = await repository.findByEmailWithCredentials(user.email.value);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(user.id);
      expect(result?.passwordHash).toBe(passwordHash);
    });

    it('updates existing user credentials', async () => {
      // Arrange
      const user = createTestUser();
      await repository.saveWithCredentials(user, 'old-hash');

      // Act
      await repository.saveWithCredentials(user, 'new-hash');
      const result = await repository.findByEmailWithCredentials(user.email.value);

      // Assert
      expect(result?.passwordHash).toBe('new-hash');
    });

    it('handles empty password hash', async () => {
      // Arrange
      const user = createTestUser();

      // Act
      await repository.saveWithCredentials(user, '');
      const result = await repository.findByEmailWithCredentials(user.email.value);

      // Assert
      expect(result?.passwordHash).toBe('');
    });
  });

  // ========================================
  // clear() Tests
  // ========================================

  describe('clear()', () => {
    it('removes all stored credentials', async () => {
      // Arrange
      const user1 = createTestUser({ id: 'user-1', email: 'user1@example.com' });
      const user2 = createTestUser({ id: 'user-2', email: 'user2@example.com' });
      await repository.saveWithCredentials(user1, 'hash1');
      await repository.saveWithCredentials(user2, 'hash2');

      // Act
      repository.clear();

      // Assert
      const result1 = await repository.findByEmailWithCredentials('user1@example.com');
      const result2 = await repository.findByEmailWithCredentials('user2@example.com');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles email with special characters', async () => {
      // Arrange
      const user = createTestUser({ email: 'test+tag@example.com' });
      const passwordHash = 'hash';
      await repository.saveWithCredentials(user, passwordHash);

      // Act
      const result = await repository.findByEmailWithCredentials('test+tag@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.user.email.value).toBe('test+tag@example.com');
    });

    it('handles email with numbers', async () => {
      // Arrange
      const user = createTestUser({ email: 'user123@example456.com' });
      await repository.saveWithCredentials(user, 'hash');

      // Act
      const result = await repository.findByEmailWithCredentials('user123@example456.com');

      // Assert
      expect(result).not.toBeNull();
    });

    it('handles very long password hash', async () => {
      // Arrange
      const user = createTestUser();
      const longHash = '$2b$10$' + 'a'.repeat(500);
      await repository.saveWithCredentials(user, longHash);

      // Act
      const result = await repository.findByEmailWithCredentials(user.email.value);

      // Assert
      expect(result?.passwordHash).toBe(longHash);
    });

    it('maintains user data integrity', async () => {
      // Arrange
      const user = createTestUser({
        id: 'specific-user-id',
        email: 'integrity@example.com',
      });
      await repository.saveWithCredentials(user, 'hash');

      // Act
      const result = await repository.findByEmailWithCredentials('integrity@example.com');

      // Assert
      expect(result?.user.id).toBe('specific-user-id');
      expect(result?.user.displayName).toBe('Test User');
      expect(result?.user.email.value).toBe('integrity@example.com');
      expect(result?.user.accountLevel.value).toBe('registered');
    });
  });
});
