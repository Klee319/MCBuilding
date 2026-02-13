/**
 * UpdatePost Usecase
 *
 * Updates an existing post (title, description, tags, visibility).
 */

import type { Post } from '../../domain/entities/post.js';
import { Visibility } from '../../domain/value-objects/visibility.js';
import { UnlistedUrl } from '../../domain/value-objects/unlisted-url.js';
import type { PostRepositoryPort } from '../ports/repository-ports.js';

export interface UpdatePostInput {
  readonly postId: string;
  readonly requesterId: string;
  readonly title?: string;
  readonly description?: string;
  readonly visibility?: 'public' | 'private' | 'unlisted';
  readonly unlistedExpiry?: Date;
}

export class UpdatePostError extends Error {
  public override readonly name = 'UpdatePostError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UpdatePostError.prototype);
  }
}

export class UpdatePost {
  private readonly _postRepository: PostRepositoryPort;

  private constructor(postRepository: PostRepositoryPort) {
    this._postRepository = postRepository;

    Object.freeze(this);
  }

  public static create(postRepository: PostRepositoryPort): UpdatePost {
    return new UpdatePost(postRepository);
  }

  public async execute(input: UpdatePostInput): Promise<Post> {
    this.validateInput(input);

    const { postId, requesterId, title, description, visibility, unlistedExpiry } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new UpdatePostError('Post not found');
    }

    // Check ownership
    if (post.authorId !== requesterId) {
      throw new UpdatePostError('Not authorized to update this post');
    }

    // Apply updates immutably
    let updatedPost = post;

    if (title !== undefined) {
      updatedPost = updatedPost.withTitle(title);
    }

    if (description !== undefined) {
      updatedPost = updatedPost.withDescription(description);
    }

    if (visibility !== undefined) {
      const visibilityVO = this.createVisibility(visibility);
      const unlistedUrl = visibilityVO.isUnlisted()
        ? UnlistedUrl.generate(unlistedExpiry ?? null)
        : undefined;
      updatedPost = updatedPost.withVisibility(visibilityVO, unlistedUrl);
    }

    return this._postRepository.save(updatedPost);
  }

  private validateInput(input: UpdatePostInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new UpdatePostError('postId cannot be empty');
    }
    if (!input.requesterId || input.requesterId.trim().length === 0) {
      throw new UpdatePostError('requesterId cannot be empty');
    }
  }

  private createVisibility(value: 'public' | 'private' | 'unlisted'): Visibility {
    switch (value) {
      case 'public':
        return Visibility.public();
      case 'private':
        return Visibility.private();
      case 'unlisted':
        return Visibility.unlisted();
    }
  }
}
