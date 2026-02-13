/**
 * InMemory Comment Repository
 *
 * In-memory implementation of CommentRepositoryPort for testing and development.
 */

import { Comment } from '../../../domain/entities/comment.js';
import type { CommentRepositoryPort } from '../../../usecase/ports/repository-ports.js';
import { PortError } from '../../../usecase/ports/types.js';

export class InMemoryCommentRepository implements CommentRepositoryPort {
  private readonly _comments = new Map<string, Comment>();
  private readonly _postIndex = new Map<string, Set<string>>(); // postId -> commentIds

  /**
   * Clear all stored comments (for test reset)
   */
  public clear(): void {
    this._comments.clear();
    this._postIndex.clear();
  }

  /**
   * Get all stored comments (for test verification)
   */
  public getAll(): Comment[] {
    return Array.from(this._comments.values());
  }

  public async findById(id: string): Promise<Comment | null> {
    return this._comments.get(id) ?? null;
  }

  public async findByPost(postId: string): Promise<Comment[]> {
    const commentIds = this._postIndex.get(postId);
    if (!commentIds) {
      return [];
    }

    const comments = Array.from(commentIds)
      .map((id) => this._comments.get(id))
      .filter((c): c is Comment => c !== undefined);

    // Sort comments for tree display:
    // - Root comments first (no parent), by creation date
    // - Replies nested under their parent, by creation date
    return comments.sort((a, b) => {
      // Both root or both replies under same parent
      if (a.parentCommentId === b.parentCommentId) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }

      // a is root, b is not
      if (!a.parentCommentId && b.parentCommentId) {
        return -1;
      }

      // b is root, a is not
      if (a.parentCommentId && !b.parentCommentId) {
        return 1;
      }

      // Different parents - sort by root parent creation time
      const aRoot = this.findRootParent(a);
      const bRoot = this.findRootParent(b);
      return aRoot.createdAt.getTime() - bRoot.createdAt.getTime();
    });
  }

  private findRootParent(comment: Comment): Comment {
    let current = comment;
    while (current.parentCommentId) {
      const parent = this._comments.get(current.parentCommentId);
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  public async save(comment: Comment): Promise<Comment> {
    // Update post index
    let commentIds = this._postIndex.get(comment.postId);
    if (!commentIds) {
      commentIds = new Set();
      this._postIndex.set(comment.postId, commentIds);
    }
    commentIds.add(comment.id);

    // Save comment
    this._comments.set(comment.id, comment);

    return comment;
  }

  public async softDelete(id: string): Promise<void> {
    const comment = this._comments.get(id);
    if (!comment) {
      throw new PortError('NOT_FOUND', `Comment with id ${id} not found`);
    }

    // Soft delete by replacing content with "[削除済み]"
    // Use Comment.reconstruct to create new immutable comment
    const deletedComment = Comment.reconstruct({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      parentCommentId: comment.parentCommentId,
      content: '[削除済み]',
      createdAt: comment.createdAt,
    });

    this._comments.set(id, deletedComment);
  }
}
