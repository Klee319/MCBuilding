/**
 * UpdateCameraUsecase
 *
 * Pure function use case for updating camera state based on user actions.
 * No external dependencies (ports) are needed as this is pure state transformation.
 *
 * @example
 * ```typescript
 * const usecase = createUpdateCameraUsecase();
 *
 * // Rotate camera
 * const rotated = usecase.execute({
 *   currentState: state,
 *   action: { type: 'rotate', pitch: 10, yaw: 20 }
 * });
 *
 * // Zoom in
 * const zoomed = usecase.execute({
 *   currentState: rotated,
 *   action: { type: 'zoom', delta: 0.5 }
 * });
 *
 * // Pan camera
 * const panned = usecase.execute({
 *   currentState: zoomed,
 *   action: { type: 'pan', x: 10, y: 5 }
 * });
 *
 * // Reset to default
 * const reset = usecase.execute({
 *   currentState: panned,
 *   action: { type: 'reset' }
 * });
 * ```
 */

import { RenderState } from '../../domain/renderer/render-state.js';
import { Camera } from '../../domain/renderer/camera.js';

// ========================================
// Types
// ========================================

/**
 * Camera rotation action
 */
export interface RotateAction {
  readonly type: 'rotate';
  /** Pitch delta in degrees (vertical rotation) */
  readonly pitch: number;
  /** Yaw delta in degrees (horizontal rotation) */
  readonly yaw: number;
}

/**
 * Camera zoom action
 */
export interface ZoomAction {
  readonly type: 'zoom';
  /** Zoom delta (positive = zoom in, negative = zoom out) */
  readonly delta: number;
}

/**
 * Camera pan action
 */
export interface PanAction {
  readonly type: 'pan';
  /** X delta in screen space */
  readonly x: number;
  /** Y delta in screen space */
  readonly y: number;
}

/**
 * Camera reset action
 */
export interface ResetAction {
  readonly type: 'reset';
}

/**
 * Union type of all camera actions
 */
export type CameraAction = RotateAction | ZoomAction | PanAction | ResetAction;

/**
 * Input for UpdateCamera use case
 */
export interface UpdateCameraInput {
  /** Current render state */
  readonly currentState: RenderState;

  /** Action to apply */
  readonly action: CameraAction;
}

/**
 * UpdateCamera use case interface
 */
export interface UpdateCameraUsecase {
  /**
   * Applies a camera action to the current state
   *
   * This is a pure function - it does not mutate the input state.
   *
   * @param input - Current state and action to apply
   * @returns New render state with updated camera
   */
  execute(input: UpdateCameraInput): RenderState;
}

// ========================================
// Constants
// ========================================

/** Minimum zoom level */
const MIN_ZOOM = 0.1;

// ========================================
// Implementation
// ========================================

/**
 * Creates an UpdateCamera use case instance
 *
 * @returns UpdateCamera use case
 */
export function createUpdateCameraUsecase(): UpdateCameraUsecase {
  return {
    execute(input: UpdateCameraInput): RenderState {
      const { currentState, action } = input;
      const camera = currentState.camera;

      switch (action.type) {
        case 'rotate': {
          const newCamera = camera.rotate(action.pitch, action.yaw);
          return currentState.withCamera(newCamera);
        }

        case 'zoom': {
          const newZoom = Math.max(MIN_ZOOM, camera.zoom + action.delta);
          const newCamera = camera.withZoom(newZoom);
          return currentState.withCamera(newCamera);
        }

        case 'pan': {
          const newCamera = camera.pan(action.x, action.y);
          return currentState.withCamera(newCamera);
        }

        case 'reset': {
          const defaultCamera = Camera.default();
          return currentState.withCamera(defaultCamera);
        }

        default: {
          // TypeScript exhaustive check
          const _exhaustive: never = action;
          return _exhaustive;
        }
      }
    },
  };
}
