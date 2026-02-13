/**
 * SearchPosts Usecase
 *
 * Searches for posts with various filters and pagination.
 */

import type { Post } from '../../domain/entities/post.js';
import type { PostRepositoryPort } from '../ports/repository-ports.js';
import type { PostQuery, PaginatedResult } from '../ports/types.js';

export interface SearchPostsInput {
  readonly keyword?: string;
  readonly edition?: readonly ('java' | 'bedrock')[];
  readonly sizeCategory?: readonly ('small' | 'medium' | 'large' | 'xlarge')[];
  readonly hasRequiredMods?: boolean;
  readonly authorId?: string;
  readonly sortBy?: 'popular' | 'newest' | 'downloads';
  readonly page?: number;
  readonly limit?: number;
}

export class SearchPostsError extends Error {
  public override readonly name = 'SearchPostsError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SearchPostsError.prototype);
  }
}

export class SearchPosts {
  private readonly _postRepository: PostRepositoryPort;

  private constructor(postRepository: PostRepositoryPort) {
    this._postRepository = postRepository;

    Object.freeze(this);
  }

  public static create(postRepository: PostRepositoryPort): SearchPosts {
    return new SearchPosts(postRepository);
  }

  public async execute(input: SearchPostsInput): Promise<PaginatedResult<Post>> {
    const query: PostQuery = {
      ...(input.keyword !== undefined && { keyword: input.keyword }),
      ...(input.edition !== undefined && { edition: input.edition }),
      ...(input.sizeCategory !== undefined && { sizeCategory: input.sizeCategory }),
      ...(input.hasRequiredMods !== undefined && { hasRequiredMods: input.hasRequiredMods }),
      ...(input.authorId !== undefined && { authorId: input.authorId }),
      sortBy: input.sortBy ?? 'newest',
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
    };

    return this._postRepository.search(query);
  }
}
