/**
 * LodLevel Value Object
 *
 * Represents Level of Detail for rendering optimization.
 * This is an immutable value object following DDD principles.
 *
 * LOD Levels:
 * - 0: Full detail (1 block = 1 rendered unit)
 * - 1: 2x2x2 blocks merged (8 blocks = 1 rendered unit)
 * - 2: 4x4x4 blocks merged (64 blocks = 1 rendered unit)
 * - 3: 8x8x8 blocks merged (512 blocks = 1 rendered unit)
 *
 * @example
 * const lod = LodLevel.fromDistance(150);
 * const blockSize = lod.blockSize; // 4
 */

/**
 * Valid LOD level values
 */
export const LOD_LEVEL_VALUES = [0, 1, 2, 3] as const;

/**
 * Type representing valid LOD level values
 */
export type LodLevelValue = (typeof LOD_LEVEL_VALUES)[number];

/**
 * Distance thresholds for LOD levels
 */
const LOD_DISTANCE_THRESHOLDS = {
  LOD_0_MAX: 50,
  LOD_1_MAX: 100,
  LOD_2_MAX: 200,
} as const;

/**
 * Block sizes for each LOD level
 */
const BLOCK_SIZES: Record<LodLevelValue, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
};

/**
 * Custom error for invalid LOD level values
 */
export class InvalidLodLevelError extends Error {
  public override readonly name = 'InvalidLodLevelError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidLodLevelError.prototype);
  }
}

/**
 * Singleton instances for each LOD level
 */
const lodInstances: Map<LodLevelValue, LodLevel> = new Map();

/**
 * LodLevel Value Object
 *
 * Immutable value object representing Level of Detail.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class LodLevel {
  private readonly _value: LodLevelValue;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: LodLevelValue) {
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid LOD level
   */
  public static isValid(value: number): value is LodLevelValue {
    return LOD_LEVEL_VALUES.includes(value as LodLevelValue);
  }

  /**
   * Creates a LodLevel instance
   *
   * @param value - LOD level value (0, 1, 2, or 3)
   * @returns LodLevel instance
   * @throws InvalidLodLevelError if value is invalid
   */
  public static create(value: LodLevelValue): LodLevel {
    if (!LodLevel.isValid(value)) {
      throw new InvalidLodLevelError(
        `Invalid LOD level: "${value}". Valid values are 0, 1, 2, or 3.`
      );
    }

    // Return cached singleton instance
    if (!lodInstances.has(value)) {
      lodInstances.set(value, new LodLevel(value));
    }
    return lodInstances.get(value)!;
  }

  /**
   * Returns full detail LOD level (0) as singleton
   */
  public static full(): LodLevel {
    return LodLevel.create(0);
  }

  /**
   * Determines LOD level from distance to camera
   *
   * @param distance - Distance to camera in blocks
   * @returns Appropriate LodLevel instance
   * @throws InvalidLodLevelError if distance is negative
   */
  public static fromDistance(distance: number): LodLevel {
    if (distance < 0) {
      throw new InvalidLodLevelError(
        `Invalid distance: "${distance}". Distance cannot be negative.`
      );
    }

    if (distance < LOD_DISTANCE_THRESHOLDS.LOD_0_MAX) {
      return LodLevel.create(0);
    }
    if (distance < LOD_DISTANCE_THRESHOLDS.LOD_1_MAX) {
      return LodLevel.create(1);
    }
    if (distance < LOD_DISTANCE_THRESHOLDS.LOD_2_MAX) {
      return LodLevel.create(2);
    }
    return LodLevel.create(3);
  }

  /**
   * Gets the LOD level value
   */
  public get value(): LodLevelValue {
    return this._value;
  }

  /**
   * Gets the block size for this LOD level
   * LOD 0 = 1, LOD 1 = 2, LOD 2 = 4, LOD 3 = 8
   */
  public get blockSize(): number {
    return BLOCK_SIZES[this._value];
  }

  /**
   * Gets the number of blocks merged into one unit
   * LOD 0 = 1, LOD 1 = 8 (2^3), LOD 2 = 64 (4^3), LOD 3 = 512 (8^3)
   */
  public get blocksPerUnit(): number {
    const size = this.blockSize;
    return size * size * size;
  }

  /**
   * Checks if this is full detail (LOD 0)
   */
  public isFullDetail(): boolean {
    return this._value === 0;
  }

  /**
   * Checks if this is lowest detail (LOD 3)
   */
  public isLowestDetail(): boolean {
    return this._value === 3;
  }

  /**
   * Returns next higher LOD level (less detail)
   * Returns self if already at LOD 3
   */
  public increase(): LodLevel {
    if (this._value === 3) {
      return this;
    }
    return LodLevel.create((this._value + 1) as LodLevelValue);
  }

  /**
   * Returns next lower LOD level (more detail)
   * Returns self if already at LOD 0
   */
  public decrease(): LodLevel {
    if (this._value === 0) {
      return this;
    }
    return LodLevel.create((this._value - 1) as LodLevelValue);
  }

  /**
   * Compares equality with another LodLevel
   *
   * @param other - LodLevel to compare with
   * @returns true if LOD levels are equal
   */
  public equals(other: LodLevel): boolean {
    return this._value === other._value;
  }

  /**
   * Returns descriptive string representation
   *
   * @returns String description of LOD level
   */
  public toString(): string {
    const descriptions: Record<LodLevelValue, string> = {
      0: 'LOD 0 (Full Detail)',
      1: 'LOD 1 (2x2x2)',
      2: 'LOD 2 (4x4x4)',
      3: 'LOD 3 (8x8x8)',
    };
    return descriptions[this._value];
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a LodLevel (alias for LodLevel.create)
 */
export function createLodLevel(value: LodLevelValue): LodLevel {
  return LodLevel.create(value);
}

/**
 * Creates LodLevel from distance
 */
export function lodLevelFromDistance(distance: number): LodLevel {
  return LodLevel.fromDistance(distance);
}

/**
 * Gets block size for a LodLevel
 */
export function lodLevelToBlockSize(lod: LodLevel): number {
  return lod.blockSize;
}

/**
 * Converts LodLevel to string
 */
export function lodLevelToString(lod: LodLevel): string {
  return lod.toString();
}
