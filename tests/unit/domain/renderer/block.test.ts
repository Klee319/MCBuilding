/**
 * Block Entity Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Block represents an individual Minecraft block with position and state.
 */
import { describe, it, expect } from 'vitest';
import {
  Block,
  InvalidBlockError,
  createBlock,
  BlockId,
  createBlockId,
} from '../../../../src/domain/renderer/block';
import { Position } from '../../../../src/domain/renderer/position';
import { BlockState } from '../../../../src/domain/renderer/block-state';

describe('Block Entity', () => {
  // ========================================
  // BlockId
  // ========================================
  describe('BlockId', () => {
    describe('createBlockId()', () => {
      it('should create unique block IDs', () => {
        const id1 = createBlockId();
        const id2 = createBlockId();

        expect(id1).not.toBe(id2);
      });

      it('should create string IDs', () => {
        const id = createBlockId();

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('Block.create()', () => {
    it('should create Block with valid parameters', () => {
      const position = Position.create(10, 64, 20);
      const state = BlockState.create('minecraft:stone');
      const block = Block.create(position, state);

      expect(block).toBeInstanceOf(Block);
      expect(block.position.equals(position)).toBe(true);
      expect(block.state.equals(state)).toBe(true);
    });

    it('should auto-generate block ID', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:dirt');
      const block = Block.create(position, state);

      expect(block.id).toBeDefined();
      expect(typeof block.id).toBe('string');
    });

    it('should accept custom block ID', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:dirt');
      const customId = 'custom-block-123' as BlockId;
      const block = Block.create(position, state, 15, customId);

      expect(block.id).toBe(customId);
    });

    it('should accept light level', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:glowstone');
      const block = Block.create(position, state, 15);

      expect(block.lightLevel).toBe(15);
    });

    it('should default light level to 0', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:stone');
      const block = Block.create(position, state);

      expect(block.lightLevel).toBe(0);
    });

    it('should throw InvalidBlockError for null position', () => {
      const state = BlockState.create('minecraft:stone');

      expect(() => Block.create(null as unknown as Position, state)).toThrow(InvalidBlockError);
    });

    it('should throw InvalidBlockError for null state', () => {
      const position = Position.create(0, 0, 0);

      expect(() => Block.create(position, null as unknown as BlockState)).toThrow(InvalidBlockError);
    });

    it('should throw InvalidBlockError for invalid light level (negative)', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:stone');

      expect(() => Block.create(position, state, -1)).toThrow(InvalidBlockError);
    });

    it('should throw InvalidBlockError for invalid light level (> 15)', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:stone');

      expect(() => Block.create(position, state, 16)).toThrow(InvalidBlockError);
    });

    it('should throw InvalidBlockError for non-integer light level', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:stone');

      expect(() => Block.create(position, state, 7.5)).toThrow(InvalidBlockError);
    });
  });

  describe('Block.air()', () => {
    it('should create an air block at given position', () => {
      const position = Position.create(10, 64, 20);
      const air = Block.air(position);

      expect(air.state.isAir()).toBe(true);
      expect(air.position.equals(position)).toBe(true);
    });

    it('should have light level 0', () => {
      const air = Block.air(Position.create(0, 0, 0));

      expect(air.lightLevel).toBe(0);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('id getter', () => {
    it('should return block ID', () => {
      const block = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(block.id).toBeDefined();
      expect(typeof block.id).toBe('string');
    });
  });

  describe('position getter', () => {
    it('should return block position', () => {
      const position = Position.create(5, 10, 15);
      const block = Block.create(position, BlockState.create('minecraft:stone'));

      expect(block.position.x).toBe(5);
      expect(block.position.y).toBe(10);
      expect(block.position.z).toBe(15);
    });
  });

  describe('state getter', () => {
    it('should return block state', () => {
      const state = BlockState.create('minecraft:oak_log', { axis: 'y' });
      const block = Block.create(Position.create(0, 0, 0), state);

      expect(block.state.name).toBe('minecraft:oak_log');
      expect(block.state.getProperty('axis')).toBe('y');
    });
  });

  describe('lightLevel getter', () => {
    it('should return light level', () => {
      const block = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:torch'),
        14
      );

      expect(block.lightLevel).toBe(14);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('isAir()', () => {
    it('should return true for air blocks', () => {
      const air = Block.air(Position.create(0, 0, 0));

      expect(air.isAir()).toBe(true);
    });

    it('should return false for non-air blocks', () => {
      const stone = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(stone.isAir()).toBe(false);
    });
  });

  describe('isOpaque()', () => {
    it('should return true for opaque blocks', () => {
      const stone = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(stone.isOpaque()).toBe(true);
    });

    it('should return false for transparent blocks', () => {
      const glass = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:glass')
      );

      expect(glass.isOpaque()).toBe(false);
    });
  });

  describe('withState()', () => {
    it('should return new Block with updated state', () => {
      const original = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:oak_log', { axis: 'y' })
      );
      const newState = BlockState.create('minecraft:oak_log', { axis: 'x' });
      const updated = original.withState(newState);

      expect(updated.state.getProperty('axis')).toBe('x');
      expect(original.state.getProperty('axis')).toBe('y');
    });

    it('should preserve position and ID', () => {
      const position = Position.create(10, 20, 30);
      const original = Block.create(position, BlockState.create('minecraft:stone'));
      const updated = original.withState(BlockState.create('minecraft:dirt'));

      expect(updated.id).toBe(original.id);
      expect(updated.position.equals(position)).toBe(true);
    });
  });

  describe('withLightLevel()', () => {
    it('should return new Block with updated light level', () => {
      const original = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:redstone_lamp'),
        0
      );
      const updated = original.withLightLevel(15);

      expect(updated.lightLevel).toBe(15);
      expect(original.lightLevel).toBe(0);
    });

    it('should throw for invalid light level', () => {
      const block = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(() => block.withLightLevel(-1)).toThrow(InvalidBlockError);
      expect(() => block.withLightLevel(16)).toThrow(InvalidBlockError);
    });
  });

  describe('getPositionKey()', () => {
    it('should return position as string key', () => {
      const block = Block.create(
        Position.create(10, 64, -20),
        BlockState.create('minecraft:stone')
      );

      expect(block.getPositionKey()).toBe('10,64,-20');
    });
  });

  describe('equals()', () => {
    it('should return true for blocks with same ID', () => {
      const id = createBlockId();
      const a = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone'),
        0,
        id
      );
      const b = Block.create(
        Position.create(1, 1, 1), // Different position
        BlockState.create('minecraft:dirt'), // Different state
        0,
        id // Same ID
      );

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for blocks with different IDs', () => {
      const a = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );
      const b = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return serializable object', () => {
      const block = Block.create(
        Position.create(10, 64, 20),
        BlockState.create('minecraft:oak_stairs', { facing: 'north' }),
        8
      );
      const obj = block.toObject();

      expect(obj.id).toBe(block.id);
      expect(obj.position).toEqual({ x: 10, y: 64, z: 20 });
      expect(obj.state).toBe('minecraft:oak_stairs[facing=north]');
      expect(obj.lightLevel).toBe(8);
    });
  });

  describe('toString()', () => {
    it('should return human-readable string', () => {
      const block = Block.create(
        Position.create(10, 64, 20),
        BlockState.create('minecraft:stone')
      );
      const str = block.toString();

      expect(str).toContain('Block');
      expect(str).toContain('minecraft:stone');
      expect(str).toContain('10');
      expect(str).toContain('64');
      expect(str).toContain('20');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const block = Block.create(
        Position.create(0, 0, 0),
        BlockState.create('minecraft:stone')
      );

      expect(Object.isFrozen(block)).toBe(true);
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createBlock()', () => {
    it('should create Block (alias for Block.create)', () => {
      const position = Position.create(0, 0, 0);
      const state = BlockState.create('minecraft:stone');
      const block = createBlock(position, state);

      expect(block).toBeInstanceOf(Block);
    });
  });

  // ========================================
  // InvalidBlockError
  // ========================================
  describe('InvalidBlockError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidBlockError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidBlockError('test');

      expect(error.name).toBe('InvalidBlockError');
    });
  });
});
