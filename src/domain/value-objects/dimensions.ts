/**
 * Dimensions Value Object
 *
 * Represents the 3D dimensions (x, y, z) of a Minecraft structure.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const dimensions = Dimensions.create(64, 128, 64);
 * const volume = dimensions.volume;
 * const category = dimensions.getSizeCategory();
 */

/**
 * Valid size category values as a readonly tuple
 */
export const SIZE_CATEGORY_VALUES = ['small', 'medium', 'large', 'xlarge'] as const;

/**
 * Type representing valid size category values
 */
export type SizeCategoryValue = (typeof SIZE_CATEGORY_VALUES)[number];

/**
 * Size category thresholds (based on maxSide)
 * - small: <= 50
 * - medium: <= 100
 * - large: <= 200
 * - xlarge: > 200
 */
const SIZE_THRESHOLDS = {
  SMALL_MAX: 50,
  MEDIUM_MAX: 100,
  LARGE_MAX: 200,
} as const;

/**
 * Custom error for invalid dimensions values
 */
export class InvalidDimensionsError extends Error {
  public override readonly name = 'InvalidDimensionsError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidDimensionsError.prototype);
  }
}

/**
 * Validates that a value is a positive integer
 */
function isPositiveInteger(value: unknown): value is number {
  if (typeof value !== 'number') {
    return false;
  }
  if (!Number.isFinite(value)) {
    return false;
  }
  if (!Number.isInteger(value)) {
    return false;
  }
  return value >= 1;
}

/**
 * Dimensions Value Object
 *
 * Immutable value object representing 3D dimensions.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Dimensions {
  // Internal state
  private readonly _x: number;
  private readonly _y: number;
  private readonly _z: number;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(x: number, y: number, z: number) {
    this._x = x;
    this._y = y;
    this._z = z;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if values are valid dimensions (positive integers)
   *
   * @param x - X dimension
   * @param y - Y dimension
   * @param z - Z dimension
   * @returns true if all values are valid positive integers
   */
  public static isValid(x: number, y: number, z: number): boolean {
    return isPositiveInteger(x) && isPositiveInteger(y) && isPositiveInteger(z);
  }

  /**
   * Creates a Dimensions instance from numeric values
   *
   * @param x - X dimension (positive integer)
   * @param y - Y dimension (positive integer)
   * @param z - Z dimension (positive integer)
   * @returns Dimensions instance
   * @throws InvalidDimensionsError if any value is invalid
   */
  public static create(x: number, y: number, z: number): Dimensions {
    if (!isPositiveInteger(x)) {
      throw new InvalidDimensionsError(
        `Invalid x dimension: "${x}". Value must be a positive integer (>= 1).`
      );
    }
    if (!isPositiveInteger(y)) {
      throw new InvalidDimensionsError(
        `Invalid y dimension: "${y}". Value must be a positive integer (>= 1).`
      );
    }
    if (!isPositiveInteger(z)) {
      throw new InvalidDimensionsError(
        `Invalid z dimension: "${z}". Value must be a positive integer (>= 1).`
      );
    }

    return new Dimensions(x, y, z);
  }

  /**
   * Creates a Dimensions instance from an object
   *
   * @param obj - Object with x, y, z properties
   * @returns Dimensions instance
   * @throws InvalidDimensionsError if object is invalid
   */
  public static fromObject(obj: { x: number; y: number; z: number }): Dimensions {
    if (obj === null || obj === undefined) {
      throw new InvalidDimensionsError('Cannot create Dimensions from null or undefined');
    }

    const { x, y, z } = obj;

    if (x === undefined || y === undefined || z === undefined) {
      throw new InvalidDimensionsError(
        'Object must have x, y, and z properties'
      );
    }

    return Dimensions.create(x, y, z);
  }

  /**
   * Gets the X dimension
   */
  public get x(): number {
    return this._x;
  }

  /**
   * Gets the Y dimension
   */
  public get y(): number {
    return this._y;
  }

  /**
   * Gets the Z dimension
   */
  public get z(): number {
    return this._z;
  }

  /**
   * Gets the volume (x * y * z)
   */
  public get volume(): number {
    return this._x * this._y * this._z;
  }

  /**
   * Gets the maximum side length
   */
  public get maxSide(): number {
    return Math.max(this._x, this._y, this._z);
  }

  /**
   * Gets the minimum side length
   */
  public get minSide(): number {
    return Math.min(this._x, this._y, this._z);
  }

  /**
   * Gets the size category based on the maximum side
   *
   * @returns Size category value
   */
  public getSizeCategory(): SizeCategoryValue {
    const max = this.maxSide;

    if (max <= SIZE_THRESHOLDS.SMALL_MAX) {
      return 'small';
    }
    if (max <= SIZE_THRESHOLDS.MEDIUM_MAX) {
      return 'medium';
    }
    if (max <= SIZE_THRESHOLDS.LARGE_MAX) {
      return 'large';
    }
    return 'xlarge';
  }

  /**
   * Checks if this dimensions fits within another dimensions
   *
   * @param other - Dimensions to compare against
   * @returns true if this fits within other
   */
  public fitsWithin(other: Dimensions): boolean {
    return this._x <= other._x && this._y <= other._y && this._z <= other._z;
  }

  /**
   * Creates a new Dimensions scaled by a factor
   *
   * @param factor - Scale factor (must result in positive integers)
   * @returns New scaled Dimensions instance
   * @throws InvalidDimensionsError if scaled values are invalid
   */
  public scale(factor: number): Dimensions {
    const scaledX = Math.round(this._x * factor);
    const scaledY = Math.round(this._y * factor);
    const scaledZ = Math.round(this._z * factor);

    return Dimensions.create(scaledX, scaledY, scaledZ);
  }

  /**
   * Compares equality with another Dimensions
   *
   * @param other - Dimensions to compare with
   * @returns true if dimensions are equal
   */
  public equals(other: Dimensions): boolean {
    return this._x === other._x && this._y === other._y && this._z === other._z;
  }

  /**
   * Converts to a plain object
   *
   * @returns Object with x, y, z properties
   */
  public toObject(): { x: number; y: number; z: number } {
    return {
      x: this._x,
      y: this._y,
      z: this._z,
    };
  }

  /**
   * Returns compact string representation
   *
   * @returns String in format "XxYxZ"
   */
  public toString(): string {
    return `${this._x}x${this._y}x${this._z}`;
  }

  /**
   * Returns human-readable display string
   *
   * @returns String in format "X x Y x Z"
   */
  public toDisplayString(): string {
    return `${this._x} x ${this._y} x ${this._z}`;
  }
}
