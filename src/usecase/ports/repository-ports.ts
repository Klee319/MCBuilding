/**
 * Repository Ports - Data Persistence Interfaces
 *
 * These interfaces define the contract for data persistence operations.
 * Implementations are provided by the Infrastructure layer.
 *
 * Based on docs/contracts/ports.md
 */

import type { Structure } from '../../domain/entities/structure.js';
import type { Post } from '../../domain/entities/post.js';
import type { User } from '../../domain/entities/user.js';
import type { Comment } from '../../domain/entities/comment.js';
import type { Like } from '../../domain/entities/like.js';
import type { Follow } from '../../domain/entities/follow.js';
import type { Notification } from '../../domain/entities/notification.js';
import type { Edition } from '../../domain/value-objects/edition.js';
import type { Version } from '../../domain/value-objects/version.js';
import type { PaginatedResult, PostQuery } from './types.js';

// ========================================
// Structure Repository Port
// ========================================

/**
 * Repository port for Structure entity persistence
 *
 * Handles storage and retrieval of building structure metadata.
 * The actual binary data is stored in the storage gateway.
 */
export interface StructureRepositoryPort {
  /**
   * Find a structure by its ID
   *
   * @param id - Structure ID
   * @returns Structure if found, null otherwise
   */
  findById(id: string): Promise<Structure | null>;

  /**
   * Save a structure (create or update)
   *
   * @param structure - Structure entity to save
   * @returns Saved structure
   * @throws PortError with code 'STORAGE_ERROR' if save fails
   */
  save(structure: Structure): Promise<Structure>;

  /**
   * Delete a structure by ID
   *
   * @param id - Structure ID to delete
   * @throws PortError with code 'NOT_FOUND' if structure doesn't exist
   */
  delete(id: string): Promise<void>;

  /**
   * Get signed download URL for a structure
   *
   * @param id - Structure ID
   * @param edition - Target edition for download
   * @param version - Target version for download
   * @returns Signed download URL (expires in limited time)
   * @throws PortError with code 'NOT_FOUND' if structure/edition/version not found
   * @throws PortError with code 'VERSION_NOT_SUPPORTED' if version < 1.12
   */
  getDownloadUrl(id: string, edition: Edition, version: Version): Promise<string>;
}

// ========================================
// Post Repository Port
// ========================================

/**
 * Repository port for Post entity persistence
 *
 * Handles storage and retrieval of posts (shared structures).
 */
export interface PostRepositoryPort {
  /**
   * Find a post by its ID
   *
   * @param id - Post ID
   * @returns Post if found, null otherwise
   */
  findById(id: string): Promise<Post | null>;

  /**
   * Find a post by its unlisted URL token
   *
   * @param unlistedUrl - Unlisted URL token
   * @returns Post if found and URL is valid, null otherwise
   */
  findByUnlistedUrl(unlistedUrl: string): Promise<Post | null>;

  /**
   * Search posts with filters and pagination
   *
   * @param query - Search query parameters
   * @returns Paginated list of posts
   */
  search(query: PostQuery): Promise<PaginatedResult<Post>>;

  /**
   * Find posts by author
   *
   * @param authorId - Author's user ID
   * @param includePrivate - Include private posts (only for author themselves)
   * @returns List of posts by the author
   */
  findByAuthor(authorId: string, includePrivate?: boolean): Promise<Post[]>;

  /**
   * Save a post (create or update)
   *
   * @param post - Post entity to save
   * @returns Saved post
   */
  save(post: Post): Promise<Post>;

  /**
   * Delete a post by ID
   *
   * @param id - Post ID to delete
   * @throws PortError with code 'NOT_FOUND' if post doesn't exist
   */
  delete(id: string): Promise<void>;

  /**
   * Increment download count atomically
   *
   * @param id - Post ID
   */
  incrementDownloadCount(id: string): Promise<void>;
}

// ========================================
// User Repository Port
// ========================================

/**
 * Repository port for User entity persistence
 *
 * Handles storage and retrieval of user accounts.
 */
export interface UserRepositoryPort {
  /**
   * Find a user by their ID
   *
   * @param id - User ID
   * @returns User if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by their email address
   *
   * @param email - Email address (case-insensitive)
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Save a user (create or update)
   *
   * @param user - User entity to save
   * @returns Saved user
   * @throws PortError with code 'DUPLICATE_EMAIL' if email already exists
   */
  save(user: User): Promise<User>;

  /**
   * Delete a user and all related data
   *
   * This is a cascading delete that removes:
   * - User's posts
   * - User's comments
   * - User's likes
   * - User's follows
   * - User's notifications
   *
   * @param id - User ID to delete
   * @throws PortError with code 'NOT_FOUND' if user doesn't exist
   */
  delete(id: string): Promise<void>;
}

// ========================================
// Comment Repository Port
// ========================================

/**
 * Repository port for Comment entity persistence
 *
 * Handles storage and retrieval of comments with thread structure.
 */
export interface CommentRepositoryPort {
  /**
   * Find a comment by its ID
   *
   * @param id - Comment ID
   * @returns Comment if found, null otherwise
   */
  findById(id: string): Promise<Comment | null>;

  /**
   * Find all comments for a post (including replies in tree structure)
   *
   * Returns comments in a flat list but with parentCommentId
   * set appropriately for building a tree structure.
   *
   * @param postId - Post ID
   * @returns List of comments ordered for tree display
   */
  findByPost(postId: string): Promise<Comment[]>;

  /**
   * Save a comment (create or update)
   *
   * @param comment - Comment entity to save
   * @returns Saved comment
   */
  save(comment: Comment): Promise<Comment>;

  /**
   * Soft delete a comment
   *
   * The comment content is replaced with "[削除済み]" but the
   * comment record is preserved to maintain reply threads.
   *
   * @param id - Comment ID to soft delete
   * @throws PortError with code 'NOT_FOUND' if comment doesn't exist
   */
  softDelete(id: string): Promise<void>;
}

// ========================================
// Like Repository Port
// ========================================

/**
 * Repository port for Like entity persistence
 *
 * Handles storage and retrieval of post likes.
 */
export interface LikeRepositoryPort {
  /**
   * Find a like by post ID and user ID
   *
   * @param postId - Post ID
   * @param userId - User ID
   * @returns Like if found, null otherwise
   */
  findByPostAndUser(postId: string, userId: string): Promise<Like | null>;

  /**
   * Find all likes for a post
   *
   * @param postId - Post ID
   * @returns List of likes for the post
   */
  findByPost(postId: string): Promise<Like[]>;

  /**
   * Find all likes by a user
   *
   * @param userId - User ID
   * @returns List of likes by the user
   */
  findByUser(userId: string): Promise<Like[]>;

  /**
   * Save a like
   *
   * @param like - Like entity to save
   * @returns Saved like
   */
  save(like: Like): Promise<Like>;

  /**
   * Delete a like
   *
   * @param postId - Post ID
   * @param userId - User ID
   */
  delete(postId: string, userId: string): Promise<void>;
}

// ========================================
// Follow Repository Port
// ========================================

/**
 * Repository port for Follow entity persistence
 *
 * Handles storage and retrieval of user follow relationships.
 */
export interface FollowRepositoryPort {
  /**
   * Find a follow relationship
   *
   * @param followerId - Follower user ID
   * @param followeeId - Followee user ID
   * @returns Follow if found, null otherwise
   */
  findByFollowerAndFollowee(followerId: string, followeeId: string): Promise<Follow | null>;

  /**
   * Find all followers of a user
   *
   * @param userId - User ID
   * @returns List of follow entities where userId is the followee
   */
  findFollowers(userId: string): Promise<Follow[]>;

  /**
   * Find all users a user is following
   *
   * @param userId - User ID
   * @returns List of follow entities where userId is the follower
   */
  findFollowing(userId: string): Promise<Follow[]>;

  /**
   * Save a follow relationship
   *
   * @param follow - Follow entity to save
   * @returns Saved follow
   */
  save(follow: Follow): Promise<Follow>;

  /**
   * Delete a follow relationship
   *
   * @param followerId - Follower user ID
   * @param followeeId - Followee user ID
   */
  delete(followerId: string, followeeId: string): Promise<void>;
}

// ========================================
// Notification Repository Port
// ========================================

/**
 * Options for fetching notifications
 */
export interface NotificationQueryOptions {
  /** Include read notifications (default: false) */
  readonly includeRead?: boolean;
  /** Page number (1-based) */
  readonly page?: number;
  /** Items per page */
  readonly limit?: number;
}

/**
 * Repository port for Notification entity persistence
 *
 * Handles storage and retrieval of user notifications.
 */
export interface NotificationRepositoryPort {
  /**
   * Find a notification by ID
   *
   * @param id - Notification ID
   * @returns Notification if found, null otherwise
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Find notifications for a user
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Paginated list of notifications
   */
  findByUser(userId: string, options?: NotificationQueryOptions): Promise<PaginatedResult<Notification>>;

  /**
   * Save a notification
   *
   * @param notification - Notification entity to save
   * @returns Saved notification
   */
  save(notification: Notification): Promise<Notification>;

  /**
   * Mark a notification as read
   *
   * @param id - Notification ID
   * @throws PortError with code 'NOT_FOUND' if notification doesn't exist
   */
  markAsRead(id: string): Promise<void>;

  /**
   * Mark all notifications for a user as read
   *
   * @param userId - User ID
   */
  markAllAsRead(userId: string): Promise<void>;
}

// ========================================
// User Credential Repository Port
// ========================================

/**
 * User with credentials for authentication
 */
export interface UserWithCredentials {
  readonly user: User;
  readonly passwordHash: string;
}

/**
 * Repository port for user credential operations
 *
 * Handles retrieval of user credentials for authentication.
 * Separated from UserRepositoryPort for security concerns.
 */
export interface UserCredentialRepositoryPort {
  /**
   * Find a user with credentials by email address
   *
   * @param email - Email address (case-insensitive)
   * @returns User with password hash if found, null otherwise
   */
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;

  /**
   * Save credentials for a user
   *
   * @param userId - User ID
   * @param passwordHash - Hashed password
   */
  saveCredentials(userId: string, passwordHash: string): Promise<void>;
}
