/**
 * Edition Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  Edition,
  InvalidEditionError,
  EDITION_VALUES,
  type EditionValue,
} from '../../../../src/domain/value-objects/edition';

describe('Edition Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('EDITION_VALUES', () => {
    it('should contain exactly java and bedrock', () => {
      expect(EDITION_VALUES).toEqual(['java', 'bedrock']);
    });

    it('should be readonly array', () => {
      // TypeScript ensures this at compile time, but we verify the values
      expect(EDITION_VALUES.length).toBe(2);
      expect(EDITION_VALUES).toContain('java');
      expect(EDITION_VALUES).toContain('bedrock');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create Edition with valid value "java"', () => {
      const edition = Edition.create('java');

      expect(edition).toBeInstanceOf(Edition);
      expect(edition.value).toBe('java');
    });

    it('should create Edition with valid value "bedrock"', () => {
      const edition = Edition.create('bedrock');

      expect(edition).toBeInstanceOf(Edition);
      expect(edition.value).toBe('bedrock');
    });

    it('should throw InvalidEditionError for invalid value', () => {
      expect(() => Edition.create('invalid')).toThrow(InvalidEditionError);
    });

    it('should throw InvalidEditionError for empty string', () => {
      expect(() => Edition.create('')).toThrow(InvalidEditionError);
    });

    it('should throw InvalidEditionError for null', () => {
      expect(() => Edition.create(null as unknown as string)).toThrow(
        InvalidEditionError
      );
    });

    it('should throw InvalidEditionError for undefined', () => {
      expect(() => Edition.create(undefined as unknown as string)).toThrow(
        InvalidEditionError
      );
    });

    it('should throw InvalidEditionError for uppercase "JAVA"', () => {
      expect(() => Edition.create('JAVA')).toThrow(InvalidEditionError);
    });

    it('should throw InvalidEditionError for mixed case "Java"', () => {
      expect(() => Edition.create('Java')).toThrow(InvalidEditionError);
    });

    it('should throw InvalidEditionError with descriptive message', () => {
      try {
        Edition.create('invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidEditionError);
        expect((error as InvalidEditionError).message).toContain('invalid');
        expect((error as InvalidEditionError).message).toContain('java');
        expect((error as InvalidEditionError).message).toContain('bedrock');
      }
    });
  });

  describe('isValid()', () => {
    it('should return true for "java"', () => {
      expect(Edition.isValid('java')).toBe(true);
    });

    it('should return true for "bedrock"', () => {
      expect(Edition.isValid('bedrock')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(Edition.isValid('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(Edition.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Edition.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Edition.isValid(undefined as unknown as string)).toBe(false);
    });

    it('should return false for uppercase "JAVA"', () => {
      expect(Edition.isValid('JAVA')).toBe(false);
    });
  });

  describe('java()', () => {
    it('should return Edition with value "java"', () => {
      const edition = Edition.java();

      expect(edition).toBeInstanceOf(Edition);
      expect(edition.value).toBe('java');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const edition1 = Edition.java();
      const edition2 = Edition.java();

      expect(edition1).toBe(edition2);
    });
  });

  describe('bedrock()', () => {
    it('should return Edition with value "bedrock"', () => {
      const edition = Edition.bedrock();

      expect(edition).toBeInstanceOf(Edition);
      expect(edition.value).toBe('bedrock');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const edition1 = Edition.bedrock();
      const edition2 = Edition.bedrock();

      expect(edition1).toBe(edition2);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('value getter', () => {
    it('should return the edition value', () => {
      const javaEdition = Edition.create('java');
      const bedrockEdition = Edition.create('bedrock');

      expect(javaEdition.value).toBe('java');
      expect(bedrockEdition.value).toBe('bedrock');
    });

    it('should be typed as EditionValue', () => {
      const edition = Edition.create('java');
      const value: EditionValue = edition.value;

      expect(value).toBe('java');
    });
  });

  describe('isJava()', () => {
    it('should return true for Java edition', () => {
      const edition = Edition.java();

      expect(edition.isJava()).toBe(true);
    });

    it('should return false for Bedrock edition', () => {
      const edition = Edition.bedrock();

      expect(edition.isJava()).toBe(false);
    });
  });

  describe('isBedrock()', () => {
    it('should return true for Bedrock edition', () => {
      const edition = Edition.bedrock();

      expect(edition.isBedrock()).toBe(true);
    });

    it('should return false for Java edition', () => {
      const edition = Edition.java();

      expect(edition.isBedrock()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should return true for same edition values', () => {
      const edition1 = Edition.create('java');
      const edition2 = Edition.create('java');

      expect(edition1.equals(edition2)).toBe(true);
    });

    it('should return false for different edition values', () => {
      const javaEdition = Edition.java();
      const bedrockEdition = Edition.bedrock();

      expect(javaEdition.equals(bedrockEdition)).toBe(false);
    });

    it('should return true for singleton instances', () => {
      const edition1 = Edition.java();
      const edition2 = Edition.java();

      expect(edition1.equals(edition2)).toBe(true);
    });

    it('should be symmetric', () => {
      const edition1 = Edition.create('java');
      const edition2 = Edition.create('java');

      expect(edition1.equals(edition2)).toBe(edition2.equals(edition1));
    });
  });

  describe('toString()', () => {
    it('should return "java" for Java edition', () => {
      const edition = Edition.java();

      expect(edition.toString()).toBe('java');
    });

    it('should return "bedrock" for Bedrock edition', () => {
      const edition = Edition.bedrock();

      expect(edition.toString()).toBe('bedrock');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const edition = Edition.create('java');

      expect(Object.isFrozen(edition)).toBe(true);
    });

    it('should not allow property modification', () => {
      const edition = Edition.create('java');

      // Attempting to modify should either throw or silently fail
      expect(() => {
        (edition as { _value: string })._value = 'bedrock';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const edition = Edition.create('java');

      expect(() => {
        (edition as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidEditionError
  // ========================================
  describe('InvalidEditionError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidEditionError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidEditionError('test');

      expect(error.name).toBe('InvalidEditionError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidEditionError('invalid-edition');

      expect(error.message).toContain('invalid-edition');
    });

    it('should list valid options in message', () => {
      const error = new InvalidEditionError('wrong');

      expect(error.message).toContain('java');
      expect(error.message).toContain('bedrock');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace-padded values as invalid', () => {
      expect(() => Edition.create(' java')).toThrow(InvalidEditionError);
      expect(() => Edition.create('java ')).toThrow(InvalidEditionError);
      expect(() => Edition.create(' java ')).toThrow(InvalidEditionError);
    });

    it('should handle numeric input as invalid', () => {
      expect(() => Edition.create(123 as unknown as string)).toThrow(
        InvalidEditionError
      );
    });

    it('should handle object input as invalid', () => {
      expect(() => Edition.create({} as unknown as string)).toThrow(
        InvalidEditionError
      );
    });

    it('should handle array input as invalid', () => {
      expect(() => Edition.create(['java'] as unknown as string)).toThrow(
        InvalidEditionError
      );
    });
  });
});
