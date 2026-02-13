/**
 * Tag Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Tag represents a post tag with the following features:
 * - 1-30 characters
 * - Allowed: alphanumeric, hiragana, katakana, kanji, underscore, hyphen
 * - Whitespace-only is not allowed
 * - Leading/trailing whitespace is trimmed
 * - Normalization: lowercase (English only), trim whitespace
 */
import { describe, it, expect } from 'vitest';
import {
  Tag,
  InvalidTagError,
} from '../../../../src/domain/value-objects/tag';

describe('Tag Value Object', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    describe('valid tags', () => {
      it('should create Tag with simple alphanumeric value', () => {
        const tag = Tag.create('minecraft');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('minecraft');
      });

      it('should create Tag with numbers', () => {
        const tag = Tag.create('version123');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('version123');
      });

      it('should create Tag with underscore', () => {
        const tag = Tag.create('my_tag');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('my_tag');
      });

      it('should create Tag with hyphen', () => {
        const tag = Tag.create('my-tag');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('my-tag');
      });

      it('should create Tag with hiragana', () => {
        const tag = Tag.create('まいんくらふと');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('まいんくらふと');
      });

      it('should create Tag with katakana', () => {
        const tag = Tag.create('マインクラフト');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('マインクラフト');
      });

      it('should create Tag with kanji', () => {
        const tag = Tag.create('建築');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('建築');
      });

      it('should create Tag with mixed characters', () => {
        const tag = Tag.create('Minecraft建築_v2');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('minecraft建築_v2');
      });

      it('should create Tag with single character', () => {
        const tag = Tag.create('a');

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe('a');
      });

      it('should create Tag with 30 characters (max)', () => {
        const longTag = 'a'.repeat(30);
        const tag = Tag.create(longTag);

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.value).toBe(longTag);
      });
    });

    describe('normalization', () => {
      it('should lowercase English characters', () => {
        const tag = Tag.create('MINECRAFT');

        expect(tag.value).toBe('minecraft');
      });

      it('should lowercase mixed case English', () => {
        const tag = Tag.create('MineCraft');

        expect(tag.value).toBe('minecraft');
      });

      it('should trim leading whitespace', () => {
        const tag = Tag.create('  minecraft');

        expect(tag.value).toBe('minecraft');
      });

      it('should trim trailing whitespace', () => {
        const tag = Tag.create('minecraft  ');

        expect(tag.value).toBe('minecraft');
      });

      it('should trim both leading and trailing whitespace', () => {
        const tag = Tag.create('  minecraft  ');

        expect(tag.value).toBe('minecraft');
      });

      it('should preserve display value with original case', () => {
        const tag = Tag.create('MineCraft');

        expect(tag.displayValue).toBe('MineCraft');
      });

      it('should preserve display value trimmed but not lowercased', () => {
        const tag = Tag.create('  MineCraft  ');

        expect(tag.displayValue).toBe('MineCraft');
      });

      it('should not change Japanese characters during normalization', () => {
        const tag = Tag.create('マインクラフト');

        expect(tag.value).toBe('マインクラフト');
        expect(tag.displayValue).toBe('マインクラフト');
      });
    });

    describe('invalid tags - length', () => {
      it('should throw InvalidTagError for empty string', () => {
        expect(() => Tag.create('')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for whitespace only', () => {
        expect(() => Tag.create('   ')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for string longer than 30 characters', () => {
        const tooLong = 'a'.repeat(31);

        expect(() => Tag.create(tooLong)).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for 31 character string after trim', () => {
        const tooLong = '  ' + 'a'.repeat(31) + '  ';

        expect(() => Tag.create(tooLong)).toThrow(InvalidTagError);
      });
    });

    describe('invalid tags - characters', () => {
      it('should throw InvalidTagError for space in middle', () => {
        expect(() => Tag.create('mine craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for special characters (!)', () => {
        expect(() => Tag.create('minecraft!')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for special characters (@)', () => {
        expect(() => Tag.create('mine@craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for special characters (#)', () => {
        expect(() => Tag.create('#minecraft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for special characters ($)', () => {
        expect(() => Tag.create('mine$craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for special characters (%)', () => {
        expect(() => Tag.create('mine%craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for dot (.)', () => {
        expect(() => Tag.create('mine.craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for slash (/)', () => {
        expect(() => Tag.create('mine/craft')).toThrow(InvalidTagError);
      });

      it('should throw InvalidTagError for emoji', () => {
        expect(() => Tag.create('minecraft🎮')).toThrow(InvalidTagError);
      });
    });

    describe('invalid tags - type errors', () => {
      it('should throw InvalidTagError for null', () => {
        expect(() => Tag.create(null as unknown as string)).toThrow(
          InvalidTagError
        );
      });

      it('should throw InvalidTagError for undefined', () => {
        expect(() => Tag.create(undefined as unknown as string)).toThrow(
          InvalidTagError
        );
      });

      it('should throw InvalidTagError for number', () => {
        expect(() => Tag.create(123 as unknown as string)).toThrow(
          InvalidTagError
        );
      });

      it('should throw InvalidTagError for object', () => {
        expect(() => Tag.create({} as unknown as string)).toThrow(
          InvalidTagError
        );
      });

      it('should throw InvalidTagError for array', () => {
        expect(() => Tag.create(['tag'] as unknown as string)).toThrow(
          InvalidTagError
        );
      });
    });
  });

  // ========================================
  // Static Validation Methods
  // ========================================
  describe('isValid()', () => {
    it('should return true for valid alphanumeric tag', () => {
      expect(Tag.isValid('minecraft')).toBe(true);
    });

    it('should return true for valid tag with underscore', () => {
      expect(Tag.isValid('my_tag')).toBe(true);
    });

    it('should return true for valid tag with hyphen', () => {
      expect(Tag.isValid('my-tag')).toBe(true);
    });

    it('should return true for valid Japanese tag', () => {
      expect(Tag.isValid('マインクラフト')).toBe(true);
    });

    it('should return true for tag with leading/trailing whitespace (will be trimmed)', () => {
      expect(Tag.isValid('  minecraft  ')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(Tag.isValid('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(Tag.isValid('   ')).toBe(false);
    });

    it('should return false for string longer than 30 characters', () => {
      expect(Tag.isValid('a'.repeat(31))).toBe(false);
    });

    it('should return false for special characters', () => {
      expect(Tag.isValid('mine@craft')).toBe(false);
    });

    it('should return false for space in middle', () => {
      expect(Tag.isValid('mine craft')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Tag.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Tag.isValid(undefined as unknown as string)).toBe(false);
    });
  });

  describe('normalize()', () => {
    it('should lowercase English characters', () => {
      expect(Tag.normalize('MINECRAFT')).toBe('minecraft');
    });

    it('should trim leading whitespace', () => {
      expect(Tag.normalize('  minecraft')).toBe('minecraft');
    });

    it('should trim trailing whitespace', () => {
      expect(Tag.normalize('minecraft  ')).toBe('minecraft');
    });

    it('should trim both and lowercase', () => {
      expect(Tag.normalize('  MineCraft  ')).toBe('minecraft');
    });

    it('should not change Japanese characters', () => {
      expect(Tag.normalize('マインクラフト')).toBe('マインクラフト');
    });

    it('should handle mixed content', () => {
      expect(Tag.normalize('  Minecraft建築  ')).toBe('minecraft建築');
    });
  });

  // ========================================
  // Instance Properties
  // ========================================
  describe('value getter', () => {
    it('should return normalized value', () => {
      const tag = Tag.create('MineCraft');

      expect(tag.value).toBe('minecraft');
    });

    it('should return trimmed and lowercased value', () => {
      const tag = Tag.create('  TEST_TAG  ');

      expect(tag.value).toBe('test_tag');
    });
  });

  describe('displayValue getter', () => {
    it('should return original case but trimmed', () => {
      const tag = Tag.create('MineCraft');

      expect(tag.displayValue).toBe('MineCraft');
    });

    it('should return trimmed value preserving case', () => {
      const tag = Tag.create('  MineCraft  ');

      expect(tag.displayValue).toBe('MineCraft');
    });

    it('should preserve Japanese characters', () => {
      const tag = Tag.create('マインクラフト');

      expect(tag.displayValue).toBe('マインクラフト');
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('equals()', () => {
    it('should return true for same normalized values', () => {
      const tag1 = Tag.create('minecraft');
      const tag2 = Tag.create('MINECRAFT');

      expect(tag1.equals(tag2)).toBe(true);
    });

    it('should return true for same values with different whitespace', () => {
      const tag1 = Tag.create('minecraft');
      const tag2 = Tag.create('  minecraft  ');

      expect(tag1.equals(tag2)).toBe(true);
    });

    it('should return false for different values', () => {
      const tag1 = Tag.create('minecraft');
      const tag2 = Tag.create('terraria');

      expect(tag1.equals(tag2)).toBe(false);
    });

    it('should be symmetric', () => {
      const tag1 = Tag.create('MineCraft');
      const tag2 = Tag.create('MINECRAFT');

      expect(tag1.equals(tag2)).toBe(tag2.equals(tag1));
    });

    it('should be transitive', () => {
      const tag1 = Tag.create('minecraft');
      const tag2 = Tag.create('MINECRAFT');
      const tag3 = Tag.create('MineCraft');

      expect(tag1.equals(tag2)).toBe(true);
      expect(tag2.equals(tag3)).toBe(true);
      expect(tag1.equals(tag3)).toBe(true);
    });

    it('should be reflexive', () => {
      const tag = Tag.create('minecraft');

      expect(tag.equals(tag)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return normalized value', () => {
      const tag = Tag.create('MineCraft');

      expect(tag.toString()).toBe('minecraft');
    });

    it('should be same as value getter', () => {
      const tag = Tag.create('TEST_TAG');

      expect(tag.toString()).toBe(tag.value);
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const tag = Tag.create('minecraft');

      expect(Object.isFrozen(tag)).toBe(true);
    });

    it('should not allow property modification', () => {
      const tag = Tag.create('minecraft');

      expect(() => {
        (tag as { _value: string })._value = 'hacked';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const tag = Tag.create('minecraft');

      expect(() => {
        (tag as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidTagError
  // ========================================
  describe('InvalidTagError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidTagError('test', 'reason');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidTagError('test', 'reason');

      expect(error.name).toBe('InvalidTagError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidTagError('bad-tag!', 'contains invalid characters');

      expect(error.message).toContain('bad-tag!');
    });

    it('should contain the reason in message', () => {
      const error = new InvalidTagError('bad', 'too short');

      expect(error.message).toContain('too short');
    });

    it('should have invalidValue property', () => {
      const error = new InvalidTagError('invalid-value', 'reason');

      expect(error.invalidValue).toBe('invalid-value');
    });

    it('should have reason property', () => {
      const error = new InvalidTagError('value', 'the reason');

      expect(error.reason).toBe('the reason');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle full-width numbers', () => {
      // Full-width numbers are NOT alphanumeric, should be invalid
      expect(() => Tag.create('１２３')).toThrow(InvalidTagError);
    });

    it('should handle mixed hiragana and katakana', () => {
      const tag = Tag.create('まいんクラフト');

      expect(tag.value).toBe('まいんクラフト');
    });

    it('should handle long Japanese string at boundary', () => {
      const longJapanese = 'あ'.repeat(30);
      const tag = Tag.create(longJapanese);

      expect(tag.value).toBe(longJapanese);
    });

    it('should handle exactly 30 mixed characters', () => {
      const mixed = 'minecraft建築test_V2-ver'.padEnd(30, 'a');
      const tag = Tag.create(mixed);

      expect(tag.value.length).toBeLessThanOrEqual(30);
    });

    it('should reject tab characters', () => {
      expect(() => Tag.create('mine\tcraft')).toThrow(InvalidTagError);
    });

    it('should reject newline characters', () => {
      expect(() => Tag.create('mine\ncraft')).toThrow(InvalidTagError);
    });

    it('should handle underscore at start', () => {
      const tag = Tag.create('_minecraft');

      expect(tag.value).toBe('_minecraft');
    });

    it('should handle hyphen at start', () => {
      const tag = Tag.create('-minecraft');

      expect(tag.value).toBe('-minecraft');
    });

    it('should handle multiple underscores', () => {
      const tag = Tag.create('my__tag');

      expect(tag.value).toBe('my__tag');
    });

    it('should handle multiple hyphens', () => {
      const tag = Tag.create('my--tag');

      expect(tag.value).toBe('my--tag');
    });

    it('should handle mixed underscore and hyphen', () => {
      const tag = Tag.create('my_tag-v2');

      expect(tag.value).toBe('my_tag-v2');
    });
  });
});
