/**
 * Structure Entity Unit Tests
 *
 * Tests for the Structure entity following TDD methodology.
 * Structure represents metadata for Minecraft building data.
 */

import { describe, it, expect } from 'vitest';
import { Structure, InvalidStructureError } from '../../../../src/domain/entities/structure';
import { Edition } from '../../../../src/domain/value-objects/edition';
import { Version } from '../../../../src/domain/value-objects/version';
import { FileFormat } from '../../../../src/domain/value-objects/file-format';
import { Dimensions, type SizeCategoryValue } from '../../../../src/domain/value-objects/dimensions';

describe('Structure Entity', () => {
  // Test data factory
  const createValidProps = (overrides?: Partial<{
    id: string;
    uploaderId: string;
    originalEdition: Edition;
    originalVersion: Version;
    originalFormat: FileFormat;
    dimensions: Dimensions;
    blockCount: number;
    createdAt: Date;
  }>) => ({
    id: 'structure-123',
    uploaderId: 'user-456',
    originalEdition: Edition.java(),
    originalVersion: Version.create('1.20.4'),
    originalFormat: FileFormat.schematic(),
    dimensions: Dimensions.create(64, 128, 64),
    blockCount: 50000,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  });

  describe('Structure.create', () => {
    it('creates a Structure with valid properties', () => {
      const props = createValidProps();

      const structure = Structure.create(props);

      expect(structure.id).toBe('structure-123');
      expect(structure.uploaderId).toBe('user-456');
      expect(structure.originalEdition.value).toBe('java');
      expect(structure.originalVersion.toString()).toBe('1.20.4');
      expect(structure.originalFormat.value).toBe('schematic');
      expect(structure.dimensions.toString()).toBe('64x128x64');
      expect(structure.blockCount).toBe(50000);
      expect(structure.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('creates a Structure with Bedrock edition and mcstructure format', () => {
      const props = createValidProps({
        originalEdition: Edition.bedrock(),
        originalFormat: FileFormat.mcstructure(),
      });

      const structure = Structure.create(props);

      expect(structure.originalEdition.value).toBe('bedrock');
      expect(structure.originalFormat.value).toBe('mcstructure');
    });

    it('creates a Structure with litematic format', () => {
      const props = createValidProps({
        originalFormat: FileFormat.litematic(),
      });

      const structure = Structure.create(props);

      expect(structure.originalFormat.value).toBe('litematic');
    });

    it('creates a Structure with zero block count', () => {
      const props = createValidProps({ blockCount: 0 });

      const structure = Structure.create(props);

      expect(structure.blockCount).toBe(0);
    });

    it('throws InvalidStructureError for empty id', () => {
      const props = createValidProps({ id: '' });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('id cannot be empty');
    });

    it('throws InvalidStructureError for empty uploaderId', () => {
      const props = createValidProps({ uploaderId: '' });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('uploaderId cannot be empty');
    });

    it('throws InvalidStructureError for negative block count', () => {
      const props = createValidProps({ blockCount: -1 });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('blockCount must be non-negative');
    });

    it('throws InvalidStructureError for NaN block count', () => {
      const props = createValidProps({ blockCount: NaN });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('blockCount must be a valid integer');
    });

    it('throws InvalidStructureError for non-integer block count', () => {
      const props = createValidProps({ blockCount: 100.5 });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('blockCount must be a valid integer');
    });

    it('throws InvalidStructureError for Infinity block count', () => {
      const props = createValidProps({ blockCount: Infinity });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
      expect(() => Structure.create(props)).toThrow('blockCount must be a valid integer');
    });
  });

  describe('Structure.reconstruct', () => {
    it('reconstructs a Structure from database data without validation', () => {
      const props = createValidProps();

      const structure = Structure.reconstruct(props);

      expect(structure.id).toBe('structure-123');
      expect(structure.uploaderId).toBe('user-456');
    });

    it('allows reconstruct to bypass validation for legacy data', () => {
      // reconstruct trusts the data source (e.g., database)
      const props = createValidProps();

      const structure = Structure.reconstruct(props);

      expect(structure).toBeInstanceOf(Structure);
    });
  });

  describe('Immutability', () => {
    it('returns frozen Structure instance', () => {
      const props = createValidProps();

      const structure = Structure.create(props);

      expect(Object.isFrozen(structure)).toBe(true);
    });

    it('does not expose mutable internal state', () => {
      const props = createValidProps();
      const structure = Structure.create(props);

      // Attempting to mutate should not affect the original
      const createdAt = structure.createdAt;
      createdAt.setFullYear(2000);

      expect(structure.createdAt.getFullYear()).toBe(2024);
    });
  });

  describe('getSizeCategory', () => {
    it('returns "small" for dimensions with maxSide <= 50', () => {
      const props = createValidProps({
        dimensions: Dimensions.create(30, 50, 40),
      });

      const structure = Structure.create(props);

      expect(structure.getSizeCategory()).toBe('small');
    });

    it('returns "medium" for dimensions with maxSide <= 100', () => {
      const props = createValidProps({
        dimensions: Dimensions.create(60, 100, 80),
      });

      const structure = Structure.create(props);

      expect(structure.getSizeCategory()).toBe('medium');
    });

    it('returns "large" for dimensions with maxSide <= 200', () => {
      const props = createValidProps({
        dimensions: Dimensions.create(150, 200, 180),
      });

      const structure = Structure.create(props);

      expect(structure.getSizeCategory()).toBe('large');
    });

    it('returns "xlarge" for dimensions with maxSide > 200', () => {
      const props = createValidProps({
        dimensions: Dimensions.create(300, 250, 400),
      });

      const structure = Structure.create(props);

      expect(structure.getSizeCategory()).toBe('xlarge');
    });
  });

  describe('isCompatibleWithEdition', () => {
    describe('when original format is schematic (Java)', () => {
      it('returns true for Java edition', () => {
        const props = createValidProps({
          originalEdition: Edition.java(),
          originalFormat: FileFormat.schematic(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.java())).toBe(true);
      });

      it('returns false for Bedrock edition', () => {
        const props = createValidProps({
          originalEdition: Edition.java(),
          originalFormat: FileFormat.schematic(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.bedrock())).toBe(false);
      });
    });

    describe('when original format is litematic (Java)', () => {
      it('returns true for Java edition', () => {
        const props = createValidProps({
          originalEdition: Edition.java(),
          originalFormat: FileFormat.litematic(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.java())).toBe(true);
      });

      it('returns false for Bedrock edition', () => {
        const props = createValidProps({
          originalEdition: Edition.java(),
          originalFormat: FileFormat.litematic(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.bedrock())).toBe(false);
      });
    });

    describe('when original format is mcstructure (Bedrock)', () => {
      it('returns true for Bedrock edition', () => {
        const props = createValidProps({
          originalEdition: Edition.bedrock(),
          originalFormat: FileFormat.mcstructure(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.bedrock())).toBe(true);
      });

      it('returns false for Java edition', () => {
        const props = createValidProps({
          originalEdition: Edition.bedrock(),
          originalFormat: FileFormat.mcstructure(),
        });
        const structure = Structure.create(props);

        expect(structure.isCompatibleWithEdition(Edition.java())).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('returns true for Structures with the same id', () => {
      const props1 = createValidProps({ id: 'same-id' });
      const props2 = createValidProps({
        id: 'same-id',
        blockCount: 99999, // Different property
      });

      const structure1 = Structure.create(props1);
      const structure2 = Structure.create(props2);

      expect(structure1.equals(structure2)).toBe(true);
    });

    it('returns false for Structures with different ids', () => {
      const props1 = createValidProps({ id: 'id-1' });
      const props2 = createValidProps({ id: 'id-2' });

      const structure1 = Structure.create(props1);
      const structure2 = Structure.create(props2);

      expect(structure1.equals(structure2)).toBe(false);
    });

    it('returns true when comparing a Structure to itself', () => {
      const structure = Structure.create(createValidProps());

      expect(structure.equals(structure)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace-only id as invalid', () => {
      const props = createValidProps({ id: '   ' });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
    });

    it('handles whitespace-only uploaderId as invalid', () => {
      const props = createValidProps({ uploaderId: '   ' });

      expect(() => Structure.create(props)).toThrow(InvalidStructureError);
    });

    it('handles minimum valid dimensions (1x1x1)', () => {
      const props = createValidProps({
        dimensions: Dimensions.create(1, 1, 1),
        blockCount: 1,
      });

      const structure = Structure.create(props);

      expect(structure.dimensions.volume).toBe(1);
      expect(structure.getSizeCategory()).toBe('small');
    });

    it('handles large block counts', () => {
      const props = createValidProps({ blockCount: 1000000000 });

      const structure = Structure.create(props);

      expect(structure.blockCount).toBe(1000000000);
    });

    it('preserves exact createdAt timestamp', () => {
      const timestamp = new Date('2023-06-15T14:30:45.123Z');
      const props = createValidProps({ createdAt: timestamp });

      const structure = Structure.create(props);

      expect(structure.createdAt.toISOString()).toBe('2023-06-15T14:30:45.123Z');
    });
  });

  describe('InvalidStructureError', () => {
    it('has correct error name', () => {
      try {
        Structure.create(createValidProps({ id: '' }));
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStructureError);
        expect((error as InvalidStructureError).name).toBe('InvalidStructureError');
      }
    });

    it('supports instanceof check', () => {
      try {
        Structure.create(createValidProps({ blockCount: -1 }));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error instanceof InvalidStructureError).toBe(true);
        expect(error instanceof Error).toBe(true);
      }
    });
  });
});
