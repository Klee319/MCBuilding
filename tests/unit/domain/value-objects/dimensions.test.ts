/**
 * Dimensions Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  Dimensions,
  InvalidDimensionsError,
  SIZE_CATEGORY_VALUES,
  type SizeCategoryValue,
} from '../../../../src/domain/value-objects/dimensions';

describe('Dimensions Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('SIZE_CATEGORY_VALUES', () => {
    it('should contain exactly small, medium, large, xlarge', () => {
      expect(SIZE_CATEGORY_VALUES).toEqual(['small', 'medium', 'large', 'xlarge']);
    });

    it('should be readonly array', () => {
      expect(SIZE_CATEGORY_VALUES.length).toBe(4);
      expect(SIZE_CATEGORY_VALUES).toContain('small');
      expect(SIZE_CATEGORY_VALUES).toContain('medium');
      expect(SIZE_CATEGORY_VALUES).toContain('large');
      expect(SIZE_CATEGORY_VALUES).toContain('xlarge');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create Dimensions with valid integer values', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(dimensions).toBeInstanceOf(Dimensions);
      expect(dimensions.x).toBe(64);
      expect(dimensions.y).toBe(128);
      expect(dimensions.z).toBe(64);
    });

    it('should create Dimensions with minimum valid value (1)', () => {
      const dimensions = Dimensions.create(1, 1, 1);

      expect(dimensions).toBeInstanceOf(Dimensions);
      expect(dimensions.x).toBe(1);
      expect(dimensions.y).toBe(1);
      expect(dimensions.z).toBe(1);
    });

    it('should create Dimensions with large values', () => {
      const dimensions = Dimensions.create(500, 500, 500);

      expect(dimensions).toBeInstanceOf(Dimensions);
      expect(dimensions.x).toBe(500);
    });

    it('should throw InvalidDimensionsError for zero value', () => {
      expect(() => Dimensions.create(0, 64, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 0, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 64, 0)).toThrow(InvalidDimensionsError);
    });

    it('should throw InvalidDimensionsError for negative values', () => {
      expect(() => Dimensions.create(-1, 64, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, -10, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 64, -100)).toThrow(InvalidDimensionsError);
    });

    it('should throw InvalidDimensionsError for decimal values', () => {
      expect(() => Dimensions.create(64.5, 128, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 128.9, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 128, 64.1)).toThrow(InvalidDimensionsError);
    });

    it('should throw InvalidDimensionsError for NaN', () => {
      expect(() => Dimensions.create(NaN, 64, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, NaN, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, 64, NaN)).toThrow(InvalidDimensionsError);
    });

    it('should throw InvalidDimensionsError for Infinity', () => {
      expect(() => Dimensions.create(Infinity, 64, 64)).toThrow(InvalidDimensionsError);
      expect(() => Dimensions.create(64, -Infinity, 64)).toThrow(InvalidDimensionsError);
    });

    it('should throw InvalidDimensionsError with descriptive message', () => {
      try {
        Dimensions.create(-5, 64, 64);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidDimensionsError);
        expect((error as InvalidDimensionsError).message).toContain('-5');
        expect((error as InvalidDimensionsError).message).toContain('positive integer');
      }
    });
  });

  describe('fromObject()', () => {
    it('should create Dimensions from valid object', () => {
      const dimensions = Dimensions.fromObject({ x: 32, y: 64, z: 128 });

      expect(dimensions).toBeInstanceOf(Dimensions);
      expect(dimensions.x).toBe(32);
      expect(dimensions.y).toBe(64);
      expect(dimensions.z).toBe(128);
    });

    it('should throw for object with missing properties', () => {
      expect(() => Dimensions.fromObject({ x: 32, y: 64 } as { x: number; y: number; z: number })).toThrow(InvalidDimensionsError);
    });

    it('should throw for object with invalid values', () => {
      expect(() => Dimensions.fromObject({ x: -1, y: 64, z: 64 })).toThrow(InvalidDimensionsError);
    });

    it('should throw for null input', () => {
      expect(() => Dimensions.fromObject(null as unknown as { x: number; y: number; z: number })).toThrow(InvalidDimensionsError);
    });

    it('should throw for undefined input', () => {
      expect(() => Dimensions.fromObject(undefined as unknown as { x: number; y: number; z: number })).toThrow(InvalidDimensionsError);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid positive integers', () => {
      expect(Dimensions.isValid(64, 128, 64)).toBe(true);
      expect(Dimensions.isValid(1, 1, 1)).toBe(true);
      expect(Dimensions.isValid(500, 500, 500)).toBe(true);
    });

    it('should return false for zero values', () => {
      expect(Dimensions.isValid(0, 64, 64)).toBe(false);
      expect(Dimensions.isValid(64, 0, 64)).toBe(false);
      expect(Dimensions.isValid(64, 64, 0)).toBe(false);
    });

    it('should return false for negative values', () => {
      expect(Dimensions.isValid(-1, 64, 64)).toBe(false);
      expect(Dimensions.isValid(64, -1, 64)).toBe(false);
      expect(Dimensions.isValid(64, 64, -1)).toBe(false);
    });

    it('should return false for decimal values', () => {
      expect(Dimensions.isValid(64.5, 128, 64)).toBe(false);
      expect(Dimensions.isValid(64, 128.1, 64)).toBe(false);
      expect(Dimensions.isValid(64, 128, 64.9)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(Dimensions.isValid(NaN, 64, 64)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(Dimensions.isValid(Infinity, 64, 64)).toBe(false);
      expect(Dimensions.isValid(64, -Infinity, 64)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('x getter', () => {
    it('should return the x dimension', () => {
      const dimensions = Dimensions.create(32, 64, 128);
      expect(dimensions.x).toBe(32);
    });
  });

  describe('y getter', () => {
    it('should return the y dimension', () => {
      const dimensions = Dimensions.create(32, 64, 128);
      expect(dimensions.y).toBe(64);
    });
  });

  describe('z getter', () => {
    it('should return the z dimension', () => {
      const dimensions = Dimensions.create(32, 64, 128);
      expect(dimensions.z).toBe(128);
    });
  });

  describe('volume getter', () => {
    it('should return x * y * z', () => {
      const dimensions = Dimensions.create(2, 3, 4);
      expect(dimensions.volume).toBe(24);
    });

    it('should handle large volumes', () => {
      const dimensions = Dimensions.create(100, 100, 100);
      expect(dimensions.volume).toBe(1000000);
    });

    it('should return 1 for minimum dimensions', () => {
      const dimensions = Dimensions.create(1, 1, 1);
      expect(dimensions.volume).toBe(1);
    });
  });

  describe('maxSide getter', () => {
    it('should return the maximum dimension', () => {
      const dimensions = Dimensions.create(32, 128, 64);
      expect(dimensions.maxSide).toBe(128);
    });

    it('should return correct value when x is max', () => {
      const dimensions = Dimensions.create(200, 100, 50);
      expect(dimensions.maxSide).toBe(200);
    });

    it('should return correct value when z is max', () => {
      const dimensions = Dimensions.create(50, 100, 300);
      expect(dimensions.maxSide).toBe(300);
    });

    it('should handle equal dimensions', () => {
      const dimensions = Dimensions.create(64, 64, 64);
      expect(dimensions.maxSide).toBe(64);
    });
  });

  describe('minSide getter', () => {
    it('should return the minimum dimension', () => {
      const dimensions = Dimensions.create(32, 128, 64);
      expect(dimensions.minSide).toBe(32);
    });

    it('should return correct value when y is min', () => {
      const dimensions = Dimensions.create(200, 50, 100);
      expect(dimensions.minSide).toBe(50);
    });

    it('should return correct value when z is min', () => {
      const dimensions = Dimensions.create(100, 200, 30);
      expect(dimensions.minSide).toBe(30);
    });

    it('should handle equal dimensions', () => {
      const dimensions = Dimensions.create(64, 64, 64);
      expect(dimensions.minSide).toBe(64);
    });
  });

  // ========================================
  // Size Category
  // ========================================
  describe('getSizeCategory()', () => {
    describe('small category (maxSide <= 50)', () => {
      it('should return "small" for maxSide = 50', () => {
        const dimensions = Dimensions.create(50, 30, 40);
        expect(dimensions.getSizeCategory()).toBe('small');
      });

      it('should return "small" for maxSide = 1', () => {
        const dimensions = Dimensions.create(1, 1, 1);
        expect(dimensions.getSizeCategory()).toBe('small');
      });

      it('should return "small" for maxSide = 25', () => {
        const dimensions = Dimensions.create(25, 20, 15);
        expect(dimensions.getSizeCategory()).toBe('small');
      });
    });

    describe('medium category (50 < maxSide <= 100)', () => {
      it('should return "medium" for maxSide = 51', () => {
        const dimensions = Dimensions.create(51, 30, 40);
        expect(dimensions.getSizeCategory()).toBe('medium');
      });

      it('should return "medium" for maxSide = 100', () => {
        const dimensions = Dimensions.create(100, 50, 50);
        expect(dimensions.getSizeCategory()).toBe('medium');
      });

      it('should return "medium" for maxSide = 75', () => {
        const dimensions = Dimensions.create(75, 50, 60);
        expect(dimensions.getSizeCategory()).toBe('medium');
      });
    });

    describe('large category (100 < maxSide <= 200)', () => {
      it('should return "large" for maxSide = 101', () => {
        const dimensions = Dimensions.create(101, 50, 50);
        expect(dimensions.getSizeCategory()).toBe('large');
      });

      it('should return "large" for maxSide = 200', () => {
        const dimensions = Dimensions.create(200, 100, 150);
        expect(dimensions.getSizeCategory()).toBe('large');
      });

      it('should return "large" for maxSide = 150', () => {
        const dimensions = Dimensions.create(150, 100, 120);
        expect(dimensions.getSizeCategory()).toBe('large');
      });
    });

    describe('xlarge category (maxSide > 200)', () => {
      it('should return "xlarge" for maxSide = 201', () => {
        const dimensions = Dimensions.create(201, 100, 100);
        expect(dimensions.getSizeCategory()).toBe('xlarge');
      });

      it('should return "xlarge" for maxSide = 500', () => {
        const dimensions = Dimensions.create(500, 300, 400);
        expect(dimensions.getSizeCategory()).toBe('xlarge');
      });

      it('should return "xlarge" for maxSide = 1000', () => {
        const dimensions = Dimensions.create(1000, 500, 500);
        expect(dimensions.getSizeCategory()).toBe('xlarge');
      });
    });

    it('should be typed as SizeCategoryValue', () => {
      const dimensions = Dimensions.create(64, 64, 64);
      const category: SizeCategoryValue = dimensions.getSizeCategory();
      expect(SIZE_CATEGORY_VALUES).toContain(category);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('fitsWithin()', () => {
    it('should return true when all dimensions fit', () => {
      const inner = Dimensions.create(32, 64, 32);
      const outer = Dimensions.create(64, 128, 64);

      expect(inner.fitsWithin(outer)).toBe(true);
    });

    it('should return true when dimensions are equal', () => {
      const a = Dimensions.create(64, 64, 64);
      const b = Dimensions.create(64, 64, 64);

      expect(a.fitsWithin(b)).toBe(true);
    });

    it('should return false when x exceeds', () => {
      const inner = Dimensions.create(65, 64, 64);
      const outer = Dimensions.create(64, 128, 128);

      expect(inner.fitsWithin(outer)).toBe(false);
    });

    it('should return false when y exceeds', () => {
      const inner = Dimensions.create(64, 129, 64);
      const outer = Dimensions.create(128, 128, 128);

      expect(inner.fitsWithin(outer)).toBe(false);
    });

    it('should return false when z exceeds', () => {
      const inner = Dimensions.create(64, 64, 65);
      const outer = Dimensions.create(128, 128, 64);

      expect(inner.fitsWithin(outer)).toBe(false);
    });

    it('should handle asymmetric comparisons', () => {
      const small = Dimensions.create(10, 20, 30);
      const large = Dimensions.create(100, 200, 300);

      expect(small.fitsWithin(large)).toBe(true);
      expect(large.fitsWithin(small)).toBe(false);
    });
  });

  describe('scale()', () => {
    it('should return new Dimensions scaled by factor', () => {
      const original = Dimensions.create(10, 20, 30);
      const scaled = original.scale(2);

      expect(scaled.x).toBe(20);
      expect(scaled.y).toBe(40);
      expect(scaled.z).toBe(60);
    });

    it('should return new instance (not mutate original)', () => {
      const original = Dimensions.create(10, 20, 30);
      const scaled = original.scale(2);

      expect(scaled).not.toBe(original);
      expect(original.x).toBe(10);
      expect(original.y).toBe(20);
      expect(original.z).toBe(30);
    });

    it('should handle scale factor of 1', () => {
      const original = Dimensions.create(64, 128, 64);
      const scaled = original.scale(1);

      expect(scaled.x).toBe(64);
      expect(scaled.y).toBe(128);
      expect(scaled.z).toBe(64);
    });

    it('should handle decimal scale factors (rounds to integer)', () => {
      const original = Dimensions.create(10, 10, 10);
      const scaled = original.scale(1.5);

      expect(scaled.x).toBe(15);
      expect(scaled.y).toBe(15);
      expect(scaled.z).toBe(15);
    });

    it('should throw for scale factor that results in non-positive', () => {
      const original = Dimensions.create(10, 20, 30);

      expect(() => original.scale(0)).toThrow(InvalidDimensionsError);
      expect(() => original.scale(-1)).toThrow(InvalidDimensionsError);
    });

    it('should throw for scale factor that rounds to zero', () => {
      const original = Dimensions.create(10, 10, 10);

      // 10 * 0.04 = 0.4 -> rounds to 0, which is invalid
      expect(() => original.scale(0.04)).toThrow(InvalidDimensionsError);
    });

    it('should allow scale factor that results in valid integers after rounding', () => {
      const original = Dimensions.create(10, 10, 10);

      // 10 * 0.5 = 5, which is a valid positive integer
      const scaled = original.scale(0.5);
      expect(scaled.x).toBe(5);
      expect(scaled.y).toBe(5);
      expect(scaled.z).toBe(5);
    });
  });

  describe('equals()', () => {
    it('should return true for identical dimensions', () => {
      const a = Dimensions.create(64, 128, 64);
      const b = Dimensions.create(64, 128, 64);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different x', () => {
      const a = Dimensions.create(64, 128, 64);
      const b = Dimensions.create(32, 128, 64);

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different y', () => {
      const a = Dimensions.create(64, 128, 64);
      const b = Dimensions.create(64, 64, 64);

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different z', () => {
      const a = Dimensions.create(64, 128, 64);
      const b = Dimensions.create(64, 128, 32);

      expect(a.equals(b)).toBe(false);
    });

    it('should be symmetric', () => {
      const a = Dimensions.create(64, 128, 64);
      const b = Dimensions.create(64, 128, 64);

      expect(a.equals(b)).toBe(b.equals(a));
    });

    it('should be reflexive', () => {
      const a = Dimensions.create(64, 128, 64);

      expect(a.equals(a)).toBe(true);
    });
  });

  describe('toObject()', () => {
    it('should return object with x, y, z properties', () => {
      const dimensions = Dimensions.create(32, 64, 128);
      const obj = dimensions.toObject();

      expect(obj).toEqual({ x: 32, y: 64, z: 128 });
    });

    it('should return a new object each time', () => {
      const dimensions = Dimensions.create(32, 64, 128);
      const obj1 = dimensions.toObject();
      const obj2 = dimensions.toObject();

      expect(obj1).not.toBe(obj2);
      expect(obj1).toEqual(obj2);
    });
  });

  describe('toString()', () => {
    it('should return formatted string "XxYxZ"', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(dimensions.toString()).toBe('64x128x64');
    });

    it('should handle various dimensions', () => {
      expect(Dimensions.create(1, 1, 1).toString()).toBe('1x1x1');
      expect(Dimensions.create(100, 200, 300).toString()).toBe('100x200x300');
      expect(Dimensions.create(32, 64, 16).toString()).toBe('32x64x16');
    });
  });

  describe('toDisplayString()', () => {
    it('should return human-readable format "X x Y x Z"', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(dimensions.toDisplayString()).toBe('64 x 128 x 64');
    });

    it('should handle various dimensions', () => {
      expect(Dimensions.create(1, 1, 1).toDisplayString()).toBe('1 x 1 x 1');
      expect(Dimensions.create(100, 200, 300).toDisplayString()).toBe('100 x 200 x 300');
      expect(Dimensions.create(32, 64, 16).toDisplayString()).toBe('32 x 64 x 16');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(Object.isFrozen(dimensions)).toBe(true);
    });

    it('should not allow property modification', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(() => {
        (dimensions as { _x: number })._x = 32;
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const dimensions = Dimensions.create(64, 128, 64);

      expect(() => {
        (dimensions as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidDimensionsError
  // ========================================
  describe('InvalidDimensionsError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidDimensionsError('test message');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidDimensionsError('test');

      expect(error.name).toBe('InvalidDimensionsError');
    });

    it('should preserve the message', () => {
      const error = new InvalidDimensionsError('custom error message');

      expect(error.message).toBe('custom error message');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle string input as invalid', () => {
      expect(() => Dimensions.create('64' as unknown as number, 128, 64)).toThrow(
        InvalidDimensionsError
      );
    });

    it('should handle null input as invalid', () => {
      expect(() => Dimensions.create(null as unknown as number, 128, 64)).toThrow(
        InvalidDimensionsError
      );
    });

    it('should handle undefined input as invalid', () => {
      expect(() => Dimensions.create(undefined as unknown as number, 128, 64)).toThrow(
        InvalidDimensionsError
      );
    });

    it('should handle very large integers', () => {
      const dimensions = Dimensions.create(10000, 10000, 10000);

      expect(dimensions.x).toBe(10000);
      expect(dimensions.volume).toBe(1000000000000);
    });

    it('should preserve precision in volume calculation', () => {
      const dimensions = Dimensions.create(3, 7, 11);
      expect(dimensions.volume).toBe(231);
    });
  });
});
