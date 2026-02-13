/**
 * AddComment Usecase
 *
 * Allows a user to add a comment to a post.
 *
 * Business Rules:
 * - Content is checked for spam
 * - Rate limiting is applied
 * - Notification is sent to post author (unless self-comment)
 * - Supports threaded replies via parentCommentId
 */

import { Comment } from '../../domain/entities/comment.js';
import type { CommentRepositoryPort, PostRepositoryPort } from '../ports/repository-ports.js';
import type { NotificationPort, SpamDetectorPort } from '../ports/gateway-ports.js';

export interface AddCommentInput {
  readonly postId: string;
  readonly authorId: string;
  readonly content: string;
  readonly parentCommentId?: string;
}

export class AddCommentError extends Error {
  public override readonly name = 'AddCommentError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AddCommentError.prototype);
  }
}

export class AddComment {
  private readonly _commentRepository: CommentRepositoryPort;
  private readonly _postRepository: PostRepositoryPort;
  private readonly _notificationPort: NotificationPort;
  private readonly _spamDetectorPort: SpamDetectorPort;

  private constructor(
    commentRepository: CommentRepositoryPort,
    postRepository: PostRepositoryPort,
    notificationPort: NotificationPort,
    spamDetectorPort: SpamDetectorPort
  ) {
    this._commentRepository = commentRepository;
    this._postRepository = postRepository;
    this._notificationPort = notificationPort;
    this._spamDetectorPort = spamDetectorPort;

    Object.freeze(this);
  }

  public static create(
    commentRepository: CommentRepositoryPort,
    postRepository: PostRepositoryPort,
    notificationPort: NotificationPort,
    spamDetectorPort: SpamDetectorPort
  ): AddComment {
    return new AddComment(commentRepository, postRepository, notificationPort, spamDetectorPort);
  }

  public async execute(input: AddCommentInput): Promise<Comment> {
    this.validateInput(input);

    const { postId, authorId, content, parentCommentId } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new AddCommentError('Post not found');
    }

    // Check rate limit
    const rateLimitResult = await this._spamDetectorPort.checkRateLimit(authorId, 'comment');
    if (!rateLimitResult.allowed) {
      throw new AddCommentError(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
    }

    // Check content for spam
    const contentCheck = await this._spamDetectorPort.checkContent(content);
    if (!contentCheck.allowed) {
      throw new AddCommentError(`Content not allowed: ${contentCheck.reason}`);
    }

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentComment = await this._commentRepository.findById(parentCommentId);
      if (!parentComment) {
        throw new AddCommentError('Parent comment not found');
      }
      if (parentComment.postId !== postId) {
        throw new AddCommentError('Parent comment belongs to different post');
      }
    }

    // Create the comment
    const comment = Comment.create({
      id: this.generateCommentId(),
      postId,
      authorId,
      parentCommentId: parentCommentId ?? null,
      content,
      createdAt: new Date(),
    });

    // Save the comment
    const savedComment = await this._commentRepository.save(comment);

    // Increment post comment count
    const updatedPost = post.incrementCommentCount();
    await this._postRepository.save(updatedPost);

    // Send notification (unless self-comment)
    if (post.authorId !== authorId) {
      await this._notificationPort.notify(post.authorId, {
        type: 'comment',
        title: 'New comment',
        body: `Someone commented on your post "${post.title}"`,
        actionUrl: `/posts/${postId}#comment-${savedComment.id}`,
        metadata: { postId, commentId: savedComment.id, authorId },
      });
    }

    return savedComment;
  }

  private validateInput(input: AddCommentInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new AddCommentError('postId cannot be empty');
    }
    if (!input.authorId || input.authorId.trim().length === 0) {
      throw new AddCommentError('authorId cannot be empty');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new AddCommentError('content cannot be empty');
    }
  }

  private generateCommentId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
