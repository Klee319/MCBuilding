/**
 * Gateway Ports - External Service Interfaces
 *
 * These interfaces define the contract for external service interactions.
 * Implementations are provided by the Infrastructure layer.
 *
 * Based on docs/contracts/ports.md
 */

import type { Edition } from '../../domain/value-objects/edition.js';
import type { Version } from '../../domain/value-objects/version.js';
import type { FileFormat } from '../../domain/value-objects/file-format.js';
import type {
  StructureData,
  StructureMetadata,
  ConversionResult,
  ExportResult,
  RenderData,
  TextureAtlas,
  LodLevel,
  NotificationPayload,
  BulkNotificationResult,
  RateLimitResult,
  ContentCheckResult,
} from './types.js';

// ========================================
// Structure Converter Port
// ========================================

/**
 * Gateway port for structure format conversion
 *
 * Handles conversion between Minecraft editions and versions.
 * Converts between Java Edition (schematic, litematic) and
 * Bedrock Edition (mcstructure) formats.
 */
export interface StructureConverterPort {
  /**
   * Convert structure data between editions/versions
   *
   * @param source - Source structure binary data
   * @param sourceEdition - Source Minecraft edition
   * @param sourceVersion - Source Minecraft version
   * @param targetEdition - Target Minecraft edition
   * @param targetVersion - Target Minecraft version
   * @returns Conversion result including any data loss information
   * @throws PortError with code 'UNSUPPORTED_VERSION' if version < 1.12
   * @throws PortError with code 'CONVERSION_FAILED' if conversion fails
   */
  convert(
    source: StructureData,
    sourceEdition: Edition,
    sourceVersion: Version,
    targetEdition: Edition,
    targetVersion: Version
  ): Promise<ConversionResult>;

  /**
   * Parse a structure file and extract metadata
   *
   * @param file - Raw file content
   * @param format - Expected file format
   * @returns Extracted metadata (dimensions, block count, etc.)
   * @throws PortError with code 'INVALID_FORMAT' if file format is invalid
   * @throws PortError with code 'PARSE_ERROR' if parsing fails
   */
  parseStructure(file: Uint8Array, format: FileFormat): Promise<StructureMetadata>;

  /**
   * Register the last parsed structure data with a structure ID
   *
   * @param structureId - Structure ID to associate with the parsed data
   */
  registerParsedData(structureId: string): void;

  /**
   * Export a stored structure to the specified file format
   *
   * Converts the internal parsed data to the target binary format.
   * Handles cross-format conversion (e.g., .schematic → .litematic).
   *
   * @param structureId - ID of the structure to export
   * @param targetFormat - Target file format
   * @param targetEdition - Target Minecraft edition
   * @param targetVersion - Target Minecraft version
   * @returns Export result with binary data and metadata
   * @throws PortError with code 'NOT_FOUND' if structure not found
   * @throws PortError with code 'UNSUPPORTED_CONVERSION' if conversion is not possible
   * @throws PortError with code 'EXPORT_FAILED' if export fails
   */
  exportStructure(
    structureId: string,
    targetFormat: FileFormat,
    targetEdition: Edition,
    targetVersion: Version
  ): Promise<ExportResult>;
}

// ========================================
// Renderer Data Port
// ========================================

/**
 * Gateway port for 3D rendering data generation
 *
 * Generates WebGL-ready data for structure preview rendering.
 * Supports multiple LOD (Level of Detail) levels for performance.
 */
export interface RendererDataPort {
  /**
   * Generate render data for 3D preview
   *
   * @param structure - Structure data to render
   * @param lodLevel - Level of detail (optional, auto-detected based on size)
   * @returns WebGL-ready render data
   * @throws PortError with code 'GENERATION_FAILED' if generation fails
   */
  generateRenderData(structure: StructureData, lodLevel?: LodLevel): Promise<RenderData>;

  /**
   * Apply a resource pack to get block textures
   *
   * @param resourcePackUrl - URL to resource pack (zip or folder)
   * @param blockIds - List of block IDs that need textures
   * @returns Texture atlas with UV mapping
   * @throws PortError with code 'INVALID_RESOURCE_PACK' if pack is invalid
   * @throws PortError with code 'FETCH_FAILED' if download fails
   */
  applyResourcePack(resourcePackUrl: string, blockIds: string[]): Promise<TextureAtlas>;
}

// ========================================
// Notification Port
// ========================================

/**
 * Gateway port for sending notifications
 *
 * Handles real-time (WebSocket) and push notifications.
 */
export interface NotificationPort {
  /**
   * Send notification to a single user
   *
   * @param userId - Target user ID
   * @param payload - Notification content
   * @throws PortError with code 'SEND_FAILED' if sending fails
   */
  notify(userId: string, payload: NotificationPayload): Promise<void>;

  /**
   * Send notification to multiple users
   *
   * Partial failures are handled gracefully - some notifications
   * may succeed while others fail.
   *
   * @param userIds - Target user IDs
   * @param payload - Notification content
   * @returns Result with success/failure counts
   */
  notifyBulk(userIds: string[], payload: NotificationPayload): Promise<BulkNotificationResult>;
}

// ========================================
// Email Port
// ========================================

/**
 * Gateway port for sending emails
 *
 * Handles transactional email delivery for authentication.
 */
export interface EmailPort {
  /**
   * Send email verification message
   *
   * @param email - Recipient email address
   * @param verificationToken - Token to include in verification link
   * @throws PortError with code 'SEND_FAILED' if sending fails
   */
  sendVerificationEmail(email: string, verificationToken: string): Promise<void>;

  /**
   * Send password reset message
   *
   * @param email - Recipient email address
   * @param resetToken - Token to include in reset link
   * @throws PortError with code 'SEND_FAILED' if sending fails
   */
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
}

// ========================================
// SMS Port
// ========================================

/**
 * Gateway port for sending SMS messages
 *
 * Handles SMS delivery for phone verification.
 */
export interface SmsPort {
  /**
   * Send verification code via SMS
   *
   * @param phoneNumber - Recipient phone number (E.164 format)
   * @param code - Verification code to send
   * @throws PortError with code 'INVALID_PHONE_NUMBER' if number is invalid
   * @throws PortError with code 'SEND_FAILED' if sending fails
   */
  sendVerificationCode(phoneNumber: string, code: string): Promise<void>;
}

// ========================================
// Spam Detector Port
// ========================================

/**
 * Gateway port for spam and abuse detection
 *
 * Handles rate limiting and content moderation.
 */
export interface SpamDetectorPort {
  /**
   * Check if an action is within rate limits
   *
   * @param userId - User performing the action
   * @param action - Action type (e.g., 'comment', 'post', 'like')
   * @returns Rate limit status
   */
  checkRateLimit(userId: string, action: string): Promise<RateLimitResult>;

  /**
   * Check content for violations
   *
   * @param content - Text content to check
   * @returns Content moderation result
   */
  checkContent(content: string): Promise<ContentCheckResult>;
}

// ========================================
// Password Hasher Port
// ========================================

/**
 * Gateway port for password hashing and verification
 *
 * Handles secure password hashing using bcrypt or similar algorithms.
 */
export interface PasswordHasherPort {
  /**
   * Hash a plain text password
   *
   * @param password - Plain text password to hash
   * @returns Hashed password string
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   *
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns True if password matches, false otherwise
   */
  verify(password: string, hash: string): Promise<boolean>;
}

// ========================================
// JWT Service Port
// ========================================

/**
 * Payload for access token generation
 */
export interface AccessTokenPayload {
  readonly userId: string;
  readonly email: string;
}

/**
 * Payload for refresh token generation
 */
export interface RefreshTokenPayload {
  readonly userId: string;
}

/**
 * Decoded token result
 */
export interface DecodedToken {
  readonly userId: string;
  readonly email?: string;
  readonly exp: number;
  readonly iat: number;
}

/**
 * Gateway port for JWT token operations
 *
 * Handles generation and verification of access and refresh tokens.
 */
export interface JwtServicePort {
  /**
   * Generate an access token
   *
   * @param payload - Token payload with user info
   * @returns Signed JWT access token
   */
  generateAccessToken(payload: AccessTokenPayload): Promise<string>;

  /**
   * Generate a refresh token
   *
   * @param payload - Token payload with user ID
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(payload: RefreshTokenPayload): Promise<string>;

  /**
   * Verify and decode an access token
   *
   * @param token - JWT access token to verify
   * @returns Decoded token payload
   * @throws PortError with code 'INVALID_TOKEN' if token is invalid
   * @throws PortError with code 'TOKEN_EXPIRED' if token has expired
   */
  verifyAccessToken(token: string): Promise<DecodedToken>;

  /**
   * Verify and decode a refresh token
   *
   * @param token - JWT refresh token to verify
   * @returns Decoded token payload
   * @throws PortError with code 'INVALID_TOKEN' if token is invalid
   * @throws PortError with code 'TOKEN_EXPIRED' if token has expired
   */
  verifyRefreshToken(token: string): Promise<DecodedToken>;
}
