/**
 * NBTParserAdapter
 *
 * Implementation of NBTParserPort using prismarine-nbt library.
 * Supports parsing schematic, schem, litematic, and mcstructure formats.
 *
 * @example
 * const parser = new NBTParserAdapter();
 * const result = await parser.parse(buffer, 'schematic');
 * if (result.success) {
 *   const structure = parser.toStructure(result.value);
 * }
 */

import * as nbt from 'prismarine-nbt';
import type {
  NBTParserPort,
  ParsedNBT,
  StructureFormat,
  Result,
} from '../../usecase/ports/renderer/nbt-parser-port.js';
import { Structure } from '../../domain/renderer/structure.js';
import { Position } from '../../domain/renderer/position.js';
import { BlockState } from '../../domain/renderer/block-state.js';
import { Block } from '../../domain/renderer/block.js';
import { Dimensions } from '../../domain/value-objects/dimensions.js';
import { PortError } from '../../usecase/ports/types.js';

// ========================================
// Helper Types
// ========================================

interface NBTCompound {
  type: 'compound';
  value: Record<string, NBTValue>;
}

interface NBTValue {
  type: string;
  value: unknown;
}

// ========================================
// Result Helpers
// ========================================

function ok<T>(value: T): Result<T, PortError> {
  return { success: true, value };
}

function err<T>(code: PortError['code'], message: string): Result<T, PortError> {
  return { success: false, error: new PortError(code, message) };
}

/**
 * NBTParserAdapter
 *
 * Parses NBT data from various Minecraft structure formats.
 */
export class NBTParserAdapter implements NBTParserPort {
  /**
   * Parses raw NBT data from an ArrayBuffer
   *
   * @param data - Raw file data as ArrayBuffer
   * @param format - Structure file format
   * @returns Parsed NBT data or error
   */
  async parse(
    data: ArrayBuffer,
    format: StructureFormat
  ): Promise<Result<ParsedNBT, PortError>> {
    try {
      if (data.byteLength === 0) {
        return err('PARSE_ERROR', 'Cannot parse empty buffer');
      }

      const buffer = Buffer.from(data);

      // Bedrock mcstructure uses little-endian uncompressed NBT
      const parseOptions = format === 'mcstructure' ? 'littleVarint' : undefined;

      const { parsed } = await nbt.parse(buffer, parseOptions as nbt.NBTFormat);

      // Extract the root compound value
      const rootData = this.extractRootData(parsed);

      return ok({
        format,
        data: rootData,
        rawSize: data.byteLength,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('PARSE_ERROR', `Failed to parse NBT: ${message}`);
    }
  }

  /**
   * Converts parsed NBT data to a Structure entity
   *
   * @param nbtData - Parsed NBT data
   * @returns Structure entity or error
   */
  toStructure(nbtData: ParsedNBT): Result<Structure, PortError> {
    try {
      switch (nbtData.format) {
        case 'schematic':
          return this.fromSchematic(nbtData.data);
        case 'schem':
          return this.fromSpongeSchematic(nbtData.data);
        case 'litematic':
          return this.fromLitematic(nbtData.data);
        case 'mcstructure':
          return this.fromBedrock(nbtData.data);
        default:
          return err('PARSE_ERROR', `Unknown format: ${nbtData.format}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('PARSE_ERROR', `Failed to convert NBT to Structure: ${message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Extracts root data from NBT parsed result
   */
  private extractRootData(parsed: nbt.NBT): Readonly<Record<string, unknown>> {
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      const compound = parsed as NBTCompound;
      return this.nbtToPlainObject(compound.value);
    }
    return parsed as Readonly<Record<string, unknown>>;
  }

  /**
   * Converts NBT compound to plain object
   */
  private nbtToPlainObject(
    compound: Record<string, NBTValue>
  ): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const [key, nbtValue] of Object.entries(compound)) {
      result[key] = this.extractNBTValue(nbtValue);
    }

    return Object.freeze(result);
  }

  /**
   * Extracts value from NBT tag
   */
  private extractNBTValue(nbtValue: NBTValue): unknown {
    if (!nbtValue || typeof nbtValue !== 'object') {
      return nbtValue;
    }

    const { type, value } = nbtValue;

    switch (type) {
      case 'compound':
        return this.nbtToPlainObject(value as Record<string, NBTValue>);
      case 'list':
        return this.extractListValue(value);
      case 'byteArray':
      case 'intArray':
      case 'longArray':
        return value;
      default:
        return value;
    }
  }

  /**
   * Extracts list value from NBT
   */
  private extractListValue(value: unknown): unknown[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const listObj = value as { type?: string; value?: unknown[] };
    if (Array.isArray(listObj.value)) {
      return listObj.value.map((item) => {
        if (item && typeof item === 'object' && 'type' in item && 'value' in item) {
          return this.extractNBTValue(item as NBTValue);
        }
        return item;
      });
    }

    return [];
  }

  // ========================================
  // Format-Specific Converters
  // ========================================

  /**
   * Converts MCEdit Classic schematic format
   */
  private fromSchematic(
    data: Readonly<Record<string, unknown>>
  ): Result<Structure, PortError> {
    const width = this.getNumber(data, 'Width');
    const height = this.getNumber(data, 'Height');
    const length = this.getNumber(data, 'Length');
    const blocksData = data['Blocks'] as Buffer | number[] | undefined;
    const blockDataArray = data['Data'] as Buffer | number[] | undefined;

    if (
      width === undefined ||
      height === undefined ||
      length === undefined ||
      !blocksData
    ) {
      return err(
        'PARSE_ERROR',
        'Missing required fields: Width, Height, Length, or Blocks'
      );
    }

    const dimensions = Dimensions.create(width, height, length);
    const blocks = new Map<string, Block>();
    const paletteSet = new Set<string>();

    // Convert block IDs to blocks
    const blockIds = Array.from(blocksData);
    const blockMetadata = blockDataArray ? Array.from(blockDataArray) : [];

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const index = (y * length + z) * width + x;
          const blockId = blockIds[index];
          const metadata = blockMetadata[index] ?? 0;

          if (blockId !== 0) {
            // 0 = air
            const blockName = this.legacyIdToBlockName(blockId, metadata);
            const blockState = BlockState.create(blockName);
            const position = Position.create(x, y, z);
            const block = Block.create(position, blockState);

            blocks.set(position.toKey(), block);
            paletteSet.add(blockName);
          }
        }
      }
    }

    const palette = Array.from(paletteSet).map((name) => BlockState.create(name));

    return ok(Structure.create('Schematic', dimensions, palette, blocks));
  }

  /**
   * Converts Sponge Schematic format (v2/v3)
   */
  private fromSpongeSchematic(
    data: Readonly<Record<string, unknown>>
  ): Result<Structure, PortError> {
    const width = this.getNumber(data, 'Width');
    const height = this.getNumber(data, 'Height');
    const length = this.getNumber(data, 'Length');
    const paletteData = data['Palette'] as Record<string, unknown> | undefined;
    const blockData = data['BlockData'] as Buffer | number[] | undefined;

    if (
      width === undefined ||
      height === undefined ||
      length === undefined ||
      !paletteData ||
      !blockData
    ) {
      return err(
        'PARSE_ERROR',
        'Missing required fields: Width, Height, Length, Palette, or BlockData'
      );
    }

    const dimensions = Dimensions.create(width, height, length);

    // Build palette mapping (block state string -> index)
    const paletteMap = new Map<number, BlockState>();
    for (const [blockStateStr, indexValue] of Object.entries(paletteData)) {
      const index =
        typeof indexValue === 'number'
          ? indexValue
          : (indexValue as { value?: number })?.value ?? 0;
      paletteMap.set(index, BlockState.fromString(blockStateStr));
    }

    const palette = Array.from(paletteMap.values());
    const blocks = new Map<string, Block>();

    // Decode varint block data
    const blockIndices = this.decodeVarintArray(blockData, width * height * length);

    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const index = (y * length + z) * width + x;
          const paletteIndex = blockIndices[index];
          const blockState = paletteMap.get(paletteIndex);

          if (blockState && !blockState.isAir()) {
            const position = Position.create(x, y, z);
            const block = Block.create(position, blockState);
            blocks.set(position.toKey(), block);
          }
        }
      }
    }

    return ok(Structure.create('Sponge Schematic', dimensions, palette, blocks));
  }

  /**
   * Converts Litematica format
   */
  private fromLitematic(
    data: Readonly<Record<string, unknown>>
  ): Result<Structure, PortError> {
    const metadata = data['Metadata'] as Record<string, unknown> | undefined;
    const regions = data['Regions'] as Record<string, unknown> | undefined;

    if (!metadata || !regions) {
      return err('PARSE_ERROR', 'Missing required fields: Metadata or Regions');
    }

    const enclosingSize = metadata['EnclosingSize'] as
      | Record<string, unknown>
      | undefined;
    const name = (metadata['Name'] as string) ?? 'Litematic';
    const author = metadata['Author'] as string | undefined;

    if (!enclosingSize) {
      return err('PARSE_ERROR', 'Missing EnclosingSize in Metadata');
    }

    const width = this.getNumber(enclosingSize, 'x') ?? 1;
    const height = this.getNumber(enclosingSize, 'y') ?? 1;
    const length = this.getNumber(enclosingSize, 'z') ?? 1;

    const dimensions = Dimensions.create(
      Math.abs(width),
      Math.abs(height),
      Math.abs(length)
    );

    const blocks = new Map<string, Block>();
    const paletteSet = new Set<string>();

    // Process each region
    for (const [, regionData] of Object.entries(regions)) {
      const region = regionData as Record<string, unknown>;
      this.processLitematicRegion(region, blocks, paletteSet);
    }

    const palette = Array.from(paletteSet).map((name) => BlockState.fromString(name));

    // Only include metadata if author is defined
    const structureMetadata = author !== undefined ? { author } : undefined;

    return ok(
      Structure.create(name, dimensions, palette, blocks, structureMetadata)
    );
  }

  /**
   * Process a single Litematica region
   */
  private processLitematicRegion(
    region: Record<string, unknown>,
    blocks: Map<string, Block>,
    paletteSet: Set<string>
  ): void {
    const positionData = region['Position'] as Record<string, unknown> | undefined;
    const sizeData = region['Size'] as Record<string, unknown> | undefined;
    const blockStatePalette = region['BlockStatePalette'] as unknown[] | undefined;
    const blockStates = region['BlockStates'] as bigint[] | undefined;

    if (!positionData || !sizeData || !blockStatePalette) {
      return;
    }

    const offsetX = this.getNumber(positionData, 'x') ?? 0;
    const offsetY = this.getNumber(positionData, 'y') ?? 0;
    const offsetZ = this.getNumber(positionData, 'z') ?? 0;

    const width = Math.abs(this.getNumber(sizeData, 'x') ?? 1);
    const height = Math.abs(this.getNumber(sizeData, 'y') ?? 1);
    const length = Math.abs(this.getNumber(sizeData, 'z') ?? 1);

    // Build palette
    const palette: BlockState[] = [];
    for (const entry of blockStatePalette) {
      const entryData = entry as Record<string, unknown>;
      // Name could be a string or an object with value property
      let blockName = 'minecraft:air';
      const nameField = entryData['Name'];
      if (typeof nameField === 'string') {
        blockName = nameField;
      } else if (nameField && typeof nameField === 'object') {
        const nameObj = nameField as { value?: string };
        if (typeof nameObj.value === 'string') {
          blockName = nameObj.value;
        }
      }

      // Extract block state properties (facing, half, shape, waterlogged, etc.)
      const properties: Record<string, string> = {};
      const propsField = entryData['Properties'] as Record<string, unknown> | undefined;
      if (propsField) {
        for (const [key, val] of Object.entries(propsField)) {
          if (typeof val === 'string') {
            properties[key] = val;
          } else if (val && typeof val === 'object') {
            const valObj = val as { value?: string };
            if (typeof valObj.value === 'string') {
              properties[key] = valObj.value;
            }
          }
        }
      }

      // Build full blockstate string for paletteSet (includes properties)
      const hasProperties = Object.keys(properties).length > 0;
      const blockStateStr = hasProperties
        ? `${blockName}[${Object.entries(properties).map(([k, v]) => `${k}=${v}`).join(',')}]`
        : blockName;

      palette.push(BlockState.create(blockName, properties));
      paletteSet.add(blockStateStr);
    }

    // Calculate bits per block
    const bitsPerBlock = Math.max(2, Math.ceil(Math.log2(palette.length)));

    // Decode packed block states
    if (blockStates && blockStates.length > 0) {
      const volume = width * height * length;
      const indices = this.decodeLitematicBlockStates(
        blockStates,
        volume,
        bitsPerBlock
      );

      for (let y = 0; y < height; y++) {
        for (let z = 0; z < length; z++) {
          for (let x = 0; x < width; x++) {
            const index = (y * length + z) * width + x;
            const paletteIndex = indices[index];

            if (paletteIndex !== undefined && paletteIndex < palette.length) {
              const blockState = palette[paletteIndex];
              if (!blockState.isAir()) {
                const position = Position.create(
                  x + offsetX,
                  y + offsetY,
                  z + offsetZ
                );
                const block = Block.create(position, blockState);
                blocks.set(position.toKey(), block);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Converts Bedrock mcstructure format
   */
  private fromBedrock(
    data: Readonly<Record<string, unknown>>
  ): Result<Structure, PortError> {
    const sizeRaw = data['size'];
    const structure = data['structure'] as Record<string, unknown> | undefined;

    // Extract size - can be array or have nested structure
    let size: number[] | undefined;
    if (Array.isArray(sizeRaw)) {
      size = sizeRaw as number[];
    } else if (sizeRaw && typeof sizeRaw === 'object') {
      // Handle nested list structure from NBT parsing
      const sizeObj = sizeRaw as { value?: unknown[] };
      if (Array.isArray(sizeObj.value)) {
        size = sizeObj.value as number[];
      }
    }

    if (!size || size.length !== 3 || !structure) {
      return err('PARSE_ERROR', 'Missing required fields: size or structure');
    }

    const [width, height, length] = size;
    const dimensions = Dimensions.create(width, height, length);

    const blocks = new Map<string, Block>();
    const paletteSet = new Set<string>();

    // Get palette from structure
    const palette = structure['palette'] as Record<string, unknown> | undefined;
    const defaultPalette = palette?.['default'] as Record<string, unknown> | undefined;
    const blockPalette = defaultPalette?.['block_palette'] as unknown[] | undefined;

    const blockStates: BlockState[] = [];
    if (blockPalette) {
      for (const entry of blockPalette) {
        const entryData = entry as Record<string, unknown>;
        // name could be a string or an object with value property
        let blockName = 'minecraft:air';
        const nameField = entryData['name'];
        if (typeof nameField === 'string') {
          blockName = nameField;
        } else if (nameField && typeof nameField === 'object') {
          const nameObj = nameField as { value?: string };
          if (typeof nameObj.value === 'string') {
            blockName = nameObj.value;
          }
        }
        blockStates.push(BlockState.create(blockName));
        paletteSet.add(blockName);
      }
    }

    // Get block indices - handle various NBT list representations
    const blockIndicesRaw = structure['block_indices'];
    let layer0: number[] | undefined;

    if (Array.isArray(blockIndicesRaw)) {
      // Direct array
      const firstLayer = blockIndicesRaw[0];
      if (Array.isArray(firstLayer)) {
        layer0 = firstLayer as number[];
      } else if (firstLayer && typeof firstLayer === 'object') {
        // Nested list structure
        const layerObj = firstLayer as { value?: unknown };
        if (Array.isArray(layerObj.value)) {
          layer0 = layerObj.value as number[];
        }
      }
    }

    if (layer0) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < length; z++) {
          for (let x = 0; x < width; x++) {
            const index = (y * length + z) * width + x;
            const paletteIndex = layer0[index];

            if (
              paletteIndex !== undefined &&
              paletteIndex >= 0 &&
              paletteIndex < blockStates.length
            ) {
              const blockState = blockStates[paletteIndex];
              if (!blockState.isAir()) {
                const position = Position.create(x, y, z);
                const block = Block.create(position, blockState);
                blocks.set(position.toKey(), block);
              }
            }
          }
        }
      }
    }

    return ok(
      Structure.create(
        'Bedrock Structure',
        dimensions,
        Array.from(paletteSet).map((n) => BlockState.create(n)),
        blocks
      )
    );
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Gets a number from an object, handling various NBT formats
   */
  private getNumber(
    obj: Record<string, unknown>,
    key: string
  ): number | undefined {
    const value = obj[key];
    if (typeof value === 'number') {
      return value;
    }
    if (value && typeof value === 'object' && 'value' in value) {
      const v = (value as { value: unknown }).value;
      if (typeof v === 'number') {
        return v;
      }
    }
    return undefined;
  }

  /**
   * Converts legacy block ID to block name
   */
  private legacyIdToBlockName(id: number, _metadata: number): string {
    // Simplified mapping - real implementation would have full mapping
    const legacyBlocks: Record<number, string> = {
      1: 'minecraft:stone',
      2: 'minecraft:grass_block',
      3: 'minecraft:dirt',
      4: 'minecraft:cobblestone',
      5: 'minecraft:oak_planks',
      7: 'minecraft:bedrock',
      12: 'minecraft:sand',
      13: 'minecraft:gravel',
      14: 'minecraft:gold_ore',
      15: 'minecraft:iron_ore',
      16: 'minecraft:coal_ore',
      17: 'minecraft:oak_log',
      18: 'minecraft:oak_leaves',
      20: 'minecraft:glass',
      24: 'minecraft:sandstone',
      35: 'minecraft:white_wool',
      41: 'minecraft:gold_block',
      42: 'minecraft:iron_block',
      43: 'minecraft:stone_slab',
      45: 'minecraft:bricks',
      48: 'minecraft:mossy_cobblestone',
      49: 'minecraft:obsidian',
      56: 'minecraft:diamond_ore',
      57: 'minecraft:diamond_block',
      79: 'minecraft:ice',
      98: 'minecraft:stone_bricks',
    };

    return legacyBlocks[id] ?? `minecraft:unknown_block_${id}`;
  }

  /**
   * Decodes varint array from buffer
   */
  private decodeVarintArray(
    data: Buffer | number[],
    expectedLength: number
  ): number[] {
    const result: number[] = [];
    const bytes = Array.from(data);
    let i = 0;

    while (i < bytes.length && result.length < expectedLength) {
      let value = 0;
      let shift = 0;

      while (i < bytes.length) {
        const byte = bytes[i];
        i++;
        value |= (byte & 0x7f) << shift;

        if ((byte & 0x80) === 0) {
          break;
        }
        shift += 7;
      }

      result.push(value);
    }

    // Pad with zeros if needed
    while (result.length < expectedLength) {
      result.push(0);
    }

    return result;
  }

  /**
   * Decodes Litematica packed block states
   */
  private decodeLitematicBlockStates(
    blockStates: bigint[],
    volume: number,
    bitsPerBlock: number
  ): number[] {
    const result: number[] = [];
    const mask = BigInt((1 << bitsPerBlock) - 1);

    for (let i = 0; i < volume; i++) {
      const bitOffset = i * bitsPerBlock;
      const longIndex = Math.floor(bitOffset / 64);
      const bitInLong = bitOffset % 64;

      if (longIndex >= blockStates.length) {
        result.push(0);
        continue;
      }

      let value = (blockStates[longIndex] >> BigInt(bitInLong)) & mask;

      // Handle spanning across two longs
      if (bitInLong + bitsPerBlock > 64 && longIndex + 1 < blockStates.length) {
        const bitsFromNext = bitInLong + bitsPerBlock - 64;
        const nextMask = BigInt((1 << bitsFromNext) - 1);
        const nextValue =
          (blockStates[longIndex + 1] & nextMask) << BigInt(64 - bitInLong);
        value |= nextValue;
      }

      result.push(Number(value & mask));
    }

    return result;
  }
}
