/**
 * LodLevel Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * LodLevel represents Level of Detail for rendering optimization.
 * - 0: Full detail
 * - 1: 2x2x2 blocks merged
 * - 2: 4x4x4 blocks merged
 * - 3: 8x8x8 blocks merged
 */
import { describe, it, expect } from 'vitest';
import {
  LodLevel,
  InvalidLodLevelError,
  LOD_LEVEL_VALUES,
  type LodLevelValue,
  createLodLevel,
  lodLevelFromDistance,
  lodLevelToBlockSize,
  lodLevelToString,
} from '../../../../src/domain/renderer/lod-level';

describe('LodLevel Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('LOD_LEVEL_VALUES', () => {
    it('should contain exactly 0, 1, 2, 3', () => {
      expect(LOD_LEVEL_VALUES).toEqual([0, 1, 2, 3]);
    });

    it('should be readonly array', () => {
      expect(LOD_LEVEL_VALUES.length).toBe(4);
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('LodLevel.create()', () => {
    it('should create LodLevel with value 0', () => {
      const lod = LodLevel.create(0);

      expect(lod).toBeInstanceOf(LodLevel);
      expect(lod.value).toBe(0);
    });

    it('should create LodLevel with value 1', () => {
      const lod = LodLevel.create(1);

      expect(lod.value).toBe(1);
    });

    it('should create LodLevel with value 2', () => {
      const lod = LodLevel.create(2);

      expect(lod.value).toBe(2);
    });

    it('should create LodLevel with value 3', () => {
      const lod = LodLevel.create(3);

      expect(lod.value).toBe(3);
    });

    it('should throw InvalidLodLevelError for value 4', () => {
      expect(() => LodLevel.create(4 as LodLevelValue)).toThrow(InvalidLodLevelError);
    });

    it('should throw InvalidLodLevelError for negative value', () => {
      expect(() => LodLevel.create(-1 as LodLevelValue)).toThrow(InvalidLodLevelError);
    });

    it('should throw InvalidLodLevelError for non-integer', () => {
      expect(() => LodLevel.create(1.5 as LodLevelValue)).toThrow(InvalidLodLevelError);
    });

    it('should throw InvalidLodLevelError for null', () => {
      expect(() => LodLevel.create(null as unknown as LodLevelValue)).toThrow(InvalidLodLevelError);
    });
  });

  describe('LodLevel.full()', () => {
    it('should return LOD level 0 (full detail)', () => {
      const lod = LodLevel.full();

      expect(lod.value).toBe(0);
    });

    it('should return same instance (singleton)', () => {
      const lod1 = LodLevel.full();
      const lod2 = LodLevel.full();

      expect(lod1).toBe(lod2);
    });
  });

  describe('LodLevel.fromDistance()', () => {
    it('should return LOD 0 for distance < 50', () => {
      const lod = LodLevel.fromDistance(30);

      expect(lod.value).toBe(0);
    });

    it('should return LOD 1 for distance 50-99', () => {
      const lod = LodLevel.fromDistance(75);

      expect(lod.value).toBe(1);
    });

    it('should return LOD 2 for distance 100-199', () => {
      const lod = LodLevel.fromDistance(150);

      expect(lod.value).toBe(2);
    });

    it('should return LOD 3 for distance >= 200', () => {
      const lod = LodLevel.fromDistance(250);

      expect(lod.value).toBe(3);
    });

    it('should handle boundary at 50', () => {
      const lod49 = LodLevel.fromDistance(49);
      const lod50 = LodLevel.fromDistance(50);

      expect(lod49.value).toBe(0);
      expect(lod50.value).toBe(1);
    });

    it('should handle boundary at 100', () => {
      const lod99 = LodLevel.fromDistance(99);
      const lod100 = LodLevel.fromDistance(100);

      expect(lod99.value).toBe(1);
      expect(lod100.value).toBe(2);
    });

    it('should handle boundary at 200', () => {
      const lod199 = LodLevel.fromDistance(199);
      const lod200 = LodLevel.fromDistance(200);

      expect(lod199.value).toBe(2);
      expect(lod200.value).toBe(3);
    });

    it('should throw for negative distance', () => {
      expect(() => LodLevel.fromDistance(-10)).toThrow(InvalidLodLevelError);
    });
  });

  describe('LodLevel.isValid()', () => {
    it('should return true for valid values', () => {
      expect(LodLevel.isValid(0)).toBe(true);
      expect(LodLevel.isValid(1)).toBe(true);
      expect(LodLevel.isValid(2)).toBe(true);
      expect(LodLevel.isValid(3)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(LodLevel.isValid(4)).toBe(false);
      expect(LodLevel.isValid(-1)).toBe(false);
      expect(LodLevel.isValid(1.5)).toBe(false);
      expect(LodLevel.isValid(NaN)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('value getter', () => {
    it('should return the LOD level value', () => {
      const lod = LodLevel.create(2);

      expect(lod.value).toBe(2);
    });
  });

  describe('blockSize getter', () => {
    it('should return 1 for LOD 0', () => {
      const lod = LodLevel.create(0);

      expect(lod.blockSize).toBe(1);
    });

    it('should return 2 for LOD 1', () => {
      const lod = LodLevel.create(1);

      expect(lod.blockSize).toBe(2);
    });

    it('should return 4 for LOD 2', () => {
      const lod = LodLevel.create(2);

      expect(lod.blockSize).toBe(4);
    });

    it('should return 8 for LOD 3', () => {
      const lod = LodLevel.create(3);

      expect(lod.blockSize).toBe(8);
    });
  });

  describe('blocksPerUnit getter', () => {
    it('should return 1 for LOD 0', () => {
      const lod = LodLevel.create(0);

      expect(lod.blocksPerUnit).toBe(1);
    });

    it('should return 8 for LOD 1 (2x2x2)', () => {
      const lod = LodLevel.create(1);

      expect(lod.blocksPerUnit).toBe(8);
    });

    it('should return 64 for LOD 2 (4x4x4)', () => {
      const lod = LodLevel.create(2);

      expect(lod.blocksPerUnit).toBe(64);
    });

    it('should return 512 for LOD 3 (8x8x8)', () => {
      const lod = LodLevel.create(3);

      expect(lod.blocksPerUnit).toBe(512);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('isFullDetail()', () => {
    it('should return true for LOD 0', () => {
      const lod = LodLevel.create(0);

      expect(lod.isFullDetail()).toBe(true);
    });

    it('should return false for LOD 1, 2, 3', () => {
      expect(LodLevel.create(1).isFullDetail()).toBe(false);
      expect(LodLevel.create(2).isFullDetail()).toBe(false);
      expect(LodLevel.create(3).isFullDetail()).toBe(false);
    });
  });

  describe('isLowestDetail()', () => {
    it('should return true for LOD 3', () => {
      const lod = LodLevel.create(3);

      expect(lod.isLowestDetail()).toBe(true);
    });

    it('should return false for LOD 0, 1, 2', () => {
      expect(LodLevel.create(0).isLowestDetail()).toBe(false);
      expect(LodLevel.create(1).isLowestDetail()).toBe(false);
      expect(LodLevel.create(2).isLowestDetail()).toBe(false);
    });
  });

  describe('increase()', () => {
    it('should return next higher LOD level', () => {
      const lod0 = LodLevel.create(0);
      const lod1 = lod0.increase();

      expect(lod1.value).toBe(1);
    });

    it('should return LOD 3 when already at LOD 3', () => {
      const lod3 = LodLevel.create(3);
      const still3 = lod3.increase();

      expect(still3.value).toBe(3);
    });

    it('should not mutate original', () => {
      const lod = LodLevel.create(1);
      lod.increase();

      expect(lod.value).toBe(1);
    });
  });

  describe('decrease()', () => {
    it('should return next lower LOD level', () => {
      const lod2 = LodLevel.create(2);
      const lod1 = lod2.decrease();

      expect(lod1.value).toBe(1);
    });

    it('should return LOD 0 when already at LOD 0', () => {
      const lod0 = LodLevel.create(0);
      const still0 = lod0.decrease();

      expect(still0.value).toBe(0);
    });

    it('should not mutate original', () => {
      const lod = LodLevel.create(2);
      lod.decrease();

      expect(lod.value).toBe(2);
    });
  });

  describe('equals()', () => {
    it('should return true for same LOD value', () => {
      const a = LodLevel.create(2);
      const b = LodLevel.create(2);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different LOD values', () => {
      const a = LodLevel.create(1);
      const b = LodLevel.create(2);

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return descriptive string for LOD 0', () => {
      const lod = LodLevel.create(0);

      expect(lod.toString()).toBe('LOD 0 (Full Detail)');
    });

    it('should return descriptive string for LOD 1', () => {
      const lod = LodLevel.create(1);

      expect(lod.toString()).toBe('LOD 1 (2x2x2)');
    });

    it('should return descriptive string for LOD 2', () => {
      const lod = LodLevel.create(2);

      expect(lod.toString()).toBe('LOD 2 (4x4x4)');
    });

    it('should return descriptive string for LOD 3', () => {
      const lod = LodLevel.create(3);

      expect(lod.toString()).toBe('LOD 3 (8x8x8)');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const lod = LodLevel.create(1);

      expect(Object.isFrozen(lod)).toBe(true);
    });

    it('should not allow property modification', () => {
      const lod = LodLevel.create(1);

      expect(() => {
        (lod as { _value: number })._value = 2;
      }).toThrow();
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createLodLevel()', () => {
    it('should create LodLevel (alias)', () => {
      const lod = createLodLevel(2);

      expect(lod).toBeInstanceOf(LodLevel);
      expect(lod.value).toBe(2);
    });
  });

  describe('lodLevelFromDistance()', () => {
    it('should create LodLevel from distance', () => {
      const lod = lodLevelFromDistance(150);

      expect(lod.value).toBe(2);
    });
  });

  describe('lodLevelToBlockSize()', () => {
    it('should return block size for LOD level', () => {
      const lod = LodLevel.create(2);

      expect(lodLevelToBlockSize(lod)).toBe(4);
    });
  });

  describe('lodLevelToString()', () => {
    it('should return string representation', () => {
      const lod = LodLevel.create(1);

      expect(lodLevelToString(lod)).toBe('LOD 1 (2x2x2)');
    });
  });

  // ========================================
  // InvalidLodLevelError
  // ========================================
  describe('InvalidLodLevelError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidLodLevelError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidLodLevelError('test');

      expect(error.name).toBe('InvalidLodLevelError');
    });

    it('should preserve the message', () => {
      const error = new InvalidLodLevelError('custom message');

      expect(error.message).toBe('custom message');
    });
  });
});
