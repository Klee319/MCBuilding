/**
 * Post Routes
 *
 * HTTP routes for post-related endpoints.
 */

import { Hono } from 'hono';
import type { PostController } from '../../../interface/controllers/post-controller.js';
import type { HttpContext } from '../../../interface/controllers/types.js';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  type AuthUser,
  type JwtService,
} from '../middleware/auth-middleware.js';

export function createPostRoutes(
  controller: PostController,
  jwtService: JwtService
): Hono {
  const app = new Hono();
  const authRequired = createAuthMiddleware(jwtService);
  const authOptional = createOptionalAuthMiddleware(jwtService);

  // GET /api/v1/posts - Search posts
  app.get('/', authOptional, async (c) => {
    const user = c.get('user') as AuthUser | undefined;
    const ctx: HttpContext = {
      params: {},
      query: c.req.query() as Record<string, string>,
      body: {},
      ...(user && { user: { id: user.id } }),
    };

    console.log('Search posts query:', ctx.query);
    try {
      const response = await controller.search(ctx);
      return c.json(response.body, response.status as 200);
    } catch (err) {
      console.error('Search posts error:', err);
      throw err;
    }
  });

  // GET /api/v1/posts/unlisted/:token - Get unlisted post
  app.get('/unlisted/:token', authOptional, async (c) => {
    const user = c.get('user') as AuthUser | undefined;
    const ctx: HttpContext = {
      params: { token: c.req.param('token') },
      query: {},
      body: {},
      ...(user && { user: { id: user.id } }),
    };

    const response = await controller.getByUnlistedToken(ctx);
    return c.json(response.body, response.status as 200);
  });

  // GET /api/v1/posts/:id - Get post detail
  app.get('/:id', authOptional, async (c) => {
    const user = c.get('user') as AuthUser | undefined;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      ...(user && { user: { id: user.id } }),
    };

    const response = await controller.getById(ctx);
    return c.json(response.body, response.status as 200);
  });

  // POST /api/v1/posts - Create post
  app.post('/', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: {},
      query: {},
      body,
      user: { id: user.id },
    };

    const response = await controller.create(ctx);
    return c.json(response.body, response.status as 201);
  });

  // PATCH /api/v1/posts/:id - Update post
  app.patch('/:id', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body,
      user: { id: user.id },
    };

    const response = await controller.update(ctx);
    return c.json(response.body, response.status as 200);
  });

  // DELETE /api/v1/posts/:id - Delete post
  app.delete('/:id', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.delete(ctx);
    return c.json(response.body, response.status as 200);
  });

  return app;
}
