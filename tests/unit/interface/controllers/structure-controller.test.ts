/**
 * StructureController Unit Tests
 *
 * Tests for structure-related HTTP request handling.
 * Follows TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructureController, type StructureControllerDeps } from '../../../../src/interface/controllers/structure-controller.js';
import {
  createMockContext,
  createUnauthenticatedContext,
  createMockStructure,
  createMockUsecase,
  createFailingUsecase,
  createMockRenderData,
  expectSuccessResponse,
  expectErrorResponse,
} from './test-helpers.js';

describe('StructureController', () => {
  let controller: StructureController;
  let mockDeps: StructureControllerDeps;

  // ========================================
  // Setup
  // ========================================

  beforeEach(() => {
    const mockStructure = createMockStructure();
    const mockRenderData = createMockRenderData();

    mockDeps = {
      uploadStructure: createMockUsecase(mockStructure),
      downloadStructure: createMockUsecase({
        downloadUrl: 'https://example.com/download/struct-123',
        edition: 'java',
        version: '1.20.4',
      }),
      getRenderData: createMockUsecase(mockRenderData),
    };

    controller = StructureController.create(mockDeps);
  });

  // ========================================
  // upload() Tests
  // ========================================

  describe('upload()', () => {
    it('uploads structure on success', async () => {
      // Arrange
      const fileBuffer = Buffer.from('structure-data');
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: fileBuffer,
          originalname: 'castle.schematic',
          mimetype: 'application/octet-stream',
          size: 1024,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectSuccessResponse(response, 201);
      expect(mockDeps.uploadStructure.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'castle.schematic',
          originalEdition: 'java',
          originalVersion: '1.20.4',
          uploaderId: 'user-123',
        })
      );
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('data'),
          originalname: 'castle.schematic',
          mimetype: 'application/octet-stream',
          size: 1024,
        },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 when no file provided', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        // No file
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 413 when file is too large', async () => {
      // Arrange
      const largeSize = 150 * 1024 * 1024; // 150MB, over 100MB limit
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.alloc(100), // Small buffer, but size indicates large
          originalname: 'huge-structure.schematic',
          mimetype: 'application/octet-stream',
          size: largeSize,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 413, 'FILE_TOO_LARGE');
    });

    it('returns 400 for invalid edition', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          originalEdition: 'invalid',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('data'),
          originalname: 'castle.schematic',
          mimetype: 'application/octet-stream',
          size: 1024,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for invalid file format', async () => {
      // Arrange
      mockDeps.uploadStructure = createFailingUsecase(new Error('Unsupported format'));
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('data'),
          originalname: 'castle.txt', // Invalid format
          mimetype: 'text/plain',
          size: 1024,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 400);
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.uploadStructure = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('data'),
          originalname: 'castle.schematic',
          mimetype: 'application/octet-stream',
          size: 1024,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });

    it('handles litematic format', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('litematic-data'),
          originalname: 'castle.litematic',
          mimetype: 'application/octet-stream',
          size: 2048,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles mcstructure format for bedrock', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          originalEdition: 'bedrock',
          originalVersion: '1.20.0',
        },
        file: {
          buffer: Buffer.from('mcstructure-data'),
          originalname: 'castle.mcstructure',
          mimetype: 'application/octet-stream',
          size: 2048,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });
  });

  // ========================================
  // download() Tests
  // ========================================

  describe('download()', () => {
    it('returns download URL on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.downloadUrl');
      expect(mockDeps.downloadStructure.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'struct-123',
          requestedEdition: 'java',
          requestedVersion: '1.20.4',
          requesterId: 'user-123',
        })
      );
    });

    it('returns 401 when not authenticated', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 401, 'UNAUTHORIZED');
    });

    it('returns 400 for invalid structure ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for invalid edition', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'invalid',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when structure not found', async () => {
      // Arrange
      mockDeps.downloadStructure = createFailingUsecase(new Error('Structure not found'));
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 403 when user not authorized to download', async () => {
      // Arrange
      mockDeps.downloadStructure = createFailingUsecase(new Error('Not authorized'));
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.downloadStructure = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'java',
          version: '1.20.4',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // getRenderData() Tests
  // ========================================

  describe('getRenderData()', () => {
    it('returns render data on success', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {},
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.dimensions');
      expect(response.body).toHaveProperty('data.blocks');
      expect(response.body).toHaveProperty('data.palette');
      expect(response.body).toHaveProperty('data.lodLevel');
    });

    it('applies LOD level when provided', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: { lodLevel: 'low' },
      });

      // Act
      await controller.getRenderData(ctx);

      // Assert
      expect(mockDeps.getRenderData.execute).toHaveBeenCalledWith(
        expect.objectContaining({ lodLevel: 'low' })
      );
    });

    it('works without authentication', async () => {
      // Arrange
      const ctx = createUnauthenticatedContext({
        params: { id: 'struct-123' },
        query: {},
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectSuccessResponse(response, 200);
    });

    it('returns 400 for invalid structure ID', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: '' },
        query: {},
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 400 for invalid LOD level', async () => {
      // Arrange
      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: { lodLevel: 'invalid' },
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('returns 404 when structure not found', async () => {
      // Arrange
      mockDeps.getRenderData = createFailingUsecase(new Error('Structure not found'));
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        query: {},
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('returns 500 on unexpected error', async () => {
      // Arrange
      mockDeps.getRenderData = {
        execute: vi.fn().mockRejectedValue('unexpected'),
      };
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {},
      });

      // Act
      const response = await controller.getRenderData(ctx);

      // Assert
      expectErrorResponse(response, 500, 'INTERNAL_ERROR');
    });
  });

  // ========================================
  // Edge Cases
  // ========================================

  describe('Edge Cases', () => {
    it('handles file at exactly 100MB limit', async () => {
      // Arrange
      const exactLimit = 100 * 1024 * 1024;
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.alloc(100),
          originalname: 'large.schematic',
          mimetype: 'application/octet-stream',
          size: exactLimit,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      // Should succeed at exactly the limit
      expectSuccessResponse(response, 201);
    });

    it('handles structure with unicode filename', async () => {
      // Arrange
      const ctx = createMockContext({
        body: {
          originalEdition: 'java',
          originalVersion: '1.20.4',
        },
        file: {
          buffer: Buffer.from('data'),
          originalname: 'xxxxxxxxxx_xxxx.schematic', // Simulating unicode
          mimetype: 'application/octet-stream',
          size: 1024,
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.upload(ctx);

      // Assert
      expectSuccessResponse(response, 201);
    });

    it('handles all valid LOD levels', async () => {
      // Arrange
      const lodLevels = ['full', 'high', 'medium', 'low', 'preview'];

      for (const lodLevel of lodLevels) {
        const ctx = createMockContext({
          params: { id: 'struct-123' },
          query: { lodLevel },
        });

        // Act
        const response = await controller.getRenderData(ctx);

        // Assert
        expectSuccessResponse(response, 200);
      }
    });

    it('handles download with bedrock edition', async () => {
      // Arrange
      mockDeps.downloadStructure = createMockUsecase({
        downloadUrl: 'https://example.com/download/struct-123.mcstructure',
        edition: 'bedrock',
        version: '1.20.0',
      });
      controller = StructureController.create(mockDeps);

      const ctx = createMockContext({
        params: { id: 'struct-123' },
        query: {
          edition: 'bedrock',
          version: '1.20.0',
        },
        user: { id: 'user-123' },
      });

      // Act
      const response = await controller.download(ctx);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body).toHaveProperty('data.edition', 'bedrock');
    });
  });
});
