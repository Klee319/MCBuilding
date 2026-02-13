/**
 * Notification Routes
 *
 * HTTP routes for notification-related endpoints.
 */

import { Hono } from 'hono';
import type { NotificationController } from '../../../interface/controllers/notification-controller.js';
import type { HttpContext } from '../../../interface/controllers/types.js';
import {
  createAuthMiddleware,
  type AuthUser,
  type JwtService,
} from '../middleware/auth-middleware.js';

export function createNotificationRoutes(
  controller: NotificationController,
  jwtService: JwtService
): Hono {
  const app = new Hono();
  const authRequired = createAuthMiddleware(jwtService);

  // GET /api/v1/notifications - Get notifications
  app.get('/', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: {},
      query: c.req.query() as Record<string, string>,
      body: {},
      user: { id: user.id },
    };

    const response = await controller.getNotifications(ctx);
    return c.json(response.body, response.status as 200);
  });

  // PATCH /api/v1/notifications/:id/read - Mark as read
  app.patch('/:id/read', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: {},
      body: {},
      user: { id: user.id },
    };

    const response = await controller.markAsRead(ctx);
    return c.json(response.body, response.status as 200);
  });

  return app;
}
