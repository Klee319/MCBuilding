/**
 * Ports Index - Usecase Layer Boundary Interfaces
 *
 * This module exports all port interfaces and related types.
 * Ports define the contracts between Usecase and Infrastructure layers.
 */

// ========================================
// Common Types
// ========================================
export type {
  // Pagination
  PaginatedResult,
  // Query
  PostQuery,
  PostSortBy,
  CreatedWithin,
  // Structure
  StructureData,
  StructureMetadata,
  ConvertedBlock,
  ConversionResult,
  // Rendering
  LodLevel,
  RenderData,
  TextureAtlas,
  // Notification
  NotificationType,
  NotificationPayload,
  BulkNotificationResult,
  // Spam Detection
  RateLimitResult,
  ContentCheckResult,
  // Errors
  PortErrorCode,
} from './types.js';

export { PortError } from './types.js';

// ========================================
// Repository Ports
// ========================================
export type {
  StructureRepositoryPort,
  PostRepositoryPort,
  UserRepositoryPort,
  CommentRepositoryPort,
  LikeRepositoryPort,
  FollowRepositoryPort,
  NotificationRepositoryPort,
  NotificationQueryOptions,
  UserCredentialRepositoryPort,
  UserWithCredentials,
} from './repository-ports.js';

// ========================================
// Gateway Ports
// ========================================
export type {
  StructureConverterPort,
  RendererDataPort,
  NotificationPort,
  EmailPort,
  SmsPort,
  SpamDetectorPort,
  PasswordHasherPort,
  JwtServicePort,
  AccessTokenPayload,
  RefreshTokenPayload,
  DecodedToken,
} from './gateway-ports.js';

// ========================================
// Renderer Ports
// ========================================
export type {
  NBTParserPort,
  ParsedNBT,
  StructureFormat,
  Result,
} from './renderer/nbt-parser-port.js';

export type {
  WebGLRendererPort,
  RendererOptions,
  RaycastResult,
  BlockFace,
  CanvasElement,
} from './renderer/webgl-renderer-port.js';

export type {
  TextureLoaderPort,
  TextureAtlas as RendererTextureAtlas,
  BlockTextures,
  UVCoordinates,
} from './renderer/texture-loader-port.js';

export type { RenderCachePort, ChunkMesh } from './renderer/render-cache-port.js';
