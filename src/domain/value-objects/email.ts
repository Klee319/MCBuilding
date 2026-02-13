/**
 * Email Value Object
 *
 * Represents an email address with validation.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const email = Email.create('user@example.com');
 * console.log(email.localPart); // 'user'
 * console.log(email.domain);    // 'example.com'
 */

/**
 * Email validation pattern (RFC 5322 simplified)
 * - Non-whitespace characters before @
 * - Non-whitespace characters after @ before .
 * - Non-whitespace characters after .
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Custom error for invalid email values
 */
export class InvalidEmailError extends Error {
  public override readonly name = 'InvalidEmailError';

  constructor(invalidValue: unknown) {
    super(`Invalid email address: "${invalidValue}"`);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidEmailError.prototype);
  }
}

/**
 * Email Value Object
 *
 * Immutable value object representing an email address.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Email {
  // Internal state
  private readonly _value: string;
  private readonly _localPart: string;
  private readonly _domain: string;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(value: string) {
    this._value = value;

    // Split email into local part and domain
    const atIndex = value.indexOf('@');
    this._localPart = value.substring(0, atIndex);
    this._domain = value.substring(atIndex + 1);

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a value is a valid email address
   *
   * @param value - Value to validate
   * @returns true if valid email address
   */
  public static isValid(value: unknown): value is string {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.trim().length === 0) {
      return false;
    }

    return EMAIL_PATTERN.test(value);
  }

  /**
   * Creates an Email instance from a string value
   *
   * @param value - The email address string
   * @returns Email instance
   * @throws InvalidEmailError if value is invalid
   */
  public static create(value: string): Email {
    if (!Email.isValid(value)) {
      throw new InvalidEmailError(value);
    }

    return new Email(value);
  }

  /**
   * Gets the full email address
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Gets the local part (before @)
   */
  public get localPart(): string {
    return this._localPart;
  }

  /**
   * Gets the domain part (after @)
   */
  public get domain(): string {
    return this._domain;
  }

  /**
   * Compares equality with another Email
   *
   * @param other - Email to compare with
   * @returns true if emails are equal (case-sensitive)
   */
  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  /**
   * Returns string representation
   *
   * @returns The email address as string
   */
  public toString(): string {
    return this._value;
  }
}
