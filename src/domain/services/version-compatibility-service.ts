/**
 * VersionCompatibilityService Domain Service
 *
 * Determines compatibility between Minecraft versions for structure conversion.
 * This service encapsulates the business rules for version compatibility.
 *
 * Business Rules:
 * - Versions 1.12 and above are mutually convertible
 * - Same minor version conversions are always possible
 * - Recommended versions: Java 1.20.4, Bedrock 1.20.50
 */

import { Version } from '../value-objects/version.js';
import { Edition } from '../value-objects/edition.js';

/**
 * Minimum supported minor version for conversion
 */
const MIN_SUPPORTED_MINOR = 12;

/**
 * Maximum supported minor version
 */
const MAX_SUPPORTED_MINOR = 21;

/**
 * Recommended version strings by edition
 */
const RECOMMENDED_VERSIONS = {
  java: '1.20.4',
  bedrock: '1.20.50',
} as const;

/**
 * Version Compatibility Service
 *
 * Domain service that handles version compatibility checking for
 * Minecraft structure conversion operations.
 */
export class VersionCompatibilityService {
  /**
   * Cached supported versions by edition
   */
  private readonly _supportedVersionsCache: Map<string, readonly Version[]>;

  /**
   * Cached recommended versions by edition
   */
  private readonly _recommendedVersionsCache: Map<string, Version>;

  constructor() {
    this._supportedVersionsCache = new Map();
    this._recommendedVersionsCache = new Map();
  }

  /**
   * Determines if a structure can be converted between two versions.
   *
   * Conversion rules:
   * - Both versions must be 1.12 or higher (enforced by Version value object)
   * - All supported versions (1.12+) are mutually convertible
   * - Same minor version conversions are always possible
   *
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns true if conversion is possible
   */
  public canConvert(fromVersion: Version, toVersion: Version): boolean {
    // Version value objects already enforce minimum version 1.12
    // All versions >= 1.12 are mutually convertible
    return this.isInSupportedRange(fromVersion) && this.isInSupportedRange(toVersion);
  }

  /**
   * Gets all supported versions for a given edition.
   *
   * Currently returns versions from 1.12 to 1.21 for both editions.
   *
   * @param edition - The Minecraft edition
   * @returns Array of supported Version objects in ascending order
   */
  public getSupportedVersions(edition: Edition): Version[] {
    const cacheKey = edition.toString();

    // Check cache first
    const cached = this._supportedVersionsCache.get(cacheKey);
    if (cached) {
      // Return a new array to maintain immutability
      return [...cached];
    }

    // Generate supported versions
    const versions: Version[] = [];
    for (let minor = MIN_SUPPORTED_MINOR; minor <= MAX_SUPPORTED_MINOR; minor++) {
      versions.push(Version.fromComponents(1, minor));
    }

    // Cache the result (as readonly to prevent modification)
    this._supportedVersionsCache.set(cacheKey, Object.freeze(versions));

    // Return a copy
    return [...versions];
  }

  /**
   * Gets the recommended target version for a given edition.
   *
   * Recommended versions:
   * - Java Edition: 1.20.4 (stable, widely used)
   * - Bedrock Edition: 1.20.50 (latest stable)
   *
   * @param edition - The Minecraft edition
   * @returns The recommended Version for that edition
   */
  public getRecommendedVersion(edition: Edition): Version {
    const cacheKey = edition.toString();

    // Check cache first
    const cached = this._recommendedVersionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get recommended version string based on edition
    const versionString = edition.isJava()
      ? RECOMMENDED_VERSIONS.java
      : RECOMMENDED_VERSIONS.bedrock;

    // Create and cache the version
    const version = Version.create(versionString);
    this._recommendedVersionsCache.set(cacheKey, version);

    return version;
  }

  /**
   * Checks if a version is within the supported range (1.12 - 1.21)
   *
   * @param version - Version to check
   * @returns true if version is in supported range
   */
  private isInSupportedRange(version: Version): boolean {
    return (
      version.major === 1 &&
      version.minor >= MIN_SUPPORTED_MINOR &&
      version.minor <= MAX_SUPPORTED_MINOR
    );
  }
}
