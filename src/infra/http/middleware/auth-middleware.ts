/**
 * Authentication Middleware
 *
 * Handles JWT token verification and user extraction from requests.
 */

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

/**
 * Authenticated user info stored in context
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

/**
 * JWT payload structure
 */
interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly exp: number;
  readonly iat: number;
}

/**
 * JWT service interface for dependency injection
 */
export interface JwtService {
  verify(token: string): Promise<JwtPayload | null>;
  sign(payload: Omit<JwtPayload, 'exp' | 'iat'>): Promise<string>;
}

/**
 * Development mode user for testing
 */
const DEV_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@example.com',
};

const DEV_TOKEN = 'dev-token-123';
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Create auth middleware with required authentication
 */
export function createAuthMiddleware(jwtService: JwtService) {
  return createMiddleware<{ Variables: { user: AuthUser } }>(
    async (c, next) => {
      const authHeader = c.req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '認証が必要です',
            },
          },
          401 as const
        );
      }

      const token = authHeader.substring(7);

      // Dev mode bypass: accept dev token
      if (IS_DEV && token === DEV_TOKEN) {
        c.set('user', DEV_USER);
        return next();
      }

      const payload = await jwtService.verify(token);

      if (!payload) {
        return c.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'トークンが無効または期限切れです',
            },
          },
          401 as const
        );
      }

      c.set('user', {
        id: payload.sub,
        email: payload.email,
      });

      return next();
    }
  );
}

/**
 * Create optional auth middleware (extracts user if present, doesn't require it)
 */
export function createOptionalAuthMiddleware(jwtService: JwtService) {
  return createMiddleware<{ Variables: { user?: AuthUser } }>(
    async (c, next) => {
      const authHeader = c.req.header('Authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // Dev mode bypass: accept dev token
        if (IS_DEV && token === DEV_TOKEN) {
          c.set('user', DEV_USER);
          return next();
        }

        const payload = await jwtService.verify(token);

        if (payload) {
          c.set('user', {
            id: payload.sub,
            email: payload.email,
          });
        }
      }

      await next();
    }
  );
}

/**
 * Helper to get user from context
 */
export function getUser(c: Context): AuthUser | undefined {
  return c.get('user');
}

/**
 * Helper to require user from context (throws if not present)
 */
export function requireUser(c: Context): AuthUser {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
