/**
 * Social Controller
 *
 * Handles social-related HTTP requests (likes, comments, follows).
 */

import { ZodError } from 'zod';
import { BaseController, type HttpContext, type HttpResponse } from './types.js';
import {
  postIdParamSchema,
  userIdParamSchema,
  createCommentSchema,
  commentIdParamSchema,
  getCommentsQuerySchema,
} from '../validators/index.js';
import {
  CommentPresenter,
  ErrorPresenter,
  type CommentOutput,
} from '../presenters/index.js';

// Usecase imports
import type { LikePost } from '../../usecase/social/like-post.js';
import type { UnlikePost } from '../../usecase/social/unlike-post.js';
import type { AddComment } from '../../usecase/social/add-comment.js';
import type { DeleteComment } from '../../usecase/social/delete-comment.js';
import type { FollowUser } from '../../usecase/social/follow-user.js';
import type { UnfollowUser } from '../../usecase/social/unfollow-user.js';

// Repository imports
import type { UserRepositoryPort, CommentRepositoryPort } from '../../usecase/ports/repository-ports.js';

export interface SocialControllerDeps {
  readonly likePost: LikePost;
  readonly unlikePost: UnlikePost;
  readonly addComment: AddComment;
  readonly deleteComment: DeleteComment;
  readonly followUser: FollowUser;
  readonly unfollowUser: UnfollowUser;
  readonly userRepository: UserRepositoryPort;
  readonly commentRepository: CommentRepositoryPort;
}

export class SocialController extends BaseController {
  private readonly _deps: SocialControllerDeps;

  private constructor(deps: SocialControllerDeps) {
    super();
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: SocialControllerDeps): SocialController {
    return new SocialController(deps);
  }

  /**
   * POST /api/v1/posts/:id/like - Like a post
   */
  public async likePost(ctx: HttpContext): Promise<HttpResponse<{ liked: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = postIdParamSchema.parse(ctx.params);

      await this._deps.likePost.execute({
        postId: params.id,
        userId: ctx.user.id,
      });

      return this.createResponse(200, { success: true, data: { liked: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * DELETE /api/v1/posts/:id/like - Unlike a post
   */
  public async unlikePost(ctx: HttpContext): Promise<HttpResponse<{ liked: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = postIdParamSchema.parse(ctx.params);

      await this._deps.unlikePost.execute({
        postId: params.id,
        userId: ctx.user.id,
      });

      return this.createResponse(200, { success: true, data: { liked: false } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/posts/:id/comments - Get comments for a post
   */
  public async getComments(ctx: HttpContext): Promise<HttpResponse<CommentOutput>> {
    try {
      const params = postIdParamSchema.parse(ctx.params);
      const query = getCommentsQuerySchema.parse(ctx.query);

      const comments = await this._deps.commentRepository.findByPost(params.id);

      // Fetch authors for comments
      const commentsWithAuthors = await Promise.all(
        comments
          .slice((query.page - 1) * query.limit, query.page * query.limit)
          .map(async (comment) => {
            const author = await this._deps.userRepository.findById(comment.authorId);
            if (!author) {
              throw new Error('Author not found');
            }
            return { comment, author };
          })
      );

      return this.createPaginatedResponse(
        200,
        CommentPresenter.formatPaginated(
          commentsWithAuthors,
          query.page,
          query.limit,
          comments.length
        )
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/posts/:id/comments - Add a comment
   */
  public async addComment(ctx: HttpContext): Promise<HttpResponse<CommentOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = postIdParamSchema.parse(ctx.params);
      const input = createCommentSchema.parse(ctx.body);

      const comment = await this._deps.addComment.execute({
        postId: params.id,
        authorId: ctx.user.id,
        content: input.content,
        ...(input.parentCommentId != null && { parentCommentId: input.parentCommentId }),
      });

      const author = await this._deps.userRepository.findById(comment.authorId);
      if (!author) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
      }

      return this.createResponse(201, CommentPresenter.format({ comment, author }));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * DELETE /api/v1/comments/:id - Delete a comment
   */
  public async deleteComment(ctx: HttpContext): Promise<HttpResponse<{ deleted: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = commentIdParamSchema.parse(ctx.params);

      await this._deps.deleteComment.execute({
        commentId: params.id,
        requesterId: ctx.user.id,
      });

      return this.createResponse(200, { success: true, data: { deleted: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('コメント'));
        }
        if (error.message.includes('Not authorized')) {
          return this.createErrorResponse(403, ErrorPresenter.forbidden());
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/users/:id/follow - Follow a user
   */
  public async followUser(ctx: HttpContext): Promise<HttpResponse<{ following: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = userIdParamSchema.parse(ctx.params);

      await this._deps.followUser.execute({
        followerId: ctx.user.id,
        followeeId: params.id,
      });

      return this.createResponse(200, { success: true, data: { following: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('ユーザー'));
        }
        if (error.message.includes('yourself')) {
          return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * DELETE /api/v1/users/:id/follow - Unfollow a user
   */
  public async unfollowUser(ctx: HttpContext): Promise<HttpResponse<{ following: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = userIdParamSchema.parse(ctx.params);

      await this._deps.unfollowUser.execute({
        followerId: ctx.user.id,
        followeeId: params.id,
      });

      return this.createResponse(200, { success: true, data: { following: false } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }
}
