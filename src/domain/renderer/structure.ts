/**
 * Structure Entity
 *
 * Represents a complete Minecraft structure with blocks.
 * This is an immutable entity following DDD principles.
 *
 * @example
 * const structure = Structure.create('My Castle', dimensions, palette, blocks);
 * const block = structure.getBlock(position);
 */

import { Position } from './position.js';
import { BlockState } from './block-state.js';
import { Block } from './block.js';
import { Dimensions } from '../value-objects/dimensions.js';

/**
 * Branded type for Structure ID
 */
export type StructureId = string & { readonly __brand: unique symbol };

/**
 * Creates a unique structure ID
 */
let structureIdCounter = 0;
export function createStructureId(): StructureId {
  structureIdCounter++;
  return `struct_${Date.now()}_${structureIdCounter}_${Math.random().toString(36).substring(2, 9)}` as StructureId;
}

/**
 * Structure metadata interface
 */
export interface StructureMetadata {
  readonly author?: string;
  readonly description?: string;
  readonly createdAt?: Date;
  readonly tags?: readonly string[];
}

/**
 * Custom error for invalid structure values
 */
export class InvalidStructureError extends Error {
  public override readonly name = 'InvalidStructureError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidStructureError.prototype);
  }
}

/**
 * Structure Entity
 *
 * Immutable entity representing a complete Minecraft structure.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Structure {
  private readonly _id: StructureId;
  private readonly _name: string;
  private readonly _dimensions: Dimensions;
  private readonly _palette: readonly BlockState[];
  private readonly _blocks: ReadonlyMap<string, Block>;
  private readonly _metadata: StructureMetadata | undefined;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(
    id: StructureId,
    name: string,
    dimensions: Dimensions,
    palette: readonly BlockState[],
    blocks: ReadonlyMap<string, Block>,
    metadata?: StructureMetadata
  ) {
    this._id = id;
    this._name = name;
    this._dimensions = dimensions;
    this._palette = Object.freeze([...palette]);
    this._blocks = blocks;
    this._metadata = metadata;

    Object.freeze(this);
  }

  /**
   * Creates a Structure instance
   *
   * @param name - Structure name
   * @param dimensions - Structure dimensions
   * @param palette - Block palette (unique block states)
   * @param blocks - Map of position keys to blocks
   * @param metadata - Optional structure metadata
   * @param id - Optional custom structure ID
   * @returns Structure instance
   * @throws InvalidStructureError if parameters are invalid
   */
  public static create(
    name: string,
    dimensions: Dimensions,
    palette: BlockState[],
    blocks: Map<string, Block>,
    metadata?: StructureMetadata,
    id?: StructureId
  ): Structure {
    if (!name || name.trim().length === 0) {
      throw new InvalidStructureError('Structure name cannot be empty');
    }
    if (!dimensions) {
      throw new InvalidStructureError('Structure dimensions cannot be null or undefined');
    }
    if (!blocks) {
      throw new InvalidStructureError('Structure blocks cannot be null or undefined');
    }

    return new Structure(
      id ?? createStructureId(),
      name.trim(),
      dimensions,
      palette,
      blocks,
      metadata
    );
  }

  /**
   * Creates an empty structure with given dimensions
   *
   * @param name - Structure name
   * @param dimensions - Structure dimensions
   * @returns Empty structure instance
   */
  public static empty(name: string, dimensions: Dimensions): Structure {
    return Structure.create(name, dimensions, [], new Map());
  }

  /**
   * Gets the structure ID
   */
  public get id(): StructureId {
    return this._id;
  }

  /**
   * Gets the structure name
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the structure dimensions
   */
  public get dimensions(): Dimensions {
    return this._dimensions;
  }

  /**
   * Gets the block palette
   */
  public get palette(): readonly BlockState[] {
    return this._palette;
  }

  /**
   * Gets the blocks map
   */
  public get blocks(): ReadonlyMap<string, Block> {
    return this._blocks;
  }

  /**
   * Gets the structure metadata
   */
  public get metadata(): StructureMetadata | undefined {
    return this._metadata;
  }

  /**
   * Gets the number of non-air blocks
   */
  public get blockCount(): number {
    return this._blocks.size;
  }

  /**
   * Gets block at position
   *
   * @param position - Block position
   * @returns Block at position or undefined
   */
  public getBlock(position: Position): Block | undefined {
    return this._blocks.get(position.toKey());
  }

  /**
   * Gets block by position key
   *
   * @param key - Position key "x,y,z"
   * @returns Block at position or undefined
   */
  public getBlockByKey(key: string): Block | undefined {
    return this._blocks.get(key);
  }

  /**
   * Checks if there is a block at position
   *
   * @param position - Block position
   * @returns true if block exists at position
   */
  public hasBlock(position: Position): boolean {
    return this._blocks.has(position.toKey());
  }

  /**
   * Checks if position is within structure bounds
   *
   * @param position - Position to check
   * @returns true if position is within bounds
   */
  public isWithinBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this._dimensions.x &&
      position.y >= 0 &&
      position.y < this._dimensions.y &&
      position.z >= 0 &&
      position.z < this._dimensions.z
    );
  }

  /**
   * Gets the center position of the structure
   *
   * @returns Center position
   */
  public getCenter(): Position {
    return Position.create(
      Math.floor(this._dimensions.x / 2),
      Math.floor(this._dimensions.y / 2),
      Math.floor(this._dimensions.z / 2)
    );
  }

  /**
   * Returns new Structure with added/updated block
   *
   * @param block - Block to add or update
   * @returns New Structure instance
   */
  public withBlock(block: Block): Structure {
    const newBlocks = new Map(this._blocks);
    newBlocks.set(block.getPositionKey(), block);

    return new Structure(
      this._id,
      this._name,
      this._dimensions,
      this._palette,
      newBlocks,
      this._metadata
    );
  }

  /**
   * Returns new Structure without block at position
   *
   * @param position - Position to remove block from
   * @returns New Structure instance
   */
  public withoutBlock(position: Position): Structure {
    const newBlocks = new Map(this._blocks);
    newBlocks.delete(position.toKey());

    return new Structure(
      this._id,
      this._name,
      this._dimensions,
      this._palette,
      newBlocks,
      this._metadata
    );
  }

  /**
   * Returns new Structure with updated name
   *
   * @param name - New structure name
   * @returns New Structure instance
   */
  public withName(name: string): Structure {
    return new Structure(
      this._id,
      name,
      this._dimensions,
      this._palette,
      this._blocks,
      this._metadata
    );
  }

  /**
   * Compares equality with another Structure (by ID)
   *
   * @param other - Structure to compare with
   * @returns true if structures have same ID
   */
  public equals(other: Structure): boolean {
    return this._id === other._id;
  }

  /**
   * Converts to serializable object
   *
   * @returns Plain object representation
   */
  public toObject(): {
    id: string;
    name: string;
    dimensions: { x: number; y: number; z: number };
    palette: string[];
    blockCount: number;
    metadata?: StructureMetadata | undefined;
  } {
    const result: {
      id: string;
      name: string;
      dimensions: { x: number; y: number; z: number };
      palette: string[];
      blockCount: number;
      metadata?: StructureMetadata | undefined;
    } = {
      id: this._id,
      name: this._name,
      dimensions: this._dimensions.toObject(),
      palette: this._palette.map((s) => s.toString()),
      blockCount: this.blockCount,
    };

    if (this._metadata !== undefined) {
      result.metadata = this._metadata;
    }

    return result;
  }

  /**
   * Returns human-readable string representation
   *
   * @returns String description
   */
  public toString(): string {
    return `Structure("${this._name}" ${this._dimensions.toString()}, ${this.blockCount} blocks)`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a Structure (alias for Structure.create)
 */
export function createStructure(
  name: string,
  dimensions: Dimensions,
  palette: BlockState[],
  blocks: Map<string, Block>,
  metadata?: StructureMetadata,
  id?: StructureId
): Structure {
  return Structure.create(name, dimensions, palette, blocks, metadata, id);
}
