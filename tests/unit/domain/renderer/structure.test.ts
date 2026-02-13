/**
 * Structure Entity Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Structure represents a complete Minecraft structure with blocks.
 */
import { describe, it, expect } from 'vitest';
import {
  Structure,
  InvalidStructureError,
  createStructure,
  StructureId,
  createStructureId,
  StructureMetadata,
} from '../../../../src/domain/renderer/structure';
import { Position } from '../../../../src/domain/renderer/position';
import { BlockState } from '../../../../src/domain/renderer/block-state';
import { Block, createBlockId } from '../../../../src/domain/renderer/block';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions';

describe('Structure Entity', () => {
  // Helper to create a test structure
  const createTestBlocks = (): Map<string, Block> => {
    const blocks = new Map<string, Block>();

    // Create a small 3x3x3 structure
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          const position = Position.create(x, y, z);
          const state = BlockState.create('minecraft:stone');
          const block = Block.create(position, state);
          blocks.set(position.toKey(), block);
        }
      }
    }

    return blocks;
  };

  // ========================================
  // StructureId
  // ========================================
  describe('StructureId', () => {
    describe('createStructureId()', () => {
      it('should create unique structure IDs', () => {
        const id1 = createStructureId();
        const id2 = createStructureId();

        expect(id1).not.toBe(id2);
      });

      it('should create string IDs', () => {
        const id = createStructureId();

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('Structure.create()', () => {
    it('should create Structure with valid parameters', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const palette = [BlockState.create('minecraft:stone')];
      const metadata: StructureMetadata = {
        author: 'Test',
        description: 'Test structure',
        createdAt: new Date(),
      };

      const structure = Structure.create(
        'Test Structure',
        dimensions,
        palette,
        blocks,
        metadata
      );

      expect(structure).toBeInstanceOf(Structure);
      expect(structure.name).toBe('Test Structure');
      expect(structure.dimensions.equals(dimensions)).toBe(true);
    });

    it('should auto-generate structure ID', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.id).toBeDefined();
      expect(typeof structure.id).toBe('string');
    });

    it('should accept custom structure ID', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const customId = 'custom-structure-123' as StructureId;
      const structure = Structure.create('Test', dimensions, [], blocks, undefined, customId);

      expect(structure.id).toBe(customId);
    });

    it('should throw InvalidStructureError for empty name', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);

      expect(() => Structure.create('', dimensions, [], blocks)).toThrow(InvalidStructureError);
    });

    it('should throw InvalidStructureError for null dimensions', () => {
      const blocks = createTestBlocks();

      expect(() => Structure.create('Test', null as unknown as Dimensions, [], blocks)).toThrow(InvalidStructureError);
    });

    it('should throw InvalidStructureError for null blocks', () => {
      const dimensions = Dimensions.create(3, 3, 3);

      expect(() => Structure.create('Test', dimensions, [], null as unknown as Map<string, Block>)).toThrow(InvalidStructureError);
    });
  });

  describe('Structure.empty()', () => {
    it('should create an empty structure with given dimensions', () => {
      const dimensions = Dimensions.create(10, 20, 30);
      const structure = Structure.empty('Empty Structure', dimensions);

      expect(structure.name).toBe('Empty Structure');
      expect(structure.dimensions.equals(dimensions)).toBe(true);
      expect(structure.blockCount).toBe(0);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('id getter', () => {
    it('should return structure ID', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.id).toBeDefined();
    });
  });

  describe('name getter', () => {
    it('should return structure name', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('My Castle', dimensions, [], blocks);

      expect(structure.name).toBe('My Castle');
    });
  });

  describe('dimensions getter', () => {
    it('should return structure dimensions', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(100, 50, 75);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.dimensions.x).toBe(100);
      expect(structure.dimensions.y).toBe(50);
      expect(structure.dimensions.z).toBe(75);
    });
  });

  describe('palette getter', () => {
    it('should return block palette', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const palette = [
        BlockState.create('minecraft:stone'),
        BlockState.create('minecraft:oak_planks'),
      ];
      const structure = Structure.create('Test', dimensions, palette, blocks);

      expect(structure.palette).toHaveLength(2);
      expect(structure.palette[0].name).toBe('minecraft:stone');
      expect(structure.palette[1].name).toBe('minecraft:oak_planks');
    });

    it('should return frozen palette array', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(Object.isFrozen(structure.palette)).toBe(true);
    });
  });

  describe('blocks getter', () => {
    it('should return blocks map', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.blocks.size).toBe(27); // 3x3x3
    });
  });

  describe('metadata getter', () => {
    it('should return structure metadata', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const metadata: StructureMetadata = {
        author: 'TestAuthor',
        description: 'A test structure',
        createdAt: new Date('2024-01-01'),
      };
      const structure = Structure.create('Test', dimensions, [], blocks, metadata);

      expect(structure.metadata?.author).toBe('TestAuthor');
      expect(structure.metadata?.description).toBe('A test structure');
    });

    it('should return undefined when no metadata', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.metadata).toBeUndefined();
    });
  });

  describe('blockCount getter', () => {
    it('should return number of non-air blocks', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.blockCount).toBe(27);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('getBlock()', () => {
    it('should return block at position', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const block = structure.getBlock(Position.create(1, 1, 1));

      expect(block).toBeDefined();
      expect(block?.state.name).toBe('minecraft:stone');
    });

    it('should return undefined for position without block', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const block = structure.getBlock(Position.create(10, 10, 10));

      expect(block).toBeUndefined();
    });
  });

  describe('getBlockByKey()', () => {
    it('should return block by position key', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const block = structure.getBlockByKey('1,1,1');

      expect(block).toBeDefined();
      expect(block?.state.name).toBe('minecraft:stone');
    });
  });

  describe('hasBlock()', () => {
    it('should return true for position with block', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.hasBlock(Position.create(1, 1, 1))).toBe(true);
    });

    it('should return false for position without block', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.hasBlock(Position.create(10, 10, 10))).toBe(false);
    });
  });

  describe('isWithinBounds()', () => {
    it('should return true for position within bounds', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(10, 20, 30);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.isWithinBounds(Position.create(5, 10, 15))).toBe(true);
      expect(structure.isWithinBounds(Position.create(0, 0, 0))).toBe(true);
      expect(structure.isWithinBounds(Position.create(9, 19, 29))).toBe(true);
    });

    it('should return false for position outside bounds', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(10, 20, 30);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(structure.isWithinBounds(Position.create(10, 0, 0))).toBe(false);
      expect(structure.isWithinBounds(Position.create(-1, 0, 0))).toBe(false);
      expect(structure.isWithinBounds(Position.create(0, 20, 0))).toBe(false);
    });
  });

  describe('getCenter()', () => {
    it('should return center position of structure', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(10, 20, 30);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const center = structure.getCenter();

      expect(center.x).toBe(5);
      expect(center.y).toBe(10);
      expect(center.z).toBe(15);
    });
  });

  describe('withBlock()', () => {
    it('should return new Structure with added/updated block', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(10, 10, 10);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const newBlock = Block.create(
        Position.create(5, 5, 5),
        BlockState.create('minecraft:diamond_block')
      );
      const updated = structure.withBlock(newBlock);

      expect(updated.getBlock(Position.create(5, 5, 5))?.state.name).toBe('minecraft:diamond_block');
      expect(structure.getBlock(Position.create(5, 5, 5))).toBeUndefined();
    });
  });

  describe('withoutBlock()', () => {
    it('should return new Structure without block at position', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      const updated = structure.withoutBlock(Position.create(1, 1, 1));

      expect(updated.hasBlock(Position.create(1, 1, 1))).toBe(false);
      expect(structure.hasBlock(Position.create(1, 1, 1))).toBe(true);
    });
  });

  describe('withName()', () => {
    it('should return new Structure with updated name', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Original Name', dimensions, [], blocks);

      const updated = structure.withName('New Name');

      expect(updated.name).toBe('New Name');
      expect(structure.name).toBe('Original Name');
    });
  });

  describe('equals()', () => {
    it('should return true for structures with same ID', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const id = createStructureId();

      const a = Structure.create('A', dimensions, [], blocks, undefined, id);
      const b = Structure.create('B', dimensions, [], blocks, undefined, id);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for structures with different IDs', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);

      const a = Structure.create('A', dimensions, [], blocks);
      const b = Structure.create('A', dimensions, [], blocks);

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return serializable object', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const palette = [BlockState.create('minecraft:stone')];
      const structure = Structure.create('Test Structure', dimensions, palette, blocks);

      const obj = structure.toObject();

      expect(obj.id).toBe(structure.id);
      expect(obj.name).toBe('Test Structure');
      expect(obj.dimensions).toEqual({ x: 3, y: 3, z: 3 });
      expect(obj.palette).toHaveLength(1);
      expect(obj.blockCount).toBe(27);
    });
  });

  describe('toString()', () => {
    it('should return human-readable string', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('My Castle', dimensions, [], blocks);

      const str = structure.toString();

      expect(str).toContain('Structure');
      expect(str).toContain('My Castle');
      expect(str).toContain('3x3x3');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = Structure.create('Test', dimensions, [], blocks);

      expect(Object.isFrozen(structure)).toBe(true);
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createStructure()', () => {
    it('should create Structure (alias)', () => {
      const blocks = createTestBlocks();
      const dimensions = Dimensions.create(3, 3, 3);
      const structure = createStructure('Test', dimensions, [], blocks);

      expect(structure).toBeInstanceOf(Structure);
    });
  });

  // ========================================
  // InvalidStructureError
  // ========================================
  describe('InvalidStructureError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidStructureError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidStructureError('test');

      expect(error.name).toBe('InvalidStructureError');
    });
  });
});
