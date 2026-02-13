/**
 * RenderState Entity
 *
 * Represents the current rendering state for 3D visualization.
 * This is an immutable entity following DDD principles.
 *
 * @example
 * const state = RenderState.default();
 * const zoomed = state.withCamera(camera.zoomIn());
 * const selected = state.withSelectedBlock(position);
 */

import { Position } from './position.js';
import { Camera } from './camera.js';
import { LodLevel } from './lod-level.js';
import { ChunkCoord } from './chunk-coord.js';
import { RenderQuality } from './render-quality.js';

/**
 * Custom error for invalid render state values
 */
export class InvalidRenderStateError extends Error {
  public override readonly name = 'InvalidRenderStateError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidRenderStateError.prototype);
  }
}

/**
 * RenderState Entity
 *
 * Immutable entity representing the current rendering state.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class RenderState {
  private readonly _camera: Camera;
  private readonly _lodLevel: LodLevel;
  private readonly _selectedBlock: Position | null;
  private readonly _visibleChunks: readonly ChunkCoord[];
  private readonly _quality: RenderQuality;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(
    camera: Camera,
    lodLevel: LodLevel,
    selectedBlock: Position | null,
    visibleChunks: readonly ChunkCoord[],
    quality: RenderQuality
  ) {
    this._camera = camera;
    this._lodLevel = lodLevel;
    this._selectedBlock = selectedBlock;
    this._visibleChunks = Object.freeze([...visibleChunks]);
    this._quality = quality;

    Object.freeze(this);
  }

  /**
   * Creates a RenderState instance
   *
   * @param camera - Camera state
   * @param lodLevel - Level of detail
   * @param selectedBlock - Selected block position or null
   * @param visibleChunks - Array of visible chunk coordinates
   * @param quality - Render quality settings
   * @returns RenderState instance
   * @throws InvalidRenderStateError if parameters are invalid
   */
  public static create(
    camera: Camera,
    lodLevel: LodLevel,
    selectedBlock: Position | null,
    visibleChunks: ChunkCoord[],
    quality: RenderQuality
  ): RenderState {
    if (!camera) {
      throw new InvalidRenderStateError('Camera cannot be null or undefined');
    }
    if (!lodLevel) {
      throw new InvalidRenderStateError('LOD level cannot be null or undefined');
    }
    if (!visibleChunks) {
      throw new InvalidRenderStateError('Visible chunks cannot be null or undefined');
    }
    if (!quality) {
      throw new InvalidRenderStateError('Render quality cannot be null or undefined');
    }

    return new RenderState(camera, lodLevel, selectedBlock, visibleChunks, quality);
  }

  /**
   * Returns default render state
   */
  public static default(): RenderState {
    return new RenderState(
      Camera.default(),
      LodLevel.full(),
      null,
      [],
      RenderQuality.medium()
    );
  }

  /**
   * Gets the camera state
   */
  public get camera(): Camera {
    return this._camera;
  }

  /**
   * Gets the LOD level
   */
  public get lodLevel(): LodLevel {
    return this._lodLevel;
  }

  /**
   * Gets the selected block position (or null)
   */
  public get selectedBlock(): Position | null {
    return this._selectedBlock;
  }

  /**
   * Gets the visible chunks array
   */
  public get visibleChunks(): readonly ChunkCoord[] {
    return this._visibleChunks;
  }

  /**
   * Gets the render quality
   */
  public get quality(): RenderQuality {
    return this._quality;
  }

  /**
   * Returns new RenderState with updated camera
   *
   * @param camera - New camera state
   * @returns New RenderState instance
   */
  public withCamera(camera: Camera): RenderState {
    return new RenderState(
      camera,
      this._lodLevel,
      this._selectedBlock,
      this._visibleChunks,
      this._quality
    );
  }

  /**
   * Returns new RenderState with updated LOD level
   *
   * @param lodLevel - New LOD level
   * @returns New RenderState instance
   */
  public withLodLevel(lodLevel: LodLevel): RenderState {
    return new RenderState(
      this._camera,
      lodLevel,
      this._selectedBlock,
      this._visibleChunks,
      this._quality
    );
  }

  /**
   * Returns new RenderState with updated selected block
   *
   * @param position - New selected position or null
   * @returns New RenderState instance
   */
  public withSelectedBlock(position: Position | null): RenderState {
    return new RenderState(
      this._camera,
      this._lodLevel,
      position,
      this._visibleChunks,
      this._quality
    );
  }

  /**
   * Returns new RenderState with updated visible chunks
   *
   * @param visibleChunks - New visible chunks array
   * @returns New RenderState instance
   */
  public withVisibleChunks(visibleChunks: ChunkCoord[]): RenderState {
    return new RenderState(
      this._camera,
      this._lodLevel,
      this._selectedBlock,
      visibleChunks,
      this._quality
    );
  }

  /**
   * Returns new RenderState with updated quality
   *
   * @param quality - New render quality
   * @returns New RenderState instance
   */
  public withQuality(quality: RenderQuality): RenderState {
    return new RenderState(
      this._camera,
      this._lodLevel,
      this._selectedBlock,
      this._visibleChunks,
      quality
    );
  }

  /**
   * Checks if a block is selected
   */
  public hasSelection(): boolean {
    return this._selectedBlock !== null;
  }

  /**
   * Returns new RenderState with no selection
   */
  public clearSelection(): RenderState {
    return this.withSelectedBlock(null);
  }

  /**
   * Checks if a chunk is in the visible chunks list
   *
   * @param chunk - Chunk to check
   * @returns true if chunk is visible
   */
  public isChunkVisible(chunk: ChunkCoord): boolean {
    return this._visibleChunks.some((c) => c.equals(chunk));
  }

  /**
   * Converts to serializable object
   *
   * @returns Plain object representation
   */
  public toObject(): {
    camera: ReturnType<Camera['toObject']>;
    lodLevel: number;
    selectedBlock: { x: number; y: number; z: number } | null;
    visibleChunks: { x: number; y: number; z: number }[];
    quality: ReturnType<RenderQuality['toObject']>;
  } {
    return {
      camera: this._camera.toObject(),
      lodLevel: this._lodLevel.value,
      selectedBlock: this._selectedBlock?.toObject() ?? null,
      visibleChunks: this._visibleChunks.map((c) => c.toObject()),
      quality: this._quality.toObject(),
    };
  }

  /**
   * Returns human-readable string representation
   *
   * @returns String description
   */
  public toString(): string {
    const selection = this._selectedBlock
      ? `selected=${this._selectedBlock.toKey()}`
      : 'no selection';
    return `RenderState(LOD ${this._lodLevel.value}, ${this._visibleChunks.length} chunks, ${selection})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a RenderState (alias for RenderState.create)
 */
export function createRenderState(
  camera: Camera,
  lodLevel: LodLevel,
  selectedBlock: Position | null,
  visibleChunks: ChunkCoord[],
  quality: RenderQuality
): RenderState {
  return RenderState.create(camera, lodLevel, selectedBlock, visibleChunks, quality);
}
