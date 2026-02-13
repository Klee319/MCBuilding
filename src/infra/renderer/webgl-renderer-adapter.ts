/**
 * WebGLRendererAdapter
 *
 * Implementation of WebGLRendererPort using Three.js for 3D rendering.
 * Provides WebGL-based rendering for Minecraft structures.
 *
 * @example
 * const renderer = new WebGLRendererAdapter();
 * await renderer.initialize(canvas, { antialias: true });
 * renderer.render(structure, state);
 */

import * as THREE from 'three';
import type {
  WebGLRendererPort,
  RendererOptions,
  RaycastResult,
  BlockFace,
  CanvasElement,
} from '../../usecase/ports/renderer/webgl-renderer-port.js';
import type { Structure } from '../../domain/renderer/structure.js';
import type { RenderState } from '../../domain/renderer/render-state.js';
import { Position } from '../../domain/renderer/position.js';
import type { Result } from '../../usecase/ports/renderer/nbt-parser-port.js';
import { PortError } from '../../usecase/ports/types.js';

// ========================================
// Result Helpers
// ========================================

function ok<T>(value: T): Result<T, PortError> {
  return { success: true, value };
}

function err<T>(code: PortError['code'], message: string): Result<T, PortError> {
  return { success: false, error: new PortError(code, message) };
}

// ========================================
// WebGLRendererAdapter
// ========================================

/**
 * WebGLRendererAdapter
 *
 * Three.js-based WebGL renderer for Minecraft structures.
 */
export class WebGLRendererAdapter implements WebGLRendererPort {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private raycaster: THREE.Raycaster | null = null;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private initialized: boolean = false;

  // Mesh storage for raycasting
  private blockMeshes: THREE.Object3D[] = [];

  /**
   * Initializes the WebGL renderer with a canvas
   *
   * @param canvas - HTML canvas element to render to
   * @param options - Renderer configuration options
   * @returns Success or error
   */
  async initialize(
    canvas: CanvasElement,
    options: RendererOptions
  ): Promise<Result<void, PortError>> {
    try {
      // Validate canvas
      if (!canvas) {
        return err('GENERATION_FAILED', 'Canvas element is required');
      }

      // Dispose existing renderer if any
      this.dispose();

      // Store canvas dimensions
      this.canvasWidth = canvas.width;
      this.canvasHeight = canvas.height;

      // Create WebGL renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas as HTMLCanvasElement,
        antialias: options.antialias ?? true,
        alpha: options.alpha ?? false,
        powerPreference: options.powerPreference ?? 'default',
        preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      });

      this.renderer.setSize(this.canvasWidth, this.canvasHeight);
      // Use 1 as default pixel ratio when window is not available (Node.js environment)
      const pixelRatio = typeof globalThis !== 'undefined' && 'devicePixelRatio' in globalThis
        ? (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1
        : 1;
      this.renderer.setPixelRatio(pixelRatio);

      // Create scene
      this.scene = new THREE.Scene();

      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75, // FOV
        this.canvasWidth / this.canvasHeight, // Aspect
        0.1, // Near
        1000 // Far
      );
      this.camera.position.set(32, 32, 32);
      this.camera.lookAt(0, 0, 0);

      // Create raycaster
      this.raycaster = new THREE.Raycaster();

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      this.scene.add(directionalLight);

      this.initialized = true;

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err('GENERATION_FAILED', `Failed to initialize WebGL: ${message}`);
    }
  }

  /**
   * Renders a structure with the given render state
   *
   * @param structure - Structure to render
   * @param state - Current render state (camera, LOD, selection, etc.)
   */
  render(structure: Structure, state: RenderState): void {
    if (!this.initialized || !this.renderer || !this.scene || !this.camera) {
      return;
    }

    // Update camera from state
    this.updateCamera(state);

    // Update structure meshes (simplified - real impl would be more efficient)
    this.updateStructureMeshes(structure, state);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Performs a raycast from screen coordinates
   *
   * @param screenX - X coordinate in screen space
   * @param screenY - Y coordinate in screen space
   * @returns Hit result with position and face, or null if no hit
   */
  raycast(screenX: number, screenY: number): RaycastResult | null {
    if (!this.initialized || !this.raycaster || !this.camera || !this.scene) {
      return null;
    }

    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const ndc = new THREE.Vector2(
      (screenX / this.canvasWidth) * 2 - 1,
      -(screenY / this.canvasHeight) * 2 + 1
    );

    // Update raycaster
    this.raycaster.setFromCamera(ndc, this.camera);

    // Perform raycast against block meshes
    const intersects = this.raycaster.intersectObjects(this.blockMeshes, true);

    if (intersects.length === 0) {
      return null;
    }

    const hit = intersects[0];

    // Extract block position from userData
    const userData = hit.object.userData as { blockPosition?: { x: number; y: number; z: number } };
    let position: Position;

    if (userData.blockPosition) {
      position = Position.create(
        Math.floor(userData.blockPosition.x),
        Math.floor(userData.blockPosition.y),
        Math.floor(userData.blockPosition.z)
      );
    } else {
      // Fallback: use hit point
      position = Position.create(
        Math.floor(hit.point.x),
        Math.floor(hit.point.y),
        Math.floor(hit.point.z)
      );
    }

    // Determine face from normal
    const face = this.normalToFace(hit.face?.normal);

    return {
      position,
      face,
      distance: hit.distance,
    };
  }

  /**
   * Disposes of renderer resources
   */
  dispose(): void {
    // Clear block meshes
    this.blockMeshes = [];

    // Clear scene
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.camera = null;
    this.raycaster = null;
    this.initialized = false;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Updates camera from render state
   */
  private updateCamera(state: RenderState): void {
    if (!this.camera) {
      return;
    }

    const cameraState = state.camera;

    // Update position
    this.camera.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );

    // Update rotation (convert from pitch/yaw to Euler angles)
    const rotation = cameraState.rotation;
    this.camera.rotation.set(
      rotation.pitch * (Math.PI / 180),
      rotation.yaw * (Math.PI / 180),
      0
    );

    // Update aspect and projection (FOV is not part of Camera domain object)
    this.camera.updateProjectionMatrix();
  }

  /**
   * Updates structure meshes (simplified implementation)
   */
  private updateStructureMeshes(structure: Structure, state: RenderState): void {
    if (!this.scene) {
      return;
    }

    // For simplicity, we only update on first render
    // Real implementation would track changes and update incrementally
    if (this.blockMeshes.length > 0) {
      return;
    }

    // Create a simple geometry for all blocks
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Create meshes for each block
    for (const [, block] of structure.blocks) {
      const color = this.getBlockColor(block.state.name);
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(blockGeometry, material);

      mesh.position.set(
        block.position.x + 0.5,
        block.position.y + 0.5,
        block.position.z + 0.5
      );

      mesh.userData = {
        blockPosition: {
          x: block.position.x,
          y: block.position.y,
          z: block.position.z,
        },
      };

      this.scene.add(mesh);
      this.blockMeshes.push(mesh);
    }

    // Highlight selected block if any
    if (state.selectedBlock) {
      this.highlightBlock(state.selectedBlock);
    }
  }

  /**
   * Gets a simple color for a block
   */
  private getBlockColor(blockName: string): number {
    const colorMap: Record<string, number> = {
      'minecraft:stone': 0x808080,
      'minecraft:dirt': 0x866044,
      'minecraft:grass_block': 0x5b8c38,
      'minecraft:cobblestone': 0x646464,
      'minecraft:oak_planks': 0xa2834f,
      'minecraft:sand': 0xdbcfa3,
      'minecraft:gold_block': 0xf9ec4f,
      'minecraft:iron_block': 0xdcdcdc,
      'minecraft:diamond_block': 0x62ede4,
    };

    return colorMap[blockName] ?? 0xff00ff; // Magenta for unknown
  }

  /**
   * Highlights a block at the given position
   */
  private highlightBlock(position: Position): void {
    if (!this.scene) {
      return;
    }

    // Create highlight wireframe
    const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const wireframe = new THREE.LineSegments(edges, material);

    wireframe.position.set(
      position.x + 0.5,
      position.y + 0.5,
      position.z + 0.5
    );

    this.scene.add(wireframe);
  }

  /**
   * Converts a Three.js normal vector to a block face
   */
  private normalToFace(normal: THREE.Vector3 | undefined): BlockFace {
    if (!normal) {
      return 'top';
    }

    const x = normal.x;
    const y = normal.y;
    const z = normal.z;

    // Find dominant axis
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    if (absY >= absX && absY >= absZ) {
      return y > 0 ? 'top' : 'bottom';
    } else if (absX >= absZ) {
      return x > 0 ? 'east' : 'west';
    } else {
      return z > 0 ? 'south' : 'north';
    }
  }
}
