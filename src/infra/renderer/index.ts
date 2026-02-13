/**
 * Infra Layer - Renderer Adapters
 *
 * This module exports all adapter implementations for the 3D Structure Renderer.
 * These adapters implement the port interfaces defined in the Usecase layer.
 */

// NBT Parser Adapter
export { NBTParserAdapter } from './nbt-parser-adapter.js';

// Render Cache Adapter
export { RenderCacheAdapter } from './render-cache-adapter.js';

// Texture Loader Adapter
export { TextureLoaderAdapter } from './texture-loader-adapter.js';

// WebGL Renderer Adapter
export { WebGLRendererAdapter } from './webgl-renderer-adapter.js';

// Block Shape Registry
export {
  getShapeDefinition,
  getShapeForBlock,
  supportsRotation,
  clearShapeCache,
} from './block-shape-registry.js';

export type {
  BoxDefinition,
  ShapeDefinition,
} from './block-shape-registry.js';

// Geometry Generator
export {
  generateGeometry,
  boxesToGeometry,
  applyUVs,
  applyFaceUVs,
} from './geometry-generator.js';
export type { GeneratorOptions, UVMapping } from './geometry-generator.js';
