/**
 * Follow Entity
 *
 * Entity representing a follow relationship between users.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - id cannot be empty
 * - followerId cannot be empty
 * - followeeId cannot be empty
 * - followerId !== followeeId (self-follow prohibited)
 *
 * @example
 * const follow = Follow.create({
 *   id: 'follow-123',
 *   followerId: 'user-a',
 *   followeeId: 'user-b',
 *   createdAt: new Date()
 * });
 */

/**
 * Props for creating a Follow entity
 */
export interface FollowProps {
  readonly id: string;
  readonly followerId: string;
  readonly followeeId: string;
  readonly createdAt: Date;
}

/**
 * Custom error for invalid Follow values
 */
export class InvalidFollowError extends Error {
  public override readonly name = 'InvalidFollowError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidFollowError.prototype);
  }
}

/**
 * Follow Entity
 *
 * Immutable entity representing a follow relationship.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Follow {
  // Internal state
  private readonly _id: string;
  private readonly _followerId: string;
  private readonly _followeeId: string;
  private readonly _createdAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: FollowProps) {
    this._id = props.id;
    this._followerId = props.followerId;
    this._followeeId = props.followeeId;
    this._createdAt = new Date(props.createdAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates Follow props and throws if invalid
   */
  private static validate(props: FollowProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidFollowError('id cannot be empty');
    }

    // Validate followerId
    if (!props.followerId || props.followerId.trim().length === 0) {
      throw new InvalidFollowError('followerId cannot be empty');
    }

    // Validate followeeId
    if (!props.followeeId || props.followeeId.trim().length === 0) {
      throw new InvalidFollowError('followeeId cannot be empty');
    }

    // Invariant: self-follow prohibited
    if (props.followerId === props.followeeId) {
      throw new InvalidFollowError('cannot follow yourself');
    }
  }

  /**
   * Creates a new Follow entity with validation
   *
   * @param props - Follow properties
   * @returns Follow instance
   * @throws InvalidFollowError if validation fails
   */
  public static create(props: FollowProps): Follow {
    Follow.validate(props);
    return new Follow(props);
  }

  /**
   * Reconstructs a Follow entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - Follow properties from persistence
   * @returns Follow instance
   */
  public static reconstruct(props: FollowProps): Follow {
    // Still validate to ensure data integrity
    Follow.validate(props);
    return new Follow(props);
  }

  // ============ Getters ============

  /**
   * Gets the follow id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the follower id (user who follows)
   */
  public get followerId(): string {
    return this._followerId;
  }

  /**
   * Gets the followee id (user being followed)
   */
  public get followeeId(): string {
    return this._followeeId;
  }

  /**
   * Gets a copy of the createdAt date (immutability)
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  // ============ Comparison ============

  /**
   * Compares equality with another Follow by ID
   * Entities are compared by identity, not by value
   *
   * @param other - Follow to compare with
   * @returns true if IDs are equal
   */
  public equals(other: Follow): boolean {
    return this._id === other._id;
  }
}
