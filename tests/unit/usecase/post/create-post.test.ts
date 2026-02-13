/**
 * CreatePost Usecase Unit Tests
 *
 * TDD tests for the CreatePost usecase.
 * Tests cover: success, structure not found, validation errors,
 * with tags, with requiredMods, with unlisted visibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePost, CreatePostError, type CreatePostInput } from '../../../../src/usecase/post/create-post.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { Structure } from '../../../../src/domain/entities/structure.js';
import { Edition } from '../../../../src/domain/value-objects/edition.js';
import { Version } from '../../../../src/domain/value-objects/version.js';
import { FileFormat } from '../../../../src/domain/value-objects/file-format.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import type { PostRepositoryPort, StructureRepositoryPort, UserRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ============================================
// Mock Factories
// ============================================

function createMockPostRepository(): PostRepositoryPort {
  return {
    findById: vi.fn(),
    findByUnlistedUrl: vi.fn(),
    search: vi.fn(),
    findByAuthor: vi.fn(),
    save: vi.fn((post: Post) => Promise.resolve(post)),
    delete: vi.fn(),
    incrementDownloadCount: vi.fn(),
  };
}

function createMockStructureRepository(): StructureRepositoryPort {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    getDownloadUrl: vi.fn(),
  };
}

function createMockUserRepository(): UserRepositoryPort {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockUser(id: string = 'user-456'): User {
  return User.create({
    id,
    displayName: 'Test User',
    email: Email.create('test@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function createMockStructure(id: string = 'structure-123'): Structure {
  return Structure.create({
    id,
    uploaderId: 'user-456',
    originalEdition: Edition.java(),
    originalVersion: Version.create('1.20.4'),
    originalFormat: FileFormat.schematic(),
    dimensions: Dimensions.create(64, 128, 64),
    blockCount: 50000,
    createdAt: new Date(),
  });
}

function createValidInput(overrides: Partial<CreatePostInput> = {}): CreatePostInput {
  return {
    title: 'My Awesome Structure',
    description: 'A beautiful Minecraft building.',
    tags: ['minecraft', 'building'],
    visibility: 'public',
    structureId: 'structure-123',
    authorId: 'user-456',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('CreatePost Usecase', () => {
  let mockPostRepository: PostRepositoryPort;
  let mockStructureRepository: StructureRepositoryPort;
  let mockUserRepository: UserRepositoryPort;
  let usecase: CreatePost;

  beforeEach(() => {
    mockPostRepository = createMockPostRepository();
    mockStructureRepository = createMockStructureRepository();
    mockUserRepository = createMockUserRepository();
    usecase = CreatePost.create(mockPostRepository, mockStructureRepository, mockUserRepository);
  });

  describe('execute - Success Cases', () => {
    it('creates a post successfully with valid input', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeInstanceOf(Post);
      expect(result.title).toBe(input.title);
      expect(result.description).toBe(input.description);
      expect(result.authorId).toBe(input.authorId);
      expect(result.structureId).toBe(input.structureId);
      expect(result.visibility.isPublic()).toBe(true);
      expect(mockStructureRepository.findById).toHaveBeenCalledWith(input.structureId);
      expect(mockPostRepository.save).toHaveBeenCalledTimes(1);
    });

    it('creates a post with tags', async () => {
      // Arrange
      const input = createValidInput({
        tags: ['minecraft', 'castle', 'medieval'],
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.tags).toHaveLength(3);
      expect(result.tags.map(t => t.value)).toEqual(['minecraft', 'castle', 'medieval']);
    });

    it('creates a post with requiredMods', async () => {
      // Arrange
      const input = createValidInput({
        requiredMods: ['mod1', 'mod2'],
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.requiredMods).toEqual(['mod1', 'mod2']);
    });

    it('creates a post with private visibility', async () => {
      // Arrange
      const input = createValidInput({
        visibility: 'private',
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isPrivate()).toBe(true);
      expect(result.unlistedUrl).toBeNull();
    });

    it('creates a post with unlisted visibility and generates unlisted URL', async () => {
      // Arrange
      const input = createValidInput({
        visibility: 'unlisted',
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isUnlisted()).toBe(true);
      expect(result.unlistedUrl).not.toBeNull();
      expect(result.unlistedUrl?.token).toBeDefined();
      expect(result.unlistedUrl?.token.length).toBeGreaterThanOrEqual(32);
    });

    it('creates a post with unlisted visibility and custom expiry', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      const input = createValidInput({
        visibility: 'unlisted',
        unlistedExpiry: futureDate,
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.visibility.isUnlisted()).toBe(true);
      expect(result.unlistedUrl).not.toBeNull();
      expect(result.unlistedUrl?.expiresAt?.getTime()).toBe(futureDate.getTime());
    });

    it('creates a post without optional description', async () => {
      // Arrange
      const input = createValidInput({
        description: undefined,
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.description).toBe('');
    });

    it('creates a post without optional tags', async () => {
      // Arrange
      const input = createValidInput({
        tags: undefined,
      });
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.tags).toHaveLength(0);
    });

    it('initializes counts to zero', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure(input.structureId);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(mockStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.likeCount).toBe(0);
      expect(result.downloadCount).toBe(0);
      expect(result.commentCount).toBe(0);
      expect(result.isPinned).toBe(false);
    });
  });

  describe('execute - Failure Cases', () => {
    it('throws error when structure is not found', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(mockUserRepository.findById).mockResolvedValue(createMockUser(input.authorId));
      vi.mocked(mockStructureRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('Structure not found');
    });

    it('throws error when title is empty', async () => {
      // Arrange
      const input = createValidInput({
        title: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('title cannot be empty');
    });

    it('throws error when title is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        title: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('title cannot be empty');
    });

    it('throws error when structureId is empty', async () => {
      // Arrange
      const input = createValidInput({
        structureId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('structureId cannot be empty');
    });

    it('throws error when structureId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        structureId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('structureId cannot be empty');
    });

    it('throws error when authorId is empty', async () => {
      // Arrange
      const input = createValidInput({
        authorId: '',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('authorId cannot be empty');
    });

    it('throws error when authorId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({
        authorId: '   ',
      });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(CreatePostError);
      await expect(usecase.execute(input)).rejects.toThrow('authorId cannot be empty');
    });
  });

  describe('create factory', () => {
    it('creates a CreatePost instance with repositories', () => {
      // Act
      const instance = CreatePost.create(mockPostRepository, mockStructureRepository, mockUserRepository);

      // Assert
      expect(instance).toBeInstanceOf(CreatePost);
    });
  });
});
