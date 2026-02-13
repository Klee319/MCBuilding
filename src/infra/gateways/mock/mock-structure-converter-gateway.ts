/**
 * Mock Structure Converter Gateway
 *
 * Parses actual structure files (.schem, .schematic) and stores data for rendering.
 */

import type { StructureConverterPort } from '../../../usecase/ports/gateway-ports.js';
import type { Edition } from '../../../domain/value-objects/edition.js';
import type { Version } from '../../../domain/value-objects/version.js';
import type {
  StructureData,
  StructureMetadata,
  ConversionResult,
  ExportResult,
} from '../../../usecase/ports/types.js';
import { PortError } from '../../../usecase/ports/types.js';
import { FileFormat } from '../../../domain/value-objects/file-format.js';
import { parseSchematic, type ParsedSchematic } from '../schematic-parser.js';
import {
  serializeToSponge,
  serializeToLitematic,
  serializeToMcstructure,
} from '../structure-serializer.js';
import { structureDataStore } from '../structure-data-store.js';

export class MockStructureConverterGateway implements StructureConverterPort {
  private _shouldFailConversion = false;
  private _shouldFailParse = false;
  private _mockMetadata: StructureMetadata | null = null;
  private _mockConversionResult: ConversionResult | null = null;
  private _lastParsedData: ParsedSchematic | null = null;
  private _lastRawFile: Uint8Array | null = null;
  private _lastFormat: string | null = null;

  /**
   * Reset all mock state
   */
  public clear(): void {
    this._shouldFailConversion = false;
    this._shouldFailParse = false;
    this._mockMetadata = null;
    this._mockConversionResult = null;
    this._lastParsedData = null;
    this._lastRawFile = null;
    this._lastFormat = null;
    structureDataStore.clear();
  }

  /**
   * Set whether conversion should fail
   */
  public setShouldFailConversion(shouldFail: boolean): void {
    this._shouldFailConversion = shouldFail;
  }

  /**
   * Set whether parsing should fail
   */
  public setShouldFailParse(shouldFail: boolean): void {
    this._shouldFailParse = shouldFail;
  }

  /**
   * Set mock metadata to return from parseStructure
   */
  public setMockMetadata(metadata: StructureMetadata): void {
    this._mockMetadata = metadata;
  }

  /**
   * Set mock conversion result to return from convert
   */
  public setMockConversionResult(result: ConversionResult): void {
    this._mockConversionResult = result;
  }

  public async convert(
    source: StructureData,
    _sourceEdition: Edition,
    sourceVersion: Version,
    targetEdition: Edition,
    targetVersion: Version
  ): Promise<ConversionResult> {
    // Check version support (>= 1.12)
    const sourceVersionNum = parseInt(sourceVersion.toString().split('.')[1] ?? '0', 10);
    const targetVersionNum = parseInt(targetVersion.toString().split('.')[1] ?? '0', 10);

    if (sourceVersionNum < 12 || targetVersionNum < 12) {
      throw new PortError(
        'UNSUPPORTED_VERSION',
        'Version must be 1.12 or higher'
      );
    }

    if (this._shouldFailConversion) {
      throw new PortError('CONVERSION_FAILED', 'Conversion failed');
    }

    if (this._mockConversionResult) {
      return this._mockConversionResult;
    }

    // Default mock result - convert same data with no loss
    return {
      data: {
        content: source.content,
        format: this.getFormatForEdition(targetEdition),
      },
      convertedBlocks: [],
      hasDataLoss: false,
    };
  }

  public async parseStructure(
    file: Uint8Array,
    format: FileFormat
  ): Promise<StructureMetadata> {
    if (this._shouldFailParse) {
      throw new PortError('PARSE_ERROR', 'Failed to parse structure file');
    }

    // Validate file format by checking magic bytes
    if (file.length < 4) {
      throw new PortError('INVALID_FORMAT', 'File too small to be valid');
    }

    if (this._mockMetadata) {
      return this._mockMetadata;
    }

    // Actually parse the structure file
    try {
      const parsed = await parseSchematic(file, format.value);

      // Store for later registration
      this._lastParsedData = parsed;
      this._lastRawFile = file;
      this._lastFormat = format.value;

      // Extract unique block names for metadata
      const usedBlocks = parsed.palette.map((p) => p.name);

      return {
        dimensions: parsed.dimensions,
        blockCount: parsed.blockCount,
        usedBlocks,
      };
    } catch (error) {
      throw new PortError('PARSE_ERROR', `Failed to parse structure file: ${error}`);
    }
  }

  /**
   * Register the last parsed structure data with a structure ID
   */
  public registerParsedData(structureId: string): void {
    if (this._lastParsedData && this._lastRawFile && this._lastFormat) {
      structureDataStore.set(structureId, {
        rawFile: this._lastRawFile,
        format: this._lastFormat,
        parsed: this._lastParsedData,
      });

      // Clear temporary data
      this._lastParsedData = null;
      this._lastRawFile = null;
      this._lastFormat = null;
    }
  }

  public async exportStructure(
    structureId: string,
    targetFormat: FileFormat,
    _targetEdition: Edition,
    _targetVersion: Version
  ): Promise<ExportResult> {
    const stored = structureDataStore.get(structureId);
    if (!stored) {
      throw new PortError('NOT_FOUND', `Structure not found: ${structureId}`);
    }

    // If the stored format already matches the target, return the raw file
    if (stored.format === targetFormat.value) {
      return {
        data: stored.rawFile,
        format: targetFormat,
        fileName: `structure${targetFormat.getExtension()}`,
        hasDataLoss: false,
        lostBlocks: [],
      };
    }

    // Cross-format conversion via ParsedSchematic intermediate
    try {
      let serialized: Uint8Array;
      switch (targetFormat.value) {
        case 'schematic':
          serialized = await serializeToSponge(stored.parsed);
          break;
        case 'litematic':
          serialized = await serializeToLitematic(stored.parsed);
          break;
        case 'mcstructure':
          serialized = await serializeToMcstructure(stored.parsed);
          break;
        default:
          throw new PortError(
            'UNSUPPORTED_CONVERSION',
            `Unsupported target format: ${targetFormat.value}`
          );
      }

      return {
        data: serialized,
        format: targetFormat,
        fileName: `structure${targetFormat.getExtension()}`,
        hasDataLoss: false,
        lostBlocks: [],
      };
    } catch (error) {
      if (error instanceof PortError) {
        throw error;
      }
      throw new PortError('EXPORT_FAILED', `Export failed: ${error}`);
    }
  }

  private getFormatForEdition(edition: Edition): FileFormat {
    // This is a simplification - in reality would return appropriate format
    return edition.value === 'java'
      ? ({ value: 'schematic' } as FileFormat)
      : ({ value: 'mcstructure' } as FileFormat);
  }
}
