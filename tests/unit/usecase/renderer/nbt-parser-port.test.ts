/**
 * NBTParserPort Tests
 *
 * Tests for the NBT parser port interface.
 * These tests verify the contract for parsing NBT data and converting to Structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NBTParserPort, ParsedNBT, StructureFormat } from '../../../../src/usecase/ports/renderer/nbt-parser-port.js';
import { PortError } from '../../../../src/usecase/ports/types.js';

// Mock implementation for testing
function createMockNBTParserPort(): NBTParserPort {
  return {
    parse: vi.fn(),
    toStructure: vi.fn(),
  };
}

describe('NBTParserPort', () => {
  let mockPort: NBTParserPort;

  beforeEach(() => {
    mockPort = createMockNBTParserPort();
  });

  describe('parse', () => {
    it('should parse valid schematic data successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: { Width: 10, Height: 5, Length: 8 },
        rawSize: 1024,
      };

      vi.mocked(mockPort.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });

      const data = new ArrayBuffer(100);
      const result = await mockPort.parse(data, 'schematic');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.format).toBe('schematic');
        expect(result.value.rawSize).toBe(1024);
      }
    });

    it('should parse valid schem data successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'schem',
        data: { Version: 2, Width: 20, Height: 10, Length: 15 },
        rawSize: 2048,
      };

      vi.mocked(mockPort.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });

      const data = new ArrayBuffer(200);
      const result = await mockPort.parse(data, 'schem');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.format).toBe('schem');
      }
    });

    it('should parse valid litematic data successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'litematic',
        data: { MinecraftDataVersion: 3218 },
        rawSize: 4096,
      };

      vi.mocked(mockPort.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });

      const data = new ArrayBuffer(300);
      const result = await mockPort.parse(data, 'litematic');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.format).toBe('litematic');
      }
    });

    it('should parse valid mcstructure data successfully', async () => {
      const mockNBT: ParsedNBT = {
        format: 'mcstructure',
        data: { format_version: 1 },
        rawSize: 512,
      };

      vi.mocked(mockPort.parse).mockResolvedValue({
        success: true,
        value: mockNBT,
      });

      const data = new ArrayBuffer(50);
      const result = await mockPort.parse(data, 'mcstructure');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.format).toBe('mcstructure');
      }
    });

    it('should return error for invalid format', async () => {
      vi.mocked(mockPort.parse).mockResolvedValue({
        success: false,
        error: new PortError('INVALID_FORMAT', 'Unsupported file format'),
      });

      const data = new ArrayBuffer(100);
      const result = await mockPort.parse(data, 'schematic');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_FORMAT');
      }
    });

    it('should return error for corrupted data', async () => {
      vi.mocked(mockPort.parse).mockResolvedValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Failed to decompress NBT data'),
      });

      const data = new ArrayBuffer(10);
      const result = await mockPort.parse(data, 'schematic');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
      }
    });

    it('should return error for empty data', async () => {
      vi.mocked(mockPort.parse).mockResolvedValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Empty data buffer'),
      });

      const data = new ArrayBuffer(0);
      const result = await mockPort.parse(data, 'schematic');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
      }
    });
  });

  describe('toStructure', () => {
    it('should convert parsed NBT to Structure successfully', () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: { Width: 10, Height: 5, Length: 8 },
        rawSize: 1024,
      };

      vi.mocked(mockPort.toStructure).mockReturnValue({
        success: true,
        value: expect.any(Object),
      });

      const result = mockPort.toStructure(mockNBT);

      expect(result.success).toBe(true);
    });

    it('should return error for invalid NBT structure', () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: {},
        rawSize: 0,
      };

      vi.mocked(mockPort.toStructure).mockReturnValue({
        success: false,
        error: new PortError('PARSE_ERROR', 'Missing required dimensions'),
      });

      const result = mockPort.toStructure(mockNBT);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
      }
    });

    it('should handle NBT with no blocks', () => {
      const mockNBT: ParsedNBT = {
        format: 'schematic',
        data: { Width: 0, Height: 0, Length: 0 },
        rawSize: 64,
      };

      vi.mocked(mockPort.toStructure).mockReturnValue({
        success: true,
        value: expect.any(Object),
      });

      const result = mockPort.toStructure(mockNBT);

      expect(result.success).toBe(true);
    });
  });
});

describe('StructureFormat type', () => {
  it('should accept valid format strings', () => {
    const formats: StructureFormat[] = ['schematic', 'schem', 'litematic', 'mcstructure'];

    expect(formats).toHaveLength(4);
    expect(formats).toContain('schematic');
    expect(formats).toContain('schem');
    expect(formats).toContain('litematic');
    expect(formats).toContain('mcstructure');
  });
});
