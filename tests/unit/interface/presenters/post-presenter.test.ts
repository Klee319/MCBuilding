/**
 * Post Presenter Unit Tests
 *
 * TDD tests for PostPresenter class.
 * Tests post entity formatting for API responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PostPresenter, type PostWithRelations } from '../../../../src/interface/presenters/post-presenter.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Structure } from '../../../../src/domain/entities/structure.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import { UnlistedUrl } from '../../../../src/domain/value-objects/unlisted-url.js';
import { Edition } from '../../../../src/domain/value-objects/edition.js';
import { Version } from '../../../../src/domain/value-objects/version.js';
import { FileFormat } from '../../../../src/domain/value-objects/file-format.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// ========================================
// Mock Data Factory
// ========================================
function createMockUser(overrides: Partial<{
  id: string;
  displayName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  linkedSns: readonly string[];
}> = {}): User {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return User.create({
    id: overrides.id ?? 'author-123',
    displayName: overrides.displayName ?? 'Test Author',
    email: Email.create('author@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: overrides.isEmailVerified ?? true,
    isPhoneVerified: overrides.isPhoneVerified ?? false,
    linkedSns: overrides.linkedSns ?? [],
    pinnedPostIds: [],
    followerCount: 100,
    followingCount: 50,
    createdAt: now,
    updatedAt: now,
  });
}

function createMockPost(overrides: Partial<{
  id: string;
  authorId: string;
  structureId: string;
  title: string;
  description: string;
  tags: readonly Tag[];
  visibility: Visibility;
  unlistedUrl: UnlistedUrl | null;
  requiredMods: readonly string[];
  likeCount: number;
  downloadCount: number;
  commentCount: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}> = {}): Post {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return Post.create({
    id: overrides.id ?? 'post-123',
    authorId: overrides.authorId ?? 'author-123',
    structureId: overrides.structureId ?? 'structure-123',
    title: overrides.title ?? 'Test Post',
    description: overrides.description ?? 'Test description',
    tags: overrides.tags ?? [Tag.create('minecraft'), Tag.create('build')],
    visibility: overrides.visibility ?? Visibility.public(),
    unlistedUrl: overrides.unlistedUrl ?? null,
    requiredMods: overrides.requiredMods ?? [],
    likeCount: overrides.likeCount ?? 0,
    downloadCount: overrides.downloadCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
    isPinned: overrides.isPinned ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  });
}

function createMockStructure(): Structure {
  return Structure.create({
    id: 'structure-123',
    uploaderId: 'author-123',
    originalEdition: Edition.java(),
    originalVersion: Version.create('1.20.4'),
    originalFormat: FileFormat.schematic(),
    dimensions: Dimensions.create(64, 128, 64),
    blockCount: 50000,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  });
}

function createPostWithRelations(
  postOverrides: Parameters<typeof createMockPost>[0] = {},
  userOverrides: Parameters<typeof createMockUser>[0] = {}
): PostWithRelations {
  return {
    post: createMockPost(postOverrides),
    author: createMockUser(userOverrides),
    structure: createMockStructure(),
  };
}

// ========================================
// Test: toOutput method
// ========================================
describe('PostPresenter.toOutput', () => {
  it('returns correct post output structure', () => {
    const postWithRelations = createPostWithRelations();
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('tags');
    expect(result).toHaveProperty('requiredMods');
    expect(result).toHaveProperty('visibility');
    expect(result).toHaveProperty('unlistedUrl');
    expect(result).toHaveProperty('unlistedExpiry');
    expect(result).toHaveProperty('author');
    expect(result).toHaveProperty('structure');
    expect(result).toHaveProperty('likeCount');
    expect(result).toHaveProperty('downloadCount');
    expect(result).toHaveProperty('commentCount');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });

  it('formats post id correctly', () => {
    const postWithRelations = createPostWithRelations({ id: 'post-abc-123' });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.id).toBe('post-abc-123');
  });

  it('formats title correctly', () => {
    const postWithRelations = createPostWithRelations({ title: 'Amazing Structure' });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.title).toBe('Amazing Structure');
  });

  it('formats description correctly', () => {
    const postWithRelations = createPostWithRelations({ description: 'A detailed description' });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.description).toBe('A detailed description');
  });

  it('formats empty description as null', () => {
    const postWithRelations = createPostWithRelations({ description: '' });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.description).toBeNull();
  });

  it('formats tags as string array', () => {
    const tags = [Tag.create('minecraft'), Tag.create('castle'), Tag.create('medieval')];
    const postWithRelations = createPostWithRelations({ tags });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.tags).toEqual(['minecraft', 'castle', 'medieval']);
  });

  it('formats empty tags as empty array', () => {
    const postWithRelations = createPostWithRelations({ tags: [] });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.tags).toEqual([]);
  });

  it('formats requiredMods correctly', () => {
    const postWithRelations = createPostWithRelations({
      requiredMods: ['create', 'worldedit'],
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.requiredMods).toEqual(['create', 'worldedit']);
  });

  it('formats visibility as string value', () => {
    const postWithRelations = createPostWithRelations({ visibility: Visibility.private() });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.visibility).toBe('private');
  });

  it('formats unlistedUrl as null for public posts', () => {
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.public(),
      unlistedUrl: null,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.unlistedUrl).toBeNull();
    expect(result.unlistedExpiry).toBeNull();
  });

  it('formats unlistedUrl token for unlisted posts', () => {
    const futureDate = new Date(Date.now() + 86400000);
    const unlistedUrl = UnlistedUrl.create('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', futureDate);
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.unlisted(),
      unlistedUrl,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.unlistedUrl).toBe('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
    expect(result.unlistedExpiry).toBe(futureDate.toISOString());
  });

  it('formats author as user summary', () => {
    const postWithRelations = createPostWithRelations(
      {},
      { id: 'author-456', displayName: 'Author Name' }
    );
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.author).toHaveProperty('id', 'author-456');
    expect(result.author).toHaveProperty('displayName', 'Author Name');
    expect(result.author).toHaveProperty('accountLevel');
    expect(result.author).toHaveProperty('badges');
    expect(result.author).not.toHaveProperty('followerCount');
  });

  it('formats likeCount correctly', () => {
    const postWithRelations = createPostWithRelations({ likeCount: 150 });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.likeCount).toBe(150);
  });

  it('formats downloadCount correctly', () => {
    const postWithRelations = createPostWithRelations({ downloadCount: 500 });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.downloadCount).toBe(500);
  });

  it('formats commentCount correctly', () => {
    const postWithRelations = createPostWithRelations({ commentCount: 25 });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.commentCount).toBe(25);
  });

  it('formats createdAt as ISO string', () => {
    const date = new Date('2025-06-15T12:30:00.000Z');
    const postWithRelations = createPostWithRelations({ createdAt: date, updatedAt: date });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.createdAt).toBe('2025-06-15T12:30:00.000Z');
  });

  it('formats updatedAt as ISO string', () => {
    const createdAt = new Date('2025-06-15T12:30:00.000Z');
    const updatedAt = new Date('2025-06-20T14:00:00.000Z');
    const postWithRelations = createPostWithRelations({ createdAt, updatedAt });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.updatedAt).toBe('2025-06-20T14:00:00.000Z');
  });
});

// ========================================
// Test: toSummary method
// ========================================
describe('PostPresenter.toSummary', () => {
  it('returns correct post summary structure', () => {
    const post = createMockPost();
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('thumbnailUrl');
    expect(result).toHaveProperty('author');
    expect(result).toHaveProperty('likeCount');
    expect(result).toHaveProperty('downloadCount');
    expect(result).toHaveProperty('createdAt');
  });

  it('does not include full post data in summary', () => {
    const post = createMockPost();
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('tags');
    expect(result).not.toHaveProperty('requiredMods');
    expect(result).not.toHaveProperty('visibility');
    expect(result).not.toHaveProperty('unlistedUrl');
    expect(result).not.toHaveProperty('commentCount');
    expect(result).not.toHaveProperty('updatedAt');
  });

  it('formats post id correctly', () => {
    const post = createMockPost({ id: 'post-summary-789' });
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.id).toBe('post-summary-789');
  });

  it('formats title correctly', () => {
    const post = createMockPost({ title: 'Summary Title' });
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.title).toBe('Summary Title');
  });

  it('includes thumbnailUrl when provided', () => {
    const post = createMockPost();
    const author = createMockUser();
    const thumbnailUrl = 'https://example.com/thumb.png';
    const result = PostPresenter.toSummary(post, author, thumbnailUrl);

    expect(result.thumbnailUrl).toBe('https://example.com/thumb.png');
  });

  it('sets thumbnailUrl to null when not provided', () => {
    const post = createMockPost();
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.thumbnailUrl).toBeNull();
  });

  it('formats author as user summary', () => {
    const post = createMockPost();
    const author = createMockUser({ id: 'author-summary', displayName: 'Summary Author' });
    const result = PostPresenter.toSummary(post, author);

    expect(result.author.id).toBe('author-summary');
    expect(result.author.displayName).toBe('Summary Author');
  });

  it('formats likeCount correctly', () => {
    const post = createMockPost({ likeCount: 200 });
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.likeCount).toBe(200);
  });

  it('formats downloadCount correctly', () => {
    const post = createMockPost({ downloadCount: 1000 });
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.downloadCount).toBe(1000);
  });

  it('formats createdAt as ISO string', () => {
    const date = new Date('2025-03-10T08:00:00.000Z');
    const post = createMockPost({ createdAt: date, updatedAt: date });
    const author = createMockUser();
    const result = PostPresenter.toSummary(post, author);

    expect(result.createdAt).toBe('2025-03-10T08:00:00.000Z');
  });
});

// ========================================
// Test: format method
// ========================================
describe('PostPresenter.format', () => {
  it('returns success response with post data', () => {
    const postWithRelations = createPostWithRelations();
    const result = PostPresenter.format(postWithRelations);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes full post output in data', () => {
    const postWithRelations = createPostWithRelations({
      id: 'post-format-123',
      title: 'Format Test Post',
    });
    const result = PostPresenter.format(postWithRelations);

    expect(result.data.id).toBe('post-format-123');
    expect(result.data.title).toBe('Format Test Post');
  });

  it('data structure matches toOutput result', () => {
    const postWithRelations = createPostWithRelations();
    const formatResult = PostPresenter.format(postWithRelations);
    const toOutputResult = PostPresenter.toOutput(postWithRelations);

    expect(formatResult.data).toEqual(toOutputResult);
  });
});

// ========================================
// Test: formatPaginated method
// ========================================
describe('PostPresenter.formatPaginated', () => {
  let postsWithAuthors: { post: Post; author: User; thumbnailUrl?: string }[];

  beforeEach(() => {
    postsWithAuthors = [
      {
        post: createMockPost({ id: 'post-1', title: 'Post One' }),
        author: createMockUser({ id: 'author-1' }),
        thumbnailUrl: 'https://example.com/thumb1.png',
      },
      {
        post: createMockPost({ id: 'post-2', title: 'Post Two' }),
        author: createMockUser({ id: 'author-2' }),
        thumbnailUrl: 'https://example.com/thumb2.png',
      },
      {
        post: createMockPost({ id: 'post-3', title: 'Post Three' }),
        author: createMockUser({ id: 'author-3' }),
      },
    ];
  });

  it('returns success response with paginated data', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 3);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('formats all posts as summaries', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 3);

    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe('post-1');
    expect(result.data[1].id).toBe('post-2');
    expect(result.data[2].id).toBe('post-3');
  });

  it('includes thumbnail URLs when provided', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 3);

    expect(result.data[0].thumbnailUrl).toBe('https://example.com/thumb1.png');
    expect(result.data[1].thumbnailUrl).toBe('https://example.com/thumb2.png');
    expect(result.data[2].thumbnailUrl).toBeNull();
  });

  it('includes correct pagination metadata', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 2, 20, 50);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.total).toBe(50);
  });

  it('calculates hasMore correctly when more pages exist', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 30);

    expect(result.meta.hasMore).toBe(true);
  });

  it('calculates hasMore correctly when no more pages', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 3, 10, 25);

    expect(result.meta.hasMore).toBe(false);
  });

  it('calculates hasMore correctly at exact boundary', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 10);

    expect(result.meta.hasMore).toBe(false);
  });

  it('handles empty posts array', () => {
    const result = PostPresenter.formatPaginated([], 1, 10, 0);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('data items match toSummary format', () => {
    const result = PostPresenter.formatPaginated(postsWithAuthors, 1, 10, 3);

    for (let i = 0; i < postsWithAuthors.length; i++) {
      const { post, author, thumbnailUrl } = postsWithAuthors[i];
      const expected = PostPresenter.toSummary(post, author, thumbnailUrl);
      expect(result.data[i]).toEqual(expected);
    }
  });
});

// ========================================
// Test: Visibility handling
// ========================================
describe('PostPresenter visibility handling', () => {
  it('formats public visibility correctly', () => {
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.public(),
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.visibility).toBe('public');
  });

  it('formats private visibility correctly', () => {
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.private(),
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.visibility).toBe('private');
  });

  it('formats unlisted visibility correctly', () => {
    const futureDate = new Date(Date.now() + 86400000);
    const unlistedUrl = UnlistedUrl.create('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', futureDate);
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.unlisted(),
      unlistedUrl,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.visibility).toBe('unlisted');
  });
});

// ========================================
// Edge Cases
// ========================================
describe('PostPresenter edge cases', () => {
  it('handles post with zero counts', () => {
    const postWithRelations = createPostWithRelations({
      likeCount: 0,
      downloadCount: 0,
      commentCount: 0,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.likeCount).toBe(0);
    expect(result.downloadCount).toBe(0);
    expect(result.commentCount).toBe(0);
  });

  it('handles post with large counts', () => {
    const postWithRelations = createPostWithRelations({
      likeCount: 1000000,
      downloadCount: 5000000,
      commentCount: 100000,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.likeCount).toBe(1000000);
    expect(result.downloadCount).toBe(5000000);
    expect(result.commentCount).toBe(100000);
  });

  it('handles post with special characters in title', () => {
    const postWithRelations = createPostWithRelations({
      title: 'Test <Post> & "Special" Characters',
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.title).toBe('Test <Post> & "Special" Characters');
  });

  it('handles post with unicode in title', () => {
    const postWithRelations = createPostWithRelations({
      title: '日本語タイトル',
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.title).toBe('日本語タイトル');
  });

  it('handles post with many tags', () => {
    const tags = [
      Tag.create('tag1'),
      Tag.create('tag2'),
      Tag.create('tag3'),
      Tag.create('tag4'),
      Tag.create('tag5'),
      Tag.create('tag6'),
      Tag.create('tag7'),
      Tag.create('tag8'),
      Tag.create('tag9'),
      Tag.create('tag10'),
    ];
    const postWithRelations = createPostWithRelations({ tags });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.tags).toHaveLength(10);
  });

  it('handles post with many required mods', () => {
    const postWithRelations = createPostWithRelations({
      requiredMods: ['mod1', 'mod2', 'mod3', 'mod4', 'mod5'],
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.requiredMods).toHaveLength(5);
  });

  it('handles unlisted post with no expiry', () => {
    const unlistedUrl = UnlistedUrl.generate(null);
    const postWithRelations = createPostWithRelations({
      visibility: Visibility.unlisted(),
      unlistedUrl,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.unlistedUrl).toBe(unlistedUrl.token);
    expect(result.unlistedExpiry).toBeNull();
  });

  it('handles long description', () => {
    const longDescription = 'A'.repeat(5000);
    const postWithRelations = createPostWithRelations({
      description: longDescription,
    });
    const result = PostPresenter.toOutput(postWithRelations);

    expect(result.description).toBe(longDescription);
    expect(result.description!.length).toBe(5000);
  });
});
