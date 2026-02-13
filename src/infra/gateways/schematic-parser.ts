/**
 * Schematic Parser
 *
 * Parses Minecraft structure files (.schem, .schematic, .litematic, .mcstructure)
 * to extract block data and metadata.
 */

import * as nbt from 'prismarine-nbt';
import { promisify } from 'util';
import { gunzip as gunzipCallback } from 'zlib';

const gunzip = promisify(gunzipCallback);

/** Air block names in Minecraft */
const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);

function isAirBlock(name: string): boolean {
  return AIR_BLOCKS.has(name);
}

/**
 * Extract the value array from a parsed NBT list tag.
 * prismarine-nbt wraps list values as { type, value } objects.
 */
function extractListValues(listTag: nbt.NBT | undefined): unknown[] | undefined {
  if (!listTag) return undefined;
  const v = listTag.value;
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object' && 'value' in v) {
    const inner = (v as Record<string, unknown>).value;
    if (Array.isArray(inner)) return inner;
  }
  return undefined;
}

export interface ParsedBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly paletteIndex: number;
}

export interface ParsedPaletteEntry {
  readonly name: string;
  readonly properties?: Record<string, string>;
}

export interface ParsedSchematic {
  readonly dimensions: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly palette: readonly ParsedPaletteEntry[];
  readonly blocks: readonly ParsedBlock[];
  readonly blockCount: number;
}

/**
 * Parse a Sponge Schematic (.schem) file
 */
export async function parseSpongeSchematic(data: Uint8Array): Promise<ParsedSchematic> {
  // Decompress if gzipped
  let decompressed: Buffer;
  try {
    // Check for gzip magic bytes
    if (data[0] === 0x1f && data[1] === 0x8b) {
      decompressed = await gunzip(Buffer.from(data));
    } else {
      decompressed = Buffer.from(data);
    }
  } catch {
    // Try without decompression
    decompressed = Buffer.from(data);
  }

  // Parse NBT
  const { parsed } = await nbt.parse(decompressed);
  const root = parsed.value as Record<string, nbt.NBT>;

  // Get the schematic data (might be wrapped in a "Schematic" compound)
  const schematic = (root['Schematic']?.value as Record<string, nbt.NBT>) ?? root;

  // Extract dimensions
  const width = (schematic['Width']?.value as unknown as number) ?? 0;
  const height = (schematic['Height']?.value as unknown as number) ?? 0;
  const length = (schematic['Length']?.value as unknown as number) ?? 0;

  // Extract palette
  const paletteData = schematic['Palette']?.value as Record<string, nbt.NBT> | undefined;
  const palette: ParsedPaletteEntry[] = [];
  const paletteMap = new Map<number, number>(); // original index -> our index

  if (paletteData) {
    // Sponge format: palette maps block state string -> index
    const entries = Object.entries(paletteData);

    entries.forEach(([blockState, indexTag]) => {
      const originalIndex = indexTag.value as unknown as number;
      const ourIndex = palette.length;
      paletteMap.set(originalIndex, ourIndex);

      // Parse block state string like "minecraft:stone" or "minecraft:oak_stairs[facing=north,half=bottom]"
      const match = blockState.match(/^([^[]+)(?:\[(.+)\])?$/);
      if (match) {
        const name = match[1];
        const propsStr = match[2];
        const properties: Record<string, string> = {};

        if (propsStr) {
          propsStr.split(',').forEach((prop) => {
            const [key, value] = prop.split('=');
            if (key && value) {
              properties[key] = value;
            }
          });
        }

        const hasProperties = Object.keys(properties).length > 0;
        if (hasProperties) {
          palette.push({ name, properties });
        } else {
          palette.push({ name });
        }
      } else {
        palette.push({ name: blockState });
      }
    });
  }

  // If no palette, create a default one
  if (palette.length === 0) {
    palette.push({ name: 'minecraft:air' });
    palette.push({ name: 'minecraft:stone' });
  }

  // Extract block data
  const blockDataRaw = schematic['BlockData']?.value as unknown as number[] | Int8Array | undefined;
  const blocks: ParsedBlock[] = [];

  if (blockDataRaw && width > 0 && height > 0 && length > 0) {
    // Convert to regular array if needed
    const blockData = Array.isArray(blockDataRaw) ? blockDataRaw : Array.from(blockDataRaw);

    // Sponge v2/v3 uses varint encoding for block data
    let index = 0;
    let blockIndex = 0;

    while (index < blockData.length && blockIndex < width * height * length) {
      // Read varint
      let value = 0;
      let varIntLength = 0;

      while (true) {
        const byte = blockData[index] & 0xff;
        index++;
        value |= (byte & 0x7f) << (varIntLength * 7);
        varIntLength++;

        if ((byte & 0x80) === 0) break;
        if (varIntLength > 5) break; // Prevent infinite loop
      }

      // Calculate position from index (Y, Z, X order for Sponge format)
      const y = Math.floor(blockIndex / (width * length));
      const z = Math.floor((blockIndex % (width * length)) / width);
      const x = blockIndex % width;

      // Map to our palette index
      const mappedIndex = paletteMap.get(value);
      const paletteIndex = mappedIndex ?? value;

      // Skip air blocks for rendering efficiency
      const blockName = palette[paletteIndex]?.name ?? '';

      if (!isAirBlock(blockName)) {
        blocks.push({ x, y, z, paletteIndex });
      }

      blockIndex++;
    }
  }

  return {
    dimensions: { x: width, y: height, z: length },
    palette,
    blocks,
    blockCount: blocks.length,
  };
}

/**
 * Parse a legacy Schematic (.schematic) file
 */
export async function parseLegacySchematic(data: Uint8Array): Promise<ParsedSchematic> {
  // Decompress if gzipped
  let decompressed: Buffer;
  try {
    if (data[0] === 0x1f && data[1] === 0x8b) {
      decompressed = await gunzip(Buffer.from(data));
    } else {
      decompressed = Buffer.from(data);
    }
  } catch {
    decompressed = Buffer.from(data);
  }

  const { parsed } = await nbt.parse(decompressed);
  const root = parsed.value as Record<string, nbt.NBT>;
  const schematic = (root['Schematic']?.value as Record<string, nbt.NBT>) ?? root;

  const width = (schematic['Width']?.value as unknown as number) ?? 0;
  const height = (schematic['Height']?.value as unknown as number) ?? 0;
  const length = (schematic['Length']?.value as unknown as number) ?? 0;

  // Legacy format uses Blocks (byte array of block IDs) and Data (byte array of metadata)
  const blocksRaw = schematic['Blocks']?.value as unknown as number[] | Int8Array | undefined;
  // Note: Data array contains metadata but is not currently used
  const _dataRaw = schematic['Data']?.value as unknown as number[] | Int8Array | undefined;
  void _dataRaw; // Suppress unused variable warning

  // Build palette from unique block IDs
  const blockIdSet = new Set<number>();
  if (blocksRaw) {
    const blocks = Array.isArray(blocksRaw) ? blocksRaw : Array.from(blocksRaw);
    blocks.forEach((id) => blockIdSet.add(id & 0xff));
  }

  // Map legacy block IDs to names
  const legacyBlockNames: Record<number, string> = {
    0: 'minecraft:air',
    1: 'minecraft:stone',
    2: 'minecraft:grass_block',
    3: 'minecraft:dirt',
    4: 'minecraft:cobblestone',
    5: 'minecraft:oak_planks',
    6: 'minecraft:oak_sapling',
    7: 'minecraft:bedrock',
    8: 'minecraft:water',
    9: 'minecraft:water',
    10: 'minecraft:lava',
    11: 'minecraft:lava',
    12: 'minecraft:sand',
    13: 'minecraft:gravel',
    14: 'minecraft:gold_ore',
    15: 'minecraft:iron_ore',
    16: 'minecraft:coal_ore',
    17: 'minecraft:oak_log',
    18: 'minecraft:oak_leaves',
    19: 'minecraft:sponge',
    20: 'minecraft:glass',
    24: 'minecraft:sandstone',
    35: 'minecraft:white_wool',
    41: 'minecraft:gold_block',
    42: 'minecraft:iron_block',
    43: 'minecraft:stone_slab',
    44: 'minecraft:stone_slab',
    45: 'minecraft:bricks',
    46: 'minecraft:tnt',
    47: 'minecraft:bookshelf',
    48: 'minecraft:mossy_cobblestone',
    49: 'minecraft:obsidian',
    50: 'minecraft:torch',
    53: 'minecraft:oak_stairs',
    54: 'minecraft:chest',
    56: 'minecraft:diamond_ore',
    57: 'minecraft:diamond_block',
    58: 'minecraft:crafting_table',
    61: 'minecraft:furnace',
    64: 'minecraft:oak_door',
    65: 'minecraft:ladder',
    66: 'minecraft:rail',
    67: 'minecraft:cobblestone_stairs',
    79: 'minecraft:ice',
    80: 'minecraft:snow_block',
    85: 'minecraft:oak_fence',
    86: 'minecraft:pumpkin',
    87: 'minecraft:netherrack',
    89: 'minecraft:glowstone',
    91: 'minecraft:jack_o_lantern',
    98: 'minecraft:stone_bricks',
    112: 'minecraft:nether_bricks',
    121: 'minecraft:end_stone',
    133: 'minecraft:emerald_block',
    155: 'minecraft:quartz_block',
    159: 'minecraft:white_terracotta',
    162: 'minecraft:acacia_log',
    168: 'minecraft:prismarine',
    169: 'minecraft:sea_lantern',
    179: 'minecraft:red_sandstone',
    201: 'minecraft:purpur_block',
    206: 'minecraft:end_stone_bricks',
  };

  const palette: ParsedPaletteEntry[] = [];
  const idToPaletteIndex = new Map<number, number>();

  Array.from(blockIdSet).sort((a, b) => a - b).forEach((id) => {
    const name = legacyBlockNames[id] ?? `minecraft:unknown_${id}`;
    idToPaletteIndex.set(id, palette.length);
    palette.push({ name });
  });

  // Extract blocks
  const blocks: ParsedBlock[] = [];
  if (blocksRaw) {
    const blockArray = Array.isArray(blocksRaw) ? blocksRaw : Array.from(blocksRaw);

    for (let i = 0; i < blockArray.length && i < width * height * length; i++) {
      const blockId = blockArray[i] & 0xff;

      // Calculate position (Y, Z, X order)
      const y = Math.floor(i / (width * length));
      const z = Math.floor((i % (width * length)) / width);
      const x = i % width;

      const paletteIndex = idToPaletteIndex.get(blockId) ?? 0;
      const blockName = palette[paletteIndex]?.name ?? '';

      if (!isAirBlock(blockName)) {
        blocks.push({ x, y, z, paletteIndex });
      }
    }
  }

  return {
    dimensions: { x: width, y: height, z: length },
    palette,
    blocks,
    blockCount: blocks.length,
  };
}

/**
 * Parse a Litematic (.litematic) file
 *
 * Litematica uses a custom NBT structure with regions containing
 * packed block state arrays and palettes per-region.
 */
export async function parseLitematic(data: Uint8Array): Promise<ParsedSchematic> {
  let decompressed: Buffer;
  try {
    if (data[0] === 0x1f && data[1] === 0x8b) {
      decompressed = await gunzip(Buffer.from(data));
    } else {
      decompressed = Buffer.from(data);
    }
  } catch {
    decompressed = Buffer.from(data);
  }

  const { parsed } = await nbt.parse(decompressed);
  const root = parsed.value as Record<string, nbt.NBT>;

  // Litematic structure:
  // root.Regions: compound of named regions
  // Each region: Position, Size, BlockStatePalette, BlockStates (packed long array)
  const regionsTag = root['Regions']?.value as Record<string, nbt.NBT> | undefined;

  if (!regionsTag) {
    throw new Error('Invalid litematic: missing Regions compound');
  }

  // Merge all regions into a single parsed result
  const globalPalette: ParsedPaletteEntry[] = [];
  const globalPaletteMap = new Map<string, number>(); // blockstate string -> global index
  const blocks: ParsedBlock[] = [];

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const [, regionTag] of Object.entries(regionsTag)) {
    const region = regionTag.value as Record<string, nbt.NBT>;

    // Get region position and size
    const posTag = region['Position']?.value as Record<string, nbt.NBT> | undefined;
    const sizeTag = region['Size']?.value as Record<string, nbt.NBT> | undefined;

    const regionX = (posTag?.['x']?.value as unknown as number) ?? 0;
    const regionY = (posTag?.['y']?.value as unknown as number) ?? 0;
    const regionZ = (posTag?.['z']?.value as unknown as number) ?? 0;

    const sizeX = Math.abs((sizeTag?.['x']?.value as unknown as number) ?? 0);
    const sizeY = Math.abs((sizeTag?.['y']?.value as unknown as number) ?? 0);
    const sizeZ = Math.abs((sizeTag?.['z']?.value as unknown as number) ?? 0);

    if (sizeX === 0 || sizeY === 0 || sizeZ === 0) continue;

    // Update bounding box
    minX = Math.min(minX, regionX);
    minY = Math.min(minY, regionY);
    minZ = Math.min(minZ, regionZ);
    maxX = Math.max(maxX, regionX + sizeX);
    maxY = Math.max(maxY, regionY + sizeY);
    maxZ = Math.max(maxZ, regionZ + sizeZ);

    // Parse region palette (BlockStatePalette: list of compounds)
    const paletteValues = extractListValues(region['BlockStatePalette']);
    const regionPalette: ParsedPaletteEntry[] = [];
    const regionToGlobalIndex = new Map<number, number>();

    if (paletteValues && paletteValues.length > 0) {
      for (let i = 0; i < paletteValues.length; i++) {
        const rawEntry = paletteValues[i] as { value?: Record<string, nbt.NBT> };
        const entryObj = (rawEntry.value ?? rawEntry) as unknown as Record<string, nbt.NBT>;

        const nameTag = entryObj['Name'];
        const name = (nameTag?.value as unknown as string) ?? 'minecraft:air';

        // Parse properties
        const propsTag = entryObj['Properties']?.value as Record<string, nbt.NBT> | undefined;
        const properties: Record<string, string> = {};
        if (propsTag) {
          for (const [key, val] of Object.entries(propsTag)) {
            properties[key] = String(val.value ?? val);
          }
        }

        const stateKey = Object.keys(properties).length > 0
          ? `${name}[${Object.entries(properties).map(([k, v]) => `${k}=${v}`).join(',')}]`
          : name;

        if (!globalPaletteMap.has(stateKey)) {
          globalPaletteMap.set(stateKey, globalPalette.length);
          const hasProps = Object.keys(properties).length > 0;
          globalPalette.push(hasProps ? { name, properties } : { name });
        }

        regionToGlobalIndex.set(i, globalPaletteMap.get(stateKey)!);
        regionPalette.push({ name, properties });
      }
    }

    // Parse packed block states (BlockStates: long array)
    const blockStatesTag = region['BlockStates'];
    const blockStatesRaw = blockStatesTag?.value as unknown as BigInt64Array | number[] | undefined;

    if (!blockStatesRaw || regionPalette.length === 0) continue;

    // Convert to BigInt64Array if needed
    let longArray: bigint[];
    if (blockStatesRaw instanceof BigInt64Array) {
      longArray = Array.from(blockStatesRaw);
    } else if (Array.isArray(blockStatesRaw)) {
      longArray = (blockStatesRaw as unknown as bigint[]).map((v) => BigInt(v));
    } else {
      continue;
    }

    // Calculate bits per entry
    const totalBlocks = sizeX * sizeY * sizeZ;
    const bitsPerEntry = Math.max(2, Math.ceil(Math.log2(regionPalette.length)));
    const mask = (1n << BigInt(bitsPerEntry)) - 1n;

    // Extract block indices from packed long array
    for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
      const bitPosition = blockIdx * bitsPerEntry;
      const longIndex = Math.floor(bitPosition / 64);
      const bitOffset = bitPosition % 64;

      if (longIndex >= longArray.length) break;

      let value: bigint;
      const longVal = BigInt.asUintN(64, longArray[longIndex]);

      if (bitOffset + bitsPerEntry <= 64) {
        value = (longVal >> BigInt(bitOffset)) & mask;
      } else {
        // Value spans two longs
        const nextLong = longIndex + 1 < longArray.length
          ? BigInt.asUintN(64, longArray[longIndex + 1])
          : 0n;
        const lowBits = longVal >> BigInt(bitOffset);
        const highBits = nextLong << BigInt(64 - bitOffset);
        value = (lowBits | highBits) & mask;
      }

      const regionPaletteIdx = Number(value);
      const globalIdx = regionToGlobalIndex.get(regionPaletteIdx);

      if (globalIdx === undefined) continue;

      const blockName = globalPalette[globalIdx]?.name ?? '';
      if (isAirBlock(blockName)) continue;

      // Litematic uses XZY order within a region
      const y = Math.floor(blockIdx / (sizeX * sizeZ));
      const z = Math.floor((blockIdx % (sizeX * sizeZ)) / sizeX);
      const x = blockIdx % sizeX;

      blocks.push({
        x: regionX + x,
        y: regionY + y,
        z: regionZ + z,
        paletteIndex: globalIdx,
      });
    }
  }

  // Normalize coordinates to start from 0
  const offsetX = isFinite(minX) ? minX : 0;
  const offsetY = isFinite(minY) ? minY : 0;
  const offsetZ = isFinite(minZ) ? minZ : 0;

  const normalizedBlocks = blocks.map((b) => ({
    x: b.x - offsetX,
    y: b.y - offsetY,
    z: b.z - offsetZ,
    paletteIndex: b.paletteIndex,
  }));

  const dimX = isFinite(maxX) && isFinite(minX) ? maxX - minX : 0;
  const dimY = isFinite(maxY) && isFinite(minY) ? maxY - minY : 0;
  const dimZ = isFinite(maxZ) && isFinite(minZ) ? maxZ - minZ : 0;

  return {
    dimensions: { x: dimX, y: dimY, z: dimZ },
    palette: globalPalette,
    blocks: normalizedBlocks,
    blockCount: normalizedBlocks.length,
  };
}

/**
 * Parse a Bedrock structure (.mcstructure) file
 *
 * Bedrock uses little-endian NBT with a different structure:
 * - structure.block_indices: [layer0[], layer1[]] (int arrays of palette indices)
 * - structure.palette.default.block_palette: list of {name, states, version}
 * - size: [x, y, z]
 */
export async function parseMcstructure(data: Uint8Array): Promise<ParsedSchematic> {
  // mcstructure files are NOT gzipped, they use Bedrock's little-endian NBT
  let decompressed: Buffer;
  try {
    if (data[0] === 0x1f && data[1] === 0x8b) {
      decompressed = await gunzip(Buffer.from(data));
    } else {
      decompressed = Buffer.from(data);
    }
  } catch {
    decompressed = Buffer.from(data);
  }

  // Parse NBT (prismarine-nbt auto-detects endianness)
  const { parsed } = await nbt.parse(decompressed);
  const root = parsed.value as Record<string, nbt.NBT>;

  // Extract size [x, y, z] (list of ints, wrapped as { type, value })
  const sizeValues = extractListValues(root['size']) as number[] | undefined;
  const sizeX = sizeValues ? (sizeValues[0] ?? 0) : 0;
  const sizeY = sizeValues ? (sizeValues[1] ?? 0) : 0;
  const sizeZ = sizeValues ? (sizeValues[2] ?? 0) : 0;

  // Navigate to structure compound
  const structure = root['structure']?.value as Record<string, nbt.NBT> | undefined;
  if (!structure) {
    throw new Error('Invalid mcstructure: missing structure compound');
  }

  // Get block_indices (two layers: primary and waterlogged)
  const blockIndicesValues = extractListValues(structure['block_indices']);
  let layer0Indices: number[] = [];

  if (blockIndicesValues && blockIndicesValues.length > 0) {
    // block_indices is a list of two int arrays
    const firstLayer = blockIndicesValues[0];
    if (firstLayer) {
      const rawValues = Array.isArray(firstLayer) ? firstLayer : (firstLayer as { value?: unknown }).value ?? firstLayer;
      layer0Indices = Array.isArray(rawValues) ? rawValues as number[] : Array.from(rawValues as Int32Array);
    }
  }

  // Get palette from structure.palette.default.block_palette
  const paletteCompound = structure['palette']?.value as Record<string, nbt.NBT> | undefined;
  const defaultPalette = paletteCompound?.['default']?.value as Record<string, nbt.NBT> | undefined;
  const blockPaletteValues = extractListValues(defaultPalette?.['block_palette']);

  const palette: ParsedPaletteEntry[] = [];

  if (blockPaletteValues && blockPaletteValues.length > 0) {
    for (const rawEntry of blockPaletteValues) {
      const entryObj = ((rawEntry as { value?: unknown }).value ?? rawEntry) as Record<string, nbt.NBT>;
      const nameTag = entryObj['name'];
      const name = (nameTag?.value as unknown as string) ?? 'minecraft:air';

      // Bedrock uses "states" compound instead of properties
      const statesTag = entryObj['states']?.value as Record<string, nbt.NBT> | undefined;
      const properties: Record<string, string> = {};
      if (statesTag) {
        for (const [key, val] of Object.entries(statesTag)) {
          properties[key] = String(val.value ?? val);
        }
      }

      const hasProps = Object.keys(properties).length > 0;
      palette.push(hasProps ? { name, properties } : { name });
    }
  }

  // If no palette was found, create a default
  if (palette.length === 0) {
    palette.push({ name: 'minecraft:air' });
  }

  // Build block array from indices
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < layer0Indices.length && i < sizeX * sizeY * sizeZ; i++) {
    const paletteIndex = layer0Indices[i];

    // -1 means "structure void" in Bedrock
    if (paletteIndex < 0 || paletteIndex >= palette.length) continue;

    const blockName = palette[paletteIndex]?.name ?? '';
    if (isAirBlock(blockName)) continue;

    // Bedrock mcstructure uses XZY order
    const y = Math.floor(i / (sizeX * sizeZ));
    const z = Math.floor((i % (sizeX * sizeZ)) / sizeX);
    const x = i % sizeX;

    blocks.push({ x, y, z, paletteIndex });
  }

  return {
    dimensions: { x: sizeX, y: sizeY, z: sizeZ },
    palette,
    blocks,
    blockCount: blocks.length,
  };
}

/**
 * Parse any supported schematic format
 */
export async function parseSchematic(data: Uint8Array, format: string): Promise<ParsedSchematic> {
  switch (format.toLowerCase()) {
    case 'schem':
    case 'schematic':
      // Try Sponge format first, fall back to legacy
      try {
        return await parseSpongeSchematic(data);
      } catch {
        return await parseLegacySchematic(data);
      }
    case 'litematic':
      return await parseLitematic(data);
    case 'mcstructure':
      return await parseMcstructure(data);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
