/**
 * FileFormat Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  FileFormat,
  InvalidFileFormatError,
  FILE_FORMAT_VALUES,
  type FileFormatValue,
} from '../../../../src/domain/value-objects/file-format';
import { Edition } from '../../../../src/domain/value-objects/edition';

describe('FileFormat Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('FILE_FORMAT_VALUES', () => {
    it('should contain exactly schematic, litematic, and mcstructure', () => {
      expect(FILE_FORMAT_VALUES).toEqual([
        'schematic',
        'litematic',
        'mcstructure',
      ]);
    });

    it('should be readonly array', () => {
      expect(FILE_FORMAT_VALUES.length).toBe(3);
      expect(FILE_FORMAT_VALUES).toContain('schematic');
      expect(FILE_FORMAT_VALUES).toContain('litematic');
      expect(FILE_FORMAT_VALUES).toContain('mcstructure');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('create()', () => {
    it('should create FileFormat with valid value "schematic"', () => {
      const format = FileFormat.create('schematic');

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('schematic');
    });

    it('should create FileFormat with valid value "litematic"', () => {
      const format = FileFormat.create('litematic');

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('litematic');
    });

    it('should create FileFormat with valid value "mcstructure"', () => {
      const format = FileFormat.create('mcstructure');

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('mcstructure');
    });

    it('should throw InvalidFileFormatError for invalid value', () => {
      expect(() => FileFormat.create('invalid')).toThrow(
        InvalidFileFormatError
      );
    });

    it('should throw InvalidFileFormatError for empty string', () => {
      expect(() => FileFormat.create('')).toThrow(InvalidFileFormatError);
    });

    it('should throw InvalidFileFormatError for null', () => {
      expect(() => FileFormat.create(null as unknown as string)).toThrow(
        InvalidFileFormatError
      );
    });

    it('should throw InvalidFileFormatError for undefined', () => {
      expect(() => FileFormat.create(undefined as unknown as string)).toThrow(
        InvalidFileFormatError
      );
    });

    it('should throw InvalidFileFormatError for uppercase "SCHEMATIC"', () => {
      expect(() => FileFormat.create('SCHEMATIC')).toThrow(
        InvalidFileFormatError
      );
    });

    it('should throw InvalidFileFormatError for mixed case "Schematic"', () => {
      expect(() => FileFormat.create('Schematic')).toThrow(
        InvalidFileFormatError
      );
    });

    it('should throw InvalidFileFormatError with descriptive message', () => {
      try {
        FileFormat.create('invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidFileFormatError);
        expect((error as InvalidFileFormatError).message).toContain('invalid');
        expect((error as InvalidFileFormatError).message).toContain(
          'schematic'
        );
        expect((error as InvalidFileFormatError).message).toContain(
          'litematic'
        );
        expect((error as InvalidFileFormatError).message).toContain(
          'mcstructure'
        );
      }
    });
  });

  describe('isValid()', () => {
    it('should return true for "schematic"', () => {
      expect(FileFormat.isValid('schematic')).toBe(true);
    });

    it('should return true for "litematic"', () => {
      expect(FileFormat.isValid('litematic')).toBe(true);
    });

    it('should return true for "mcstructure"', () => {
      expect(FileFormat.isValid('mcstructure')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(FileFormat.isValid('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(FileFormat.isValid('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(FileFormat.isValid(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(FileFormat.isValid(undefined as unknown as string)).toBe(false);
    });

    it('should return false for uppercase "SCHEMATIC"', () => {
      expect(FileFormat.isValid('SCHEMATIC')).toBe(false);
    });
  });

  describe('schematic()', () => {
    it('should return FileFormat with value "schematic"', () => {
      const format = FileFormat.schematic();

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('schematic');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const format1 = FileFormat.schematic();
      const format2 = FileFormat.schematic();

      expect(format1).toBe(format2);
    });
  });

  describe('litematic()', () => {
    it('should return FileFormat with value "litematic"', () => {
      const format = FileFormat.litematic();

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('litematic');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const format1 = FileFormat.litematic();
      const format2 = FileFormat.litematic();

      expect(format1).toBe(format2);
    });
  });

  describe('mcstructure()', () => {
    it('should return FileFormat with value "mcstructure"', () => {
      const format = FileFormat.mcstructure();

      expect(format).toBeInstanceOf(FileFormat);
      expect(format.value).toBe('mcstructure');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const format1 = FileFormat.mcstructure();
      const format2 = FileFormat.mcstructure();

      expect(format1).toBe(format2);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('value getter', () => {
    it('should return the file format value', () => {
      const schematic = FileFormat.create('schematic');
      const litematic = FileFormat.create('litematic');
      const mcstructure = FileFormat.create('mcstructure');

      expect(schematic.value).toBe('schematic');
      expect(litematic.value).toBe('litematic');
      expect(mcstructure.value).toBe('mcstructure');
    });

    it('should be typed as FileFormatValue', () => {
      const format = FileFormat.create('schematic');
      const value: FileFormatValue = format.value;

      expect(value).toBe('schematic');
    });
  });

  describe('getSupportedEditions()', () => {
    it('should return ["java"] for schematic format', () => {
      const format = FileFormat.schematic();

      expect(format.getSupportedEditions()).toEqual(['java']);
    });

    it('should return ["java"] for litematic format', () => {
      const format = FileFormat.litematic();

      expect(format.getSupportedEditions()).toEqual(['java']);
    });

    it('should return ["bedrock"] for mcstructure format', () => {
      const format = FileFormat.mcstructure();

      expect(format.getSupportedEditions()).toEqual(['bedrock']);
    });
  });

  describe('isCompatibleWith()', () => {
    describe('schematic format', () => {
      it('should be compatible with Java edition', () => {
        const format = FileFormat.schematic();
        const javaEdition = Edition.java();

        expect(format.isCompatibleWith(javaEdition)).toBe(true);
      });

      it('should not be compatible with Bedrock edition', () => {
        const format = FileFormat.schematic();
        const bedrockEdition = Edition.bedrock();

        expect(format.isCompatibleWith(bedrockEdition)).toBe(false);
      });
    });

    describe('litematic format', () => {
      it('should be compatible with Java edition', () => {
        const format = FileFormat.litematic();
        const javaEdition = Edition.java();

        expect(format.isCompatibleWith(javaEdition)).toBe(true);
      });

      it('should not be compatible with Bedrock edition', () => {
        const format = FileFormat.litematic();
        const bedrockEdition = Edition.bedrock();

        expect(format.isCompatibleWith(bedrockEdition)).toBe(false);
      });
    });

    describe('mcstructure format', () => {
      it('should be compatible with Bedrock edition', () => {
        const format = FileFormat.mcstructure();
        const bedrockEdition = Edition.bedrock();

        expect(format.isCompatibleWith(bedrockEdition)).toBe(true);
      });

      it('should not be compatible with Java edition', () => {
        const format = FileFormat.mcstructure();
        const javaEdition = Edition.java();

        expect(format.isCompatibleWith(javaEdition)).toBe(false);
      });
    });
  });

  describe('getExtension()', () => {
    it('should return ".schematic" for schematic format', () => {
      const format = FileFormat.schematic();

      expect(format.getExtension()).toBe('.schematic');
    });

    it('should return ".litematic" for litematic format', () => {
      const format = FileFormat.litematic();

      expect(format.getExtension()).toBe('.litematic');
    });

    it('should return ".mcstructure" for mcstructure format', () => {
      const format = FileFormat.mcstructure();

      expect(format.getExtension()).toBe('.mcstructure');
    });
  });

  describe('equals()', () => {
    it('should return true for same format values', () => {
      const format1 = FileFormat.create('schematic');
      const format2 = FileFormat.create('schematic');

      expect(format1.equals(format2)).toBe(true);
    });

    it('should return false for different format values', () => {
      const schematic = FileFormat.schematic();
      const litematic = FileFormat.litematic();

      expect(schematic.equals(litematic)).toBe(false);
    });

    it('should return true for singleton instances', () => {
      const format1 = FileFormat.schematic();
      const format2 = FileFormat.schematic();

      expect(format1.equals(format2)).toBe(true);
    });

    it('should be symmetric', () => {
      const format1 = FileFormat.create('litematic');
      const format2 = FileFormat.create('litematic');

      expect(format1.equals(format2)).toBe(format2.equals(format1));
    });

    it('should return false for different formats (schematic vs mcstructure)', () => {
      const schematic = FileFormat.schematic();
      const mcstructure = FileFormat.mcstructure();

      expect(schematic.equals(mcstructure)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return "schematic" for schematic format', () => {
      const format = FileFormat.schematic();

      expect(format.toString()).toBe('schematic');
    });

    it('should return "litematic" for litematic format', () => {
      const format = FileFormat.litematic();

      expect(format.toString()).toBe('litematic');
    });

    it('should return "mcstructure" for mcstructure format', () => {
      const format = FileFormat.mcstructure();

      expect(format.toString()).toBe('mcstructure');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const format = FileFormat.create('schematic');

      expect(Object.isFrozen(format)).toBe(true);
    });

    it('should not allow property modification', () => {
      const format = FileFormat.create('schematic');

      expect(() => {
        (format as { _value: string })._value = 'litematic';
      }).toThrow();
    });

    it('should not allow adding new properties', () => {
      const format = FileFormat.create('schematic');

      expect(() => {
        (format as Record<string, unknown>).newProp = 'value';
      }).toThrow();
    });
  });

  // ========================================
  // InvalidFileFormatError
  // ========================================
  describe('InvalidFileFormatError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidFileFormatError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidFileFormatError('test');

      expect(error.name).toBe('InvalidFileFormatError');
    });

    it('should contain the invalid value in message', () => {
      const error = new InvalidFileFormatError('invalid-format');

      expect(error.message).toContain('invalid-format');
    });

    it('should list valid options in message', () => {
      const error = new InvalidFileFormatError('wrong');

      expect(error.message).toContain('schematic');
      expect(error.message).toContain('litematic');
      expect(error.message).toContain('mcstructure');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle whitespace-padded values as invalid', () => {
      expect(() => FileFormat.create(' schematic')).toThrow(
        InvalidFileFormatError
      );
      expect(() => FileFormat.create('schematic ')).toThrow(
        InvalidFileFormatError
      );
      expect(() => FileFormat.create(' schematic ')).toThrow(
        InvalidFileFormatError
      );
    });

    it('should handle numeric input as invalid', () => {
      expect(() => FileFormat.create(123 as unknown as string)).toThrow(
        InvalidFileFormatError
      );
    });

    it('should handle object input as invalid', () => {
      expect(() => FileFormat.create({} as unknown as string)).toThrow(
        InvalidFileFormatError
      );
    });

    it('should handle array input as invalid', () => {
      expect(() =>
        FileFormat.create(['schematic'] as unknown as string)
      ).toThrow(InvalidFileFormatError);
    });

    it('should handle similar but incorrect values', () => {
      expect(() => FileFormat.create('schem')).toThrow(InvalidFileFormatError);
      expect(() => FileFormat.create('lite')).toThrow(InvalidFileFormatError);
      expect(() => FileFormat.create('structure')).toThrow(
        InvalidFileFormatError
      );
    });
  });

  // ========================================
  // Integration with Edition
  // ========================================
  describe('Integration with Edition', () => {
    it('should correctly identify Java-only formats', () => {
      const javaFormats = [FileFormat.schematic(), FileFormat.litematic()];
      const javaEdition = Edition.java();
      const bedrockEdition = Edition.bedrock();

      for (const format of javaFormats) {
        expect(format.isCompatibleWith(javaEdition)).toBe(true);
        expect(format.isCompatibleWith(bedrockEdition)).toBe(false);
      }
    });

    it('should correctly identify Bedrock-only formats', () => {
      const bedrockFormats = [FileFormat.mcstructure()];
      const javaEdition = Edition.java();
      const bedrockEdition = Edition.bedrock();

      for (const format of bedrockFormats) {
        expect(format.isCompatibleWith(bedrockEdition)).toBe(true);
        expect(format.isCompatibleWith(javaEdition)).toBe(false);
      }
    });
  });
});
