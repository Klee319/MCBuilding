/**
 * AccountLevel Value Object
 *
 * Represents user account verification level with hierarchy.
 * This is an immutable value object following DDD principles.
 *
 * Level hierarchy: guest(0) < registered(1) < verified(2) < premium(3)
 * Business Rule BR-006: registered level and above can download
 *
 * @example
 * const level = AccountLevel.create('registered');
 * const guestLevel = AccountLevel.guest();
 * const canDl = level.canDownload(); // true
 */

/**
 * Valid account level values as a readonly tuple (ordered by hierarchy)
 */
export const ACCOUNT_LEVEL_VALUES = [
  'guest',
  'registered',
  'verified',
  'premium',
] as const;

/**
 * Type representing valid account level values
 */
export type AccountLevelValue = (typeof ACCOUNT_LEVEL_VALUES)[number];

/**
 * Level index map for hierarchy comparison
 */
const LEVEL_INDEX: Record<AccountLevelValue, number> = {
  guest: 0,
  registered: 1,
  verified: 2,
  premium: 3,
};

/**
 * Custom error for invalid account level values
 */
export class InvalidAccountLevelError extends Error {
  public override readonly name = 'InvalidAccountLevelError';

  constructor(invalidValue: unknown) {
    const validOptions = ACCOUNT_LEVEL_VALUES.join(', ');
    super(
      `Invalid account level value: "${invalidValue}". Valid options are: ${validOptions}`
    );

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidAccountLevelError.prototype);
  }
}

/**
 * AccountLevel Value Object
 *
 * Immutable value object representing user account verification level.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class AccountLevel {
  // Singleton instances for each level
  private static _guestInstance: AccountLevel | null = null;
  private static _registeredInstance: AccountLevel | null = null;
  private static _verifiedInstance: AccountLevel | null = null;
  private static _premiumInstance: AccountLevel | null = null;

  // Internal state
  private readonly _value: AccountLevelValue;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: AccountLevelValue) {
    this._value = value;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid account level
   *
   * @param value - Value to validate
   * @returns true if valid account level value
   */
  public static isValid(value: unknown): value is AccountLevelValue {
    if (typeof value !== 'string') {
      return false;
    }
    return ACCOUNT_LEVEL_VALUES.includes(value as AccountLevelValue);
  }

  /**
   * Creates an AccountLevel instance from a string value
   *
   * @param value - The account level value ('guest', 'registered', 'verified', 'premium')
   * @returns AccountLevel instance
   * @throws InvalidAccountLevelError if value is invalid
   */
  public static create(value: string): AccountLevel {
    if (!AccountLevel.isValid(value)) {
      throw new InvalidAccountLevelError(value);
    }

    // Return singleton instances
    switch (value) {
      case 'guest':
        return AccountLevel.guest();
      case 'registered':
        return AccountLevel.registered();
      case 'verified':
        return AccountLevel.verified();
      case 'premium':
        return AccountLevel.premium();
      default:
        // This should never happen due to isValid check, but TypeScript needs it
        throw new InvalidAccountLevelError(value);
    }
  }

  /**
   * Returns the Guest AccountLevel singleton instance
   *
   * @returns AccountLevel instance for guest
   */
  public static guest(): AccountLevel {
    if (!AccountLevel._guestInstance) {
      AccountLevel._guestInstance = new AccountLevel('guest');
    }
    return AccountLevel._guestInstance;
  }

  /**
   * Returns the Registered AccountLevel singleton instance
   *
   * @returns AccountLevel instance for registered
   */
  public static registered(): AccountLevel {
    if (!AccountLevel._registeredInstance) {
      AccountLevel._registeredInstance = new AccountLevel('registered');
    }
    return AccountLevel._registeredInstance;
  }

  /**
   * Returns the Verified AccountLevel singleton instance
   *
   * @returns AccountLevel instance for verified
   */
  public static verified(): AccountLevel {
    if (!AccountLevel._verifiedInstance) {
      AccountLevel._verifiedInstance = new AccountLevel('verified');
    }
    return AccountLevel._verifiedInstance;
  }

  /**
   * Returns the Premium AccountLevel singleton instance
   *
   * @returns AccountLevel instance for premium
   */
  public static premium(): AccountLevel {
    if (!AccountLevel._premiumInstance) {
      AccountLevel._premiumInstance = new AccountLevel('premium');
    }
    return AccountLevel._premiumInstance;
  }

  /**
   * Gets the account level value
   */
  public get value(): AccountLevelValue {
    return this._value;
  }

  /**
   * Checks if this is guest level
   *
   * @returns true if guest level
   */
  public isGuest(): boolean {
    return this._value === 'guest';
  }

  /**
   * Checks if this is registered level
   *
   * @returns true if registered level
   */
  public isRegistered(): boolean {
    return this._value === 'registered';
  }

  /**
   * Checks if this is verified level
   *
   * @returns true if verified level
   */
  public isVerified(): boolean {
    return this._value === 'verified';
  }

  /**
   * Checks if this is premium level
   *
   * @returns true if premium level
   */
  public isPremium(): boolean {
    return this._value === 'premium';
  }

  /**
   * Checks if this level is at least the specified level (>=)
   *
   * @param level - The level to compare against
   * @returns true if this level is >= the specified level
   */
  public isAtLeast(level: AccountLevel): boolean {
    return LEVEL_INDEX[this._value] >= LEVEL_INDEX[level._value];
  }

  /**
   * Checks if this level is higher than the specified level (>)
   *
   * @param level - The level to compare against
   * @returns true if this level is > the specified level
   */
  public isHigherThan(level: AccountLevel): boolean {
    return LEVEL_INDEX[this._value] > LEVEL_INDEX[level._value];
  }

  /**
   * Checks if this level allows downloading (BR-006)
   * Business Rule: registered level and above can download
   *
   * @returns true if downloading is permitted
   */
  public canDownload(): boolean {
    return this.isAtLeast(AccountLevel.registered());
  }

  /**
   * Gets the next level for account progression
   *
   * @returns The next AccountLevel or null if already at premium
   */
  public getNextLevel(): AccountLevel | null {
    const currentIndex = LEVEL_INDEX[this._value];
    const nextIndex = currentIndex + 1;

    if (nextIndex >= ACCOUNT_LEVEL_VALUES.length) {
      return null;
    }

    const nextValue = ACCOUNT_LEVEL_VALUES[nextIndex];
    return AccountLevel.create(nextValue);
  }

  /**
   * Compares equality with another AccountLevel
   *
   * @param other - AccountLevel to compare with
   * @returns true if levels are equal
   */
  public equals(other: AccountLevel): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation
   *
   * @returns The account level value as string
   */
  public toString(): string {
    return this._value;
  }
}
