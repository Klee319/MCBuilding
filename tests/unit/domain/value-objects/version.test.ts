/**
 * Version Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * Represents Minecraft version (e.g., "1.20", "1.20.4")
 * Constraint: Only versions >= 1.12 are supported (BR-002)
 */
import { describe, it, expect } from 'vitest';
import {
  Version,
  InvalidVersionFormatError,
  UnsupportedVersionError,
} from '../../../../src/domain/value-objects/version';

describe('Version Value Object', () => {
  // ========================================
  // Constants and Basic Validation
  // ========================================
  describe('Minimum supported version', () => {
    it('should support version 1.12 (minimum)', () => {
      const version = Version.create('1.12');
      expect(version).toBeInstanceOf(Version);
      expect(version.major).toBe(1);
      expect(version.minor).toBe(12);
    });

    it('should support version 1.12.0', () => {
      const version = Version.create('1.12.0');
      expect(version).toBeInstanceOf(Version);
      expect(version.major).toBe(1);
      expect(version.minor).toBe(12);
      expect(version.patch).toBe(0);
    });

    it('should reject version 1.11 (below minimum)', () => {
      expect(() => Version.create('1.11')).toThrow(UnsupportedVersionError);
    });

    it('should reject version 1.11.2 (below minimum)', () => {
      expect(() => Version.create('1.11.2')).toThrow(UnsupportedVersionError);
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create Version with major.minor format', () => {
      const version = Version.create('1.20');

      expect(version).toBeInstanceOf(Version);
      expect(version.major).toBe(1);
      expect(version.minor).toBe(20);
      expect(version.patch).toBeNull();
    });

    it('should create Version with major.minor.patch format', () => {
      const version = Version.create('1.20.4');

      expect(version).toBeInstanceOf(Version);
      expect(version.major).toBe(1);
      expect(version.minor).toBe(20);
      expect(version.patch).toBe(4);
    });

    it('should handle patch version 0', () => {
      const version = Version.create('1.20.0');

      expect(version.patch).toBe(0);
    });

    it('should throw InvalidVersionFormatError for invalid format', () => {
      expect(() => Version.create('invalid')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for empty string', () => {
      expect(() => Version.create('')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for null', () => {
      expect(() => Version.create(null as unknown as string)).toThrow(
        InvalidVersionFormatError
      );
    });

    it('should throw InvalidVersionFormatError for undefined', () => {
      expect(() => Version.create(undefined as unknown as string)).toThrow(
        InvalidVersionFormatError
      );
    });

    it('should throw InvalidVersionFormatError for single number', () => {
      expect(() => Version.create('1')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for too many segments', () => {
      expect(() => Version.create('1.20.4.1')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for negative numbers', () => {
      expect(() => Version.create('-1.20')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create('1.-20')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create('1.20.-1')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for non-integer values', () => {
      expect(() => Version.create('1.20.5.5')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create('1.20a')).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for leading zeros', () => {
      expect(() => Version.create('01.20')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create('1.020')).toThrow(InvalidVersionFormatError);
    });

    it('should throw UnsupportedVersionError for versions below 1.12', () => {
      expect(() => Version.create('1.0')).toThrow(UnsupportedVersionError);
      expect(() => Version.create('0.15')).toThrow(UnsupportedVersionError);
    });
  });

  describe('fromComponents()', () => {
    it('should create Version from major and minor', () => {
      const version = Version.fromComponents(1, 20);

      expect(version.major).toBe(1);
      expect(version.minor).toBe(20);
      expect(version.patch).toBeNull();
    });

    it('should create Version from major, minor, and patch', () => {
      const version = Version.fromComponents(1, 20, 4);

      expect(version.major).toBe(1);
      expect(version.minor).toBe(20);
      expect(version.patch).toBe(4);
    });

    it('should accept patch value of 0', () => {
      const version = Version.fromComponents(1, 20, 0);

      expect(version.patch).toBe(0);
    });

    it('should throw UnsupportedVersionError for unsupported version', () => {
      expect(() => Version.fromComponents(1, 11)).toThrow(UnsupportedVersionError);
      expect(() => Version.fromComponents(0, 15)).toThrow(UnsupportedVersionError);
    });

    it('should throw InvalidVersionFormatError for negative numbers', () => {
      expect(() => Version.fromComponents(-1, 20)).toThrow(InvalidVersionFormatError);
      expect(() => Version.fromComponents(1, -20)).toThrow(InvalidVersionFormatError);
      expect(() => Version.fromComponents(1, 20, -1)).toThrow(InvalidVersionFormatError);
    });

    it('should throw InvalidVersionFormatError for non-integer values', () => {
      expect(() => Version.fromComponents(1.5, 20)).toThrow(InvalidVersionFormatError);
      expect(() => Version.fromComponents(1, 20.5)).toThrow(InvalidVersionFormatError);
      expect(() => Version.fromComponents(1, 20, 4.5)).toThrow(InvalidVersionFormatError);
    });
  });

  describe('isValidFormat()', () => {
    it('should return true for valid major.minor format', () => {
      expect(Version.isValidFormat('1.20')).toBe(true);
      expect(Version.isValidFormat('1.12')).toBe(true);
    });

    it('should return true for valid major.minor.patch format', () => {
      expect(Version.isValidFormat('1.20.4')).toBe(true);
      expect(Version.isValidFormat('1.12.0')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(Version.isValidFormat('invalid')).toBe(false);
      expect(Version.isValidFormat('')).toBe(false);
      expect(Version.isValidFormat('1')).toBe(false);
      expect(Version.isValidFormat('1.20.4.1')).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(Version.isValidFormat('-1.20')).toBe(false);
      expect(Version.isValidFormat('1.-20')).toBe(false);
    });

    it('should return false for leading zeros', () => {
      expect(Version.isValidFormat('01.20')).toBe(false);
      expect(Version.isValidFormat('1.020')).toBe(false);
    });

    it('should return true even for unsupported versions (format only)', () => {
      // isValidFormat only checks format, not support range
      expect(Version.isValidFormat('1.0')).toBe(true);
      expect(Version.isValidFormat('0.15')).toBe(true);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid supported versions', () => {
      expect(Version.isValid('1.20')).toBe(true);
      expect(Version.isValid('1.20.4')).toBe(true);
      expect(Version.isValid('1.12')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(Version.isValid('invalid')).toBe(false);
      expect(Version.isValid('')).toBe(false);
    });

    it('should return false for unsupported versions', () => {
      expect(Version.isValid('1.11')).toBe(false);
      expect(Version.isValid('1.0')).toBe(false);
      expect(Version.isValid('0.15')).toBe(false);
    });
  });

  // ========================================
  // Getters
  // ========================================
  describe('major getter', () => {
    it('should return the major version number', () => {
      const version = Version.create('1.20.4');
      expect(version.major).toBe(1);
    });
  });

  describe('minor getter', () => {
    it('should return the minor version number', () => {
      const version = Version.create('1.20.4');
      expect(version.minor).toBe(20);
    });
  });

  describe('patch getter', () => {
    it('should return the patch version number when present', () => {
      const version = Version.create('1.20.4');
      expect(version.patch).toBe(4);
    });

    it('should return null when patch is not specified', () => {
      const version = Version.create('1.20');
      expect(version.patch).toBeNull();
    });

    it('should return 0 when patch is explicitly 0', () => {
      const version = Version.create('1.20.0');
      expect(version.patch).toBe(0);
    });
  });

  // ========================================
  // Comparison Methods
  // ========================================
  describe('compareTo()', () => {
    it('should return 0 for equal versions', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20');

      expect(v1.compareTo(v2)).toBe(0);
    });

    it('should return 0 for equal versions with patch', () => {
      const v1 = Version.create('1.20.4');
      const v2 = Version.create('1.20.4');

      expect(v1.compareTo(v2)).toBe(0);
    });

    it('should return 1 when this is newer (higher major)', () => {
      const v1 = Version.create('2.0');
      const v2 = Version.create('1.20');

      expect(v1.compareTo(v2)).toBe(1);
    });

    it('should return -1 when this is older (lower major)', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('2.0');

      expect(v1.compareTo(v2)).toBe(-1);
    });

    it('should return 1 when this is newer (higher minor)', () => {
      const v1 = Version.create('1.21');
      const v2 = Version.create('1.20');

      expect(v1.compareTo(v2)).toBe(1);
    });

    it('should return -1 when this is older (lower minor)', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.compareTo(v2)).toBe(-1);
    });

    it('should return 1 when this is newer (higher patch)', () => {
      const v1 = Version.create('1.20.4');
      const v2 = Version.create('1.20.1');

      expect(v1.compareTo(v2)).toBe(1);
    });

    it('should return -1 when this is older (lower patch)', () => {
      const v1 = Version.create('1.20.1');
      const v2 = Version.create('1.20.4');

      expect(v1.compareTo(v2)).toBe(-1);
    });

    it('should treat missing patch as 0 for comparison', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20.0');

      expect(v1.compareTo(v2)).toBe(0);
    });

    it('should treat version with patch as newer than without when patch > 0', () => {
      const v1 = Version.create('1.20.1');
      const v2 = Version.create('1.20');

      expect(v1.compareTo(v2)).toBe(1);
    });
  });

  describe('isNewerThan()', () => {
    it('should return true when this version is newer', () => {
      const v1 = Version.create('1.21');
      const v2 = Version.create('1.20');

      expect(v1.isNewerThan(v2)).toBe(true);
    });

    it('should return false when this version is older', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.isNewerThan(v2)).toBe(false);
    });

    it('should return false when versions are equal', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20');

      expect(v1.isNewerThan(v2)).toBe(false);
    });
  });

  describe('isOlderThan()', () => {
    it('should return true when this version is older', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.isOlderThan(v2)).toBe(true);
    });

    it('should return false when this version is newer', () => {
      const v1 = Version.create('1.21');
      const v2 = Version.create('1.20');

      expect(v1.isOlderThan(v2)).toBe(false);
    });

    it('should return false when versions are equal', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20');

      expect(v1.isOlderThan(v2)).toBe(false);
    });
  });

  describe('isAtLeast()', () => {
    it('should return true when this version is newer', () => {
      const v1 = Version.create('1.21');
      const v2 = Version.create('1.20');

      expect(v1.isAtLeast(v2)).toBe(true);
    });

    it('should return true when versions are equal', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20');

      expect(v1.isAtLeast(v2)).toBe(true);
    });

    it('should return false when this version is older', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.isAtLeast(v2)).toBe(false);
    });
  });

  describe('hasSameMinorVersion()', () => {
    it('should return true for same major and minor', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20.4');

      expect(v1.hasSameMinorVersion(v2)).toBe(true);
    });

    it('should return false for different minor', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.hasSameMinorVersion(v2)).toBe(false);
    });

    it('should return false for different major', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('2.20');

      expect(v1.hasSameMinorVersion(v2)).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should return true for equal versions', () => {
      const v1 = Version.create('1.20.4');
      const v2 = Version.create('1.20.4');

      expect(v1.equals(v2)).toBe(true);
    });

    it('should return false for different versions', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.21');

      expect(v1.equals(v2)).toBe(false);
    });

    it('should distinguish between 1.20 and 1.20.0', () => {
      const v1 = Version.create('1.20');
      const v2 = Version.create('1.20.0');

      // They compare as equal but are stored differently
      expect(v1.equals(v2)).toBe(false);
      expect(v1.compareTo(v2)).toBe(0);
    });

    it('should be symmetric', () => {
      const v1 = Version.create('1.20.4');
      const v2 = Version.create('1.20.4');

      expect(v1.equals(v2)).toBe(v2.equals(v1));
    });
  });

  // ========================================
  // String Methods
  // ========================================
  describe('toString()', () => {
    it('should return "1.20" for version without patch', () => {
      const version = Version.create('1.20');

      expect(version.toString()).toBe('1.20');
    });

    it('should return "1.20.4" for version with patch', () => {
      const version = Version.create('1.20.4');

      expect(version.toString()).toBe('1.20.4');
    });

    it('should return "1.20.0" for version with patch 0', () => {
      const version = Version.create('1.20.0');

      expect(version.toString()).toBe('1.20.0');
    });
  });

  describe('toFullString()', () => {
    it('should always include patch even if not specified', () => {
      const version = Version.create('1.20');

      expect(version.toFullString()).toBe('1.20.0');
    });

    it('should return same as toString for version with patch', () => {
      const version = Version.create('1.20.4');

      expect(version.toFullString()).toBe('1.20.4');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const version = Version.create('1.20.4');

      expect(Object.isFrozen(version)).toBe(true);
    });

    it('should not allow property modification', () => {
      const version = Version.create('1.20.4');

      expect(() => {
        (version as { _major: number })._major = 2;
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const version = Version.create('1.20.4');

      expect(() => {
        (version as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // Custom Errors
  // ========================================
  describe('InvalidVersionFormatError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidVersionFormatError('invalid');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidVersionFormatError('invalid');

      expect(error.name).toBe('InvalidVersionFormatError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidVersionFormatError('bad-version');

      expect(error.message).toContain('bad-version');
    });

    it('should describe expected format in message', () => {
      const error = new InvalidVersionFormatError('test');

      expect(error.message).toMatch(/X\.Y|major\.minor/i);
    });
  });

  describe('UnsupportedVersionError', () => {
    it('should be an instance of Error', () => {
      const error = new UnsupportedVersionError('1.11');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new UnsupportedVersionError('1.11');

      expect(error.name).toBe('UnsupportedVersionError');
    });

    it('should contain the version in message', () => {
      const error = new UnsupportedVersionError('1.11');

      expect(error.message).toContain('1.11');
    });

    it('should mention minimum supported version', () => {
      const error = new UnsupportedVersionError('1.11');

      expect(error.message).toContain('1.12');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace-padded values as invalid', () => {
      expect(() => Version.create(' 1.20')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create('1.20 ')).toThrow(InvalidVersionFormatError);
      expect(() => Version.create(' 1.20 ')).toThrow(InvalidVersionFormatError);
    });

    it('should handle numeric input as invalid', () => {
      expect(() => Version.create(120 as unknown as string)).toThrow(
        InvalidVersionFormatError
      );
    });

    it('should handle object input as invalid', () => {
      expect(() => Version.create({} as unknown as string)).toThrow(
        InvalidVersionFormatError
      );
    });

    it('should handle array input as invalid', () => {
      expect(() => Version.create(['1.20'] as unknown as string)).toThrow(
        InvalidVersionFormatError
      );
    });

    it('should handle very large version numbers', () => {
      const version = Version.create('1.999.999');

      expect(version.major).toBe(1);
      expect(version.minor).toBe(999);
      expect(version.patch).toBe(999);
    });

    it('should handle version 2.0 (future major version)', () => {
      const version = Version.create('2.0');

      expect(version.major).toBe(2);
      expect(version.minor).toBe(0);
    });
  });

  // ========================================
  // Real Minecraft Version Examples
  // ========================================
  describe('Real Minecraft Versions', () => {
    const validVersions = [
      '1.12',
      '1.12.2',
      '1.13',
      '1.14.4',
      '1.15.2',
      '1.16.5',
      '1.17.1',
      '1.18.2',
      '1.19.4',
      '1.20',
      '1.20.4',
      '1.21',
    ];

    validVersions.forEach((versionStr) => {
      it(`should accept real Minecraft version ${versionStr}`, () => {
        const version = Version.create(versionStr);
        expect(version).toBeInstanceOf(Version);
        expect(version.toString()).toBe(versionStr);
      });
    });

    it('should correctly compare Minecraft versions', () => {
      const v1_12 = Version.create('1.12');
      const v1_16 = Version.create('1.16');
      const v1_20 = Version.create('1.20');
      const v1_20_4 = Version.create('1.20.4');

      expect(v1_12.isOlderThan(v1_16)).toBe(true);
      expect(v1_16.isOlderThan(v1_20)).toBe(true);
      expect(v1_20.isOlderThan(v1_20_4)).toBe(true);
      expect(v1_20_4.isNewerThan(v1_12)).toBe(true);
    });
  });
});
