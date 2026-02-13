/**
 * InMemory Follow Repository
 *
 * In-memory implementation of FollowRepositoryPort for testing and development.
 */

import type { Follow } from '../../../domain/entities/follow.js';
import type { FollowRepositoryPort } from '../../../usecase/ports/repository-ports.js';

export class InMemoryFollowRepository implements FollowRepositoryPort {
  private readonly _follows = new Map<string, Follow>(); // `${followerId}:${followeeId}` -> Follow
  private readonly _followersIndex = new Map<string, Set<string>>(); // followeeId -> followerIds
  private readonly _followingIndex = new Map<string, Set<string>>(); // followerId -> followeeIds

  /**
   * Clear all stored follows (for test reset)
   */
  public clear(): void {
    this._follows.clear();
    this._followersIndex.clear();
    this._followingIndex.clear();
  }

  /**
   * Get all stored follows (for test verification)
   */
  public getAll(): Follow[] {
    return Array.from(this._follows.values());
  }

  private makeKey(followerId: string, followeeId: string): string {
    return `${followerId}:${followeeId}`;
  }

  public async findByFollowerAndFollowee(
    followerId: string,
    followeeId: string
  ): Promise<Follow | null> {
    const key = this.makeKey(followerId, followeeId);
    return this._follows.get(key) ?? null;
  }

  public async findFollowers(userId: string): Promise<Follow[]> {
    const followerIds = this._followersIndex.get(userId);
    if (!followerIds) {
      return [];
    }

    return Array.from(followerIds)
      .map((followerId) => this._follows.get(this.makeKey(followerId, userId)))
      .filter((follow): follow is Follow => follow !== undefined);
  }

  public async findFollowing(userId: string): Promise<Follow[]> {
    const followeeIds = this._followingIndex.get(userId);
    if (!followeeIds) {
      return [];
    }

    return Array.from(followeeIds)
      .map((followeeId) => this._follows.get(this.makeKey(userId, followeeId)))
      .filter((follow): follow is Follow => follow !== undefined);
  }

  public async save(follow: Follow): Promise<Follow> {
    const key = this.makeKey(follow.followerId, follow.followeeId);

    // Update followers index (followee's followers)
    let followers = this._followersIndex.get(follow.followeeId);
    if (!followers) {
      followers = new Set();
      this._followersIndex.set(follow.followeeId, followers);
    }
    followers.add(follow.followerId);

    // Update following index (follower's following)
    let following = this._followingIndex.get(follow.followerId);
    if (!following) {
      following = new Set();
      this._followingIndex.set(follow.followerId, following);
    }
    following.add(follow.followeeId);

    // Save follow
    this._follows.set(key, follow);

    return follow;
  }

  public async delete(followerId: string, followeeId: string): Promise<void> {
    const key = this.makeKey(followerId, followeeId);

    // Remove from followers index
    const followers = this._followersIndex.get(followeeId);
    if (followers) {
      followers.delete(followerId);
      if (followers.size === 0) {
        this._followersIndex.delete(followeeId);
      }
    }

    // Remove from following index
    const following = this._followingIndex.get(followerId);
    if (following) {
      following.delete(followeeId);
      if (following.size === 0) {
        this._followingIndex.delete(followerId);
      }
    }

    // Delete follow
    this._follows.delete(key);
  }
}
