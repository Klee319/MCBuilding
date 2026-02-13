/**
 * BlockState Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * BlockState represents a Minecraft block's type and its properties.
 * e.g., "minecraft:oak_stairs[facing=north,half=bottom]"
 */
import { describe, it, expect } from 'vitest';
import {
  BlockState,
  InvalidBlockStateError,
  createBlockState,
  blockStateEquals,
  blockStateToString,
  parseBlockState,
} from '../../../../src/domain/renderer/block-state';

describe('BlockState Value Object', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('BlockState.create()', () => {
    it('should create BlockState with valid name', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state).toBeInstanceOf(BlockState);
      expect(state.name).toBe('minecraft:stone');
    });

    it('should create BlockState with empty properties by default', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.properties).toEqual({});
    });

    it('should create BlockState with properties', () => {
      const state = BlockState.create('minecraft:oak_stairs', {
        facing: 'north',
        half: 'bottom',
      });

      expect(state.name).toBe('minecraft:oak_stairs');
      expect(state.properties).toEqual({ facing: 'north', half: 'bottom' });
    });

    it('should handle blocks without namespace (defaults to minecraft)', () => {
      const state = BlockState.create('stone');

      expect(state.name).toBe('minecraft:stone');
    });

    it('should handle modded blocks with custom namespace', () => {
      const state = BlockState.create('create:brass_block');

      expect(state.name).toBe('create:brass_block');
    });

    it('should throw InvalidBlockStateError for empty name', () => {
      expect(() => BlockState.create('')).toThrow(InvalidBlockStateError);
    });

    it('should throw InvalidBlockStateError for null name', () => {
      expect(() => BlockState.create(null as unknown as string)).toThrow(InvalidBlockStateError);
    });

    it('should throw InvalidBlockStateError for undefined name', () => {
      expect(() => BlockState.create(undefined as unknown as string)).toThrow(InvalidBlockStateError);
    });

    it('should throw with descriptive error message', () => {
      try {
        BlockState.create('');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidBlockStateError);
        expect((error as InvalidBlockStateError).message).toContain('name');
      }
    });
  });

  describe('BlockState.air()', () => {
    it('should return air block state', () => {
      const air = BlockState.air();

      expect(air.name).toBe('minecraft:air');
      expect(air.properties).toEqual({});
    });

    it('should return same instance (singleton)', () => {
      const air1 = BlockState.air();
      const air2 = BlockState.air();

      expect(air1).toBe(air2);
    });
  });

  describe('BlockState.fromString()', () => {
    it('should parse simple block name', () => {
      const state = BlockState.fromString('minecraft:stone');

      expect(state.name).toBe('minecraft:stone');
      expect(state.properties).toEqual({});
    });

    it('should parse block with single property', () => {
      const state = BlockState.fromString('minecraft:oak_log[axis=y]');

      expect(state.name).toBe('minecraft:oak_log');
      expect(state.properties).toEqual({ axis: 'y' });
    });

    it('should parse block with multiple properties', () => {
      const state = BlockState.fromString('minecraft:oak_stairs[facing=north,half=bottom,shape=straight]');

      expect(state.name).toBe('minecraft:oak_stairs');
      expect(state.properties).toEqual({
        facing: 'north',
        half: 'bottom',
        shape: 'straight',
      });
    });

    it('should handle block without namespace', () => {
      const state = BlockState.fromString('stone');

      expect(state.name).toBe('minecraft:stone');
    });

    it('should handle modded block', () => {
      const state = BlockState.fromString('create:shaft[axis=y]');

      expect(state.name).toBe('create:shaft');
      expect(state.properties).toEqual({ axis: 'y' });
    });

    it('should throw for invalid format', () => {
      expect(() => BlockState.fromString('')).toThrow(InvalidBlockStateError);
      expect(() => BlockState.fromString('[facing=north]')).toThrow(InvalidBlockStateError);
    });
  });

  describe('BlockState.isValid()', () => {
    it('should return true for valid block name', () => {
      expect(BlockState.isValid('minecraft:stone')).toBe(true);
      expect(BlockState.isValid('stone')).toBe(true);
      expect(BlockState.isValid('create:brass_block')).toBe(true);
    });

    it('should return false for empty name', () => {
      expect(BlockState.isValid('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(BlockState.isValid(null as unknown as string)).toBe(false);
      expect(BlockState.isValid(undefined as unknown as string)).toBe(false);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('name getter', () => {
    it('should return the block name', () => {
      const state = BlockState.create('minecraft:diamond_block');

      expect(state.name).toBe('minecraft:diamond_block');
    });
  });

  describe('properties getter', () => {
    it('should return block properties', () => {
      const state = BlockState.create('minecraft:oak_stairs', {
        facing: 'east',
        half: 'top',
      });

      expect(state.properties).toEqual({ facing: 'east', half: 'top' });
    });

    it('should return frozen properties object', () => {
      const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      expect(Object.isFrozen(state.properties)).toBe(true);
    });
  });

  describe('namespace getter', () => {
    it('should return minecraft namespace for standard blocks', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.namespace).toBe('minecraft');
    });

    it('should return custom namespace for modded blocks', () => {
      const state = BlockState.create('create:brass_block');

      expect(state.namespace).toBe('create');
    });
  });

  describe('blockId getter', () => {
    it('should return the block ID without namespace', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.blockId).toBe('stone');
    });

    it('should work with modded blocks', () => {
      const state = BlockState.create('create:brass_block');

      expect(state.blockId).toBe('brass_block');
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('isAir()', () => {
    it('should return true for air blocks', () => {
      expect(BlockState.create('minecraft:air').isAir()).toBe(true);
      expect(BlockState.create('air').isAir()).toBe(true);
      expect(BlockState.create('minecraft:cave_air').isAir()).toBe(true);
      expect(BlockState.create('minecraft:void_air').isAir()).toBe(true);
    });

    it('should return false for non-air blocks', () => {
      expect(BlockState.create('minecraft:stone').isAir()).toBe(false);
      expect(BlockState.create('minecraft:water').isAir()).toBe(false);
    });
  });

  describe('isOpaque()', () => {
    it('should return true for solid blocks', () => {
      expect(BlockState.create('minecraft:stone').isOpaque()).toBe(true);
      expect(BlockState.create('minecraft:dirt').isOpaque()).toBe(true);
      expect(BlockState.create('minecraft:oak_planks').isOpaque()).toBe(true);
    });

    it('should return false for transparent blocks', () => {
      expect(BlockState.create('minecraft:glass').isOpaque()).toBe(false);
      expect(BlockState.create('minecraft:air').isOpaque()).toBe(false);
      expect(BlockState.create('minecraft:water').isOpaque()).toBe(false);
      expect(BlockState.create('minecraft:ice').isOpaque()).toBe(false);
    });

    it('should return false for partial blocks', () => {
      expect(BlockState.create('minecraft:oak_stairs').isOpaque()).toBe(false);
      expect(BlockState.create('minecraft:oak_slab').isOpaque()).toBe(false);
      expect(BlockState.create('minecraft:oak_fence').isOpaque()).toBe(false);
    });
  });

  describe('getProperty()', () => {
    it('should return property value if exists', () => {
      const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      expect(state.getProperty('facing')).toBe('north');
    });

    it('should return undefined if property does not exist', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.getProperty('facing')).toBeUndefined();
    });
  });

  describe('hasProperty()', () => {
    it('should return true if property exists', () => {
      const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      expect(state.hasProperty('facing')).toBe(true);
    });

    it('should return false if property does not exist', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.hasProperty('facing')).toBe(false);
    });
  });

  describe('withProperty()', () => {
    it('should return new BlockState with updated property', () => {
      const original = BlockState.create('minecraft:oak_stairs', { facing: 'north' });
      const updated = original.withProperty('facing', 'south');

      expect(updated.getProperty('facing')).toBe('south');
      expect(original.getProperty('facing')).toBe('north');
    });

    it('should add new property if not exists', () => {
      const original = BlockState.create('minecraft:oak_stairs');
      const updated = original.withProperty('facing', 'north');

      expect(updated.getProperty('facing')).toBe('north');
      expect(original.hasProperty('facing')).toBe(false);
    });

    it('should not mutate original', () => {
      const original = BlockState.create('minecraft:oak_stairs', { facing: 'north' });
      original.withProperty('facing', 'south');

      expect(original.getProperty('facing')).toBe('north');
    });
  });

  describe('equals()', () => {
    it('should return true for identical block states', () => {
      const a = BlockState.create('minecraft:stone');
      const b = BlockState.create('minecraft:stone');

      expect(a.equals(b)).toBe(true);
    });

    it('should return true for same properties', () => {
      const a = BlockState.create('minecraft:oak_stairs', { facing: 'north', half: 'bottom' });
      const b = BlockState.create('minecraft:oak_stairs', { facing: 'north', half: 'bottom' });

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different names', () => {
      const a = BlockState.create('minecraft:stone');
      const b = BlockState.create('minecraft:dirt');

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different properties', () => {
      const a = BlockState.create('minecraft:oak_stairs', { facing: 'north' });
      const b = BlockState.create('minecraft:oak_stairs', { facing: 'south' });

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different property counts', () => {
      const a = BlockState.create('minecraft:oak_stairs', { facing: 'north' });
      const b = BlockState.create('minecraft:oak_stairs', { facing: 'north', half: 'bottom' });

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return name for blocks without properties', () => {
      const state = BlockState.create('minecraft:stone');

      expect(state.toString()).toBe('minecraft:stone');
    });

    it('should return name with properties in bracket notation', () => {
      const state = BlockState.create('minecraft:oak_stairs', {
        facing: 'north',
        half: 'bottom',
      });

      // Properties should be sorted alphabetically
      expect(state.toString()).toBe('minecraft:oak_stairs[facing=north,half=bottom]');
    });

    it('should sort properties alphabetically', () => {
      const state = BlockState.create('minecraft:oak_stairs', {
        half: 'bottom',
        facing: 'north',
        shape: 'straight',
      });

      expect(state.toString()).toBe('minecraft:oak_stairs[facing=north,half=bottom,shape=straight]');
    });
  });

  describe('toDisplayName()', () => {
    it('should return human-readable name', () => {
      const state = BlockState.create('minecraft:oak_planks');

      expect(state.toDisplayName()).toBe('Oak Planks');
    });

    it('should handle multi-word blocks', () => {
      const state = BlockState.create('minecraft:dark_oak_planks');

      expect(state.toDisplayName()).toBe('Dark Oak Planks');
    });

    it('should handle modded blocks', () => {
      const state = BlockState.create('create:brass_block');

      expect(state.toDisplayName()).toBe('Brass Block');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const state = BlockState.create('minecraft:stone');

      expect(Object.isFrozen(state)).toBe(true);
    });

    it('should have frozen properties', () => {
      const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      expect(Object.isFrozen(state.properties)).toBe(true);
    });

    it('should not allow property modification', () => {
      const state = BlockState.create('minecraft:stone');

      expect(() => {
        (state as { _name: string })._name = 'minecraft:dirt';
      }).toThrow();
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createBlockState()', () => {
    it('should create BlockState (alias for BlockState.create)', () => {
      const state = createBlockState('minecraft:stone');

      expect(state).toBeInstanceOf(BlockState);
      expect(state.name).toBe('minecraft:stone');
    });

    it('should accept properties', () => {
      const state = createBlockState('minecraft:oak_stairs', { facing: 'north' });

      expect(state.properties).toEqual({ facing: 'north' });
    });
  });

  describe('blockStateEquals()', () => {
    it('should compare two block states', () => {
      const a = BlockState.create('minecraft:stone');
      const b = BlockState.create('minecraft:stone');
      const c = BlockState.create('minecraft:dirt');

      expect(blockStateEquals(a, b)).toBe(true);
      expect(blockStateEquals(a, c)).toBe(false);
    });
  });

  describe('blockStateToString()', () => {
    it('should convert block state to string', () => {
      const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });

      expect(blockStateToString(state)).toBe('minecraft:oak_stairs[facing=north]');
    });
  });

  describe('parseBlockState()', () => {
    it('should parse string to BlockState', () => {
      const state = parseBlockState('minecraft:oak_stairs[facing=north]');

      expect(state.name).toBe('minecraft:oak_stairs');
      expect(state.properties).toEqual({ facing: 'north' });
    });
  });

  // ========================================
  // InvalidBlockStateError
  // ========================================
  describe('InvalidBlockStateError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidBlockStateError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidBlockStateError('test');

      expect(error.name).toBe('InvalidBlockStateError');
    });

    it('should preserve the message', () => {
      const error = new InvalidBlockStateError('custom message');

      expect(error.message).toBe('custom message');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace in name', () => {
      expect(() => BlockState.create('  ')).toThrow(InvalidBlockStateError);
    });

    it('should handle numeric property values', () => {
      const state = BlockState.create('minecraft:repeater', { delay: '4' });

      expect(state.getProperty('delay')).toBe('4');
    });

    it('should handle boolean-like property values', () => {
      const state = BlockState.create('minecraft:lever', { powered: 'true' });

      expect(state.getProperty('powered')).toBe('true');
    });
  });
});
