/**
 * User Entity
 *
 * Aggregate root representing a user in the system.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - displayName.length >= 1 && <= 50
 * - email is a valid Email value object
 * - pinnedPostIds.length <= 5
 * - followerCount, followingCount >= 0
 * - createdAt <= updatedAt
 *
 * @example
 * const user = User.create({
 *   id: 'user-123',
 *   displayName: 'John Doe',
 *   email: Email.create('john@example.com'),
 *   accountLevel: AccountLevel.registered(),
 *   isEmailVerified: false,
 *   isPhoneVerified: false,
 *   linkedSns: ['twitter'],
 *   pinnedPostIds: [],
 *   followerCount: 0,
 *   followingCount: 0,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 */

import { Email } from '../value-objects/email.js';
import { AccountLevel } from '../value-objects/account-level.js';

/**
 * Maximum length for displayName
 */
const MAX_DISPLAY_NAME_LENGTH = 50;

/**
 * Maximum number of pinned posts
 */
const MAX_PINNED_POSTS = 5;

/**
 * Props for creating a User entity
 */
export interface UserProps {
  readonly id: string;
  readonly displayName: string;
  readonly email: Email;
  readonly accountLevel: AccountLevel;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly linkedSns: readonly string[];
  readonly pinnedPostIds: readonly string[];
  readonly followerCount: number;
  readonly followingCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Custom error for invalid User values
 */
export class InvalidUserError extends Error {
  public override readonly name = 'InvalidUserError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidUserError.prototype);
  }
}

/**
 * User Entity
 *
 * Immutable entity representing a user account.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class User {
  // Internal state
  private readonly _id: string;
  private readonly _displayName: string;
  private readonly _email: Email;
  private readonly _accountLevel: AccountLevel;
  private readonly _isEmailVerified: boolean;
  private readonly _isPhoneVerified: boolean;
  private readonly _linkedSns: readonly string[];
  private readonly _pinnedPostIds: readonly string[];
  private readonly _followerCount: number;
  private readonly _followingCount: number;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: UserProps) {
    this._id = props.id;
    this._displayName = props.displayName;
    this._email = props.email;
    this._accountLevel = props.accountLevel;
    this._isEmailVerified = props.isEmailVerified;
    this._isPhoneVerified = props.isPhoneVerified;
    this._linkedSns = [...props.linkedSns];
    this._pinnedPostIds = [...props.pinnedPostIds];
    this._followerCount = props.followerCount;
    this._followingCount = props.followingCount;
    this._createdAt = new Date(props.createdAt.getTime());
    this._updatedAt = new Date(props.updatedAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates User props and throws if invalid
   */
  private static validate(props: UserProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidUserError('id cannot be empty');
    }

    // Validate displayName
    const trimmedDisplayName = props.displayName.trim();
    if (trimmedDisplayName.length === 0) {
      throw new InvalidUserError('displayName cannot be empty or whitespace only');
    }
    if (props.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new InvalidUserError(
        `displayName cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`
      );
    }

    // Validate pinnedPostIds
    if (props.pinnedPostIds.length > MAX_PINNED_POSTS) {
      throw new InvalidUserError(
        `pinnedPostIds cannot exceed ${MAX_PINNED_POSTS} items`
      );
    }

    // Validate followerCount
    if (props.followerCount < 0) {
      throw new InvalidUserError('followerCount cannot be negative');
    }

    // Validate followingCount
    if (props.followingCount < 0) {
      throw new InvalidUserError('followingCount cannot be negative');
    }

    // Validate createdAt <= updatedAt
    if (props.createdAt.getTime() > props.updatedAt.getTime()) {
      throw new InvalidUserError('createdAt cannot be after updatedAt');
    }
  }

  /**
   * Creates a new User entity with validation
   *
   * @param props - User properties
   * @returns User instance
   * @throws InvalidUserError if validation fails
   */
  public static create(props: UserProps): User {
    User.validate(props);
    return new User(props);
  }

  /**
   * Reconstructs a User entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - User properties from persistence
   * @returns User instance
   */
  public static reconstruct(props: UserProps): User {
    // Still validate to ensure data integrity
    User.validate(props);
    return new User(props);
  }

  // ============ Getters ============

  /**
   * Gets the user id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the display name
   */
  public get displayName(): string {
    return this._displayName;
  }

  /**
   * Gets the email value object
   */
  public get email(): Email {
    return this._email;
  }

  /**
   * Gets the account level value object
   */
  public get accountLevel(): AccountLevel {
    return this._accountLevel;
  }

  /**
   * Gets the email verification status
   */
  public get isEmailVerified(): boolean {
    return this._isEmailVerified;
  }

  /**
   * Gets the phone verification status
   */
  public get isPhoneVerified(): boolean {
    return this._isPhoneVerified;
  }

  /**
   * Gets a copy of the linked SNS array (immutability)
   */
  public get linkedSns(): string[] {
    return [...this._linkedSns];
  }

  /**
   * Gets a copy of the pinned post IDs array (immutability)
   */
  public get pinnedPostIds(): string[] {
    return [...this._pinnedPostIds];
  }

  /**
   * Gets the follower count
   */
  public get followerCount(): number {
    return this._followerCount;
  }

  /**
   * Gets the following count
   */
  public get followingCount(): number {
    return this._followingCount;
  }

  /**
   * Gets a copy of the createdAt date (immutability)
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * Gets a copy of the updatedAt date (immutability)
   */
  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ============ Domain Methods ============

  /**
   * Checks if the user can download content
   * Delegates to AccountLevel.canDownload()
   *
   * @returns true if user can download
   */
  public canDownload(): boolean {
    return this._accountLevel.canDownload();
  }

  /**
   * Checks if the user can pin a post
   * Returns true if under 5 pinned posts or if postId is already pinned
   *
   * @param postId - The post ID to check
   * @returns true if the post can be pinned
   */
  public canPinPost(postId: string): boolean {
    // Already pinned - idempotent operation allowed
    if (this._pinnedPostIds.includes(postId)) {
      return true;
    }
    // Can pin if under max limit
    return this._pinnedPostIds.length < MAX_PINNED_POSTS;
  }

  // ============ With Methods (Immutable Updates) ============

  /**
   * Creates a copy of this User with specified property overrides
   * Private helper to reduce duplication in with* methods
   */
  private cloneWith(overrides: Partial<UserProps>): User {
    return User.create({
      id: this._id,
      displayName: this._displayName,
      email: this._email,
      accountLevel: this._accountLevel,
      isEmailVerified: this._isEmailVerified,
      isPhoneVerified: this._isPhoneVerified,
      linkedSns: this._linkedSns,
      pinnedPostIds: this._pinnedPostIds,
      followerCount: this._followerCount,
      followingCount: this._followingCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...overrides,
    });
  }

  /**
   * Creates a new User with updated displayName
   *
   * @param name - New display name
   * @returns New User instance
   * @throws InvalidUserError if name is invalid
   */
  public withDisplayName(name: string): User {
    return this.cloneWith({ displayName: name });
  }

  /**
   * Creates a new User with updated accountLevel
   *
   * @param level - New account level
   * @returns New User instance
   */
  public withAccountLevel(level: AccountLevel): User {
    return this.cloneWith({ accountLevel: level });
  }

  /**
   * Creates a new User with email verified
   *
   * @returns New User instance with isEmailVerified set to true
   */
  public withEmailVerified(): User {
    return this.cloneWith({ isEmailVerified: true });
  }

  /**
   * Creates a new User with phone verified
   *
   * @returns New User instance with isPhoneVerified set to true
   */
  public withPhoneVerified(): User {
    return this.cloneWith({ isPhoneVerified: true });
  }

  /**
   * Creates a new User with a post added to pinned posts
   * Idempotent: if postId is already pinned, returns clone without modification
   *
   * @param postId - The post ID to pin
   * @returns New User instance
   * @throws InvalidUserError if adding would exceed max pinned posts
   */
  public withPinnedPost(postId: string): User {
    // Already pinned - return clone without adding duplicate
    if (this._pinnedPostIds.includes(postId)) {
      return this.cloneWith({});
    }

    // Check if we can add
    if (this._pinnedPostIds.length >= MAX_PINNED_POSTS) {
      throw new InvalidUserError(
        `pinnedPostIds cannot exceed ${MAX_PINNED_POSTS} items`
      );
    }

    return this.cloneWith({ pinnedPostIds: [...this._pinnedPostIds, postId] });
  }

  /**
   * Creates a new User with a post removed from pinned posts
   *
   * @param postId - The post ID to unpin
   * @returns New User instance
   */
  public withoutPinnedPost(postId: string): User {
    return this.cloneWith({
      pinnedPostIds: this._pinnedPostIds.filter((id) => id !== postId),
    });
  }

  // ============ Comparison ============

  /**
   * Compares equality with another User by ID
   * Entities are compared by identity, not by value
   *
   * @param other - User to compare with
   * @returns true if IDs are equal
   */
  public equals(other: User): boolean {
    return this._id === other._id;
  }
}
