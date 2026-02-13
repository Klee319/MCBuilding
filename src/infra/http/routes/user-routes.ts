/**
 * User Routes
 *
 * HTTP routes for user-related endpoints.
 */

import { Hono } from 'hono';
import type { UserController } from '../../../interface/controllers/user-controller.js';
import type { HttpContext } from '../../../interface/controllers/types.js';
import {
  createAuthMiddleware,
  type AuthUser,
  type JwtService,
} from '../middleware/auth-middleware.js';

export function createUserRoutes(
  controller: UserController,
  jwtService: JwtService
): Hono {
  const app = new Hono();
  const authRequired = createAuthMiddleware(jwtService);

  // POST /api/v1/users/register - Register new user
  app.post('/register', async (c) => {
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: {},
      query: {},
      body,
    };

    const response = await controller.register(ctx);
    return c.json(response.body, response.status as 201);
  });

  // POST /api/v1/users/login - User login
  app.post('/login', async (c) => {
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: {},
      query: {},
      body,
    };

    const response = await controller.login(ctx);
    return c.json(response.body, response.status as 200 | 400 | 401);
  });

  // POST /api/v1/users/verify-email - Verify email
  app.post('/verify-email', async (c) => {
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: {},
      query: {},
      body,
    };

    const response = await controller.verifyEmail(ctx);
    return c.json(response.body, response.status as 200);
  });

  // POST /api/v1/users/verify-phone - Verify phone
  app.post('/verify-phone', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: {},
      query: {},
      body,
      user: { id: user.id },
    };

    const response = await controller.verifyPhone(ctx);
    return c.json(response.body, response.status as 200);
  });

  // GET /api/v1/users/me - Get current user
  app.get('/me', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: {},
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.getMe(ctx);
    return c.json(response.body, response.status as 200);
  });

  // GET /api/v1/users/:id - Get user profile
  app.get('/:id', async (c) => {
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
    };

    const response = await controller.getById(ctx);
    return c.json(response.body, response.status as 200);
  });

  return app;
}
