/**
 * Renderer Port Interfaces - Index
 *
 * This module exports all port interfaces for the 3D Structure Renderer.
 * These interfaces define the contracts between the Usecase and Infrastructure layers.
 */

// NBT Parser Port
export type {
  NBTParserPort,
  ParsedNBT,
  StructureFormat,
  Result,
} from './nbt-parser-port.js';

// WebGL Renderer Port
export type {
  WebGLRendererPort,
  RendererOptions,
  RaycastResult,
  BlockFace,
  CanvasElement,
} from './webgl-renderer-port.js';

// Texture Loader Port
export type {
  TextureLoaderPort,
  TextureAtlas,
  BlockTextures,
  UVCoordinates,
} from './texture-loader-port.js';

// Render Cache Port
export type { RenderCachePort, ChunkMesh } from './render-cache-port.js';
