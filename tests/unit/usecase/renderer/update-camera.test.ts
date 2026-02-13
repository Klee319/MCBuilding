/**
 * UpdateCameraUsecase Tests
 *
 * Tests for the update camera use case.
 * This is a pure function that updates camera state based on actions.
 */

import { describe, it, expect } from 'vitest';
import {
  UpdateCameraUsecase,
  createUpdateCameraUsecase,
  type CameraAction,
  type UpdateCameraInput,
} from '../../../../src/usecase/renderer/update-camera.js';
import { RenderState } from '../../../../src/domain/renderer/render-state.js';
import { Camera } from '../../../../src/domain/renderer/camera.js';
import { Position } from '../../../../src/domain/renderer/position.js';

describe('UpdateCameraUsecase', () => {
  let usecase: UpdateCameraUsecase;

  beforeEach(() => {
    usecase = createUpdateCameraUsecase();
  });

  describe('rotate action', () => {
    it('should rotate camera by pitch and yaw', () => {
      const state = RenderState.default();
      const action: CameraAction = {
        type: 'rotate',
        pitch: 10,
        yaw: 20,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.pitch).toBe(10);
      expect(result.camera.rotation.yaw).toBe(20);
    });

    it('should accumulate rotation changes', () => {
      const initialCamera = Camera.create(
        Position.create(100, 100, 100),
        Position.origin(),
        1.0,
        { pitch: 30, yaw: 45 }
      );
      const state = RenderState.default().withCamera(initialCamera);

      const action: CameraAction = {
        type: 'rotate',
        pitch: 10,
        yaw: 15,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.pitch).toBe(40);
      expect(result.camera.rotation.yaw).toBe(60);
    });

    it('should clamp pitch to -90 to 90 degrees', () => {
      const initialCamera = Camera.create(
        Position.create(100, 100, 100),
        Position.origin(),
        1.0,
        { pitch: 80, yaw: 0 }
      );
      const state = RenderState.default().withCamera(initialCamera);

      const action: CameraAction = {
        type: 'rotate',
        pitch: 20, // Would be 100, should clamp to 90
        yaw: 0,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.pitch).toBe(90);
    });

    it('should clamp negative pitch to -90', () => {
      const initialCamera = Camera.create(
        Position.create(100, 100, 100),
        Position.origin(),
        1.0,
        { pitch: -80, yaw: 0 }
      );
      const state = RenderState.default().withCamera(initialCamera);

      const action: CameraAction = {
        type: 'rotate',
        pitch: -20, // Would be -100, should clamp to -90
        yaw: 0,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.pitch).toBe(-90);
    });

    it('should wrap yaw to 0-360 range', () => {
      const state = RenderState.default();

      const action: CameraAction = {
        type: 'rotate',
        pitch: 0,
        yaw: 400, // Should wrap to 40
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.yaw).toBe(40);
    });

    it('should handle negative yaw', () => {
      const state = RenderState.default();

      const action: CameraAction = {
        type: 'rotate',
        pitch: 0,
        yaw: -30, // Should wrap to 330
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.rotation.yaw).toBe(330);
    });
  });

  describe('zoom action', () => {
    it('should zoom in by delta', () => {
      const state = RenderState.default();
      const action: CameraAction = {
        type: 'zoom',
        delta: 0.5,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.zoom).toBeGreaterThan(state.camera.zoom);
    });

    it('should zoom out by negative delta', () => {
      const state = RenderState.default();
      const action: CameraAction = {
        type: 'zoom',
        delta: -0.3,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.zoom).toBeLessThan(state.camera.zoom);
    });

    it('should not zoom below minimum (0.1)', () => {
      const initialCamera = Camera.create(
        Position.create(100, 100, 100),
        Position.origin(),
        0.2,
        { pitch: 0, yaw: 0 }
      );
      const state = RenderState.default().withCamera(initialCamera);

      const action: CameraAction = {
        type: 'zoom',
        delta: -0.5, // Would be -0.3, should clamp to 0.1
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.zoom).toBeGreaterThanOrEqual(0.1);
    });

    it('should handle large zoom values', () => {
      const state = RenderState.default();
      const action: CameraAction = {
        type: 'zoom',
        delta: 10,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.zoom).toBeGreaterThan(10);
    });
  });

  describe('pan action', () => {
    it('should pan camera by x and y delta', () => {
      const state = RenderState.default();
      const originalPosition = state.camera.position;

      const action: CameraAction = {
        type: 'pan',
        x: 10,
        y: 5,
      };

      const result = usecase.execute({ currentState: state, action });

      // Position should have changed
      expect(result.camera.position.equals(originalPosition)).toBe(false);
    });

    it('should pan both position and target', () => {
      const state = RenderState.default();
      const originalTarget = state.camera.target;

      const action: CameraAction = {
        type: 'pan',
        x: 10,
        y: 5,
      };

      const result = usecase.execute({ currentState: state, action });

      // Target should have changed along with position
      expect(result.camera.target.equals(originalTarget)).toBe(false);
    });

    it('should handle negative pan values', () => {
      const state = RenderState.default();
      const action: CameraAction = {
        type: 'pan',
        x: -20,
        y: -10,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result).toBeDefined();
      expect(result.camera).toBeDefined();
    });

    it('should handle zero pan values', () => {
      const state = RenderState.default();
      const originalCamera = state.camera;

      const action: CameraAction = {
        type: 'pan',
        x: 0,
        y: 0,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result.camera.position.equals(originalCamera.position)).toBe(true);
    });
  });

  describe('reset action', () => {
    it('should reset camera to default state', () => {
      const modifiedCamera = Camera.create(
        Position.create(500, 500, 500),
        Position.create(100, 100, 100),
        3.0,
        { pitch: 45, yaw: 180 }
      );
      const state = RenderState.default().withCamera(modifiedCamera);

      const action: CameraAction = {
        type: 'reset',
      };

      const result = usecase.execute({ currentState: state, action });

      const defaultCamera = Camera.default();
      expect(result.camera.zoom).toBe(defaultCamera.zoom);
      expect(result.camera.rotation.pitch).toBe(defaultCamera.rotation.pitch);
      expect(result.camera.rotation.yaw).toBe(defaultCamera.rotation.yaw);
    });

    it('should preserve non-camera state', () => {
      const position = Position.create(5, 5, 5);
      const state = RenderState.default().withSelectedBlock(position);

      const action: CameraAction = {
        type: 'reset',
      };

      const result = usecase.execute({ currentState: state, action });

      // Selected block should be preserved
      expect(result.selectedBlock?.equals(position)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should not mutate input state', () => {
      const state = RenderState.default();
      const originalZoom = state.camera.zoom;
      const originalPitch = state.camera.rotation.pitch;

      const action: CameraAction = {
        type: 'rotate',
        pitch: 45,
        yaw: 90,
      };

      usecase.execute({ currentState: state, action });

      // Original state should be unchanged
      expect(state.camera.zoom).toBe(originalZoom);
      expect(state.camera.rotation.pitch).toBe(originalPitch);
    });

    it('should return new state instance', () => {
      const state = RenderState.default();

      const action: CameraAction = {
        type: 'zoom',
        delta: 0.1,
      };

      const result = usecase.execute({ currentState: state, action });

      expect(result).not.toBe(state);
    });
  });
});

describe('CameraAction', () => {
  it('should define rotate action', () => {
    const action: CameraAction = {
      type: 'rotate',
      pitch: 10,
      yaw: 20,
    };

    expect(action.type).toBe('rotate');
    expect(action.pitch).toBe(10);
    expect(action.yaw).toBe(20);
  });

  it('should define zoom action', () => {
    const action: CameraAction = {
      type: 'zoom',
      delta: 0.5,
    };

    expect(action.type).toBe('zoom');
    expect(action.delta).toBe(0.5);
  });

  it('should define pan action', () => {
    const action: CameraAction = {
      type: 'pan',
      x: 10,
      y: 5,
    };

    expect(action.type).toBe('pan');
    expect(action.x).toBe(10);
    expect(action.y).toBe(5);
  });

  it('should define reset action', () => {
    const action: CameraAction = {
      type: 'reset',
    };

    expect(action.type).toBe('reset');
  });
});

describe('UpdateCameraInput', () => {
  it('should contain current state and action', () => {
    const state = RenderState.default();
    const action: CameraAction = { type: 'reset' };

    const input: UpdateCameraInput = {
      currentState: state,
      action,
    };

    expect(input.currentState).toBe(state);
    expect(input.action).toBe(action);
  });
});
