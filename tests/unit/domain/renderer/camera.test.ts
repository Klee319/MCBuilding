/**
 * Camera Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Camera represents the viewer's camera state for 3D rendering.
 */
import { describe, it, expect } from 'vitest';
import {
  Camera,
  InvalidCameraError,
  createCamera,
  CameraRotation,
} from '../../../../src/domain/renderer/camera';
import { Position } from '../../../../src/domain/renderer/position';

describe('Camera Value Object', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('Camera.create()', () => {
    it('should create Camera with valid parameters', () => {
      const position = Position.create(0, 100, 0);
      const target = Position.create(50, 50, 50);
      const camera = Camera.create(position, target, 1.0, { pitch: 0, yaw: 0 });

      expect(camera).toBeInstanceOf(Camera);
      expect(camera.position.equals(position)).toBe(true);
      expect(camera.target.equals(target)).toBe(true);
      expect(camera.zoom).toBe(1.0);
      expect(camera.rotation.pitch).toBe(0);
      expect(camera.rotation.yaw).toBe(0);
    });

    it('should create Camera with different zoom levels', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);

      const camera1 = Camera.create(position, target, 0.5, { pitch: 0, yaw: 0 });
      const camera2 = Camera.create(position, target, 2.0, { pitch: 0, yaw: 0 });

      expect(camera1.zoom).toBe(0.5);
      expect(camera2.zoom).toBe(2.0);
    });

    it('should create Camera with rotation values', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);
      const camera = Camera.create(position, target, 1.0, { pitch: 45, yaw: 90 });

      expect(camera.rotation.pitch).toBe(45);
      expect(camera.rotation.yaw).toBe(90);
    });

    it('should throw InvalidCameraError for invalid zoom (zero)', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);

      expect(() => Camera.create(position, target, 0, { pitch: 0, yaw: 0 })).toThrow(InvalidCameraError);
    });

    it('should throw InvalidCameraError for invalid zoom (negative)', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);

      expect(() => Camera.create(position, target, -1, { pitch: 0, yaw: 0 })).toThrow(InvalidCameraError);
    });

    it('should throw InvalidCameraError for NaN zoom', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);

      expect(() => Camera.create(position, target, NaN, { pitch: 0, yaw: 0 })).toThrow(InvalidCameraError);
    });

    it('should throw InvalidCameraError for null position', () => {
      const target = Position.create(0, 0, 0);

      expect(() => Camera.create(null as unknown as Position, target, 1.0, { pitch: 0, yaw: 0 })).toThrow(InvalidCameraError);
    });

    it('should throw InvalidCameraError for null target', () => {
      const position = Position.create(0, 0, 0);

      expect(() => Camera.create(position, null as unknown as Position, 1.0, { pitch: 0, yaw: 0 })).toThrow(InvalidCameraError);
    });
  });

  describe('Camera.default()', () => {
    it('should return default camera state', () => {
      const camera = Camera.default();

      expect(camera).toBeInstanceOf(Camera);
      expect(camera.zoom).toBe(1.0);
      expect(camera.rotation.pitch).toBe(0);
      expect(camera.rotation.yaw).toBe(0);
    });

    it('should position camera to view origin', () => {
      const camera = Camera.default();

      // Default camera should be positioned to view (0,0,0)
      expect(camera.target.equals(Position.origin())).toBe(true);
    });
  });

  describe('Camera.forStructure()', () => {
    it('should create camera positioned to view entire structure', () => {
      const structureCenter = Position.create(50, 50, 50);
      const maxDimension = 100;
      const camera = Camera.forStructure(structureCenter, maxDimension);

      expect(camera.target.equals(structureCenter)).toBe(true);
      expect(camera.zoom).toBeGreaterThan(0);
    });

    it('should adjust zoom based on structure size', () => {
      const center = Position.create(0, 0, 0);

      const smallCamera = Camera.forStructure(center, 50);
      const largeCamera = Camera.forStructure(center, 200);

      // Larger structures should have smaller zoom (more zoomed out)
      expect(largeCamera.zoom).toBeLessThanOrEqual(smallCamera.zoom);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('position getter', () => {
    it('should return camera position', () => {
      const position = Position.create(10, 20, 30);
      const target = Position.create(0, 0, 0);
      const camera = Camera.create(position, target, 1.0, { pitch: 0, yaw: 0 });

      expect(camera.position.x).toBe(10);
      expect(camera.position.y).toBe(20);
      expect(camera.position.z).toBe(30);
    });
  });

  describe('target getter', () => {
    it('should return camera target', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(50, 50, 50);
      const camera = Camera.create(position, target, 1.0, { pitch: 0, yaw: 0 });

      expect(camera.target.x).toBe(50);
      expect(camera.target.y).toBe(50);
      expect(camera.target.z).toBe(50);
    });
  });

  describe('zoom getter', () => {
    it('should return zoom level', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);
      const camera = Camera.create(position, target, 1.5, { pitch: 0, yaw: 0 });

      expect(camera.zoom).toBe(1.5);
    });
  });

  describe('rotation getter', () => {
    it('should return rotation object', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);
      const camera = Camera.create(position, target, 1.0, { pitch: 30, yaw: 60 });

      expect(camera.rotation.pitch).toBe(30);
      expect(camera.rotation.yaw).toBe(60);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('withPosition()', () => {
    it('should return new Camera with updated position', () => {
      const camera = Camera.default();
      const newPosition = Position.create(200, 200, 200);
      const updated = camera.withPosition(newPosition);

      expect(updated.position.equals(newPosition)).toBe(true);
      expect(camera.position.equals(newPosition)).toBe(false);
    });

    it('should preserve other properties', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(50, 50, 50),
        1.5,
        { pitch: 30, yaw: 60 }
      );
      const updated = camera.withPosition(Position.create(100, 100, 100));

      expect(updated.target.x).toBe(50);
      expect(updated.zoom).toBe(1.5);
      expect(updated.rotation.pitch).toBe(30);
    });
  });

  describe('withTarget()', () => {
    it('should return new Camera with updated target', () => {
      const camera = Camera.default();
      const newTarget = Position.create(100, 100, 100);
      const updated = camera.withTarget(newTarget);

      expect(updated.target.equals(newTarget)).toBe(true);
    });
  });

  describe('withZoom()', () => {
    it('should return new Camera with updated zoom', () => {
      const camera = Camera.default();
      const updated = camera.withZoom(2.0);

      expect(updated.zoom).toBe(2.0);
      expect(camera.zoom).toBe(1.0);
    });

    it('should throw for invalid zoom', () => {
      const camera = Camera.default();

      expect(() => camera.withZoom(0)).toThrow(InvalidCameraError);
      expect(() => camera.withZoom(-1)).toThrow(InvalidCameraError);
    });
  });

  describe('withRotation()', () => {
    it('should return new Camera with updated rotation', () => {
      const camera = Camera.default();
      const updated = camera.withRotation({ pitch: 45, yaw: 90 });

      expect(updated.rotation.pitch).toBe(45);
      expect(updated.rotation.yaw).toBe(90);
      expect(camera.rotation.pitch).toBe(0);
    });
  });

  describe('zoomIn()', () => {
    it('should increase zoom by factor', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        1.0,
        { pitch: 0, yaw: 0 }
      );
      const zoomed = camera.zoomIn(0.5);

      expect(zoomed.zoom).toBe(1.5);
    });

    it('should use default factor if not provided', () => {
      const camera = Camera.default();
      const zoomed = camera.zoomIn();

      expect(zoomed.zoom).toBeGreaterThan(camera.zoom);
    });
  });

  describe('zoomOut()', () => {
    it('should decrease zoom by factor', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        2.0,
        { pitch: 0, yaw: 0 }
      );
      const zoomed = camera.zoomOut(0.5);

      expect(zoomed.zoom).toBe(1.5);
    });

    it('should not allow zoom below minimum', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        0.2,
        { pitch: 0, yaw: 0 }
      );
      const zoomed = camera.zoomOut(0.5);

      expect(zoomed.zoom).toBeGreaterThan(0);
    });
  });

  describe('rotate()', () => {
    it('should add to current rotation', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        1.0,
        { pitch: 10, yaw: 20 }
      );
      const rotated = camera.rotate(5, 10);

      expect(rotated.rotation.pitch).toBe(15);
      expect(rotated.rotation.yaw).toBe(30);
    });

    it('should clamp pitch within valid range', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        1.0,
        { pitch: 80, yaw: 0 }
      );
      const rotated = camera.rotate(20, 0);

      // Pitch should be clamped to -90 to 90
      expect(rotated.rotation.pitch).toBeLessThanOrEqual(90);
      expect(rotated.rotation.pitch).toBeGreaterThanOrEqual(-90);
    });

    it('should wrap yaw around 360 degrees', () => {
      const camera = Camera.create(
        Position.create(0, 0, 0),
        Position.create(0, 0, 0),
        1.0,
        { pitch: 0, yaw: 350 }
      );
      const rotated = camera.rotate(0, 20);

      // Yaw should wrap around
      expect(rotated.rotation.yaw).toBe(10);
    });
  });

  describe('pan()', () => {
    it('should move camera position and target', () => {
      const camera = Camera.default();
      const panned = camera.pan(10, 20);

      expect(panned.position.x).not.toBe(camera.position.x);
      expect(panned.target.x).not.toBe(camera.target.x);
    });
  });

  describe('equals()', () => {
    it('should return true for identical cameras', () => {
      const a = Camera.create(
        Position.create(10, 20, 30),
        Position.create(50, 50, 50),
        1.5,
        { pitch: 30, yaw: 60 }
      );
      const b = Camera.create(
        Position.create(10, 20, 30),
        Position.create(50, 50, 50),
        1.5,
        { pitch: 30, yaw: 60 }
      );

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different cameras', () => {
      const a = Camera.default();
      const b = a.withZoom(2.0);

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return serializable object', () => {
      const camera = Camera.create(
        Position.create(10, 20, 30),
        Position.create(50, 50, 50),
        1.5,
        { pitch: 30, yaw: 60 }
      );
      const obj = camera.toObject();

      expect(obj.position).toEqual({ x: 10, y: 20, z: 30 });
      expect(obj.target).toEqual({ x: 50, y: 50, z: 50 });
      expect(obj.zoom).toBe(1.5);
      expect(obj.rotation).toEqual({ pitch: 30, yaw: 60 });
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const camera = Camera.default();

      expect(Object.isFrozen(camera)).toBe(true);
    });

    it('should have frozen rotation', () => {
      const camera = Camera.default();

      expect(Object.isFrozen(camera.rotation)).toBe(true);
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createCamera()', () => {
    it('should create Camera (alias for Camera.create)', () => {
      const position = Position.create(0, 0, 0);
      const target = Position.create(0, 0, 0);
      const camera = createCamera(position, target, 1.0, { pitch: 0, yaw: 0 });

      expect(camera).toBeInstanceOf(Camera);
    });
  });

  // ========================================
  // InvalidCameraError
  // ========================================
  describe('InvalidCameraError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidCameraError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidCameraError('test');

      expect(error.name).toBe('InvalidCameraError');
    });
  });

  // ========================================
  // CameraRotation
  // ========================================
  describe('CameraRotation type', () => {
    it('should have pitch and yaw properties', () => {
      const rotation: CameraRotation = { pitch: 45, yaw: 90 };

      expect(rotation.pitch).toBe(45);
      expect(rotation.yaw).toBe(90);
    });
  });
});
