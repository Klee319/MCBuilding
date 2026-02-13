/**
 * GetRenderData Usecase Unit Tests
 *
 * TDD tests for the GetRenderData usecase.
 * Tests cover: success cases, structure not found, empty structureId,
 * different LOD levels.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GetRenderData,
  GetRenderDataError,
  type GetRenderDataInput,
} from '../../../../src/usecase/structure/get-render-data.js';
import type { StructureRepositoryPort } from '../../../../src/usecase/ports/repository-ports.js';
import type { RendererDataPort } from '../../../../src/usecase/ports/gateway-ports.js';
import type { RenderData, LodLevel } from '../../../../src/usecase/ports/types.js';
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
    save: vi.fn(),
    delete: vi.fn(),
    getDownloadUrl: vi.fn(),
  };
}

function createMockRendererDataPort(): RendererDataPort {
  return {
    generateRenderData: vi.fn(),
    applyResourcePack: vi.fn(),
  };
}

function createMockStructure(overrides: Partial<{
  id: string;
  originalFormat: FileFormat;
}> = {}): Structure {
  return Structure.create({
    id: overrides.id ?? 'struct-123',
    uploaderId: 'user-456',
    originalEdition: Edition.java(),
    originalVersion: Version.create('1.20.4'),
    originalFormat: overrides.originalFormat ?? FileFormat.schematic(),
    dimensions: Dimensions.create(64, 128, 64),
    blockCount: 50000,
    createdAt: new Date(),
  });
}

function createMockRenderData(overrides: Partial<RenderData> = {}): RenderData {
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0]),
    indices: new Uint32Array([0, 1, 2]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    lodLevel: 'medium' as LodLevel,
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 64, y: 128, z: 64 },
    },
    ...overrides,
  };
}

function createValidInput(overrides: Partial<GetRenderDataInput> = {}): GetRenderDataInput {
  return {
    structureId: 'struct-123',
    lodLevel: undefined,
    ...overrides,
  };
}

// ========================================
// Test Suite
// ========================================

describe('GetRenderData Usecase', () => {
  let structureRepository: StructureRepositoryPort;
  let rendererDataPort: RendererDataPort;
  let usecase: GetRenderData;

  beforeEach(() => {
    structureRepository = createMockStructureRepository();
    rendererDataPort = createMockRendererDataPort();
    usecase = GetRenderData.create(structureRepository, rendererDataPort);
  });

  // ========================================
  // Success Cases
  // ========================================

  describe('Success Cases', () => {
    it('should return render data for valid structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toEqual(mockRenderData);
      expect(result.vertices).toBeInstanceOf(Float32Array);
      expect(result.indices).toBeInstanceOf(Uint32Array);
      expect(result.uvs).toBeInstanceOf(Float32Array);
      expect(result.normals).toBeInstanceOf(Float32Array);
    });

    it('should call findById with correct structureId', async () => {
      // Arrange
      const input = createValidInput({ structureId: 'my-struct-456' });
      const mockStructure = createMockStructure({ id: 'my-struct-456' });
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      await usecase.execute(input);

      // Assert
      expect(structureRepository.findById).toHaveBeenCalledWith('my-struct-456');
      expect(structureRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should call generateRenderData with structure data', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledTimes(1);
      const calledArgs = vi.mocked(rendererDataPort.generateRenderData).mock.calls[0];
      expect(calledArgs[0]).toHaveProperty('content');
      expect(calledArgs[0]).toHaveProperty('format');
      expect(calledArgs[0].format).toEqual(mockStructure.originalFormat);
    });

    it('should return render data with correct bounding box', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 100, y: 200, z: 100 },
        },
      });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.boundingBox.min.x).toBe(0);
      expect(result.boundingBox.min.y).toBe(0);
      expect(result.boundingBox.min.z).toBe(0);
      expect(result.boundingBox.max.x).toBe(100);
      expect(result.boundingBox.max.y).toBe(200);
      expect(result.boundingBox.max.z).toBe(100);
    });
  });

  // ========================================
  // Structure Not Found
  // ========================================

  describe('Structure Not Found', () => {
    it('should throw GetRenderDataError when structure does not exist', async () => {
      // Arrange
      const input = createValidInput({ structureId: 'nonexistent-struct' });
      vi.mocked(structureRepository.findById).mockResolvedValue(null);

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetRenderDataError);
      await expect(usecase.execute(input)).rejects.toThrow('Structure not found');
    });

    it('should not call generateRenderData when structure is not found', async () => {
      // Arrange
      const input = createValidInput({ structureId: 'nonexistent-struct' });
      vi.mocked(structureRepository.findById).mockResolvedValue(null);

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(rendererDataPort.generateRenderData).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Empty structureId
  // ========================================

  describe('Empty structureId', () => {
    it('should throw GetRenderDataError when structureId is empty string', async () => {
      // Arrange
      const input = createValidInput({ structureId: '' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetRenderDataError);
      await expect(usecase.execute(input)).rejects.toThrow('structureId cannot be empty');
    });

    it('should throw GetRenderDataError when structureId is whitespace only', async () => {
      // Arrange
      const input = createValidInput({ structureId: '   ' });

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow(GetRenderDataError);
      await expect(usecase.execute(input)).rejects.toThrow('structureId cannot be empty');
    });

    it('should not call repository when structureId is empty', async () => {
      // Arrange
      const input = createValidInput({ structureId: '' });

      // Act
      try {
        await usecase.execute(input);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(structureRepository.findById).not.toHaveBeenCalled();
      expect(rendererDataPort.generateRenderData).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Different LOD Levels
  // ========================================

  describe('Different LOD Levels', () => {
    it('should pass full LOD level to generateRenderData', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: 'full' });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'full' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        'full'
      );
      expect(result.lodLevel).toBe('full');
    });

    it('should pass high LOD level to generateRenderData', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: 'high' });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'high' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        'high'
      );
      expect(result.lodLevel).toBe('high');
    });

    it('should pass medium LOD level to generateRenderData', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: 'medium' });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'medium' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        'medium'
      );
      expect(result.lodLevel).toBe('medium');
    });

    it('should pass low LOD level to generateRenderData', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: 'low' });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'low' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        'low'
      );
      expect(result.lodLevel).toBe('low');
    });

    it('should pass preview LOD level to generateRenderData', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: 'preview' });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'preview' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        'preview'
      );
      expect(result.lodLevel).toBe('preview');
    });

    it('should pass undefined LOD level for auto-detection', async () => {
      // Arrange
      const input = createValidInput({ lodLevel: undefined });
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({ lodLevel: 'medium' });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(rendererDataPort.generateRenderData).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
      // Auto-detection returns the LOD level determined by the renderer
      expect(result.lodLevel).toBe('medium');
    });
  });

  // ========================================
  // Different File Formats
  // ========================================

  describe('Different File Formats', () => {
    it('should handle schematic format structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure({
        originalFormat: FileFormat.schematic(),
      });
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      await usecase.execute(input);

      // Assert
      const calledArgs = vi.mocked(rendererDataPort.generateRenderData).mock.calls[0];
      expect(calledArgs[0].format.value).toBe('schematic');
    });

    it('should handle litematic format structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure({
        originalFormat: FileFormat.litematic(),
      });
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      await usecase.execute(input);

      // Assert
      const calledArgs = vi.mocked(rendererDataPort.generateRenderData).mock.calls[0];
      expect(calledArgs[0].format.value).toBe('litematic');
    });

    it('should handle mcstructure format structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure({
        originalFormat: FileFormat.mcstructure(),
      });
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      await usecase.execute(input);

      // Assert
      const calledArgs = vi.mocked(rendererDataPort.generateRenderData).mock.calls[0];
      expect(calledArgs[0].format.value).toBe('mcstructure');
    });
  });

  // ========================================
  // Error Propagation
  // ========================================

  describe('Error Propagation', () => {
    it('should propagate structure repository errors', async () => {
      // Arrange
      const input = createValidInput();
      vi.mocked(structureRepository.findById).mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Database connection failed');
    });

    it('should propagate renderer data port errors', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockRejectedValue(new Error('Render generation failed'));

      // Act & Assert
      await expect(usecase.execute(input)).rejects.toThrow('Render generation failed');
    });
  });

  // ========================================
  // Render Data Properties
  // ========================================

  describe('Render Data Properties', () => {
    it('should return render data with all required properties', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result).toHaveProperty('vertices');
      expect(result).toHaveProperty('indices');
      expect(result).toHaveProperty('uvs');
      expect(result).toHaveProperty('normals');
      expect(result).toHaveProperty('lodLevel');
      expect(result).toHaveProperty('boundingBox');
    });

    it('should return render data with valid bounding box structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData();

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.boundingBox).toHaveProperty('min');
      expect(result.boundingBox).toHaveProperty('max');
      expect(result.boundingBox.min).toHaveProperty('x');
      expect(result.boundingBox.min).toHaveProperty('y');
      expect(result.boundingBox.min).toHaveProperty('z');
      expect(result.boundingBox.max).toHaveProperty('x');
      expect(result.boundingBox.max).toHaveProperty('y');
      expect(result.boundingBox.max).toHaveProperty('z');
    });

    it('should return typed arrays for vertex data', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({
        vertices: new Float32Array(1000),
        indices: new Uint32Array(500),
        uvs: new Float32Array(666),
        normals: new Float32Array(1000),
      });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.vertices).toBeInstanceOf(Float32Array);
      expect(result.vertices.length).toBe(1000);
      expect(result.indices).toBeInstanceOf(Uint32Array);
      expect(result.indices.length).toBe(500);
      expect(result.uvs).toBeInstanceOf(Float32Array);
      expect(result.uvs.length).toBe(666);
      expect(result.normals).toBeInstanceOf(Float32Array);
      expect(result.normals.length).toBe(1000);
    });
  });

  // ========================================
  // Usecase Creation
  // ========================================

  describe('Usecase Creation', () => {
    it('should create usecase instance using factory method', () => {
      // Act
      const instance = GetRenderData.create(structureRepository, rendererDataPort);

      // Assert
      expect(instance).toBeInstanceOf(GetRenderData);
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('should handle structure with empty content', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({
        vertices: new Float32Array(0),
        indices: new Uint32Array(0),
        uvs: new Float32Array(0),
        normals: new Float32Array(0),
      });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.vertices.length).toBe(0);
      expect(result.indices.length).toBe(0);
    });

    it('should handle very large structure', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const largeVertexCount = 100000;
      const mockRenderData = createMockRenderData({
        vertices: new Float32Array(largeVertexCount * 3), // x, y, z per vertex
        indices: new Uint32Array(largeVertexCount),
        uvs: new Float32Array(largeVertexCount * 2), // u, v per vertex
        normals: new Float32Array(largeVertexCount * 3),
      });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.vertices.length).toBe(largeVertexCount * 3);
      expect(result.indices.length).toBe(largeVertexCount);
      expect(result.uvs.length).toBe(largeVertexCount * 2);
      expect(result.normals.length).toBe(largeVertexCount * 3);
    });

    it('should handle structure with extreme bounding box values', async () => {
      // Arrange
      const input = createValidInput();
      const mockStructure = createMockStructure();
      const mockRenderData = createMockRenderData({
        boundingBox: {
          min: { x: -1000, y: -64, z: -1000 },
          max: { x: 1000, y: 320, z: 1000 },
        },
      });

      vi.mocked(structureRepository.findById).mockResolvedValue(mockStructure);
      vi.mocked(rendererDataPort.generateRenderData).mockResolvedValue(mockRenderData);

      // Act
      const result = await usecase.execute(input);

      // Assert
      expect(result.boundingBox.min.x).toBe(-1000);
      expect(result.boundingBox.min.y).toBe(-64);
      expect(result.boundingBox.max.x).toBe(1000);
      expect(result.boundingBox.max.y).toBe(320);
    });
  });
});
