/**
 * Post Controller
 *
 * Handles post-related HTTP requests.
 */

import { ZodError } from 'zod';
import { BaseController, type HttpContext, type HttpResponse } from './types.js';
import {
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
  postIdParamSchema,
  unlistedTokenParamSchema,
} from '../validators/index.js';
import {
  PostPresenter,
  ErrorPresenter,
  ErrorCode,
  type PostOutput,
  type PostSummaryOutput,
} from '../presenters/index.js';

// Usecase imports
import type { CreatePost } from '../../usecase/post/create-post.js';
import type { UpdatePost } from '../../usecase/post/update-post.js';
import type { DeletePost } from '../../usecase/post/delete-post.js';
import type { SearchPosts } from '../../usecase/post/search-posts.js';
import type { GetPostDetail } from '../../usecase/post/get-post-detail.js';

// Repository imports for fetching related data
import type { UserRepositoryPort, StructureRepositoryPort } from '../../usecase/ports/repository-ports.js';

export interface PostControllerDeps {
  readonly createPost: CreatePost;
  readonly updatePost: UpdatePost;
  readonly deletePost: DeletePost;
  readonly searchPosts: SearchPosts;
  readonly getPostDetail: GetPostDetail;
  readonly userRepository: UserRepositoryPort;
  readonly structureRepository: StructureRepositoryPort;
}

export class PostController extends BaseController {
  private readonly _deps: PostControllerDeps;

  private constructor(deps: PostControllerDeps) {
    super();
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: PostControllerDeps): PostController {
    return new PostController(deps);
  }

  /**
   * GET /api/v1/posts - Search posts
   */
  public async search(ctx: HttpContext): Promise<HttpResponse<PostSummaryOutput>> {
    try {
      const query = postQuerySchema.parse(ctx.query);

      const result = await this._deps.searchPosts.execute({
        ...(query.keyword !== undefined && { keyword: query.keyword }),
        ...(query.edition !== undefined && { edition: query.edition as readonly ('java' | 'bedrock')[] }),
        ...(query.sizeCategory !== undefined && { sizeCategory: query.sizeCategory as readonly ('small' | 'medium' | 'large' | 'xlarge')[] }),
        ...(query.hasRequiredMods !== undefined && { hasRequiredMods: query.hasRequiredMods }),
        ...(query.authorId !== undefined && { authorId: query.authorId }),
        sortBy: query.sortBy,
        page: query.page,
        limit: query.limit,
      });

      // Fetch authors for posts
      const postsWithAuthors = await Promise.all(
        result.items.map(async (post) => {
          const author = await this._deps.userRepository.findById(post.authorId);
          if (!author) {
            throw new Error('Author not found');
          }
          return { post, author };
        })
      );

      return this.createPaginatedResponse(
        200,
        PostPresenter.formatPaginated(
          postsWithAuthors,
          result.page,
          result.limit,
          result.total
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
   * GET /api/v1/posts/:id - Get post detail
   */
  public async getById(ctx: HttpContext): Promise<HttpResponse<PostOutput>> {
    try {
      const params = postIdParamSchema.parse(ctx.params);

      const post = await this._deps.getPostDetail.execute({
        postId: params.id,
        ...(ctx.user?.id !== undefined && { requesterId: ctx.user.id }),
      });

      const [author, structure] = await Promise.all([
        this._deps.userRepository.findById(post.authorId),
        this._deps.structureRepository.findById(post.structureId),
      ]);

      if (!author) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('投稿者'));
      }
      if (!structure) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ストラクチャー'));
      }

      return this.createResponse(200, PostPresenter.format({ post, author, structure }));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('not accessible')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/posts/unlisted/:token - Get unlisted post by token
   */
  public async getByUnlistedToken(ctx: HttpContext): Promise<HttpResponse<PostOutput>> {
    try {
      const params = unlistedTokenParamSchema.parse(ctx.params);

      const post = await this._deps.getPostDetail.execute({
        postId: '', // Will be looked up by token in usecase
        unlistedToken: params.token,
        ...(ctx.user?.id !== undefined && { requesterId: ctx.user.id }),
      });

      const [author, structure] = await Promise.all([
        this._deps.userRepository.findById(post.authorId),
        this._deps.structureRepository.findById(post.structureId),
      ]);

      if (!author) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('投稿者'));
      }
      if (!structure) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ストラクチャー'));
      }

      return this.createResponse(200, PostPresenter.format({ post, author, structure }));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        return this.createErrorResponse(
          ErrorPresenter.getStatusCode(ErrorCode.NOT_FOUND),
          ErrorPresenter.fromUsecaseError(error)
        );
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * POST /api/v1/posts - Create post
   */
  public async create(ctx: HttpContext): Promise<HttpResponse<PostOutput>> {
    try {
      // Debug: log received body
      console.log('Create post request:', {
        user: ctx.user,
        body: ctx.body,
      });

      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const input = createPostSchema.parse(ctx.body);

      const post = await this._deps.createPost.execute({
        title: input.title,
        ...(input.description !== undefined && { description: input.description }),
        ...(input.tags !== undefined && { tags: input.tags }),
        visibility: input.visibility,
        structureId: input.structureId,
        authorId: ctx.user.id,
        ...(input.requiredMods !== undefined && { requiredMods: input.requiredMods }),
        ...(input.unlistedExpiry && { unlistedExpiry: new Date(input.unlistedExpiry) }),
      });

      const [author, structure] = await Promise.all([
        this._deps.userRepository.findById(post.authorId),
        this._deps.structureRepository.findById(post.structureId),
      ]);

      if (!author) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('投稿者'));
      }
      if (!structure) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ストラクチャー'));
      }

      return this.createResponse(201, PostPresenter.format({ post, author, structure }));
    } catch (error) {
      if (error instanceof ZodError) {
        console.log('Create post validation error:', error.errors);
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        console.log('Create post error:', error.message);
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * PATCH /api/v1/posts/:id - Update post
   */
  public async update(ctx: HttpContext): Promise<HttpResponse<PostOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = postIdParamSchema.parse(ctx.params);
      const input = updatePostSchema.parse(ctx.body);

      const post = await this._deps.updatePost.execute({
        postId: params.id,
        requesterId: ctx.user.id,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
        ...(input.unlistedExpiry && { unlistedExpiry: new Date(input.unlistedExpiry) }),
      });

      const [author, structure] = await Promise.all([
        this._deps.userRepository.findById(post.authorId),
        this._deps.structureRepository.findById(post.structureId),
      ]);

      if (!author) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('投稿者'));
      }
      if (!structure) {
        return this.createErrorResponse(404, ErrorPresenter.notFound('ストラクチャー'));
      }

      return this.createResponse(200, PostPresenter.format({ post, author, structure }));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
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
   * DELETE /api/v1/posts/:id - Delete post
   */
  public async delete(ctx: HttpContext): Promise<HttpResponse<{ deleted: boolean }>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = postIdParamSchema.parse(ctx.params);

      await this._deps.deletePost.execute({
        postId: params.id,
        requesterId: ctx.user.id,
      });

      return this.createResponse(200, { success: true, data: { deleted: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('投稿'));
        }
        if (error.message.includes('Not authorized')) {
          return this.createErrorResponse(403, ErrorPresenter.forbidden());
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }
}
