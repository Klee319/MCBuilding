/**
 * ChunkCoord Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * ChunkCoord represents a chunk coordinate (16x16x16 block units).
 */
import { describe, it, expect } from 'vitest';
import {
  ChunkCoord,
  InvalidChunkCoordError,
  createChunkCoord,
  chunkCoordFromPosition,
  chunkCoordEquals,
  chunkCoordToKey,
  chunkCoordFromKey,
  CHUNK_SIZE,
} from '../../../../src/domain/renderer/chunk-coord';
import { Position } from '../../../../src/domain/renderer/position';

describe('ChunkCoord Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('CHUNK_SIZE', () => {
    it('should be 16', () => {
      expect(CHUNK_SIZE).toBe(16);
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('ChunkCoord.create()', () => {
    it('should create ChunkCoord with valid coordinates', () => {
      const chunk = ChunkCoord.create(0, 0, 0);

      expect(chunk).toBeInstanceOf(ChunkCoord);
      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.z).toBe(0);
    });

    it('should create ChunkCoord with positive coordinates', () => {
      const chunk = ChunkCoord.create(5, 10, 15);

      expect(chunk.x).toBe(5);
      expect(chunk.y).toBe(10);
      expect(chunk.z).toBe(15);
    });

    it('should create ChunkCoord with negative coordinates', () => {
      const chunk = ChunkCoord.create(-3, -5, -7);

      expect(chunk.x).toBe(-3);
      expect(chunk.y).toBe(-5);
      expect(chunk.z).toBe(-7);
    });

    it('should throw InvalidChunkCoordError for non-integer x', () => {
      expect(() => ChunkCoord.create(1.5, 0, 0)).toThrow(InvalidChunkCoordError);
    });

    it('should throw InvalidChunkCoordError for non-integer y', () => {
      expect(() => ChunkCoord.create(0, 2.5, 0)).toThrow(InvalidChunkCoordError);
    });

    it('should throw InvalidChunkCoordError for non-integer z', () => {
      expect(() => ChunkCoord.create(0, 0, 3.5)).toThrow(InvalidChunkCoordError);
    });

    it('should throw InvalidChunkCoordError for NaN', () => {
      expect(() => ChunkCoord.create(NaN, 0, 0)).toThrow(InvalidChunkCoordError);
    });

    it('should throw InvalidChunkCoordError for Infinity', () => {
      expect(() => ChunkCoord.create(Infinity, 0, 0)).toThrow(InvalidChunkCoordError);
    });
  });

  describe('ChunkCoord.fromPosition()', () => {
    it('should convert position at origin to chunk (0,0,0)', () => {
      const pos = Position.create(0, 0, 0);
      const chunk = ChunkCoord.fromPosition(pos);

      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.z).toBe(0);
    });

    it('should convert position (15,15,15) to chunk (0,0,0)', () => {
      const pos = Position.create(15, 15, 15);
      const chunk = ChunkCoord.fromPosition(pos);

      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.z).toBe(0);
    });

    it('should convert position (16,0,0) to chunk (1,0,0)', () => {
      const pos = Position.create(16, 0, 0);
      const chunk = ChunkCoord.fromPosition(pos);

      expect(chunk.x).toBe(1);
      expect(chunk.y).toBe(0);
      expect(chunk.z).toBe(0);
    });

    it('should convert position (32,48,64) to chunk (2,3,4)', () => {
      const pos = Position.create(32, 48, 64);
      const chunk = ChunkCoord.fromPosition(pos);

      expect(chunk.x).toBe(2);
      expect(chunk.y).toBe(3);
      expect(chunk.z).toBe(4);
    });

    it('should handle negative positions correctly', () => {
      const pos = Position.create(-1, -1, -1);
      const chunk = ChunkCoord.fromPosition(pos);

      // -1 / 16 = -0.0625, floor = -1
      expect(chunk.x).toBe(-1);
      expect(chunk.y).toBe(-1);
      expect(chunk.z).toBe(-1);
    });

    it('should handle negative positions at chunk boundary', () => {
      const pos = Position.create(-16, -32, -48);
      const chunk = ChunkCoord.fromPosition(pos);

      expect(chunk.x).toBe(-1);
      expect(chunk.y).toBe(-2);
      expect(chunk.z).toBe(-3);
    });
  });

  describe('ChunkCoord.isValid()', () => {
    it('should return true for valid integers', () => {
      expect(ChunkCoord.isValid(0, 0, 0)).toBe(true);
      expect(ChunkCoord.isValid(10, -5, 20)).toBe(true);
    });

    it('should return false for non-integers', () => {
      expect(ChunkCoord.isValid(1.5, 0, 0)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(ChunkCoord.isValid(NaN, 0, 0)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('x getter', () => {
    it('should return x coordinate', () => {
      const chunk = ChunkCoord.create(5, 0, 0);

      expect(chunk.x).toBe(5);
    });
  });

  describe('y getter', () => {
    it('should return y coordinate', () => {
      const chunk = ChunkCoord.create(0, 10, 0);

      expect(chunk.y).toBe(10);
    });
  });

  describe('z getter', () => {
    it('should return z coordinate', () => {
      const chunk = ChunkCoord.create(0, 0, 15);

      expect(chunk.z).toBe(15);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('getMinPosition()', () => {
    it('should return minimum position for chunk (0,0,0)', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const minPos = chunk.getMinPosition();

      expect(minPos.x).toBe(0);
      expect(minPos.y).toBe(0);
      expect(minPos.z).toBe(0);
    });

    it('should return minimum position for chunk (1,2,3)', () => {
      const chunk = ChunkCoord.create(1, 2, 3);
      const minPos = chunk.getMinPosition();

      expect(minPos.x).toBe(16);
      expect(minPos.y).toBe(32);
      expect(minPos.z).toBe(48);
    });

    it('should return minimum position for negative chunk', () => {
      const chunk = ChunkCoord.create(-1, -2, -3);
      const minPos = chunk.getMinPosition();

      expect(minPos.x).toBe(-16);
      expect(minPos.y).toBe(-32);
      expect(minPos.z).toBe(-48);
    });
  });

  describe('getMaxPosition()', () => {
    it('should return maximum position for chunk (0,0,0)', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const maxPos = chunk.getMaxPosition();

      expect(maxPos.x).toBe(15);
      expect(maxPos.y).toBe(15);
      expect(maxPos.z).toBe(15);
    });

    it('should return maximum position for chunk (1,2,3)', () => {
      const chunk = ChunkCoord.create(1, 2, 3);
      const maxPos = chunk.getMaxPosition();

      expect(maxPos.x).toBe(31);
      expect(maxPos.y).toBe(47);
      expect(maxPos.z).toBe(63);
    });
  });

  describe('getCenterPosition()', () => {
    it('should return center position for chunk (0,0,0)', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const center = chunk.getCenterPosition();

      expect(center.x).toBe(8);
      expect(center.y).toBe(8);
      expect(center.z).toBe(8);
    });

    it('should return center position for chunk (1,1,1)', () => {
      const chunk = ChunkCoord.create(1, 1, 1);
      const center = chunk.getCenterPosition();

      expect(center.x).toBe(24);
      expect(center.y).toBe(24);
      expect(center.z).toBe(24);
    });
  });

  describe('containsPosition()', () => {
    it('should return true for position within chunk', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const pos = Position.create(8, 8, 8);

      expect(chunk.containsPosition(pos)).toBe(true);
    });

    it('should return true for position at chunk minimum', () => {
      const chunk = ChunkCoord.create(1, 1, 1);
      const pos = Position.create(16, 16, 16);

      expect(chunk.containsPosition(pos)).toBe(true);
    });

    it('should return true for position at chunk maximum', () => {
      const chunk = ChunkCoord.create(1, 1, 1);
      const pos = Position.create(31, 31, 31);

      expect(chunk.containsPosition(pos)).toBe(true);
    });

    it('should return false for position outside chunk', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const pos = Position.create(16, 0, 0);

      expect(chunk.containsPosition(pos)).toBe(false);
    });
  });

  describe('getNeighbors()', () => {
    it('should return 6 neighbors for a chunk', () => {
      const chunk = ChunkCoord.create(0, 0, 0);
      const neighbors = chunk.getNeighbors();

      expect(neighbors).toHaveLength(6);
    });

    it('should include all 6 face neighbors', () => {
      const chunk = ChunkCoord.create(5, 5, 5);
      const neighbors = chunk.getNeighbors();

      const expectedNeighbors = [
        { x: 4, y: 5, z: 5 }, // -x
        { x: 6, y: 5, z: 5 }, // +x
        { x: 5, y: 4, z: 5 }, // -y
        { x: 5, y: 6, z: 5 }, // +y
        { x: 5, y: 5, z: 4 }, // -z
        { x: 5, y: 5, z: 6 }, // +z
      ];

      for (const expected of expectedNeighbors) {
        const found = neighbors.some(
          (n) => n.x === expected.x && n.y === expected.y && n.z === expected.z
        );
        expect(found).toBe(true);
      }
    });
  });

  describe('distanceTo()', () => {
    it('should return 0 for same chunk', () => {
      const chunk = ChunkCoord.create(5, 5, 5);

      expect(chunk.distanceTo(chunk)).toBe(0);
    });

    it('should calculate distance between chunks', () => {
      const a = ChunkCoord.create(0, 0, 0);
      const b = ChunkCoord.create(3, 4, 0);

      expect(a.distanceTo(b)).toBe(5);
    });
  });

  describe('equals()', () => {
    it('should return true for same coordinates', () => {
      const a = ChunkCoord.create(5, 10, 15);
      const b = ChunkCoord.create(5, 10, 15);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different coordinates', () => {
      const a = ChunkCoord.create(5, 10, 15);
      const b = ChunkCoord.create(5, 10, 16);

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toKey()', () => {
    it('should return string key in format "x,y,z"', () => {
      const chunk = ChunkCoord.create(5, 10, 15);

      expect(chunk.toKey()).toBe('5,10,15');
    });

    it('should handle negative coordinates', () => {
      const chunk = ChunkCoord.create(-5, -10, -15);

      expect(chunk.toKey()).toBe('-5,-10,-15');
    });
  });

  describe('toObject()', () => {
    it('should return plain object', () => {
      const chunk = ChunkCoord.create(5, 10, 15);
      const obj = chunk.toObject();

      expect(obj).toEqual({ x: 5, y: 10, z: 15 });
    });
  });

  describe('toString()', () => {
    it('should return human-readable string', () => {
      const chunk = ChunkCoord.create(5, 10, 15);

      expect(chunk.toString()).toBe('ChunkCoord(5, 10, 15)');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const chunk = ChunkCoord.create(0, 0, 0);

      expect(Object.isFrozen(chunk)).toBe(true);
    });

    it('should not allow property modification', () => {
      const chunk = ChunkCoord.create(0, 0, 0);

      expect(() => {
        (chunk as { _x: number })._x = 5;
      }).toThrow();
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createChunkCoord()', () => {
    it('should create ChunkCoord (alias)', () => {
      const chunk = createChunkCoord(1, 2, 3);

      expect(chunk).toBeInstanceOf(ChunkCoord);
      expect(chunk.x).toBe(1);
    });
  });

  describe('chunkCoordFromPosition()', () => {
    it('should create ChunkCoord from Position', () => {
      const pos = Position.create(32, 48, 64);
      const chunk = chunkCoordFromPosition(pos);

      expect(chunk.x).toBe(2);
      expect(chunk.y).toBe(3);
      expect(chunk.z).toBe(4);
    });
  });

  describe('chunkCoordEquals()', () => {
    it('should compare two chunk coordinates', () => {
      const a = ChunkCoord.create(1, 2, 3);
      const b = ChunkCoord.create(1, 2, 3);
      const c = ChunkCoord.create(1, 2, 4);

      expect(chunkCoordEquals(a, b)).toBe(true);
      expect(chunkCoordEquals(a, c)).toBe(false);
    });
  });

  describe('chunkCoordToKey()', () => {
    it('should convert ChunkCoord to key', () => {
      const chunk = ChunkCoord.create(1, 2, 3);

      expect(chunkCoordToKey(chunk)).toBe('1,2,3');
    });
  });

  describe('chunkCoordFromKey()', () => {
    it('should parse key to ChunkCoord', () => {
      const chunk = chunkCoordFromKey('1,2,3');

      expect(chunk.x).toBe(1);
      expect(chunk.y).toBe(2);
      expect(chunk.z).toBe(3);
    });

    it('should handle negative values', () => {
      const chunk = chunkCoordFromKey('-1,-2,-3');

      expect(chunk.x).toBe(-1);
      expect(chunk.y).toBe(-2);
      expect(chunk.z).toBe(-3);
    });

    it('should throw for invalid key format', () => {
      expect(() => chunkCoordFromKey('invalid')).toThrow(InvalidChunkCoordError);
      expect(() => chunkCoordFromKey('1,2')).toThrow(InvalidChunkCoordError);
    });
  });

  // ========================================
  // InvalidChunkCoordError
  // ========================================
  describe('InvalidChunkCoordError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidChunkCoordError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidChunkCoordError('test');

      expect(error.name).toBe('InvalidChunkCoordError');
    });

    it('should preserve the message', () => {
      const error = new InvalidChunkCoordError('custom message');

      expect(error.message).toBe('custom message');
    });
  });
});
