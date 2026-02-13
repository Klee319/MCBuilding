/**
 * Post Schemas Unit Tests
 *
 * TDD tests for post-related validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
  postIdParamSchema,
  unlistedTokenParamSchema,
} from '../../../../src/interface/validators/post-schemas';

// ========================================
// createPostSchema Tests
// ========================================
describe('createPostSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid minimal input', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.structureId).toBe('struct-123');
        expect(result.data.title).toBe('My Structure');
        expect(result.data.visibility).toBe('public');
      }
    });

    it('should accept valid input with all optional fields', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        description: 'A description',
        tags: ['tag1', 'tag2'],
        visibility: 'private',
        unlistedExpiry: '2025-12-31T23:59:59Z',
        requiredMods: ['mod1', 'mod2'],
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('A description');
        expect(result.data.tags).toEqual(['tag1', 'tag2']);
        expect(result.data.requiredMods).toEqual(['mod1', 'mod2']);
      }
    });

    it('should accept unlisted visibility with null expiry', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        visibility: 'unlisted',
        unlistedExpiry: null,
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unlistedExpiry).toBeNull();
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty structureId', () => {
      const input = {
        structureId: '',
        title: 'My Structure',
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('structureId cannot be empty');
      }
    });

    it('should reject missing structureId', () => {
      const input = {
        title: 'My Structure',
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const input = {
        structureId: 'struct-123',
        title: '',
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('タイトルを入力してください');
      }
    });

    it('should reject title exceeding 50 characters', () => {
      const input = {
        structureId: 'struct-123',
        title: 'A'.repeat(51),
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('タイトルは50文字以内');
      }
    });

    it('should reject description exceeding 2000 characters', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        description: 'A'.repeat(2001),
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('説明文は2000文字以内');
      }
    });

    it('should reject invalid visibility value', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        visibility: 'invalid',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject more than 10 tags', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11'],
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('タグは10個以内');
      }
    });

    it('should reject tag exceeding 30 characters', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        tags: ['A'.repeat(31)],
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty tag string', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        tags: [''],
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format for unlistedExpiry', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        visibility: 'unlisted',
        unlistedExpiry: 'not-a-date',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept title with exactly 50 characters', () => {
      const input = {
        structureId: 'struct-123',
        title: 'A'.repeat(50),
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept description with exactly 2000 characters', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        description: 'A'.repeat(2000),
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept exactly 10 tags', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10'],
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept empty tags array', () => {
      const input = {
        structureId: 'struct-123',
        title: 'My Structure',
        tags: [],
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in title', () => {
      const input = {
        structureId: 'struct-123',
        title: '日本語タイトル',
        visibility: 'public',
      };

      const result = createPostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// updatePostSchema Tests
// ========================================
describe('updatePostSchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty object (all fields optional)', () => {
      const input = {};

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept partial update with title only', () => {
      const input = {
        title: 'Updated Title',
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Updated Title');
      }
    });

    it('should accept partial update with description only', () => {
      const input = {
        description: 'Updated description',
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept full update with all fields', () => {
      const input = {
        title: 'Updated Title',
        description: 'Updated description',
        visibility: 'private',
        unlistedExpiry: '2025-12-31T23:59:59Z',
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty title when provided', () => {
      const input = {
        title: '',
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('タイトルを入力してください');
      }
    });

    it('should reject title exceeding 50 characters', () => {
      const input = {
        title: 'A'.repeat(51),
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 2000 characters', () => {
      const input = {
        description: 'A'.repeat(2001),
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid visibility value', () => {
      const input = {
        visibility: 'invalid',
      };

      const result = updatePostSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// postQuerySchema Tests
// ========================================
describe('postQuerySchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty query and apply defaults', () => {
      const input = {};

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('popular');
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept keyword search', () => {
      const input = {
        keyword: 'castle',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keyword).toBe('castle');
      }
    });

    it('should parse edition as comma-separated array', () => {
      const input = {
        edition: 'java,bedrock',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edition).toEqual(['java', 'bedrock']);
      }
    });

    it('should parse sizeCategory as comma-separated array', () => {
      const input = {
        sizeCategory: 'small,medium,large',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sizeCategory).toEqual(['small', 'medium', 'large']);
      }
    });

    it('should parse hasRequiredMods boolean from string', () => {
      const input = {
        hasRequiredMods: 'true',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasRequiredMods).toBe(true);
      }
    });

    it('should parse hasRequiredMods as false for non-true string', () => {
      const input = {
        hasRequiredMods: 'false',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasRequiredMods).toBe(false);
      }
    });
  });

  describe('type coercion', () => {
    it('should coerce page from string to number', () => {
      const input = {
        page: '5',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(typeof result.data.page).toBe('number');
      }
    });

    it('should coerce limit from string to number', () => {
      const input = {
        limit: '50',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(typeof result.data.limit).toBe('number');
      }
    });
  });

  describe('default value application', () => {
    it('should apply default sortBy when not provided', () => {
      const input = {};

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('popular');
      }
    });

    it('should apply default page when not provided', () => {
      const input = {};

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should apply default limit when not provided', () => {
      const input = {};

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid edition value', () => {
      const input = {
        edition: 'invalid',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid sizeCategory value', () => {
      const input = {
        sizeCategory: 'tiny',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid sortBy value', () => {
      const input = {
        sortBy: 'invalid',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const input = {
        page: '0',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const input = {
        page: '-1',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: '0',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const input = {
        limit: '101',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer page', () => {
      const input = {
        page: '1.5',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty edition string by filtering to empty array', () => {
      const input = {
        edition: '',
      };

      const result = postQuerySchema.safeParse(input);

      // Empty string results in empty array after filter, which should fail enum validation
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edition).toEqual([]);
      }
    });

    it('should accept limit at boundary value 100', () => {
      const input = {
        limit: '100',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should accept limit at boundary value 1', () => {
      const input = {
        limit: '1',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it('should filter empty strings from edition array', () => {
      const input = {
        edition: 'java,,bedrock',
      };

      const result = postQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edition).toEqual(['java', 'bedrock']);
      }
    });
  });
});

// ========================================
// postIdParamSchema Tests
// ========================================
describe('postIdParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid post ID', () => {
      const input = {
        id: 'post-123',
      };

      const result = postIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('post-123');
      }
    });

    it('should accept UUID format', () => {
      const input = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = postIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty id', () => {
      const input = {
        id: '',
      };

      const result = postIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Post ID is required');
      }
    });

    it('should reject missing id', () => {
      const input = {};

      const result = postIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// unlistedTokenParamSchema Tests
// ========================================
describe('unlistedTokenParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid token', () => {
      const input = {
        token: 'abc123xyz',
      };

      const result = unlistedTokenParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe('abc123xyz');
      }
    });

    it('should accept long token string', () => {
      const input = {
        token: 'a'.repeat(256),
      };

      const result = unlistedTokenParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty token', () => {
      const input = {
        token: '',
      };

      const result = unlistedTokenParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Token is required');
      }
    });

    it('should reject missing token', () => {
      const input = {};

      const result = unlistedTokenParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});
