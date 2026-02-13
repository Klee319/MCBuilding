/**
 * Comment Presenter
 *
 * Formats comment entities for API responses.
 */

import type { Comment } from '../../domain/entities/comment.js';
import type { User } from '../../domain/entities/user.js';
import type {
  SuccessResponse,
  PaginatedResponse,
  CommentOutput,
} from './types.js';
import { UserPresenter } from './user-presenter.js';

export interface CommentWithAuthor {
  readonly comment: Comment;
  readonly author: User;
  readonly replies?: readonly CommentWithAuthor[];
  readonly isDeleted?: boolean;
}

export class CommentPresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a comment with author for output
   */
  public static toOutput(commentWithAuthor: CommentWithAuthor): CommentOutput {
    const { comment, author, replies = [], isDeleted = false } = commentWithAuthor;

    return {
      id: comment.id,
      content: isDeleted ? '[削除されたコメント]' : comment.content,
      author: UserPresenter.toSummary(author),
      parentCommentId: comment.parentCommentId,
      replies: replies.map((reply) => this.toOutput(reply)),
      isDeleted,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  /**
   * Format a single comment response
   */
  public static format(
    commentWithAuthor: CommentWithAuthor
  ): SuccessResponse<CommentOutput> {
    return {
      success: true,
      data: this.toOutput(commentWithAuthor),
    };
  }

  /**
   * Format a paginated comments response
   */
  public static formatPaginated(
    commentsWithAuthors: readonly CommentWithAuthor[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<CommentOutput> {
    return {
      success: true,
      data: commentsWithAuthors.map((cwa) => this.toOutput(cwa)),
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }
}
