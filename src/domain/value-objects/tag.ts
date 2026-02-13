/**
 * Tag Value Object
 *
 * Represents a post tag with validation and normalization.
 * This is an immutable value object following DDD principles.
 *
 * Features:
 * - 1-30 characters length
 * - Allowed: alphanumeric (a-z, A-Z, 0-9), hiragana, katakana, kanji, underscore, hyphen
 * - Whitespace-only is not allowed
 * - Leading/trailing whitespace is trimmed
 * - Normalization: lowercase (English only), trim whitespace
 *
 * @example
 * const tag = Tag.create('Minecraft');
 * console.log(tag.value);        // 'minecraft'
 * console.log(tag.displayValue); // 'Minecraft'
 */

/**
 * Minimum tag length
 */
export const TAG_MIN_LENGTH = 1;

/**
 * Maximum tag length
 */
export const TAG_MAX_LENGTH = 30;

/**
 * Regular expression for valid tag characters after trimming
 * Allows: alphanumeric, hiragana, katakana, kanji, underscore, hyphen
 */
const VALID_TAG_PATTERN =
  /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+$/;

/**
 * Custom error for invalid tag values
 */
export class InvalidTagError extends Error {
  public override readonly name = 'InvalidTagError';
  public readonly invalidValue: unknown;
  public readonly reason: string;

  constructor(invalidValue: unknown, reason: string) {
    super(`Invalid tag value: "${invalidValue}". Reason: ${reason}`);

    this.invalidValue = invalidValue;
    this.reason = reason;

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidTagError.prototype);
  }
}

/**
 * Tag Value Object
 *
 * Immutable value object representing a post tag.
 * Uses private constructor pattern - instantiate via static factory method.
 */
export class Tag {
  // Internal state
  private readonly _value: string; // normalized value (lowercase, trimmed)
  private readonly _displayValue: string; // display value (original case, trimmed)

  /**
   * Private constructor - use static factory method instead
   */
  private constructor(normalizedValue: string, displayValue: string) {
    this._value = normalizedValue;
    this._displayValue = displayValue;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Normalizes a tag value (lowercase English, trim whitespace)
   *
   * @param value - Value to normalize
   * @returns Normalized value
   */
  public static normalize(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().toLowerCase();
  }

  /**
   * Trims a tag value (whitespace only, preserves case)
   *
   * @param value - Value to trim
   * @returns Trimmed value
   */
  private static trim(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

  /**
   * Validates if a value is a valid tag
   *
   * @param value - Value to validate
   * @returns true if valid tag value
   */
  public static isValid(value: unknown): value is string {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmed = value.trim();

    // Check for empty or whitespace-only
    if (trimmed.length === 0) {
      return false;
    }

    // Check length constraints
    if (trimmed.length < TAG_MIN_LENGTH || trimmed.length > TAG_MAX_LENGTH) {
      return false;
    }

    // Check for valid characters
    if (!VALID_TAG_PATTERN.test(trimmed)) {
      return false;
    }

    return true;
  }

  /**
   * Gets the validation error reason for an invalid value
   *
   * @param value - Value to check
   * @returns Error reason or null if valid
   */
  private static getValidationError(value: unknown): string | null {
    if (typeof value !== 'string') {
      return 'must be a string';
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return 'cannot be empty or whitespace only';
    }

    if (trimmed.length < TAG_MIN_LENGTH) {
      return `must be at least ${TAG_MIN_LENGTH} character(s)`;
    }

    if (trimmed.length > TAG_MAX_LENGTH) {
      return `must be at most ${TAG_MAX_LENGTH} characters`;
    }

    if (!VALID_TAG_PATTERN.test(trimmed)) {
      return 'contains invalid characters (allowed: alphanumeric, hiragana, katakana, kanji, underscore, hyphen)';
    }

    return null;
  }

  /**
   * Creates a Tag instance from a string value
   *
   * @param value - The tag value
   * @returns Tag instance
   * @throws InvalidTagError if value is invalid
   */
  public static create(value: string): Tag {
    const error = Tag.getValidationError(value);

    if (error !== null) {
      throw new InvalidTagError(value, error);
    }

    const displayValue = Tag.trim(value);
    const normalizedValue = Tag.normalize(value);

    return new Tag(normalizedValue, displayValue);
  }

  /**
   * Gets the normalized tag value (lowercase, trimmed)
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Gets the display value (original case, trimmed)
   */
  public get displayValue(): string {
    return this._displayValue;
  }

  /**
   * Compares equality with another Tag (based on normalized value)
   *
   * @param other - Tag to compare with
   * @returns true if tags are equal (same normalized value)
   */
  public equals(other: Tag): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation (normalized value)
   *
   * @returns The normalized tag value
   */
  public toString(): string {
    return this._value;
  }
}
