/**
 * User Entity Tests
 *
 * TDD-first tests for User entity following DDD principles.
 * Tests cover: creation, validation, getters, methods, immutability
 */

import { describe, it, expect } from 'vitest';
import { User, InvalidUserError } from '../../../../src/domain/entities/user';
import { Email } from '../../../../src/domain/value-objects/email';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level';

describe('User Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'user-123',
    displayName: 'Test User',
    email: Email.create('test@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: false,
    isPhoneVerified: false,
    linkedSns: ['twitter', 'google'],
    pinnedPostIds: ['post-1', 'post-2'],
    followerCount: 100,
    followingCount: 50,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  });

  describe('User.create()', () => {
    it('creates a valid User with all properties', () => {
      const props = createValidProps();
      const user = User.create(props);

      expect(user.id).toBe('user-123');
      expect(user.displayName).toBe('Test User');
      expect(user.email.value).toBe('test@example.com');
      expect(user.accountLevel.value).toBe('registered');
      expect(user.isEmailVerified).toBe(false);
      expect(user.isPhoneVerified).toBe(false);
      expect(user.linkedSns).toEqual(['twitter', 'google']);
      expect(user.pinnedPostIds).toEqual(['post-1', 'post-2']);
      expect(user.followerCount).toBe(100);
      expect(user.followingCount).toBe(50);
      expect(user.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(user.updatedAt).toEqual(new Date('2024-01-15T00:00:00Z'));
    });

    it('creates a User with minimum valid displayName (1 character)', () => {
      const props = { ...createValidProps(), displayName: 'A' };
      const user = User.create(props);

      expect(user.displayName).toBe('A');
    });

    it('creates a User with maximum valid displayName (50 characters)', () => {
      const maxName = 'A'.repeat(50);
      const props = { ...createValidProps(), displayName: maxName };
      const user = User.create(props);

      expect(user.displayName).toBe(maxName);
    });

    it('creates a User with empty linkedSns array', () => {
      const props = { ...createValidProps(), linkedSns: [] };
      const user = User.create(props);

      expect(user.linkedSns).toEqual([]);
    });

    it('creates a User with empty pinnedPostIds array', () => {
      const props = { ...createValidProps(), pinnedPostIds: [] };
      const user = User.create(props);

      expect(user.pinnedPostIds).toEqual([]);
    });

    it('creates a User with zero followerCount and followingCount', () => {
      const props = { ...createValidProps(), followerCount: 0, followingCount: 0 };
      const user = User.create(props);

      expect(user.followerCount).toBe(0);
      expect(user.followingCount).toBe(0);
    });

    // Validation error cases
    it('throws InvalidUserError for empty displayName', () => {
      const props = { ...createValidProps(), displayName: '' };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('displayName');
    });

    it('throws InvalidUserError for displayName exceeding 50 characters', () => {
      const props = { ...createValidProps(), displayName: 'A'.repeat(51) };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('displayName');
    });

    it('throws InvalidUserError for whitespace-only displayName', () => {
      const props = { ...createValidProps(), displayName: '   ' };

      expect(() => User.create(props)).toThrow(InvalidUserError);
    });

    it('throws InvalidUserError for pinnedPostIds exceeding 5 items', () => {
      const props = {
        ...createValidProps(),
        pinnedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('pinnedPostIds');
    });

    it('throws InvalidUserError for negative followerCount', () => {
      const props = { ...createValidProps(), followerCount: -1 };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('followerCount');
    });

    it('throws InvalidUserError for negative followingCount', () => {
      const props = { ...createValidProps(), followingCount: -1 };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('followingCount');
    });

    it('throws InvalidUserError when createdAt is after updatedAt', () => {
      const props = {
        ...createValidProps(),
        createdAt: new Date('2024-01-20T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
      };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('createdAt');
    });

    it('allows createdAt equal to updatedAt', () => {
      const sameDate = new Date('2024-01-15T00:00:00Z');
      const props = {
        ...createValidProps(),
        createdAt: sameDate,
        updatedAt: sameDate,
      };
      const user = User.create(props);

      expect(user.createdAt).toEqual(sameDate);
      expect(user.updatedAt).toEqual(sameDate);
    });

    it('throws InvalidUserError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => User.create(props)).toThrow(InvalidUserError);
      expect(() => User.create(props)).toThrow('id');
    });
  });

  describe('User.reconstruct()', () => {
    it('reconstructs a User from persisted data without validation', () => {
      const props = createValidProps();
      const user = User.reconstruct(props);

      expect(user.id).toBe('user-123');
      expect(user.displayName).toBe('Test User');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = User.create(props);
      const reconstructed = User.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });
  });

  describe('Getters (immutability)', () => {
    it('returns a copy of linkedSns array (immutability)', () => {
      const props = createValidProps();
      const user = User.create(props);

      const linkedSns1 = user.linkedSns;
      const linkedSns2 = user.linkedSns;

      // Should be equal but not the same reference
      expect(linkedSns1).toEqual(linkedSns2);
      expect(linkedSns1).not.toBe(linkedSns2);

      // Modifying returned array should not affect user
      linkedSns1.push('facebook');
      expect(user.linkedSns).toEqual(['twitter', 'google']);
    });

    it('returns a copy of pinnedPostIds array (immutability)', () => {
      const props = createValidProps();
      const user = User.create(props);

      const pinned1 = user.pinnedPostIds;
      const pinned2 = user.pinnedPostIds;

      expect(pinned1).toEqual(pinned2);
      expect(pinned1).not.toBe(pinned2);

      pinned1.push('new-post');
      expect(user.pinnedPostIds).toEqual(['post-1', 'post-2']);
    });

    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const user = User.create(props);

      const date1 = user.createdAt;
      const date2 = user.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('returns updatedAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const user = User.create(props);

      const date1 = user.updatedAt;
      const date2 = user.updatedAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });
  });

  describe('canDownload()', () => {
    it('returns true for registered account level', () => {
      const props = { ...createValidProps(), accountLevel: AccountLevel.registered() };
      const user = User.create(props);

      expect(user.canDownload()).toBe(true);
    });

    it('returns true for verified account level', () => {
      const props = { ...createValidProps(), accountLevel: AccountLevel.verified() };
      const user = User.create(props);

      expect(user.canDownload()).toBe(true);
    });

    it('returns true for premium account level', () => {
      const props = { ...createValidProps(), accountLevel: AccountLevel.premium() };
      const user = User.create(props);

      expect(user.canDownload()).toBe(true);
    });

    it('returns false for guest account level', () => {
      const props = { ...createValidProps(), accountLevel: AccountLevel.guest() };
      const user = User.create(props);

      expect(user.canDownload()).toBe(false);
    });
  });

  describe('canPinPost()', () => {
    it('returns true when pinnedPostIds has less than 5 items', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2'] };
      const user = User.create(props);

      expect(user.canPinPost('p3')).toBe(true);
    });

    it('returns true when pinnedPostIds has exactly 4 items', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2', 'p3', 'p4'] };
      const user = User.create(props);

      expect(user.canPinPost('p5')).toBe(true);
    });

    it('returns false when pinnedPostIds already has 5 items', () => {
      const props = {
        ...createValidProps(),
        pinnedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      };
      const user = User.create(props);

      expect(user.canPinPost('p6')).toBe(false);
    });

    it('returns true when post is already pinned (regardless of count)', () => {
      const props = {
        ...createValidProps(),
        pinnedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      };
      const user = User.create(props);

      // Already pinned post can be "re-pinned" (idempotent)
      expect(user.canPinPost('p1')).toBe(true);
    });

    it('returns true when pinnedPostIds is empty', () => {
      const props = { ...createValidProps(), pinnedPostIds: [] };
      const user = User.create(props);

      expect(user.canPinPost('p1')).toBe(true);
    });
  });

  describe('withDisplayName()', () => {
    it('returns a new User with updated displayName', () => {
      const user = User.create(createValidProps());
      const updatedUser = user.withDisplayName('New Name');

      expect(updatedUser.displayName).toBe('New Name');
      expect(user.displayName).toBe('Test User'); // Original unchanged
    });

    it('returns a different instance', () => {
      const user = User.create(createValidProps());
      const updatedUser = user.withDisplayName('New Name');

      expect(user).not.toBe(updatedUser);
    });

    it('preserves all other properties', () => {
      const user = User.create(createValidProps());
      const updatedUser = user.withDisplayName('New Name');

      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.email).toBe(user.email);
      expect(updatedUser.accountLevel).toBe(user.accountLevel);
      expect(updatedUser.followerCount).toBe(user.followerCount);
    });

    it('throws InvalidUserError for invalid displayName', () => {
      const user = User.create(createValidProps());

      expect(() => user.withDisplayName('')).toThrow(InvalidUserError);
      expect(() => user.withDisplayName('A'.repeat(51))).toThrow(InvalidUserError);
    });
  });

  describe('withAccountLevel()', () => {
    it('returns a new User with updated accountLevel', () => {
      const user = User.create(createValidProps());
      const updatedUser = user.withAccountLevel(AccountLevel.premium());

      expect(updatedUser.accountLevel.value).toBe('premium');
      expect(user.accountLevel.value).toBe('registered'); // Original unchanged
    });

    it('returns a different instance', () => {
      const user = User.create(createValidProps());
      const updatedUser = user.withAccountLevel(AccountLevel.premium());

      expect(user).not.toBe(updatedUser);
    });
  });

  describe('withEmailVerified()', () => {
    it('returns a new User with isEmailVerified set to true', () => {
      const props = { ...createValidProps(), isEmailVerified: false };
      const user = User.create(props);
      const updatedUser = user.withEmailVerified();

      expect(updatedUser.isEmailVerified).toBe(true);
      expect(user.isEmailVerified).toBe(false); // Original unchanged
    });

    it('returns a different instance even if already verified', () => {
      const props = { ...createValidProps(), isEmailVerified: true };
      const user = User.create(props);
      const updatedUser = user.withEmailVerified();

      expect(user).not.toBe(updatedUser);
      expect(updatedUser.isEmailVerified).toBe(true);
    });
  });

  describe('withPhoneVerified()', () => {
    it('returns a new User with isPhoneVerified set to true', () => {
      const props = { ...createValidProps(), isPhoneVerified: false };
      const user = User.create(props);
      const updatedUser = user.withPhoneVerified();

      expect(updatedUser.isPhoneVerified).toBe(true);
      expect(user.isPhoneVerified).toBe(false); // Original unchanged
    });
  });

  describe('withPinnedPost()', () => {
    it('returns a new User with post added to pinnedPostIds', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2'] };
      const user = User.create(props);
      const updatedUser = user.withPinnedPost('p3');

      expect(updatedUser.pinnedPostIds).toEqual(['p1', 'p2', 'p3']);
      expect(user.pinnedPostIds).toEqual(['p1', 'p2']); // Original unchanged
    });

    it('throws InvalidUserError when adding would exceed 5 posts', () => {
      const props = {
        ...createValidProps(),
        pinnedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      };
      const user = User.create(props);

      expect(() => user.withPinnedPost('p6')).toThrow(InvalidUserError);
      expect(() => user.withPinnedPost('p6')).toThrow('pinnedPostIds');
    });

    it('does not duplicate already pinned post (idempotent)', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2'] };
      const user = User.create(props);
      const updatedUser = user.withPinnedPost('p1');

      expect(updatedUser.pinnedPostIds).toEqual(['p1', 'p2']);
    });

    it('allows pinning when at exactly 4 posts', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2', 'p3', 'p4'] };
      const user = User.create(props);
      const updatedUser = user.withPinnedPost('p5');

      expect(updatedUser.pinnedPostIds).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    });
  });

  describe('withoutPinnedPost()', () => {
    it('returns a new User with post removed from pinnedPostIds', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2', 'p3'] };
      const user = User.create(props);
      const updatedUser = user.withoutPinnedPost('p2');

      expect(updatedUser.pinnedPostIds).toEqual(['p1', 'p3']);
      expect(user.pinnedPostIds).toEqual(['p1', 'p2', 'p3']); // Original unchanged
    });

    it('returns unchanged clone if post is not in pinnedPostIds', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1', 'p2'] };
      const user = User.create(props);
      const updatedUser = user.withoutPinnedPost('p999');

      expect(updatedUser.pinnedPostIds).toEqual(['p1', 'p2']);
      expect(user).not.toBe(updatedUser); // Still a new instance
    });

    it('can remove all pinned posts', () => {
      const props = { ...createValidProps(), pinnedPostIds: ['p1'] };
      const user = User.create(props);
      const updatedUser = user.withoutPinnedPost('p1');

      expect(updatedUser.pinnedPostIds).toEqual([]);
    });
  });

  describe('equals()', () => {
    it('returns true for Users with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), displayName: 'Different Name' };
      const user1 = User.create(props1);
      const user2 = User.create(props2);

      expect(user1.equals(user2)).toBe(true);
    });

    it('returns false for Users with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const user1 = User.create(props1);
      const user2 = User.create(props2);

      expect(user1.equals(user2)).toBe(false);
    });

    it('returns true for the same User instance', () => {
      const user = User.create(createValidProps());

      expect(user.equals(user)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('User instance is frozen', () => {
      const user = User.create(createValidProps());

      // Attempting to modify should have no effect (frozen object)
      expect(Object.isFrozen(user)).toBe(true);
    });

    it('cannot add new properties to User', () => {
      const user = User.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        user.newProp = 'value';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles unicode characters in displayName', () => {
      const props = { ...createValidProps(), displayName: 'Test' };
      const user = User.create(props);

      expect(user.displayName).toBe('Test');
    });

    it('trims displayName whitespace for validation but preserves original', () => {
      // displayName ' A ' has non-whitespace content, should be valid
      const props = { ...createValidProps(), displayName: ' A ' };
      const user = User.create(props);

      expect(user.displayName).toBe(' A ');
    });

    it('handles very long SNS list', () => {
      const manySns = Array.from({ length: 100 }, (_, i) => `sns-${i}`);
      const props = { ...createValidProps(), linkedSns: manySns };
      const user = User.create(props);

      expect(user.linkedSns).toHaveLength(100);
    });

    it('handles Date objects correctly across timezones', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date, updatedAt: date };
      const user = User.create(props);

      expect(user.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });
  });
});
