/**
 * Social Routes
 *
 * HTTP routes for social-related endpoints (likes, comments, follows).
 */

import { Hono } from 'hono';
import type { SocialController } from '../../../interface/controllers/social-controller.js';
import type { HttpContext } from '../../../interface/controllers/types.js';
import {
  createAuthMiddleware,
  type AuthUser,
  type JwtService,
} from '../middleware/auth-middleware.js';

export function createSocialRoutes(
  controller: SocialController,
  jwtService: JwtService
): Hono {
  const app = new Hono();
  const authRequired = createAuthMiddleware(jwtService);

  // POST /api/v1/posts/:id/like - Like a post
  app.post('/posts/:id/like', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.likePost(ctx);
    return c.json(response.body, response.status as 200);
  });

  // DELETE /api/v1/posts/:id/like - Unlike a post
  app.delete('/posts/:id/like', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.unlikePost(ctx);
    return c.json(response.body, response.status as 200);
  });

  // GET /api/v1/posts/:id/comments - Get comments for a post
  app.get('/posts/:id/comments', async (c) => {
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: c.req.query() as Record<string, string>,
      body: {},
    };

    const response = await controller.getComments(ctx);
    return c.json(response.body, response.status as 200);
  });

  // POST /api/v1/posts/:id/comments - Add a comment
  app.post('/posts/:id/comments', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const body = await c.req.json();
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body,
      user: { id: user.id },
    };

    const response = await controller.addComment(ctx);
    return c.json(response.body, response.status as 201);
  });

  // DELETE /api/v1/comments/:id - Delete a comment
  app.delete('/comments/:id', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.deleteComment(ctx);
    return c.json(response.body, response.status as 200);
  });

  // POST /api/v1/users/:id/follow - Follow a user
  app.post('/users/:id/follow', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.followUser(ctx);
    return c.json(response.body, response.status as 200);
  });

  // DELETE /api/v1/users/:id/follow - Unfollow a user
  app.delete('/users/:id/follow', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.unfollowUser(ctx);
    return c.json(response.body, response.status as 200);
  });

  return app;
}
