/**
 * DeleteComment Usecase
 *
 * Soft deletes a comment, preserving thread structure.
 */

import type { CommentRepositoryPort, PostRepositoryPort } from '../ports/repository-ports.js';

export interface DeleteCommentInput {
  readonly commentId: string;
  readonly requesterId: string;
}

export class DeleteCommentError extends Error {
  public override readonly name = 'DeleteCommentError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DeleteCommentError.prototype);
  }
}

export class DeleteComment {
  private readonly _commentRepository: CommentRepositoryPort;
  private readonly _postRepository: PostRepositoryPort;

  private constructor(
    commentRepository: CommentRepositoryPort,
    postRepository: PostRepositoryPort
  ) {
    this._commentRepository = commentRepository;
    this._postRepository = postRepository;

    Object.freeze(this);
  }

  public static create(
    commentRepository: CommentRepositoryPort,
    postRepository: PostRepositoryPort
  ): DeleteComment {
    return new DeleteComment(commentRepository, postRepository);
  }

  public async execute(input: DeleteCommentInput): Promise<void> {
    this.validateInput(input);

    const { commentId, requesterId } = input;

    // Find the comment
    const comment = await this._commentRepository.findById(commentId);
    if (!comment) {
      throw new DeleteCommentError('Comment not found');
    }

    // Check ownership
    if (comment.authorId !== requesterId) {
      throw new DeleteCommentError('Not authorized to delete this comment');
    }

    // Soft delete the comment
    await this._commentRepository.softDelete(commentId);

    // Decrement post comment count
    const post = await this._postRepository.findById(comment.postId);
    if (post) {
      const updatedPost = post.decrementCommentCount();
      await this._postRepository.save(updatedPost);
    }
  }

  private validateInput(input: DeleteCommentInput): void {
    if (!input.commentId || input.commentId.trim().length === 0) {
      throw new DeleteCommentError('commentId cannot be empty');
    }
    if (!input.requesterId || input.requesterId.trim().length === 0) {
      throw new DeleteCommentError('requesterId cannot be empty');
    }
  }
}
