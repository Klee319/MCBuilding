/**
 * 3D Structure Renderer - Domain Layer
 *
 * This module exports all domain objects for the 3D renderer:
 * - Value Objects (Position, BlockState, Camera, LodLevel, RenderQuality, ChunkCoord)
 * - Entities (Block, Structure, RenderState)
 *
 * All objects are immutable following DDD principles.
 */

// ========================================
// Value Objects
// ========================================

// Position
export {
  Position,
  InvalidPositionError,
  createPosition,
  positionEquals,
  positionToKey,
  positionFromKey,
  positionAdd,
  positionSubtract,
  positionDistance,
  positionManhattanDistance,
} from './position.js';

// BlockState
export {
  BlockState,
  InvalidBlockStateError,
  createBlockState,
  blockStateEquals,
  blockStateToString,
  parseBlockState,
  type BlockStateProperties,
} from './block-state.js';

// Camera
export {
  Camera,
  InvalidCameraError,
  createCamera,
  type CameraRotation,
} from './camera.js';

// LodLevel
export {
  LodLevel,
  InvalidLodLevelError,
  LOD_LEVEL_VALUES,
  createLodLevel,
  lodLevelFromDistance,
  lodLevelToBlockSize,
  lodLevelToString,
  type LodLevelValue,
} from './lod-level.js';

// RenderQuality
export {
  RenderQuality,
  InvalidRenderQualityError,
  RENDER_QUALITY_PRESETS,
  createRenderQuality,
  type RenderQualityOptions,
  type RenderQualityPresetName,
} from './render-quality.js';

// ChunkCoord
export {
  ChunkCoord,
  InvalidChunkCoordError,
  CHUNK_SIZE,
  createChunkCoord,
  chunkCoordFromPosition,
  chunkCoordEquals,
  chunkCoordToKey,
  chunkCoordFromKey,
} from './chunk-coord.js';

// ========================================
// Entities
// ========================================

// Block
export {
  Block,
  InvalidBlockError,
  createBlock,
  createBlockId,
  type BlockId,
} from './block.js';

// Structure
export {
  Structure,
  InvalidStructureError,
  createStructure,
  createStructureId,
  type StructureId,
  type StructureMetadata,
} from './structure.js';

// RenderState
export {
  RenderState,
  InvalidRenderStateError,
  createRenderState,
} from './render-state.js';
