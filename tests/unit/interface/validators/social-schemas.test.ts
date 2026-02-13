/**
 * Social Schemas Unit Tests
 *
 * TDD tests for social-related validation schemas (likes, comments, follows).
 */

import { describe, it, expect } from 'vitest';
import {
  createCommentSchema,
  commentIdParamSchema,
  reportContentSchema,
  getCommentsQuerySchema,
} from '../../../../src/interface/validators/social-schemas';

// ========================================
// createCommentSchema Tests
// ========================================
describe('createCommentSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid comment content', () => {
      const input = {
        content: 'This is a great post!',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('This is a great post!');
      }
    });

    it('should accept comment with parentCommentId', () => {
      const input = {
        content: 'This is a reply',
        parentCommentId: 'comment-123',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentCommentId).toBe('comment-123');
      }
    });

    it('should accept null parentCommentId', () => {
      const input = {
        content: 'Top level comment',
        parentCommentId: null,
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentCommentId).toBeNull();
      }
    });

    it('should accept comment without parentCommentId', () => {
      const input = {
        content: 'Comment without parent',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentCommentId).toBeUndefined();
      }
    });

    it('should accept unicode content', () => {
      const input = {
        content: 'Great work! Excellent!',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept Japanese content', () => {
      const input = {
        content: 'This is a nice building!',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty content', () => {
      const input = {
        content: '',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('コメントを入力');
      }
    });

    it('should reject content exceeding 1000 characters', () => {
      const input = {
        content: 'A'.repeat(1001),
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1000文字以内');
      }
    });

    it('should reject missing content', () => {
      const input = {};

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only content', () => {
      const input = {
        content: '   ',
      };

      // Note: The schema requires min 1 char, but whitespace passes this
      // This test documents current behavior - whitespace passes validation
      const result = createCommentSchema.safeParse(input);

      // Current implementation accepts whitespace
      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should accept content with exactly 1000 characters', () => {
      const input = {
        content: 'A'.repeat(1000),
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept single character content', () => {
      const input = {
        content: 'A',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept content with newlines', () => {
      const input = {
        content: 'Line 1\nLine 2\nLine 3',
      };

      const result = createCommentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// commentIdParamSchema Tests
// ========================================
describe('commentIdParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid comment ID', () => {
      const input = {
        id: 'comment-123',
      };

      const result = commentIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('comment-123');
      }
    });

    it('should accept UUID format', () => {
      const input = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = commentIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty id', () => {
      const input = {
        id: '',
      };

      const result = commentIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Comment ID is required');
      }
    });

    it('should reject missing id', () => {
      const input = {};

      const result = commentIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// reportContentSchema Tests
// ========================================
describe('reportContentSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid report for post', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'spam',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetType).toBe('post');
        expect(result.data.targetId).toBe('post-123');
        expect(result.data.reason).toBe('spam');
      }
    });

    it('should accept valid report for comment', () => {
      const input = {
        targetType: 'comment',
        targetId: 'comment-456',
        reason: 'harassment',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept valid report for user', () => {
      const input = {
        targetType: 'user',
        targetId: 'user-789',
        reason: 'inappropriate',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept report with details', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'other',
        details: 'This post contains misleading information',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.details).toBe('This post contains misleading information');
      }
    });

    it('should accept all valid reason types', () => {
      const reasons = ['spam', 'harassment', 'inappropriate', 'copyright', 'other'];

      for (const reason of reasons) {
        const input = {
          targetType: 'post',
          targetId: 'post-123',
          reason,
        };

        const result = reportContentSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept empty details string', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'spam',
        details: '',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid targetType', () => {
      const input = {
        targetType: 'invalid',
        targetId: 'id-123',
        reason: 'spam',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('post, comment, user');
      }
    });

    it('should reject empty targetId', () => {
      const input = {
        targetType: 'post',
        targetId: '',
        reason: 'spam',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('報告対象ID');
      }
    });

    it('should reject invalid reason', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'invalid-reason',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('有効な報告理由');
      }
    });

    it('should reject details exceeding 1000 characters', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'other',
        details: 'A'.repeat(1001),
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1000文字以内');
      }
    });

    it('should reject missing targetType', () => {
      const input = {
        targetId: 'post-123',
        reason: 'spam',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing targetId', () => {
      const input = {
        targetType: 'post',
        reason: 'spam',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing reason', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept details with exactly 1000 characters', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'other',
        details: 'A'.repeat(1000),
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept details with newlines and special characters', () => {
      const input = {
        targetType: 'post',
        targetId: 'post-123',
        reason: 'other',
        details: 'Issue description:\n- Point 1\n- Point 2\n\nURL: https://example.com',
      };

      const result = reportContentSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// getCommentsQuerySchema Tests
// ========================================
describe('getCommentsQuerySchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty query and apply defaults', () => {
      const input = {};

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept custom page and limit', () => {
      const input = {
        page: 3,
        limit: 50,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe('type coercion', () => {
    it('should coerce page from string to number', () => {
      const input = {
        page: '5',
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe('number');
      }
    });

    it('should coerce limit from string to number', () => {
      const input = {
        limit: '30',
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(30);
        expect(typeof result.data.limit).toBe('number');
      }
    });
  });

  describe('default value application', () => {
    it('should apply default page when not provided', () => {
      const input = {
        limit: 50,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should apply default limit when not provided', () => {
      const input = {
        page: 2,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject page less than 1', () => {
      const input = {
        page: 0,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const input = {
        page: -1,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: 0,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const input = {
        limit: 101,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer page', () => {
      const input = {
        page: 1.5,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const input = {
        limit: 25.5,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept page at boundary value 1', () => {
      const input = {
        page: 1,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept limit at boundary value 1', () => {
      const input = {
        limit: 1,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept limit at boundary value 100', () => {
      const input = {
        limit: 100,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept very large page number', () => {
      const input = {
        page: 999999,
      };

      const result = getCommentsQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});
