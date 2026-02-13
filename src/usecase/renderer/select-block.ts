/**
 * SelectBlockUsecase
 *
 * Use case for selecting blocks by screen coordinates using raycasting.
 * Uses WebGLRendererPort for raycast operation.
 *
 * @example
 * ```typescript
 * const usecase = createSelectBlockUsecase(renderer);
 *
 * const result = usecase.execute({
 *   screenX: mouseX,
 *   screenY: mouseY,
 *   structure,
 * });
 *
 * if (result.block) {
 *   console.log(`Selected: ${result.block.state.name}`);
 *   console.log(`Face: ${result.face}`);
 * }
 * ```
 */

import type { Structure } from '../../domain/renderer/structure.js';
import type { Block } from '../../domain/renderer/block.js';
import type { WebGLRendererPort, BlockFace } from '../ports/renderer/webgl-renderer-port.js';

// ========================================
// Types
// ========================================

/**
 * Input for SelectBlock use case
 */
export interface SelectBlockInput {
  /** X coordinate in screen space */
  readonly screenX: number;

  /** Y coordinate in screen space */
  readonly screenY: number;

  /** Structure to select from */
  readonly structure: Structure;
}

/**
 * Output for SelectBlock use case
 */
export interface SelectBlockOutput {
  /** Selected block or null if no hit */
  readonly block: Block | null;

  /** Face of the block that was hit, or null if no hit */
  readonly face: BlockFace | null;
}

/**
 * SelectBlock use case interface
 */
export interface SelectBlockUsecase {
  /**
   * Selects a block at screen coordinates
   *
   * @param input - Screen coordinates and structure
   * @returns Selected block and face, or null values if no hit
   */
  execute(input: SelectBlockInput): SelectBlockOutput;
}

// ========================================
// Implementation
// ========================================

/**
 * Creates a SelectBlock use case instance
 *
 * @param renderer - WebGL renderer port implementation (for raycasting)
 * @returns SelectBlock use case
 */
export function createSelectBlockUsecase(renderer: WebGLRendererPort): SelectBlockUsecase {
  return {
    execute(input: SelectBlockInput): SelectBlockOutput {
      const { screenX, screenY, structure } = input;

      // Perform raycast
      const raycastResult = renderer.raycast(screenX, screenY);

      // No hit
      if (!raycastResult) {
        return {
          block: null,
          face: null,
        };
      }

      // Get block at hit position
      const block = structure.getBlock(raycastResult.position);

      // No block at position (shouldn't happen if raycast is correct, but handle it)
      if (!block) {
        return {
          block: null,
          face: null,
        };
      }

      return {
        block,
        face: raycastResult.face,
      };
    },
  };
}
