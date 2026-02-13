/**
 * Comment Entity Tests
 *
 * TDD-first tests for Comment entity following DDD principles.
 * Tests cover: creation, validation, getters, methods, immutability
 */

import { describe, it, expect } from 'vitest';
import { Comment, InvalidCommentError } from '../../../../src/domain/entities/comment';

describe('Comment Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'comment-123',
    postId: 'post-456',
    authorId: 'user-789',
    parentCommentId: null as string | null,
    content: 'This is a test comment',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  });

  describe('Comment.create()', () => {
    it('creates a valid Comment with all properties', () => {
      const props = createValidProps();
      const comment = Comment.create(props);

      expect(comment.id).toBe('comment-123');
      expect(comment.postId).toBe('post-456');
      expect(comment.authorId).toBe('user-789');
      expect(comment.parentCommentId).toBeNull();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('creates a Comment with minimum valid content (1 character)', () => {
      const props = { ...createValidProps(), content: 'A' };
      const comment = Comment.create(props);

      expect(comment.content).toBe('A');
    });

    it('creates a Comment with maximum valid content (1000 characters)', () => {
      const maxContent = 'A'.repeat(1000);
      const props = { ...createValidProps(), content: maxContent };
      const comment = Comment.create(props);

      expect(comment.content).toBe(maxContent);
      expect(comment.content.length).toBe(1000);
    });

    it('creates a reply comment with parentCommentId', () => {
      const props = { ...createValidProps(), parentCommentId: 'parent-comment-001' };
      const comment = Comment.create(props);

      expect(comment.parentCommentId).toBe('parent-comment-001');
    });

    // Validation error cases
    it('throws InvalidCommentError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('id');
    });

    it('throws InvalidCommentError for whitespace-only id', () => {
      const props = { ...createValidProps(), id: '   ' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });

    it('throws InvalidCommentError for empty postId', () => {
      const props = { ...createValidProps(), postId: '' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('postId');
    });

    it('throws InvalidCommentError for whitespace-only postId', () => {
      const props = { ...createValidProps(), postId: '   ' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });

    it('throws InvalidCommentError for empty authorId', () => {
      const props = { ...createValidProps(), authorId: '' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('authorId');
    });

    it('throws InvalidCommentError for whitespace-only authorId', () => {
      const props = { ...createValidProps(), authorId: '   ' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });

    it('throws InvalidCommentError for empty content', () => {
      const props = { ...createValidProps(), content: '' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('content');
    });

    it('throws InvalidCommentError for whitespace-only content', () => {
      const props = { ...createValidProps(), content: '   ' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });

    it('throws InvalidCommentError for content exceeding 1000 characters', () => {
      const props = { ...createValidProps(), content: 'A'.repeat(1001) };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('content');
    });

    it('throws InvalidCommentError for empty parentCommentId (use null instead)', () => {
      const props = { ...createValidProps(), parentCommentId: '' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
      expect(() => Comment.create(props)).toThrow('parentCommentId');
    });

    it('throws InvalidCommentError for whitespace-only parentCommentId', () => {
      const props = { ...createValidProps(), parentCommentId: '   ' };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });
  });

  describe('Comment.reconstruct()', () => {
    it('reconstructs a Comment from persisted data', () => {
      const props = createValidProps();
      const comment = Comment.reconstruct(props);

      expect(comment.id).toBe('comment-123');
      expect(comment.postId).toBe('post-456');
      expect(comment.content).toBe('This is a test comment');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = Comment.create(props);
      const reconstructed = Comment.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });

    it('reconstructs a reply comment', () => {
      const props = { ...createValidProps(), parentCommentId: 'parent-001' };
      const comment = Comment.reconstruct(props);

      expect(comment.parentCommentId).toBe('parent-001');
      expect(comment.isReply()).toBe(true);
    });
  });

  describe('Getters (immutability)', () => {
    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const comment = Comment.create(props);

      const date1 = comment.createdAt;
      const date2 = comment.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('modifying returned Date does not affect comment', () => {
      const props = createValidProps();
      const comment = Comment.create(props);

      const date = comment.createdAt;
      date.setFullYear(2000);

      expect(comment.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('isReply()', () => {
    it('returns true when parentCommentId is not null', () => {
      const props = { ...createValidProps(), parentCommentId: 'parent-comment-001' };
      const comment = Comment.create(props);

      expect(comment.isReply()).toBe(true);
    });

    it('returns false when parentCommentId is null', () => {
      const props = { ...createValidProps(), parentCommentId: null };
      const comment = Comment.create(props);

      expect(comment.isReply()).toBe(false);
    });
  });

  describe('isTopLevel()', () => {
    it('returns true when parentCommentId is null', () => {
      const props = { ...createValidProps(), parentCommentId: null };
      const comment = Comment.create(props);

      expect(comment.isTopLevel()).toBe(true);
    });

    it('returns false when parentCommentId is not null', () => {
      const props = { ...createValidProps(), parentCommentId: 'parent-comment-001' };
      const comment = Comment.create(props);

      expect(comment.isTopLevel()).toBe(false);
    });

    it('isReply() and isTopLevel() are mutually exclusive', () => {
      const topLevelComment = Comment.create({ ...createValidProps(), parentCommentId: null });
      const replyComment = Comment.create({ ...createValidProps(), parentCommentId: 'parent-001' });

      expect(topLevelComment.isReply()).toBe(false);
      expect(topLevelComment.isTopLevel()).toBe(true);

      expect(replyComment.isReply()).toBe(true);
      expect(replyComment.isTopLevel()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('returns true for Comments with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), content: 'Different content' };
      const comment1 = Comment.create(props1);
      const comment2 = Comment.create(props2);

      expect(comment1.equals(comment2)).toBe(true);
    });

    it('returns false for Comments with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const comment1 = Comment.create(props1);
      const comment2 = Comment.create(props2);

      expect(comment1.equals(comment2)).toBe(false);
    });

    it('returns true for the same Comment instance', () => {
      const comment = Comment.create(createValidProps());

      expect(comment.equals(comment)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('Comment instance is frozen', () => {
      const comment = Comment.create(createValidProps());

      expect(Object.isFrozen(comment)).toBe(true);
    });

    it('cannot add new properties to Comment', () => {
      const comment = Comment.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        comment.newProp = 'value';
      }).toThrow();
    });

    it('cannot modify existing properties', () => {
      const comment = Comment.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        comment._id = 'new-id';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles unicode characters in content', () => {
      const props = { ...createValidProps(), content: 'Hello World' };
      const comment = Comment.create(props);

      expect(comment.content).toBe('Hello World');
    });

    it('handles emoji in content', () => {
      const props = { ...createValidProps(), content: 'Great post! Love it' };
      const comment = Comment.create(props);

      expect(comment.content).toBe('Great post! Love it');
    });

    it('handles multiline content', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      const props = { ...createValidProps(), content: multilineContent };
      const comment = Comment.create(props);

      expect(comment.content).toBe(multilineContent);
    });

    it('preserves leading and trailing spaces in content', () => {
      const props = { ...createValidProps(), content: '  spaced content  ' };
      const comment = Comment.create(props);

      expect(comment.content).toBe('  spaced content  ');
    });

    it('handles content with only special characters', () => {
      const props = { ...createValidProps(), content: '!@#$%^&*()' };
      const comment = Comment.create(props);

      expect(comment.content).toBe('!@#$%^&*()');
    });

    it('handles Date objects correctly across timezones', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date };
      const comment = Comment.create(props);

      expect(comment.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('content at exactly 999 characters is valid', () => {
      const props = { ...createValidProps(), content: 'A'.repeat(999) };
      const comment = Comment.create(props);

      expect(comment.content.length).toBe(999);
    });

    it('content at exactly 1001 characters is invalid', () => {
      const props = { ...createValidProps(), content: 'A'.repeat(1001) };

      expect(() => Comment.create(props)).toThrow(InvalidCommentError);
    });
  });
});
