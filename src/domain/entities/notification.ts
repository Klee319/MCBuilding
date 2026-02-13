/**
 * Notification Entity
 *
 * Entity representing a notification to a user.
 * This is an immutable entity following DDD principles.
 *
 * Invariants:
 * - id cannot be empty
 * - userId cannot be empty
 * - actorId cannot be empty
 * - targetId cannot be empty
 * - type must be one of: 'like', 'comment', 'follow', 'mention'
 *
 * @example
 * const notification = Notification.create({
 *   id: 'notif-123',
 *   userId: 'user-receiver',
 *   type: 'like',
 *   actorId: 'user-actor',
 *   targetId: 'post-456',
 *   isRead: false,
 *   createdAt: new Date()
 * });
 */

/**
 * Valid notification types
 */
export type NotificationType = 'like' | 'comment' | 'follow' | 'mention';

/**
 * Array of valid notification types for validation
 */
const VALID_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'like',
  'comment',
  'follow',
  'mention',
];

/**
 * Props for creating a Notification entity
 */
export interface NotificationProps {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly actorId: string;
  readonly targetId: string;
  readonly isRead: boolean;
  readonly createdAt: Date;
}

/**
 * Custom error for invalid Notification values
 */
export class InvalidNotificationError extends Error {
  public override readonly name = 'InvalidNotificationError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidNotificationError.prototype);
  }
}

/**
 * Notification Entity
 *
 * Immutable entity representing a notification.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Notification {
  // Internal state
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _type: NotificationType;
  private readonly _actorId: string;
  private readonly _targetId: string;
  private readonly _isRead: boolean;
  private readonly _createdAt: Date;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(props: NotificationProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._type = props.type;
    this._actorId = props.actorId;
    this._targetId = props.targetId;
    this._isRead = props.isRead;
    this._createdAt = new Date(props.createdAt.getTime());

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates Notification props and throws if invalid
   */
  private static validate(props: NotificationProps): void {
    // Validate id
    if (!props.id || props.id.trim().length === 0) {
      throw new InvalidNotificationError('id cannot be empty');
    }

    // Validate userId
    if (!props.userId || props.userId.trim().length === 0) {
      throw new InvalidNotificationError('userId cannot be empty');
    }

    // Validate type
    if (!VALID_NOTIFICATION_TYPES.includes(props.type)) {
      throw new InvalidNotificationError(
        `type must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`
      );
    }

    // Validate actorId
    if (!props.actorId || props.actorId.trim().length === 0) {
      throw new InvalidNotificationError('actorId cannot be empty');
    }

    // Validate targetId
    if (!props.targetId || props.targetId.trim().length === 0) {
      throw new InvalidNotificationError('targetId cannot be empty');
    }
  }

  /**
   * Creates a new Notification entity with validation
   *
   * @param props - Notification properties
   * @returns Notification instance
   * @throws InvalidNotificationError if validation fails
   */
  public static create(props: NotificationProps): Notification {
    Notification.validate(props);
    return new Notification(props);
  }

  /**
   * Reconstructs a Notification entity from persisted data
   * Used when loading from database (assumes data was validated on creation)
   *
   * @param props - Notification properties from persistence
   * @returns Notification instance
   */
  public static reconstruct(props: NotificationProps): Notification {
    // Still validate to ensure data integrity
    Notification.validate(props);
    return new Notification(props);
  }

  // ============ Getters ============

  /**
   * Gets the notification id
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the user id (receiver of notification)
   */
  public get userId(): string {
    return this._userId;
  }

  /**
   * Gets the notification type
   */
  public get type(): NotificationType {
    return this._type;
  }

  /**
   * Gets the actor id (user who triggered the notification)
   */
  public get actorId(): string {
    return this._actorId;
  }

  /**
   * Gets the target id (post, comment, etc.)
   */
  public get targetId(): string {
    return this._targetId;
  }

  /**
   * Gets the read status
   */
  public get isRead(): boolean {
    return this._isRead;
  }

  /**
   * Gets a copy of the createdAt date (immutability)
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  // ============ Domain Methods ============

  /**
   * Creates a new Notification marked as read
   * Returns a new instance (immutability)
   *
   * @returns New Notification instance with isRead set to true
   */
  public markAsRead(): Notification {
    return new Notification({
      id: this._id,
      userId: this._userId,
      type: this._type,
      actorId: this._actorId,
      targetId: this._targetId,
      isRead: true,
      createdAt: this._createdAt,
    });
  }

  // ============ Comparison ============

  /**
   * Compares equality with another Notification by ID
   * Entities are compared by identity, not by value
   *
   * @param other - Notification to compare with
   * @returns true if IDs are equal
   */
  public equals(other: Notification): boolean {
    return this._id === other._id;
  }
}
