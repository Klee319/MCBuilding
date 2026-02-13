/**
 * Simple JWT Service
 *
 * A simple JWT implementation for development/testing.
 * In production, use a proper JWT library like jose.
 */

import type { JwtService } from '../middleware/auth-middleware.js';

interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly exp: number;
  readonly iat: number;
}

/**
 * Simple JWT service using base64 encoding
 * WARNING: This is NOT cryptographically secure.
 * Use jose or jsonwebtoken in production.
 */
export class SimpleJwtService implements JwtService {
  private readonly _secret: string;
  private readonly _expiresInSeconds: number;

  constructor(secret: string, expiresInSeconds: number = 3600) {
    this._secret = secret;
    this._expiresInSeconds = expiresInSeconds;
  }

  public async verify(token: string): Promise<JwtPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify signature
      const expectedSignature = this.createSignature(headerB64, payloadB64);
      if (signatureB64 !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as JwtPayload;

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  public async sign(
    payload: Omit<JwtPayload, 'exp' | 'iat'>
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this._expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
      'base64url'
    );

    const signature = this.createSignature(headerB64, payloadB64);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private createSignature(headerB64: string, payloadB64: string): string {
    // Simple HMAC-like signature (NOT cryptographically secure)
    // In production, use proper HMAC-SHA256
    const data = `${headerB64}.${payloadB64}.${this._secret}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Buffer.from(hash.toString(16)).toString('base64url');
  }
}

/**
 * Create a JWT service for testing that accepts any token with format "test-token-{userId}"
 */
export class MockJwtService implements JwtService {
  public async verify(token: string): Promise<JwtPayload | null> {
    if (token.startsWith('test-token-')) {
      const userId = token.substring('test-token-'.length);
      return {
        sub: userId,
        email: `${userId}@test.com`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
    }
    return null;
  }

  public async sign(
    payload: Omit<JwtPayload, 'exp' | 'iat'>
  ): Promise<string> {
    return `test-token-${payload.sub}`;
  }
}
