/**
 * User Presenter Unit Tests
 *
 * TDD tests for UserPresenter class.
 * Tests user entity formatting for API responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserPresenter } from '../../../../src/interface/presenters/user-presenter.js';
import { User } from '../../../../src/domain/entities/user.js';
import { Email } from '../../../../src/domain/value-objects/email.js';
import { AccountLevel } from '../../../../src/domain/value-objects/account-level.js';

// ========================================
// Mock Data Factory
// ========================================
function createMockUser(overrides: Partial<{
  id: string;
  displayName: string;
  email: Email;
  accountLevel: AccountLevel;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  linkedSns: readonly string[];
  pinnedPostIds: readonly string[];
  followerCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}> = {}): User {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return User.create({
    id: overrides.id ?? 'user-123',
    displayName: overrides.displayName ?? 'Test User',
    email: overrides.email ?? Email.create('test@example.com'),
    accountLevel: overrides.accountLevel ?? AccountLevel.registered(),
    isEmailVerified: overrides.isEmailVerified ?? false,
    isPhoneVerified: overrides.isPhoneVerified ?? false,
    linkedSns: overrides.linkedSns ?? [],
    pinnedPostIds: overrides.pinnedPostIds ?? [],
    followerCount: overrides.followerCount ?? 0,
    followingCount: overrides.followingCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  });
}

// ========================================
// Test: toOutput method
// ========================================
describe('UserPresenter.toOutput', () => {
  it('returns correct user output structure', () => {
    const user = createMockUser();
    const result = UserPresenter.toOutput(user);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('displayName');
    expect(result).toHaveProperty('accountLevel');
    expect(result).toHaveProperty('badges');
    expect(result).toHaveProperty('followerCount');
    expect(result).toHaveProperty('followingCount');
    expect(result).toHaveProperty('postCount');
    expect(result).toHaveProperty('createdAt');
  });

  it('formats user id correctly', () => {
    const user = createMockUser({ id: 'user-abc-123' });
    const result = UserPresenter.toOutput(user);

    expect(result.id).toBe('user-abc-123');
  });

  it('formats displayName correctly', () => {
    const user = createMockUser({ displayName: 'John Doe' });
    const result = UserPresenter.toOutput(user);

    expect(result.displayName).toBe('John Doe');
  });

  it('formats accountLevel as string value', () => {
    const user = createMockUser({ accountLevel: AccountLevel.verified() });
    const result = UserPresenter.toOutput(user);

    expect(result.accountLevel).toBe('verified');
  });

  it('formats followerCount correctly', () => {
    const user = createMockUser({ followerCount: 100 });
    const result = UserPresenter.toOutput(user);

    expect(result.followerCount).toBe(100);
  });

  it('formats followingCount correctly', () => {
    const user = createMockUser({ followingCount: 50 });
    const result = UserPresenter.toOutput(user);

    expect(result.followingCount).toBe(50);
  });

  it('calculates postCount from pinnedPostIds length', () => {
    const user = createMockUser({ pinnedPostIds: ['post-1', 'post-2', 'post-3'] });
    const result = UserPresenter.toOutput(user);

    expect(result.postCount).toBe(3);
  });

  it('formats createdAt as ISO string', () => {
    const date = new Date('2025-06-15T12:30:00.000Z');
    const user = createMockUser({ createdAt: date, updatedAt: date });
    const result = UserPresenter.toOutput(user);

    expect(result.createdAt).toBe('2025-06-15T12:30:00.000Z');
  });

  it('handles all account levels', () => {
    const levels = [
      { level: AccountLevel.guest(), expected: 'guest' },
      { level: AccountLevel.registered(), expected: 'registered' },
      { level: AccountLevel.verified(), expected: 'verified' },
      { level: AccountLevel.premium(), expected: 'premium' },
    ];

    for (const { level, expected } of levels) {
      const user = createMockUser({ accountLevel: level });
      const result = UserPresenter.toOutput(user);
      expect(result.accountLevel).toBe(expected);
    }
  });
});

// ========================================
// Test: toSummary method
// ========================================
describe('UserPresenter.toSummary', () => {
  it('returns correct user summary structure', () => {
    const user = createMockUser();
    const result = UserPresenter.toSummary(user);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('displayName');
    expect(result).toHaveProperty('accountLevel');
    expect(result).toHaveProperty('badges');
  });

  it('does not include full user data in summary', () => {
    const user = createMockUser();
    const result = UserPresenter.toSummary(user);

    expect(result).not.toHaveProperty('followerCount');
    expect(result).not.toHaveProperty('followingCount');
    expect(result).not.toHaveProperty('postCount');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('formats user id correctly', () => {
    const user = createMockUser({ id: 'user-summary-456' });
    const result = UserPresenter.toSummary(user);

    expect(result.id).toBe('user-summary-456');
  });

  it('formats displayName correctly', () => {
    const user = createMockUser({ displayName: 'Summary User' });
    const result = UserPresenter.toSummary(user);

    expect(result.displayName).toBe('Summary User');
  });

  it('formats accountLevel as string value', () => {
    const user = createMockUser({ accountLevel: AccountLevel.premium() });
    const result = UserPresenter.toSummary(user);

    expect(result.accountLevel).toBe('premium');
  });

  it('includes badges array', () => {
    const user = createMockUser({ isEmailVerified: true });
    const result = UserPresenter.toSummary(user);

    expect(Array.isArray(result.badges)).toBe(true);
    expect(result.badges).toContain('email_verified');
  });
});

// ========================================
// Test: deriveBadges (private method tested via toOutput/toSummary)
// ========================================
describe('UserPresenter badges derivation', () => {
  it('returns empty badges when no verifications', () => {
    const user = createMockUser({
      isEmailVerified: false,
      isPhoneVerified: false,
      linkedSns: [],
    });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toEqual([]);
  });

  it('includes email_verified badge when email is verified', () => {
    const user = createMockUser({ isEmailVerified: true });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toContain('email_verified');
  });

  it('includes phone_verified badge when phone is verified', () => {
    const user = createMockUser({ isPhoneVerified: true });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toContain('phone_verified');
  });

  it('includes sns_linked badge when SNS is linked', () => {
    const user = createMockUser({ linkedSns: ['twitter'] });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toContain('sns_linked');
  });

  it('includes multiple badges when multiple verifications', () => {
    const user = createMockUser({
      isEmailVerified: true,
      isPhoneVerified: true,
      linkedSns: ['twitter', 'google'],
    });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toContain('email_verified');
    expect(result.badges).toContain('phone_verified');
    expect(result.badges).toContain('sns_linked');
    expect(result.badges).toHaveLength(3);
  });

  it('badges order is consistent: email_verified, phone_verified, sns_linked', () => {
    const user = createMockUser({
      isEmailVerified: true,
      isPhoneVerified: true,
      linkedSns: ['twitter'],
    });
    const result = UserPresenter.toOutput(user);

    expect(result.badges[0]).toBe('email_verified');
    expect(result.badges[1]).toBe('phone_verified');
    expect(result.badges[2]).toBe('sns_linked');
  });
});

// ========================================
// Test: format method
// ========================================
describe('UserPresenter.format', () => {
  it('returns success response with user data', () => {
    const user = createMockUser();
    const result = UserPresenter.format(user);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('includes full user output in data', () => {
    const user = createMockUser({
      id: 'user-format-789',
      displayName: 'Format Test',
    });
    const result = UserPresenter.format(user);

    expect(result.data.id).toBe('user-format-789');
    expect(result.data.displayName).toBe('Format Test');
  });

  it('data structure matches toOutput result', () => {
    const user = createMockUser();
    const formatResult = UserPresenter.format(user);
    const toOutputResult = UserPresenter.toOutput(user);

    expect(formatResult.data).toEqual(toOutputResult);
  });
});

// ========================================
// Test: formatPaginated method
// ========================================
describe('UserPresenter.formatPaginated', () => {
  let users: User[];

  beforeEach(() => {
    users = [
      createMockUser({ id: 'user-1', displayName: 'User One' }),
      createMockUser({ id: 'user-2', displayName: 'User Two' }),
      createMockUser({ id: 'user-3', displayName: 'User Three' }),
    ];
  });

  it('returns success response with paginated data', () => {
    const result = UserPresenter.formatPaginated(users, 1, 10, 3);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('formats all users in data array', () => {
    const result = UserPresenter.formatPaginated(users, 1, 10, 3);

    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe('user-1');
    expect(result.data[1].id).toBe('user-2');
    expect(result.data[2].id).toBe('user-3');
  });

  it('includes correct pagination metadata', () => {
    const result = UserPresenter.formatPaginated(users, 2, 10, 30);

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.total).toBe(30);
  });

  it('calculates hasMore correctly when more pages exist', () => {
    const result = UserPresenter.formatPaginated(users, 1, 10, 30);

    expect(result.meta.hasMore).toBe(true);
  });

  it('calculates hasMore correctly when no more pages', () => {
    const result = UserPresenter.formatPaginated(users, 3, 10, 25);

    expect(result.meta.hasMore).toBe(false);
  });

  it('calculates hasMore correctly at exact boundary', () => {
    const result = UserPresenter.formatPaginated(users, 1, 10, 10);

    expect(result.meta.hasMore).toBe(false);
  });

  it('handles empty users array', () => {
    const result = UserPresenter.formatPaginated([], 1, 10, 0);

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });

  it('data items match toOutput format', () => {
    const result = UserPresenter.formatPaginated(users, 1, 10, 3);

    for (let i = 0; i < users.length; i++) {
      const expected = UserPresenter.toOutput(users[i]);
      expect(result.data[i]).toEqual(expected);
    }
  });

  it('handles single user correctly', () => {
    const singleUser = [createMockUser({ id: 'single-user' })];
    const result = UserPresenter.formatPaginated(singleUser, 1, 10, 1);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('single-user');
    expect(result.meta.total).toBe(1);
  });
});

// ========================================
// Edge Cases
// ========================================
describe('UserPresenter edge cases', () => {
  it('handles user with zero followers and following', () => {
    const user = createMockUser({
      followerCount: 0,
      followingCount: 0,
    });
    const result = UserPresenter.toOutput(user);

    expect(result.followerCount).toBe(0);
    expect(result.followingCount).toBe(0);
  });

  it('handles user with large follower counts', () => {
    const user = createMockUser({
      followerCount: 1000000,
      followingCount: 500000,
    });
    const result = UserPresenter.toOutput(user);

    expect(result.followerCount).toBe(1000000);
    expect(result.followingCount).toBe(500000);
  });

  it('handles user with empty pinned posts', () => {
    const user = createMockUser({ pinnedPostIds: [] });
    const result = UserPresenter.toOutput(user);

    expect(result.postCount).toBe(0);
  });

  it('handles user with max pinned posts (5)', () => {
    const user = createMockUser({
      pinnedPostIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
    });
    const result = UserPresenter.toOutput(user);

    expect(result.postCount).toBe(5);
  });

  it('handles user with special characters in displayName', () => {
    const user = createMockUser({ displayName: 'Test <User> & "Name"' });
    const result = UserPresenter.toOutput(user);

    expect(result.displayName).toBe('Test <User> & "Name"');
  });

  it('handles user with unicode displayName', () => {
    const user = createMockUser({ displayName: '日本語ユーザー名' });
    const result = UserPresenter.toOutput(user);

    expect(result.displayName).toBe('日本語ユーザー名');
  });

  it('handles user with multiple SNS linked', () => {
    const user = createMockUser({
      linkedSns: ['twitter', 'google', 'facebook'],
    });
    const result = UserPresenter.toOutput(user);

    expect(result.badges).toContain('sns_linked');
    // Should only have one sns_linked badge regardless of count
    expect(result.badges.filter(b => b === 'sns_linked')).toHaveLength(1);
  });
});
