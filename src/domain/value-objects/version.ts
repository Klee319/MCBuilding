/**
 * Version Value Object
 *
 * Represents the Minecraft version (e.g., "1.20", "1.20.4").
 * This is an immutable value object following DDD principles.
 *
 * Constraint: Only versions >= 1.12 are supported (BR-002)
 *
 * @example
 * const version = Version.create('1.20.4');
 * const v1 = Version.fromComponents(1, 20, 4);
 */

/**
 * Minimum supported version components
 */
export const MIN_SUPPORTED_MAJOR = 1;
export const MIN_SUPPORTED_MINOR = 12;

/**
 * Custom error for invalid version format
 */
export class InvalidVersionFormatError extends Error {
  public override readonly name = 'InvalidVersionFormatError';

  constructor(invalidValue: unknown) {
    super(
      `Invalid version format: "${invalidValue}". Expected format: X.Y or X.Y.Z (e.g., "1.20" or "1.20.4")`
    );

    Object.setPrototypeOf(this, InvalidVersionFormatError.prototype);
  }
}

/**
 * Custom error for unsupported version (below minimum)
 */
export class UnsupportedVersionError extends Error {
  public override readonly name = 'UnsupportedVersionError';

  constructor(version: string) {
    super(
      `Unsupported version: "${version}". Minimum supported version is 1.12`
    );

    Object.setPrototypeOf(this, UnsupportedVersionError.prototype);
  }
}

/**
 * Version format regex pattern
 * Matches: X.Y or X.Y.Z where X, Y, Z are non-negative integers without leading zeros
 * - No leading zeros (except for single 0)
 * - At least two segments (major.minor)
 * - Optional third segment (patch)
 */
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;

/**
 * Version Value Object
 *
 * Immutable value object representing Minecraft version.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class Version {
  private readonly _major: number;
  private readonly _minor: number;
  private readonly _patch: number | null;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(major: number, minor: number, patch: number | null) {
    this._major = major;
    this._minor = minor;
    this._patch = patch;

    Object.freeze(this);
  }

  /**
   * Validates if a value has valid version format (does not check support range)
   *
   * @param value - Value to validate
   * @returns true if valid format
   */
  public static isValidFormat(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return VERSION_PATTERN.test(value);
  }

  /**
   * Validates if a value is a valid and supported version
   *
   * @param value - Value to validate
   * @returns true if valid and supported version
   */
  public static isValid(value: unknown): boolean {
    if (!Version.isValidFormat(value)) {
      return false;
    }

    const match = (value as string).match(VERSION_PATTERN);
    if (!match) {
      return false;
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);

    return Version.isSupportedVersion(major, minor);
  }

  /**
   * Checks if a version is within the supported range
   *
   * @param major - Major version number
   * @param minor - Minor version number
   * @returns true if version >= 1.12
   */
  private static isSupportedVersion(major: number, minor: number): boolean {
    if (major > MIN_SUPPORTED_MAJOR) {
      return true;
    }
    if (major === MIN_SUPPORTED_MAJOR && minor >= MIN_SUPPORTED_MINOR) {
      return true;
    }
    return false;
  }

  /**
   * Validates component values are valid integers
   *
   * @param major - Major version number
   * @param minor - Minor version number
   * @param patch - Optional patch version number
   * @throws InvalidVersionFormatError if components are invalid
   */
  private static validateComponents(
    major: number,
    minor: number,
    patch?: number
  ): void {
    if (
      !Number.isInteger(major) ||
      !Number.isInteger(minor) ||
      major < 0 ||
      minor < 0
    ) {
      throw new InvalidVersionFormatError(`${major}.${minor}`);
    }

    if (patch !== undefined && (!Number.isInteger(patch) || patch < 0)) {
      throw new InvalidVersionFormatError(`${major}.${minor}.${patch}`);
    }
  }

  /**
   * Creates a Version instance from a string value
   *
   * @param value - The version string (e.g., "1.20" or "1.20.4")
   * @returns Version instance
   * @throws InvalidVersionFormatError if format is invalid
   * @throws UnsupportedVersionError if version is below 1.12
   */
  public static create(value: string): Version {
    if (!Version.isValidFormat(value)) {
      throw new InvalidVersionFormatError(value);
    }

    const match = value.match(VERSION_PATTERN);
    if (!match) {
      throw new InvalidVersionFormatError(value);
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = match[3] !== undefined ? parseInt(match[3], 10) : null;

    if (!Version.isSupportedVersion(major, minor)) {
      throw new UnsupportedVersionError(value);
    }

    return new Version(major, minor, patch);
  }

  /**
   * Creates a Version instance from component numbers
   *
   * @param major - Major version number
   * @param minor - Minor version number
   * @param patch - Optional patch version number
   * @returns Version instance
   * @throws InvalidVersionFormatError if components are invalid
   * @throws UnsupportedVersionError if version is below 1.12
   */
  public static fromComponents(
    major: number,
    minor: number,
    patch?: number
  ): Version {
    Version.validateComponents(major, minor, patch);

    if (!Version.isSupportedVersion(major, minor)) {
      const versionStr =
        patch !== undefined ? `${major}.${minor}.${patch}` : `${major}.${minor}`;
      throw new UnsupportedVersionError(versionStr);
    }

    return new Version(major, minor, patch ?? null);
  }

  /**
   * Gets the major version number
   */
  public get major(): number {
    return this._major;
  }

  /**
   * Gets the minor version number
   */
  public get minor(): number {
    return this._minor;
  }

  /**
   * Gets the patch version number (null if not specified)
   */
  public get patch(): number | null {
    return this._patch;
  }

  /**
   * Compares this version with another
   *
   * @param other - Version to compare with
   * @returns -1 if this is older, 0 if equal, 1 if this is newer
   */
  public compareTo(other: Version): number {
    // Compare major
    if (this._major !== other._major) {
      return this._major > other._major ? 1 : -1;
    }

    // Compare minor
    if (this._minor !== other._minor) {
      return this._minor > other._minor ? 1 : -1;
    }

    // Compare patch (treat null as 0)
    const thisPatch = this._patch ?? 0;
    const otherPatch = other._patch ?? 0;

    if (thisPatch !== otherPatch) {
      return thisPatch > otherPatch ? 1 : -1;
    }

    return 0;
  }

  /**
   * Checks if this version is newer than another
   *
   * @param other - Version to compare with
   * @returns true if this version is newer
   */
  public isNewerThan(other: Version): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Checks if this version is older than another
   *
   * @param other - Version to compare with
   * @returns true if this version is older
   */
  public isOlderThan(other: Version): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Checks if this version is at least as new as another
   *
   * @param other - Version to compare with
   * @returns true if this version is >= other
   */
  public isAtLeast(other: Version): boolean {
    return this.compareTo(other) >= 0;
  }

  /**
   * Checks if this version has the same major.minor as another
   *
   * @param other - Version to compare with
   * @returns true if same major and minor version
   */
  public hasSameMinorVersion(other: Version): boolean {
    return this._major === other._major && this._minor === other._minor;
  }

  /**
   * Checks equality with another Version (strict equality including patch presence)
   *
   * @param other - Version to compare with
   * @returns true if versions are exactly equal
   */
  public equals(other: Version): boolean {
    return (
      this._major === other._major &&
      this._minor === other._minor &&
      this._patch === other._patch
    );
  }

  /**
   * Returns string representation
   *
   * @returns The version as string (e.g., "1.20" or "1.20.4")
   */
  public toString(): string {
    if (this._patch === null) {
      return `${this._major}.${this._minor}`;
    }
    return `${this._major}.${this._minor}.${this._patch}`;
  }

  /**
   * Returns full string representation (always with patch)
   *
   * @returns The version as string with patch (e.g., "1.20.0")
   */
  public toFullString(): string {
    return `${this._major}.${this._minor}.${this._patch ?? 0}`;
  }
}
