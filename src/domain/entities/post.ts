/**
 * Post Entity
 *
 * Aggregate root representing a post (structure share) in the system.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - title.length >= 1 && <= 200
 * - description.length <= 5000
 * - tags.length <= 10
 * - visibility === 'unlisted' implies unlistedUrl is required
 * - likeCount, downloadCount, commentCount >= 0
 * - createdAt <= updatedAt
 *
 * @example
 * const post = Post.create({
 *   id: 'post-123',
 *   authorId: 'user-456',
 *   structureId: 'struct-789',
 *   title: 'My Awesome Structure',
 *   description: 'A beautiful Minecraft building.',
 *   tags: [Tag.create('minecraft')],
 *   visibility: Visibility.public(),
 *   unlistedUrl: null,
 *   requiredMods: ['mod1'],
 *   likeCount: 0,
 *   downloadCount: 0,
 *   commentCount: 0,
 *   isPinned: false,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 */

import { Tag } from '../value-objects/tag.js';
import { Visibility } from '../value-objects/visibility.js';
import { UnlistedUrl } from '../value-objects/unlisted-url.js';

/**
 * Maximum length for title
 */
const MAX_TITLE_LENGTH = 200;

/**
 * Maximum length for description
 */
const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * Maximum number of tags
 */
const MAX_TAGS = 10;

/**
 * Props for creating a Post entity
 */
export interface PostProps {
  readonly id: string;
  readonly authorId: string;
  readonly structureId: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly Tag[];
  readonly visibility: Visibility;
  readonly unlistedUrl: UnlistedUrl | null;
  readonly requiredMods: readonly string[];
  readonly likeCount: number;
  readonly downloadCount: number;
  readonly commentCount: number;
  readonly isPinned: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Custom error for invalid Post values
 */
export class InvalidPostError extends Error {
  public override readonly name = 'InvalidPostError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidPostError.prototype);
  }
}

/**
 * Post Entity
 *
 * Immutable entity representing a post (shared structure).
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Post {
  // Internal state
  private readonly _id: string;
  private readonly _authorId: string;
  private readonly _structureId: string;
  private readonly _title: string;
  private readonly _description: string;
  private readonly _tags: readonly Tag[];
  private readonly _visibility: Visibility;
  private readonly _unlistedUrl: UnlistedUrl | null;
  private readonly _requiredMods: readonly string[];
  private readonly _likeCount: number;
  private readonly _downloadCount: number;
  private readonly _commentCount: number;
  private readonly _isPinned: boolean;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: PostProps) {
    this._id = props.id;
    this._authorId = props.authorId;
    this._structureId = props.structureId;
    this._title = props.title;
    this._description = props.description;
    this._tags = [...props.tags];
    this._visibility = props.visibility;
    this._unlistedUrl = props.unlistedUrl;
    this._requiredMods = [...props.requiredMods];
    this._likeCount = props.likeCount;
    this._downloadCount = props.downloadCount;
    this._commentCount = props.commentCount;
    this._isPinned = props.isPinned;
    this._createdAt = new Date(props.createdAt.getTime());
    this._updatedAt = new Date(props.updatedAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates Post props and throws if invalid
   */
  private static validate(props: PostProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidPostError('id cannot be empty');
    }

    // Validate authorId
    if (!props.authorId || props.authorId.trim().length === 0) {
      throw new InvalidPostError('authorId cannot be empty');
    }

    // Validate structureId
    if (!props.structureId || props.structureId.trim().length === 0) {
      throw new InvalidPostError('structureId cannot be empty');
    }

    // Validate title
    const trimmedTitle = props.title.trim();
    if (trimmedTitle.length === 0) {
      throw new InvalidPostError('title cannot be empty or whitespace only');
    }
    if (props.title.length > MAX_TITLE_LENGTH) {
      throw new InvalidPostError(
        `title cannot exceed ${MAX_TITLE_LENGTH} characters`
      );
    }

    // Validate description
    if (props.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new InvalidPostError(
        `description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
      );
    }

    // Validate tags
    if (props.tags.length > MAX_TAGS) {
      throw new InvalidPostError(`tags cannot exceed ${MAX_TAGS} items`);
    }

    // Validate unlistedUrl requirement
    if (props.visibility.isUnlisted() && props.unlistedUrl === null) {
      throw new InvalidPostError(
        'unlistedUrl is required when visibility is unlisted'
      );
    }

    // Validate likeCount
    if (props.likeCount < 0) {
      throw new InvalidPostError('likeCount cannot be negative');
    }

    // Validate downloadCount
    if (props.downloadCount < 0) {
      throw new InvalidPostError('downloadCount cannot be negative');
    }

    // Validate commentCount
    if (props.commentCount < 0) {
      throw new InvalidPostError('commentCount cannot be negative');
    }

    // Validate createdAt <= updatedAt
    if (props.createdAt.getTime() > props.updatedAt.getTime()) {
      throw new InvalidPostError('createdAt cannot be after updatedAt');
    }
  }

  /**
   * Creates a new Post entity with validation
   *
   * @param props - Post properties
   * @returns Post instance
   * @throws InvalidPostError if validation fails
   */
  public static create(props: PostProps): Post {
    Post.validate(props);
    return new Post(props);
  }

  /**
   * Reconstructs a Post entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - Post properties from persistence
   * @returns Post instance
   */
  public static reconstruct(props: PostProps): Post {
    // Still validate to ensure data integrity
    Post.validate(props);
    return new Post(props);
  }

  // ============ Getters ============

  /**
   * Gets the post id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the author id
   */
  public get authorId(): string {
    return this._authorId;
  }

  /**
   * Gets the structure id
   */
  public get structureId(): string {
    return this._structureId;
  }

  /**
   * Gets the title
   */
  public get title(): string {
    return this._title;
  }

  /**
   * Gets the description
   */
  public get description(): string {
    return this._description;
  }

  /**
   * Gets a copy of the tags array (immutability)
   */
  public get tags(): Tag[] {
    return [...this._tags];
  }

  /**
   * Gets the visibility value object
   */
  public get visibility(): Visibility {
    return this._visibility;
  }

  /**
   * Gets the unlisted URL value object
   */
  public get unlistedUrl(): UnlistedUrl | null {
    return this._unlistedUrl;
  }

  /**
   * Gets a copy of the required mods array (immutability)
   */
  public get requiredMods(): string[] {
    return [...this._requiredMods];
  }

  /**
   * Gets the like count
   */
  public get likeCount(): number {
    return this._likeCount;
  }

  /**
   * Gets the download count
   */
  public get downloadCount(): number {
    return this._downloadCount;
  }

  /**
   * Gets the comment count
   */
  public get commentCount(): number {
    return this._commentCount;
  }

  /**
   * Gets the pinned status
   */
  public get isPinned(): boolean {
    return this._isPinned;
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
   * Checks if the post has public visibility
   *
   * @returns true if visibility is public
   */
  public isPublic(): boolean {
    return this._visibility.isPublic();
  }

  /**
   * Checks if the post has private visibility
   *
   * @returns true if visibility is private
   */
  public isPrivate(): boolean {
    return this._visibility.isPrivate();
  }

  /**
   * Checks if the post has unlisted visibility
   *
   * @returns true if visibility is unlisted
   */
  public isUnlisted(): boolean {
    return this._visibility.isUnlisted();
  }

  /**
   * Checks if the post is accessible to a viewer
   *
   * Access rules:
   * - Public: accessible to everyone
   * - Private: accessible only to owner
   * - Unlisted: accessible to owner or anyone with correct token
   *
   * @param viewerIsOwner - Whether the viewer is the post owner
   * @param unlistedToken - Optional token for unlisted posts
   * @returns true if the post is accessible
   */
  public isAccessible(viewerIsOwner: boolean, unlistedToken?: string): boolean {
    // Owner can always access
    if (viewerIsOwner) {
      return true;
    }

    // Public posts are accessible to everyone
    if (this.isPublic()) {
      return true;
    }

    // Private posts are only accessible to owner (handled above)
    if (this.isPrivate()) {
      return false;
    }

    // Unlisted posts require correct token
    if (this.isUnlisted() && this._unlistedUrl !== null) {
      return unlistedToken === this._unlistedUrl.token;
    }

    return false;
  }

  // ============ With Methods (Immutable Updates) ============

  /**
   * Creates a copy of this Post with specified property overrides
   * Private helper to reduce duplication in with* methods
   */
  private cloneWith(overrides: Partial<PostProps>): Post {
    return Post.create({
      id: this._id,
      authorId: this._authorId,
      structureId: this._structureId,
      title: this._title,
      description: this._description,
      tags: this._tags,
      visibility: this._visibility,
      unlistedUrl: this._unlistedUrl,
      requiredMods: this._requiredMods,
      likeCount: this._likeCount,
      downloadCount: this._downloadCount,
      commentCount: this._commentCount,
      isPinned: this._isPinned,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...overrides,
    });
  }

  /**
   * Creates a new Post with updated title
   *
   * @param title - New title
   * @returns New Post instance
   * @throws InvalidPostError if title is invalid
   */
  public withTitle(title: string): Post {
    return this.cloneWith({ title });
  }

  /**
   * Creates a new Post with updated description
   *
   * @param description - New description
   * @returns New Post instance
   * @throws InvalidPostError if description is invalid
   */
  public withDescription(description: string): Post {
    return this.cloneWith({ description });
  }

  /**
   * Creates a new Post with updated visibility
   *
   * @param visibility - New visibility
   * @param unlistedUrl - Required if visibility is unlisted
   * @returns New Post instance
   * @throws InvalidPostError if unlisted visibility without URL
   */
  public withVisibility(
    visibility: Visibility,
    unlistedUrl?: UnlistedUrl
  ): Post {
    // If changing to non-unlisted, clear unlistedUrl
    const newUnlistedUrl = visibility.isUnlisted()
      ? unlistedUrl ?? null
      : null;

    return this.cloneWith({ visibility, unlistedUrl: newUnlistedUrl });
  }

  /**
   * Creates a new Post with likeCount incremented by 1
   *
   * @returns New Post instance
   */
  public incrementLikeCount(): Post {
    return this.cloneWith({ likeCount: this._likeCount + 1 });
  }

  /**
   * Creates a new Post with likeCount decremented by 1
   *
   * @returns New Post instance
   * @throws InvalidPostError if likeCount would become negative
   */
  public decrementLikeCount(): Post {
    if (this._likeCount <= 0) {
      throw new InvalidPostError('likeCount cannot be negative');
    }
    return this.cloneWith({ likeCount: this._likeCount - 1 });
  }

  /**
   * Creates a new Post with downloadCount incremented by 1
   *
   * @returns New Post instance
   */
  public incrementDownloadCount(): Post {
    return this.cloneWith({ downloadCount: this._downloadCount + 1 });
  }

  /**
   * Creates a new Post with commentCount incremented by 1
   *
   * @returns New Post instance
   */
  public incrementCommentCount(): Post {
    return this.cloneWith({ commentCount: this._commentCount + 1 });
  }

  /**
   * Creates a new Post with commentCount decremented by 1
   *
   * @returns New Post instance
   * @throws InvalidPostError if commentCount would become negative
   */
  public decrementCommentCount(): Post {
    if (this._commentCount <= 0) {
      throw new InvalidPostError('commentCount cannot be negative');
    }
    return this.cloneWith({ commentCount: this._commentCount - 1 });
  }

  // ============ Comparison ============

  /**
   * Compares equality with another Post by ID
   * Entities are compared by identity, not by value
   *
   * @param other - Post to compare with
   * @returns true if IDs are equal
   */
  public equals(other: Post): boolean {
    return this._id === other._id;
  }
}
