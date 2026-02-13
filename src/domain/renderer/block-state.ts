/**
 * BlockState Value Object
 *
 * Represents a Minecraft block's type and its properties.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const state = BlockState.create('minecraft:oak_stairs', { facing: 'north' });
 * const str = state.toString(); // "minecraft:oak_stairs[facing=north]"
 */

/**
 * Custom error for invalid block state values
 */
export class InvalidBlockStateError extends Error {
  public override readonly name = 'InvalidBlockStateError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidBlockStateError.prototype);
  }
}

/**
 * Air block types that should be considered transparent
 */
const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);

/**
 * Transparent blocks (non-opaque)
 */
const TRANSPARENT_BLOCKS = new Set([
  ...AIR_BLOCKS,
  'minecraft:glass',
  'minecraft:glass_pane',
  'minecraft:water',
  'minecraft:lava',
  'minecraft:ice',
  'minecraft:packed_ice',
  'minecraft:blue_ice',
  'minecraft:barrier',
  'minecraft:light',
  'minecraft:tinted_glass',
]);

/**
 * Partial blocks (stairs, slabs, fences, etc.)
 */
const PARTIAL_BLOCKS_PATTERNS = [
  '_stairs',
  '_slab',
  '_fence',
  '_wall',
  '_gate',
  '_door',
  '_trapdoor',
  '_pane',
  '_bars',
  '_sign',
  '_button',
  '_pressure_plate',
  '_carpet',
  '_banner',
  '_head',
  '_skull',
  '_pot',
  '_torch',
  '_lantern',
  '_chain',
  '_rod',
  '_anvil',
  '_bed',
  '_rail',
  '_hopper',
  '_cauldron',
  '_flower',
  '_sapling',
  '_mushroom',
  '_fern',
  '_grass',
  '_kelp',
  '_seagrass',
  '_coral',
  '_pickle',
  '_candle',
];

/**
 * Singleton air block state
 */
let airInstance: BlockState | null = null;

/**
 * Block state properties type
 */
export type BlockStateProperties = Readonly<Record<string, string>>;

/**
 * BlockState Value Object
 *
 * Immutable value object representing a Minecraft block state.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class BlockState {
  private readonly _name: string;
  private readonly _properties: BlockStateProperties;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(name: string, properties: BlockStateProperties) {
    this._name = name;
    this._properties = Object.freeze({ ...properties });

    Object.freeze(this);
  }

  /**
   * Validates if a name is a valid block state name
   */
  public static isValid(name: string): boolean {
    if (name === null || name === undefined) {
      return false;
    }
    if (typeof name !== 'string') {
      return false;
    }
    const trimmed = name.trim();
    return trimmed.length > 0;
  }

  /**
   * Normalizes block name to include namespace
   */
  private static normalizeName(name: string): string {
    if (!name.includes(':')) {
      return `minecraft:${name}`;
    }
    return name;
  }

  /**
   * Creates a BlockState instance
   *
   * @param name - Block name (e.g., "minecraft:stone" or "stone")
   * @param properties - Optional block state properties
   * @returns BlockState instance
   * @throws InvalidBlockStateError if name is invalid
   */
  public static create(
    name: string,
    properties: Record<string, string> = {}
  ): BlockState {
    if (!BlockState.isValid(name)) {
      throw new InvalidBlockStateError(
        `Invalid block state name: "${name}". Name cannot be empty.`
      );
    }

    const normalizedName = BlockState.normalizeName(name.trim());
    return new BlockState(normalizedName, properties);
  }

  /**
   * Returns the air block state as a singleton
   */
  public static air(): BlockState {
    if (airInstance === null) {
      airInstance = new BlockState('minecraft:air', {});
    }
    return airInstance;
  }

  /**
   * Parses a block state from string format
   *
   * @param str - Block state string (e.g., "minecraft:oak_stairs[facing=north]")
   * @returns BlockState instance
   * @throws InvalidBlockStateError if format is invalid
   */
  public static fromString(str: string): BlockState {
    if (!str || str.trim().length === 0) {
      throw new InvalidBlockStateError('Cannot parse empty block state string');
    }

    const trimmed = str.trim();
    const bracketIndex = trimmed.indexOf('[');

    if (bracketIndex === -1) {
      // No properties
      return BlockState.create(trimmed);
    }

    if (bracketIndex === 0) {
      throw new InvalidBlockStateError(
        `Invalid block state format: "${str}". Name cannot be empty.`
      );
    }

    const name = trimmed.substring(0, bracketIndex);
    const propsStr = trimmed.substring(bracketIndex + 1, trimmed.length - 1);
    const properties: Record<string, string> = {};

    if (propsStr.length > 0) {
      const propPairs = propsStr.split(',');
      for (const pair of propPairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          properties[key.trim()] = value.trim();
        }
      }
    }

    return BlockState.create(name, properties);
  }

  /**
   * Gets the block name (with namespace)
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the block properties
   */
  public get properties(): BlockStateProperties {
    return this._properties;
  }

  /**
   * Gets the namespace (e.g., "minecraft")
   */
  public get namespace(): string {
    return this._name.split(':')[0];
  }

  /**
   * Gets the block ID without namespace (e.g., "stone")
   */
  public get blockId(): string {
    return this._name.split(':')[1];
  }

  /**
   * Checks if this is an air block
   */
  public isAir(): boolean {
    return AIR_BLOCKS.has(this._name);
  }

  /**
   * Checks if this block is opaque (fully solid and non-transparent)
   */
  public isOpaque(): boolean {
    if (TRANSPARENT_BLOCKS.has(this._name)) {
      return false;
    }

    // Check for stained glass variants
    if (this._name.includes('glass')) {
      return false;
    }

    // Check for partial blocks
    const blockId = this.blockId;
    for (const pattern of PARTIAL_BLOCKS_PATTERNS) {
      if (blockId.includes(pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a property value
   *
   * @param key - Property key
   * @returns Property value or undefined
   */
  public getProperty(key: string): string | undefined {
    return this._properties[key];
  }

  /**
   * Checks if a property exists
   *
   * @param key - Property key
   * @returns true if property exists
   */
  public hasProperty(key: string): boolean {
    return key in this._properties;
  }

  /**
   * Returns new BlockState with updated property
   *
   * @param key - Property key
   * @param value - Property value
   * @returns New BlockState instance
   */
  public withProperty(key: string, value: string): BlockState {
    return new BlockState(this._name, {
      ...this._properties,
      [key]: value,
    });
  }

  /**
   * Compares equality with another BlockState
   *
   * @param other - BlockState to compare with
   * @returns true if block states are equal
   */
  public equals(other: BlockState): boolean {
    if (this._name !== other._name) {
      return false;
    }

    const thisKeys = Object.keys(this._properties);
    const otherKeys = Object.keys(other._properties);

    if (thisKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of thisKeys) {
      if (this._properties[key] !== other._properties[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Converts to string representation
   *
   * @returns String in format "namespace:block[prop1=val1,prop2=val2]"
   */
  public toString(): string {
    const keys = Object.keys(this._properties).sort();
    if (keys.length === 0) {
      return this._name;
    }

    const propsStr = keys.map((k) => `${k}=${this._properties[k]}`).join(',');
    return `${this._name}[${propsStr}]`;
  }

  /**
   * Converts to human-readable display name
   *
   * @returns Display name (e.g., "Oak Planks")
   */
  public toDisplayName(): string {
    const blockId = this.blockId;
    return blockId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a BlockState (alias for BlockState.create)
 */
export function createBlockState(
  name: string,
  properties?: Record<string, string>
): BlockState {
  return BlockState.create(name, properties);
}

/**
 * Compares two block states for equality
 */
export function blockStateEquals(a: BlockState, b: BlockState): boolean {
  return a.equals(b);
}

/**
 * Converts block state to string
 */
export function blockStateToString(state: BlockState): string {
  return state.toString();
}

/**
 * Parses string to BlockState
 */
export function parseBlockState(str: string): BlockState {
  return BlockState.fromString(str);
}
