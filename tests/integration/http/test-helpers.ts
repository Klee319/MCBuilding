/**
 * Integration Test Helpers for HTTP Layer
 *
 * Provides utilities for testing Hono HTTP routes with the full app stack.
 */

import type { Hono } from 'hono';
import { createApp, type AppDependencies } from '../../../src/infra/http/app.js';
import { createContainer, type Container } from '../../../src/infra/di/container.js';
import { MockJwtService } from '../../../src/infra/http/services/simple-jwt-service.js';
import type { User } from '../../../src/domain/entities/user.js';
import type { Post } from '../../../src/domain/entities/post.js';
import type { Structure } from '../../../src/domain/entities/structure.js';
import { User as UserFactory } from '../../../src/domain/entities/user.js';
import { Post as PostFactory } from '../../../src/domain/entities/post.js';
import { Structure as StructureFactory } from '../../../src/domain/entities/structure.js';
import { Email } from '../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../src/domain/value-objects/account-level.js';
import { Visibility } from '../../../src/domain/value-objects/visibility.js';
import { FileFormat } from '../../../src/domain/value-objects/file-format.js';
import { Edition } from '../../../src/domain/value-objects/edition.js';
import { Version } from '../../../src/domain/value-objects/version.js';
import { Dimensions } from '../../../src/domain/value-objects/dimensions.js';

// ========================================
// Test App Setup
// ========================================

export interface TestAppContext {
  app: Hono;
  container: Container;
  mockJwtService: MockJwtService;
}

/**
 * Create a test app with mock dependencies
 */
export function createTestApp(): TestAppContext {
  const mockJwtService = new MockJwtService();
  const container = createContainer({ useMockJwt: true });

  // Replace JWT service with our test mock
  const appDependencies: AppDependencies = {
    ...container.appDependencies,
    jwtService: mockJwtService,
  };

  const app = createApp(appDependencies, {
    corsOrigins: ['http://localhost:3000'],
    enableLogging: false, // Disable logging in tests
  });

  return { app, container, mockJwtService };
}

// ========================================
// Request Helpers
// ========================================

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Create authorization header with test token
 */
export function authHeader(userId: string): Record<string, string> {
  return {
    Authorization: `Bearer test-token-${userId}`,
  };
}

/**
 * Create JSON content type header
 */
export function jsonHeader(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Make a GET request to the app
 */
export async function get(
  app: Hono,
  path: string,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return app.request(path, {
    method: 'GET',
    headers: options.headers,
  });
}

/**
 * Make a POST request to the app
 */
export async function post(
  app: Hono,
  path: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: {
      ...jsonHeader(),
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make a PATCH request to the app
 */
export async function patch(
  app: Hono,
  path: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return app.request(path, {
    method: 'PATCH',
    headers: {
      ...jsonHeader(),
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make a DELETE request to the app
 */
export async function del(
  app: Hono,
  path: string,
  options: Omit<RequestOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return app.request(path, {
    method: 'DELETE',
    headers: options.headers,
  });
}

// ========================================
// Response Helpers
// ========================================

/**
 * Parse JSON response body
 */
export async function parseJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * API response interface
 */
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// ========================================
// Test Data Factories
// ========================================

let userCounter = 0;
let postCounter = 0;
let structureCounter = 0;

/**
 * Reset test data counters
 */
export function resetCounters(): void {
  userCounter = 0;
  postCounter = 0;
  structureCounter = 0;
}

/**
 * Create a test user and save to repository
 */
export async function createTestUser(
  container: Container,
  overrides: {
    id?: string;
    displayName?: string;
    email?: string;
    isEmailVerified?: boolean;
  } = {}
): Promise<User> {
  userCounter++;
  const id = overrides.id ?? `user-${userCounter}`;
  const email = overrides.email ?? `test${userCounter}@example.com`;
  const now = new Date();

  const user = UserFactory.create({
    id,
    displayName: overrides.displayName ?? `Test User ${userCounter}`,
    email: Email.create(email),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: overrides.isEmailVerified ?? true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  await container.repositories.user.save(user);
  return user;
}

/**
 * Create a test structure and save to repository
 */
export async function createTestStructure(
  container: Container,
  uploaderId: string,
  overrides: {
    id?: string;
  } = {}
): Promise<Structure> {
  structureCounter++;
  const id = overrides.id ?? `struct-${structureCounter}`;
  const now = new Date();

  const structure = StructureFactory.create({
    id,
    uploaderId,
    originalFormat: FileFormat.create('schematic'),
    originalEdition: Edition.create('java'),
    originalVersion: Version.create('1.20.4'),
    dimensions: Dimensions.create(10, 20, 10),
    blockCount: 500,
    createdAt: now,
  });

  await container.repositories.structure.save(structure);
  return structure;
}

/**
 * Create a test post and save to repository
 */
export async function createTestPost(
  container: Container,
  authorId: string,
  structureId: string,
  overrides: {
    id?: string;
    title?: string;
    visibility?: 'public' | 'private' | 'unlisted';
  } = {}
): Promise<Post> {
  postCounter++;
  const id = overrides.id ?? `post-${postCounter}`;
  const now = new Date();

  const post = PostFactory.create({
    id,
    authorId,
    structureId,
    title: overrides.title ?? `Test Post ${postCounter}`,
    description: 'Test description',
    tags: [],
    visibility: Visibility.create(overrides.visibility ?? 'public'),
    unlistedUrl: null,
    requiredMods: [],
    likeCount: 0,
    downloadCount: 0,
    commentCount: 0,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });

  await container.repositories.post.save(post);
  return post;
}

// ========================================
// Assertion Helpers
// ========================================

/**
 * Assert response has success status
 */
export function expectSuccess(response: Response, expectedStatus: number = 200): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

/**
 * Assert response has error status
 */
export function expectError(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}
