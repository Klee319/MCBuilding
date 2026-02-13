/**
 * ChunkCoord Value Object
 *
 * Represents a chunk coordinate (16x16x16 block units).
 * This is an immutable value object following DDD principles.
 *
 * Chunks are used for:
 * - Efficient rendering (batch render by chunk)
 * - Memory management (load/unload chunks)
 * - Frustum culling (skip chunks outside view)
 *
 * @example
 * const chunk = ChunkCoord.fromPosition(position);
 * const key = chunk.toKey(); // "1,2,3"
 * const minPos = chunk.getMinPosition();
 */

import { Position } from './position.js';

/**
 * Size of a chunk in blocks (16x16x16)
 */
export const CHUNK_SIZE = 16;

/**
 * Custom error for invalid chunk coordinate values
 */
export class InvalidChunkCoordError extends Error {
  public override readonly name = 'InvalidChunkCoordError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidChunkCoordError.prototype);
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
 * ChunkCoord Value Object
 *
 * Immutable value object representing chunk coordinates.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class ChunkCoord {
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
   * Validates if values are valid chunk coordinates (finite integers)
   */
  public static isValid(x: number, y: number, z: number): boolean {
    return isFiniteInteger(x) && isFiniteInteger(y) && isFiniteInteger(z);
  }

  /**
   * Creates a ChunkCoord instance
   *
   * @param x - X chunk coordinate
   * @param y - Y chunk coordinate
   * @param z - Z chunk coordinate
   * @returns ChunkCoord instance
   * @throws InvalidChunkCoordError if coordinates are invalid
   */
  public static create(x: number, y: number, z: number): ChunkCoord {
    if (!isFiniteInteger(x)) {
      throw new InvalidChunkCoordError(
        `Invalid x chunk coordinate: "${x}". Must be a finite integer.`
      );
    }
    if (!isFiniteInteger(y)) {
      throw new InvalidChunkCoordError(
        `Invalid y chunk coordinate: "${y}". Must be a finite integer.`
      );
    }
    if (!isFiniteInteger(z)) {
      throw new InvalidChunkCoordError(
        `Invalid z chunk coordinate: "${z}". Must be a finite integer.`
      );
    }

    return new ChunkCoord(x, y, z);
  }

  /**
   * Creates a ChunkCoord from a block position
   *
   * @param position - Block position
   * @returns ChunkCoord containing the position
   */
  public static fromPosition(position: Position): ChunkCoord {
    const x = Math.floor(position.x / CHUNK_SIZE);
    const y = Math.floor(position.y / CHUNK_SIZE);
    const z = Math.floor(position.z / CHUNK_SIZE);

    return new ChunkCoord(x, y, z);
  }

  /**
   * Gets the X chunk coordinate
   */
  public get x(): number {
    return this._x;
  }

  /**
   * Gets the Y chunk coordinate
   */
  public get y(): number {
    return this._y;
  }

  /**
   * Gets the Z chunk coordinate
   */
  public get z(): number {
    return this._z;
  }

  /**
   * Gets the minimum block position in this chunk
   *
   * @returns Position at minimum corner of chunk
   */
  public getMinPosition(): Position {
    return Position.create(
      this._x * CHUNK_SIZE,
      this._y * CHUNK_SIZE,
      this._z * CHUNK_SIZE
    );
  }

  /**
   * Gets the maximum block position in this chunk
   *
   * @returns Position at maximum corner of chunk
   */
  public getMaxPosition(): Position {
    return Position.create(
      this._x * CHUNK_SIZE + CHUNK_SIZE - 1,
      this._y * CHUNK_SIZE + CHUNK_SIZE - 1,
      this._z * CHUNK_SIZE + CHUNK_SIZE - 1
    );
  }

  /**
   * Gets the center block position of this chunk
   *
   * @returns Position at center of chunk
   */
  public getCenterPosition(): Position {
    return Position.create(
      this._x * CHUNK_SIZE + CHUNK_SIZE / 2,
      this._y * CHUNK_SIZE + CHUNK_SIZE / 2,
      this._z * CHUNK_SIZE + CHUNK_SIZE / 2
    );
  }

  /**
   * Checks if a block position is within this chunk
   *
   * @param position - Block position to check
   * @returns true if position is within this chunk
   */
  public containsPosition(position: Position): boolean {
    const minX = this._x * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const minY = this._y * CHUNK_SIZE;
    const maxY = minY + CHUNK_SIZE - 1;
    const minZ = this._z * CHUNK_SIZE;
    const maxZ = minZ + CHUNK_SIZE - 1;

    return (
      position.x >= minX &&
      position.x <= maxX &&
      position.y >= minY &&
      position.y <= maxY &&
      position.z >= minZ &&
      position.z <= maxZ
    );
  }

  /**
   * Gets the 6 face-adjacent neighbor chunks
   *
   * @returns Array of 6 neighboring ChunkCoords
   */
  public getNeighbors(): ChunkCoord[] {
    return [
      new ChunkCoord(this._x - 1, this._y, this._z), // -X
      new ChunkCoord(this._x + 1, this._y, this._z), // +X
      new ChunkCoord(this._x, this._y - 1, this._z), // -Y
      new ChunkCoord(this._x, this._y + 1, this._z), // +Y
      new ChunkCoord(this._x, this._y, this._z - 1), // -Z
      new ChunkCoord(this._x, this._y, this._z + 1), // +Z
    ];
  }

  /**
   * Calculates distance to another chunk (in chunk units)
   *
   * @param other - Target chunk
   * @returns Euclidean distance in chunk units
   */
  public distanceTo(other: ChunkCoord): number {
    const dx = this._x - other._x;
    const dy = this._y - other._y;
    const dz = this._z - other._z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Compares equality with another ChunkCoord
   *
   * @param other - ChunkCoord to compare with
   * @returns true if coordinates are equal
   */
  public equals(other: ChunkCoord): boolean {
    return this._x === other._x && this._y === other._y && this._z === other._z;
  }

  /**
   * Converts to string key for use in Maps/Sets
   *
   * @returns String in format "x,y,z"
   */
  public toKey(): string {
    return `${this._x},${this._y},${this._z}`;
  }

  /**
   * Converts to plain object
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
   * @returns String in format "ChunkCoord(x, y, z)"
   */
  public toString(): string {
    return `ChunkCoord(${this._x}, ${this._y}, ${this._z})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a ChunkCoord (alias for ChunkCoord.create)
 */
export function createChunkCoord(x: number, y: number, z: number): ChunkCoord {
  return ChunkCoord.create(x, y, z);
}

/**
 * Creates ChunkCoord from block position
 */
export function chunkCoordFromPosition(position: Position): ChunkCoord {
  return ChunkCoord.fromPosition(position);
}

/**
 * Compares two chunk coordinates for equality
 */
export function chunkCoordEquals(a: ChunkCoord, b: ChunkCoord): boolean {
  return a.equals(b);
}

/**
 * Converts ChunkCoord to string key
 */
export function chunkCoordToKey(chunk: ChunkCoord): string {
  return chunk.toKey();
}

/**
 * Parses string key to ChunkCoord
 *
 * @param key - String in format "x,y,z"
 * @returns ChunkCoord instance
 * @throws InvalidChunkCoordError if key format is invalid
 */
export function chunkCoordFromKey(key: string): ChunkCoord {
  const parts = key.split(',');

  if (parts.length !== 3) {
    throw new InvalidChunkCoordError(
      `Invalid chunk coord key format: "${key}". Expected format "x,y,z".`
    );
  }

  const x = Number(parts[0]);
  const y = Number(parts[1]);
  const z = Number(parts[2]);

  if (!isFiniteInteger(x) || !isFiniteInteger(y) || !isFiniteInteger(z)) {
    throw new InvalidChunkCoordError(
      `Invalid chunk coord key values: "${key}". All values must be finite integers.`
    );
  }

  return ChunkCoord.create(x, y, z);
}
