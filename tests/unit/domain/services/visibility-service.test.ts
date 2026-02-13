/**
 * VisibilityService Domain Service Tests
 *
 * TDD-first tests for VisibilityService following DDD principles.
 * Tests cover: canView, canDownload for all visibility types
 *
 * Business Rules:
 * - canView:
 *   - public: anyone can view
 *   - private: only post author can view
 *   - unlisted: post author OR valid token holder can view
 * - canDownload:
 *   - canView() must be true
 *   - viewer.canDownload() must be true (registered or above)
 */

import { describe, it, expect } from 'vitest';
import { VisibilityService } from '../../../../src/domain/services/visibility-service';
import { Post } from '../../../../src/domain/entities/post';
import { User } from '../../../../src/domain/entities/user';
import { Visibility } from '../../../../src/domain/value-objects/visibility';
import { UnlistedUrl } from '../../../../src/domain/value-objects/unlisted-url';
import { Tag } from '../../../../src/domain/value-objects/tag';
import { Email } from '../../../../src/domain/value-objects/email';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level';

describe('VisibilityService', () => {
  // ============================================
  // Test Fixtures
  // ============================================

  const createPublicPost = (authorId: string = 'author-123') =>
    Post.create({
      id: 'post-public-001',
      authorId,
      structureId: 'struct-001',
      title: 'Public Post',
      description: 'A public post for testing',
      tags: [Tag.create('test')],
      visibility: Visibility.public(),
      unlistedUrl: null,
      requiredMods: [],
      likeCount: 0,
      downloadCount: 0,
      commentCount: 0,
      isPinned: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

  const createPrivatePost = (authorId: string = 'author-123') =>
    Post.create({
      id: 'post-private-001',
      authorId,
      structureId: 'struct-002',
      title: 'Private Post',
      description: 'A private post for testing',
      tags: [Tag.create('test')],
      visibility: Visibility.private(),
      unlistedUrl: null,
      requiredMods: [],
      likeCount: 0,
      downloadCount: 0,
      commentCount: 0,
      isPinned: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

  const createUnlistedPost = (
    authorId: string = 'author-123',
    token: string = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
  ) => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
    return Post.create({
      id: 'post-unlisted-001',
      authorId,
      structureId: 'struct-003',
      title: 'Unlisted Post',
      description: 'An unlisted post for testing',
      tags: [Tag.create('test')],
      visibility: Visibility.unlisted(),
      unlistedUrl: UnlistedUrl.create(token, futureDate),
      requiredMods: [],
      likeCount: 0,
      downloadCount: 0,
      commentCount: 0,
      isPinned: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });
  };

  const createUser = (
    id: string,
    accountLevel: AccountLevel = AccountLevel.registered()
  ) =>
    User.create({
      id,
      displayName: `User ${id}`,
      email: Email.create(`${id}@example.com`),
      accountLevel,
      isEmailVerified: true,
      isPhoneVerified: false,
      linkedSns: [],
      pinnedPostIds: [],
      followerCount: 0,
      followingCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

  const createGuestUser = (id: string) =>
    User.create({
      id,
      displayName: `Guest ${id}`,
      email: Email.create(`${id}@example.com`),
      accountLevel: AccountLevel.guest(),
      isEmailVerified: false,
      isPhoneVerified: false,
      linkedSns: [],
      pinnedPostIds: [],
      followerCount: 0,
      followingCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

  // ============================================
  // canView() Tests
  // ============================================

  describe('canView()', () => {
    describe('public visibility', () => {
      it('returns true for anonymous user (viewerId is null)', () => {
        const service = new VisibilityService();
        const post = createPublicPost();

        const result = service.canView(post, null);

        expect(result).toBe(true);
      });

      it('returns true for any logged-in user', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');

        const result = service.canView(post, 'viewer-456');

        expect(result).toBe(true);
      });

      it('returns true for the post author', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');

        const result = service.canView(post, 'author-123');

        expect(result).toBe(true);
      });

      it('returns true even with unlistedToken provided (ignored for public)', () => {
        const service = new VisibilityService();
        const post = createPublicPost();

        const result = service.canView(post, null, 'some-random-token');

        expect(result).toBe(true);
      });
    });

    describe('private visibility', () => {
      it('returns false for anonymous user (viewerId is null)', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');

        const result = service.canView(post, null);

        expect(result).toBe(false);
      });

      it('returns false for non-author logged-in user', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');

        const result = service.canView(post, 'viewer-456');

        expect(result).toBe(false);
      });

      it('returns true for the post author', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');

        const result = service.canView(post, 'author-123');

        expect(result).toBe(true);
      });

      it('returns false even with unlistedToken provided (ignored for private)', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');

        const result = service.canView(post, 'viewer-456', 'some-token');

        expect(result).toBe(false);
      });
    });

    describe('unlisted visibility', () => {
      const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      const invalidToken = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

      it('returns false for anonymous user without token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, null);

        expect(result).toBe(false);
      });

      it('returns false for anonymous user with invalid token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, null, invalidToken);

        expect(result).toBe(false);
      });

      it('returns true for anonymous user with valid token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, null, validToken);

        expect(result).toBe(true);
      });

      it('returns false for non-author without token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, 'viewer-456');

        expect(result).toBe(false);
      });

      it('returns true for non-author with valid token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, 'viewer-456', validToken);

        expect(result).toBe(true);
      });

      it('returns true for the post author without token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, 'author-123');

        expect(result).toBe(true);
      });

      it('returns true for the post author even with invalid token', () => {
        const service = new VisibilityService();
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, 'author-123', invalidToken);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles empty string viewerId as non-author', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');

        // Empty string is treated as a non-null viewer ID
        const result = service.canView(post, '');

        expect(result).toBe(false);
      });

      it('handles empty string unlistedToken as invalid', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, null, '');

        expect(result).toBe(false);
      });

      it('handles undefined unlistedToken (optional parameter)', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);

        const result = service.canView(post, null, undefined);

        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // canDownload() Tests
  // ============================================

  describe('canDownload()', () => {
    describe('when canView is false', () => {
      it('returns false for private post viewed by non-author', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');
        const viewer = createUser('viewer-456', AccountLevel.registered());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(false);
      });

      it('returns false for unlisted post without valid token', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);
        const viewer = createUser('viewer-456', AccountLevel.registered());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(false);
      });
    });

    describe('when canView is true but viewer cannot download', () => {
      it('returns false for guest user on public post', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');
        const viewer = createGuestUser('guest-001');

        const result = service.canDownload(post, viewer);

        expect(result).toBe(false);
      });

      it('returns false for guest user on unlisted post with valid token', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);
        const viewer = createGuestUser('guest-001');

        const result = service.canDownload(post, viewer, validToken);

        expect(result).toBe(false);
      });

      it('returns false when viewer is null (anonymous)', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');

        const result = service.canDownload(post, null);

        expect(result).toBe(false);
      });
    });

    describe('when canView is true and viewer can download', () => {
      it('returns true for registered user on public post', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');
        const viewer = createUser('viewer-456', AccountLevel.registered());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(true);
      });

      it('returns true for verified user on public post', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');
        const viewer = createUser('viewer-456', AccountLevel.verified());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(true);
      });

      it('returns true for premium user on public post', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');
        const viewer = createUser('viewer-456', AccountLevel.premium());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(true);
      });

      it('returns true for registered author on private post', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');
        const viewer = createUser('author-123', AccountLevel.registered());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(true);
      });

      it('returns true for registered user on unlisted post with valid token', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);
        const viewer = createUser('viewer-456', AccountLevel.registered());

        const result = service.canDownload(post, viewer, validToken);

        expect(result).toBe(true);
      });

      it('returns true for author on unlisted post without token', () => {
        const service = new VisibilityService();
        const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
        const post = createUnlistedPost('author-123', validToken);
        const viewer = createUser('author-123', AccountLevel.registered());

        const result = service.canDownload(post, viewer);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles guest author trying to download own private post', () => {
        const service = new VisibilityService();
        const post = createPrivatePost('author-123');
        // Author is a guest (can view but cannot download)
        const viewer = createGuestUser('author-123');

        const result = service.canDownload(post, viewer);

        // canView = true (author), but canDownload = false (guest level)
        expect(result).toBe(false);
      });

      it('handles viewer matching author ID but still respects account level', () => {
        const service = new VisibilityService();
        const post = createPublicPost('author-123');
        const guestViewer = createGuestUser('author-123');

        const result = service.canDownload(post, guestViewer);

        // Author but guest level - cannot download
        expect(result).toBe(false);
      });
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('integration scenarios', () => {
    it('handles complete visibility flow for public post', () => {
      const service = new VisibilityService();
      const post = createPublicPost('author-123');

      // Anonymous can view but not download
      expect(service.canView(post, null)).toBe(true);
      expect(service.canDownload(post, null)).toBe(false);

      // Guest can view but not download
      const guest = createGuestUser('guest-001');
      expect(service.canView(post, guest.id)).toBe(true);
      expect(service.canDownload(post, guest)).toBe(false);

      // Registered user can view and download
      const registered = createUser('user-001', AccountLevel.registered());
      expect(service.canView(post, registered.id)).toBe(true);
      expect(service.canDownload(post, registered)).toBe(true);
    });

    it('handles complete visibility flow for private post', () => {
      const service = new VisibilityService();
      const post = createPrivatePost('author-123');
      const author = createUser('author-123', AccountLevel.registered());

      // Non-author cannot view or download
      const other = createUser('other-456', AccountLevel.premium());
      expect(service.canView(post, other.id)).toBe(false);
      expect(service.canDownload(post, other)).toBe(false);

      // Author can view and download
      expect(service.canView(post, author.id)).toBe(true);
      expect(service.canDownload(post, author)).toBe(true);
    });

    it('handles complete visibility flow for unlisted post', () => {
      const service = new VisibilityService();
      const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      const post = createUnlistedPost('author-123', validToken);
      const author = createUser('author-123', AccountLevel.registered());

      // Without token, non-author cannot view
      const visitor = createUser('visitor-456', AccountLevel.registered());
      expect(service.canView(post, visitor.id)).toBe(false);
      expect(service.canDownload(post, visitor)).toBe(false);

      // With valid token, non-author can view and download
      expect(service.canView(post, visitor.id, validToken)).toBe(true);
      expect(service.canDownload(post, visitor, validToken)).toBe(true);

      // Author can always view and download
      expect(service.canView(post, author.id)).toBe(true);
      expect(service.canDownload(post, author)).toBe(true);
    });
  });
});
