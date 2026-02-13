/**
 * NBTParserPort Interface
 *
 * Port interface for parsing NBT (Named Binary Tag) data from Minecraft structure files.
 * This port abstracts the NBT parsing implementation from the usecase layer.
 *
 * Supported formats:
 * - schematic: Classic MCEdit format
 * - schem: Sponge Schematic format (v2/v3)
 * - litematic: Litematica format
 * - mcstructure: Bedrock Edition structure format
 */

import type { Structure } from '../../../domain/renderer/structure.js';
import type { PortError } from '../types.js';

// ========================================
// Types
// ========================================

/**
 * Supported structure file formats
 */
export type StructureFormat = 'schematic' | 'schem' | 'litematic' | 'mcstructure';

/**
 * Parsed NBT data representation
 *
 * This is an intermediate format before conversion to Structure entity.
 * The actual data structure varies by format.
 */
export interface ParsedNBT {
  /** The format this NBT was parsed from */
  readonly format: StructureFormat;

  /**
   * Raw NBT data as parsed from file
   * Structure varies by format:
   * - schematic: { Width, Height, Length, Blocks, Data, ... }
   * - schem: { Version, Width, Height, Length, Palette, BlockData, ... }
   * - litematic: { MinecraftDataVersion, Regions, ... }
   * - mcstructure: { format_version, size, structure, ... }
   */
  readonly data: Readonly<Record<string, unknown>>;

  /** Size of raw data in bytes */
  readonly rawSize: number;
}

/**
 * Result type for async operations
 */
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

// ========================================
// Port Interface
// ========================================

/**
 * NBTParserPort
 *
 * Interface for parsing NBT data and converting to Structure entities.
 *
 * @example
 * ```typescript
 * const result = await nbtParser.parse(arrayBuffer, 'schematic');
 * if (result.success) {
 *   const structureResult = nbtParser.toStructure(result.value);
 *   if (structureResult.success) {
 *     console.log(structureResult.value.name);
 *   }
 * }
 * ```
 */
export interface NBTParserPort {
  /**
   * Parses raw NBT data from an ArrayBuffer
   *
   * This method handles:
   * - Decompression (gzip/zlib if needed)
   * - NBT tag parsing
   * - Format-specific validation
   *
   * @param data - Raw file data as ArrayBuffer
   * @param format - Structure file format
   * @returns Parsed NBT data or error
   *
   * @throws Never - errors are returned as Result
   *
   * Possible errors:
   * - INVALID_FORMAT: Unsupported or mismatched format
   * - PARSE_ERROR: Decompression or parsing failure
   */
  parse(data: ArrayBuffer, format: StructureFormat): Promise<Result<ParsedNBT, PortError>>;

  /**
   * Converts parsed NBT data to a Structure entity
   *
   * This method handles format-specific conversion:
   * - Extracting dimensions
   * - Building block palette
   * - Mapping block data to positions
   * - Extracting metadata
   *
   * @param nbt - Parsed NBT data
   * @returns Structure entity or error
   *
   * @throws Never - errors are returned as Result
   *
   * Possible errors:
   * - PARSE_ERROR: Missing required data or invalid structure
   */
  toStructure(nbt: ParsedNBT): Result<Structure, PortError>;
}
