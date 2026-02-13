/**
 * Renderer Structure Controller Unit Tests
 *
 * TDD tests for RendererStructureController class.
 * Tests handling of 3D structure rendering requests and user interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RendererStructureController } from '../../../../src/interface/controllers/renderer-structure-controller.js';
import type {
  LoadStructureUsecase,
  LoadStructureInput,
  LoadStructureOutput,
} from '../../../../src/usecase/renderer/load-structure.js';
import type {
  RenderStructureUsecase,
  RenderStructureInput,
} from '../../../../src/usecase/renderer/render-structure.js';
import type {
  UpdateCameraUsecase,
  UpdateCameraInput,
  CameraAction,
} from '../../../../src/usecase/renderer/update-camera.js';
import type {
  SelectBlockUsecase,
  SelectBlockInput,
  SelectBlockOutput,
} from '../../../../src/usecase/renderer/select-block.js';
import type { StructureFormat, Result } from '../../../../src/usecase/ports/renderer/nbt-parser-port.js';
import { Structure } from '../../../../src/domain/renderer/structure.js';
import { RenderState } from '../../../../src/domain/renderer/render-state.js';
import { Block } from '../../../../src/domain/renderer/block.js';
import { Position } from '../../../../src/domain/renderer/position.js';
import { BlockState } from '../../../../src/domain/renderer/block-state.js';
import { Camera } from '../../../../src/domain/renderer/camera.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';
import { PortError } from '../../../../src/usecase/ports/types.js';
import type { CanvasElement } from '../../../../src/usecase/ports/renderer/webgl-renderer-port.js';

// ========================================
// Mock Factories
// ========================================

function createMockStructure(): Structure {
  const blocks = new Map<string, Block>();
  const block = Block.create(Position.create(0, 0, 0), BlockState.create('minecraft:stone'));
  blocks.set('0,0,0', block);

  return Structure.create(
    'Test Structure',
    Dimensions.create(64, 64, 64),
    [BlockState.create('minecraft:stone')],
    blocks
  );
}

function createMockCanvas(): CanvasElement {
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ({})),
  };
}

function createSuccessResult<T>(value: T): Result<T, PortError> {
  return { success: true, value };
}

function createErrorResult<T>(code: string, message: string): Result<T, PortError> {
  return {
    success: false,
    error: new PortError(code as 'PARSE_ERROR' | 'INVALID_FORMAT' | 'STORAGE_ERROR', message),
  };
}

// ========================================
// Mock Usecases
// ========================================

function createMockLoadStructureUsecase(
  executeResult: Result<LoadStructureOutput, PortError> = createSuccessResult({
    structure: createMockStructure(),
    parseTime: 100,
  })
): LoadStructureUsecase {
  return {
    execute: vi.fn().mockResolvedValue(executeResult),
  };
}

function createMockRenderStructureUsecase(
  executeResult: Result<void, PortError> = createSuccessResult(undefined)
): RenderStructureUsecase {
  return {
    execute: vi.fn().mockResolvedValue(executeResult),
    dispose: vi.fn(),
  };
}

function createMockUpdateCameraUsecase(): UpdateCameraUsecase {
  return {
    execute: vi.fn((input: UpdateCameraInput) => {
      // Return a new RenderState with updated camera
      return input.currentState;
    }),
  };
}

function createMockSelectBlockUsecase(
  result: SelectBlockOutput = { block: null, face: null }
): SelectBlockUsecase {
  return {
    execute: vi.fn().mockReturnValue(result),
  };
}

// ========================================
// Test: Constructor
// ========================================
describe('RendererStructureController constructor', () => {
  it('creates instance with all usecases', () => {
    const loadStructure = createMockLoadStructureUsecase();
    const renderStructure = createMockRenderStructureUsecase();
    const updateCamera = createMockUpdateCameraUsecase();
    const selectBlock = createMockSelectBlockUsecase();

    const controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    expect(controller).toBeDefined();
  });
});

// ========================================
// Test: load method
// ========================================
describe('RendererStructureController.load', () => {
  let loadStructure: LoadStructureUsecase;
  let renderStructure: RenderStructureUsecase;
  let updateCamera: UpdateCameraUsecase;
  let selectBlock: SelectBlockUsecase;
  let controller: RendererStructureController;

  beforeEach(() => {
    loadStructure = createMockLoadStructureUsecase();
    renderStructure = createMockRenderStructureUsecase();
    updateCamera = createMockUpdateCameraUsecase();
    selectBlock = createMockSelectBlockUsecase();
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );
  });

  it('calls LoadStructureUsecase.execute with correct input', async () => {
    const fileData = new ArrayBuffer(100);
    const format: StructureFormat = 'schematic';

    await controller.load(fileData, format);

    expect(loadStructure.execute).toHaveBeenCalledWith({
      data: fileData,
      format: 'schematic',
    });
  });

  it('returns success result with structure', async () => {
    const mockStructure = createMockStructure();
    loadStructure = createMockLoadStructureUsecase(
      createSuccessResult({ structure: mockStructure, parseTime: 50 })
    );
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    const result = await controller.load(new ArrayBuffer(100), 'schematic');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Test Structure');
    }
  });

  it('returns error result on failure', async () => {
    loadStructure = createMockLoadStructureUsecase(
      createErrorResult('PARSE_ERROR', 'Failed to parse structure')
    );
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    const result = await controller.load(new ArrayBuffer(100), 'schematic');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Failed to parse structure');
    }
  });

  it('handles File input type', async () => {
    const file = new File(['test'], 'test.schematic');
    const format: StructureFormat = 'schematic';

    await controller.load(file, format);

    expect(loadStructure.execute).toHaveBeenCalledWith({
      data: file,
      format: 'schematic',
    });
  });

  it('handles different file formats', async () => {
    const formats: StructureFormat[] = ['schematic', 'schem', 'litematic', 'mcstructure'];

    for (const format of formats) {
      await controller.load(new ArrayBuffer(100), format);

      expect(loadStructure.execute).toHaveBeenCalledWith(
        expect.objectContaining({ format })
      );
    }
  });
});

// ========================================
// Test: startRendering method
// ========================================
describe('RendererStructureController.startRendering', () => {
  let loadStructure: LoadStructureUsecase;
  let renderStructure: RenderStructureUsecase;
  let updateCamera: UpdateCameraUsecase;
  let selectBlock: SelectBlockUsecase;
  let controller: RendererStructureController;
  let mockCanvas: CanvasElement;

  beforeEach(() => {
    loadStructure = createMockLoadStructureUsecase();
    renderStructure = createMockRenderStructureUsecase();
    updateCamera = createMockUpdateCameraUsecase();
    selectBlock = createMockSelectBlockUsecase();
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );
    mockCanvas = createMockCanvas();
  });

  it('calls RenderStructureUsecase.execute', async () => {
    const structure = createMockStructure();

    await controller.startRendering(structure, mockCanvas);

    expect(renderStructure.execute).toHaveBeenCalled();
  });

  it('passes structure and canvas to usecase', async () => {
    const structure = createMockStructure();

    await controller.startRendering(structure, mockCanvas);

    expect(renderStructure.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        structure,
        canvas: mockCanvas,
      })
    );
  });

  it('returns success result on successful render', async () => {
    const structure = createMockStructure();

    const result = await controller.startRendering(structure, mockCanvas);

    expect(result.success).toBe(true);
  });

  it('returns error result on render failure', async () => {
    renderStructure = createMockRenderStructureUsecase(
      createErrorResult('GENERATION_FAILED', 'WebGL context creation failed')
    );
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );
    const structure = createMockStructure();

    const result = await controller.startRendering(structure, mockCanvas);

    expect(result.success).toBe(false);
  });

  it('initializes render state with default values', async () => {
    const structure = createMockStructure();

    await controller.startRendering(structure, mockCanvas);

    const state = controller.getRenderState();
    expect(state).toBeDefined();
  });
});

// ========================================
// Test: handleCameraAction method
// ========================================
describe('RendererStructureController.handleCameraAction', () => {
  let loadStructure: LoadStructureUsecase;
  let renderStructure: RenderStructureUsecase;
  let updateCamera: UpdateCameraUsecase;
  let selectBlock: SelectBlockUsecase;
  let controller: RendererStructureController;

  beforeEach(() => {
    loadStructure = createMockLoadStructureUsecase();
    renderStructure = createMockRenderStructureUsecase();
    updateCamera = createMockUpdateCameraUsecase();
    selectBlock = createMockSelectBlockUsecase();
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );
  });

  it('calls UpdateCameraUsecase.execute with rotate action', () => {
    const action: CameraAction = { type: 'rotate', pitch: 10, yaw: 20 };

    controller.handleCameraAction(action);

    expect(updateCamera.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: 'rotate', pitch: 10, yaw: 20 },
      })
    );
  });

  it('calls UpdateCameraUsecase.execute with zoom action', () => {
    const action: CameraAction = { type: 'zoom', delta: 0.5 };

    controller.handleCameraAction(action);

    expect(updateCamera.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: 'zoom', delta: 0.5 },
      })
    );
  });

  it('calls UpdateCameraUsecase.execute with pan action', () => {
    const action: CameraAction = { type: 'pan', x: 10, y: 5 };

    controller.handleCameraAction(action);

    expect(updateCamera.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: 'pan', x: 10, y: 5 },
      })
    );
  });

  it('calls UpdateCameraUsecase.execute with reset action', () => {
    const action: CameraAction = { type: 'reset' };

    controller.handleCameraAction(action);

    expect(updateCamera.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: 'reset' },
      })
    );
  });

  it('returns updated render state', () => {
    const action: CameraAction = { type: 'zoom', delta: 0.5 };

    const result = controller.handleCameraAction(action);

    expect(result).toBeDefined();
  });

  it('updates internal render state', () => {
    const action: CameraAction = { type: 'zoom', delta: 0.5 };

    controller.handleCameraAction(action);
    const state = controller.getRenderState();

    expect(state).toBeDefined();
  });
});

// ========================================
// Test: handleBlockSelect method
// ========================================
describe('RendererStructureController.handleBlockSelect', () => {
  let loadStructure: LoadStructureUsecase;
  let renderStructure: RenderStructureUsecase;
  let updateCamera: UpdateCameraUsecase;
  let selectBlock: SelectBlockUsecase;
  let controller: RendererStructureController;

  beforeEach(async () => {
    loadStructure = createMockLoadStructureUsecase();
    renderStructure = createMockRenderStructureUsecase();
    updateCamera = createMockUpdateCameraUsecase();
    selectBlock = createMockSelectBlockUsecase();
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    // Initialize with structure
    const structure = createMockStructure();
    await controller.startRendering(structure, createMockCanvas());
  });

  it('calls SelectBlockUsecase.execute with screen coordinates', () => {
    controller.handleBlockSelect(100, 200);

    expect(selectBlock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        screenX: 100,
        screenY: 200,
      })
    );
  });

  it('returns SelectBlockOutput', () => {
    const result = controller.handleBlockSelect(100, 200);

    expect(result).toHaveProperty('block');
    expect(result).toHaveProperty('face');
  });

  it('returns block when hit detected', async () => {
    const mockBlock = Block.create(
      Position.create(5, 10, 15),
      BlockState.create('minecraft:stone')
    );
    selectBlock = createMockSelectBlockUsecase({
      block: mockBlock,
      face: 'top',
    });
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    // Initialize with structure first
    const structure = createMockStructure();
    await controller.startRendering(structure, createMockCanvas());

    const result = controller.handleBlockSelect(100, 200);

    expect(result.block).not.toBeNull();
    expect(result.face).toBe('top');
  });

  it('returns null block when no hit', async () => {
    selectBlock = createMockSelectBlockUsecase({
      block: null,
      face: null,
    });
    controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      updateCamera,
      selectBlock
    );

    // Initialize with structure first
    const structure = createMockStructure();
    await controller.startRendering(structure, createMockCanvas());

    const result = controller.handleBlockSelect(100, 200);

    expect(result.block).toBeNull();
    expect(result.face).toBeNull();
  });

  it('handles different screen coordinates', () => {
    const coordinates = [
      { x: 0, y: 0 },
      { x: 400, y: 300 },
      { x: 799, y: 599 },
    ];

    for (const { x, y } of coordinates) {
      controller.handleBlockSelect(x, y);

      expect(selectBlock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          screenX: x,
          screenY: y,
        })
      );
    }
  });
});

// ========================================
// Test: getRenderState method
// ========================================
describe('RendererStructureController.getRenderState', () => {
  it('returns default render state before initialization', () => {
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      createMockRenderStructureUsecase(),
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    const state = controller.getRenderState();

    expect(state).toBeDefined();
  });

  it('returns current render state', () => {
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      createMockRenderStructureUsecase(),
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    const state = controller.getRenderState();

    expect(state).toBeInstanceOf(RenderState);
  });
});

// ========================================
// Test: dispose method
// ========================================
describe('RendererStructureController.dispose', () => {
  it('calls RenderStructureUsecase.dispose', () => {
    const renderStructure = createMockRenderStructureUsecase();
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      renderStructure,
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    controller.dispose();

    expect(renderStructure.dispose).toHaveBeenCalled();
  });

  it('can be called multiple times safely', () => {
    const renderStructure = createMockRenderStructureUsecase();
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      renderStructure,
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    controller.dispose();
    controller.dispose();

    // Should not throw
    expect(renderStructure.dispose).toHaveBeenCalledTimes(2);
  });
});

// ========================================
// Integration-like scenarios
// ========================================
describe('RendererStructureController complete scenarios', () => {
  it('complete load and render flow', async () => {
    const mockStructure = createMockStructure();
    const loadStructure = createMockLoadStructureUsecase(
      createSuccessResult({ structure: mockStructure, parseTime: 50 })
    );
    const renderStructure = createMockRenderStructureUsecase();
    const controller = new RendererStructureController(
      loadStructure,
      renderStructure,
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    // Step 1: Load structure
    const loadResult = await controller.load(new ArrayBuffer(100), 'schematic');
    expect(loadResult.success).toBe(true);

    // Step 2: Start rendering
    if (loadResult.success) {
      const renderResult = await controller.startRendering(
        loadResult.value,
        createMockCanvas()
      );
      expect(renderResult.success).toBe(true);
    }

    // Step 3: Handle camera actions
    const state = controller.handleCameraAction({ type: 'zoom', delta: 0.5 });
    expect(state).toBeDefined();

    // Step 4: Handle block selection
    const selectResult = controller.handleBlockSelect(100, 100);
    expect(selectResult).toHaveProperty('block');

    // Step 5: Dispose
    controller.dispose();
    expect(renderStructure.dispose).toHaveBeenCalled();
  });

  it('handles multiple camera actions in sequence', () => {
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      createMockRenderStructureUsecase(),
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    // Rotate
    controller.handleCameraAction({ type: 'rotate', pitch: 10, yaw: 20 });

    // Zoom
    controller.handleCameraAction({ type: 'zoom', delta: 0.5 });

    // Pan
    controller.handleCameraAction({ type: 'pan', x: 10, y: 5 });

    // Reset
    const finalState = controller.handleCameraAction({ type: 'reset' });

    expect(finalState).toBeDefined();
  });
});

// ========================================
// Error handling
// ========================================
describe('RendererStructureController error handling', () => {
  it('propagates load errors correctly', async () => {
    const loadStructure = createMockLoadStructureUsecase(
      createErrorResult('INVALID_FORMAT', 'Unsupported file format')
    );
    const controller = new RendererStructureController(
      loadStructure,
      createMockRenderStructureUsecase(),
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    const result = await controller.load(new ArrayBuffer(100), 'schematic');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_FORMAT');
    }
  });

  it('propagates render errors correctly', async () => {
    const renderStructure = createMockRenderStructureUsecase(
      createErrorResult('GENERATION_FAILED', 'Failed to initialize WebGL')
    );
    const controller = new RendererStructureController(
      createMockLoadStructureUsecase(),
      renderStructure,
      createMockUpdateCameraUsecase(),
      createMockSelectBlockUsecase()
    );

    const result = await controller.startRendering(
      createMockStructure(),
      createMockCanvas()
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('GENERATION_FAILED');
    }
  });
});
