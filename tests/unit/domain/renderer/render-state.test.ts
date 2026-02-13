/**
 * RenderState Entity Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * RenderState represents the current rendering state.
 */
import { describe, it, expect } from 'vitest';
import {
  RenderState,
  InvalidRenderStateError,
  createRenderState,
} from '../../../../src/domain/renderer/render-state';
import { Position } from '../../../../src/domain/renderer/position';
import { Camera } from '../../../../src/domain/renderer/camera';
import { LodLevel } from '../../../../src/domain/renderer/lod-level';
import { ChunkCoord } from '../../../../src/domain/renderer/chunk-coord';
import { RenderQuality } from '../../../../src/domain/renderer/render-quality';

describe('RenderState Entity', () => {
  // ========================================
  // Static Factory Methods
  // ========================================
  describe('RenderState.create()', () => {
    it('should create RenderState with valid parameters', () => {
      const camera = Camera.default();
      const lodLevel = LodLevel.full();
      const quality = RenderQuality.high();
      const visibleChunks = [ChunkCoord.create(0, 0, 0)];

      const state = RenderState.create(camera, lodLevel, null, visibleChunks, quality);

      expect(state).toBeInstanceOf(RenderState);
      expect(state.camera.equals(camera)).toBe(true);
      expect(state.lodLevel.equals(lodLevel)).toBe(true);
      expect(state.selectedBlock).toBeNull();
      expect(state.visibleChunks).toHaveLength(1);
      expect(state.quality.equals(quality)).toBe(true);
    });

    it('should create RenderState with selected block', () => {
      const camera = Camera.default();
      const lodLevel = LodLevel.full();
      const quality = RenderQuality.high();
      const selectedBlock = Position.create(10, 64, 20);

      const state = RenderState.create(camera, lodLevel, selectedBlock, [], quality);

      expect(state.selectedBlock).not.toBeNull();
      expect(state.selectedBlock?.equals(selectedBlock)).toBe(true);
    });

    it('should throw InvalidRenderStateError for null camera', () => {
      const lodLevel = LodLevel.full();
      const quality = RenderQuality.high();

      expect(() => RenderState.create(null as unknown as Camera, lodLevel, null, [], quality)).toThrow(InvalidRenderStateError);
    });

    it('should throw InvalidRenderStateError for null lodLevel', () => {
      const camera = Camera.default();
      const quality = RenderQuality.high();

      expect(() => RenderState.create(camera, null as unknown as LodLevel, null, [], quality)).toThrow(InvalidRenderStateError);
    });

    it('should throw InvalidRenderStateError for null visibleChunks', () => {
      const camera = Camera.default();
      const lodLevel = LodLevel.full();
      const quality = RenderQuality.high();

      expect(() => RenderState.create(camera, lodLevel, null, null as unknown as ChunkCoord[], quality)).toThrow(InvalidRenderStateError);
    });

    it('should throw InvalidRenderStateError for null quality', () => {
      const camera = Camera.default();
      const lodLevel = LodLevel.full();

      expect(() => RenderState.create(camera, lodLevel, null, [], null as unknown as RenderQuality)).toThrow(InvalidRenderStateError);
    });
  });

  describe('RenderState.default()', () => {
    it('should return default render state', () => {
      const state = RenderState.default();

      expect(state).toBeInstanceOf(RenderState);
      expect(state.selectedBlock).toBeNull();
      expect(state.visibleChunks).toHaveLength(0);
    });

    it('should have default camera', () => {
      const state = RenderState.default();
      const defaultCamera = Camera.default();

      expect(state.camera.zoom).toBe(defaultCamera.zoom);
    });

    it('should have full LOD level', () => {
      const state = RenderState.default();

      expect(state.lodLevel.isFullDetail()).toBe(true);
    });

    it('should have medium quality by default', () => {
      const state = RenderState.default();

      expect(state.quality.getPresetName()).toBe('medium');
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('camera getter', () => {
    it('should return camera state', () => {
      const camera = Camera.create(
        Position.create(100, 100, 100),
        Position.create(0, 0, 0),
        2.0,
        { pitch: 30, yaw: 45 }
      );
      const state = RenderState.create(
        camera,
        LodLevel.full(),
        null,
        [],
        RenderQuality.high()
      );

      expect(state.camera.zoom).toBe(2.0);
      expect(state.camera.rotation.pitch).toBe(30);
    });
  });

  describe('lodLevel getter', () => {
    it('should return LOD level', () => {
      const state = RenderState.create(
        Camera.default(),
        LodLevel.create(2),
        null,
        [],
        RenderQuality.high()
      );

      expect(state.lodLevel.value).toBe(2);
    });
  });

  describe('selectedBlock getter', () => {
    it('should return selected block position', () => {
      const selected = Position.create(10, 64, 20);
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        selected,
        [],
        RenderQuality.high()
      );

      expect(state.selectedBlock?.x).toBe(10);
      expect(state.selectedBlock?.y).toBe(64);
      expect(state.selectedBlock?.z).toBe(20);
    });

    it('should return null when no block selected', () => {
      const state = RenderState.default();

      expect(state.selectedBlock).toBeNull();
    });
  });

  describe('visibleChunks getter', () => {
    it('should return visible chunks array', () => {
      const chunks = [
        ChunkCoord.create(0, 0, 0),
        ChunkCoord.create(1, 0, 0),
        ChunkCoord.create(0, 1, 0),
      ];
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        null,
        chunks,
        RenderQuality.high()
      );

      expect(state.visibleChunks).toHaveLength(3);
    });

    it('should return frozen array', () => {
      const state = RenderState.default();

      expect(Object.isFrozen(state.visibleChunks)).toBe(true);
    });
  });

  describe('quality getter', () => {
    it('should return render quality', () => {
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        null,
        [],
        RenderQuality.ultra()
      );

      expect(state.quality.shadows).toBe(true);
      expect(state.quality.maxDrawDistance).toBe(800);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('withCamera()', () => {
    it('should return new RenderState with updated camera', () => {
      const original = RenderState.default();
      const newCamera = Camera.default().withZoom(2.0);
      const updated = original.withCamera(newCamera);

      expect(updated.camera.zoom).toBe(2.0);
      expect(original.camera.zoom).toBe(1.0);
    });

    it('should preserve other properties', () => {
      const chunks = [ChunkCoord.create(0, 0, 0)];
      const original = RenderState.create(
        Camera.default(),
        LodLevel.create(2),
        Position.create(0, 0, 0),
        chunks,
        RenderQuality.ultra()
      );
      const updated = original.withCamera(Camera.default().withZoom(2.0));

      expect(updated.lodLevel.value).toBe(2);
      expect(updated.selectedBlock).not.toBeNull();
      expect(updated.visibleChunks).toHaveLength(1);
      expect(updated.quality.getPresetName()).toBe('ultra');
    });
  });

  describe('withLodLevel()', () => {
    it('should return new RenderState with updated LOD level', () => {
      const original = RenderState.default();
      const updated = original.withLodLevel(LodLevel.create(3));

      expect(updated.lodLevel.value).toBe(3);
      expect(original.lodLevel.value).toBe(0);
    });
  });

  describe('withSelectedBlock()', () => {
    it('should return new RenderState with updated selected block', () => {
      const original = RenderState.default();
      const selected = Position.create(10, 20, 30);
      const updated = original.withSelectedBlock(selected);

      expect(updated.selectedBlock?.equals(selected)).toBe(true);
      expect(original.selectedBlock).toBeNull();
    });

    it('should allow clearing selection with null', () => {
      const selected = Position.create(10, 20, 30);
      const original = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        selected,
        [],
        RenderQuality.high()
      );
      const updated = original.withSelectedBlock(null);

      expect(updated.selectedBlock).toBeNull();
      expect(original.selectedBlock).not.toBeNull();
    });
  });

  describe('withVisibleChunks()', () => {
    it('should return new RenderState with updated visible chunks', () => {
      const original = RenderState.default();
      const chunks = [
        ChunkCoord.create(0, 0, 0),
        ChunkCoord.create(1, 1, 1),
      ];
      const updated = original.withVisibleChunks(chunks);

      expect(updated.visibleChunks).toHaveLength(2);
      expect(original.visibleChunks).toHaveLength(0);
    });
  });

  describe('withQuality()', () => {
    it('should return new RenderState with updated quality', () => {
      const original = RenderState.default();
      const updated = original.withQuality(RenderQuality.ultra());

      expect(updated.quality.getPresetName()).toBe('ultra');
      expect(original.quality.getPresetName()).toBe('medium');
    });
  });

  describe('hasSelection()', () => {
    it('should return true when block is selected', () => {
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        Position.create(0, 0, 0),
        [],
        RenderQuality.high()
      );

      expect(state.hasSelection()).toBe(true);
    });

    it('should return false when no block selected', () => {
      const state = RenderState.default();

      expect(state.hasSelection()).toBe(false);
    });
  });

  describe('clearSelection()', () => {
    it('should return new RenderState with no selection', () => {
      const selected = Position.create(10, 20, 30);
      const original = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        selected,
        [],
        RenderQuality.high()
      );
      const updated = original.clearSelection();

      expect(updated.hasSelection()).toBe(false);
    });
  });

  describe('isChunkVisible()', () => {
    it('should return true for chunk in visible list', () => {
      const chunk = ChunkCoord.create(1, 2, 3);
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        null,
        [chunk],
        RenderQuality.high()
      );

      expect(state.isChunkVisible(chunk)).toBe(true);
    });

    it('should return false for chunk not in visible list', () => {
      const state = RenderState.create(
        Camera.default(),
        LodLevel.full(),
        null,
        [ChunkCoord.create(0, 0, 0)],
        RenderQuality.high()
      );

      expect(state.isChunkVisible(ChunkCoord.create(10, 10, 10))).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return serializable object', () => {
      const state = RenderState.create(
        Camera.default(),
        LodLevel.create(2),
        Position.create(10, 20, 30),
        [ChunkCoord.create(0, 0, 0)],
        RenderQuality.high()
      );
      const obj = state.toObject();

      expect(obj.camera).toBeDefined();
      expect(obj.lodLevel).toBe(2);
      expect(obj.selectedBlock).toEqual({ x: 10, y: 20, z: 30 });
      expect(obj.visibleChunks).toHaveLength(1);
      expect(obj.quality).toBeDefined();
    });

    it('should handle null selection', () => {
      const state = RenderState.default();
      const obj = state.toObject();

      expect(obj.selectedBlock).toBeNull();
    });
  });

  describe('toString()', () => {
    it('should return human-readable string', () => {
      const state = RenderState.default();
      const str = state.toString();

      expect(str).toContain('RenderState');
      expect(str).toContain('LOD');
      expect(str).toContain('chunks');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const state = RenderState.default();

      expect(Object.isFrozen(state)).toBe(true);
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createRenderState()', () => {
    it('should create RenderState (alias)', () => {
      const state = createRenderState(
        Camera.default(),
        LodLevel.full(),
        null,
        [],
        RenderQuality.high()
      );

      expect(state).toBeInstanceOf(RenderState);
    });
  });

  // ========================================
  // InvalidRenderStateError
  // ========================================
  describe('InvalidRenderStateError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidRenderStateError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidRenderStateError('test');

      expect(error.name).toBe('InvalidRenderStateError');
    });
  });
});
