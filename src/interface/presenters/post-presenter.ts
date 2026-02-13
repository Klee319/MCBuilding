/**
 * Post Presenter
 *
 * Formats post entities for API responses.
 */

import type { Post } from '../../domain/entities/post.js';
import type { User } from '../../domain/entities/user.js';
import type { Structure } from '../../domain/entities/structure.js';
import type {
  SuccessResponse,
  PaginatedResponse,
  PostOutput,
  PostSummaryOutput,
} from './types.js';
import { UserPresenter } from './user-presenter.js';
import { StructurePresenter } from './structure-presenter.js';

export interface PostWithRelations {
  readonly post: Post;
  readonly author: User;
  readonly structure: Structure;
}

export class PostPresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a post with relations for full output
   */
  public static toOutput(postWithRelations: PostWithRelations): PostOutput {
    const { post, author, structure } = postWithRelations;

    return {
      id: post.id,
      title: post.title,
      description: post.description || null,
      tags: post.tags.map((tag) => tag.value),
      requiredMods: [...post.requiredMods],
      visibility: post.visibility.value,
      unlistedUrl: post.unlistedUrl?.token ?? null,
      unlistedExpiry: post.unlistedUrl?.expiresAt?.toISOString() ?? null,
      author: UserPresenter.toSummary(author),
      structure: StructurePresenter.toOutput(structure),
      likeCount: post.likeCount,
      downloadCount: post.downloadCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  /**
   * Format a post for summary output (lists, search results)
   */
  public static toSummary(
    post: Post,
    author: User,
    thumbnailUrl?: string
  ): PostSummaryOutput {
    return {
      id: post.id,
      title: post.title,
      thumbnailUrl: thumbnailUrl ?? null,
      author: UserPresenter.toSummary(author),
      likeCount: post.likeCount,
      downloadCount: post.downloadCount,
      createdAt: post.createdAt.toISOString(),
    };
  }

  /**
   * Format a single post response
   */
  public static format(postWithRelations: PostWithRelations): SuccessResponse<PostOutput> {
    return {
      success: true,
      data: this.toOutput(postWithRelations),
    };
  }

  /**
   * Format a paginated posts response
   */
  public static formatPaginated(
    postsWithAuthors: readonly { post: Post; author: User; thumbnailUrl?: string }[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<PostSummaryOutput> {
    return {
      success: true,
      data: postsWithAuthors.map(({ post, author, thumbnailUrl }) =>
        this.toSummary(post, author, thumbnailUrl)
      ),
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }
}
