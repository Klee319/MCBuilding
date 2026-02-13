/**
 * HTTP Layer Index
 */

export { createApp, type AppDependencies, type AppConfig } from './app.js';
export {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  errorHandler,
  type AuthUser,
  type JwtService,
} from './middleware/index.js';
export {
  createPostRoutes,
  createUserRoutes,
  createStructureRoutes,
  createSocialRoutes,
  createNotificationRoutes,
} from './routes/index.js';
export { SimpleJwtService, MockJwtService } from './services/simple-jwt-service.js';
