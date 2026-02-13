/**
 * UnlistedUrl Value Object
 *
 * Manages access tokens and expiration for unlisted (limited-access) posts.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const url = UnlistedUrl.create('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', null);
 * const generated = UnlistedUrl.generate();
 * const withExpiry = UnlistedUrl.generate(new Date('2025-12-31'));
 */

import { randomUUID } from 'node:crypto';

/**
 * Minimum required length for a valid token
 */
const MIN_TOKEN_LENGTH = 32;

/**
 * Regex pattern for valid tokens: alphanumeric only
 */
const TOKEN_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * Custom error for invalid unlisted URL tokens
 */
export class InvalidUnlistedUrlError extends Error {
  public override readonly name = 'InvalidUnlistedUrlError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, InvalidUnlistedUrlError.prototype);
  }
}

/**
 * Custom error for expired unlisted URLs
 */
export class ExpiredUnlistedUrlError extends Error {
  public override readonly name = 'ExpiredUnlistedUrlError';

  constructor(message: string) {
    super(message);

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, ExpiredUnlistedUrlError.prototype);
  }
}

/**
 * UnlistedUrl Value Object
 *
 * Immutable value object representing an unlisted access URL with an optional expiry.
 * Uses private constructor pattern - instantiate via static factory methods.
 *
 * Properties:
 * - token: A unique alphanumeric string (minimum 32 characters)
 * - expiresAt: Optional expiry date (null means no expiry)
 */
export class UnlistedUrl {
  // Internal state
  private readonly _token: string;
  private readonly _expiresAt: Date | null;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(token: string, expiresAt: Date | null) {
    this._token = token;
    this._expiresAt = expiresAt;

    // Make instance immutable
    Object.freeze(this);
  }

  /**
   * Validates if a token meets the format requirements
   *
   * Requirements:
   * - At least 32 characters
   * - Alphanumeric only (a-z, A-Z, 0-9)
   *
   * @param token - Token to validate
   * @returns true if token is valid
   */
  public static isValidToken(token: string): boolean {
    if (typeof token !== 'string') {
      return false;
    }

    if (token.length < MIN_TOKEN_LENGTH) {
      return false;
    }

    return TOKEN_PATTERN.test(token);
  }

  /**
   * Creates an UnlistedUrl instance from an existing token
   *
   * @param token - The access token (minimum 32 alphanumeric characters)
   * @param expiresAt - Optional expiry date (null for no expiry)
   * @returns UnlistedUrl instance
   * @throws InvalidUnlistedUrlError if token is invalid
   * @throws ExpiredUnlistedUrlError if expiresAt is in the past
   */
  public static create(token: string, expiresAt: Date | null): UnlistedUrl {
    // Validate token
    if (!UnlistedUrl.isValidToken(token)) {
      throw new InvalidUnlistedUrlError(
        `Invalid token: must be at least ${MIN_TOKEN_LENGTH} alphanumeric characters`
      );
    }

    // Validate expiry date is not in the past
    if (expiresAt !== null && expiresAt <= new Date()) {
      throw new ExpiredUnlistedUrlError(
        `Cannot create UnlistedUrl with past expiry date: ${expiresAt.toISOString()}`
      );
    }

    return new UnlistedUrl(token, expiresAt);
  }

  /**
   * Generates a new UnlistedUrl with a random token
   *
   * @param expiresAt - Optional expiry date (null for no expiry)
   * @returns UnlistedUrl instance with a new random token
   * @throws ExpiredUnlistedUrlError if expiresAt is in the past
   */
  public static generate(expiresAt: Date | null = null): UnlistedUrl {
    // Validate expiry date is not in the past
    if (expiresAt !== null && expiresAt <= new Date()) {
      throw new ExpiredUnlistedUrlError(
        `Cannot generate UnlistedUrl with past expiry date: ${expiresAt.toISOString()}`
      );
    }

    // Generate a random token using crypto.randomUUID
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    // Remove hyphens to get 32 alphanumeric characters
    const token = randomUUID().replace(/-/g, '');

    return new UnlistedUrl(token, expiresAt);
  }

  /**
   * Gets the access token
   */
  public get token(): string {
    return this._token;
  }

  /**
   * Gets the expiry date
   *
   * Returns a defensive copy to prevent external mutation.
   *
   * @returns Date if expiry is set, null otherwise
   */
  public get expiresAt(): Date | null {
    if (this._expiresAt === null) {
      return null;
    }
    // Return defensive copy
    return new Date(this._expiresAt.getTime());
  }

  /**
   * Checks if this URL has an expiry date
   *
   * @returns true if expiry is set
   */
  public hasExpiry(): boolean {
    return this._expiresAt !== null;
  }

  /**
   * Checks if this URL has expired
   *
   * @param now - Current time for comparison (defaults to current time)
   * @returns true if expired, false if no expiry or not yet expired
   */
  public isExpired(now: Date = new Date()): boolean {
    if (this._expiresAt === null) {
      return false;
    }
    return now >= this._expiresAt;
  }

  /**
   * Checks if this URL is valid (token format OK and not expired)
   *
   * @param now - Current time for comparison (defaults to current time)
   * @returns true if valid
   */
  public isValid(now: Date = new Date()): boolean {
    // Token format is already validated at creation time
    // So we only need to check expiry
    return !this.isExpired(now);
  }

  /**
   * Gets the remaining time until expiry
   *
   * @param now - Current time for comparison (defaults to current time)
   * @returns Remaining time in milliseconds, or null if no expiry
   */
  public getRemainingTime(now: Date = new Date()): number | null {
    if (this._expiresAt === null) {
      return null;
    }
    return this._expiresAt.getTime() - now.getTime();
  }

  /**
   * Compares equality with another UnlistedUrl
   *
   * Two UnlistedUrls are equal if they have the same token and expiry.
   *
   * @param other - UnlistedUrl to compare with
   * @returns true if equal
   */
  public equals(other: UnlistedUrl): boolean {
    if (this._token !== other._token) {
      return false;
    }

    // Both null
    if (this._expiresAt === null && other._expiresAt === null) {
      return true;
    }

    // One null, one not
    if (this._expiresAt === null || other._expiresAt === null) {
      return false;
    }

    // Compare dates
    return this._expiresAt.getTime() === other._expiresAt.getTime();
  }

  /**
   * Returns string representation
   *
   * @returns The token value
   */
  public toString(): string {
    return this._token;
  }
}
