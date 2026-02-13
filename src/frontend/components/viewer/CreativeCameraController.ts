/**
 * Camera controller with orbit-style left-click drag rotation + WASD/Space/Shift flying.
 */

type ThreeModule = typeof import('three');
type Camera = InstanceType<typeof import('three').PerspectiveCamera>;
type Euler = InstanceType<typeof import('three').Euler>;

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export class CreativeCameraController {
  private readonly camera: Camera;
  private readonly domElement: HTMLElement;
  private readonly euler: Euler;

  private readonly keys: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };

  private moveSpeed = 40;
  private readonly minSpeed = 1;
  private readonly maxSpeed = 100;
  private readonly lookSensitivity = 0.003;
  private isDragging = false;

  // Reusable vectors to avoid allocation in update loop
  private readonly moveDirection: InstanceType<typeof import('three').Vector3>;
  private readonly forward: InstanceType<typeof import('three').Vector3>;
  private readonly right: InstanceType<typeof import('three').Vector3>;

  // Bound handlers for cleanup
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;

  constructor(camera: Camera, domElement: HTMLElement, THREE: ThreeModule) {
    this.camera = camera;
    this.domElement = domElement;
    this.moveDirection = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleWheel = this.onWheel.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
  }

  async init(): Promise<void> {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  update(deltaTime: number): void {
    this.moveDirection.set(0, 0, 0);

    // Get camera forward direction (projected onto XZ plane for horizontal movement)
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    const forwardLength = this.forward.length();
    if (forwardLength > 0.001) {
      this.forward.divideScalar(forwardLength);
      this.right.crossVectors(this.forward, this.camera.up).normalize();
    } else {
      this.forward.set(0, 0, -1);
      this.right.set(1, 0, 0);
    }

    if (this.keys.forward) this.moveDirection.add(this.forward);
    if (this.keys.backward) this.moveDirection.sub(this.forward);
    if (this.keys.right) this.moveDirection.add(this.right);
    if (this.keys.left) this.moveDirection.sub(this.right);
    if (this.keys.up) this.moveDirection.y += 1;
    if (this.keys.down) this.moveDirection.y -= 1;

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
      const distance = this.moveSpeed * deltaTime;
      this.camera.position.addScaledVector(this.moveDirection, distance);
    }
  }

  getSpeed(): number {
    return this.moveSpeed;
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.domElement.removeEventListener('wheel', this.handleWheel);
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.resetKeys();
  }

  private onMouseDown(e: MouseEvent): void {
    // Left click (button 0) for orbit-style camera rotation
    if (e.button === 0) {
      this.isDragging = true;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = false;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const movementX = e.movementX ?? 0;
    const movementY = e.movementY ?? 0;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * this.lookSensitivity;
    this.euler.x -= movementY * this.lookSensitivity;
    // Clamp pitch to avoid flipping
    this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.forward = true; break;
      case 'KeyS': this.keys.backward = true; break;
      case 'KeyA': this.keys.left = true; break;
      case 'KeyD': this.keys.right = true; break;
      case 'Space': this.keys.up = true; e.preventDefault(); break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.down = true; break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.forward = false; break;
      case 'KeyS': this.keys.backward = false; break;
      case 'KeyA': this.keys.left = false; break;
      case 'KeyD': this.keys.right = false; break;
      case 'Space': this.keys.up = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.down = false; break;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    this.moveSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.moveSpeed + delta));
  }

  private resetKeys(): void {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
  }
}
