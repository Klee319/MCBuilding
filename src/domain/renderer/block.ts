/**
 * Block Entity
 *
 * Represents an individual Minecraft block with position, state, and light level.
 * This is an immutable entity following DDD principles.
 *
 * @example
 * const block = Block.create(position, BlockState.create('minecraft:stone'));
 * const lit = block.withLightLevel(15);
 */

import { Position } from './position.js';
import { BlockState } from './block-state.js';

/**
 * Branded type for Block ID
 */
export type BlockId = string & { readonly __brand: unique symbol };

/**
 * Creates a unique block ID
 */
let blockIdCounter = 0;
export function createBlockId(): BlockId {
  blockIdCounter++;
  return `block_${Date.now()}_${blockIdCounter}_${Math.random().toString(36).substring(2, 9)}` as BlockId;
}

/**
 * Custom error for invalid block values
 */
export class InvalidBlockError extends Error {
  public override readonly name = 'InvalidBlockError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidBlockError.prototype);
  }
}

/**
 * Validates light level (0-15)
 */
function isValidLightLevel(level: number): boolean {
  if (typeof level !== 'number') {
    return false;
  }
  if (!Number.isInteger(level)) {
    return false;
  }
  return level >= 0 && level <= 15;
}

/**
 * Block Entity
 *
 * Immutable entity representing a single block in a structure.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Block {
  private readonly _id: BlockId;
  private readonly _position: Position;
  private readonly _state: BlockState;
  private readonly _lightLevel: number;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(
    id: BlockId,
    position: Position,
    state: BlockState,
    lightLevel: number
  ) {
    this._id = id;
    this._position = position;
    this._state = state;
    this._lightLevel = lightLevel;

    Object.freeze(this);
  }

  /**
   * Creates a Block instance
   *
   * @param position - Block position in structure
   * @param state - Block state (type and properties)
   * @param lightLevel - Light level (0-15, default 0)
   * @param id - Optional custom block ID
   * @returns Block instance
   * @throws InvalidBlockError if parameters are invalid
   */
  public static create(
    position: Position,
    state: BlockState,
    lightLevel: number = 0,
    id?: BlockId
  ): Block {
    if (!position) {
      throw new InvalidBlockError('Block position cannot be null or undefined');
    }
    if (!state) {
      throw new InvalidBlockError('Block state cannot be null or undefined');
    }
    if (!isValidLightLevel(lightLevel)) {
      throw new InvalidBlockError(
        `Invalid light level: "${lightLevel}". Must be an integer between 0 and 15.`
      );
    }

    return new Block(id ?? createBlockId(), position, state, lightLevel);
  }

  /**
   * Creates an air block at the given position
   *
   * @param position - Block position
   * @returns Air block instance
   */
  public static air(position: Position): Block {
    return Block.create(position, BlockState.air(), 0);
  }

  /**
   * Gets the block ID
   */
  public get id(): BlockId {
    return this._id;
  }

  /**
   * Gets the block position
   */
  public get position(): Position {
    return this._position;
  }

  /**
   * Gets the block state
   */
  public get state(): BlockState {
    return this._state;
  }

  /**
   * Gets the light level
   */
  public get lightLevel(): number {
    return this._lightLevel;
  }

  /**
   * Checks if this is an air block
   */
  public isAir(): boolean {
    return this._state.isAir();
  }

  /**
   * Checks if this block is opaque
   */
  public isOpaque(): boolean {
    return this._state.isOpaque();
  }

  /**
   * Returns new Block with updated state
   *
   * @param state - New block state
   * @returns New Block instance
   */
  public withState(state: BlockState): Block {
    return new Block(this._id, this._position, state, this._lightLevel);
  }

  /**
   * Returns new Block with updated light level
   *
   * @param lightLevel - New light level (0-15)
   * @returns New Block instance
   * @throws InvalidBlockError if light level is invalid
   */
  public withLightLevel(lightLevel: number): Block {
    if (!isValidLightLevel(lightLevel)) {
      throw new InvalidBlockError(
        `Invalid light level: "${lightLevel}". Must be an integer between 0 and 15.`
      );
    }
    return new Block(this._id, this._position, this._state, lightLevel);
  }

  /**
   * Gets position as string key
   *
   * @returns Position key string "x,y,z"
   */
  public getPositionKey(): string {
    return this._position.toKey();
  }

  /**
   * Compares equality with another Block (by ID)
   *
   * @param other - Block to compare with
   * @returns true if blocks have same ID
   */
  public equals(other: Block): boolean {
    return this._id === other._id;
  }

  /**
   * Converts to serializable object
   *
   * @returns Plain object representation
   */
  public toObject(): {
    id: string;
    position: { x: number; y: number; z: number };
    state: string;
    lightLevel: number;
  } {
    return {
      id: this._id,
      position: this._position.toObject(),
      state: this._state.toString(),
      lightLevel: this._lightLevel,
    };
  }

  /**
   * Returns human-readable string representation
   *
   * @returns String description
   */
  public toString(): string {
    return `Block(${this._state.name} at ${this._position.toString()})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a Block (alias for Block.create)
 */
export function createBlock(
  position: Position,
  state: BlockState,
  lightLevel?: number,
  id?: BlockId
): Block {
  return Block.create(position, state, lightLevel, id);
}
