/**
 * Test Helpers for Controller Tests
 *
 * Provides mock factories and utility functions for testing controllers.
 */

import { vi, expect } from 'vitest';
import type { HttpContext } from '../../../../src/interface/controllers/types.js';
import type { Post } from '../../../../src/domain/entities/post.js';
import type { User } from '../../../../src/domain/entities/user.js';
import type { Comment } from '../../../../src/domain/entities/comment.js';
import type { Structure } from '../../../../src/domain/entities/structure.js';
import type { Notification } from '../../../../src/domain/entities/notification.js';
import type {
  UserRepositoryPort,
  PostRepositoryPort,
  CommentRepositoryPort,
  StructureRepositoryPort,
  NotificationRepositoryPort,
} from '../../../../src/usecase/ports/repository-ports.js';
import type { PaginatedResult, RenderData } from '../../../../src/usecase/ports/types.js';

// ========================================
// Mock User Factory
// ========================================

export interface MockUserData {
  id: string;
  displayName: string;
  email: string;
  accountLevel: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  linkedSns: string[];
  pinnedPostIds: string[];
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUserData(overrides?: Partial<MockUserData>): MockUserData {
  const now = new Date();
  return {
    id: 'user-123',
    displayName: 'Test User',
    email: 'test@example.com',
    accountLevel: 'registered',
    isEmailVerified: true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 10,
    followingCount: 5,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<MockUserData>): User {
  const data = createMockUserData(overrides);
  return {
    id: data.id,
    displayName: data.displayName,
    email: { value: data.email },
    accountLevel: {
      value: data.accountLevel,
      canDownload: () => true,
      badges: () => [],
    },
    isEmailVerified: data.isEmailVerified,
    isPhoneVerified: data.isPhoneVerified,
    linkedSns: data.linkedSns,
    pinnedPostIds: data.pinnedPostIds,
    followerCount: data.followerCount,
    followingCount: data.followingCount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    canDownload: () => true,
    canPinPost: () => true,
  } as unknown as User;
}

// ========================================
// Mock Post Factory
// ========================================

export interface MockPostData {
  id: string;
  authorId: string;
  structureId: string;
  title: string;
  description: string;
  tags: { value: string }[];
  visibility: { value: string; isPublic: () => boolean; isPrivate: () => boolean; isUnlisted: () => boolean };
  unlistedUrl: { token: string; expiresAt: Date | null } | null;
  requiredMods: string[];
  likeCount: number;
  downloadCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockPostData(overrides?: Partial<MockPostData>): MockPostData {
  const now = new Date();
  return {
    id: 'post-123',
    authorId: 'user-123',
    structureId: 'struct-123',
    title: 'Test Post',
    description: 'Test description',
    tags: [{ value: 'test' }],
    visibility: {
      value: 'public',
      isPublic: () => true,
      isPrivate: () => false,
      isUnlisted: () => false,
    },
    unlistedUrl: null,
    requiredMods: [],
    likeCount: 10,
    downloadCount: 5,
    commentCount: 3,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockPost(overrides?: Partial<MockPostData>): Post {
  const data = createMockPostData(overrides);
  return {
    ...data,
    isPublic: data.visibility.isPublic,
    isPrivate: data.visibility.isPrivate,
    isUnlisted: data.visibility.isUnlisted,
    isAccessible: () => true,
  } as unknown as Post;
}

// ========================================
// Mock Comment Factory
// ========================================

export interface MockCommentData {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
}

export function createMockCommentData(overrides?: Partial<MockCommentData>): MockCommentData {
  return {
    id: 'comment-123',
    postId: 'post-123',
    authorId: 'user-123',
    parentCommentId: null,
    content: 'Test comment',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockComment(overrides?: Partial<MockCommentData>): Comment {
  const data = createMockCommentData(overrides);
  return {
    ...data,
    isReply: () => data.parentCommentId !== null,
    isTopLevel: () => data.parentCommentId === null,
  } as unknown as Comment;
}

// ========================================
// Mock Structure Factory
// ========================================

export interface MockStructureData {
  id: string;
  uploaderId: string;
  originalFormat: string;
  originalEdition: string;
  originalVersion: string;
  dimensions: { x: number; y: number; z: number };
  blockCount: number;
  availableEditions: string[];
  availableVersions: string[];
  createdAt: Date;
}

export function createMockStructureData(overrides?: Partial<MockStructureData>): MockStructureData {
  return {
    id: 'struct-123',
    uploaderId: 'user-123',
    originalFormat: 'schematic',
    originalEdition: 'java',
    originalVersion: '1.20.4',
    dimensions: { x: 10, y: 20, z: 10 },
    blockCount: 500,
    availableEditions: ['java', 'bedrock'],
    availableVersions: ['1.20.4', '1.19.4'],
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockStructure(overrides?: Partial<MockStructureData>): Structure {
  return createMockStructureData(overrides) as unknown as Structure;
}

// ========================================
// Mock Notification Factory
// ========================================

export interface MockNotificationData {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedUserId: string | null;
  relatedPostId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function createMockNotificationData(overrides?: Partial<MockNotificationData>): MockNotificationData {
  return {
    id: 'notif-123',
    userId: 'user-123',
    type: 'like',
    message: 'Someone liked your post',
    relatedUserId: 'user-456',
    relatedPostId: 'post-123',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockNotification(overrides?: Partial<MockNotificationData>): Notification {
  return createMockNotificationData(overrides) as unknown as Notification;
}

// ========================================
// Mock HttpContext Factory
// ========================================

export interface CreateContextOptions {
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  user?: { id: string } | null;
}

export function createMockContext(options: CreateContextOptions = {}): HttpContext {
  return {
    params: options.params ?? {},
    query: options.query ?? {},
    body: options.body ?? {},
    file: options.file,
    user: options.user === null ? undefined : options.user ?? { id: 'user-123' },
  };
}

export function createUnauthenticatedContext(options: Omit<CreateContextOptions, 'user'> = {}): HttpContext {
  return createMockContext({ ...options, user: null });
}

// ========================================
// Mock Repository Factories
// ========================================

export function createMockUserRepository(overrides?: Partial<UserRepositoryPort>): UserRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(createMockUser()),
    findByEmail: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation((user) => Promise.resolve(user)),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockPostRepository(overrides?: Partial<PostRepositoryPort>): PostRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(createMockPost()),
    findByUnlistedUrl: vi.fn().mockResolvedValue(null),
    search: vi.fn().mockResolvedValue({
      items: [createMockPost()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    } as PaginatedResult<Post>),
    findByAuthor: vi.fn().mockResolvedValue([createMockPost()]),
    save: vi.fn().mockImplementation((post) => Promise.resolve(post)),
    delete: vi.fn().mockResolvedValue(undefined),
    incrementDownloadCount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockCommentRepository(overrides?: Partial<CommentRepositoryPort>): CommentRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(createMockComment()),
    findByPost: vi.fn().mockResolvedValue([createMockComment()]),
    save: vi.fn().mockImplementation((comment) => Promise.resolve(comment)),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockStructureRepository(overrides?: Partial<StructureRepositoryPort>): StructureRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(createMockStructure()),
    save: vi.fn().mockImplementation((structure) => Promise.resolve(structure)),
    delete: vi.fn().mockResolvedValue(undefined),
    getDownloadUrl: vi.fn().mockResolvedValue('https://example.com/download/struct-123'),
    ...overrides,
  };
}

export function createMockNotificationRepository(overrides?: Partial<NotificationRepositoryPort>): NotificationRepositoryPort {
  return {
    findById: vi.fn().mockResolvedValue(createMockNotification()),
    findByUser: vi.fn().mockResolvedValue({
      items: [createMockNotification()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    }),
    save: vi.fn().mockImplementation((notification) => Promise.resolve(notification)),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ========================================
// Mock Usecase Factories
// ========================================

export interface MockUsecaseResult<T> {
  execute: ReturnType<typeof vi.fn>;
}

export function createMockUsecase<T>(result: T): MockUsecaseResult<T> {
  return {
    execute: vi.fn().mockResolvedValue(result),
  };
}

export function createFailingUsecase(error: Error): MockUsecaseResult<never> {
  return {
    execute: vi.fn().mockRejectedValue(error),
  };
}

// ========================================
// Mock Render Data Factory
// ========================================

export function createMockRenderData(): RenderData {
  return {
    dimensions: { x: 10, y: 20, z: 10 },
    blocks: [
      { x: 0, y: 0, z: 0, paletteIndex: 0 },
      { x: 1, y: 1, z: 1, paletteIndex: 1 },
    ],
    palette: [
      { name: 'minecraft:stone' },
      { name: 'minecraft:dirt' },
    ],
    lodLevel: 'medium',
  };
}

// ========================================
// Assertion Helpers
// ========================================

export function expectSuccessResponse(response: { status: number; body: unknown }, expectedStatus: number = 200): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', true);
}

export function expectErrorResponse(response: { status: number; body: unknown }, expectedStatus: number, expectedCode?: string): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  if (expectedCode) {
    expect(response.body).toHaveProperty('error.code', expectedCode);
  }
}

export function expectPaginatedResponse(
  response: { status: number; body: unknown },
  expectedTotal: number,
  expectedPage: number = 1
): void {
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('meta.total', expectedTotal);
  expect(response.body).toHaveProperty('meta.page', expectedPage);
}
