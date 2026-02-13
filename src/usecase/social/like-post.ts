/**
 * LikePost Usecase
 *
 * Allows a user to like a post. This operation is idempotent -
 * liking an already-liked post has no effect.
 *
 * Business Rules:
 * - User can like any public/unlisted post
 * - Liking increments the post's likeCount
 * - Notification is sent to post author (unless self-like)
 * - Operation is idempotent (no error on duplicate like)
 */

import { Like } from '../../domain/entities/like.js';
import type { LikeRepositoryPort, PostRepositoryPort } from '../ports/repository-ports.js';
import type { NotificationPort } from '../ports/gateway-ports.js';

/**
 * Input for LikePost usecase
 */
export interface LikePostInput {
  readonly postId: string;
  readonly userId: string;
}

/**
 * Custom error for LikePost usecase
 */
export class LikePostError extends Error {
  public override readonly name = 'LikePostError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, LikePostError.prototype);
  }
}

/**
 * LikePost Usecase
 *
 * Handles liking a post. Uses private constructor pattern.
 */
export class LikePost {
  private readonly _likeRepository: LikeRepositoryPort;
  private readonly _postRepository: PostRepositoryPort;
  private readonly _notificationPort: NotificationPort;

  /**
   * Private constructor - use static factory method
   */
  private constructor(
    likeRepository: LikeRepositoryPort,
    postRepository: PostRepositoryPort,
    notificationPort: NotificationPort
  ) {
    this._likeRepository = likeRepository;
    this._postRepository = postRepository;
    this._notificationPort = notificationPort;

    Object.freeze(this);
  }

  /**
   * Factory method to create LikePost instance
   */
  public static create(
    likeRepository: LikeRepositoryPort,
    postRepository: PostRepositoryPort,
    notificationPort: NotificationPort
  ): LikePost {
    return new LikePost(likeRepository, postRepository, notificationPort);
  }

  /**
   * Execute the usecase
   *
   * @param input - postId and userId
   * @throws LikePostError if validation fails or post not found
   */
  public async execute(input: LikePostInput): Promise<void> {
    // Validate input
    this.validateInput(input);

    const { postId, userId } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new LikePostError('Post not found');
    }

    // Check if already liked (idempotent)
    const existingLike = await this._likeRepository.findByPostAndUser(postId, userId);
    if (existingLike) {
      // Already liked - do nothing (idempotent)
      return;
    }

    // Create the like
    const like = Like.create({
      id: this.generateLikeId(postId, userId),
      postId,
      userId,
      createdAt: new Date(),
    });

    // Save the like
    await this._likeRepository.save(like);

    // Increment post like count
    const updatedPost = post.incrementLikeCount();
    await this._postRepository.save(updatedPost);

    // Send notification (unless self-like)
    if (post.authorId !== userId) {
      await this._notificationPort.notify(post.authorId, {
        type: 'like',
        title: 'New like',
        body: `Someone liked your post "${post.title}"`,
        actionUrl: `/posts/${postId}`,
        metadata: { postId, userId },
      });
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: LikePostInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new LikePostError('postId cannot be empty');
    }
    if (!input.userId || input.userId.trim().length === 0) {
      throw new LikePostError('userId cannot be empty');
    }
  }

  /**
   * Generate a unique like ID
   */
  private generateLikeId(postId: string, userId: string): string {
    return `like-${postId}-${userId}-${Date.now()}`;
  }
}
