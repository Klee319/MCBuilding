/**
 * InMemory Like Repository
 *
 * In-memory implementation of LikeRepositoryPort for testing and development.
 */

import type { Like } from '../../../domain/entities/like.js';
import type { LikeRepositoryPort } from '../../../usecase/ports/repository-ports.js';

export class InMemoryLikeRepository implements LikeRepositoryPort {
  private readonly _likes = new Map<string, Like>(); // `${postId}:${userId}` -> Like
  private readonly _postIndex = new Map<string, Set<string>>(); // postId -> userIds
  private readonly _userIndex = new Map<string, Set<string>>(); // userId -> postIds

  /**
   * Clear all stored likes (for test reset)
   */
  public clear(): void {
    this._likes.clear();
    this._postIndex.clear();
    this._userIndex.clear();
  }

  /**
   * Get all stored likes (for test verification)
   */
  public getAll(): Like[] {
    return Array.from(this._likes.values());
  }

  private makeKey(postId: string, userId: string): string {
    return `${postId}:${userId}`;
  }

  public async findByPostAndUser(
    postId: string,
    userId: string
  ): Promise<Like | null> {
    const key = this.makeKey(postId, userId);
    return this._likes.get(key) ?? null;
  }

  public async findByPost(postId: string): Promise<Like[]> {
    const userIds = this._postIndex.get(postId);
    if (!userIds) {
      return [];
    }

    return Array.from(userIds)
      .map((userId) => this._likes.get(this.makeKey(postId, userId)))
      .filter((like): like is Like => like !== undefined);
  }

  public async findByUser(userId: string): Promise<Like[]> {
    const postIds = this._userIndex.get(userId);
    if (!postIds) {
      return [];
    }

    return Array.from(postIds)
      .map((postId) => this._likes.get(this.makeKey(postId, userId)))
      .filter((like): like is Like => like !== undefined);
  }

  public async save(like: Like): Promise<Like> {
    const key = this.makeKey(like.postId, like.userId);

    // Update post index
    let postUsers = this._postIndex.get(like.postId);
    if (!postUsers) {
      postUsers = new Set();
      this._postIndex.set(like.postId, postUsers);
    }
    postUsers.add(like.userId);

    // Update user index
    let userPosts = this._userIndex.get(like.userId);
    if (!userPosts) {
      userPosts = new Set();
      this._userIndex.set(like.userId, userPosts);
    }
    userPosts.add(like.postId);

    // Save like
    this._likes.set(key, like);

    return like;
  }

  public async delete(postId: string, userId: string): Promise<void> {
    const key = this.makeKey(postId, userId);

    // Remove from indices
    const postUsers = this._postIndex.get(postId);
    if (postUsers) {
      postUsers.delete(userId);
      if (postUsers.size === 0) {
        this._postIndex.delete(postId);
      }
    }

    const userPosts = this._userIndex.get(userId);
    if (userPosts) {
      userPosts.delete(postId);
      if (userPosts.size === 0) {
        this._userIndex.delete(userId);
      }
    }

    // Delete like
    this._likes.delete(key);
  }
}
