/**
 * Visibility Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  Visibility,
  InvalidVisibilityError,
  VISIBILITY_VALUES,
  type VisibilityValue,
} from '../../../../src/domain/value-objects/visibility';

describe('Visibility Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('VISIBILITY_VALUES', () => {
    it('should contain exactly public, private, and unlisted', () => {
      expect(VISIBILITY_VALUES).toEqual(['public', 'private', 'unlisted']);
    });

    it('should be readonly array with 3 elements', () => {
      expect(VISIBILITY_VALUES.length).toBe(3);
      expect(VISIBILITY_VALUES).toContain('public');
      expect(VISIBILITY_VALUES).toContain('private');
      expect(VISIBILITY_VALUES).toContain('unlisted');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create Visibility with valid value "public"', () => {
      const visibility = Visibility.create('public');

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('public');
    });

    it('should create Visibility with valid value "private"', () => {
      const visibility = Visibility.create('private');

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('private');
    });

    it('should create Visibility with valid value "unlisted"', () => {
      const visibility = Visibility.create('unlisted');

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('unlisted');
    });

    it('should throw InvalidVisibilityError for invalid value', () => {
      expect(() => Visibility.create('invalid')).toThrow(InvalidVisibilityError);
    });

    it('should throw InvalidVisibilityError for empty string', () => {
      expect(() => Visibility.create('')).toThrow(InvalidVisibilityError);
    });

    it('should throw InvalidVisibilityError for null', () => {
      expect(() => Visibility.create(null as unknown as string)).toThrow(
        InvalidVisibilityError
      );
    });

    it('should throw InvalidVisibilityError for undefined', () => {
      expect(() => Visibility.create(undefined as unknown as string)).toThrow(
        InvalidVisibilityError
      );
    });

    it('should throw InvalidVisibilityError for uppercase "PUBLIC"', () => {
      expect(() => Visibility.create('PUBLIC')).toThrow(InvalidVisibilityError);
    });

    it('should throw InvalidVisibilityError for mixed case "Public"', () => {
      expect(() => Visibility.create('Public')).toThrow(InvalidVisibilityError);
    });

    it('should throw InvalidVisibilityError with descriptive message', () => {
      try {
        Visibility.create('invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidVisibilityError);
        expect((error as InvalidVisibilityError).message).toContain('invalid');
        expect((error as InvalidVisibilityError).message).toContain('public');
        expect((error as InvalidVisibilityError).message).toContain('private');
        expect((error as InvalidVisibilityError).message).toContain('unlisted');
      }
    });
  });

  describe('isValid()', () => {
    it('should return true for "public"', () => {
      expect(Visibility.isValid('public')).toBe(true);
    });

    it('should return true for "private"', () => {
      expect(Visibility.isValid('private')).toBe(true);
    });

    it('should return true for "unlisted"', () => {
      expect(Visibility.isValid('unlisted')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(Visibility.isValid('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(Visibility.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Visibility.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Visibility.isValid(undefined as unknown as string)).toBe(false);
    });

    it('should return false for uppercase "PUBLIC"', () => {
      expect(Visibility.isValid('PUBLIC')).toBe(false);
    });
  });

  describe('public()', () => {
    it('should return Visibility with value "public"', () => {
      const visibility = Visibility.public();

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('public');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const visibility1 = Visibility.public();
      const visibility2 = Visibility.public();

      expect(visibility1).toBe(visibility2);
    });
  });

  describe('private()', () => {
    it('should return Visibility with value "private"', () => {
      const visibility = Visibility.private();

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('private');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const visibility1 = Visibility.private();
      const visibility2 = Visibility.private();

      expect(visibility1).toBe(visibility2);
    });
  });

  describe('unlisted()', () => {
    it('should return Visibility with value "unlisted"', () => {
      const visibility = Visibility.unlisted();

      expect(visibility).toBeInstanceOf(Visibility);
      expect(visibility.value).toBe('unlisted');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const visibility1 = Visibility.unlisted();
      const visibility2 = Visibility.unlisted();

      expect(visibility1).toBe(visibility2);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('value getter', () => {
    it('should return the visibility value', () => {
      const publicVis = Visibility.create('public');
      const privateVis = Visibility.create('private');
      const unlistedVis = Visibility.create('unlisted');

      expect(publicVis.value).toBe('public');
      expect(privateVis.value).toBe('private');
      expect(unlistedVis.value).toBe('unlisted');
    });

    it('should be typed as VisibilityValue', () => {
      const visibility = Visibility.create('public');
      const value: VisibilityValue = visibility.value;

      expect(value).toBe('public');
    });
  });

  describe('isPublic()', () => {
    it('should return true for public visibility', () => {
      const visibility = Visibility.public();

      expect(visibility.isPublic()).toBe(true);
    });

    it('should return false for private visibility', () => {
      const visibility = Visibility.private();

      expect(visibility.isPublic()).toBe(false);
    });

    it('should return false for unlisted visibility', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.isPublic()).toBe(false);
    });
  });

  describe('isPrivate()', () => {
    it('should return true for private visibility', () => {
      const visibility = Visibility.private();

      expect(visibility.isPrivate()).toBe(true);
    });

    it('should return false for public visibility', () => {
      const visibility = Visibility.public();

      expect(visibility.isPrivate()).toBe(false);
    });

    it('should return false for unlisted visibility', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.isPrivate()).toBe(false);
    });
  });

  describe('isUnlisted()', () => {
    it('should return true for unlisted visibility', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.isUnlisted()).toBe(true);
    });

    it('should return false for public visibility', () => {
      const visibility = Visibility.public();

      expect(visibility.isUnlisted()).toBe(false);
    });

    it('should return false for private visibility', () => {
      const visibility = Visibility.private();

      expect(visibility.isUnlisted()).toBe(false);
    });
  });

  // ========================================
  // Behavior Methods
  // ========================================
  describe('isDiscoverable()', () => {
    it('should return true for public visibility (discoverable in search)', () => {
      const visibility = Visibility.public();

      expect(visibility.isDiscoverable()).toBe(true);
    });

    it('should return false for private visibility (not in search)', () => {
      const visibility = Visibility.private();

      expect(visibility.isDiscoverable()).toBe(false);
    });

    it('should return false for unlisted visibility (not in search)', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.isDiscoverable()).toBe(false);
    });
  });

  describe('isAccessibleWithUrl()', () => {
    it('should return true for public visibility (anyone can access)', () => {
      const visibility = Visibility.public();

      expect(visibility.isAccessibleWithUrl()).toBe(true);
    });

    it('should return false for private visibility (owner only)', () => {
      const visibility = Visibility.private();

      expect(visibility.isAccessibleWithUrl()).toBe(false);
    });

    it('should return true for unlisted visibility (accessible with URL)', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.isAccessibleWithUrl()).toBe(true);
    });
  });

  describe('requiresUnlistedUrl()', () => {
    it('should return false for public visibility', () => {
      const visibility = Visibility.public();

      expect(visibility.requiresUnlistedUrl()).toBe(false);
    });

    it('should return false for private visibility', () => {
      const visibility = Visibility.private();

      expect(visibility.requiresUnlistedUrl()).toBe(false);
    });

    it('should return true for unlisted visibility (requires special URL)', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.requiresUnlistedUrl()).toBe(true);
    });
  });

  // ========================================
  // Equality and String
  // ========================================
  describe('equals()', () => {
    it('should return true for same visibility values', () => {
      const visibility1 = Visibility.create('public');
      const visibility2 = Visibility.create('public');

      expect(visibility1.equals(visibility2)).toBe(true);
    });

    it('should return false for different visibility values', () => {
      const publicVis = Visibility.public();
      const privateVis = Visibility.private();

      expect(publicVis.equals(privateVis)).toBe(false);
    });

    it('should return false for public and unlisted', () => {
      const publicVis = Visibility.public();
      const unlistedVis = Visibility.unlisted();

      expect(publicVis.equals(unlistedVis)).toBe(false);
    });

    it('should return true for singleton instances', () => {
      const visibility1 = Visibility.private();
      const visibility2 = Visibility.private();

      expect(visibility1.equals(visibility2)).toBe(true);
    });

    it('should be symmetric', () => {
      const visibility1 = Visibility.create('unlisted');
      const visibility2 = Visibility.create('unlisted');

      expect(visibility1.equals(visibility2)).toBe(visibility2.equals(visibility1));
    });

    it('should be transitive', () => {
      const visibility1 = Visibility.create('public');
      const visibility2 = Visibility.create('public');
      const visibility3 = Visibility.create('public');

      expect(visibility1.equals(visibility2)).toBe(true);
      expect(visibility2.equals(visibility3)).toBe(true);
      expect(visibility1.equals(visibility3)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return "public" for public visibility', () => {
      const visibility = Visibility.public();

      expect(visibility.toString()).toBe('public');
    });

    it('should return "private" for private visibility', () => {
      const visibility = Visibility.private();

      expect(visibility.toString()).toBe('private');
    });

    it('should return "unlisted" for unlisted visibility', () => {
      const visibility = Visibility.unlisted();

      expect(visibility.toString()).toBe('unlisted');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const visibility = Visibility.create('public');

      expect(Object.isFrozen(visibility)).toBe(true);
    });

    it('should not allow property modification', () => {
      const visibility = Visibility.create('public');

      // Attempting to modify should either throw or silently fail
      expect(() => {
        (visibility as { _value: string })._value = 'private';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const visibility = Visibility.create('public');

      expect(() => {
        (visibility as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidVisibilityError
  // ========================================
  describe('InvalidVisibilityError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidVisibilityError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidVisibilityError('test');

      expect(error.name).toBe('InvalidVisibilityError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidVisibilityError('invalid-visibility');

      expect(error.message).toContain('invalid-visibility');
    });

    it('should list valid options in message', () => {
      const error = new InvalidVisibilityError('wrong');

      expect(error.message).toContain('public');
      expect(error.message).toContain('private');
      expect(error.message).toContain('unlisted');
    });

    it('should support instanceof check', () => {
      try {
        Visibility.create('bad');
      } catch (error) {
        expect(error instanceof InvalidVisibilityError).toBe(true);
      }
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace-padded values as invalid', () => {
      expect(() => Visibility.create(' public')).toThrow(InvalidVisibilityError);
      expect(() => Visibility.create('public ')).toThrow(InvalidVisibilityError);
      expect(() => Visibility.create(' public ')).toThrow(InvalidVisibilityError);
    });

    it('should handle numeric input as invalid', () => {
      expect(() => Visibility.create(123 as unknown as string)).toThrow(
        InvalidVisibilityError
      );
    });

    it('should handle object input as invalid', () => {
      expect(() => Visibility.create({} as unknown as string)).toThrow(
        InvalidVisibilityError
      );
    });

    it('should handle array input as invalid', () => {
      expect(() => Visibility.create(['public'] as unknown as string)).toThrow(
        InvalidVisibilityError
      );
    });

    it('should handle similar but incorrect values', () => {
      expect(() => Visibility.create('pub')).toThrow(InvalidVisibilityError);
      expect(() => Visibility.create('priv')).toThrow(InvalidVisibilityError);
      expect(() => Visibility.create('hidden')).toThrow(InvalidVisibilityError);
    });
  });

  // ========================================
  // Integration with create()
  // ========================================
  describe('Integration: create() returns correct singletons', () => {
    it('should return public singleton when creating with "public"', () => {
      const created = Visibility.create('public');
      const singleton = Visibility.public();

      expect(created).toBe(singleton);
    });

    it('should return private singleton when creating with "private"', () => {
      const created = Visibility.create('private');
      const singleton = Visibility.private();

      expect(created).toBe(singleton);
    });

    it('should return unlisted singleton when creating with "unlisted"', () => {
      const created = Visibility.create('unlisted');
      const singleton = Visibility.unlisted();

      expect(created).toBe(singleton);
    });
  });
});
