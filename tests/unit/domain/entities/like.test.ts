/**
 * Like Entity Tests
 *
 * TDD-first tests for Like entity following DDD principles.
 * Tests cover: creation, validation, getters, immutability, equals
 */

import { describe, it, expect } from 'vitest';
import { Like, InvalidLikeError } from '../../../../src/domain/entities/like';

describe('Like Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'like-123',
    postId: 'post-456',
    userId: 'user-789',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  });

  describe('Like.create()', () => {
    it('creates a valid Like with all properties', () => {
      const props = createValidProps();
      const like = Like.create(props);

      expect(like.id).toBe('like-123');
      expect(like.postId).toBe('post-456');
      expect(like.userId).toBe('user-789');
      expect(like.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('throws InvalidLikeError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidLikeError for whitespace-only id', () => {
      const props = { ...createValidProps(), id: '   ' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidLikeError for empty postId', () => {
      const props = { ...createValidProps(), postId: '' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('postId cannot be empty');
    });

    it('throws InvalidLikeError for whitespace-only postId', () => {
      const props = { ...createValidProps(), postId: '   ' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('postId cannot be empty');
    });

    it('throws InvalidLikeError for empty userId', () => {
      const props = { ...createValidProps(), userId: '' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('userId cannot be empty');
    });

    it('throws InvalidLikeError for whitespace-only userId', () => {
      const props = { ...createValidProps(), userId: '   ' };

      expect(() => Like.create(props)).toThrow(InvalidLikeError);
      expect(() => Like.create(props)).toThrow('userId cannot be empty');
    });
  });

  describe('Like.reconstruct()', () => {
    it('reconstructs a Like from persisted data', () => {
      const props = createValidProps();
      const like = Like.reconstruct(props);

      expect(like.id).toBe('like-123');
      expect(like.postId).toBe('post-456');
      expect(like.userId).toBe('user-789');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = Like.create(props);
      const reconstructed = Like.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });

    it('still validates data on reconstruct', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Like.reconstruct(props)).toThrow(InvalidLikeError);
    });
  });

  describe('Getters (immutability)', () => {
    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const like = Like.create(props);

      const date1 = like.createdAt;
      const date2 = like.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('modifying returned Date does not affect entity', () => {
      const props = createValidProps();
      const like = Like.create(props);

      const date = like.createdAt;
      date.setFullYear(2000);

      expect(like.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('equals()', () => {
    it('returns true for Likes with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), postId: 'different-post' };
      const like1 = Like.create(props1);
      const like2 = Like.create(props2);

      expect(like1.equals(like2)).toBe(true);
    });

    it('returns false for Likes with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const like1 = Like.create(props1);
      const like2 = Like.create(props2);

      expect(like1.equals(like2)).toBe(false);
    });

    it('returns true for the same Like instance', () => {
      const like = Like.create(createValidProps());

      expect(like.equals(like)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('Like instance is frozen', () => {
      const like = Like.create(createValidProps());

      expect(Object.isFrozen(like)).toBe(true);
    });

    it('cannot add new properties to Like', () => {
      const like = Like.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        like.newProp = 'value';
      }).toThrow();
    });

    it('cannot modify existing properties', () => {
      const like = Like.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        like._id = 'new-id';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles Date objects correctly across timezones', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date };
      const like = Like.create(props);

      expect(like.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('handles unicode characters in ids', () => {
      const props = { ...createValidProps(), userId: 'user-' };
      const like = Like.create(props);

      expect(like.userId).toBe('user-');
    });
  });
});
