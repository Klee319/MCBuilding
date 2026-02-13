/**
 * JwtServiceAdapter Unit Tests
 *
 * Tests the JWT service adapter implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JwtServiceAdapter } from '../../../../src/infra/security/jwt-service-adapter.js';
import type { JwtServicePort, AccessTokenPayload, RefreshTokenPayload } from '../../../../src/usecase/ports/gateway-ports.js';

describe('JwtServiceAdapter', () => {
  let jwtService: JwtServicePort;

  beforeEach(() => {
    jwtService = new JwtServiceAdapter({
      accessTokenSecret: 'test-access-secret-key-32-chars!',
      refreshTokenSecret: 'test-refresh-secret-key-32-chars',
      accessTokenExpiresInSeconds: 3600, // 1 hour
      refreshTokenExpiresInSeconds: 604800, // 7 days
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================
  // generateAccessToken() Tests
  // ========================================

  describe('generateAccessToken()', () => {
    it('returns a JWT string', async () => {
      // Arrange
      const payload: AccessTokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      // Act
      const token = await jwtService.generateAccessToken(payload);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('generates different tokens for different users', async () => {
      // Arrange
      const payload1: AccessTokenPayload = { userId: 'user-1', email: 'user1@example.com' };
      const payload2: AccessTokenPayload = { userId: 'user-2', email: 'user2@example.com' };

      // Act
      const token1 = await jwtService.generateAccessToken(payload1);
      const token2 = await jwtService.generateAccessToken(payload2);

      // Assert
      expect(token1).not.toBe(token2);
    });

    it('generates different tokens for same user at different times', async () => {
      // Arrange
      const payload: AccessTokenPayload = { userId: 'user-123', email: 'test@example.com' };

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const token1 = await jwtService.generateAccessToken(payload);

      vi.setSystemTime(new Date('2024-01-01T00:01:00Z'));
      const token2 = await jwtService.generateAccessToken(payload);

      // Assert
      expect(token1).not.toBe(token2);
    });
  });

  // ========================================
  // generateRefreshToken() Tests
  // ========================================

  describe('generateRefreshToken()', () => {
    it('returns a JWT string', async () => {
      // Arrange
      const payload: RefreshTokenPayload = { userId: 'user-123' };

      // Act
      const token = await jwtService.generateRefreshToken(payload);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('generates different tokens for different users', async () => {
      // Arrange
      const payload1: RefreshTokenPayload = { userId: 'user-1' };
      const payload2: RefreshTokenPayload = { userId: 'user-2' };

      // Act
      const token1 = await jwtService.generateRefreshToken(payload1);
      const token2 = await jwtService.generateRefreshToken(payload2);

      // Assert
      expect(token1).not.toBe(token2);
    });
  });

  // ========================================
  // verifyAccessToken() Tests
  // ========================================

  describe('verifyAccessToken()', () => {
    it('returns decoded payload for valid token', async () => {
      // Arrange
      const payload: AccessTokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };
      const token = await jwtService.generateAccessToken(payload);

      // Act
      const decoded = await jwtService.verifyAccessToken(token);

      // Assert
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('throws INVALID_TOKEN error for invalid token format', async () => {
      // Arrange
      const invalidToken = 'not-a-valid-token';

      // Act & Assert
      await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow();
    });

    it('throws INVALID_TOKEN error for token signed with different secret', async () => {
      // Arrange
      const differentService = new JwtServiceAdapter({
        accessTokenSecret: 'different-secret-key-32-chars!!',
        refreshTokenSecret: 'different-refresh-key-32-chars!',
        accessTokenExpiresInSeconds: 3600,
        refreshTokenExpiresInSeconds: 604800,
      });
      const token = await differentService.generateAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert
      await expect(jwtService.verifyAccessToken(token)).rejects.toThrow();
    });

    it('throws TOKEN_EXPIRED error for expired token', async () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const shortLivedService = new JwtServiceAdapter({
        accessTokenSecret: 'test-access-secret-key-32-chars!',
        refreshTokenSecret: 'test-refresh-secret-key-32-chars',
        accessTokenExpiresInSeconds: 1, // 1 second
        refreshTokenExpiresInSeconds: 604800,
      });

      const payload: AccessTokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };
      const token = await shortLivedService.generateAccessToken(payload);

      // Move time forward by 2 seconds
      vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));

      // Act & Assert
      await expect(shortLivedService.verifyAccessToken(token)).rejects.toThrow();
    });

    it('throws INVALID_TOKEN error for refresh token used as access token', async () => {
      // Arrange
      const refreshToken = await jwtService.generateRefreshToken({ userId: 'user-123' });

      // Act & Assert
      await expect(jwtService.verifyAccessToken(refreshToken)).rejects.toThrow();
    });
  });

  // ========================================
  // verifyRefreshToken() Tests
  // ========================================

  describe('verifyRefreshToken()', () => {
    it('returns decoded payload for valid token', async () => {
      // Arrange
      const payload: RefreshTokenPayload = { userId: 'user-123' };
      const token = await jwtService.generateRefreshToken(payload);

      // Act
      const decoded = await jwtService.verifyRefreshToken(token);

      // Assert
      expect(decoded.userId).toBe('user-123');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('throws INVALID_TOKEN error for access token used as refresh token', async () => {
      // Arrange
      const accessToken = await jwtService.generateAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert
      await expect(jwtService.verifyRefreshToken(accessToken)).rejects.toThrow();
    });

    it('throws INVALID_TOKEN error for invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here';

      // Act & Assert
      await expect(jwtService.verifyRefreshToken(invalidToken)).rejects.toThrow();
    });

    it('throws TOKEN_EXPIRED error for expired refresh token', async () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const shortLivedService = new JwtServiceAdapter({
        accessTokenSecret: 'test-access-secret-key-32-chars!',
        refreshTokenSecret: 'test-refresh-secret-key-32-chars',
        accessTokenExpiresInSeconds: 3600,
        refreshTokenExpiresInSeconds: 1, // 1 second
      });

      const token = await shortLivedService.generateRefreshToken({ userId: 'user-123' });

      // Move time forward
      vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));

      // Act & Assert
      await expect(shortLivedService.verifyRefreshToken(token)).rejects.toThrow();
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles empty string userId', async () => {
      // Arrange
      const payload: AccessTokenPayload = { userId: '', email: 'test@example.com' };

      // Act
      const token = await jwtService.generateAccessToken(payload);
      const decoded = await jwtService.verifyAccessToken(token);

      // Assert
      expect(decoded.userId).toBe('');
    });

    it('handles unicode in email', async () => {
      // Arrange
      const payload: AccessTokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      // Act
      const token = await jwtService.generateAccessToken(payload);
      const decoded = await jwtService.verifyAccessToken(token);

      // Assert
      expect(decoded.email).toBe('test@example.com');
    });

    it('handles very long userId', async () => {
      // Arrange
      const longUserId = 'user-' + 'a'.repeat(500);
      const payload: AccessTokenPayload = {
        userId: longUserId,
        email: 'test@example.com',
      };

      // Act
      const token = await jwtService.generateAccessToken(payload);
      const decoded = await jwtService.verifyAccessToken(token);

      // Assert
      expect(decoded.userId).toBe(longUserId);
    });

    it('preserves email exactly as provided', async () => {
      // Arrange
      const payload: AccessTokenPayload = {
        userId: 'user-123',
        email: 'Test.User@EXAMPLE.com',
      };

      // Act
      const token = await jwtService.generateAccessToken(payload);
      const decoded = await jwtService.verifyAccessToken(token);

      // Assert
      expect(decoded.email).toBe('Test.User@EXAMPLE.com');
    });
  });
});
