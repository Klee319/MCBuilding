/**
 * Camera Value Object
 *
 * Represents the viewer's camera state for 3D rendering.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const camera = Camera.default();
 * const zoomed = camera.zoomIn(0.5);
 * const rotated = camera.rotate(10, 20);
 */

import { Position } from './position.js';

/**
 * Camera rotation interface
 */
export interface CameraRotation {
  readonly pitch: number; // -90 to 90 (vertical rotation)
  readonly yaw: number; // 0 to 360 (horizontal rotation)
}

/**
 * Custom error for invalid camera values
 */
export class InvalidCameraError extends Error {
  public override readonly name = 'InvalidCameraError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidCameraError.prototype);
  }
}

/**
 * Validates zoom value
 */
function isValidZoom(zoom: number): boolean {
  if (typeof zoom !== 'number') {
    return false;
  }
  if (!Number.isFinite(zoom)) {
    return false;
  }
  return zoom > 0;
}

/**
 * Clamps pitch to valid range (-90 to 90)
 */
function clampPitch(pitch: number): number {
  return Math.max(-90, Math.min(90, pitch));
}

/**
 * Wraps yaw to 0-360 range
 */
function wrapYaw(yaw: number): number {
  let normalized = yaw % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Default camera constants
 */
const DEFAULT_ZOOM = 1.0;
const MIN_ZOOM = 0.1;
const DEFAULT_ZOOM_STEP = 0.2;
const DEFAULT_CAMERA_DISTANCE = 100;

/**
 * Camera Value Object
 *
 * Immutable value object representing camera state.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Camera {
  private readonly _position: Position;
  private readonly _target: Position;
  private readonly _zoom: number;
  private readonly _rotation: CameraRotation;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(
    position: Position,
    target: Position,
    zoom: number,
    rotation: CameraRotation
  ) {
    this._position = position;
    this._target = target;
    this._zoom = zoom;
    this._rotation = Object.freeze({ ...rotation });

    Object.freeze(this);
  }

  /**
   * Creates a Camera instance
   *
   * @param position - Camera position
   * @param target - Look-at target position
   * @param zoom - Zoom level (must be positive)
   * @param rotation - Camera rotation (pitch, yaw)
   * @returns Camera instance
   * @throws InvalidCameraError if parameters are invalid
   */
  public static create(
    position: Position,
    target: Position,
    zoom: number,
    rotation: CameraRotation
  ): Camera {
    if (!position) {
      throw new InvalidCameraError('Camera position cannot be null or undefined');
    }
    if (!target) {
      throw new InvalidCameraError('Camera target cannot be null or undefined');
    }
    if (!isValidZoom(zoom)) {
      throw new InvalidCameraError(
        `Invalid zoom value: "${zoom}". Zoom must be a positive finite number.`
      );
    }

    return new Camera(
      position,
      target,
      zoom,
      {
        pitch: clampPitch(rotation.pitch),
        yaw: wrapYaw(rotation.yaw),
      }
    );
  }

  /**
   * Returns default camera state
   */
  public static default(): Camera {
    const position = Position.create(
      DEFAULT_CAMERA_DISTANCE,
      DEFAULT_CAMERA_DISTANCE,
      DEFAULT_CAMERA_DISTANCE
    );
    const target = Position.origin();

    return new Camera(position, target, DEFAULT_ZOOM, { pitch: 0, yaw: 0 });
  }

  /**
   * Creates camera positioned to view a structure
   *
   * @param structureCenter - Center of the structure
   * @param maxDimension - Maximum dimension of the structure
   * @returns Camera instance positioned to view the structure
   */
  public static forStructure(structureCenter: Position, maxDimension: number): Camera {
    // Calculate appropriate distance based on structure size
    const distance = Math.round(maxDimension * 1.5);
    const position = Position.create(
      structureCenter.x + distance,
      Math.round(structureCenter.y + distance * 0.5),
      structureCenter.z + distance
    );

    // Adjust zoom based on structure size (larger structures need smaller zoom)
    const zoom = Math.max(0.2, Math.min(2.0, 100 / maxDimension));

    return new Camera(
      position,
      structureCenter,
      zoom,
      { pitch: -30, yaw: 45 }
    );
  }

  /**
   * Gets the camera position
   */
  public get position(): Position {
    return this._position;
  }

  /**
   * Gets the camera target
   */
  public get target(): Position {
    return this._target;
  }

  /**
   * Gets the zoom level
   */
  public get zoom(): number {
    return this._zoom;
  }

  /**
   * Gets the rotation
   */
  public get rotation(): CameraRotation {
    return this._rotation;
  }

  /**
   * Returns new Camera with updated position
   *
   * @param position - New camera position
   * @returns New Camera instance
   */
  public withPosition(position: Position): Camera {
    return new Camera(position, this._target, this._zoom, this._rotation);
  }

  /**
   * Returns new Camera with updated target
   *
   * @param target - New target position
   * @returns New Camera instance
   */
  public withTarget(target: Position): Camera {
    return new Camera(this._position, target, this._zoom, this._rotation);
  }

  /**
   * Returns new Camera with updated zoom
   *
   * @param zoom - New zoom level
   * @returns New Camera instance
   * @throws InvalidCameraError if zoom is invalid
   */
  public withZoom(zoom: number): Camera {
    if (!isValidZoom(zoom)) {
      throw new InvalidCameraError(
        `Invalid zoom value: "${zoom}". Zoom must be a positive finite number.`
      );
    }
    return new Camera(this._position, this._target, zoom, this._rotation);
  }

  /**
   * Returns new Camera with updated rotation
   *
   * @param rotation - New rotation values
   * @returns New Camera instance
   */
  public withRotation(rotation: CameraRotation): Camera {
    return new Camera(
      this._position,
      this._target,
      this._zoom,
      {
        pitch: clampPitch(rotation.pitch),
        yaw: wrapYaw(rotation.yaw),
      }
    );
  }

  /**
   * Zooms in by a factor
   *
   * @param factor - Zoom increase amount (default: 0.2)
   * @returns New Camera instance
   */
  public zoomIn(factor: number = DEFAULT_ZOOM_STEP): Camera {
    const newZoom = this._zoom + factor;
    return new Camera(this._position, this._target, newZoom, this._rotation);
  }

  /**
   * Zooms out by a factor
   *
   * @param factor - Zoom decrease amount (default: 0.2)
   * @returns New Camera instance
   */
  public zoomOut(factor: number = DEFAULT_ZOOM_STEP): Camera {
    const newZoom = Math.max(MIN_ZOOM, this._zoom - factor);
    return new Camera(this._position, this._target, newZoom, this._rotation);
  }

  /**
   * Rotates camera by delta amounts
   *
   * @param deltaPitch - Pitch change in degrees
   * @param deltaYaw - Yaw change in degrees
   * @returns New Camera instance
   */
  public rotate(deltaPitch: number, deltaYaw: number): Camera {
    const newPitch = clampPitch(this._rotation.pitch + deltaPitch);
    const newYaw = wrapYaw(this._rotation.yaw + deltaYaw);

    return new Camera(
      this._position,
      this._target,
      this._zoom,
      { pitch: newPitch, yaw: newYaw }
    );
  }

  /**
   * Pans camera by screen-space delta
   *
   * @param deltaX - Horizontal pan amount
   * @param deltaY - Vertical pan amount
   * @returns New Camera instance
   */
  public pan(deltaX: number, deltaY: number): Camera {
    // Calculate pan direction based on current rotation
    const yawRad = (this._rotation.yaw * Math.PI) / 180;

    // Calculate right and up vectors
    const rightX = Math.cos(yawRad);
    const rightZ = -Math.sin(yawRad);

    // Apply pan to both position and target
    const panFactor = 0.1;
    const moveX = Math.round(rightX * deltaX * panFactor);
    const moveY = Math.round(deltaY * panFactor);
    const moveZ = Math.round(rightZ * deltaX * panFactor);

    const newPosition = Position.create(
      this._position.x + moveX,
      this._position.y + moveY,
      this._position.z + moveZ
    );

    const newTarget = Position.create(
      this._target.x + moveX,
      this._target.y + moveY,
      this._target.z + moveZ
    );

    return new Camera(newPosition, newTarget, this._zoom, this._rotation);
  }

  /**
   * Compares equality with another Camera
   *
   * @param other - Camera to compare with
   * @returns true if cameras are equal
   */
  public equals(other: Camera): boolean {
    return (
      this._position.equals(other._position) &&
      this._target.equals(other._target) &&
      this._zoom === other._zoom &&
      this._rotation.pitch === other._rotation.pitch &&
      this._rotation.yaw === other._rotation.yaw
    );
  }

  /**
   * Converts to serializable object
   *
   * @returns Plain object representation
   */
  public toObject(): {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
    rotation: CameraRotation;
  } {
    return {
      position: this._position.toObject(),
      target: this._target.toObject(),
      zoom: this._zoom,
      rotation: { ...this._rotation },
    };
  }

  /**
   * Returns human-readable string representation
   *
   * @returns String description
   */
  public toString(): string {
    return `Camera(pos=${this._position.toString()}, target=${this._target.toString()}, zoom=${this._zoom})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a Camera (alias for Camera.create)
 */
export function createCamera(
  position: Position,
  target: Position,
  zoom: number,
  rotation: CameraRotation
): Camera {
  return Camera.create(position, target, zoom, rotation);
}
