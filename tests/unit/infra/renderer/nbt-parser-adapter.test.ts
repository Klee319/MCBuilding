/**
 * NBTParserAdapter Tests
 *
 * Tests for the NBT parsing implementation using prismarine-nbt.
 * Follows TDD methodology - these tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NBTParserAdapter } from '../../../../src/infra/renderer/nbt-parser-adapter.js';
import type {
  StructureFormat,
  ParsedNBT,
} from '../../../../src/usecase/ports/renderer/nbt-parser-port.js';

// ========================================
// Test Fixtures - NBT Data Generators
// ========================================

/**
 * Creates a minimal valid schematic NBT structure (gzipped)
 * Format: Classic MCEdit schematic
 */
async function createSchematicBuffer(): Promise<ArrayBuffer> {
  // Using prismarine-nbt to create a valid NBT structure
  const nbt = await import('prismarine-nbt');

  const schematicData = {
    type: 'compound' as const,
    name: 'Schematic',
    value: {
      Width: { type: 'short' as const, value: 2 },
      Height: { type: 'short' as const, value: 2 },
      Length: { type: 'short' as const, value: 2 },
      Materials: { type: 'string' as const, value: 'Alpha' },
      Blocks: { type: 'byteArray' as const, value: Buffer.from([1, 1, 1, 1, 1, 1, 1, 1]) },
      Data: { type: 'byteArray' as const, value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]) },
    },
  };

  const buffer = nbt.writeUncompressed(schematicData);
  const compressed = await new Promise<Buffer>((resolve, reject) => {
    const { gzip } = require('zlib');
    gzip(buffer, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
}

/**
 * Creates a minimal valid Sponge schematic (.schem) NBT structure
 * Format: Sponge Schematic v2
 */
async function createSchemBuffer(): Promise<ArrayBuffer> {
  const nbt = await import('prismarine-nbt');

  const schemData = {
    type: 'compound' as const,
    name: 'Schematic',
    value: {
      Version: { type: 'int' as const, value: 2 },
      DataVersion: { type: 'int' as const, value: 2586 },
      Width: { type: 'short' as const, value: 2 },
      Height: { type: 'short' as const, value: 2 },
      Length: { type: 'short' as const, value: 2 },
      Palette: {
        type: 'compound' as const,
        value: {
          'minecraft:stone': { type: 'int' as const, value: 0 },
          'minecraft:air': { type: 'int' as const, value: 1 },
        },
      },
      BlockData: { type: 'byteArray' as const, value: Buffer.from([0, 0, 0, 0, 1, 1, 1, 1]) },
      Metadata: {
        type: 'compound' as const,
        value: {},
      },
    },
  };

  const buffer = nbt.writeUncompressed(schemData);
  const compressed = await new Promise<Buffer>((resolve, reject) => {
    const { gzip } = require('zlib');
    gzip(buffer, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
}

/**
 * Creates a minimal valid Litematic structure
 */
async function createLitematicBuffer(): Promise<ArrayBuffer> {
  const nbt = await import('prismarine-nbt');

  // Use a small timestamp that fits in 32-bit int for compatibility
  const timestamp = 1000000;

  const litematicData = {
    type: 'compound' as const,
    name: '',
    value: {
      MinecraftDataVersion: { type: 'int' as const, value: 2586 },
      Version: { type: 'int' as const, value: 5 },
      Metadata: {
        type: 'compound' as const,
        value: {
          Name: { type: 'string' as const, value: 'Test' },
          Author: { type: 'string' as const, value: 'TestAuthor' },
          EnclosingSize: {
            type: 'compound' as const,
            value: {
              x: { type: 'int' as const, value: 2 },
              y: { type: 'int' as const, value: 2 },
              z: { type: 'int' as const, value: 2 },
            },
          },
          TotalBlocks: { type: 'int' as const, value: 8 },
          TotalVolume: { type: 'int' as const, value: 8 },
          TimeCreated: { type: 'long' as const, value: [0, timestamp] },
          TimeModified: { type: 'long' as const, value: [0, timestamp] },
          RegionCount: { type: 'int' as const, value: 1 },
        },
      },
      Regions: {
        type: 'compound' as const,
        value: {
          Main: {
            type: 'compound' as const,
            value: {
              Position: {
                type: 'compound' as const,
                value: {
                  x: { type: 'int' as const, value: 0 },
                  y: { type: 'int' as const, value: 0 },
                  z: { type: 'int' as const, value: 0 },
                },
              },
              Size: {
                type: 'compound' as const,
                value: {
                  x: { type: 'int' as const, value: 2 },
                  y: { type: 'int' as const, value: 2 },
                  z: { type: 'int' as const, value: 2 },
                },
              },
              BlockStatePalette: {
                type: 'list' as const,
                value: {
                  type: 'compound' as const,
                  value: [
                    { Name: { type: 'string' as const, value: 'minecraft:stone' } },
                  ],
                },
              },
              BlockStates: {
                type: 'longArray' as const,
                value: [BigInt(0)],
              },
            },
          },
        },
      },
    },
  };

  const buffer = nbt.writeUncompressed(litematicData);
  const compressed = await new Promise<Buffer>((resolve, reject) => {
    const { gzip } = require('zlib');
    gzip(buffer, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
}

/**
 * Creates a minimal valid Bedrock mcstructure
 */
async function createMcstructureBuffer(): Promise<ArrayBuffer> {
  const nbt = await import('prismarine-nbt');

  const mcstructureData = {
    type: 'compound' as const,
    name: '',
    value: {
      format_version: { type: 'int' as const, value: 1 },
      size: {
        type: 'list' as const,
        value: {
          type: 'int' as const,
          value: [2, 2, 2],
        },
      },
      structure: {
        type: 'compound' as const,
        value: {
          block_indices: {
            type: 'list' as const,
            value: {
              type: 'list' as const,
              value: [
                {
                  type: 'int' as const,
                  value: [0, 0, 0, 0, 0, 0, 0, 0],
                },
              ],
            },
          },
          palette: {
            type: 'compound' as const,
            value: {
              default: {
                type: 'compound' as const,
                value: {
                  block_palette: {
                    type: 'list' as const,
                    value: {
                      type: 'compound' as const,
                      value: [
                        {
                          name: { type: 'string' as const, value: 'minecraft:stone' },
                          states: { type: 'compound' as const, value: {} },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      structure_world_origin: {
        type: 'list' as const,
        value: {
          type: 'int' as const,
          value: [0, 0, 0],
        },
      },
    },
  };

  // Bedrock uses little-endian uncompressed NBT
  const buffer = nbt.writeUncompressed(mcstructureData, 'littleVarint');

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Creates invalid/corrupted data
 */
function createInvalidBuffer(): ArrayBuffer {
  return new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]).buffer;
}

describe('NBTParserAdapter', () => {
  let parser: NBTParserAdapter;

  beforeEach(() => {
    parser = new NBTParserAdapter();
  });

  // ========================================
  // parse() Tests
  // ========================================

  describe('parse', () => {
    describe('schematic format (MCEdit Classic)', () => {
      it('successfully parses valid schematic data', async () => {
        const buffer = await createSchematicBuffer();
        const result = await parser.parse(buffer, 'schematic');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.format).toBe('schematic');
          expect(result.value.data).toBeDefined();
          expect(result.value.rawSize).toBeGreaterThan(0);
        }
      });

      it('extracts Width, Height, Length from schematic', async () => {
        const buffer = await createSchematicBuffer();
        const result = await parser.parse(buffer, 'schematic');

        expect(result.success).toBe(true);
        if (result.success) {
          const data = result.value.data as Record<string, unknown>;
          expect(data).toHaveProperty('Width');
          expect(data).toHaveProperty('Height');
          expect(data).toHaveProperty('Length');
        }
      });
    });

    describe('schem format (Sponge Schematic)', () => {
      it('successfully parses valid schem data', async () => {
        const buffer = await createSchemBuffer();
        const result = await parser.parse(buffer, 'schem');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.format).toBe('schem');
          expect(result.value.data).toBeDefined();
        }
      });

      it('extracts Palette from schem', async () => {
        const buffer = await createSchemBuffer();
        const result = await parser.parse(buffer, 'schem');

        expect(result.success).toBe(true);
        if (result.success) {
          const data = result.value.data as Record<string, unknown>;
          expect(data).toHaveProperty('Palette');
        }
      });
    });

    describe('litematic format', () => {
      it('successfully parses valid litematic data', async () => {
        const buffer = await createLitematicBuffer();
        const result = await parser.parse(buffer, 'litematic');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.format).toBe('litematic');
          expect(result.value.data).toBeDefined();
        }
      });

      it('extracts Regions from litematic', async () => {
        const buffer = await createLitematicBuffer();
        const result = await parser.parse(buffer, 'litematic');

        expect(result.success).toBe(true);
        if (result.success) {
          const data = result.value.data as Record<string, unknown>;
          expect(data).toHaveProperty('Regions');
        }
      });
    });

    describe('mcstructure format (Bedrock)', () => {
      it('successfully parses valid mcstructure data', async () => {
        const buffer = await createMcstructureBuffer();
        const result = await parser.parse(buffer, 'mcstructure');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.format).toBe('mcstructure');
          expect(result.value.data).toBeDefined();
        }
      });

      it('extracts structure and size from mcstructure', async () => {
        const buffer = await createMcstructureBuffer();
        const result = await parser.parse(buffer, 'mcstructure');

        expect(result.success).toBe(true);
        if (result.success) {
          const data = result.value.data as Record<string, unknown>;
          expect(data).toHaveProperty('structure');
          expect(data).toHaveProperty('size');
        }
      });
    });

    describe('error handling', () => {
      it('returns error for corrupted data', async () => {
        const buffer = createInvalidBuffer();
        const result = await parser.parse(buffer, 'schematic');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('PARSE_ERROR');
        }
      });

      it('returns error for empty buffer', async () => {
        const buffer = new ArrayBuffer(0);
        const result = await parser.parse(buffer, 'schematic');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('PARSE_ERROR');
        }
      });

      it('handles format mismatch gracefully', async () => {
        // Try parsing schematic as schem
        const buffer = await createSchematicBuffer();
        const result = await parser.parse(buffer, 'schem');

        // Should still parse but may have different structure
        // The toStructure call would fail with proper validation
        if (result.success) {
          expect(result.value.format).toBe('schem');
        }
      });
    });
  });

  // ========================================
  // toStructure() Tests
  // ========================================

  describe('toStructure', () => {
    describe('schematic format conversion', () => {
      it('converts schematic NBT to Structure entity', async () => {
        const buffer = await createSchematicBuffer();
        const parseResult = await parser.parse(buffer, 'schematic');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.dimensions.x).toBe(2);
            expect(structureResult.value.dimensions.y).toBe(2);
            expect(structureResult.value.dimensions.z).toBe(2);
          }
        }
      });

      it('extracts blocks from schematic correctly', async () => {
        const buffer = await createSchematicBuffer();
        const parseResult = await parser.parse(buffer, 'schematic');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.blockCount).toBeGreaterThan(0);
          }
        }
      });
    });

    describe('schem format conversion', () => {
      it('converts schem NBT to Structure entity', async () => {
        const buffer = await createSchemBuffer();
        const parseResult = await parser.parse(buffer, 'schem');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.dimensions.x).toBe(2);
            expect(structureResult.value.dimensions.y).toBe(2);
            expect(structureResult.value.dimensions.z).toBe(2);
          }
        }
      });

      it('builds palette from schem Palette tag', async () => {
        const buffer = await createSchemBuffer();
        const parseResult = await parser.parse(buffer, 'schem');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.palette.length).toBeGreaterThan(0);
          }
        }
      });
    });

    describe('litematic format conversion', () => {
      it('converts litematic NBT to Structure entity', async () => {
        const buffer = await createLitematicBuffer();
        const parseResult = await parser.parse(buffer, 'litematic');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.name).toBeDefined();
            expect(structureResult.value.dimensions).toBeDefined();
          }
        }
      });

      it('extracts metadata from litematic', async () => {
        const buffer = await createLitematicBuffer();
        const parseResult = await parser.parse(buffer, 'litematic');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.metadata?.author).toBe('TestAuthor');
          }
        }
      });
    });

    describe('mcstructure format conversion', () => {
      it('converts mcstructure NBT to Structure entity', async () => {
        const buffer = await createMcstructureBuffer();
        const parseResult = await parser.parse(buffer, 'mcstructure');

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          const structureResult = parser.toStructure(parseResult.value);

          expect(structureResult.success).toBe(true);
          if (structureResult.success) {
            expect(structureResult.value.dimensions.x).toBe(2);
            expect(structureResult.value.dimensions.y).toBe(2);
            expect(structureResult.value.dimensions.z).toBe(2);
          }
        }
      });
    });

    describe('error handling', () => {
      it('returns error for invalid NBT data structure', () => {
        const invalidNBT: ParsedNBT = {
          format: 'schematic',
          data: { invalid: 'structure' },
          rawSize: 100,
        };

        const result = parser.toStructure(invalidNBT);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('PARSE_ERROR');
        }
      });

      it('returns error for missing required fields', () => {
        const incompleteNBT: ParsedNBT = {
          format: 'schematic',
          data: { Width: 10 }, // Missing Height, Length, Blocks, Data
          rawSize: 50,
        };

        const result = parser.toStructure(incompleteNBT);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('PARSE_ERROR');
        }
      });
    });
  });

  // ========================================
  // Integration Tests
  // ========================================

  describe('full parsing workflow', () => {
    it('parses and converts schematic end-to-end', async () => {
      const buffer = await createSchematicBuffer();

      const parseResult = await parser.parse(buffer, 'schematic');
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        const structureResult = parser.toStructure(parseResult.value);
        expect(structureResult.success).toBe(true);

        if (structureResult.success) {
          const structure = structureResult.value;
          expect(structure.name).toBeDefined();
          expect(structure.dimensions.volume).toBe(8);
        }
      }
    });

    it('parses and converts schem end-to-end', async () => {
      const buffer = await createSchemBuffer();

      const parseResult = await parser.parse(buffer, 'schem');
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        const structureResult = parser.toStructure(parseResult.value);
        expect(structureResult.success).toBe(true);

        if (structureResult.success) {
          const structure = structureResult.value;
          expect(structure.palette.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
