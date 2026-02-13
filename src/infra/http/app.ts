/**
 * Application Factory
 *
 * Creates the Hono application with all routes and middleware.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { errorHandler } from './middleware/error-middleware.js';
import type { JwtService } from './middleware/auth-middleware.js';
import {
  createPostRoutes,
  createUserRoutes,
  createStructureRoutes,
  createSocialRoutes,
  createNotificationRoutes,
} from './routes/index.js';
import { createTextureRoutes } from './routes/texture-routes.js';

// Controllers
import type { PostController } from '../../interface/controllers/post-controller.js';
import type { UserController } from '../../interface/controllers/user-controller.js';
import type { StructureController } from '../../interface/controllers/structure-controller.js';
import type { SocialController } from '../../interface/controllers/social-controller.js';
import type { NotificationController } from '../../interface/controllers/notification-controller.js';

/**
 * Dependencies for creating the application
 */
export interface AppDependencies {
  readonly jwtService: JwtService;
  readonly postController: PostController;
  readonly userController: UserController;
  readonly structureController: StructureController;
  readonly socialController: SocialController;
  readonly notificationController: NotificationController;
}

/**
 * Application configuration
 */
export interface AppConfig {
  readonly corsOrigins?: string[];
  readonly enableLogging?: boolean;
}

/**
 * Create the Hono application
 */
export function createApp(
  deps: AppDependencies,
  config: AppConfig = {}
): Hono {
  const app = new Hono();

  // Global middleware
  if (config.enableLogging !== false) {
    app.use('*', logger());
  }

  // CORS
  app.use(
    '*',
    cors({
      origin: config.corsOrigins ?? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Total-Count'],
      maxAge: 86400,
      credentials: true,
    })
  );

  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  const api = new Hono();

  // Mount route groups
  api.route('/posts', createPostRoutes(deps.postController, deps.jwtService));
  api.route('/users', createUserRoutes(deps.userController, deps.jwtService));
  api.route(
    '/structures',
    createStructureRoutes(deps.structureController, deps.jwtService)
  );
  api.route(
    '/notifications',
    createNotificationRoutes(deps.notificationController, deps.jwtService)
  );

  // Social routes are split across posts and users
  const socialRoutes = createSocialRoutes(deps.socialController, deps.jwtService);
  api.route('/', socialRoutes);

  // Texture routes (no auth required)
  api.route('/textures', createTextureRoutes());

  // Mount API under /api/v1
  app.route('/api/v1', api);

  // Global error handler
  app.onError(errorHandler);

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'エンドポイントが見つかりません',
        },
      },
      404
    );
  });

  return app;
}
