/**
 * AccountLevel Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Level hierarchy: guest(0) < registered(1) < verified(2) < premium(3)
 * Business Rule BR-006: registered level and above can download
 */
import { describe, it, expect } from 'vitest';
import {
  AccountLevel,
  InvalidAccountLevelError,
  ACCOUNT_LEVEL_VALUES,
  type AccountLevelValue,
} from '../../../../src/domain/value-objects/account-level';

describe('AccountLevel Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('ACCOUNT_LEVEL_VALUES', () => {
    it('should contain exactly guest, registered, verified, and premium in order', () => {
      expect(ACCOUNT_LEVEL_VALUES).toEqual([
        'guest',
        'registered',
        'verified',
        'premium',
      ]);
    });

    it('should be readonly array with 4 elements', () => {
      expect(ACCOUNT_LEVEL_VALUES.length).toBe(4);
      expect(ACCOUNT_LEVEL_VALUES).toContain('guest');
      expect(ACCOUNT_LEVEL_VALUES).toContain('registered');
      expect(ACCOUNT_LEVEL_VALUES).toContain('verified');
      expect(ACCOUNT_LEVEL_VALUES).toContain('premium');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create AccountLevel with valid value "guest"', () => {
      const level = AccountLevel.create('guest');

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('guest');
    });

    it('should create AccountLevel with valid value "registered"', () => {
      const level = AccountLevel.create('registered');

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('registered');
    });

    it('should create AccountLevel with valid value "verified"', () => {
      const level = AccountLevel.create('verified');

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('verified');
    });

    it('should create AccountLevel with valid value "premium"', () => {
      const level = AccountLevel.create('premium');

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('premium');
    });

    it('should throw InvalidAccountLevelError for invalid value', () => {
      expect(() => AccountLevel.create('invalid')).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should throw InvalidAccountLevelError for empty string', () => {
      expect(() => AccountLevel.create('')).toThrow(InvalidAccountLevelError);
    });

    it('should throw InvalidAccountLevelError for null', () => {
      expect(() => AccountLevel.create(null as unknown as string)).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should throw InvalidAccountLevelError for undefined', () => {
      expect(() => AccountLevel.create(undefined as unknown as string)).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should throw InvalidAccountLevelError for uppercase "GUEST"', () => {
      expect(() => AccountLevel.create('GUEST')).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should throw InvalidAccountLevelError for mixed case "Guest"', () => {
      expect(() => AccountLevel.create('Guest')).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should throw InvalidAccountLevelError with descriptive message', () => {
      try {
        AccountLevel.create('invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidAccountLevelError);
        expect((error as InvalidAccountLevelError).message).toContain(
          'invalid'
        );
        expect((error as InvalidAccountLevelError).message).toContain('guest');
        expect((error as InvalidAccountLevelError).message).toContain(
          'premium'
        );
      }
    });
  });

  describe('isValid()', () => {
    it('should return true for "guest"', () => {
      expect(AccountLevel.isValid('guest')).toBe(true);
    });

    it('should return true for "registered"', () => {
      expect(AccountLevel.isValid('registered')).toBe(true);
    });

    it('should return true for "verified"', () => {
      expect(AccountLevel.isValid('verified')).toBe(true);
    });

    it('should return true for "premium"', () => {
      expect(AccountLevel.isValid('premium')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(AccountLevel.isValid('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(AccountLevel.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(AccountLevel.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(AccountLevel.isValid(undefined as unknown as string)).toBe(false);
    });

    it('should return false for uppercase "PREMIUM"', () => {
      expect(AccountLevel.isValid('PREMIUM')).toBe(false);
    });
  });

  describe('guest()', () => {
    it('should return AccountLevel with value "guest"', () => {
      const level = AccountLevel.guest();

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('guest');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const level1 = AccountLevel.guest();
      const level2 = AccountLevel.guest();

      expect(level1).toBe(level2);
    });
  });

  describe('registered()', () => {
    it('should return AccountLevel with value "registered"', () => {
      const level = AccountLevel.registered();

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('registered');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const level1 = AccountLevel.registered();
      const level2 = AccountLevel.registered();

      expect(level1).toBe(level2);
    });
  });

  describe('verified()', () => {
    it('should return AccountLevel with value "verified"', () => {
      const level = AccountLevel.verified();

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('verified');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const level1 = AccountLevel.verified();
      const level2 = AccountLevel.verified();

      expect(level1).toBe(level2);
    });
  });

  describe('premium()', () => {
    it('should return AccountLevel with value "premium"', () => {
      const level = AccountLevel.premium();

      expect(level).toBeInstanceOf(AccountLevel);
      expect(level.value).toBe('premium');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const level1 = AccountLevel.premium();
      const level2 = AccountLevel.premium();

      expect(level1).toBe(level2);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('value getter', () => {
    it('should return the account level value', () => {
      const guest = AccountLevel.create('guest');
      const registered = AccountLevel.create('registered');
      const verified = AccountLevel.create('verified');
      const premium = AccountLevel.create('premium');

      expect(guest.value).toBe('guest');
      expect(registered.value).toBe('registered');
      expect(verified.value).toBe('verified');
      expect(premium.value).toBe('premium');
    });

    it('should be typed as AccountLevelValue', () => {
      const level = AccountLevel.create('guest');
      const value: AccountLevelValue = level.value;

      expect(value).toBe('guest');
    });
  });

  describe('isGuest()', () => {
    it('should return true for guest level', () => {
      const level = AccountLevel.guest();

      expect(level.isGuest()).toBe(true);
    });

    it('should return false for registered level', () => {
      const level = AccountLevel.registered();

      expect(level.isGuest()).toBe(false);
    });

    it('should return false for verified level', () => {
      const level = AccountLevel.verified();

      expect(level.isGuest()).toBe(false);
    });

    it('should return false for premium level', () => {
      const level = AccountLevel.premium();

      expect(level.isGuest()).toBe(false);
    });
  });

  describe('isRegistered()', () => {
    it('should return true for registered level', () => {
      const level = AccountLevel.registered();

      expect(level.isRegistered()).toBe(true);
    });

    it('should return false for guest level', () => {
      const level = AccountLevel.guest();

      expect(level.isRegistered()).toBe(false);
    });

    it('should return false for verified level', () => {
      const level = AccountLevel.verified();

      expect(level.isRegistered()).toBe(false);
    });

    it('should return false for premium level', () => {
      const level = AccountLevel.premium();

      expect(level.isRegistered()).toBe(false);
    });
  });

  describe('isVerified()', () => {
    it('should return true for verified level', () => {
      const level = AccountLevel.verified();

      expect(level.isVerified()).toBe(true);
    });

    it('should return false for guest level', () => {
      const level = AccountLevel.guest();

      expect(level.isVerified()).toBe(false);
    });

    it('should return false for registered level', () => {
      const level = AccountLevel.registered();

      expect(level.isVerified()).toBe(false);
    });

    it('should return false for premium level', () => {
      const level = AccountLevel.premium();

      expect(level.isVerified()).toBe(false);
    });
  });

  describe('isPremium()', () => {
    it('should return true for premium level', () => {
      const level = AccountLevel.premium();

      expect(level.isPremium()).toBe(true);
    });

    it('should return false for guest level', () => {
      const level = AccountLevel.guest();

      expect(level.isPremium()).toBe(false);
    });

    it('should return false for registered level', () => {
      const level = AccountLevel.registered();

      expect(level.isPremium()).toBe(false);
    });

    it('should return false for verified level', () => {
      const level = AccountLevel.verified();

      expect(level.isPremium()).toBe(false);
    });
  });

  // ========================================
  // Level Hierarchy Comparison
  // ========================================
  describe('isAtLeast()', () => {
    describe('guest level', () => {
      it('should be at least guest', () => {
        const guest = AccountLevel.guest();

        expect(guest.isAtLeast(AccountLevel.guest())).toBe(true);
      });

      it('should NOT be at least registered', () => {
        const guest = AccountLevel.guest();

        expect(guest.isAtLeast(AccountLevel.registered())).toBe(false);
      });

      it('should NOT be at least verified', () => {
        const guest = AccountLevel.guest();

        expect(guest.isAtLeast(AccountLevel.verified())).toBe(false);
      });

      it('should NOT be at least premium', () => {
        const guest = AccountLevel.guest();

        expect(guest.isAtLeast(AccountLevel.premium())).toBe(false);
      });
    });

    describe('registered level', () => {
      it('should be at least guest', () => {
        const registered = AccountLevel.registered();

        expect(registered.isAtLeast(AccountLevel.guest())).toBe(true);
      });

      it('should be at least registered', () => {
        const registered = AccountLevel.registered();

        expect(registered.isAtLeast(AccountLevel.registered())).toBe(true);
      });

      it('should NOT be at least verified', () => {
        const registered = AccountLevel.registered();

        expect(registered.isAtLeast(AccountLevel.verified())).toBe(false);
      });

      it('should NOT be at least premium', () => {
        const registered = AccountLevel.registered();

        expect(registered.isAtLeast(AccountLevel.premium())).toBe(false);
      });
    });

    describe('verified level', () => {
      it('should be at least guest', () => {
        const verified = AccountLevel.verified();

        expect(verified.isAtLeast(AccountLevel.guest())).toBe(true);
      });

      it('should be at least registered', () => {
        const verified = AccountLevel.verified();

        expect(verified.isAtLeast(AccountLevel.registered())).toBe(true);
      });

      it('should be at least verified', () => {
        const verified = AccountLevel.verified();

        expect(verified.isAtLeast(AccountLevel.verified())).toBe(true);
      });

      it('should NOT be at least premium', () => {
        const verified = AccountLevel.verified();

        expect(verified.isAtLeast(AccountLevel.premium())).toBe(false);
      });
    });

    describe('premium level', () => {
      it('should be at least guest', () => {
        const premium = AccountLevel.premium();

        expect(premium.isAtLeast(AccountLevel.guest())).toBe(true);
      });

      it('should be at least registered', () => {
        const premium = AccountLevel.premium();

        expect(premium.isAtLeast(AccountLevel.registered())).toBe(true);
      });

      it('should be at least verified', () => {
        const premium = AccountLevel.premium();

        expect(premium.isAtLeast(AccountLevel.verified())).toBe(true);
      });

      it('should be at least premium', () => {
        const premium = AccountLevel.premium();

        expect(premium.isAtLeast(AccountLevel.premium())).toBe(true);
      });
    });
  });

  describe('isHigherThan()', () => {
    describe('guest level', () => {
      it('should NOT be higher than guest', () => {
        const guest = AccountLevel.guest();

        expect(guest.isHigherThan(AccountLevel.guest())).toBe(false);
      });

      it('should NOT be higher than registered', () => {
        const guest = AccountLevel.guest();

        expect(guest.isHigherThan(AccountLevel.registered())).toBe(false);
      });

      it('should NOT be higher than verified', () => {
        const guest = AccountLevel.guest();

        expect(guest.isHigherThan(AccountLevel.verified())).toBe(false);
      });

      it('should NOT be higher than premium', () => {
        const guest = AccountLevel.guest();

        expect(guest.isHigherThan(AccountLevel.premium())).toBe(false);
      });
    });

    describe('registered level', () => {
      it('should be higher than guest', () => {
        const registered = AccountLevel.registered();

        expect(registered.isHigherThan(AccountLevel.guest())).toBe(true);
      });

      it('should NOT be higher than registered', () => {
        const registered = AccountLevel.registered();

        expect(registered.isHigherThan(AccountLevel.registered())).toBe(false);
      });

      it('should NOT be higher than verified', () => {
        const registered = AccountLevel.registered();

        expect(registered.isHigherThan(AccountLevel.verified())).toBe(false);
      });

      it('should NOT be higher than premium', () => {
        const registered = AccountLevel.registered();

        expect(registered.isHigherThan(AccountLevel.premium())).toBe(false);
      });
    });

    describe('verified level', () => {
      it('should be higher than guest', () => {
        const verified = AccountLevel.verified();

        expect(verified.isHigherThan(AccountLevel.guest())).toBe(true);
      });

      it('should be higher than registered', () => {
        const verified = AccountLevel.verified();

        expect(verified.isHigherThan(AccountLevel.registered())).toBe(true);
      });

      it('should NOT be higher than verified', () => {
        const verified = AccountLevel.verified();

        expect(verified.isHigherThan(AccountLevel.verified())).toBe(false);
      });

      it('should NOT be higher than premium', () => {
        const verified = AccountLevel.verified();

        expect(verified.isHigherThan(AccountLevel.premium())).toBe(false);
      });
    });

    describe('premium level', () => {
      it('should be higher than guest', () => {
        const premium = AccountLevel.premium();

        expect(premium.isHigherThan(AccountLevel.guest())).toBe(true);
      });

      it('should be higher than registered', () => {
        const premium = AccountLevel.premium();

        expect(premium.isHigherThan(AccountLevel.registered())).toBe(true);
      });

      it('should be higher than verified', () => {
        const premium = AccountLevel.premium();

        expect(premium.isHigherThan(AccountLevel.verified())).toBe(true);
      });

      it('should NOT be higher than premium', () => {
        const premium = AccountLevel.premium();

        expect(premium.isHigherThan(AccountLevel.premium())).toBe(false);
      });
    });
  });

  // ========================================
  // Business Rule BR-006: Download Permission
  // ========================================
  describe('canDownload() - BR-006', () => {
    it('should return false for guest level', () => {
      const guest = AccountLevel.guest();

      expect(guest.canDownload()).toBe(false);
    });

    it('should return true for registered level', () => {
      const registered = AccountLevel.registered();

      expect(registered.canDownload()).toBe(true);
    });

    it('should return true for verified level', () => {
      const verified = AccountLevel.verified();

      expect(verified.canDownload()).toBe(true);
    });

    it('should return true for premium level', () => {
      const premium = AccountLevel.premium();

      expect(premium.canDownload()).toBe(true);
    });
  });

  // ========================================
  // Level Progression
  // ========================================
  describe('getNextLevel()', () => {
    it('should return registered for guest', () => {
      const guest = AccountLevel.guest();
      const next = guest.getNextLevel();

      expect(next).not.toBeNull();
      expect(next?.value).toBe('registered');
    });

    it('should return verified for registered', () => {
      const registered = AccountLevel.registered();
      const next = registered.getNextLevel();

      expect(next).not.toBeNull();
      expect(next?.value).toBe('verified');
    });

    it('should return premium for verified', () => {
      const verified = AccountLevel.verified();
      const next = verified.getNextLevel();

      expect(next).not.toBeNull();
      expect(next?.value).toBe('premium');
    });

    it('should return null for premium (already at max)', () => {
      const premium = AccountLevel.premium();
      const next = premium.getNextLevel();

      expect(next).toBeNull();
    });
  });

  // ========================================
  // Equality and String Representation
  // ========================================
  describe('equals()', () => {
    it('should return true for same level values', () => {
      const level1 = AccountLevel.create('registered');
      const level2 = AccountLevel.create('registered');

      expect(level1.equals(level2)).toBe(true);
    });

    it('should return false for different level values', () => {
      const guest = AccountLevel.guest();
      const premium = AccountLevel.premium();

      expect(guest.equals(premium)).toBe(false);
    });

    it('should return true for singleton instances', () => {
      const level1 = AccountLevel.verified();
      const level2 = AccountLevel.verified();

      expect(level1.equals(level2)).toBe(true);
    });

    it('should be symmetric', () => {
      const level1 = AccountLevel.create('premium');
      const level2 = AccountLevel.create('premium');

      expect(level1.equals(level2)).toBe(level2.equals(level1));
    });

    it('should work across all level combinations', () => {
      const levels = [
        AccountLevel.guest(),
        AccountLevel.registered(),
        AccountLevel.verified(),
        AccountLevel.premium(),
      ];

      for (const level1 of levels) {
        for (const level2 of levels) {
          if (level1.value === level2.value) {
            expect(level1.equals(level2)).toBe(true);
          } else {
            expect(level1.equals(level2)).toBe(false);
          }
        }
      }
    });
  });

  describe('toString()', () => {
    it('should return "guest" for guest level', () => {
      const level = AccountLevel.guest();

      expect(level.toString()).toBe('guest');
    });

    it('should return "registered" for registered level', () => {
      const level = AccountLevel.registered();

      expect(level.toString()).toBe('registered');
    });

    it('should return "verified" for verified level', () => {
      const level = AccountLevel.verified();

      expect(level.toString()).toBe('verified');
    });

    it('should return "premium" for premium level', () => {
      const level = AccountLevel.premium();

      expect(level.toString()).toBe('premium');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const level = AccountLevel.create('guest');

      expect(Object.isFrozen(level)).toBe(true);
    });

    it('should not allow property modification', () => {
      const level = AccountLevel.create('guest');

      expect(() => {
        (level as { _value: string })._value = 'premium';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const level = AccountLevel.create('guest');

      expect(() => {
        (level as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidAccountLevelError
  // ========================================
  describe('InvalidAccountLevelError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidAccountLevelError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidAccountLevelError('test');

      expect(error.name).toBe('InvalidAccountLevelError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidAccountLevelError('invalid-level');

      expect(error.message).toContain('invalid-level');
    });

    it('should list valid options in message', () => {
      const error = new InvalidAccountLevelError('wrong');

      expect(error.message).toContain('guest');
      expect(error.message).toContain('registered');
      expect(error.message).toContain('verified');
      expect(error.message).toContain('premium');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace-padded values as invalid', () => {
      expect(() => AccountLevel.create(' guest')).toThrow(
        InvalidAccountLevelError
      );
      expect(() => AccountLevel.create('guest ')).toThrow(
        InvalidAccountLevelError
      );
      expect(() => AccountLevel.create(' guest ')).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should handle numeric input as invalid', () => {
      expect(() => AccountLevel.create(123 as unknown as string)).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should handle object input as invalid', () => {
      expect(() => AccountLevel.create({} as unknown as string)).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should handle array input as invalid', () => {
      expect(() => AccountLevel.create(['guest'] as unknown as string)).toThrow(
        InvalidAccountLevelError
      );
    });

    it('should handle similar but invalid values', () => {
      expect(() => AccountLevel.create('guests')).toThrow(
        InvalidAccountLevelError
      );
      expect(() => AccountLevel.create('register')).toThrow(
        InvalidAccountLevelError
      );
      expect(() => AccountLevel.create('verify')).toThrow(
        InvalidAccountLevelError
      );
      expect(() => AccountLevel.create('prem')).toThrow(
        InvalidAccountLevelError
      );
    });
  });

  // ========================================
  // Integration: create() returns singletons
  // ========================================
  describe('Singleton Consistency', () => {
    it('create("guest") should return same instance as guest()', () => {
      const created = AccountLevel.create('guest');
      const singleton = AccountLevel.guest();

      expect(created).toBe(singleton);
    });

    it('create("registered") should return same instance as registered()', () => {
      const created = AccountLevel.create('registered');
      const singleton = AccountLevel.registered();

      expect(created).toBe(singleton);
    });

    it('create("verified") should return same instance as verified()', () => {
      const created = AccountLevel.create('verified');
      const singleton = AccountLevel.verified();

      expect(created).toBe(singleton);
    });

    it('create("premium") should return same instance as premium()', () => {
      const created = AccountLevel.create('premium');
      const singleton = AccountLevel.premium();

      expect(created).toBe(singleton);
    });
  });
});
