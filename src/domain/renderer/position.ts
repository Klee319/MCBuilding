/**
 * Position Value Object
 *
 * Represents a 3D coordinate (x, y, z) in Minecraft space.
 * This is an immutable value object following DDD principles.
 *
 * Unlike Dimensions, Position allows negative and zero values
 * since coordinates can be in any location in 3D space.
 *
 * @example
 * const pos = Position.create(10, 64, -20);
 * const key = pos.toKey(); // "10,64,-20"
 * const distance = pos.distanceTo(otherPos);
 */

/**
 * Custom error for invalid position values
 */
export class InvalidPositionError extends Error {
  public override readonly name = 'InvalidPositionError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidPositionError.prototype);
  }
}

/**
 * Validates that a value is a finite integer
 */
function isFiniteInteger(value: unknown): value is number {
  if (typeof value !== 'number') {
    return false;
  }
  if (!Number.isFinite(value)) {
    return false;
  }
  return Number.isInteger(value);
}

/**
 * Singleton origin position
 */
let originInstance: Position | null = null;

/**
 * Position Value Object
 *
 * Immutable value object representing 3D coordinates.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Position {
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

    Object.freeze(this);
  }

  /**
   * Validates if values are valid position coordinates (finite integers)
   */
  public static isValid(x: number, y: number, z: number): boolean {
    return isFiniteInteger(x) && isFiniteInteger(y) && isFiniteInteger(z);
  }

  /**
   * Creates a Position instance from numeric values
   *
   * @param x - X coordinate (finite integer)
   * @param y - Y coordinate (finite integer)
   * @param z - Z coordinate (finite integer)
   * @returns Position instance
   * @throws InvalidPositionError if any value is invalid
   */
  public static create(x: number, y: number, z: number): Position {
    if (!isFiniteInteger(x)) {
      throw new InvalidPositionError(
        `Invalid x coordinate: "${x}". Value must be a finite integer.`
      );
    }
    if (!isFiniteInteger(y)) {
      throw new InvalidPositionError(
        `Invalid y coordinate: "${y}". Value must be a finite integer.`
      );
    }
    if (!isFiniteInteger(z)) {
      throw new InvalidPositionError(
        `Invalid z coordinate: "${z}". Value must be a finite integer.`
      );
    }

    return new Position(x, y, z);
  }

  /**
   * Returns the origin position (0, 0, 0) as a singleton
   */
  public static origin(): Position {
    if (originInstance === null) {
      originInstance = new Position(0, 0, 0);
    }
    return originInstance;
  }

  /**
   * Creates a Position instance from an object
   *
   * @param obj - Object with x, y, z properties
   * @returns Position instance
   * @throws InvalidPositionError if object is invalid
   */
  public static fromObject(obj: { x: number; y: number; z: number }): Position {
    if (obj === null || obj === undefined) {
      throw new InvalidPositionError('Cannot create Position from null or undefined');
    }

    const { x, y, z } = obj;

    if (x === undefined || y === undefined || z === undefined) {
      throw new InvalidPositionError(
        'Object must have x, y, and z properties'
      );
    }

    return Position.create(x, y, z);
  }

  /**
   * Gets the X coordinate
   */
  public get x(): number {
    return this._x;
  }

  /**
   * Gets the Y coordinate
   */
  public get y(): number {
    return this._y;
  }

  /**
   * Gets the Z coordinate
   */
  public get z(): number {
    return this._z;
  }

  /**
   * Adds another position to this one and returns a new Position
   *
   * @param other - Position to add
   * @returns New Position with summed coordinates
   */
  public add(other: Position): Position {
    return Position.create(
      this._x + other._x,
      this._y + other._y,
      this._z + other._z
    );
  }

  /**
   * Subtracts another position from this one and returns a new Position
   *
   * @param other - Position to subtract
   * @returns New Position with difference of coordinates
   */
  public subtract(other: Position): Position {
    return Position.create(
      this._x - other._x,
      this._y - other._y,
      this._z - other._z
    );
  }

  /**
   * Calculates Euclidean distance to another position
   *
   * @param other - Target position
   * @returns Euclidean distance
   */
  public distanceTo(other: Position): number {
    const dx = this._x - other._x;
    const dy = this._y - other._y;
    const dz = this._z - other._z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculates Manhattan distance to another position
   *
   * @param other - Target position
   * @returns Manhattan distance (sum of absolute differences)
   */
  public manhattanDistanceTo(other: Position): number {
    return (
      Math.abs(this._x - other._x) +
      Math.abs(this._y - other._y) +
      Math.abs(this._z - other._z)
    );
  }

  /**
   * Compares equality with another Position
   *
   * @param other - Position to compare with
   * @returns true if positions are equal
   */
  public equals(other: Position): boolean {
    return this._x === other._x && this._y === other._y && this._z === other._z;
  }

  /**
   * Converts to a string key for use in Maps/Sets
   *
   * @returns String in format "x,y,z"
   */
  public toKey(): string {
    return `${this._x},${this._y},${this._z}`;
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
   * Returns human-readable string representation
   *
   * @returns String in format "Position(x, y, z)"
   */
  public toString(): string {
    return `Position(${this._x}, ${this._y}, ${this._z})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a Position (alias for Position.create)
 */
export function createPosition(x: number, y: number, z: number): Position {
  return Position.create(x, y, z);
}

/**
 * Compares two positions for equality
 */
export function positionEquals(a: Position, b: Position): boolean {
  return a.equals(b);
}

/**
 * Converts position to string key
 */
export function positionToKey(pos: Position): string {
  return pos.toKey();
}

/**
 * Parses string key to Position
 *
 * @param key - String in format "x,y,z"
 * @returns Position instance
 * @throws InvalidPositionError if key format is invalid
 */
export function positionFromKey(key: string): Position {
  const parts = key.split(',');

  if (parts.length !== 3) {
    throw new InvalidPositionError(
      `Invalid position key format: "${key}". Expected format "x,y,z".`
    );
  }

  const x = Number(parts[0]);
  const y = Number(parts[1]);
  const z = Number(parts[2]);

  if (!isFiniteInteger(x) || !isFiniteInteger(y) || !isFiniteInteger(z)) {
    throw new InvalidPositionError(
      `Invalid position key values: "${key}". All values must be finite integers.`
    );
  }

  return Position.create(x, y, z);
}

/**
 * Adds two positions
 */
export function positionAdd(a: Position, b: Position): Position {
  return a.add(b);
}

/**
 * Subtracts two positions
 */
export function positionSubtract(a: Position, b: Position): Position {
  return a.subtract(b);
}

/**
 * Calculates Euclidean distance between two positions
 */
export function positionDistance(a: Position, b: Position): number {
  return a.distanceTo(b);
}

/**
 * Calculates Manhattan distance between two positions
 */
export function positionManhattanDistance(a: Position, b: Position): number {
  return a.manhattanDistanceTo(b);
}
