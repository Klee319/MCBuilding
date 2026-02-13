/**
 * Like Entity
 *
 * Entity representing a user's like on a post.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - id cannot be empty
 * - postId cannot be empty
 * - userId cannot be empty
 *
 * @example
 * const like = Like.create({
 *   id: 'like-123',
 *   postId: 'post-456',
 *   userId: 'user-789',
 *   createdAt: new Date()
 * });
 */

/**
 * Props for creating a Like entity
 */
export interface LikeProps {
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly createdAt: Date;
}

/**
 * Custom error for invalid Like values
 */
export class InvalidLikeError extends Error {
  public override readonly name = 'InvalidLikeError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidLikeError.prototype);
  }
}

/**
 * Like Entity
 *
 * Immutable entity representing a like on a post.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Like {
  // Internal state
  private readonly _id: string;
  private readonly _postId: string;
  private readonly _userId: string;
  private readonly _createdAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: LikeProps) {
    this._id = props.id;
    this._postId = props.postId;
    this._userId = props.userId;
    this._createdAt = new Date(props.createdAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates Like props and throws if invalid
   */
  private static validate(props: LikeProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidLikeError('id cannot be empty');
    }

    // Validate postId
    if (!props.postId || props.postId.trim().length === 0) {
      throw new InvalidLikeError('postId cannot be empty');
    }

    // Validate userId
    if (!props.userId || props.userId.trim().length === 0) {
      throw new InvalidLikeError('userId cannot be empty');
    }
  }

  /**
   * Creates a new Like entity with validation
   *
   * @param props - Like properties
   * @returns Like instance
   * @throws InvalidLikeError if validation fails
   */
  public static create(props: LikeProps): Like {
    Like.validate(props);
    return new Like(props);
  }

  /**
   * Reconstructs a Like entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - Like properties from persistence
   * @returns Like instance
   */
  public static reconstruct(props: LikeProps): Like {
    // Still validate to ensure data integrity
    Like.validate(props);
    return new Like(props);
  }

  // ============ Getters ============

  /**
   * Gets the like id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the post id
   */
  public get postId(): string {
    return this._postId;
  }

  /**
   * Gets the user id
   */
  public get userId(): string {
    return this._userId;
  }

  /**
   * Gets a copy of the createdAt date (immutability)
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  // ============ Comparison ============

  /**
   * Compares equality with another Like by ID
   * Entities are compared by identity, not by value
   *
   * @param other - Like to compare with
   * @returns true if IDs are equal
   */
  public equals(other: Like): boolean {
    return this._id === other._id;
  }
}
