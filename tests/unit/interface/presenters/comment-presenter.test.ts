/**
 * Comment Presenter Unit Tests
 *
 * TDD tests for CommentPresenter class.
 * Tests comment entity formatting for API responses including replies and deleted handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommentPresenter, type CommentWithAuthor } from '../../../../src/interface/presenters/comment-presenter.js';
import { Comment } from '../../../../src/domain/entities/comment.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ========================================
// Mock Data Factory
// ========================================
function createMockUser(overrides: Partial<{
  id: string;
  displayName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  linkedSns: readonly string[];
}> = {}): User {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return User.create({
    id: overrides.id ?? 'user-123',
    displayName: overrides.displayName ?? 'Test User',
    email: Email.create('user@example.com'),
    accountLevel: AccountLevel.registered(),
    isEmailVerified: overrides.isEmailVerified ?? true,
    isPhoneVerified: overrides.isPhoneVerified ?? false,
    linkedSns: overrides.linkedSns ?? [],
    pinnedPostIds: [],
    followerCount: 100,
    followingCount: 50,
    createdAt: now,
    updatedAt: now,
  });
}

function createMockComment(overrides: Partial<{
  id: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
}> = {}): Comment {
  return Comment.create({
    id: overrides.id ?? 'comment-123',
    postId: overrides.postId ?? 'post-123',
    authorId: overrides.authorId ?? 'user-123',
    parentCommentId: overrides.parentCommentId ?? null,
    content: overrides.content ?? 'Test comment content',
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z'),
  });
}

function createCommentWithAuthor(
  commentOverrides: Parameters<typeof createMockComment>[0] = {},
  userOverrides: Parameters<typeof createMockUser>[0] = {},
  options: { replies?: CommentWithAuthor[]; isDeleted?: boolean } = {}
): CommentWithAuthor {
  return {
    comment: createMockComment(commentOverrides),
    author: createMockUser(userOverrides),
    replies: options.replies ?? [],
    isDeleted: options.isDeleted ?? false,
  };
}

// ========================================
// Test: toOutput method
// ========================================
describe('CommentPresenter.toOutput', () => {
  it('returns correct comment output structure', () => {
    const commentWithAuthor = createCommentWithAuthor();
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('author');
    expect(result).toHaveProperty('parentCommentId');
    expect(result).toHaveProperty('replies');
    expect(result).toHaveProperty('isDeleted');
    expect(result).toHaveProperty('createdAt');
  });

  it('formats comment id correctly', () => {
    const commentWithAuthor = createCommentWithAuthor({ id: 'comment-abc-123' });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.id).toBe('comment-abc-123');
  });

  it('formats content correctly for non-deleted comment', () => {
    const commentWithAuthor = createCommentWithAuthor(
      { content: 'This is my comment' },
      {},
      { isDeleted: false }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('This is my comment');
  });

  it('formats author as user summary', () => {
    const commentWithAuthor = createCommentWithAuthor(
      {},
      { id: 'author-456', displayName: 'Comment Author' }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.author).toHaveProperty('id', 'author-456');
    expect(result.author).toHaveProperty('displayName', 'Comment Author');
    expect(result.author).toHaveProperty('accountLevel');
    expect(result.author).toHaveProperty('badges');
    expect(result.author).not.toHaveProperty('followerCount');
  });

  it('formats parentCommentId correctly for top-level comment', () => {
    const commentWithAuthor = createCommentWithAuthor({ parentCommentId: null });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.parentCommentId).toBeNull();
  });

  it('formats parentCommentId correctly for reply', () => {
    const commentWithAuthor = createCommentWithAuthor({ parentCommentId: 'parent-123' });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.parentCommentId).toBe('parent-123');
  });

  it('formats empty replies array', () => {
    const commentWithAuthor = createCommentWithAuthor({}, {}, { replies: [] });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toEqual([]);
  });

  it('formats isDeleted correctly for non-deleted comment', () => {
    const commentWithAuthor = createCommentWithAuthor({}, {}, { isDeleted: false });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.isDeleted).toBe(false);
  });

  it('formats createdAt as ISO string', () => {
    const date = new Date('2025-06-15T12:30:00.000Z');
    const commentWithAuthor = createCommentWithAuthor({ createdAt: date });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.createdAt).toBe('2025-06-15T12:30:00.000Z');
  });
});

// ========================================
// Test: Replies handling
// ========================================
describe('CommentPresenter replies handling', () => {
  it('formats single reply correctly', () => {
    const reply = createCommentWithAuthor(
      { id: 'reply-1', content: 'Reply content', parentCommentId: 'comment-123' },
      { id: 'replier-1', displayName: 'Replier' }
    );
    const commentWithAuthor = createCommentWithAuthor(
      { id: 'comment-123' },
      {},
      { replies: [reply] }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toHaveLength(1);
    expect(result.replies[0].id).toBe('reply-1');
    expect(result.replies[0].content).toBe('Reply content');
    expect(result.replies[0].author.id).toBe('replier-1');
  });

  it('formats multiple replies correctly', () => {
    const replies = [
      createCommentWithAuthor(
        { id: 'reply-1', content: 'First reply' },
        { id: 'user-1', displayName: 'User One' }
      ),
      createCommentWithAuthor(
        { id: 'reply-2', content: 'Second reply' },
        { id: 'user-2', displayName: 'User Two' }
      ),
      createCommentWithAuthor(
        { id: 'reply-3', content: 'Third reply' },
        { id: 'user-3', displayName: 'User Three' }
      ),
    ];
    const commentWithAuthor = createCommentWithAuthor({}, {}, { replies });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toHaveLength(3);
    expect(result.replies[0].id).toBe('reply-1');
    expect(result.replies[1].id).toBe('reply-2');
    expect(result.replies[2].id).toBe('reply-3');
  });

  it('formats nested replies correctly', () => {
    const nestedReply = createCommentWithAuthor(
      { id: 'nested-reply', content: 'Nested reply content' }
    );
    const reply = createCommentWithAuthor(
      { id: 'reply-1', content: 'Reply content' },
      {},
      { replies: [nestedReply] }
    );
    const commentWithAuthor = createCommentWithAuthor({}, {}, { replies: [reply] });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toHaveLength(1);
    expect(result.replies[0].replies).toHaveLength(1);
    expect(result.replies[0].replies[0].id).toBe('nested-reply');
    expect(result.replies[0].replies[0].content).toBe('Nested reply content');
  });

  it('handles deeply nested replies', () => {
    const level3 = createCommentWithAuthor({ id: 'level-3' });
    const level2 = createCommentWithAuthor({ id: 'level-2' }, {}, { replies: [level3] });
    const level1 = createCommentWithAuthor({ id: 'level-1' }, {}, { replies: [level2] });
    const root = createCommentWithAuthor({ id: 'root' }, {}, { replies: [level1] });

    const result = CommentPresenter.toOutput(root);

    expect(result.id).toBe('root');
    expect(result.replies[0].id).toBe('level-1');
    expect(result.replies[0].replies[0].id).toBe('level-2');
    expect(result.replies[0].replies[0].replies[0].id).toBe('level-3');
  });
});

// ========================================
// Test: isDeleted handling
// ========================================
describe('CommentPresenter isDeleted handling', () => {
  it('shows original content for non-deleted comment', () => {
    const commentWithAuthor = createCommentWithAuthor(
      { content: 'Original content' },
      {},
      { isDeleted: false }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('Original content');
    expect(result.isDeleted).toBe(false);
  });

  it('shows placeholder for deleted comment', () => {
    const commentWithAuthor = createCommentWithAuthor(
      { content: 'Original content' },
      {},
      { isDeleted: true }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('[削除されたコメント]');
    expect(result.isDeleted).toBe(true);
  });

  it('handles deleted reply in replies array', () => {
    const deletedReply = createCommentWithAuthor(
      { id: 'deleted-reply', content: 'Should be hidden' },
      {},
      { isDeleted: true }
    );
    const normalReply = createCommentWithAuthor(
      { id: 'normal-reply', content: 'Visible content' },
      {},
      { isDeleted: false }
    );
    const commentWithAuthor = createCommentWithAuthor(
      {},
      {},
      { replies: [deletedReply, normalReply] }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies[0].content).toBe('[削除されたコメント]');
    expect(result.replies[0].isDeleted).toBe(true);
    expect(result.replies[1].content).toBe('Visible content');
    expect(result.replies[1].isDeleted).toBe(false);
  });

  it('defaults isDeleted to false when not provided', () => {
    const commentWithAuthor: CommentWithAuthor = {
      comment: createMockComment(),
      author: createMockUser(),
      // No isDeleted provided
    };
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.isDeleted).toBe(false);
  });

  it('preserves author info for deleted comment', () => {
    const commentWithAuthor = createCommentWithAuthor(
      {},
      { id: 'author-id', displayName: 'Author Name' },
      { isDeleted: true }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.author.id).toBe('author-id');
    expect(result.author.displayName).toBe('Author Name');
  });

  it('preserves createdAt for deleted comment', () => {
    const date = new Date('2025-06-15T12:30:00.000Z');
    const commentWithAuthor = createCommentWithAuthor(
      { createdAt: date },
      {},
      { isDeleted: true }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.createdAt).toBe('2025-06-15T12:30:00.000Z');
  });
});

// ========================================
// Test: format method
// ========================================
describe('CommentPresenter.format', () => {
  it('returns success response with comment data', () => {
    const commentWithAuthor = createCommentWithAuthor();
    const result = CommentPresenter.format(commentWithAuthor);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes full comment output in data', () => {
    const commentWithAuthor = createCommentWithAuthor({
      id: 'comment-format-123',
      content: 'Format test content',
    });
    const result = CommentPresenter.format(commentWithAuthor);

    expect(result.data.id).toBe('comment-format-123');
    expect(result.data.content).toBe('Format test content');
  });

  it('data structure matches toOutput result', () => {
    const commentWithAuthor = createCommentWithAuthor();
    const formatResult = CommentPresenter.format(commentWithAuthor);
    const toOutputResult = CommentPresenter.toOutput(commentWithAuthor);

    expect(formatResult.data).toEqual(toOutputResult);
  });

  it('includes replies in formatted output', () => {
    const reply = createCommentWithAuthor({ id: 'reply-1' });
    const commentWithAuthor = createCommentWithAuthor({}, {}, { replies: [reply] });
    const result = CommentPresenter.format(commentWithAuthor);

    expect(result.data.replies).toHaveLength(1);
    expect(result.data.replies[0].id).toBe('reply-1');
  });
});

// ========================================
// Test: formatPaginated method
// ========================================
describe('CommentPresenter.formatPaginated', () => {
  let commentsWithAuthors: CommentWithAuthor[];

  beforeEach(() => {
    commentsWithAuthors = [
      createCommentWithAuthor(
        { id: 'comment-1', content: 'Comment One' },
        { id: 'author-1', displayName: 'Author One' }
      ),
      createCommentWithAuthor(
        { id: 'comment-2', content: 'Comment Two' },
        { id: 'author-2', displayName: 'Author Two' }
      ),
      createCommentWithAuthor(
        { id: 'comment-3', content: 'Comment Three' },
        { id: 'author-3', displayName: 'Author Three' }
      ),
    ];
  });

  it('returns success response with paginated data', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 1, 10, 3);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('formats all comments in data array', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 1, 10, 3);

    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe('comment-1');
    expect(result.data[1].id).toBe('comment-2');
    expect(result.data[2].id).toBe('comment-3');
  });

  it('includes correct pagination metadata', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 2, 20, 50);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.total).toBe(50);
  });

  it('calculates hasMore correctly when more pages exist', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 1, 10, 30);

    expect(result.meta.hasMore).toBe(true);
  });

  it('calculates hasMore correctly when no more pages', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 3, 10, 25);

    expect(result.meta.hasMore).toBe(false);
  });

  it('calculates hasMore correctly at exact boundary', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 1, 10, 10);

    expect(result.meta.hasMore).toBe(false);
  });

  it('handles empty comments array', () => {
    const result = CommentPresenter.formatPaginated([], 1, 10, 0);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('data items match toOutput format', () => {
    const result = CommentPresenter.formatPaginated(commentsWithAuthors, 1, 10, 3);

    for (let i = 0; i < commentsWithAuthors.length; i++) {
      const expected = CommentPresenter.toOutput(commentsWithAuthors[i]);
      expect(result.data[i]).toEqual(expected);
    }
  });

  it('handles comments with replies in paginated response', () => {
    const reply = createCommentWithAuthor({ id: 'reply-1' });
    const commentWithReply = createCommentWithAuthor(
      { id: 'parent-comment' },
      {},
      { replies: [reply] }
    );
    const result = CommentPresenter.formatPaginated([commentWithReply], 1, 10, 1);

    expect(result.data[0].replies).toHaveLength(1);
    expect(result.data[0].replies[0].id).toBe('reply-1');
  });

  it('handles deleted comments in paginated response', () => {
    const deletedComment = createCommentWithAuthor(
      { id: 'deleted-comment', content: 'Original content' },
      {},
      { isDeleted: true }
    );
    const result = CommentPresenter.formatPaginated([deletedComment], 1, 10, 1);

    expect(result.data[0].content).toBe('[削除されたコメント]');
    expect(result.data[0].isDeleted).toBe(true);
  });
});

// ========================================
// Edge Cases
// ========================================
describe('CommentPresenter edge cases', () => {
  it('handles comment with special characters in content', () => {
    const commentWithAuthor = createCommentWithAuthor({
      content: 'Test <comment> & "special" characters',
    });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('Test <comment> & "special" characters');
  });

  it('handles comment with unicode content', () => {
    const commentWithAuthor = createCommentWithAuthor({
      content: '日本語コメント with emoji',
    });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('日本語コメント with emoji');
  });

  it('handles comment with very long content', () => {
    const longContent = 'A'.repeat(1000);
    const commentWithAuthor = createCommentWithAuthor({ content: longContent });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe(longContent);
    expect(result.content.length).toBe(1000);
  });

  it('handles comment with newlines in content', () => {
    const commentWithAuthor = createCommentWithAuthor({
      content: 'Line 1\nLine 2\nLine 3',
    });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.content).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles many replies', () => {
    const replies = Array.from({ length: 50 }, (_, i) =>
      createCommentWithAuthor({ id: `reply-${i}` })
    );
    const commentWithAuthor = createCommentWithAuthor({}, {}, { replies });
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toHaveLength(50);
  });

  it('defaults replies to empty array when not provided', () => {
    const commentWithAuthor: CommentWithAuthor = {
      comment: createMockComment(),
      author: createMockUser(),
      // No replies provided
    };
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.replies).toEqual([]);
  });

  it('handles author with all badges', () => {
    const commentWithAuthor = createCommentWithAuthor(
      {},
      {
        isEmailVerified: true,
        isPhoneVerified: true,
        linkedSns: ['twitter'],
      }
    );
    const result = CommentPresenter.toOutput(commentWithAuthor);

    expect(result.author.badges).toContain('email_verified');
    expect(result.author.badges).toContain('phone_verified');
    expect(result.author.badges).toContain('sns_linked');
  });
});
