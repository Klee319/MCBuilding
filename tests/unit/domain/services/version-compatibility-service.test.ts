/**
 * VersionCompatibilityService Domain Service Tests
 *
 * TDD tests for version compatibility checking between Minecraft versions.
 */

import { describe, it, expect } from 'vitest';
import { VersionCompatibilityService } from '../../../../src/domain/services/version-compatibility-service';
import { Version } from '../../../../src/domain/value-objects/version';
import { Edition } from '../../../../src/domain/value-objects/edition';

describe('VersionCompatibilityService', () => {
  describe('canConvert', () => {
    describe('basic conversion between 1.12+ versions', () => {
      it('returns true when both versions are 1.12 or higher', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.12');
        const to = Version.create('1.20');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });

      it('returns true for same version conversion', () => {
        const service = new VersionCompatibilityService();
        const version = Version.create('1.20.4');

        const result = service.canConvert(version, version);

        expect(result).toBe(true);
      });

      it('returns true for downgrade from newer to older (both 1.12+)', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.21');
        const to = Version.create('1.12');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });

      it('returns true for conversion between patch versions', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.20.1');
        const to = Version.create('1.20.4');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });
    });

    describe('same edition minor version compatibility', () => {
      it('returns true for minor version differences in same edition (always compatible)', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.20.1');
        const to = Version.create('1.20.4');

        // Same minor version conversions should always be possible
        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });

      it('returns true when only patch differs', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.19');
        const to = Version.create('1.19.4');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('returns true for minimum supported version boundary', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.12');
        const to = Version.create('1.12');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });

      it('returns true for maximum supported version (1.21)', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.21');
        const to = Version.create('1.21');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });

      it('returns true for cross-major-minor conversion within supported range', () => {
        const service = new VersionCompatibilityService();
        const from = Version.create('1.13.2');
        const to = Version.create('1.18.1');

        const result = service.canConvert(from, to);

        expect(result).toBe(true);
      });
    });
  });

  describe('getSupportedVersions', () => {
    describe('Java Edition', () => {
      it('returns versions from 1.12 to 1.21 for Java Edition', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const versions = service.getSupportedVersions(edition);

        expect(versions.length).toBeGreaterThan(0);
        // First version should be 1.12
        expect(versions[0].major).toBe(1);
        expect(versions[0].minor).toBe(12);
        // Last version should be 1.21
        const lastVersion = versions[versions.length - 1];
        expect(lastVersion.major).toBe(1);
        expect(lastVersion.minor).toBe(21);
      });

      it('returns versions in ascending order', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const versions = service.getSupportedVersions(edition);

        for (let i = 1; i < versions.length; i++) {
          expect(versions[i].isNewerThan(versions[i - 1])).toBe(true);
        }
      });

      it('returns 10 versions for Java (1.12 through 1.21)', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const versions = service.getSupportedVersions(edition);

        expect(versions.length).toBe(10);
      });
    });

    describe('Bedrock Edition', () => {
      it('returns versions from 1.12 to 1.21 for Bedrock Edition', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.bedrock();

        const versions = service.getSupportedVersions(edition);

        expect(versions.length).toBeGreaterThan(0);
        expect(versions[0].major).toBe(1);
        expect(versions[0].minor).toBe(12);
        const lastVersion = versions[versions.length - 1];
        expect(lastVersion.major).toBe(1);
        expect(lastVersion.minor).toBe(21);
      });

      it('returns versions in ascending order', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.bedrock();

        const versions = service.getSupportedVersions(edition);

        for (let i = 1; i < versions.length; i++) {
          expect(versions[i].isNewerThan(versions[i - 1])).toBe(true);
        }
      });
    });

    describe('immutability', () => {
      it('returns a new array each time (not a reference)', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const versions1 = service.getSupportedVersions(edition);
        const versions2 = service.getSupportedVersions(edition);

        expect(versions1).not.toBe(versions2);
        expect(versions1).toEqual(versions2);
      });
    });
  });

  describe('getRecommendedVersion', () => {
    describe('Java Edition', () => {
      it('returns 1.20.4 for Java Edition', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const recommended = service.getRecommendedVersion(edition);

        expect(recommended.toString()).toBe('1.20.4');
      });

      it('returned version is immutable', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const recommended = service.getRecommendedVersion(edition);

        expect(Object.isFrozen(recommended)).toBe(true);
      });
    });

    describe('Bedrock Edition', () => {
      it('returns 1.20.50 for Bedrock Edition', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.bedrock();

        const recommended = service.getRecommendedVersion(edition);

        expect(recommended.toString()).toBe('1.20.50');
      });

      it('returned version is immutable', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.bedrock();

        const recommended = service.getRecommendedVersion(edition);

        expect(Object.isFrozen(recommended)).toBe(true);
      });
    });

    describe('consistency', () => {
      it('returns same recommended version on multiple calls for Java', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.java();

        const first = service.getRecommendedVersion(edition);
        const second = service.getRecommendedVersion(edition);

        expect(first.equals(second)).toBe(true);
      });

      it('returns same recommended version on multiple calls for Bedrock', () => {
        const service = new VersionCompatibilityService();
        const edition = Edition.bedrock();

        const first = service.getRecommendedVersion(edition);
        const second = service.getRecommendedVersion(edition);

        expect(first.equals(second)).toBe(true);
      });
    });
  });

  describe('service instance', () => {
    it('can be instantiated without parameters', () => {
      const service = new VersionCompatibilityService();

      expect(service).toBeInstanceOf(VersionCompatibilityService);
    });

    it('multiple instances behave consistently', () => {
      const service1 = new VersionCompatibilityService();
      const service2 = new VersionCompatibilityService();
      const version = Version.create('1.20');

      expect(service1.canConvert(version, version)).toBe(
        service2.canConvert(version, version)
      );
    });
  });

  describe('version range boundaries', () => {
    it('returns false for versions above max supported (1.22+)', () => {
      const service = new VersionCompatibilityService();
      // Version.create would accept 1.22, but canConvert should reject it
      const from = Version.fromComponents(1, 22);
      const to = Version.create('1.20');

      const result = service.canConvert(from, to);

      expect(result).toBe(false);
    });

    it('returns false when target version is above max supported', () => {
      const service = new VersionCompatibilityService();
      const from = Version.create('1.20');
      const to = Version.fromComponents(1, 25);

      const result = service.canConvert(from, to);

      expect(result).toBe(false);
    });

    it('returns false when both versions are above max supported', () => {
      const service = new VersionCompatibilityService();
      const from = Version.fromComponents(1, 30);
      const to = Version.fromComponents(1, 35);

      const result = service.canConvert(from, to);

      expect(result).toBe(false);
    });

    it('returns true for boundary version 1.21 (max supported)', () => {
      const service = new VersionCompatibilityService();
      const from = Version.create('1.21');
      const to = Version.create('1.20');

      const result = service.canConvert(from, to);

      expect(result).toBe(true);
    });
  });

  describe('caching behavior', () => {
    it('uses cache for repeated getSupportedVersions calls', () => {
      const service = new VersionCompatibilityService();
      const edition = Edition.java();

      // First call populates cache
      const versions1 = service.getSupportedVersions(edition);
      // Second call uses cache
      const versions2 = service.getSupportedVersions(edition);

      // Results should be equal but different array instances
      expect(versions1).toEqual(versions2);
      expect(versions1).not.toBe(versions2);
    });

    it('caches recommended versions for performance', () => {
      const service = new VersionCompatibilityService();
      const edition = Edition.bedrock();

      // Multiple calls should return same cached instance
      const v1 = service.getRecommendedVersion(edition);
      const v2 = service.getRecommendedVersion(edition);

      // Same instance returned from cache
      expect(v1).toBe(v2);
    });
  });

  describe('all supported version pairs', () => {
    it('verifies all pairs of supported versions are convertible', () => {
      const service = new VersionCompatibilityService();
      const versions = service.getSupportedVersions(Edition.java());

      // Test all pairs
      for (const from of versions) {
        for (const to of versions) {
          expect(service.canConvert(from, to)).toBe(true);
        }
      }
    });
  });
});
