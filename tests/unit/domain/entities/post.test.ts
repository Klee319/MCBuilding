/**
 * Post Entity Tests
 *
 * TDD-first tests for Post entity following DDD principles.
 * Tests cover: creation, validation, getters, methods, immutability
 */

import { describe, it, expect } from 'vitest';
import { Post, InvalidPostError } from '../../../../src/domain/entities/post';
import { Tag } from '../../../../src/domain/value-objects/tag';
import { Visibility } from '../../../../src/domain/value-objects/visibility';
import { UnlistedUrl } from '../../../../src/domain/value-objects/unlisted-url';

describe('Post Entity', () => {
  // Test fixtures
  const createValidProps = () => ({
    id: 'post-123',
    authorId: 'user-456',
    structureId: 'struct-789',
    title: 'My Awesome Structure',
    description: 'A beautiful Minecraft building.',
    tags: [Tag.create('minecraft'), Tag.create('building')],
    visibility: Visibility.public(),
    unlistedUrl: null,
    requiredMods: ['mod1', 'mod2'],
    likeCount: 100,
    downloadCount: 50,
    commentCount: 25,
    isPinned: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  });

  const createUnlistedProps = () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
    return {
      ...createValidProps(),
      visibility: Visibility.unlisted(),
      unlistedUrl: UnlistedUrl.create('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', futureDate),
    };
  };

  describe('Post.create()', () => {
    it('creates a valid Post with all properties', () => {
      const props = createValidProps();
      const post = Post.create(props);

      expect(post.id).toBe('post-123');
      expect(post.authorId).toBe('user-456');
      expect(post.structureId).toBe('struct-789');
      expect(post.title).toBe('My Awesome Structure');
      expect(post.description).toBe('A beautiful Minecraft building.');
      expect(post.tags).toHaveLength(2);
      expect(post.visibility.value).toBe('public');
      expect(post.unlistedUrl).toBeNull();
      expect(post.requiredMods).toEqual(['mod1', 'mod2']);
      expect(post.likeCount).toBe(100);
      expect(post.downloadCount).toBe(50);
      expect(post.commentCount).toBe(25);
      expect(post.isPinned).toBe(false);
      expect(post.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(post.updatedAt).toEqual(new Date('2024-01-15T00:00:00Z'));
    });

    it('creates a Post with minimum valid title (1 character)', () => {
      const props = { ...createValidProps(), title: 'A' };
      const post = Post.create(props);

      expect(post.title).toBe('A');
    });

    it('creates a Post with maximum valid title (200 characters)', () => {
      const maxTitle = 'A'.repeat(200);
      const props = { ...createValidProps(), title: maxTitle };
      const post = Post.create(props);

      expect(post.title).toBe(maxTitle);
    });

    it('creates a Post with empty description', () => {
      const props = { ...createValidProps(), description: '' };
      const post = Post.create(props);

      expect(post.description).toBe('');
    });

    it('creates a Post with maximum valid description (5000 characters)', () => {
      const maxDescription = 'A'.repeat(5000);
      const props = { ...createValidProps(), description: maxDescription };
      const post = Post.create(props);

      expect(post.description).toBe(maxDescription);
    });

    it('creates a Post with empty tags array', () => {
      const props = { ...createValidProps(), tags: [] };
      const post = Post.create(props);

      expect(post.tags).toEqual([]);
    });

    it('creates a Post with maximum tags (10)', () => {
      const tags = Array.from({ length: 10 }, (_, i) => Tag.create(`tag${i}`));
      const props = { ...createValidProps(), tags };
      const post = Post.create(props);

      expect(post.tags).toHaveLength(10);
    });

    it('creates a Post with unlisted visibility and unlistedUrl', () => {
      const props = createUnlistedProps();
      const post = Post.create(props);

      expect(post.visibility.value).toBe('unlisted');
      expect(post.unlistedUrl).not.toBeNull();
    });

    it('creates a Post with private visibility and no unlistedUrl', () => {
      const props = { ...createValidProps(), visibility: Visibility.private() };
      const post = Post.create(props);

      expect(post.visibility.value).toBe('private');
      expect(post.unlistedUrl).toBeNull();
    });

    it('creates a Post with empty requiredMods array', () => {
      const props = { ...createValidProps(), requiredMods: [] };
      const post = Post.create(props);

      expect(post.requiredMods).toEqual([]);
    });

    it('creates a Post with zero counts', () => {
      const props = {
        ...createValidProps(),
        likeCount: 0,
        downloadCount: 0,
        commentCount: 0,
      };
      const post = Post.create(props);

      expect(post.likeCount).toBe(0);
      expect(post.downloadCount).toBe(0);
      expect(post.commentCount).toBe(0);
    });

    it('creates a Post with isPinned true', () => {
      const props = { ...createValidProps(), isPinned: true };
      const post = Post.create(props);

      expect(post.isPinned).toBe(true);
    });

    // Validation error cases
    it('throws InvalidPostError for empty id', () => {
      const props = { ...createValidProps(), id: '' };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('id');
    });

    it('throws InvalidPostError for empty authorId', () => {
      const props = { ...createValidProps(), authorId: '' };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('authorId');
    });

    it('throws InvalidPostError for empty structureId', () => {
      const props = { ...createValidProps(), structureId: '' };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('structureId');
    });

    it('throws InvalidPostError for empty title', () => {
      const props = { ...createValidProps(), title: '' };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('title');
    });

    it('throws InvalidPostError for whitespace-only title', () => {
      const props = { ...createValidProps(), title: '   ' };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
    });

    it('throws InvalidPostError for title exceeding 200 characters', () => {
      const props = { ...createValidProps(), title: 'A'.repeat(201) };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('title');
    });

    it('throws InvalidPostError for description exceeding 5000 characters', () => {
      const props = { ...createValidProps(), description: 'A'.repeat(5001) };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('description');
    });

    it('throws InvalidPostError for tags exceeding 10 items', () => {
      const tags = Array.from({ length: 11 }, (_, i) => Tag.create(`tag${i}`));
      const props = { ...createValidProps(), tags };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('tags');
    });

    it('throws InvalidPostError for unlisted visibility without unlistedUrl', () => {
      const props = {
        ...createValidProps(),
        visibility: Visibility.unlisted(),
        unlistedUrl: null,
      };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('unlistedUrl');
    });

    it('throws InvalidPostError for negative likeCount', () => {
      const props = { ...createValidProps(), likeCount: -1 };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('likeCount');
    });

    it('throws InvalidPostError for negative downloadCount', () => {
      const props = { ...createValidProps(), downloadCount: -1 };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('downloadCount');
    });

    it('throws InvalidPostError for negative commentCount', () => {
      const props = { ...createValidProps(), commentCount: -1 };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('commentCount');
    });

    it('throws InvalidPostError when createdAt is after updatedAt', () => {
      const props = {
        ...createValidProps(),
        createdAt: new Date('2024-01-20T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
      };

      expect(() => Post.create(props)).toThrow(InvalidPostError);
      expect(() => Post.create(props)).toThrow('createdAt');
    });

    it('allows createdAt equal to updatedAt', () => {
      const sameDate = new Date('2024-01-15T00:00:00Z');
      const props = {
        ...createValidProps(),
        createdAt: sameDate,
        updatedAt: sameDate,
      };
      const post = Post.create(props);

      expect(post.createdAt).toEqual(sameDate);
      expect(post.updatedAt).toEqual(sameDate);
    });
  });

  describe('Post.reconstruct()', () => {
    it('reconstructs a Post from persisted data', () => {
      const props = createValidProps();
      const post = Post.reconstruct(props);

      expect(post.id).toBe('post-123');
      expect(post.title).toBe('My Awesome Structure');
    });

    it('behaves the same as create for valid data', () => {
      const props = createValidProps();
      const created = Post.create(props);
      const reconstructed = Post.reconstruct(props);

      expect(created.equals(reconstructed)).toBe(true);
    });
  });

  describe('Getters (immutability)', () => {
    it('returns a copy of tags array (immutability)', () => {
      const props = createValidProps();
      const post = Post.create(props);

      const tags1 = post.tags;
      const tags2 = post.tags;

      expect(tags1).toEqual(tags2);
      expect(tags1).not.toBe(tags2);
    });

    it('returns a copy of requiredMods array (immutability)', () => {
      const props = createValidProps();
      const post = Post.create(props);

      const mods1 = post.requiredMods;
      const mods2 = post.requiredMods;

      expect(mods1).toEqual(mods2);
      expect(mods1).not.toBe(mods2);

      mods1.push('newMod');
      expect(post.requiredMods).toEqual(['mod1', 'mod2']);
    });

    it('returns createdAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const post = Post.create(props);

      const date1 = post.createdAt;
      const date2 = post.createdAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });

    it('returns updatedAt as new Date instance (immutability)', () => {
      const props = createValidProps();
      const post = Post.create(props);

      const date1 = post.updatedAt;
      const date2 = post.updatedAt;

      expect(date1.getTime()).toBe(date2.getTime());
      expect(date1).not.toBe(date2);
    });
  });

  describe('isPublic()', () => {
    it('returns true for public visibility', () => {
      const post = Post.create(createValidProps());

      expect(post.isPublic()).toBe(true);
    });

    it('returns false for private visibility', () => {
      const props = { ...createValidProps(), visibility: Visibility.private() };
      const post = Post.create(props);

      expect(post.isPublic()).toBe(false);
    });

    it('returns false for unlisted visibility', () => {
      const post = Post.create(createUnlistedProps());

      expect(post.isPublic()).toBe(false);
    });
  });

  describe('isPrivate()', () => {
    it('returns true for private visibility', () => {
      const props = { ...createValidProps(), visibility: Visibility.private() };
      const post = Post.create(props);

      expect(post.isPrivate()).toBe(true);
    });

    it('returns false for public visibility', () => {
      const post = Post.create(createValidProps());

      expect(post.isPrivate()).toBe(false);
    });

    it('returns false for unlisted visibility', () => {
      const post = Post.create(createUnlistedProps());

      expect(post.isPrivate()).toBe(false);
    });
  });

  describe('isUnlisted()', () => {
    it('returns true for unlisted visibility', () => {
      const post = Post.create(createUnlistedProps());

      expect(post.isUnlisted()).toBe(true);
    });

    it('returns false for public visibility', () => {
      const post = Post.create(createValidProps());

      expect(post.isUnlisted()).toBe(false);
    });

    it('returns false for private visibility', () => {
      const props = { ...createValidProps(), visibility: Visibility.private() };
      const post = Post.create(props);

      expect(post.isUnlisted()).toBe(false);
    });
  });

  describe('isAccessible()', () => {
    describe('public visibility', () => {
      it('returns true for non-owner viewer', () => {
        const post = Post.create(createValidProps());

        expect(post.isAccessible(false)).toBe(true);
      });

      it('returns true for owner viewer', () => {
        const post = Post.create(createValidProps());

        expect(post.isAccessible(true)).toBe(true);
      });
    });

    describe('private visibility', () => {
      it('returns false for non-owner viewer', () => {
        const props = { ...createValidProps(), visibility: Visibility.private() };
        const post = Post.create(props);

        expect(post.isAccessible(false)).toBe(false);
      });

      it('returns true for owner viewer', () => {
        const props = { ...createValidProps(), visibility: Visibility.private() };
        const post = Post.create(props);

        expect(post.isAccessible(true)).toBe(true);
      });
    });

    describe('unlisted visibility', () => {
      it('returns false for non-owner without token', () => {
        const post = Post.create(createUnlistedProps());

        expect(post.isAccessible(false)).toBe(false);
      });

      it('returns true for non-owner with correct token', () => {
        const props = createUnlistedProps();
        const post = Post.create(props);
        const token = props.unlistedUrl!.token;

        expect(post.isAccessible(false, token)).toBe(true);
      });

      it('returns false for non-owner with incorrect token', () => {
        const post = Post.create(createUnlistedProps());

        expect(post.isAccessible(false, 'wrong-token')).toBe(false);
      });

      it('returns true for owner regardless of token', () => {
        const post = Post.create(createUnlistedProps());

        expect(post.isAccessible(true)).toBe(true);
        expect(post.isAccessible(true, 'wrong-token')).toBe(true);
      });
    });
  });

  describe('withTitle()', () => {
    it('returns a new Post with updated title', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withTitle('New Title');

      expect(updatedPost.title).toBe('New Title');
      expect(post.title).toBe('My Awesome Structure'); // Original unchanged
    });

    it('returns a different instance', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withTitle('New Title');

      expect(post).not.toBe(updatedPost);
    });

    it('preserves all other properties', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withTitle('New Title');

      expect(updatedPost.id).toBe(post.id);
      expect(updatedPost.authorId).toBe(post.authorId);
      expect(updatedPost.likeCount).toBe(post.likeCount);
    });

    it('throws InvalidPostError for invalid title', () => {
      const post = Post.create(createValidProps());

      expect(() => post.withTitle('')).toThrow(InvalidPostError);
      expect(() => post.withTitle('A'.repeat(201))).toThrow(InvalidPostError);
    });
  });

  describe('withDescription()', () => {
    it('returns a new Post with updated description', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withDescription('New Description');

      expect(updatedPost.description).toBe('New Description');
      expect(post.description).toBe('A beautiful Minecraft building.'); // Original unchanged
    });

    it('returns a different instance', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withDescription('New Description');

      expect(post).not.toBe(updatedPost);
    });

    it('allows empty description', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withDescription('');

      expect(updatedPost.description).toBe('');
    });

    it('throws InvalidPostError for description exceeding 5000 characters', () => {
      const post = Post.create(createValidProps());

      expect(() => post.withDescription('A'.repeat(5001))).toThrow(InvalidPostError);
    });
  });

  describe('withVisibility()', () => {
    it('returns a new Post with updated visibility to public', () => {
      const post = Post.create(createUnlistedProps());
      const updatedPost = post.withVisibility(Visibility.public());

      expect(updatedPost.visibility.value).toBe('public');
      expect(updatedPost.unlistedUrl).toBeNull();
    });

    it('returns a new Post with updated visibility to private', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withVisibility(Visibility.private());

      expect(updatedPost.visibility.value).toBe('private');
      expect(updatedPost.unlistedUrl).toBeNull();
    });

    it('returns a new Post with updated visibility to unlisted (with URL)', () => {
      const post = Post.create(createValidProps());
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const unlistedUrl = UnlistedUrl.create('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', futureDate);
      const updatedPost = post.withVisibility(Visibility.unlisted(), unlistedUrl);

      expect(updatedPost.visibility.value).toBe('unlisted');
      expect(updatedPost.unlistedUrl).not.toBeNull();
    });

    it('throws InvalidPostError when changing to unlisted without URL', () => {
      const post = Post.create(createValidProps());

      expect(() => post.withVisibility(Visibility.unlisted())).toThrow(InvalidPostError);
    });

    it('preserves other properties', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.withVisibility(Visibility.private());

      expect(updatedPost.id).toBe(post.id);
      expect(updatedPost.title).toBe(post.title);
    });
  });

  describe('incrementLikeCount()', () => {
    it('returns a new Post with likeCount incremented by 1', () => {
      const props = { ...createValidProps(), likeCount: 10 };
      const post = Post.create(props);
      const updatedPost = post.incrementLikeCount();

      expect(updatedPost.likeCount).toBe(11);
      expect(post.likeCount).toBe(10); // Original unchanged
    });

    it('returns a different instance', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.incrementLikeCount();

      expect(post).not.toBe(updatedPost);
    });
  });

  describe('decrementLikeCount()', () => {
    it('returns a new Post with likeCount decremented by 1', () => {
      const props = { ...createValidProps(), likeCount: 10 };
      const post = Post.create(props);
      const updatedPost = post.decrementLikeCount();

      expect(updatedPost.likeCount).toBe(9);
      expect(post.likeCount).toBe(10); // Original unchanged
    });

    it('throws InvalidPostError when likeCount would become negative', () => {
      const props = { ...createValidProps(), likeCount: 0 };
      const post = Post.create(props);

      expect(() => post.decrementLikeCount()).toThrow(InvalidPostError);
    });
  });

  describe('incrementDownloadCount()', () => {
    it('returns a new Post with downloadCount incremented by 1', () => {
      const props = { ...createValidProps(), downloadCount: 10 };
      const post = Post.create(props);
      const updatedPost = post.incrementDownloadCount();

      expect(updatedPost.downloadCount).toBe(11);
      expect(post.downloadCount).toBe(10); // Original unchanged
    });

    it('returns a different instance', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.incrementDownloadCount();

      expect(post).not.toBe(updatedPost);
    });
  });

  describe('incrementCommentCount()', () => {
    it('returns a new Post with commentCount incremented by 1', () => {
      const props = { ...createValidProps(), commentCount: 10 };
      const post = Post.create(props);
      const updatedPost = post.incrementCommentCount();

      expect(updatedPost.commentCount).toBe(11);
      expect(post.commentCount).toBe(10); // Original unchanged
    });

    it('returns a different instance', () => {
      const post = Post.create(createValidProps());
      const updatedPost = post.incrementCommentCount();

      expect(post).not.toBe(updatedPost);
    });
  });

  describe('decrementCommentCount()', () => {
    it('returns a new Post with commentCount decremented by 1', () => {
      const props = { ...createValidProps(), commentCount: 10 };
      const post = Post.create(props);
      const updatedPost = post.decrementCommentCount();

      expect(updatedPost.commentCount).toBe(9);
      expect(post.commentCount).toBe(10); // Original unchanged
    });

    it('throws InvalidPostError when commentCount would become negative', () => {
      const props = { ...createValidProps(), commentCount: 0 };
      const post = Post.create(props);

      expect(() => post.decrementCommentCount()).toThrow(InvalidPostError);
    });
  });

  describe('equals()', () => {
    it('returns true for Posts with the same id', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), title: 'Different Title' };
      const post1 = Post.create(props1);
      const post2 = Post.create(props2);

      expect(post1.equals(post2)).toBe(true);
    });

    it('returns false for Posts with different ids', () => {
      const props1 = createValidProps();
      const props2 = { ...createValidProps(), id: 'different-id' };
      const post1 = Post.create(props1);
      const post2 = Post.create(props2);

      expect(post1.equals(post2)).toBe(false);
    });

    it('returns true for the same Post instance', () => {
      const post = Post.create(createValidProps());

      expect(post.equals(post)).toBe(true);
    });
  });

  describe('Entity immutability', () => {
    it('Post instance is frozen', () => {
      const post = Post.create(createValidProps());

      expect(Object.isFrozen(post)).toBe(true);
    });

    it('cannot add new properties to Post', () => {
      const post = Post.create(createValidProps()) as Record<string, unknown>;

      expect(() => {
        post.newProp = 'value';
      }).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles unicode characters in title', () => {
      const props = { ...createValidProps(), title: 'Test' };
      const post = Post.create(props);

      expect(post.title).toBe('Test');
    });

    it('handles unicode characters in description', () => {
      const props = { ...createValidProps(), description: 'This is a description' };
      const post = Post.create(props);

      expect(post.description).toBe('This is a description');
    });

    it('handles many required mods', () => {
      const manyMods = Array.from({ length: 100 }, (_, i) => `mod-${i}`);
      const props = { ...createValidProps(), requiredMods: manyMods };
      const post = Post.create(props);

      expect(post.requiredMods).toHaveLength(100);
    });

    it('handles Date objects correctly', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const props = { ...createValidProps(), createdAt: date, updatedAt: date };
      const post = Post.create(props);

      expect(post.createdAt.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('trims title whitespace for validation but preserves original', () => {
      const props = { ...createValidProps(), title: ' Valid Title ' };
      const post = Post.create(props);

      // Title should be preserved as-is (validation checks trimmed length > 0)
      expect(post.title).toBe(' Valid Title ');
    });
  });
});
