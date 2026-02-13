/**
 * FileFormat Value Object
 *
 * Represents the file format for Minecraft structures (schematic, litematic, mcstructure).
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const format = FileFormat.create('schematic');
 * const schematic = FileFormat.schematic();
 * const litematic = FileFormat.litematic();
 * const mcstructure = FileFormat.mcstructure();
 */

import { Edition, type EditionValue } from './edition.js';

/**
 * Valid file format values as a readonly tuple
 */
export const FILE_FORMAT_VALUES = [
  'schematic',
  'litematic',
  'mcstructure',
] as const;

/**
 * Type representing valid file format values
 */
export type FileFormatValue = (typeof FILE_FORMAT_VALUES)[number];

/**
 * Mapping of file formats to supported editions
 */
const FORMAT_EDITION_MAP: Record<FileFormatValue, readonly EditionValue[]> = {
  schematic: ['java'],
  litematic: ['java'],
  mcstructure: ['bedrock'],
} as const;

/**
 * Custom error for invalid file format values
 */
export class InvalidFileFormatError extends Error {
  public override readonly name = 'InvalidFileFormatError';

  constructor(invalidValue: unknown) {
    const validOptions = FILE_FORMAT_VALUES.join(', ');
    super(
      `Invalid file format value: "${invalidValue}". Valid options are: ${validOptions}`
    );

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidFileFormatError.prototype);
  }
}

/**
 * FileFormat Value Object
 *
 * Immutable value object representing Minecraft structure file format.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class FileFormat {
  // Singleton instances for common formats
  private static _schematicInstance: FileFormat | null = null;
  private static _litematicInstance: FileFormat | null = null;
  private static _mcstructureInstance: FileFormat | null = null;

  // Internal state
  private readonly _value: FileFormatValue;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: FileFormatValue) {
    this._value = value;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid file format
   *
   * @param value - Value to validate
   * @returns true if valid file format value
   */
  public static isValid(value: unknown): value is FileFormatValue {
    if (typeof value !== 'string') {
      return false;
    }
    return FILE_FORMAT_VALUES.includes(value as FileFormatValue);
  }

  /**
   * Creates a FileFormat instance from a string value
   *
   * @param value - The file format value ('schematic', 'litematic', or 'mcstructure')
   * @returns FileFormat instance
   * @throws InvalidFileFormatError if value is invalid
   */
  public static create(value: string): FileFormat {
    if (!FileFormat.isValid(value)) {
      throw new InvalidFileFormatError(value);
    }

    // Return singleton instances
    switch (value) {
      case 'schematic':
        return FileFormat.schematic();
      case 'litematic':
        return FileFormat.litematic();
      case 'mcstructure':
        return FileFormat.mcstructure();
      default:
        // This should never happen due to isValid check, but TypeScript needs it
        throw new InvalidFileFormatError(value);
    }
  }

  /**
   * Returns the Schematic format singleton instance
   *
   * @returns FileFormat instance for Schematic
   */
  public static schematic(): FileFormat {
    if (!FileFormat._schematicInstance) {
      FileFormat._schematicInstance = new FileFormat('schematic');
    }
    return FileFormat._schematicInstance;
  }

  /**
   * Returns the Litematic format singleton instance
   *
   * @returns FileFormat instance for Litematic
   */
  public static litematic(): FileFormat {
    if (!FileFormat._litematicInstance) {
      FileFormat._litematicInstance = new FileFormat('litematic');
    }
    return FileFormat._litematicInstance;
  }

  /**
   * Returns the McStructure format singleton instance
   *
   * @returns FileFormat instance for McStructure
   */
  public static mcstructure(): FileFormat {
    if (!FileFormat._mcstructureInstance) {
      FileFormat._mcstructureInstance = new FileFormat('mcstructure');
    }
    return FileFormat._mcstructureInstance;
  }

  /**
   * Gets the file format value
   */
  public get value(): FileFormatValue {
    return this._value;
  }

  /**
   * Gets the editions that support this file format
   *
   * @returns Array of supported edition values
   */
  public getSupportedEditions(): EditionValue[] {
    return [...FORMAT_EDITION_MAP[this._value]];
  }

  /**
   * Checks if this file format is compatible with the given edition
   *
   * @param edition - Edition to check compatibility with
   * @returns true if compatible
   */
  public isCompatibleWith(edition: Edition): boolean {
    return FORMAT_EDITION_MAP[this._value].includes(edition.value);
  }

  /**
   * Gets the file extension for this format (including dot)
   *
   * @returns File extension string (e.g., ".schematic")
   */
  public getExtension(): string {
    return `.${this._value}`;
  }

  /**
   * Compares equality with another FileFormat
   *
   * @param other - FileFormat to compare with
   * @returns true if formats are equal
   */
  public equals(other: FileFormat): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation
   *
   * @returns The file format value as string
   */
  public toString(): string {
    return this._value;
  }
}
