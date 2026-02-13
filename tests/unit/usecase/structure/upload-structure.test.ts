/**
 * UploadStructure Usecase Unit Tests
 *
 * TDD tests for the UploadStructure usecase.
 * Tests cover: success cases, validation errors, parsing success with different formats.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadStructure, UploadStructureError } from '../../../../src/usecase/structure/upload-structure.js';
import type { StructureRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { StructureConverterPort } from '../../../../src/usecase/ports/gateway-ports.js';
import type { StructureMetadata } from '../../../../src/usecase/ports/types.js';
import { Structure } from '../../../../src/domain/entities/structure.js';
import { Edition } from '../../../../src/domain/value-objects/edition.js';
import { Version } from '../../../../src/domain/value-objects/version.js';
import { FileFormat } from '../../../../src/domain/value-objects/file-format.js';
import { Dimensions } from '../../../../src/domain/value-objects/dimensions.js';

// ========================================
// Mock Factory Functions
// ========================================

function createMockStructureRepository(): StructureRepositoryPort {
  return {
    findById: vi.fn(),
    save: vi.fn((structure: Structure) => Promise.resolve(structure)),
    delete: vi.fn(),
    getDownloadUrl: vi.fn(),
  };
}

function createMockStructureConverter(): StructureConverterPort {
  return {
    convert: vi.fn(),
    parseStructure: vi.fn(),
    exportStructure: vi.fn(),
    registerParsedData: vi.fn(),
  };
}

function createMockMetadata(overrides: Partial<StructureMetadata> = {}): StructureMetadata {
  return {
    dimensions: { x: 64, y: 128, z: 64 },
    blockCount: 50000,
    usedBlocks: ['minecraft:stone', 'minecraft:dirt'],
    ...overrides,
  };
}

function createValidInput(overrides: Partial<{
  file: Uint8Array;
  fileName: string;
  originalEdition: 'java' | 'bedrock';
  originalVersion: string;
  uploaderId: string;
}> = {}) {
  return {
    file: new Uint8Array([0x0a, 0x00, 0x00, 0x09]), // Mock NBT header
    fileName: 'test-structure.schematic',
    originalEdition: 'java' as const,
    originalVersion: '1.20.4',
    uploaderId: 'user-123',
    ...overrides,
  };
}

// ========================================
// Test Suite
// ========================================

describe('UploadStructure Usecase', () => {
  let structureRepository: StructureRepositoryPort;
  let structureConverter: StructureConverterPort;
  let usecase: UploadStructure;

  beforeEach(() => {
    structureRepository = createMockStructureRepository();
    structureConverter = createMockStructureConverter();
    usecase = UploadStructure.create(structureRepository, structureConverter);
  });

  // ========================================
  // Success Cases
  // ========================================

  describe('Success Cases', () => {
    it('should upload structure successfully with valid input', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toBeInstanceOf(Structure);
      expect(result.uploaderId).toBe('user-123');
      expect(result.originalEdition.value).toBe('java');
      expect(result.originalVersion.toString()).toBe('1.20.4');
      expect(result.originalFormat.value).toBe('schematic');
      expect(result.dimensions.x).toBe(64);
      expect(result.dimensions.y).toBe(128);
      expect(result.dimensions.z).toBe(64);
      expect(result.blockCount).toBe(50000);
      expect(structureRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should call parseStructure with correct file and format', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      await usecase.execute(input);

      // Assert
      expect(structureConverter.parseStructure).toHaveBeenCalledWith(
        input.file,
        expect.any(Object) // FileFormat instance
      );
      const calledFormat = vi.mocked(structureConverter.parseStructure).mock.calls[0][1];
      expect(calledFormat.value).toBe('schematic');
    });

    it('should generate unique structure ID', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.id).toMatch(/^struct-\d+-[a-z0-9]+$/);
    });

    it('should set createdAt to current time', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);
      const beforeExecution = new Date();

      // Act
      const result = await usecase.execute(input);

      // Assert
      const afterExecution = new Date();
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
    });
  });

  // ========================================
  // Validation Error Cases
  // ========================================

  describe('Validation Error Cases', () => {
    describe('Empty fileName', () => {
      it('should throw UploadStructureError when fileName is empty string', async () => {
        // Arrange
        const input = createValidInput({ fileName: '' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('fileName cannot be empty');
      });

      it('should throw UploadStructureError when fileName is whitespace only', async () => {
        // Arrange
        const input = createValidInput({ fileName: '   ' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('fileName cannot be empty');
      });
    });

    describe('Empty content (file)', () => {
      it('should throw UploadStructureError when file is empty Uint8Array', async () => {
        // Arrange
        const input = createValidInput({ file: new Uint8Array(0) });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('file cannot be empty');
      });
    });

    describe('Empty userId', () => {
      it('should throw UploadStructureError when uploaderId is empty string', async () => {
        // Arrange
        const input = createValidInput({ uploaderId: '' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('uploaderId cannot be empty');
      });

      it('should throw UploadStructureError when uploaderId is whitespace only', async () => {
        // Arrange
        const input = createValidInput({ uploaderId: '   ' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('uploaderId cannot be empty');
      });
    });

    describe('Invalid file format', () => {
      it('should throw UploadStructureError when file extension is unsupported', async () => {
        // Arrange
        const input = createValidInput({ fileName: 'test-structure.txt' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('Unsupported file format: txt');
      });

      it('should throw UploadStructureError when file extension is unknown', async () => {
        // Arrange
        const input = createValidInput({ fileName: 'test-structure.xyz' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('Unsupported file format: xyz');
      });

      it('should throw UploadStructureError when file has no extension', async () => {
        // Arrange
        const input = createValidInput({ fileName: 'test-structure' });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('Unsupported file format');
      });
    });

    describe('File size limit', () => {
      it('should throw UploadStructureError when file exceeds 100MB', async () => {
        // Arrange
        const largeFile = new Uint8Array(100 * 1024 * 1024 + 1); // 100MB + 1 byte
        const input = createValidInput({ file: largeFile });

        // Act & Assert
        await expect(usecase.execute(input)).rejects.toThrow(UploadStructureError);
        await expect(usecase.execute(input)).rejects.toThrow('File size exceeds maximum limit of 100MB');
      });

      it('should accept file at exactly 100MB', async () => {
        // Arrange
        const exactLimitFile = new Uint8Array(100 * 1024 * 1024); // Exactly 100MB
        const input = createValidInput({ file: exactLimitFile });
        const mockMetadata = createMockMetadata();
        vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

        // Act
        const result = await usecase.execute(input);

        // Assert
        expect(result).toBeInstanceOf(Structure);
      });
    });
  });

  // ========================================
  // Parsing Success with Different Formats
  // ========================================

  describe('Parsing Success with Different Formats', () => {
    it('should parse schematic format (Java Edition)', async () => {
      // Arrange
      const input = createValidInput({
        fileName: 'my-build.schematic',
        originalEdition: 'java',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalFormat.value).toBe('schematic');
      expect(result.originalEdition.value).toBe('java');
      const calledFormat = vi.mocked(structureConverter.parseStructure).mock.calls[0][1];
      expect(calledFormat).toEqual(FileFormat.schematic());
    });

    it('should parse litematic format (Java Edition)', async () => {
      // Arrange
      const input = createValidInput({
        fileName: 'my-build.litematic',
        originalEdition: 'java',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalFormat.value).toBe('litematic');
      expect(result.originalEdition.value).toBe('java');
      const calledFormat = vi.mocked(structureConverter.parseStructure).mock.calls[0][1];
      expect(calledFormat).toEqual(FileFormat.litematic());
    });

    it('should parse mcstructure format (Bedrock Edition)', async () => {
      // Arrange
      const input = createValidInput({
        fileName: 'my-build.mcstructure',
        originalEdition: 'bedrock',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalFormat.value).toBe('mcstructure');
      expect(result.originalEdition.value).toBe('bedrock');
      const calledFormat = vi.mocked(structureConverter.parseStructure).mock.calls[0][1];
      expect(calledFormat).toEqual(FileFormat.mcstructure());
    });

    it('should handle case-insensitive file extension', async () => {
      // Arrange
      const input = createValidInput({
        fileName: 'my-build.SCHEMATIC',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalFormat.value).toBe('schematic');
    });

    it('should handle mixed case file extension', async () => {
      // Arrange
      const input = createValidInput({
        fileName: 'my-build.Litematic',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalFormat.value).toBe('litematic');
    });
  });

  // ========================================
  // Edition Handling
  // ========================================

  describe('Edition Handling', () => {
    it('should create Java Edition when originalEdition is java', async () => {
      // Arrange
      const input = createValidInput({ originalEdition: 'java' });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalEdition.isJava()).toBe(true);
      expect(result.originalEdition.isBedrock()).toBe(false);
    });

    it('should create Bedrock Edition when originalEdition is bedrock', async () => {
      // Arrange
      const input = createValidInput({
        originalEdition: 'bedrock',
        fileName: 'test.mcstructure',
      });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalEdition.isBedrock()).toBe(true);
      expect(result.originalEdition.isJava()).toBe(false);
    });
  });

  // ========================================
  // Version Handling
  // ========================================

  describe('Version Handling', () => {
    it('should handle version with two segments (major.minor)', async () => {
      // Arrange
      const input = createValidInput({ originalVersion: '1.20' });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalVersion.toString()).toBe('1.20');
      expect(result.originalVersion.major).toBe(1);
      expect(result.originalVersion.minor).toBe(20);
    });

    it('should handle version with three segments (major.minor.patch)', async () => {
      // Arrange
      const input = createValidInput({ originalVersion: '1.20.4' });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalVersion.toString()).toBe('1.20.4');
      expect(result.originalVersion.major).toBe(1);
      expect(result.originalVersion.minor).toBe(20);
      expect(result.originalVersion.patch).toBe(4);
    });

    it('should handle minimum supported version (1.12)', async () => {
      // Arrange
      const input = createValidInput({ originalVersion: '1.12' });
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.originalVersion.major).toBe(1);
      expect(result.originalVersion.minor).toBe(12);
    });
  });

  // ========================================
  // Dimensions Handling
  // ========================================

  describe('Dimensions Handling', () => {
    it('should correctly set dimensions from metadata', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata({
        dimensions: { x: 100, y: 256, z: 50 },
      });
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.dimensions.x).toBe(100);
      expect(result.dimensions.y).toBe(256);
      expect(result.dimensions.z).toBe(50);
    });

    it('should handle small dimensions', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata({
        dimensions: { x: 1, y: 1, z: 1 },
      });
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.dimensions.x).toBe(1);
      expect(result.dimensions.y).toBe(1);
      expect(result.dimensions.z).toBe(1);
      expect(result.getSizeCategory()).toBe('small');
    });

    it('should handle large dimensions', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata({
        dimensions: { x: 500, y: 256, z: 500 },
      });
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.dimensions.x).toBe(500);
      expect(result.dimensions.y).toBe(256);
      expect(result.dimensions.z).toBe(500);
      expect(result.getSizeCategory()).toBe('xlarge');
    });
  });

  // ========================================
  // Repository Integration
  // ========================================

  describe('Repository Integration', () => {
    it('should pass structure to repository save method', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      // Act
      await usecase.execute(input);

      // Assert
      expect(structureRepository.save).toHaveBeenCalledTimes(1);
      const savedStructure = vi.mocked(structureRepository.save).mock.calls[0][0];
      expect(savedStructure).toBeInstanceOf(Structure);
      expect(savedStructure.uploaderId).toBe('user-123');
    });

    it('should return the structure returned by repository', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);

      const savedStructure = Structure.create({
        id: 'saved-struct-123',
        uploaderId: 'user-123',
        originalEdition: Edition.java(),
        originalVersion: Version.create('1.20.4'),
        originalFormat: FileFormat.schematic(),
        dimensions: Dimensions.create(64, 128, 64),
        blockCount: 50000,
        createdAt: new Date(),
      });
      vi.mocked(structureRepository.save).mockResolvedValue(savedStructure);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.id).toBe('saved-struct-123');
    });
  });

  // ========================================
  // Error Propagation
  // ========================================

  describe('Error Propagation', () => {
    it('should propagate repository save errors', async () => {
      // Arrange
      const input = createValidInput();
      const mockMetadata = createMockMetadata();
      vi.mocked(structureConverter.parseStructure).mockResolvedValue(mockMetadata);
      vi.mocked(structureRepository.save).mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Database connection failed');
    });

    it('should propagate structure converter parse errors', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(structureConverter.parseStructure).mockRejectedValue(new Error('Invalid NBT format'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Invalid NBT format');
    });
  });

  // ========================================
  // Usecase Creation
  // ========================================

  describe('Usecase Creation', () => {
    it('should create usecase instance using factory method', () => {
      // Act
      const instance = UploadStructure.create(structureRepository, structureConverter);

      // Assert
      expect(instance).toBeInstanceOf(UploadStructure);
    });
  });
});
