/**
 * InMemory Post Repository
 *
 * In-memory implementation of PostRepositoryPort for testing and development.
 */

import type { Post } from '../../../domain/entities/post.js';
import type { PostRepositoryPort } from '../../../usecase/ports/repository-ports.js';
import type { PaginatedResult, PostQuery } from '../../../usecase/ports/types.js';
import { PortError } from '../../../usecase/ports/types.js';

export class InMemoryPostRepository implements PostRepositoryPort {
  private readonly _posts = new Map<string, Post>();
  private readonly _unlistedIndex = new Map<string, string>(); // token -> id

  /**
   * Clear all stored posts (for test reset)
   */
  public clear(): void {
    this._posts.clear();
    this._unlistedIndex.clear();
  }

  /**
   * Get all stored posts (for test verification)
   */
  public getAll(): Post[] {
    return Array.from(this._posts.values());
  }

  public async findById(id: string): Promise<Post | null> {
    return this._posts.get(id) ?? null;
  }

  public async findByUnlistedUrl(unlistedUrl: string): Promise<Post | null> {
    const postId = this._unlistedIndex.get(unlistedUrl);
    if (!postId) {
      return null;
    }
    const post = this._posts.get(postId);
    if (!post) {
      return null;
    }

    // Check if unlisted URL is expired
    if (post.unlistedUrl?.expiresAt && post.unlistedUrl.expiresAt < new Date()) {
      return null;
    }

    return post;
  }

  public async search(query: PostQuery): Promise<PaginatedResult<Post>> {
    let posts = Array.from(this._posts.values());

    // Filter: only public posts (unless authorId specified)
    if (!query.authorId) {
      posts = posts.filter((p) => p.visibility.value === 'public');
    }

    // Filter by keyword
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(keyword) ||
          (p.description?.toLowerCase().includes(keyword) ?? false) ||
          p.tags.some((t) => t.value.toLowerCase().includes(keyword))
      );
    }

    // Filter by author
    if (query.authorId) {
      posts = posts.filter((p) => p.authorId === query.authorId);
    }

    // Filter by hasRequiredMods
    if (query.hasRequiredMods !== undefined) {
      posts = posts.filter(
        (p) =>
          query.hasRequiredMods
            ? p.requiredMods.length > 0
            : p.requiredMods.length === 0
      );
    }

    // Filter by creation time
    if (query.createdWithin && query.createdWithin !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      switch (query.createdWithin) {
        case '1day':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '1week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      posts = posts.filter((p) => p.createdAt >= cutoffDate);
    }

    // Sort
    const sortBy = query.sortBy ?? 'newest';
    switch (sortBy) {
      case 'newest':
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'popular':
        posts.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'downloads':
        posts.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
    }

    // Pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = posts.length;
    const start = (page - 1) * limit;
    const items = posts.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      hasMore: start + limit < total,
    };
  }

  public async findByAuthor(
    authorId: string,
    includePrivate?: boolean
  ): Promise<Post[]> {
    let posts = Array.from(this._posts.values()).filter(
      (p) => p.authorId === authorId
    );

    if (!includePrivate) {
      posts = posts.filter((p) => p.visibility.value === 'public');
    }

    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async save(post: Post): Promise<Post> {
    // Remove old unlisted index if post exists
    const existingPost = this._posts.get(post.id);
    if (existingPost?.unlistedUrl) {
      this._unlistedIndex.delete(existingPost.unlistedUrl.token);
    }

    // Save post and update unlisted index
    this._posts.set(post.id, post);
    if (post.unlistedUrl) {
      this._unlistedIndex.set(post.unlistedUrl.token, post.id);
    }

    return post;
  }

  public async delete(id: string): Promise<void> {
    const post = this._posts.get(id);
    if (!post) {
      throw new PortError('NOT_FOUND', `Post with id ${id} not found`);
    }

    if (post.unlistedUrl) {
      this._unlistedIndex.delete(post.unlistedUrl.token);
    }
    this._posts.delete(id);
  }

  public async incrementDownloadCount(id: string): Promise<void> {
    const post = this._posts.get(id);
    if (!post) {
      throw new PortError('NOT_FOUND', `Post with id ${id} not found`);
    }

    // Create updated post with incremented download count
    const updatedPost = {
      ...post,
      downloadCount: post.downloadCount + 1,
    } as Post;

    this._posts.set(id, updatedPost);
  }
}
