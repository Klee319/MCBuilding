/**
 * DeletePost Usecase
 *
 * Deletes a post and associated data.
 */

import type { PostRepositoryPort, StructureRepositoryPort } from '../ports/repository-ports.js';

export interface DeletePostInput {
  readonly postId: string;
  readonly requesterId: string;
}

export class DeletePostError extends Error {
  public override readonly name = 'DeletePostError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DeletePostError.prototype);
  }
}

export class DeletePost {
  private readonly _postRepository: PostRepositoryPort;
  private readonly _structureRepository: StructureRepositoryPort;

  private constructor(
    postRepository: PostRepositoryPort,
    structureRepository: StructureRepositoryPort
  ) {
    this._postRepository = postRepository;
    this._structureRepository = structureRepository;

    Object.freeze(this);
  }

  public static create(
    postRepository: PostRepositoryPort,
    structureRepository: StructureRepositoryPort
  ): DeletePost {
    return new DeletePost(postRepository, structureRepository);
  }

  public async execute(input: DeletePostInput): Promise<void> {
    this.validateInput(input);

    const { postId, requesterId } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new DeletePostError('Post not found');
    }

    // Check ownership
    if (post.authorId !== requesterId) {
      throw new DeletePostError('Not authorized to delete this post');
    }

    // Delete associated structure
    await this._structureRepository.delete(post.structureId);

    // Delete the post
    await this._postRepository.delete(postId);
  }

  private validateInput(input: DeletePostInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new DeletePostError('postId cannot be empty');
    }
    if (!input.requesterId || input.requesterId.trim().length === 0) {
      throw new DeletePostError('requesterId cannot be empty');
    }
  }
}
