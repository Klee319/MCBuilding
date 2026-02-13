/**
 * LoadStructureUsecase
 *
 * Use case for loading and parsing Minecraft structure files.
 * Supports multiple formats: schematic, schem, litematic, mcstructure.
 *
 * @example
 * ```typescript
 * const usecase = createLoadStructureUsecase(nbtParser);
 *
 * const result = await usecase.execute({
 *   data: file,
 *   format: 'schematic',
 * });
 *
 * if (result.success) {
 *   console.log(`Loaded ${result.value.structure.name}`);
 *   console.log(`Parse time: ${result.value.parseTime}ms`);
 * }
 * ```
 */

import type { Structure } from '../../domain/renderer/structure.js';
import type {
  NBTParserPort,
  StructureFormat,
  Result,
} from '../ports/renderer/nbt-parser-port.js';
import type { PortError } from '../ports/types.js';

// ========================================
// Types
// ========================================

/**
 * Input for LoadStructure use case
 */
export interface LoadStructureInput {
  /** Raw file data (ArrayBuffer or File) */
  readonly data: ArrayBuffer | File;

  /** Structure file format */
  readonly format: StructureFormat;
}

/**
 * Output for LoadStructure use case
 */
export interface LoadStructureOutput {
  /** Parsed structure entity */
  readonly structure: Structure;

  /** Time taken to parse in milliseconds */
  readonly parseTime: number;
}

/**
 * LoadStructure use case interface
 */
export interface LoadStructureUsecase {
  /**
   * Loads and parses a structure file
   *
   * @param input - File data and format
   * @returns Parsed structure or error
   */
  execute(input: LoadStructureInput): Promise<Result<LoadStructureOutput, PortError>>;
}

// ========================================
// Implementation
// ========================================

/**
 * Creates a LoadStructure use case instance
 *
 * @param nbtParser - NBT parser port implementation
 * @returns LoadStructure use case
 */
export function createLoadStructureUsecase(nbtParser: NBTParserPort): LoadStructureUsecase {
  return {
    async execute(input: LoadStructureInput): Promise<Result<LoadStructureOutput, PortError>> {
      const startTime = performance.now();

      // Convert File to ArrayBuffer if needed
      let arrayBuffer: ArrayBuffer;
      if (input.data instanceof File) {
        arrayBuffer = await input.data.arrayBuffer();
      } else {
        arrayBuffer = input.data;
      }

      // Parse NBT data
      const parseResult = await nbtParser.parse(arrayBuffer, input.format);
      if (!parseResult.success) {
        return parseResult;
      }

      // Convert to Structure entity
      const structureResult = nbtParser.toStructure(parseResult.value);
      if (!structureResult.success) {
        return structureResult;
      }

      const parseTime = performance.now() - startTime;

      return {
        success: true,
        value: {
          structure: structureResult.value,
          parseTime,
        },
      };
    },
  };
}
