/**
 * UnlikePost Usecase
 *
 * Allows a user to unlike a post. This operation is idempotent -
 * unliking a post that wasn't liked has no effect.
 *
 * Business Rules:
 * - User can unlike any post they have liked
 * - Unliking decrements the post's likeCount
 * - Operation is idempotent (no error on non-existent like)
 */

import type { LikeRepositoryPort, PostRepositoryPort } from '../ports/repository-ports.js';

/**
 * Input for UnlikePost usecase
 */
export interface UnlikePostInput {
  readonly postId: string;
  readonly userId: string;
}

/**
 * Custom error for UnlikePost usecase
 */
export class UnlikePostError extends Error {
  public override readonly name = 'UnlikePostError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UnlikePostError.prototype);
  }
}

/**
 * UnlikePost Usecase
 *
 * Handles unliking a post. Uses private constructor pattern.
 */
export class UnlikePost {
  private readonly _likeRepository: LikeRepositoryPort;
  private readonly _postRepository: PostRepositoryPort;

  private constructor(
    likeRepository: LikeRepositoryPort,
    postRepository: PostRepositoryPort
  ) {
    this._likeRepository = likeRepository;
    this._postRepository = postRepository;

    Object.freeze(this);
  }

  public static create(
    likeRepository: LikeRepositoryPort,
    postRepository: PostRepositoryPort
  ): UnlikePost {
    return new UnlikePost(likeRepository, postRepository);
  }

  public async execute(input: UnlikePostInput): Promise<void> {
    this.validateInput(input);

    const { postId, userId } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new UnlikePostError('Post not found');
    }

    // Check if like exists (idempotent)
    const existingLike = await this._likeRepository.findByPostAndUser(postId, userId);
    if (!existingLike) {
      // Not liked - do nothing (idempotent)
      return;
    }

    // Delete the like
    await this._likeRepository.delete(postId, userId);

    // Decrement post like count
    const updatedPost = post.decrementLikeCount();
    await this._postRepository.save(updatedPost);
  }

  private validateInput(input: UnlikePostInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new UnlikePostError('postId cannot be empty');
    }
    if (!input.userId || input.userId.trim().length === 0) {
      throw new UnlikePostError('userId cannot be empty');
    }
  }
}
