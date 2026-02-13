/**
 * Visibility Value Object
 *
 * Represents the visibility setting for content (public, private, or unlisted).
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const visibility = Visibility.create('public');
 * const publicVis = Visibility.public();
 * const privateVis = Visibility.private();
 * const unlistedVis = Visibility.unlisted();
 */

/**
 * Valid visibility values as a readonly tuple
 */
export const VISIBILITY_VALUES = ['public', 'private', 'unlisted'] as const;

/**
 * Type representing valid visibility values
 */
export type VisibilityValue = (typeof VISIBILITY_VALUES)[number];

/**
 * Custom error for invalid visibility values
 */
export class InvalidVisibilityError extends Error {
  public override readonly name = 'InvalidVisibilityError';

  constructor(invalidValue: unknown) {
    const validOptions = VISIBILITY_VALUES.join(', ');
    super(
      `Invalid visibility value: "${invalidValue}". Valid options are: ${validOptions}`
    );

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidVisibilityError.prototype);
  }
}

/**
 * Visibility Value Object
 *
 * Immutable value object representing content visibility settings.
 * Uses private constructor pattern - instantiate via static factory methods.
 *
 * Visibility levels:
 * - public: Discoverable in search, accessible to everyone
 * - private: Not discoverable, only owner can access
 * - unlisted: Not discoverable, but accessible with direct URL
 */
export class Visibility {
  // Singleton instances for common visibilities
  private static _publicInstance: Visibility | null = null;
  private static _privateInstance: Visibility | null = null;
  private static _unlistedInstance: Visibility | null = null;

  // Internal state
  private readonly _value: VisibilityValue;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: VisibilityValue) {
    this._value = value;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid visibility
   *
   * @param value - Value to validate
   * @returns true if valid visibility value
   */
  public static isValid(value: unknown): value is VisibilityValue {
    if (typeof value !== 'string') {
      return false;
    }
    return VISIBILITY_VALUES.includes(value as VisibilityValue);
  }

  /**
   * Creates a Visibility instance from a string value
   *
   * @param value - The visibility value ('public', 'private', or 'unlisted')
   * @returns Visibility instance
   * @throws InvalidVisibilityError if value is invalid
   */
  public static create(value: string): Visibility {
    if (!Visibility.isValid(value)) {
      throw new InvalidVisibilityError(value);
    }

    // Return singleton instances
    switch (value) {
      case 'public':
        return Visibility.public();
      case 'private':
        return Visibility.private();
      case 'unlisted':
        return Visibility.unlisted();
      default:
        throw new InvalidVisibilityError(value);
    }
  }

  /**
   * Returns the Public Visibility singleton instance
   *
   * @returns Visibility instance for public
   */
  public static public(): Visibility {
    if (!Visibility._publicInstance) {
      Visibility._publicInstance = new Visibility('public');
    }
    return Visibility._publicInstance;
  }

  /**
   * Returns the Private Visibility singleton instance
   *
   * @returns Visibility instance for private
   */
  public static private(): Visibility {
    if (!Visibility._privateInstance) {
      Visibility._privateInstance = new Visibility('private');
    }
    return Visibility._privateInstance;
  }

  /**
   * Returns the Unlisted Visibility singleton instance
   *
   * @returns Visibility instance for unlisted
   */
  public static unlisted(): Visibility {
    if (!Visibility._unlistedInstance) {
      Visibility._unlistedInstance = new Visibility('unlisted');
    }
    return Visibility._unlistedInstance;
  }

  /**
   * Gets the visibility value
   */
  public get value(): VisibilityValue {
    return this._value;
  }

  /**
   * Checks if this is public visibility
   *
   * @returns true if public
   */
  public isPublic(): boolean {
    return this._value === 'public';
  }

  /**
   * Checks if this is private visibility
   *
   * @returns true if private
   */
  public isPrivate(): boolean {
    return this._value === 'private';
  }

  /**
   * Checks if this is unlisted visibility
   *
   * @returns true if unlisted
   */
  public isUnlisted(): boolean {
    return this._value === 'unlisted';
  }

  /**
   * Checks if this visibility allows content to be discovered in search
   *
   * Only public content is discoverable.
   *
   * @returns true if content can appear in search results
   */
  public isDiscoverable(): boolean {
    return this._value === 'public';
  }

  /**
   * Checks if content is accessible when someone has the URL
   *
   * Public and unlisted content can be accessed with URL.
   * Private content requires authentication as owner.
   *
   * @returns true if content can be accessed with direct URL
   */
  public isAccessibleWithUrl(): boolean {
    return this._value === 'public' || this._value === 'unlisted';
  }

  /**
   * Checks if this visibility requires a special unlisted URL for access
   *
   * Only unlisted content requires a special URL.
   *
   * @returns true if content requires unlisted URL
   */
  public requiresUnlistedUrl(): boolean {
    return this._value === 'unlisted';
  }

  /**
   * Compares equality with another Visibility
   *
   * @param other - Visibility to compare with
   * @returns true if visibilities are equal
   */
  public equals(other: Visibility): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation
   *
   * @returns The visibility value as string
   */
  public toString(): string {
    return this._value;
  }
}
