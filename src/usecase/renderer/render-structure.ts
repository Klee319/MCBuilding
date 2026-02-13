/**
 * RenderStructureUsecase
 *
 * Use case for rendering Minecraft structures to a canvas using WebGL.
 * Handles initialization, texture loading, caching, and rendering.
 *
 * @example
 * ```typescript
 * const usecase = createRenderStructureUsecase(renderer, textureLoader, cache);
 *
 * const result = await usecase.execute({
 *   structure,
 *   state: RenderState.default(),
 *   canvas: canvasElement,
 * });
 *
 * if (result.success) {
 *   console.log('Rendered successfully');
 * }
 *
 * // Clean up when done
 * usecase.dispose();
 * ```
 */

import type { Structure } from '../../domain/renderer/structure.js';
import type { RenderState } from '../../domain/renderer/render-state.js';
import type {
  WebGLRendererPort,
  RendererOptions,
  Result,
  CanvasElement,
} from '../ports/renderer/webgl-renderer-port.js';
import type { TextureLoaderPort } from '../ports/renderer/texture-loader-port.js';
import type { RenderCachePort } from '../ports/renderer/render-cache-port.js';
import type { PortError } from '../ports/types.js';

// ========================================
// Types
// ========================================

/**
 * Input for RenderStructure use case
 */
export interface RenderStructureInput {
  /** Structure to render */
  readonly structure: Structure;

  /** Current render state (camera, LOD, selection, etc.) */
  readonly state: RenderState;

  /** Canvas element to render to */
  readonly canvas: CanvasElement;
}

/**
 * RenderStructure use case interface
 */
export interface RenderStructureUsecase {
  /**
   * Renders a structure to the canvas
   *
   * On first call, initializes renderer and loads textures.
   * Subsequent calls only perform rendering.
   *
   * @param input - Structure, state, and canvas
   * @returns Success or error
   */
  execute(input: RenderStructureInput): Promise<Result<void, PortError>>;

  /**
   * Disposes of renderer resources
   *
   * Call when the component unmounts or when done rendering.
   */
  dispose(): void;
}

// ========================================
// Implementation
// ========================================

/**
 * Creates a RenderStructure use case instance
 *
 * @param renderer - WebGL renderer port implementation
 * @param textureLoader - Texture loader port implementation
 * @param cache - Render cache port implementation
 * @returns RenderStructure use case
 */
export function createRenderStructureUsecase(
  renderer: WebGLRendererPort,
  textureLoader: TextureLoaderPort,
  cache: RenderCachePort
): RenderStructureUsecase {
  let isInitialized = false;

  return {
    async execute(input: RenderStructureInput): Promise<Result<void, PortError>> {
      // Initialize renderer on first call
      if (!isInitialized) {
        const options: RendererOptions = {
          antialias: input.state.quality.antialiasing,
          powerPreference: 'high-performance',
          alpha: false,
          preserveDrawingBuffer: false,
        };

        const initResult = await renderer.initialize(input.canvas, options);
        if (!initResult.success) {
          return initResult;
        }

        // Load textures (required for rendering)
        const textureResult = await textureLoader.loadDefaultTextures();
        if (!textureResult.success) {
          return textureResult;
        }

        // Textures are loaded and passed to the renderer implementation
        // The renderer port implementation handles texture usage internally
        isInitialized = true;
      }

      // Render the structure
      renderer.render(input.structure, input.state);

      return {
        success: true,
        value: undefined,
      };
    },

    dispose(): void {
      if (isInitialized) {
        renderer.dispose();
        cache.clear();
        isInitialized = false;
      }
    },
  };
}
