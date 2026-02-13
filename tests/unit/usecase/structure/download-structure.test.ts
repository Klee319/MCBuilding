/**
 * DownloadStructure Usecase Unit Tests
 *
 * TDD tests for the DownloadStructure usecase.
 * Tests cover: success cases, post not found, unauthorized access,
 * anonymous user restrictions, conversion, and download permissions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DownloadStructure,
  DownloadStructureError,
  type DownloadStructureInput,
  type DownloadStructureOutput,
} from '../../../../src/usecase/structure/download-structure.js';
import type {
  StructureRepositoryPort,
  PostRepositoryPort,
  UserRepositoryPort,
} from '../../../../src/usecase/ports/repository-ports.js';
import type { StructureConverterPort } from '../../../../src/usecase/ports/gateway-ports.js';
import { Post } from '../../../../src/domain/entities/post.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Visibility } from '../../../../src/domain/value-objects/visibility.js';
import { UnlistedUrl } from '../../../../src/domain/value-objects/unlisted-url.js';
import { Tag } from '../../../../src/domain/value-objects/tag.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';
import { Edition } from '../../../../src/domain/value-objects/edition.js';
import { Version } from '../../../../src/domain/value-objects/version.js';

// ========================================
// Mock Factory Functions
// ========================================

function createMockStructureRepository(): StructureRepositoryPort {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://example.com/download/struct-123')),
  };
}

function createMockPostRepository(): PostRepositoryPort {
  return {
    findById: vi.fn(),
    findByUnlistedUrl: vi.fn(),
    search: vi.fn(),
    findByAuthor: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    incrementDownloadCount: vi.fn(() => Promise.resolve()),
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

function createMockPost(overrides: Partial<{
  id: string;
  authorId: string;
  structureId: string;
  visibility: Visibility;
  unlistedUrl: UnlistedUrl | null;
}> = {}): Post {
  const now = new Date();
  const visibility = overrides.visibility ?? Visibility.public();
  const unlistedUrl = visibility.isUnlisted()
    ? (overrides.unlistedUrl ?? UnlistedUrl.generate())
    : null;

  return Post.create({
    id: overrides.id ?? 'post-123',
    authorId: overrides.authorId ?? 'author-456',
    structureId: overrides.structureId ?? 'struct-789',
    title: 'Test Structure',
    description: 'A test structure description',
    tags: [Tag.create('minecraft')],
    visibility,
    unlistedUrl,
    requiredMods: [],
    likeCount: 10,
    downloadCount: 5,
    commentCount: 2,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

function createMockUser(overrides: Partial<{
  id: string;
  accountLevel: AccountLevel;
}> = {}): User {
  const now = new Date();
  return User.create({
    id: overrides.id ?? 'user-123',
    displayName: 'Test User',
    email: Email.create('test@example.com'),
    accountLevel: overrides.accountLevel ?? AccountLevel.registered(),
    isEmailVerified: true,
    isPhoneVerified: false,
    linkedSns: [],
    pinnedPostIds: [],
    followerCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

function createValidInput(overrides: Partial<DownloadStructureInput> = {}): DownloadStructureInput {
  return {
    postId: 'post-123',
    requestedEdition: 'java',
    requestedVersion: '1.20.4',
    requesterId: 'user-123',
    ...overrides,
  };
}

// ========================================
// Test Suite
// ========================================

function createMockStructureConverter(): StructureConverterPort {
  return {
    convert: vi.fn(),
    parseStructure: vi.fn(),
    registerParsedData: vi.fn(),
    exportStructure: vi.fn(),
  };
}

describe('DownloadStructure Usecase', () => {
  let structureRepository: StructureRepositoryPort;
  let postRepository: PostRepositoryPort;
  let userRepository: UserRepositoryPort;
  let structureConverter: StructureConverterPort;
  let usecase: DownloadStructure;

  beforeEach(() => {
    structureRepository = createMockStructureRepository();
    postRepository = createMockPostRepository();
    userRepository = createMockUserRepository();
    structureConverter = createMockStructureConverter();
    usecase = DownloadStructure.create(structureRepository, postRepository, userRepository, structureConverter);
  });

  // ========================================
  // Success Cases
  // ========================================

  describe('Success Cases', () => {
    it('should return download URL for public post with registered user', async () => {
      // Arrange
      const input = createValidInput();
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBe('https://example.com/download/struct-123');
      expect(result.edition).toBe('java');
      expect(result.version).toBe('1.20.4');
    });

    it('should call getDownloadUrl with correct parameters', async () => {
      // Arrange
      const input = createValidInput({
        requestedEdition: 'bedrock',
        requestedVersion: '1.20',
      });
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      await usecase.execute(input);

      // Assert
      expect(structureRepository.getDownloadUrl).toHaveBeenCalledWith(
        'struct-789',
        expect.any(Object), // Edition
        expect.any(Object)  // Version
      );

      const calledArgs = vi.mocked(structureRepository.getDownloadUrl).mock.calls[0];
      expect(calledArgs[1].value).toBe('bedrock');
      expect(calledArgs[2].toString()).toBe('1.20');
    });

    it('should increment download count on successful download', async () => {
      // Arrange
      const input = createValidInput();
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      await usecase.execute(input);

      // Assert
      expect(postRepository.incrementDownloadCount).toHaveBeenCalledWith('post-123');
      expect(postRepository.incrementDownloadCount).toHaveBeenCalledTimes(1);
    });

    it('should allow owner to download their own private post', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-123',
        visibility: Visibility.private(),
      });
      const mockUser = createMockUser({ id: 'owner-123' });
      const input = createValidInput({ requesterId: 'owner-123' });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBe('https://example.com/download/struct-123');
    });

    it('should allow access to unlisted post with correct token', async () => {
      // Arrange
      const unlistedUrl = UnlistedUrl.generate();
      const mockPost = createMockPost({
        visibility: Visibility.unlisted(),
        unlistedUrl,
      });
      const mockUser = createMockUser();
      const input = createValidInput({
        unlistedToken: unlistedUrl.token,
      });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBe('https://example.com/download/struct-123');
    });
  });

  // ========================================
  // Post Not Found
  // ========================================

  describe('Post Not Found', () => {
    it('should throw DownloadStructureError when post does not exist', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(postRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Post not found');
    });

    it('should not call other repositories when post is not found', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(postRepository.findById).mockResolvedValue(null);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(structureRepository.getDownloadUrl).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Unauthorized Access (Private Post)
  // ========================================

  describe('Unauthorized Access - Private Post', () => {
    it('should throw error when non-owner tries to access private post', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-456',
        visibility: Visibility.private(),
      });
      const mockUser = createMockUser({ id: 'other-user-789' });
      const input = createValidInput({ requesterId: 'other-user-789' });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to access this structure');
    });

    it('should not increment download count when access is denied', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-456',
        visibility: Visibility.private(),
      });
      const mockUser = createMockUser({ id: 'other-user-789' });
      const input = createValidInput({ requesterId: 'other-user-789' });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(postRepository.incrementDownloadCount).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Anonymous User Cannot Download
  // ========================================

  describe('Anonymous User Cannot Download', () => {
    it('should throw error when requesterId is not provided', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput({ requesterId: undefined });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to download this structure');
    });

    it('should not look up user when requesterId is undefined', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput({ requesterId: undefined });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(userRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Requester User Without Download Permission
  // ========================================

  describe('Requester User Without Download Permission', () => {
    it('should throw error when guest user tries to download', async () => {
      // Arrange
      const mockPost = createMockPost();
      const guestUser = createMockUser({
        id: 'guest-123',
        accountLevel: AccountLevel.guest(),
      });
      const input = createValidInput({ requesterId: 'guest-123' });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(guestUser);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to download this structure');
    });

    it('should allow registered user to download', async () => {
      // Arrange
      const mockPost = createMockPost();
      const registeredUser = createMockUser({
        accountLevel: AccountLevel.registered(),
      });
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(registeredUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBeTruthy();
    });

    it('should allow verified user to download', async () => {
      // Arrange
      const mockPost = createMockPost();
      const verifiedUser = createMockUser({
        accountLevel: AccountLevel.verified(),
      });
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(verifiedUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBeTruthy();
    });

    it('should allow premium user to download', async () => {
      // Arrange
      const mockPost = createMockPost();
      const premiumUser = createMockUser({
        accountLevel: AccountLevel.premium(),
      });
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(premiumUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBeTruthy();
    });

    it('should throw error when user is not found in database', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput({ requesterId: 'nonexistent-user' });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to download this structure');
    });
  });

  // ========================================
  // Unlisted Post Access
  // ========================================

  describe('Unlisted Post Access', () => {
    it('should deny access to unlisted post without token', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-456',
        visibility: Visibility.unlisted(),
      });
      const mockUser = createMockUser({ id: 'other-user-789' });
      const input = createValidInput({
        requesterId: 'other-user-789',
        unlistedToken: undefined,
      });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to access this structure');
    });

    it('should deny access to unlisted post with wrong token', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-456',
        visibility: Visibility.unlisted(),
      });
      const mockUser = createMockUser({ id: 'other-user-789' });
      const input = createValidInput({
        requesterId: 'other-user-789',
        unlistedToken: 'wrong-token',
      });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('Not authorized to access this structure');
    });

    it('should allow owner to access unlisted post without token', async () => {
      // Arrange
      const mockPost = createMockPost({
        authorId: 'owner-123',
        visibility: Visibility.unlisted(),
      });
      const mockUser = createMockUser({ id: 'owner-123' });
      const input = createValidInput({
        requesterId: 'owner-123',
        unlistedToken: undefined,
      });

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBeTruthy();
    });
  });

  // ========================================
  // With Conversion (Different Edition/Version)
  // ========================================

  describe('With Conversion', () => {
    it('should request Java edition download correctly', async () => {
      // Arrange
      const input = createValidInput({
        requestedEdition: 'java',
        requestedVersion: '1.19.4',
      });
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(structureRepository.getDownloadUrl).mockResolvedValue('https://example.com/java-download');

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBe('https://example.com/java-download');
      expect(result.edition).toBe('java');
      expect(result.version).toBe('1.19.4');

      const calledArgs = vi.mocked(structureRepository.getDownloadUrl).mock.calls[0];
      expect(calledArgs[1].isJava()).toBe(true);
    });

    it('should request Bedrock edition download correctly', async () => {
      // Arrange
      const input = createValidInput({
        requestedEdition: 'bedrock',
        requestedVersion: '1.20.0',
      });
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(structureRepository.getDownloadUrl).mockResolvedValue('https://example.com/bedrock-download');

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.downloadUrl).toBe('https://example.com/bedrock-download');
      expect(result.edition).toBe('bedrock');
      expect(result.version).toBe('1.20.0');

      const calledArgs = vi.mocked(structureRepository.getDownloadUrl).mock.calls[0];
      expect(calledArgs[1].isBedrock()).toBe(true);
    });

    it('should request specific version correctly', async () => {
      // Arrange
      const input = createValidInput({
        requestedVersion: '1.18.2',
      });
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      // Act
      await usecase.execute(input);

      // Assert
      const calledArgs = vi.mocked(structureRepository.getDownloadUrl).mock.calls[0];
      expect(calledArgs[2].toString()).toBe('1.18.2');
    });
  });

  // ========================================
  // Input Validation
  // ========================================

  describe('Input Validation', () => {
    it('should throw error when postId is empty', async () => {
      // Arrange
      const input = createValidInput({ postId: '' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('should throw error when postId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({ postId: '   ' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('postId cannot be empty');
    });

    it('should throw error when requestedVersion is empty', async () => {
      // Arrange
      const input = createValidInput({ requestedVersion: '' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('requestedVersion cannot be empty');
    });

    it('should throw error when requestedVersion is whitespace only', async () => {
      // Arrange
      const input = createValidInput({ requestedVersion: '   ' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(DownloadStructureError);
      await expect(usecase.execute(input)).rejects.toThrow('requestedVersion cannot be empty');
    });
  });

  // ========================================
  // Error Propagation
  // ========================================

  describe('Error Propagation', () => {
    it('should propagate post repository errors', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(postRepository.findById).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Database error');
    });

    it('should propagate user repository errors', async () => {
      // Arrange
      const mockPost = createMockPost();
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockRejectedValue(new Error('User DB error'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('User DB error');
    });

    it('should propagate structure repository errors', async () => {
      // Arrange
      const mockPost = createMockPost();
      const mockUser = createMockUser();
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(structureRepository.getDownloadUrl).mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Storage error');
    });

    it('should propagate increment download count errors', async () => {
      // Arrange
      const mockPost = createMockPost();
      const mockUser = createMockUser();
      const input = createValidInput();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(postRepository.incrementDownloadCount).mockRejectedValue(new Error('Count update failed'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Count update failed');
    });
  });

  // ========================================
  // Usecase Creation
  // ========================================

  describe('Usecase Creation', () => {
    it('should create usecase instance using factory method', () => {
      // Act
      const instance = DownloadStructure.create(
        structureRepository,
        postRepository,
        userRepository,
        structureConverter
      );

      // Assert
      expect(instance).toBeInstanceOf(DownloadStructure);
    });
  });

  // ========================================
  // Output Format
  // ========================================

  describe('Output Format', () => {
    it('should return correct output structure', async () => {
      // Arrange
      const input = createValidInput({
        requestedEdition: 'java',
        requestedVersion: '1.20.4',
      });
      const mockPost = createMockPost();
      const mockUser = createMockUser();

      vi.mocked(postRepository.findById).mockResolvedValue(mockPost);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(structureRepository.getDownloadUrl).mockResolvedValue('https://download.example.com/file');

      // Act
      const result: DownloadStructureOutput = await usecase.execute(input);

      // Assert
      expect(result).toHaveProperty('downloadUrl');
      expect(result).toHaveProperty('edition');
      expect(result).toHaveProperty('version');
      expect(typeof result.downloadUrl).toBe('string');
      expect(typeof result.edition).toBe('string');
      expect(typeof result.version).toBe('string');
    });
  });
});
