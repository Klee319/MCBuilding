/**
 * UploadStructure Usecase
 *
 * Uploads and parses a Minecraft structure file.
 */

import { Structure } from '../../domain/entities/structure.js';
import { Edition } from '../../domain/value-objects/edition.js';
import { Version } from '../../domain/value-objects/version.js';
import { FileFormat } from '../../domain/value-objects/file-format.js';
import { Dimensions } from '../../domain/value-objects/dimensions.js';
import type { StructureRepositoryPort } from '../ports/repository-ports.js';
import type { StructureConverterPort } from '../ports/gateway-ports.js';

export interface UploadStructureInput {
  readonly file: Uint8Array;
  readonly fileName: string;
  readonly originalEdition: 'java' | 'bedrock';
  readonly originalVersion: string;
  readonly uploaderId: string;
}

export class UploadStructureError extends Error {
  public override readonly name = 'UploadStructureError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UploadStructureError.prototype);
  }
}

export class UploadStructure {
  private readonly _structureRepository: StructureRepositoryPort;
  private readonly _structureConverter: StructureConverterPort;

  private constructor(
    structureRepository: StructureRepositoryPort,
    structureConverter: StructureConverterPort
  ) {
    this._structureRepository = structureRepository;
    this._structureConverter = structureConverter;

    Object.freeze(this);
  }

  public static create(
    structureRepository: StructureRepositoryPort,
    structureConverter: StructureConverterPort
  ): UploadStructure {
    return new UploadStructure(structureRepository, structureConverter);
  }

  public async execute(input: UploadStructureInput): Promise<Structure> {
    this.validateInput(input);

    const { file, fileName, originalEdition, originalVersion, uploaderId } = input;

    // Determine file format from extension
    const format = this.getFileFormat(fileName);

    // Parse the structure to extract metadata
    const metadata = await this._structureConverter.parseStructure(file, format);

    // Create value objects
    const edition = originalEdition === 'java' ? Edition.java() : Edition.bedrock();
    const version = Version.create(originalVersion);
    const dimensions = Dimensions.create(
      metadata.dimensions.x,
      metadata.dimensions.y,
      metadata.dimensions.z
    );

    // Generate structure ID
    const structureId = this.generateStructureId();

    // Register the parsed data with the structure ID for rendering
    this._structureConverter.registerParsedData(structureId);

    // Create the structure entity
    const structure = Structure.create({
      id: structureId,
      uploaderId,
      originalEdition: edition,
      originalVersion: version,
      originalFormat: format,
      dimensions,
      blockCount: metadata.blockCount,
      createdAt: new Date(),
    });

    return this._structureRepository.save(structure);
  }

  private validateInput(input: UploadStructureInput): void {
    if (!input.file || input.file.length === 0) {
      throw new UploadStructureError('file cannot be empty');
    }
    if (!input.fileName || input.fileName.trim().length === 0) {
      throw new UploadStructureError('fileName cannot be empty');
    }
    if (!input.uploaderId || input.uploaderId.trim().length === 0) {
      throw new UploadStructureError('uploaderId cannot be empty');
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (input.file.length > maxSize) {
      throw new UploadStructureError('File size exceeds maximum limit of 100MB');
    }
  }

  private getFileFormat(fileName: string): FileFormat {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'schematic':
      case 'schem': // WorldEdit Sponge schematic format
        return FileFormat.schematic();
      case 'litematic':
        return FileFormat.litematic();
      case 'mcstructure':
        return FileFormat.mcstructure();
      default:
        throw new UploadStructureError(`Unsupported file format: ${ext}`);
    }
  }

  private generateStructureId(): string {
    return `struct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
