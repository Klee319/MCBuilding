/**
 * Structure Serializer
 *
 * Converts ParsedSchematic data back into Minecraft structure file formats.
 * Supports .schem (Sponge), .litematic (Litematica), and .mcstructure (Bedrock).
 *
 * Note: prismarine-nbt's type definitions are not fully aligned with its runtime API.
 * We construct NBT structures manually where the builder API is insufficient.
 */

import * as nbt from 'prismarine-nbt';
import { promisify } from 'util';
import { gzip as gzipCallback } from 'zlib';
import type { ParsedSchematic, ParsedPaletteEntry } from './schematic-parser.js';
import { PortError } from '../../usecase/ports/types.js';

const gzip = promisify(gzipCallback);

/** Sponge schematic dimensions are stored as shorts (max 32767) */
const MAX_SPONGE_DIMENSION = 32767;
/** Maximum total blocks to prevent memory exhaustion */
const MAX_TOTAL_BLOCKS = 512 * 512 * 512;

// NBT tag type shorthands for manual construction
const TAG = {
  byte: 'byte' as const,
  short: 'short' as const,
  int: 'int' as const,
  long: 'long' as const,
  string: 'string' as const,
  compound: 'compound' as const,
  list: 'list' as const,
  byteArray: 'byteArray' as const,
  intArray: 'intArray' as const,
  longArray: 'longArray' as const,
};

/**
 * Validate ParsedSchematic dimensions and palette integrity
 */
function validateInput(parsed: ParsedSchematic): void {
  const { dimensions, palette, blocks } = parsed;

  if (dimensions.x <= 0 || dimensions.y <= 0 || dimensions.z <= 0) {
    throw new PortError('EXPORT_FAILED', `Invalid dimensions: ${dimensions.x}x${dimensions.y}x${dimensions.z}`);
  }

  const totalBlocks = dimensions.x * dimensions.y * dimensions.z;
  if (totalBlocks > MAX_TOTAL_BLOCKS) {
    throw new PortError('EXPORT_FAILED', `Structure too large: ${totalBlocks} blocks (max ${MAX_TOTAL_BLOCKS})`);
  }

  if (palette.length === 0) {
    throw new PortError('EXPORT_FAILED', 'Palette is empty');
  }

  for (const block of blocks) {
    if (block.paletteIndex < 0 || block.paletteIndex >= palette.length) {
      throw new PortError('EXPORT_FAILED', `Invalid palette index ${block.paletteIndex} (palette size: ${palette.length})`);
    }
  }
}

/**
 * Build a block grid from ParsedSchematic blocks in XZY order
 * Index = (y * sizeZ + z) * sizeX + x
 */
function buildBlockGrid(parsed: ParsedSchematic): Int32Array {
  const { dimensions, blocks } = parsed;
  const totalBlocks = dimensions.x * dimensions.y * dimensions.z;
  const grid = new Int32Array(totalBlocks).fill(0);

  for (const block of blocks) {
    const idx = (block.y * dimensions.z + block.z) * dimensions.x + block.x;
    if (idx >= 0 && idx < totalBlocks) {
      grid[idx] = block.paletteIndex;
    }
  }

  return grid;
}

/**
 * Serialize ParsedSchematic to Sponge Schematic v2 (.schem) format
 */
export async function serializeToSponge(parsed: ParsedSchematic): Promise<Uint8Array> {
  validateInput(parsed);
  const { dimensions, palette } = parsed;

  if (dimensions.x > MAX_SPONGE_DIMENSION || dimensions.y > MAX_SPONGE_DIMENSION || dimensions.z > MAX_SPONGE_DIMENSION) {
    throw new PortError('EXPORT_FAILED', `Dimensions exceed Sponge schematic limit of ${MAX_SPONGE_DIMENSION}`);
  }

  // Build palette compound: blockState string -> index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paletteCompound: Record<string, any> = {};
  palette.forEach((entry, index) => {
    const blockState = formatBlockState(entry);
    paletteCompound[blockState] = { type: TAG.int, value: index };
  });

  // Sponge uses YZX order: index = (y * length + z) * width + x
  const totalBlocks = dimensions.x * dimensions.y * dimensions.z;
  const blockGrid = new Int32Array(totalBlocks).fill(0);

  for (const block of parsed.blocks) {
    const idx = (block.y * dimensions.z + block.z) * dimensions.x + block.x;
    if (idx >= 0 && idx < totalBlocks) {
      blockGrid[idx] = block.paletteIndex;
    }
  }

  // Encode as varints
  const varintBytes: number[] = [];
  for (let i = 0; i < totalBlocks; i++) {
    let value = blockGrid[i];
    do {
      let currentByte = value & 0x7f;
      value >>>= 7;
      if (value !== 0) {
        currentByte |= 0x80;
      }
      varintBytes.push(currentByte);
    } while (value !== 0);
  }

  // Build NBT structure manually for precise control
  const root: nbt.NBT = {
    type: TAG.compound,
    name: '',
    value: {
      Schematic: {
        type: TAG.compound,
        value: {
          Version: { type: TAG.int, value: 2 },
          DataVersion: { type: TAG.int, value: 3465 }, // Minecraft 1.20.4
          Width: { type: TAG.short, value: dimensions.x },
          Height: { type: TAG.short, value: dimensions.y },
          Length: { type: TAG.short, value: dimensions.z },
          PaletteMax: { type: TAG.int, value: palette.length },
          Palette: { type: TAG.compound, value: paletteCompound },
          BlockData: { type: TAG.byteArray, value: varintBytes },
        },
      },
    },
  };

  const uncompressed = nbt.writeUncompressed(root, 'big');
  const compressed = await gzip(uncompressed);
  return new Uint8Array(compressed);
}

/**
 * Serialize ParsedSchematic to Litematic (.litematic) format
 */
export async function serializeToLitematic(parsed: ParsedSchematic): Promise<Uint8Array> {
  validateInput(parsed);
  const { dimensions, palette } = parsed;

  // Build BlockStatePalette entries as raw NBT compound values
  const paletteEntries = palette.map((entry) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compound: Record<string, any> = {
      Name: { type: TAG.string, value: entry.name },
    };
    if (entry.properties && Object.keys(entry.properties).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {};
      for (const [key, value] of Object.entries(entry.properties)) {
        props[key] = { type: TAG.string, value };
      }
      compound['Properties'] = { type: TAG.compound, value: props };
    }
    return compound;
  });

  const blockGrid = buildBlockGrid(parsed);
  const totalBlocks = dimensions.x * dimensions.y * dimensions.z;

  const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(Math.max(palette.length, 1))));
  const packedLongs = packLongArraySpanning(blockGrid, bitsPerBlock, totalBlocks);

  // Convert to [number, number] tuples for prismarine-nbt compatibility
  const longTuples = packedLongs.map(bigintToLongTuple);

  const now = Date.now();
  const nowTuple = bigintToLongTuple(BigInt(now));

  const root: nbt.NBT = {
    type: TAG.compound,
    name: '',
    value: {
      MinecraftDataVersion: { type: TAG.int, value: 3465 },
      Version: { type: TAG.int, value: 6 },
      Metadata: {
        type: TAG.compound,
        value: {
          Name: { type: TAG.string, value: 'Exported Structure' },
          Author: { type: TAG.string, value: '' },
          Description: { type: TAG.string, value: '' },
          RegionCount: { type: TAG.int, value: 1 },
          TotalBlocks: { type: TAG.int, value: parsed.blockCount },
          TotalVolume: { type: TAG.int, value: totalBlocks },
          TimeCreated: { type: TAG.long, value: nowTuple },
          TimeModified: { type: TAG.long, value: nowTuple },
          EnclosingSize: {
            type: TAG.compound,
            value: {
              x: { type: TAG.int, value: dimensions.x },
              y: { type: TAG.int, value: dimensions.y },
              z: { type: TAG.int, value: dimensions.z },
            },
          },
        },
      },
      Regions: {
        type: TAG.compound,
        value: {
          Main: {
            type: TAG.compound,
            value: {
              Position: {
                type: TAG.compound,
                value: {
                  x: { type: TAG.int, value: 0 },
                  y: { type: TAG.int, value: 0 },
                  z: { type: TAG.int, value: 0 },
                },
              },
              Size: {
                type: TAG.compound,
                value: {
                  x: { type: TAG.int, value: dimensions.x },
                  y: { type: TAG.int, value: dimensions.y },
                  z: { type: TAG.int, value: dimensions.z },
                },
              },
              BlockStatePalette: {
                type: TAG.list,
                value: { type: TAG.compound, value: paletteEntries },
              },
              BlockStates: {
                type: TAG.longArray,
                value: longTuples,
              },
              Entities: { type: TAG.list, value: { type: TAG.compound, value: [] } },
              TileEntities: { type: TAG.list, value: { type: TAG.compound, value: [] } },
              PendingBlockTicks: { type: TAG.list, value: { type: TAG.compound, value: [] } },
              PendingFluidTicks: { type: TAG.list, value: { type: TAG.compound, value: [] } },
            },
          },
        },
      },
    },
  };

  const uncompressed = nbt.writeUncompressed(root, 'big');
  const compressed = await gzip(uncompressed);
  return new Uint8Array(compressed);
}

/**
 * Serialize ParsedSchematic to Bedrock .mcstructure format
 */
export async function serializeToMcstructure(parsed: ParsedSchematic): Promise<Uint8Array> {
  validateInput(parsed);
  const { dimensions, palette } = parsed;

  // Build block_palette entries as raw NBT compound values
  const paletteEntries = palette.map((entry) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const states: Record<string, any> = {};
    if (entry.properties) {
      for (const [key, value] of Object.entries(entry.properties)) {
        if (value === 'true' || value === 'false') {
          states[key] = { type: TAG.byte, value: value === 'true' ? 1 : 0 };
        } else if (/^\d+$/.test(value)) {
          states[key] = { type: TAG.int, value: parseInt(value, 10) };
        } else {
          states[key] = { type: TAG.string, value };
        }
      }
    }
    return {
      name: { type: TAG.string, value: entry.name },
      version: { type: TAG.int, value: 17959425 }, // Bedrock 1.20.40
      states: { type: TAG.compound, value: states },
    };
  });

  const blockGrid = buildBlockGrid(parsed);
  const totalBlocks = dimensions.x * dimensions.y * dimensions.z;
  const layer0 = Array.from(blockGrid);
  const layer1 = new Array<number>(totalBlocks).fill(-1);

  const root: nbt.NBT = {
    type: TAG.compound,
    name: '',
    value: {
      format_version: { type: TAG.int, value: 1 },
      size: {
        type: TAG.list,
        value: { type: TAG.int, value: [dimensions.x, dimensions.y, dimensions.z] },
      },
      structure: {
        type: TAG.compound,
        value: {
          block_indices: {
            type: TAG.list,
            value: { type: TAG.intArray, value: [layer0, layer1] },
          },
          palette: {
            type: TAG.compound,
            value: {
              default: {
                type: TAG.compound,
                value: {
                  block_palette: {
                    type: TAG.list,
                    value: { type: TAG.compound, value: paletteEntries },
                  },
                  block_position_data: { type: TAG.compound, value: {} },
                },
              },
            },
          },
          entities: { type: TAG.list, value: { type: TAG.compound, value: [] } },
        },
      },
      structure_world_origin: {
        type: TAG.list,
        value: { type: TAG.int, value: [0, 0, 0] },
      },
    },
  };

  // Bedrock uses little-endian NBT without compression
  const buffer = nbt.writeUncompressed(root, 'little');
  return new Uint8Array(buffer);
}

/**
 * Format a palette entry as a block state string
 * e.g., "minecraft:oak_stairs[facing=north,half=bottom]"
 */
function formatBlockState(entry: ParsedPaletteEntry): string {
  if (!entry.properties || Object.keys(entry.properties).length === 0) {
    return entry.name;
  }
  const props = Object.entries(entry.properties)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${entry.name}[${props}]`;
}

/**
 * Convert a BigInt to a [high, low] tuple for prismarine-nbt Long type.
 * Handles conversion from unsigned to signed representation.
 */
function bigintToLongTuple(value: bigint): [number, number] {
  // Convert to signed 64-bit
  const signed = BigInt.asIntN(64, value);
  const high = Number(signed >> 32n);
  // Use asIntN(32) to ensure low is a signed 32-bit integer
  // (writeInt32BE/LE requires values in [-2^31, 2^31-1])
  const low = Number(BigInt.asIntN(32, signed));
  return [high, low];
}

/**
 * Pack block indices into a long array using spanning packing (Litematic format).
 * Entries can span across two consecutive longs.
 * This matches the parser's unpacking logic (bitPosition = blockIdx * bitsPerEntry).
 */
function packLongArraySpanning(
  indices: Int32Array,
  bitsPerBlock: number,
  totalBlocks: number
): bigint[] {
  const mask = (1n << BigInt(bitsPerBlock)) - 1n;
  const totalBits = totalBlocks * bitsPerBlock;
  const longCount = Math.ceil(totalBits / 64);
  const longs = new Array<bigint>(longCount).fill(0n);

  for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
    const value = BigInt(indices[blockIdx]) & mask;
    const bitPosition = blockIdx * bitsPerBlock;
    const longIndex = Math.floor(bitPosition / 64);
    const bitOffset = bitPosition % 64;

    // Write lower bits into current long
    longs[longIndex] |= value << BigInt(bitOffset);

    // If entry spans into the next long, write upper bits there
    if (bitOffset + bitsPerBlock > 64 && longIndex + 1 < longCount) {
      const bitsInCurrent = 64 - bitOffset;
      longs[longIndex + 1] |= value >> BigInt(bitsInCurrent);
    }
  }

  return longs;
}
