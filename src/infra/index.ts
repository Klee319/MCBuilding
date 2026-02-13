/**
 * Infra Layer - Minecraft建築データ共有SNS
 *
 * このレイヤーは技術的詳細を担当します。
 * データベース、外部API、建築データ変換、ファイルストレージなどの
 * 具体的な実装を提供し、UsecaseレイヤのPort（インターフェース）を実装します。
 *
 * 依存ルール: Domain層、Usecase層（Portの実装）
 */

// ========================================
// In-Memory Repositories (Testing/Development)
// ========================================
export {
  InMemoryUserRepository,
  InMemoryStructureRepository,
  InMemoryPostRepository,
  InMemoryCommentRepository,
  InMemoryLikeRepository,
  InMemoryFollowRepository,
  InMemoryNotificationRepository,
} from './repositories/in-memory/index.js';

// ========================================
// Mock Gateways (Testing)
// ========================================
export {
  MockEmailGateway,
  MockSmsGateway,
  MockNotificationGateway,
  MockSpamDetectorGateway,
  MockStructureConverterGateway,
  MockRendererDataGateway,
  type SentEmail,
  type SentSms,
  type SentNotification,
} from './gateways/mock/index.js';

// ========================================
// Production Repositories (Postgres)
// ========================================
// export { PostgresStructureRepository } from './repositories/postgres/PostgresStructureRepository.js'
// export { PostgresPostRepository } from './repositories/postgres/PostgresPostRepository.js'
// export { PostgresUserRepository } from './repositories/postgres/PostgresUserRepository.js'
// export { PostgresCommentRepository } from './repositories/postgres/PostgresCommentRepository.js'

// ========================================
// Storage
// ========================================
// export { S3StructureStorage } from './storage/S3StructureStorage.js'
// export { ResourcePackCache } from './storage/ResourcePackCache.js'

// ========================================
// Converters
// ========================================
// export { StructureConverter } from './converters/StructureConverter.js'
// export { BlockMapper } from './converters/BlockMapper.js'
// export { SchematicParser } from './converters/parsers/SchematicParser.js'
// export { LitematicParser } from './converters/parsers/LitematicParser.js'
// export { McStructureParser } from './converters/parsers/McStructureParser.js'

// ========================================
// Renderers
// ========================================
// export { RendererDataGenerator } from './renderers/RendererDataGenerator.js'
// export { MeshBuilder } from './renderers/MeshBuilder.js'
// export { TextureAtlasGenerator } from './renderers/TextureAtlasGenerator.js'

// ========================================
// Production Gateways
// ========================================
// export { SendGridEmailAdapter } from './gateways/email/SendGridEmailAdapter.js'
// export { TwilioSmsAdapter } from './gateways/sms/TwilioSmsAdapter.js'
// export { WebSocketNotificationAdapter } from './gateways/notification/WebSocketNotificationAdapter.js'
// export { WebPushNotificationAdapter } from './gateways/notification/WebPushNotificationAdapter.js'
// export { RedisSpamDetector } from './gateways/spam/RedisSpamDetector.js'

// ========================================
// Config
// ========================================
// export { databaseConfig } from './config/database.js'
// export { redisConfig } from './config/redis.js'
// export { s3Config } from './config/s3.js'
// export { externalConfig } from './config/external.js'

// ========================================
// HTTP Layer
// ========================================
export {
  createApp,
  type AppDependencies,
  type AppConfig,
} from './http/app.js';
export {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  errorHandler,
  type AuthUser,
  type JwtService,
} from './http/middleware/index.js';
export {
  createPostRoutes,
  createUserRoutes,
  createStructureRoutes,
  createSocialRoutes,
  createNotificationRoutes,
} from './http/routes/index.js';
export {
  SimpleJwtService,
  MockJwtService,
} from './http/services/simple-jwt-service.js';

// ========================================
// DI Container
// ========================================
export {
  createContainer,
  type Container,
  type ContainerConfig,
} from './di/container.js';
