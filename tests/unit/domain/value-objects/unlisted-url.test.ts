/**
 * UnlistedUrl Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * UnlistedUrl manages access tokens and expiration for unlisted (limited-access) posts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UnlistedUrl,
  InvalidUnlistedUrlError,
  ExpiredUnlistedUrlError,
} from '../../../../src/domain/value-objects/unlisted-url';

describe('UnlistedUrl Value Object', () => {
  // Test constants
  const VALID_TOKEN = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // 32 chars
  const VALID_TOKEN_LONG = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'; // 40 chars
  const INVALID_TOKEN_SHORT = 'abc123'; // Too short
  const INVALID_TOKEN_SPECIAL = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4!@#$'; // Has special chars

  // Helper functions
  const createFutureDate = (hoursFromNow: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date;
  };

  const createPastDate = (hoursAgo: number): Date => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create UnlistedUrl with valid token and no expiry', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url).toBeInstanceOf(UnlistedUrl);
      expect(url.token).toBe(VALID_TOKEN);
      expect(url.expiresAt).toBeNull();
    });

    it('should create UnlistedUrl with valid token and future expiry', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url).toBeInstanceOf(UnlistedUrl);
      expect(url.token).toBe(VALID_TOKEN);
      expect(url.expiresAt).toEqual(expiresAt);
    });

    it('should create UnlistedUrl with longer valid token (40+ chars)', () => {
      const url = UnlistedUrl.create(VALID_TOKEN_LONG, null);

      expect(url).toBeInstanceOf(UnlistedUrl);
      expect(url.token).toBe(VALID_TOKEN_LONG);
    });

    it('should throw InvalidUnlistedUrlError for token less than 32 characters', () => {
      expect(() => UnlistedUrl.create(INVALID_TOKEN_SHORT, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should throw InvalidUnlistedUrlError for token with special characters', () => {
      expect(() => UnlistedUrl.create(INVALID_TOKEN_SPECIAL, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should throw InvalidUnlistedUrlError for empty string token', () => {
      expect(() => UnlistedUrl.create('', null)).toThrow(InvalidUnlistedUrlError);
    });

    it('should throw InvalidUnlistedUrlError for null token', () => {
      expect(() => UnlistedUrl.create(null as unknown as string, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should throw InvalidUnlistedUrlError for undefined token', () => {
      expect(() =>
        UnlistedUrl.create(undefined as unknown as string, null)
      ).toThrow(InvalidUnlistedUrlError);
    });

    it('should throw ExpiredUnlistedUrlError for past expiry date', () => {
      const pastDate = createPastDate(1);

      expect(() => UnlistedUrl.create(VALID_TOKEN, pastDate)).toThrow(
        ExpiredUnlistedUrlError
      );
    });

    it('should throw InvalidUnlistedUrlError with descriptive message', () => {
      try {
        UnlistedUrl.create('short', null);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidUnlistedUrlError);
        expect((error as InvalidUnlistedUrlError).message).toContain('32');
      }
    });
  });

  describe('generate()', () => {
    it('should generate UnlistedUrl with new random token', () => {
      const url = UnlistedUrl.generate();

      expect(url).toBeInstanceOf(UnlistedUrl);
      expect(url.token.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate valid alphanumeric token', () => {
      const url = UnlistedUrl.generate();

      expect(UnlistedUrl.isValidToken(url.token)).toBe(true);
    });

    it('should generate UnlistedUrl with no expiry by default', () => {
      const url = UnlistedUrl.generate();

      expect(url.expiresAt).toBeNull();
    });

    it('should generate UnlistedUrl with specified future expiry', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.generate(expiresAt);

      expect(url.expiresAt).toEqual(expiresAt);
    });

    it('should generate unique tokens on each call', () => {
      const url1 = UnlistedUrl.generate();
      const url2 = UnlistedUrl.generate();

      expect(url1.token).not.toBe(url2.token);
    });

    it('should throw ExpiredUnlistedUrlError for past expiry date', () => {
      const pastDate = createPastDate(1);

      expect(() => UnlistedUrl.generate(pastDate)).toThrow(
        ExpiredUnlistedUrlError
      );
    });
  });

  describe('isValidToken()', () => {
    it('should return true for valid 32-character alphanumeric token', () => {
      expect(UnlistedUrl.isValidToken(VALID_TOKEN)).toBe(true);
    });

    it('should return true for valid 40-character alphanumeric token', () => {
      expect(UnlistedUrl.isValidToken(VALID_TOKEN_LONG)).toBe(true);
    });

    it('should return false for token less than 32 characters', () => {
      expect(UnlistedUrl.isValidToken(INVALID_TOKEN_SHORT)).toBe(false);
    });

    it('should return false for token with special characters', () => {
      expect(UnlistedUrl.isValidToken(INVALID_TOKEN_SPECIAL)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(UnlistedUrl.isValidToken('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(UnlistedUrl.isValidToken(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(UnlistedUrl.isValidToken(undefined as unknown as string)).toBe(
        false
      );
    });

    it('should return false for token with spaces', () => {
      expect(
        UnlistedUrl.isValidToken('a1b2c3d4 e5f6g7h8i9j0k1l2m3n4o5p6')
      ).toBe(false);
    });

    it('should return true for token with uppercase letters', () => {
      expect(
        UnlistedUrl.isValidToken('A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6')
      ).toBe(true);
    });

    it('should return true for mixed case token', () => {
      expect(
        UnlistedUrl.isValidToken('A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6')
      ).toBe(true);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('token getter', () => {
    it('should return the token value', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.token).toBe(VALID_TOKEN);
    });
  });

  describe('expiresAt getter', () => {
    it('should return null for no expiry', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.expiresAt).toBeNull();
    });

    it('should return the expiry date', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.expiresAt).toEqual(expiresAt);
    });

    it('should return a defensive copy of expiresAt date', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const retrieved = url.expiresAt;
      if (retrieved) {
        retrieved.setFullYear(2000);
      }

      // Original should not be affected
      expect(url.expiresAt?.getFullYear()).not.toBe(2000);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('hasExpiry()', () => {
    it('should return false for no expiry (null)', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.hasExpiry()).toBe(false);
    });

    it('should return true when expiry is set', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.hasExpiry()).toBe(true);
    });
  });

  describe('isExpired()', () => {
    it('should return false for no expiry (null)', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.isExpired()).toBe(false);
    });

    it('should return false for future expiry', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.isExpired()).toBe(false);
    });

    it('should return true when current time is past expiry', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      // Test with a time after expiry
      const futureNow = createFutureDate(2);
      expect(url.isExpired(futureNow)).toBe(true);
    });

    it('should return false when current time is before expiry', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const pastNow = createFutureDate(1);
      expect(url.isExpired(pastNow)).toBe(false);
    });

    it('should use current time when now parameter is not provided', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.isExpired()).toBe(false);
    });

    it('should return true exactly at expiry time', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      // At exactly the expiry time, it should be considered expired
      expect(url.isExpired(expiresAt)).toBe(true);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid token with no expiry', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.isValid()).toBe(true);
    });

    it('should return true for valid token with future expiry', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.isValid()).toBe(true);
    });

    it('should return false when expired', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const futureNow = createFutureDate(2);
      expect(url.isValid(futureNow)).toBe(false);
    });

    it('should use current time when now parameter is not provided', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.isValid()).toBe(true);
    });
  });

  describe('getRemainingTime()', () => {
    it('should return null for no expiry', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.getRemainingTime()).toBeNull();
    });

    it('should return positive milliseconds for future expiry', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const remaining = url.getRemainingTime();
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThan(0);
    });

    it('should return approximately correct remaining time', () => {
      const expiresAt = createFutureDate(1); // 1 hour from now
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const now = new Date();
      const remaining = url.getRemainingTime(now);

      expect(remaining).not.toBeNull();
      // Should be approximately 1 hour in milliseconds (with some tolerance)
      const oneHourMs = 60 * 60 * 1000;
      expect(remaining!).toBeGreaterThan(oneHourMs - 5000); // 5 second tolerance
      expect(remaining!).toBeLessThanOrEqual(oneHourMs);
    });

    it('should return 0 or negative for expired URL', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const futureNow = createFutureDate(2);
      const remaining = url.getRemainingTime(futureNow);

      expect(remaining).not.toBeNull();
      expect(remaining!).toBeLessThanOrEqual(0);
    });

    it('should use current time when now parameter is not provided', () => {
      const expiresAt = createFutureDate(1);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      const remaining = url.getRemainingTime();
      expect(remaining).not.toBeNull();
      expect(remaining).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Equality and String
  // ========================================
  describe('equals()', () => {
    it('should return true for same token and expiry', () => {
      const expiresAt = createFutureDate(24);
      const url1 = UnlistedUrl.create(VALID_TOKEN, expiresAt);
      const url2 = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url1.equals(url2)).toBe(true);
    });

    it('should return true for same token with null expiry', () => {
      const url1 = UnlistedUrl.create(VALID_TOKEN, null);
      const url2 = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url1.equals(url2)).toBe(true);
    });

    it('should return false for different tokens', () => {
      const url1 = UnlistedUrl.create(VALID_TOKEN, null);
      const url2 = UnlistedUrl.create(VALID_TOKEN_LONG, null);

      expect(url1.equals(url2)).toBe(false);
    });

    it('should return false for same token but different expiry', () => {
      const expiresAt1 = createFutureDate(24);
      const expiresAt2 = createFutureDate(48);
      const url1 = UnlistedUrl.create(VALID_TOKEN, expiresAt1);
      const url2 = UnlistedUrl.create(VALID_TOKEN, expiresAt2);

      expect(url1.equals(url2)).toBe(false);
    });

    it('should return false for same token with one having expiry and one without', () => {
      const expiresAt = createFutureDate(24);
      const url1 = UnlistedUrl.create(VALID_TOKEN, expiresAt);
      const url2 = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url1.equals(url2)).toBe(false);
    });

    it('should be symmetric', () => {
      const url1 = UnlistedUrl.create(VALID_TOKEN, null);
      const url2 = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url1.equals(url2)).toBe(url2.equals(url1));
    });

    it('should be transitive', () => {
      const url1 = UnlistedUrl.create(VALID_TOKEN, null);
      const url2 = UnlistedUrl.create(VALID_TOKEN, null);
      const url3 = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url1.equals(url2)).toBe(true);
      expect(url2.equals(url3)).toBe(true);
      expect(url1.equals(url3)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return only the token', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(url.toString()).toBe(VALID_TOKEN);
    });

    it('should return token even when expiry is set', () => {
      const expiresAt = createFutureDate(24);
      const url = UnlistedUrl.create(VALID_TOKEN, expiresAt);

      expect(url.toString()).toBe(VALID_TOKEN);
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(Object.isFrozen(url)).toBe(true);
    });

    it('should not allow property modification', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(() => {
        (url as { _token: string })._token = 'newtoken1234567890123456789012';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);

      expect(() => {
        (url as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // Custom Errors
  // ========================================
  describe('InvalidUnlistedUrlError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidUnlistedUrlError('Invalid token');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidUnlistedUrlError('Invalid token');

      expect(error.name).toBe('InvalidUnlistedUrlError');
    });

    it('should contain the message', () => {
      const message = 'Token must be at least 32 characters';
      const error = new InvalidUnlistedUrlError(message);

      expect(error.message).toBe(message);
    });

    it('should support instanceof check', () => {
      try {
        UnlistedUrl.create('short', null);
      } catch (error) {
        expect(error instanceof InvalidUnlistedUrlError).toBe(true);
      }
    });
  });

  describe('ExpiredUnlistedUrlError', () => {
    it('should be an instance of Error', () => {
      const error = new ExpiredUnlistedUrlError('URL has expired');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new ExpiredUnlistedUrlError('URL has expired');

      expect(error.name).toBe('ExpiredUnlistedUrlError');
    });

    it('should contain the message', () => {
      const message = 'URL expired at 2024-01-01';
      const error = new ExpiredUnlistedUrlError(message);

      expect(error.message).toBe(message);
    });

    it('should support instanceof check', () => {
      const pastDate = createPastDate(1);
      try {
        UnlistedUrl.create(VALID_TOKEN, pastDate);
      } catch (error) {
        expect(error instanceof ExpiredUnlistedUrlError).toBe(true);
      }
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle token at exactly 32 characters', () => {
      const exactToken = 'abcdefghijklmnopqrstuvwxyz012345'; // 32 chars
      const url = UnlistedUrl.create(exactToken, null);

      expect(url.token).toBe(exactToken);
    });

    it('should handle token at 31 characters as invalid', () => {
      const shortToken = 'abcdefghijklmnopqrstuvwxyz01234'; // 31 chars

      expect(() => UnlistedUrl.create(shortToken, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should handle expiry at exactly current time as expired', () => {
      const now = new Date();
      const url = UnlistedUrl.create(VALID_TOKEN, createFutureDate(1));

      // Create a "now" that equals the expiry
      const expiresAt = url.expiresAt!;
      expect(url.isExpired(expiresAt)).toBe(true);
    });

    it('should handle numeric input as invalid token', () => {
      expect(() => UnlistedUrl.create(123456 as unknown as string, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should handle object input as invalid token', () => {
      expect(() => UnlistedUrl.create({} as unknown as string, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should handle array input as invalid token', () => {
      expect(() =>
        UnlistedUrl.create(['token'] as unknown as string, null)
      ).toThrow(InvalidUnlistedUrlError);
    });

    it('should handle token with only numbers', () => {
      const numericToken = '12345678901234567890123456789012'; // 32 digits
      const url = UnlistedUrl.create(numericToken, null);

      expect(url.token).toBe(numericToken);
    });

    it('should handle token with only letters', () => {
      const letterToken = 'abcdefghijklmnopqrstuvwxyzabcdef'; // 32 letters
      const url = UnlistedUrl.create(letterToken, null);

      expect(url.token).toBe(letterToken);
    });

    it('should handle very long token', () => {
      const longToken = 'a'.repeat(256);
      const url = UnlistedUrl.create(longToken, null);

      expect(url.token).toBe(longToken);
    });

    it('should reject token with hyphen', () => {
      const tokenWithHyphen = 'a1b2c3d4-e5f6g7h8-i9j0k1l2-m3n4o5'; // 35 chars with hyphens

      expect(() => UnlistedUrl.create(tokenWithHyphen, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });

    it('should reject token with underscore', () => {
      const tokenWithUnderscore = 'a1b2c3d4_e5f6g7h8_i9j0k1l2_m3n4o5';

      expect(() => UnlistedUrl.create(tokenWithUnderscore, null)).toThrow(
        InvalidUnlistedUrlError
      );
    });
  });

  // ========================================
  // Type Safety
  // ========================================
  describe('Type Safety', () => {
    it('should preserve token type as string', () => {
      const url = UnlistedUrl.create(VALID_TOKEN, null);
      const token: string = url.token;

      expect(typeof token).toBe('string');
    });

    it('should preserve expiresAt type as Date | null', () => {
      const url1 = UnlistedUrl.create(VALID_TOKEN, null);
      const url2 = UnlistedUrl.create(VALID_TOKEN, createFutureDate(24));

      const expiresAt1: Date | null = url1.expiresAt;
      const expiresAt2: Date | null = url2.expiresAt;

      expect(expiresAt1).toBeNull();
      expect(expiresAt2).toBeInstanceOf(Date);
    });
  });
});
