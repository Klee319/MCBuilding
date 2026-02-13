/**
 * WebGLRendererPort Interface
 *
 * Port interface for WebGL-based 3D rendering of Minecraft structures.
 * This port abstracts the rendering implementation (e.g., Three.js) from the usecase layer.
 */

import type { Structure } from '../../../domain/renderer/structure.js';
import type { RenderState } from '../../../domain/renderer/render-state.js';
import type { Position } from '../../../domain/renderer/position.js';
import type { PortError } from '../types.js';

// ========================================
// Browser API Types (for compatibility without DOM lib)
// ========================================

/**
 * Minimal interface for HTMLCanvasElement
 * Used to avoid requiring the full DOM lib in the Usecase layer
 */
export interface CanvasElement {
  readonly width: number;
  readonly height: number;
  getContext(contextId: string, options?: unknown): unknown;
}

// ========================================
// Types
// ========================================

/**
 * Block face identifiers for raycast results
 */
export type BlockFace = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

/**
 * WebGL renderer initialization options
 */
export interface RendererOptions {
  /** Enable antialiasing (default: true) */
  readonly antialias?: boolean;

  /** Power preference for WebGL context */
  readonly powerPreference?: 'default' | 'high-performance' | 'low-power';

  /** Enable alpha channel (transparency) */
  readonly alpha?: boolean;

  /** Preserve drawing buffer for screenshots */
  readonly preserveDrawingBuffer?: boolean;

  /** Maximum texture size in pixels */
  readonly maxTextureSize?: number;
}

/**
 * Result of a raycast operation
 */
export interface RaycastResult {
  /** Position of the hit block */
  readonly position: Position;

  /** Face of the block that was hit */
  readonly face: BlockFace;

  /** Distance from camera to hit point */
  readonly distance: number;
}

/**
 * Result type for async operations
 */
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

// ========================================
// Port Interface
// ========================================

/**
 * WebGLRendererPort
 *
 * Interface for rendering structures using WebGL.
 *
 * @example
 * ```typescript
 * const result = await renderer.initialize(canvas, { antialias: true });
 * if (result.success) {
 *   renderer.render(structure, renderState);
 *
 *   const hit = renderer.raycast(mouseX, mouseY);
 *   if (hit) {
 *     console.log(`Hit block at ${hit.position.toKey()}, face: ${hit.face}`);
 *   }
 * }
 *
 * // Clean up
 * renderer.dispose();
 * ```
 */
export interface WebGLRendererPort {
  /**
   * Initializes the WebGL renderer with a canvas
   *
   * This method:
   * - Creates WebGL context
   * - Sets up scene, camera, and renderer
   * - Configures quality settings
   *
   * @param canvas - HTML canvas element to render to
   * @param options - Renderer configuration options
   * @returns Success or error
   *
   * @throws Never - errors are returned as Result
   *
   * Possible errors:
   * - GENERATION_FAILED: WebGL context creation failed
   */
  initialize(
    canvas: CanvasElement,
    options: RendererOptions
  ): Promise<Result<void, PortError>>;

  /**
   * Renders a structure with the given render state
   *
   * This method:
   * - Updates camera position/rotation
   * - Updates visible chunks
   * - Renders block meshes
   * - Highlights selected block if any
   *
   * @param structure - Structure to render
   * @param state - Current render state (camera, LOD, selection, etc.)
   */
  render(structure: Structure, state: RenderState): void;

  /**
   * Performs a raycast from screen coordinates
   *
   * @param screenX - X coordinate in screen space
   * @param screenY - Y coordinate in screen space
   * @returns Hit result with position and face, or null if no hit
   */
  raycast(screenX: number, screenY: number): RaycastResult | null;

  /**
   * Disposes of renderer resources
   *
   * This method:
   * - Releases WebGL context
   * - Disposes geometries and materials
   * - Cleans up textures
   *
   * Safe to call multiple times.
   */
  dispose(): void;
}
