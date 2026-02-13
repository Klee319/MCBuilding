/**
 * Position Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Position represents a 3D coordinate in Minecraft space.
 * Unlike Dimensions, Position allows negative and zero values.
 */
import { describe, it, expect } from 'vitest';
import {
  Position,
  InvalidPositionError,
  createPosition,
  positionEquals,
  positionToKey,
  positionFromKey,
  positionAdd,
  positionSubtract,
  positionDistance,
  positionManhattanDistance,
} from '../../../../src/domain/renderer/position';

describe('Position Value Object', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('Position.create()', () => {
    it('should create Position with valid coordinates', () => {
      const pos = Position.create(10, 20, 30);

      expect(pos).toBeInstanceOf(Position);
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
      expect(pos.z).toBe(30);
    });

    it('should create Position with zero values', () => {
      const pos = Position.create(0, 0, 0);

      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('should create Position with negative values', () => {
      const pos = Position.create(-10, -20, -30);

      expect(pos.x).toBe(-10);
      expect(pos.y).toBe(-20);
      expect(pos.z).toBe(-30);
    });

    it('should create Position with mixed positive/negative values', () => {
      const pos = Position.create(-5, 10, -15);

      expect(pos.x).toBe(-5);
      expect(pos.y).toBe(10);
      expect(pos.z).toBe(-15);
    });

    it('should throw InvalidPositionError for non-integer values', () => {
      expect(() => Position.create(1.5, 2, 3)).toThrow(InvalidPositionError);
      expect(() => Position.create(1, 2.7, 3)).toThrow(InvalidPositionError);
      expect(() => Position.create(1, 2, 3.9)).toThrow(InvalidPositionError);
    });

    it('should throw InvalidPositionError for NaN', () => {
      expect(() => Position.create(NaN, 0, 0)).toThrow(InvalidPositionError);
      expect(() => Position.create(0, NaN, 0)).toThrow(InvalidPositionError);
      expect(() => Position.create(0, 0, NaN)).toThrow(InvalidPositionError);
    });

    it('should throw InvalidPositionError for Infinity', () => {
      expect(() => Position.create(Infinity, 0, 0)).toThrow(InvalidPositionError);
      expect(() => Position.create(0, -Infinity, 0)).toThrow(InvalidPositionError);
    });

    it('should throw with descriptive error message', () => {
      try {
        Position.create(1.5, 2, 3);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPositionError);
        expect((error as InvalidPositionError).message).toContain('1.5');
        expect((error as InvalidPositionError).message).toContain('integer');
      }
    });
  });

  describe('Position.origin()', () => {
    it('should return Position at (0, 0, 0)', () => {
      const origin = Position.origin();

      expect(origin.x).toBe(0);
      expect(origin.y).toBe(0);
      expect(origin.z).toBe(0);
    });

    it('should return same instance (singleton)', () => {
      const origin1 = Position.origin();
      const origin2 = Position.origin();

      expect(origin1).toBe(origin2);
    });
  });

  describe('Position.fromObject()', () => {
    it('should create Position from valid object', () => {
      const pos = Position.fromObject({ x: 5, y: 10, z: 15 });

      expect(pos.x).toBe(5);
      expect(pos.y).toBe(10);
      expect(pos.z).toBe(15);
    });

    it('should throw for object with missing properties', () => {
      expect(() => Position.fromObject({ x: 1, y: 2 } as { x: number; y: number; z: number })).toThrow(InvalidPositionError);
    });

    it('should throw for null input', () => {
      expect(() => Position.fromObject(null as unknown as { x: number; y: number; z: number })).toThrow(InvalidPositionError);
    });

    it('should throw for undefined input', () => {
      expect(() => Position.fromObject(undefined as unknown as { x: number; y: number; z: number })).toThrow(InvalidPositionError);
    });
  });

  describe('Position.isValid()', () => {
    it('should return true for valid integers', () => {
      expect(Position.isValid(0, 0, 0)).toBe(true);
      expect(Position.isValid(100, 200, 300)).toBe(true);
      expect(Position.isValid(-50, -100, -150)).toBe(true);
    });

    it('should return false for non-integers', () => {
      expect(Position.isValid(1.5, 0, 0)).toBe(false);
      expect(Position.isValid(0, 2.5, 0)).toBe(false);
      expect(Position.isValid(0, 0, 3.5)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(Position.isValid(NaN, 0, 0)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(Position.isValid(Infinity, 0, 0)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('x getter', () => {
    it('should return the x coordinate', () => {
      const pos = Position.create(42, 0, 0);
      expect(pos.x).toBe(42);
    });
  });

  describe('y getter', () => {
    it('should return the y coordinate', () => {
      const pos = Position.create(0, 42, 0);
      expect(pos.y).toBe(42);
    });
  });

  describe('z getter', () => {
    it('should return the z coordinate', () => {
      const pos = Position.create(0, 0, 42);
      expect(pos.z).toBe(42);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('add()', () => {
    it('should add coordinates and return new Position', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(1, 2, 3);
      const result = a.add(b);

      expect(result.x).toBe(11);
      expect(result.y).toBe(22);
      expect(result.z).toBe(33);
    });

    it('should not mutate original positions', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(1, 2, 3);
      a.add(b);

      expect(a.x).toBe(10);
      expect(a.y).toBe(20);
      expect(a.z).toBe(30);
    });

    it('should handle negative values', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(-5, -10, -15);
      const result = a.add(b);

      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(15);
    });
  });

  describe('subtract()', () => {
    it('should subtract coordinates and return new Position', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(1, 2, 3);
      const result = a.subtract(b);

      expect(result.x).toBe(9);
      expect(result.y).toBe(18);
      expect(result.z).toBe(27);
    });

    it('should not mutate original positions', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(1, 2, 3);
      a.subtract(b);

      expect(a.x).toBe(10);
    });
  });

  describe('distanceTo()', () => {
    it('should calculate Euclidean distance', () => {
      const a = Position.create(0, 0, 0);
      const b = Position.create(3, 4, 0);

      expect(a.distanceTo(b)).toBe(5);
    });

    it('should return 0 for same position', () => {
      const pos = Position.create(10, 20, 30);

      expect(pos.distanceTo(pos)).toBe(0);
    });

    it('should be symmetric', () => {
      const a = Position.create(1, 2, 3);
      const b = Position.create(4, 6, 8);

      expect(a.distanceTo(b)).toBe(b.distanceTo(a));
    });

    it('should handle 3D distance correctly', () => {
      const a = Position.create(0, 0, 0);
      const b = Position.create(1, 2, 2);

      expect(a.distanceTo(b)).toBe(3);
    });
  });

  describe('manhattanDistanceTo()', () => {
    it('should calculate Manhattan distance', () => {
      const a = Position.create(0, 0, 0);
      const b = Position.create(3, 4, 5);

      expect(a.manhattanDistanceTo(b)).toBe(12);
    });

    it('should return 0 for same position', () => {
      const pos = Position.create(10, 20, 30);

      expect(pos.manhattanDistanceTo(pos)).toBe(0);
    });

    it('should be symmetric', () => {
      const a = Position.create(1, 2, 3);
      const b = Position.create(4, 6, 8);

      expect(a.manhattanDistanceTo(b)).toBe(b.manhattanDistanceTo(a));
    });

    it('should handle negative coordinates', () => {
      const a = Position.create(-5, -5, -5);
      const b = Position.create(5, 5, 5);

      expect(a.manhattanDistanceTo(b)).toBe(30);
    });
  });

  describe('equals()', () => {
    it('should return true for identical positions', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(10, 20, 30);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different x', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(11, 20, 30);

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different y', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(10, 21, 30);

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different z', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(10, 20, 31);

      expect(a.equals(b)).toBe(false);
    });

    it('should be symmetric', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(10, 20, 30);

      expect(a.equals(b)).toBe(b.equals(a));
    });

    it('should be reflexive', () => {
      const a = Position.create(10, 20, 30);

      expect(a.equals(a)).toBe(true);
    });
  });

  describe('toKey()', () => {
    it('should return string in format "x,y,z"', () => {
      const pos = Position.create(10, 20, 30);

      expect(pos.toKey()).toBe('10,20,30');
    });

    it('should handle negative values', () => {
      const pos = Position.create(-5, -10, -15);

      expect(pos.toKey()).toBe('-5,-10,-15');
    });

    it('should handle zero values', () => {
      const pos = Position.create(0, 0, 0);

      expect(pos.toKey()).toBe('0,0,0');
    });
  });

  describe('toObject()', () => {
    it('should return object with x, y, z properties', () => {
      const pos = Position.create(10, 20, 30);
      const obj = pos.toObject();

      expect(obj).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('should return new object each time', () => {
      const pos = Position.create(10, 20, 30);
      const obj1 = pos.toObject();
      const obj2 = pos.toObject();

      expect(obj1).not.toBe(obj2);
      expect(obj1).toEqual(obj2);
    });
  });

  describe('toString()', () => {
    it('should return human-readable format', () => {
      const pos = Position.create(10, 20, 30);

      expect(pos.toString()).toBe('Position(10, 20, 30)');
    });

    it('should handle negative values', () => {
      const pos = Position.create(-5, -10, -15);

      expect(pos.toString()).toBe('Position(-5, -10, -15)');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const pos = Position.create(10, 20, 30);

      expect(Object.isFrozen(pos)).toBe(true);
    });

    it('should not allow property modification', () => {
      const pos = Position.create(10, 20, 30);

      expect(() => {
        (pos as { _x: number })._x = 100;
      }).toThrow();
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createPosition()', () => {
    it('should create Position (alias for Position.create)', () => {
      const pos = createPosition(1, 2, 3);

      expect(pos).toBeInstanceOf(Position);
      expect(pos.x).toBe(1);
      expect(pos.y).toBe(2);
      expect(pos.z).toBe(3);
    });
  });

  describe('positionEquals()', () => {
    it('should compare two positions for equality', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(10, 20, 30);
      const c = Position.create(10, 20, 31);

      expect(positionEquals(a, b)).toBe(true);
      expect(positionEquals(a, c)).toBe(false);
    });
  });

  describe('positionToKey()', () => {
    it('should convert position to string key', () => {
      const pos = Position.create(10, 20, 30);

      expect(positionToKey(pos)).toBe('10,20,30');
    });
  });

  describe('positionFromKey()', () => {
    it('should parse string key to Position', () => {
      const pos = positionFromKey('10,20,30');

      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
      expect(pos.z).toBe(30);
    });

    it('should handle negative values', () => {
      const pos = positionFromKey('-5,-10,-15');

      expect(pos.x).toBe(-5);
      expect(pos.y).toBe(-10);
      expect(pos.z).toBe(-15);
    });

    it('should throw for invalid key format', () => {
      expect(() => positionFromKey('invalid')).toThrow(InvalidPositionError);
      expect(() => positionFromKey('10,20')).toThrow(InvalidPositionError);
      expect(() => positionFromKey('10,20,30,40')).toThrow(InvalidPositionError);
    });

    it('should throw for non-integer values in key', () => {
      expect(() => positionFromKey('1.5,2,3')).toThrow(InvalidPositionError);
    });
  });

  describe('positionAdd()', () => {
    it('should add two positions', () => {
      const a = Position.create(1, 2, 3);
      const b = Position.create(4, 5, 6);
      const result = positionAdd(a, b);

      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });
  });

  describe('positionSubtract()', () => {
    it('should subtract two positions', () => {
      const a = Position.create(10, 20, 30);
      const b = Position.create(1, 2, 3);
      const result = positionSubtract(a, b);

      expect(result.x).toBe(9);
      expect(result.y).toBe(18);
      expect(result.z).toBe(27);
    });
  });

  describe('positionDistance()', () => {
    it('should calculate Euclidean distance', () => {
      const a = Position.create(0, 0, 0);
      const b = Position.create(3, 4, 0);

      expect(positionDistance(a, b)).toBe(5);
    });
  });

  describe('positionManhattanDistance()', () => {
    it('should calculate Manhattan distance', () => {
      const a = Position.create(0, 0, 0);
      const b = Position.create(3, 4, 5);

      expect(positionManhattanDistance(a, b)).toBe(12);
    });
  });

  // ========================================
  // InvalidPositionError
  // ========================================
  describe('InvalidPositionError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidPositionError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidPositionError('test');

      expect(error.name).toBe('InvalidPositionError');
    });

    it('should preserve the message', () => {
      const error = new InvalidPositionError('custom message');

      expect(error.message).toBe('custom message');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle string input as invalid', () => {
      expect(() => Position.create('10' as unknown as number, 20, 30)).toThrow(InvalidPositionError);
    });

    it('should handle null input as invalid', () => {
      expect(() => Position.create(null as unknown as number, 20, 30)).toThrow(InvalidPositionError);
    });

    it('should handle undefined input as invalid', () => {
      expect(() => Position.create(undefined as unknown as number, 20, 30)).toThrow(InvalidPositionError);
    });

    it('should handle very large integers', () => {
      const pos = Position.create(1000000, 1000000, 1000000);

      expect(pos.x).toBe(1000000);
    });

    it('should handle very small (negative) integers', () => {
      const pos = Position.create(-1000000, -1000000, -1000000);

      expect(pos.x).toBe(-1000000);
    });
  });
});
