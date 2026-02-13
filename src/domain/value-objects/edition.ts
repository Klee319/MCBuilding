/**
 * Edition Value Object
 *
 * Represents the Minecraft edition (Java or Bedrock).
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const edition = Edition.create('java');
 * const javaEdition = Edition.java();
 * const bedrockEdition = Edition.bedrock();
 */

/**
 * Valid edition values as a readonly tuple
 */
export const EDITION_VALUES = ['java', 'bedrock'] as const;

/**
 * Type representing valid edition values
 */
export type EditionValue = (typeof EDITION_VALUES)[number];

/**
 * Custom error for invalid edition values
 */
export class InvalidEditionError extends Error {
  public override readonly name = 'InvalidEditionError';

  constructor(invalidValue: unknown) {
    const validOptions = EDITION_VALUES.join(', ');
    super(
      `Invalid edition value: "${invalidValue}". Valid options are: ${validOptions}`
    );

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidEditionError.prototype);
  }
}

/**
 * Edition Value Object
 *
 * Immutable value object representing Minecraft edition.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Edition {
  // Singleton instances for common editions
  private static _javaInstance: Edition | null = null;
  private static _bedrockInstance: Edition | null = null;

  // Internal state
  private readonly _value: EditionValue;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: EditionValue) {
    this._value = value;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid edition
   *
   * @param value - Value to validate
   * @returns true if valid edition value
   */
  public static isValid(value: unknown): value is EditionValue {
    if (typeof value !== 'string') {
      return false;
    }
    return EDITION_VALUES.includes(value as EditionValue);
  }

  /**
   * Creates an Edition instance from a string value
   *
   * @param value - The edition value ('java' or 'bedrock')
   * @returns Edition instance
   * @throws InvalidEditionError if value is invalid
   */
  public static create(value: string): Edition {
    if (!Edition.isValid(value)) {
      throw new InvalidEditionError(value);
    }

    // Return singleton instances
    return value === 'java' ? Edition.java() : Edition.bedrock();
  }

  /**
   * Returns the Java Edition singleton instance
   *
   * @returns Edition instance for Java
   */
  public static java(): Edition {
    if (!Edition._javaInstance) {
      Edition._javaInstance = new Edition('java');
    }
    return Edition._javaInstance;
  }

  /**
   * Returns the Bedrock Edition singleton instance
   *
   * @returns Edition instance for Bedrock
   */
  public static bedrock(): Edition {
    if (!Edition._bedrockInstance) {
      Edition._bedrockInstance = new Edition('bedrock');
    }
    return Edition._bedrockInstance;
  }

  /**
   * Gets the edition value
   */
  public get value(): EditionValue {
    return this._value;
  }

  /**
   * Checks if this is Java Edition
   *
   * @returns true if Java Edition
   */
  public isJava(): boolean {
    return this._value === 'java';
  }

  /**
   * Checks if this is Bedrock Edition
   *
   * @returns true if Bedrock Edition
   */
  public isBedrock(): boolean {
    return this._value === 'bedrock';
  }

  /**
   * Compares equality with another Edition
   *
   * @param other - Edition to compare with
   * @returns true if editions are equal
   */
  public equals(other: Edition): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation
   *
   * @returns The edition value as string
   */
  public toString(): string {
    return this._value;
  }
}
