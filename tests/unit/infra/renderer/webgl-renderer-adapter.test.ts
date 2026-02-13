/**
 * WebGLRendererAdapter Tests
 *
 * Tests for the WebGL rendering implementation using Three.js.
 * Follows TDD methodology - these tests are written BEFORE implementation.
 *
 * NOTE: These tests mock Three.js since we cannot create a real WebGL context in Node.js.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebGLRendererAdapter } from '../../../../src/infra/renderer/webgl-renderer-adapter.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { RenderState } from '../../../../src/domain/renderer/render-state.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import type { CanvasElement, RendererOptions } from '../../../../src/usecase/ports/renderer/webgl-renderer-port.js';

// ========================================
// Mock Three.js
// ========================================

// Create mock Three.js objects
const mockRender = vi.fn();
const mockDispose = vi.fn();
const mockSetSize = vi.fn();
const mockSetPixelRatio = vi.fn();
const mockClear = vi.fn();
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockIntersectObjects = vi.fn(() => []);
const mockSetFromCamera = vi.fn();
const mockUpdateProjectionMatrix = vi.fn();
const mockLookAt = vi.fn();

// Mock Three.js module
vi.mock('three', () => ({
  WebGLRenderer: vi.fn().mockImplementation(() => ({
    render: mockRender,
    dispose: mockDispose,
    setSize: mockSetSize,
    setPixelRatio: mockSetPixelRatio,
    domElement: {},
    capabilities: { isWebGL2: true },
    info: { memory: { geometries: 0, textures: 0 } },
  })),
  Scene: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    remove: mockRemove,
    clear: mockClear,
    children: [],
  })),
  PerspectiveCamera: vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, set: vi.fn(), copy: vi.fn() },
    rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
    aspect: 1,
    fov: 75,
    near: 0.1,
    far: 1000,
    updateProjectionMatrix: mockUpdateProjectionMatrix,
    lookAt: mockLookAt,
  })),
  Raycaster: vi.fn().mockImplementation(() => ({
    setFromCamera: mockSetFromCamera,
    intersectObjects: mockIntersectObjects,
  })),
  Vector2: vi.fn().mockImplementation((x, y) => ({ x, y })),
  Vector3: vi.fn().mockImplementation((x, y, z) => ({ x, y, z, set: vi.fn(), copy: vi.fn() })),
  BoxGeometry: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    attributes: {},
  })),
  MeshBasicMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    color: { setHex: vi.fn() },
  })),
  Mesh: vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
    userData: {},
  })),
  InstancedMesh: vi.fn().mockImplementation(() => ({
    count: 0,
    instanceMatrix: { needsUpdate: false },
    setMatrixAt: vi.fn(),
    setColorAt: vi.fn(),
    dispose: vi.fn(),
  })),
  Matrix4: vi.fn().mockImplementation(() => ({
    setPosition: vi.fn().mockReturnThis(),
    identity: vi.fn().mockReturnThis(),
  })),
  Color: vi.fn().mockImplementation(() => ({
    setHex: vi.fn().mockReturnThis(),
  })),
  AmbientLight: vi.fn().mockImplementation(() => ({})),
  DirectionalLight: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
  })),
  EdgesGeometry: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
  LineBasicMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
  LineSegments: vi.fn().mockImplementation(() => ({
    position: { x: 0, y: 0, z: 0, set: vi.fn() },
  })),
}));

// ========================================
// Test Fixtures
// ========================================

/**
 * Creates a mock canvas element
 */
function createMockCanvas(width: number = 800, height: number = 600): CanvasElement {
  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue({
      canvas: { width, height },
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
    }),
  };
}

/**
 * Creates a minimal Structure for testing
 */
function createMockStructure(): Structure {
  return Structure.empty('Test Structure', Dimensions.create(16, 16, 16));
}

/**
 * Creates default RendererOptions
 */
function createDefaultOptions(): RendererOptions {
  return {
    antialias: true,
    powerPreference: 'default',
    alpha: false,
    preserveDrawingBuffer: false,
  };
}

describe('WebGLRendererAdapter', () => {
  let renderer: WebGLRendererAdapter;
  let canvas: CanvasElement;
  let options: RendererOptions;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    renderer = new WebGLRendererAdapter();
    canvas = createMockCanvas();
    options = createDefaultOptions();
  });

  afterEach(() => {
    renderer.dispose();
  });

  // ========================================
  // initialize Tests
  // ========================================

  describe('initialize', () => {
    it('initializes successfully with valid canvas and options', async () => {
      const result = await renderer.initialize(canvas, options);

      expect(result.success).toBe(true);
    });

    it('creates WebGL renderer with correct options', async () => {
      await renderer.initialize(canvas, {
        ...options,
        antialias: true,
        alpha: true,
      });

      // Three.js WebGLRenderer should be instantiated
      const THREE = await import('three');
      expect(THREE.WebGLRenderer).toHaveBeenCalled();
    });

    it('creates scene and camera', async () => {
      await renderer.initialize(canvas, options);

      const THREE = await import('three');
      expect(THREE.Scene).toHaveBeenCalled();
      expect(THREE.PerspectiveCamera).toHaveBeenCalled();
    });

    it('handles initialization failure gracefully', async () => {
      // Force an error by providing invalid canvas
      const invalidCanvas = null as unknown as CanvasElement;

      const result = await renderer.initialize(invalidCanvas, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('GENERATION_FAILED');
      }
    });

    it('can be initialized multiple times (reinitializes)', async () => {
      await renderer.initialize(canvas, options);
      const result = await renderer.initialize(canvas, options);

      expect(result.success).toBe(true);
    });

    it('sets up raycaster for block selection', async () => {
      await renderer.initialize(canvas, options);

      const THREE = await import('three');
      expect(THREE.Raycaster).toHaveBeenCalled();
    });

    it('handles different power preferences', async () => {
      const highPerfOptions: RendererOptions = {
        ...options,
        powerPreference: 'high-performance',
      };

      const result = await renderer.initialize(canvas, highPerfOptions);
      expect(result.success).toBe(true);
    });

    it('handles preserveDrawingBuffer option', async () => {
      const screenshotOptions: RendererOptions = {
        ...options,
        preserveDrawingBuffer: true,
      };

      const result = await renderer.initialize(canvas, screenshotOptions);
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // render Tests
  // ========================================

  describe('render', () => {
    beforeEach(async () => {
      await renderer.initialize(canvas, options);
    });

    it('renders structure with default state', () => {
      const structure = createMockStructure();
      const state = RenderState.default();

      expect(() => renderer.render(structure, state)).not.toThrow();
      expect(mockRender).toHaveBeenCalled();
    });

    it('updates camera position from render state', () => {
      const structure = createMockStructure();
      const state = RenderState.default();

      renderer.render(structure, state);

      // Camera should be updated
      expect(mockUpdateProjectionMatrix).toHaveBeenCalled();
    });

    it('does not throw when called before initialization', () => {
      const uninitializedRenderer = new WebGLRendererAdapter();
      const structure = createMockStructure();
      const state = RenderState.default();

      // Should not throw, just no-op
      expect(() => uninitializedRenderer.render(structure, state)).not.toThrow();
    });

    it('handles empty structure', () => {
      const emptyStructure = Structure.empty('Empty', Dimensions.create(1, 1, 1));
      const state = RenderState.default();

      expect(() => renderer.render(emptyStructure, state)).not.toThrow();
    });

    it('handles state with selected block', () => {
      const structure = createMockStructure();
      const state = RenderState.default().withSelectedBlock(Position.create(5, 5, 5));

      expect(() => renderer.render(structure, state)).not.toThrow();
    });

    it('handles state with visible chunks', () => {
      const structure = createMockStructure();
      const state = RenderState.default().withVisibleChunks([]);

      expect(() => renderer.render(structure, state)).not.toThrow();
    });
  });

  // ========================================
  // raycast Tests
  // ========================================

  describe('raycast', () => {
    beforeEach(async () => {
      await renderer.initialize(canvas, options);
    });

    it('returns null when no intersection', () => {
      mockIntersectObjects.mockReturnValue([]);

      const result = renderer.raycast(400, 300);

      expect(result).toBeNull();
    });

    it('returns hit result with position and face', () => {
      // Mock intersection result
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 0, y: 1, z: 0 } },
          distance: 50,
          object: {
            userData: { blockPosition: { x: 10, y: 20, z: 30 } },
          },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.position).toBeDefined();
        expect(result.face).toBeDefined();
        expect(result.distance).toBe(50);
      }
    });

    it('converts screen coordinates to normalized device coordinates', () => {
      renderer.raycast(400, 300);

      expect(mockSetFromCamera).toHaveBeenCalled();
    });

    it('detects top face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 0, y: 1, z: 0 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('top');
    });

    it('detects bottom face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 0, y: -1, z: 0 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('bottom');
    });

    it('detects north face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 0, y: 0, z: -1 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('north');
    });

    it('detects south face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 0, y: 0, z: 1 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('south');
    });

    it('detects east face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: 1, y: 0, z: 0 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('east');
    });

    it('detects west face correctly', () => {
      mockIntersectObjects.mockReturnValue([
        {
          point: { x: 10, y: 20, z: 30 },
          face: { normal: { x: -1, y: 0, z: 0 } },
          distance: 50,
          object: { userData: { blockPosition: { x: 10, y: 20, z: 30 } } },
        },
      ]);

      const result = renderer.raycast(400, 300);

      expect(result?.face).toBe('west');
    });

    it('returns null before initialization', () => {
      const uninitializedRenderer = new WebGLRendererAdapter();

      const result = uninitializedRenderer.raycast(400, 300);

      expect(result).toBeNull();
    });

    it('handles edge screen coordinates', () => {
      // Top-left corner
      expect(() => renderer.raycast(0, 0)).not.toThrow();

      // Bottom-right corner
      expect(() => renderer.raycast(canvas.width, canvas.height)).not.toThrow();

      // Center
      expect(() => renderer.raycast(canvas.width / 2, canvas.height / 2)).not.toThrow();
    });
  });

  // ========================================
  // dispose Tests
  // ========================================

  describe('dispose', () => {
    it('disposes WebGL resources', async () => {
      await renderer.initialize(canvas, options);

      renderer.dispose();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('clears scene', async () => {
      await renderer.initialize(canvas, options);

      renderer.dispose();

      expect(mockClear).toHaveBeenCalled();
    });

    it('is safe to call multiple times', async () => {
      await renderer.initialize(canvas, options);

      renderer.dispose();
      renderer.dispose();
      renderer.dispose();

      // Should not throw
    });

    it('is safe to call before initialization', () => {
      const uninitializedRenderer = new WebGLRendererAdapter();

      expect(() => uninitializedRenderer.dispose()).not.toThrow();
    });

    it('allows reinitialization after dispose', async () => {
      await renderer.initialize(canvas, options);
      renderer.dispose();

      const result = await renderer.initialize(canvas, options);

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // Integration Tests
  // ========================================

  describe('integration', () => {
    it('full render cycle works correctly', async () => {
      // Initialize
      const initResult = await renderer.initialize(canvas, options);
      expect(initResult.success).toBe(true);

      // Create structure and state
      const structure = createMockStructure();
      const state = RenderState.default();

      // Render
      renderer.render(structure, state);
      expect(mockRender).toHaveBeenCalled();

      // Raycast
      const hit = renderer.raycast(400, 300);
      // Hit may be null, that's ok

      // Dispose
      renderer.dispose();
      expect(mockDispose).toHaveBeenCalled();
    });

    it('handles multiple render calls', async () => {
      await renderer.initialize(canvas, options);
      const structure = createMockStructure();
      const state = RenderState.default();

      // Multiple renders
      for (let i = 0; i < 60; i++) {
        renderer.render(structure, state);
      }

      expect(mockRender).toHaveBeenCalledTimes(60);
    });

    it('handles structure updates between renders', async () => {
      await renderer.initialize(canvas, options);
      const state = RenderState.default();

      const structure1 = createMockStructure();
      renderer.render(structure1, state);

      const structure2 = Structure.empty('Different Structure', Dimensions.create(32, 32, 32));
      renderer.render(structure2, state);

      expect(mockRender).toHaveBeenCalledTimes(2);
    });

    it('handles state updates between renders', async () => {
      await renderer.initialize(canvas, options);
      const structure = createMockStructure();

      const state1 = RenderState.default();
      renderer.render(structure, state1);

      const state2 = state1.withSelectedBlock(Position.create(0, 0, 0));
      renderer.render(structure, state2);

      expect(mockRender).toHaveBeenCalledTimes(2);
    });
  });
});
