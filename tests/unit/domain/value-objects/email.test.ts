/**
 * Email Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  Email,
  InvalidEmailError,
} from '../../../../src/domain/value-objects/email';

describe('Email Value Object', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create Email with valid email address', () => {
      const email = Email.create('user@example.com');

      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('user@example.com');
    });

    it('should create Email with complex valid email', () => {
      const email = Email.create('user.name+tag@subdomain.example.co.jp');

      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('user.name+tag@subdomain.example.co.jp');
    });

    it('should preserve case in email address', () => {
      const email = Email.create('User.Name@Example.COM');

      expect(email.value).toBe('User.Name@Example.COM');
    });

    it('should throw InvalidEmailError for empty string', () => {
      expect(() => Email.create('')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for whitespace only', () => {
      expect(() => Email.create('   ')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for email without @', () => {
      expect(() => Email.create('userexample.com')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for email without domain', () => {
      expect(() => Email.create('user@')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for email without local part', () => {
      expect(() => Email.create('@example.com')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for email without TLD', () => {
      expect(() => Email.create('user@example')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for email with spaces', () => {
      expect(() => Email.create('user name@example.com')).toThrow(
        InvalidEmailError
      );
    });

    it('should throw InvalidEmailError for email with multiple @', () => {
      expect(() => Email.create('user@@example.com')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for null', () => {
      expect(() => Email.create(null as unknown as string)).toThrow(
        InvalidEmailError
      );
    });

    it('should throw InvalidEmailError for undefined', () => {
      expect(() => Email.create(undefined as unknown as string)).toThrow(
        InvalidEmailError
      );
    });

    it('should throw InvalidEmailError with descriptive message', () => {
      try {
        Email.create('invalid-email');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidEmailError);
        expect((error as InvalidEmailError).message).toContain('invalid-email');
      }
    });
  });

  describe('isValid()', () => {
    it('should return true for valid email', () => {
      expect(Email.isValid('user@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(Email.isValid('user@mail.example.com')).toBe(true);
    });

    it('should return true for email with plus sign', () => {
      expect(Email.isValid('user+tag@example.com')).toBe(true);
    });

    it('should return true for email with dots in local part', () => {
      expect(Email.isValid('user.name@example.com')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(Email.isValid('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(Email.isValid('   ')).toBe(false);
    });

    it('should return false for email without @', () => {
      expect(Email.isValid('userexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(Email.isValid('user@')).toBe(false);
    });

    it('should return false for email without local part', () => {
      expect(Email.isValid('@example.com')).toBe(false);
    });

    it('should return false for email without TLD', () => {
      expect(Email.isValid('user@example')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Email.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Email.isValid(undefined as unknown as string)).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(Email.isValid(123 as unknown as string)).toBe(false);
      expect(Email.isValid({} as unknown as string)).toBe(false);
      expect(Email.isValid([] as unknown as string)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('value getter', () => {
    it('should return the full email address', () => {
      const email = Email.create('user@example.com');

      expect(email.value).toBe('user@example.com');
    });
  });

  describe('localPart getter', () => {
    it('should return the part before @', () => {
      const email = Email.create('user@example.com');

      expect(email.localPart).toBe('user');
    });

    it('should handle dots in local part', () => {
      const email = Email.create('user.name@example.com');

      expect(email.localPart).toBe('user.name');
    });

    it('should handle plus sign in local part', () => {
      const email = Email.create('user+tag@example.com');

      expect(email.localPart).toBe('user+tag');
    });
  });

  describe('domain getter', () => {
    it('should return the part after @', () => {
      const email = Email.create('user@example.com');

      expect(email.domain).toBe('example.com');
    });

    it('should handle subdomains', () => {
      const email = Email.create('user@mail.example.com');

      expect(email.domain).toBe('mail.example.com');
    });

    it('should handle country-code TLDs', () => {
      const email = Email.create('user@example.co.jp');

      expect(email.domain).toBe('example.co.jp');
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('equals()', () => {
    it('should return true for same email addresses', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different email addresses', () => {
      const email1 = Email.create('user1@example.com');
      const email2 = Email.create('user2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const email1 = Email.create('User@Example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should be symmetric', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(email2.equals(email1));
    });

    it('should be reflexive', () => {
      const email = Email.create('user@example.com');

      expect(email.equals(email)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return the email address string', () => {
      const email = Email.create('user@example.com');

      expect(email.toString()).toBe('user@example.com');
    });

    it('should preserve original case', () => {
      const email = Email.create('User.Name@Example.COM');

      expect(email.toString()).toBe('User.Name@Example.COM');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const email = Email.create('user@example.com');

      expect(Object.isFrozen(email)).toBe(true);
    });

    it('should not allow property modification', () => {
      const email = Email.create('user@example.com');

      expect(() => {
        (email as { _value: string })._value = 'other@example.com';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const email = Email.create('user@example.com');

      expect(() => {
        (email as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidEmailError
  // ========================================
  describe('InvalidEmailError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidEmailError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidEmailError('test');

      expect(error.name).toBe('InvalidEmailError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidEmailError('invalid-email');

      expect(error.message).toContain('invalid-email');
    });

    it('should have descriptive error message', () => {
      const error = new InvalidEmailError('bad@email');

      expect(error.message).toContain('Invalid email');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle very long email addresses', () => {
      const longLocal = 'a'.repeat(64);
      const longDomain = 'b'.repeat(63) + '.com';
      const longEmail = `${longLocal}@${longDomain}`;

      const email = Email.create(longEmail);
      expect(email.value).toBe(longEmail);
    });

    it('should handle numeric local part', () => {
      const email = Email.create('123456@example.com');

      expect(email.localPart).toBe('123456');
    });

    it('should handle hyphen in domain', () => {
      const email = Email.create('user@my-domain.com');

      expect(email.domain).toBe('my-domain.com');
    });

    it('should handle underscore in local part', () => {
      const email = Email.create('user_name@example.com');

      expect(email.localPart).toBe('user_name');
    });

    it('should reject email with leading/trailing spaces', () => {
      expect(() => Email.create(' user@example.com')).toThrow(InvalidEmailError);
      expect(() => Email.create('user@example.com ')).toThrow(InvalidEmailError);
    });

    it('should reject email with space in domain', () => {
      expect(() => Email.create('user@exam ple.com')).toThrow(InvalidEmailError);
    });

    it('should handle international TLDs', () => {
      const email = Email.create('user@example.technology');

      expect(email.domain).toBe('example.technology');
    });
  });
});
