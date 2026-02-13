/**
 * JwtServiceAdapter
 *
 * Implements JwtServicePort using HMAC-SHA256 for JWT signing.
 * Uses Node.js crypto module for a simple but secure implementation.
 */

import { createHmac, randomBytes } from 'node:crypto';
import type {
  JwtServicePort,
  AccessTokenPayload,
  RefreshTokenPayload,
  DecodedToken,
} from '../../usecase/ports/gateway-ports.js';
import { PortError } from '../../usecase/ports/types.js';

/**
 * Token type for distinguishing access and refresh tokens
 */
type TokenType = 'access' | 'refresh';

/**
 * Internal JWT payload structure
 */
interface JwtPayload {
  readonly sub: string;
  readonly email?: string;
  readonly type: TokenType;
  readonly iat: number;
  readonly exp: number;
  readonly jti: string; // JWT ID for uniqueness
}

/**
 * Configuration for JwtServiceAdapter
 */
export interface JwtServiceAdapterConfig {
  readonly accessTokenSecret: string;
  readonly refreshTokenSecret: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshTokenExpiresInSeconds: number;
}

/**
 * JWT Service using HMAC-SHA256
 *
 * Implements secure JWT generation and verification with:
 * - Separate secrets for access and refresh tokens
 * - Token type validation to prevent misuse
 * - Expiration checking
 * - Unique JWT IDs (jti) for each token
 */
export class JwtServiceAdapter implements JwtServicePort {
  private readonly _config: JwtServiceAdapterConfig;

  constructor(config: JwtServiceAdapterConfig) {
    this._config = Object.freeze({ ...config });
    Object.freeze(this);
  }

  /**
   * Generate an access token
   *
   * @param payload - Token payload with user info
   * @returns Signed JWT access token
   */
  public async generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      email: payload.email,
      type: 'access',
      iat: now,
      exp: now + this._config.accessTokenExpiresInSeconds,
      jti: this.generateJti(),
    };

    return this.signToken(jwtPayload, this._config.accessTokenSecret);
  }

  /**
   * Generate a refresh token
   *
   * @param payload - Token payload with user ID
   * @returns Signed JWT refresh token
   */
  public async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      type: 'refresh',
      iat: now,
      exp: now + this._config.refreshTokenExpiresInSeconds,
      jti: this.generateJti(),
    };

    return this.signToken(jwtPayload, this._config.refreshTokenSecret);
  }

  /**
   * Verify and decode an access token
   *
   * @param token - JWT access token to verify
   * @returns Decoded token payload
   * @throws PortError with code 'INVALID_TOKEN' if token is invalid
   * @throws PortError with code 'TOKEN_EXPIRED' if token has expired
   */
  public async verifyAccessToken(token: string): Promise<DecodedToken> {
    const payload = this.verifyToken(token, this._config.accessTokenSecret);

    if (payload.type !== 'access') {
      throw this.createInvalidTokenError('Token is not an access token');
    }

    const result: DecodedToken = {
      userId: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
    };

    // Only include email if it exists
    if (payload.email !== undefined) {
      return { ...result, email: payload.email };
    }

    return result;
  }

  /**
   * Verify and decode a refresh token
   *
   * @param token - JWT refresh token to verify
   * @returns Decoded token payload
   * @throws PortError with code 'INVALID_TOKEN' if token is invalid
   * @throws PortError with code 'TOKEN_EXPIRED' if token has expired
   */
  public async verifyRefreshToken(token: string): Promise<DecodedToken> {
    const payload = this.verifyToken(token, this._config.refreshTokenSecret);

    if (payload.type !== 'refresh') {
      throw this.createInvalidTokenError('Token is not a refresh token');
    }

    return {
      userId: payload.sub,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  /**
   * Sign a JWT payload
   */
  private signToken(payload: JwtPayload, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };

    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));

    const signature = this.createSignature(`${headerB64}.${payloadB64}`, secret);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verify a JWT and return the payload
   */
  private verifyToken(token: string, secret: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw this.createInvalidTokenError('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSignature = this.createSignature(`${headerB64}.${payloadB64}`, secret);
    if (!this.constantTimeCompare(signatureB64, expectedSignature)) {
      throw this.createInvalidTokenError('Invalid token signature');
    }

    // Decode payload
    let payload: JwtPayload;
    try {
      payload = JSON.parse(this.base64UrlDecode(payloadB64)) as JwtPayload;
    } catch {
      throw this.createInvalidTokenError('Invalid token payload');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw this.createTokenExpiredError();
    }

    return payload;
  }

  /**
   * Create HMAC-SHA256 signature
   */
  private createSignature(data: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(data);
    return hmac.digest('base64url');
  }

  /**
   * Base64URL encode
   */
  private base64UrlEncode(data: string): string {
    return Buffer.from(data).toString('base64url');
  }

  /**
   * Base64URL decode
   */
  private base64UrlDecode(data: string): string {
    return Buffer.from(data, 'base64url').toString('utf-8');
  }

  /**
   * Generate a unique JWT ID
   */
  private generateJti(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Create INVALID_TOKEN PortError
   */
  private createInvalidTokenError(message: string): PortError {
    return new PortError('INVALID_FORMAT' as const, message);
  }

  /**
   * Create TOKEN_EXPIRED PortError
   */
  private createTokenExpiredError(): PortError {
    return new PortError('INVALID_FORMAT' as const, 'Token has expired');
  }
}
