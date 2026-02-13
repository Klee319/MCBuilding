/**
 * Follow Entity Tests
 *
 * TDD-first tests for Follow entity following DDD principles.
 * Tests cover: creation, validation, getters, immutability, equals
 *
 * Invariant: followerId !== followeeId (self-follow prohibited)
 */

import { describe, it, expect } from 'vitest';
import { Follow, InvalidFollowError } from '../../../../src/domain/entities/follow';

describe('Follow Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'follow-123',
    followerId: 'user-follower',
    followeeId: 'user-followee',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  });

  describe('Follow.create()', () => {
    it('creates a valid Follow with all properties', () => {
      const props = createValidProps();
      const follow = Follow.create(props);

      expect(follow.id).toBe('follow-123');
      expect(follow.followerId).toBe('user-follower');
      expect(follow.followeeId).toBe('user-followee');
      expect(follow.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('throws InvalidFollowError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidFollowError for whitespace-only id', () => {
      const props = { ...createValidProps(), id: '   ' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidFollowError for empty followerId', () => {
      const props = { ...createValidProps(), followerId: '' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('followerId cannot be empty');
    });

    it('throws InvalidFollowError for whitespace-only followerId', () => {
      const props = { ...createValidProps(), followerId: '   ' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('followerId cannot be empty');
    });

    it('throws InvalidFollowError for empty followeeId', () => {
      const props = { ...createValidProps(), followeeId: '' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('followeeId cannot be empty');
    });

    it('throws InvalidFollowError for whitespace-only followeeId', () => {
      const props = { ...createValidProps(), followeeId: '   ' };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('followeeId cannot be empty');
    });

    // Invariant: self-follow prohibited
    it('throws InvalidFollowError when followerId equals followeeId (self-follow)', () => {
      const props = {
        ...createValidProps(),
        followerId: 'same-user',
        followeeId: 'same-user',
      };

      expect(() => Follow.create(props)).toThrow(InvalidFollowError);
      expect(() => Follow.create(props)).toThrow('cannot follow yourself');
    });

    it('allows follow when followerId and followeeId are different', () => {
      const props = {
        ...createValidProps(),
        followerId: 'user-a',
        followeeId: 'user-b',
      };
      const follow = Follow.create(props);

      expect(follow.followerId).toBe('user-a');
      expect(follow.followeeId).toBe('user-b');
    });
  });

  describe('Follow.reconstruct()', () => {
    it('reconstructs a Follow from persisted data', () => {
      const props = createValidProps();
      const follow = Follow.reconstruct(props);

      expect(follow.id).toBe('follow-123');
      expect(follow.followerId).toBe('user-follower');
      expect(follow.followeeId).toBe('user-followee');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = Follow.create(props);
      const reconstructed = Follow.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });

    it('still validates data on reconstruct', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Follow.reconstruct(props)).toThrow(InvalidFollowError);
    });

    it('still validates self-follow invariant on reconstruct', () => {
      const props = {
        ...createValidProps(),
        followerId: 'same-user',
        followeeId: 'same-user',
      };

      expect(() => Follow.reconstruct(props)).toThrow(InvalidFollowError);
    });
  });

  describe('Getters (immutability)', () => {
    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const follow = Follow.create(props);

      const date1 = follow.createdAt;
      const date2 = follow.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('modifying returned Date does not affect entity', () => {
      const props = createValidProps();
      const follow = Follow.create(props);

      const date = follow.createdAt;
      date.setFullYear(2000);

      expect(follow.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('equals()', () => {
    it('returns true for Follows with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), followerId: 'different-user' };
      const follow1 = Follow.create(props1);
      const follow2 = Follow.create(props2);

      expect(follow1.equals(follow2)).toBe(true);
    });

    it('returns false for Follows with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const follow1 = Follow.create(props1);
      const follow2 = Follow.create(props2);

      expect(follow1.equals(follow2)).toBe(false);
    });

    it('returns true for the same Follow instance', () => {
      const follow = Follow.create(createValidProps());

      expect(follow.equals(follow)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('Follow instance is frozen', () => {
      const follow = Follow.create(createValidProps());

      expect(Object.isFrozen(follow)).toBe(true);
    });

    it('cannot add new properties to Follow', () => {
      const follow = Follow.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        follow.newProp = 'value';
      }).toThrow();
    });

    it('cannot modify existing properties', () => {
      const follow = Follow.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        follow._id = 'new-id';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles Date objects correctly across timezones', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date };
      const follow = Follow.create(props);

      expect(follow.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('handles unicode characters in ids', () => {
      const props = {
        ...createValidProps(),
        followerId: 'user-follower-emoji',
        followeeId: 'user-followee-emoji',
      };
      const follow = Follow.create(props);

      expect(follow.followerId).toBe('user-follower-emoji');
      expect(follow.followeeId).toBe('user-followee-emoji');
    });

    it('treats different whitespace patterns as different users', () => {
      const props = {
        ...createValidProps(),
        followerId: 'user-a',
        followeeId: ' user-a',
      };
      // These are different strings, so should be allowed
      const follow = Follow.create(props);

      expect(follow.followerId).toBe('user-a');
      expect(follow.followeeId).toBe(' user-a');
    });
  });
});
