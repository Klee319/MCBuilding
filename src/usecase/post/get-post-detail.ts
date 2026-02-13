/**
 * GetPostDetail Usecase
 *
 * Gets detailed information about a post with visibility checks.
 */

import type { Post } from '../../domain/entities/post.js';
import type { PostRepositoryPort } from '../ports/repository-ports.js';

export interface GetPostDetailInput {
  readonly postId: string;
  readonly requesterId?: string;
  readonly unlistedToken?: string;
}

export class GetPostDetailError extends Error {
  public override readonly name = 'GetPostDetailError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, GetPostDetailError.prototype);
  }
}

export class GetPostDetail {
  private readonly _postRepository: PostRepositoryPort;

  private constructor(postRepository: PostRepositoryPort) {
    this._postRepository = postRepository;

    Object.freeze(this);
  }

  public static create(postRepository: PostRepositoryPort): GetPostDetail {
    return new GetPostDetail(postRepository);
  }

  public async execute(input: GetPostDetailInput): Promise<Post> {
    this.validateInput(input);

    const { postId, requesterId, unlistedToken } = input;

    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new GetPostDetailError('Post not found');
    }

    // Check visibility
    const isOwner = requesterId === post.authorId;
    const isAccessible = post.isAccessible(isOwner, unlistedToken);

    if (!isAccessible) {
      throw new GetPostDetailError('Post not accessible');
    }

    return post;
  }

  private validateInput(input: GetPostDetailInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new GetPostDetailError('postId cannot be empty');
    }
  }
}
