/**
 * User Presenter
 *
 * Formats user entities for API responses.
 */

import type { User } from '../../domain/entities/user.js';
import type {
  SuccessResponse,
  PaginatedResponse,
  UserOutput,
  UserSummaryOutput,
} from './types.js';

export class UserPresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a user for full output
   */
  public static toOutput(user: User): UserOutput {
    return {
      id: user.id,
      displayName: user.displayName,
      accountLevel: user.accountLevel.value,
      badges: this.deriveBadges(user),
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      postCount: user.pinnedPostIds.length, // Approximate
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Format a user for summary output (embedded in posts, comments, etc.)
   */
  public static toSummary(user: User): UserSummaryOutput {
    return {
      id: user.id,
      displayName: user.displayName,
      accountLevel: user.accountLevel.value,
      badges: this.deriveBadges(user),
    };
  }

  /**
   * Derive badges from user properties
   */
  private static deriveBadges(user: User): readonly string[] {
    const badges: string[] = [];

    if (user.isEmailVerified) {
      badges.push('email_verified');
    }
    if (user.isPhoneVerified) {
      badges.push('phone_verified');
    }
    if (user.linkedSns.length > 0) {
      badges.push('sns_linked');
    }

    return badges;
  }

  /**
   * Format a single user response
   */
  public static format(user: User): SuccessResponse<UserOutput> {
    return {
      success: true,
      data: this.toOutput(user),
    };
  }

  /**
   * Format a paginated users response
   */
  public static formatPaginated(
    users: readonly User[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<UserOutput> {
    return {
      success: true,
      data: users.map((user) => this.toOutput(user)),
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }
}
