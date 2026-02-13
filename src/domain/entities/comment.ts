/**
 * Comment Entity
 *
 * Entity representing a comment on a post.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - content.length >= 1 && <= 1000
 * - parentCommentId must be null or non-empty string
 *
 * @example
 * const comment = Comment.create({
 *   id: 'comment-123',
 *   postId: 'post-456',
 *   authorId: 'user-789',
 *   parentCommentId: null,
 *   content: 'Great post!',
 *   createdAt: new Date()
 * });
 */

/**
 * Minimum length for content
 */
const MIN_CONTENT_LENGTH = 1;

/**
 * Maximum length for content
 */
const MAX_CONTENT_LENGTH = 1000;

/**
 * Props for creating a Comment entity
 */
export interface CommentProps {
  readonly id: string;
  readonly postId: string;
  readonly authorId: string;
  readonly parentCommentId: string | null;
  readonly content: string;
  readonly createdAt: Date;
}

/**
 * Custom error for invalid Comment values
 */
export class InvalidCommentError extends Error {
  public override readonly name = 'InvalidCommentError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidCommentError.prototype);
  }
}

/**
 * Comment Entity
 *
 * Immutable entity representing a comment on a post.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Comment {
  // Internal state
  private readonly _id: string;
  private readonly _postId: string;
  private readonly _authorId: string;
  private readonly _parentCommentId: string | null;
  private readonly _content: string;
  private readonly _createdAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: CommentProps) {
    this._id = props.id;
    this._postId = props.postId;
    this._authorId = props.authorId;
    this._parentCommentId = props.parentCommentId;
    this._content = props.content;
    this._createdAt = new Date(props.createdAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates Comment props and throws if invalid
   */
  private static validate(props: CommentProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidCommentError('id cannot be empty');
    }

    // Validate postId
    if (!props.postId || props.postId.trim().length === 0) {
      throw new InvalidCommentError('postId cannot be empty');
    }

    // Validate authorId
    if (!props.authorId || props.authorId.trim().length === 0) {
      throw new InvalidCommentError('authorId cannot be empty');
    }

    // Validate parentCommentId (null is allowed, but empty string is not)
    if (props.parentCommentId !== null && props.parentCommentId.trim().length === 0) {
      throw new InvalidCommentError('parentCommentId cannot be empty string (use null instead)');
    }

    // Validate content
    const trimmedContent = props.content.trim();
    if (trimmedContent.length < MIN_CONTENT_LENGTH) {
      throw new InvalidCommentError('content cannot be empty or whitespace only');
    }
    if (props.content.length > MAX_CONTENT_LENGTH) {
      throw new InvalidCommentError(
        `content cannot exceed ${MAX_CONTENT_LENGTH} characters`
      );
    }
  }

  /**
   * Creates a new Comment entity with validation
   *
   * @param props - Comment properties
   * @returns Comment instance
   * @throws InvalidCommentError if validation fails
   */
  public static create(props: CommentProps): Comment {
    Comment.validate(props);
    return new Comment(props);
  }

  /**
   * Reconstructs a Comment entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - Comment properties from persistence
   * @returns Comment instance
   */
  public static reconstruct(props: CommentProps): Comment {
    // Still validate to ensure data integrity
    Comment.validate(props);
    return new Comment(props);
  }

  // ============ Getters ============

  /**
   * Gets the comment id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the post id this comment belongs to
   */
  public get postId(): string {
    return this._postId;
  }

  /**
   * Gets the author id
   */
  public get authorId(): string {
    return this._authorId;
  }

  /**
   * Gets the parent comment id (null for top-level comments)
   */
  public get parentCommentId(): string | null {
    return this._parentCommentId;
  }

  /**
   * Gets the content
   */
  public get content(): string {
    return this._content;
  }

  /**
   * Gets a copy of the createdAt date (immutability)
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  // ============ Domain Methods ============

  /**
   * Checks if this comment is a reply to another comment
   *
   * @returns true if parentCommentId is not null
   */
  public isReply(): boolean {
    return this._parentCommentId !== null;
  }

  /**
   * Checks if this comment is a top-level comment (not a reply)
   *
   * @returns true if parentCommentId is null
   */
  public isTopLevel(): boolean {
    return this._parentCommentId === null;
  }

  // ============ Comparison ============

  /**
   * Compares equality with another Comment by ID
   * Entities are compared by identity, not by value
   *
   * @param other - Comment to compare with
   * @returns true if IDs are equal
   */
  public equals(other: Comment): boolean {
    return this._id === other._id;
  }
}
