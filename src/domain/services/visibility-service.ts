/**
 * VisibilityService Domain Service
 *
 * Determines access permissions based on post visibility settings.
 * This is a stateless domain service following DDD principles.
 *
 * Business Rules:
 * - canView:
 *   - public: anyone can view
 *   - private: only post author can view
 *   - unlisted: post author OR valid token holder can view
 * - canDownload:
 *   - canView() must be true
 *   - viewer.canDownload() must be true (registered or above)
 *
 * @example
 * const service = new VisibilityService();
 * const canView = service.canView(post, viewerId, unlistedToken);
 * const canDownload = service.canDownload(post, viewer, unlistedToken);
 */

import { Post } from '../entities/post.js';
import { User } from '../entities/user.js';

/**
 * VisibilityService Domain Service
 *
 * Stateless domain service for determining access permissions.
 */
export class VisibilityService {
  /**
   * Determines if a viewer can view the post
   *
   * Access rules by visibility:
   * - public: anyone can view (including anonymous)
   * - private: only the post author can view
   * - unlisted: post author OR anyone with valid token can view
   *
   * @param post - The post to check access for
   * @param viewerId - The viewer's user ID (null for anonymous)
   * @param unlistedToken - Optional token for unlisted posts (from URL)
   * @returns true if the viewer can view the post
   */
  public canView(
    post: Post,
    viewerId: string | null,
    unlistedToken?: string
  ): boolean {
    // Check if viewer is the post author
    const isAuthor = viewerId !== null && viewerId === post.authorId;

    // Author can always view their own posts
    if (isAuthor) {
      return true;
    }

    // Public posts: anyone can view
    if (post.isPublic()) {
      return true;
    }

    // Private posts: only author can view (handled above)
    if (post.isPrivate()) {
      return false;
    }

    // Unlisted posts: require valid token
    if (post.isUnlisted()) {
      return this.isValidUnlistedToken(post, unlistedToken);
    }

    // Default deny (should not reach here)
    return false;
  }

  /**
   * Determines if a viewer can download the post's content
   *
   * Requirements:
   * 1. canView() must return true
   * 2. viewer must exist (not anonymous)
   * 3. viewer.canDownload() must return true (registered level or above)
   *
   * @param post - The post to check download access for
   * @param viewer - The viewer (null for anonymous)
   * @param unlistedToken - Optional token for unlisted posts
   * @returns true if the viewer can download
   */
  public canDownload(
    post: Post,
    viewer: User | null,
    unlistedToken?: string
  ): boolean {
    // Anonymous users cannot download
    if (viewer === null) {
      return false;
    }

    // Check if viewer can view the post first
    const viewerId = viewer.id;
    if (!this.canView(post, viewerId, unlistedToken)) {
      return false;
    }

    // Check if viewer has download permission (registered or above)
    return viewer.canDownload();
  }

  /**
   * Validates an unlisted token against the post's unlisted URL
   *
   * @param post - The post with unlisted visibility
   * @param token - The token to validate
   * @returns true if the token is valid
   */
  private isValidUnlistedToken(post: Post, token?: string): boolean {
    // No token provided
    if (token === undefined || token === '') {
      return false;
    }

    // Post must have an unlisted URL
    const unlistedUrl = post.unlistedUrl;
    if (unlistedUrl === null) {
      return false;
    }

    // Token must match
    return token === unlistedUrl.token;
  }
}
