/**
 * PasswordHasherAdapter Unit Tests
 *
 * Tests the password hashing adapter implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordHasherAdapter } from '../../../../src/infra/security/password-hasher-adapter.js';
import type { PasswordHasherPort } from '../../../../src/usecase/ports/gateway-ports.js';

describe('PasswordHasherAdapter', () => {
  let passwordHasher: PasswordHasherPort;

  beforeEach(() => {
    passwordHasher = new PasswordHasherAdapter();
  });

  // ========================================
  // hash() Tests
  // ========================================

  describe('hash()', () => {
    it('returns a hashed password different from the input', async () => {
      // Arrange
      const password = 'securePassword123';

      // Act
      const hash = await passwordHasher.hash(password);

      // Assert
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('returns different hashes for the same password (salt)', async () => {
      // Arrange
      const password = 'securePassword123';

      // Act
      const hash1 = await passwordHasher.hash(password);
      const hash2 = await passwordHasher.hash(password);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty password', async () => {
      // Arrange
      const password = '';

      // Act
      const hash = await passwordHasher.hash(password);

      // Assert
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('handles very long password', async () => {
      // Arrange
      const password = 'a'.repeat(1000);

      // Act
      const hash = await passwordHasher.hash(password);

      // Assert
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('handles unicode characters in password', async () => {
      // Arrange
      const password = 'パスワード123日本語';

      // Act
      const hash = await passwordHasher.hash(password);

      // Assert
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // verify() Tests
  // ========================================

  describe('verify()', () => {
    it('returns true for correct password', async () => {
      // Arrange
      const password = 'securePassword123';
      const hash = await passwordHasher.hash(password);

      // Act
      const result = await passwordHasher.verify(password, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      // Arrange
      const password = 'securePassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await passwordHasher.hash(password);

      // Act
      const result = await passwordHasher.verify(wrongPassword, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false for slightly different password', async () => {
      // Arrange
      const password = 'securePassword123';
      const almostCorrect = 'securePassword124';
      const hash = await passwordHasher.hash(password);

      // Act
      const result = await passwordHasher.verify(almostCorrect, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false for case-different password', async () => {
      // Arrange
      const password = 'SecurePassword123';
      const differentCase = 'securepassword123';
      const hash = await passwordHasher.hash(password);

      // Act
      const result = await passwordHasher.verify(differentCase, hash);

      // Assert
      expect(result).toBe(false);
    });

    it('verifies empty password correctly', async () => {
      // Arrange
      const password = '';
      const hash = await passwordHasher.hash(password);

      // Act
      const resultCorrect = await passwordHasher.verify(password, hash);
      const resultWrong = await passwordHasher.verify('not-empty', hash);

      // Assert
      expect(resultCorrect).toBe(true);
      expect(resultWrong).toBe(false);
    });

    it('verifies unicode password correctly', async () => {
      // Arrange
      const password = 'パスワード123日本語';
      const hash = await passwordHasher.hash(password);

      // Act
      const result = await passwordHasher.verify(password, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false for invalid hash format', async () => {
      // Arrange
      const password = 'password';
      const invalidHash = 'not-a-valid-hash';

      // Act
      const result = await passwordHasher.verify(password, invalidHash);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false for empty hash', async () => {
      // Arrange
      const password = 'password';
      const emptyHash = '';

      // Act
      const result = await passwordHasher.verify(password, emptyHash);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles passwords with special characters', async () => {
      // Arrange
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      // Act
      const hash = await passwordHasher.hash(password);
      const result = await passwordHasher.verify(password, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('handles passwords with newlines', async () => {
      // Arrange
      const password = 'password\nwith\nnewlines';

      // Act
      const hash = await passwordHasher.hash(password);
      const result = await passwordHasher.verify(password, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('handles passwords with null bytes', async () => {
      // Arrange
      const password = 'password\x00with\x00nulls';

      // Act
      const hash = await passwordHasher.hash(password);
      const result = await passwordHasher.verify(password, hash);

      // Assert
      expect(result).toBe(true);
    });
  });
});
