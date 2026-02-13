/**
 * Structure Entity
 *
 * Represents metadata for Minecraft building structure files.
 * The actual file storage is handled by the Infrastructure layer.
 *
 * @example
 * const structure = Structure.create({
 *   id: 'structure-123',
 *   uploaderId: 'user-456',
 *   originalEdition: Edition.java(),
 *   originalVersion: Version.create('1.20.4'),
 *   originalFormat: FileFormat.schematic(),
 *   dimensions: Dimensions.create(64, 128, 64),
 *   blockCount: 50000,
 *   createdAt: new Date(),
 * });
 */

import { Edition } from '../value-objects/edition.js';
import { Version } from '../value-objects/version.js';
import { FileFormat } from '../value-objects/file-format.js';
import { Dimensions, type SizeCategoryValue } from '../value-objects/dimensions.js';

/**
 * Properties required to create a Structure entity
 */
export interface StructureProps {
  /** Unique structure identifier */
  id: string;
  /** User ID of the uploader */
  uploaderId: string;
  /** Original Minecraft edition (Java or Bedrock) */
  originalEdition: Edition;
  /** Original Minecraft version (>= 1.12) */
  originalVersion: Version;
  /** Original file format (schematic, litematic, mcstructure) */
  originalFormat: FileFormat;
  /** 3D dimensions of the structure */
  dimensions: Dimensions;
  /** Total number of blocks in the structure */
  blockCount: number;
  /** Timestamp when the structure was created */
  createdAt: Date;
}

/**
 * Custom error for invalid Structure entity data
 */
export class InvalidStructureError extends Error {
  public override readonly name = 'InvalidStructureError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidStructureError.prototype);
  }
}

/**
 * Validates that a string is non-empty after trimming
 */
function isNonEmptyString(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}


/**
 * Structure Entity
 *
 * Immutable entity representing Minecraft building structure metadata.
 * Uses private constructor pattern - instantiate via static factory methods.
 *
 * Identity: Structures are compared by ID only (equals method)
 */
export class Structure {
  private readonly _id: string;
  private readonly _uploaderId: string;
  private readonly _originalEdition: Edition;
  private readonly _originalVersion: Version;
  private readonly _originalFormat: FileFormat;
  private readonly _dimensions: Dimensions;
  private readonly _blockCount: number;
  private readonly _createdAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: StructureProps) {
    this._id = props.id;
    this._uploaderId = props.uploaderId;
    this._originalEdition = props.originalEdition;
    this._originalVersion = props.originalVersion;
    this._originalFormat = props.originalFormat;
    this._dimensions = props.dimensions;
    this._blockCount = props.blockCount;
    // Create a defensive copy of the Date to prevent external mutation
    this._createdAt = new Date(props.createdAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates the structure properties
   *
   * @param props - Properties to validate
   * @throws InvalidStructureError if validation fails
   */
  private static validate(props: StructureProps): void {
    if (!isNonEmptyString(props.id)) {
      throw new InvalidStructureError('id cannot be empty');
    }

    if (!isNonEmptyString(props.uploaderId)) {
      throw new InvalidStructureError('uploaderId cannot be empty');
    }

    if (!Number.isFinite(props.blockCount) || !Number.isInteger(props.blockCount)) {
      throw new InvalidStructureError('blockCount must be a valid integer');
    }

    if (props.blockCount < 0) {
      throw new InvalidStructureError('blockCount must be non-negative');
    }
  }

  /**
   * Creates a new Structure entity with validation
   *
   * @param props - Structure properties
   * @returns New Structure instance
   * @throws InvalidStructureError if validation fails
   */
  public static create(props: StructureProps): Structure {
    Structure.validate(props);
    return new Structure(props);
  }

  /**
   * Reconstructs a Structure entity from database data without validation
   *
   * Use this method when loading data from a trusted source (database)
   * that has already been validated on creation.
   *
   * @param props - Structure properties from database
   * @returns Reconstructed Structure instance
   */
  public static reconstruct(props: StructureProps): Structure {
    return new Structure(props);
  }

  /**
   * Gets the structure ID
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the uploader's user ID
   */
  public get uploaderId(): string {
    return this._uploaderId;
  }

  /**
   * Gets the original Minecraft edition
   */
  public get originalEdition(): Edition {
    return this._originalEdition;
  }

  /**
   * Gets the original Minecraft version
   */
  public get originalVersion(): Version {
    return this._originalVersion;
  }

  /**
   * Gets the original file format
   */
  public get originalFormat(): FileFormat {
    return this._originalFormat;
  }

  /**
   * Gets the structure dimensions
   */
  public get dimensions(): Dimensions {
    return this._dimensions;
  }

  /**
   * Gets the block count
   */
  public get blockCount(): number {
    return this._blockCount;
  }

  /**
   * Gets the creation timestamp
   * Returns a defensive copy to prevent external mutation
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * Gets the size category based on dimensions
   *
   * Categories are determined by the maximum side length:
   * - small: maxSide <= 50
   * - medium: maxSide <= 100
   * - large: maxSide <= 200
   * - xlarge: maxSide > 200
   *
   * @returns Size category value
   */
  public getSizeCategory(): SizeCategoryValue {
    return this._dimensions.getSizeCategory();
  }

  /**
   * Checks if the structure's file format is compatible with a given edition
   *
   * Compatibility is based on the original file format:
   * - schematic, litematic -> Java only
   * - mcstructure -> Bedrock only
   *
   * @param edition - Edition to check compatibility with
   * @returns true if compatible
   */
  public isCompatibleWithEdition(edition: Edition): boolean {
    return this._originalFormat.isCompatibleWith(edition);
  }

  /**
   * Compares equality with another Structure by ID
   *
   * Entities are compared by identity (ID), not by value equality.
   *
   * @param other - Structure to compare with
   * @returns true if structures have the same ID
   */
  public equals(other: Structure): boolean {
    return this._id === other._id;
  }
}
