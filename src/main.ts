/**
 * Application Entry Point
 *
 * Starts the HTTP server with all dependencies wired up.
 *
 * Clean Architecture構成:
 * - Domain: ビジネスルール、エンティティ、値オブジェクト
 * - Usecase: アプリケーションロジック、Port定義
 * - Interface: コントローラー、プレゼンター、バリデーター
 * - Infra: リポジトリ実装、外部サービス連携、HTTPサーバー
 */

import { serve } from '@hono/node-server';
import { createApp } from './infra/http/app.js';
import { createContainer } from './infra/di/container.js';

// Configuration from environment
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'development-secret-key';
const CORS_ORIGINS = process.env['CORS_ORIGINS']?.split(',') ?? [
  'http://localhost:3000',
  'http://localhost:5173',
];

// Create container with dependencies
const container = createContainer({
  jwtSecret: JWT_SECRET,
  jwtExpiresInSeconds: 3600,
  useMockJwt: process.env['NODE_ENV'] === 'test',
});

// Create application
const app = createApp(container.appDependencies, {
  corsOrigins: CORS_ORIGINS,
  enableLogging: process.env['NODE_ENV'] !== 'test',
});

// Start server
console.log('MC Structure SNS - Starting...');
console.log(`Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`);

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Server is running on http://localhost:${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`API base: http://localhost:${PORT}/api/v1`);

export { app, container };
