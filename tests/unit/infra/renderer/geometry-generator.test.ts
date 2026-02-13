/**
 * Geometry Generator Unit Tests
 *
 * Tests for UV mapping and geometry generation for non-full blocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Three.js module
const mockBufferGeometry = vi.fn().mockImplementation(() => ({
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  setIndex: vi.fn(),
  translate: vi.fn().mockReturnThis(),
  rotateX: vi.fn().mockReturnThis(),
  rotateY: vi.fn().mockReturnThis(),
  rotateZ: vi.fn().mockReturnThis(),
  computeVertexNormals: vi.fn(),
  dispose: vi.fn(),
  clone: vi.fn().mockReturnThis(),
}));

// Create mock BoxGeometry that returns proper UV structure
const createMockBoxGeometry = (width: number, height: number, depth: number) => {
  // Standard BoxGeometry has 24 vertices (4 per face * 6 faces)
  // UV array has 48 values (24 vertices * 2 components)
  const uvArray = new Float32Array(48);
  // Initialize with standard BoxGeometry UV pattern
  // Face order: east(+X), west(-X), top(+Y), bottom(-Y), south(+Z), north(-Z)
  // Each face: [bl_u, bl_v, br_u, br_v, tl_u, tl_v, tr_u, tr_v]
  for (let face = 0; face < 6; face++) {
    const base = face * 8;
    uvArray[base + 0] = 0; uvArray[base + 1] = 0; // bottom-left
    uvArray[base + 2] = 1; uvArray[base + 3] = 0; // bottom-right
    uvArray[base + 4] = 0; uvArray[base + 5] = 1; // top-left
    uvArray[base + 6] = 1; uvArray[base + 7] = 1; // top-right
  }

  const positionArray = new Float32Array(72); // 24 vertices * 3 components
  const normalArray = new Float32Array(72);

  return {
    setAttribute: vi.fn(),
    getAttribute: vi.fn().mockImplementation((name: string) => {
      if (name === 'uv') {
        return {
          array: uvArray,
          count: 24,
          needsUpdate: false,
          getX: (i: number) => uvArray[i * 2],
          getY: (i: number) => uvArray[i * 2 + 1],
        };
      }
      if (name === 'position') {
        return {
          array: positionArray,
          count: 24,
          getX: (i: number) => positionArray[i * 3],
          getY: (i: number) => positionArray[i * 3 + 1],
          getZ: (i: number) => positionArray[i * 3 + 2],
        };
      }
      if (name === 'normal') {
        return {
          array: normalArray,
          count: 24,
          getX: (i: number) => normalArray[i * 3],
          getY: (i: number) => normalArray[i * 3 + 1],
          getZ: (i: number) => normalArray[i * 3 + 2],
        };
      }
      return null;
    }),
    getIndex: vi.fn().mockReturnValue({
      count: 36,
      getX: vi.fn().mockReturnValue(0),
    }),
    setIndex: vi.fn(),
    translate: vi.fn().mockReturnThis(),
    rotateX: vi.fn().mockReturnThis(),
    rotateY: vi.fn().mockReturnThis(),
    rotateZ: vi.fn().mockReturnThis(),
    computeVertexNormals: vi.fn(),
    dispose: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    _width: width,
    _height: height,
    _depth: depth,
    _uvArray: uvArray,
  };
};

const mockFloat32BufferAttribute = vi.fn().mockImplementation((array: number[], itemSize: number) => ({
  array: new Float32Array(array),
  count: array.length / itemSize,
  itemSize,
  needsUpdate: false,
  getX: (i: number) => array[i * itemSize],
  getY: (i: number) => array[i * itemSize + 1],
  getZ: itemSize === 3 ? (i: number) => array[i * itemSize + 2] : undefined,
}));

const mockThree = {
  BufferGeometry: mockBufferGeometry,
  BoxGeometry: vi.fn().mockImplementation(createMockBoxGeometry),
  Float32BufferAttribute: mockFloat32BufferAttribute,
};

// Import after setting up mocks
vi.mock('three', () => mockThree);

import {
  boxesToGeometryWithFaceTracking,
  applyFaceUVsToMergedGeometry,
  type FaceRange,
  type UVMapping,
} from '../../../../src/infra/renderer/geometry-generator';

describe('geometry-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('boxesToGeometryWithFaceTracking', () => {
    it('returns empty geometry and face ranges for empty boxes array', () => {
      const result = boxesToGeometryWithFaceTracking([], mockThree as any);

      expect(result.geometry).toBeDefined();
      expect(result.faceRanges).toHaveLength(0);
    });

    it('returns 6 face ranges for a single box', () => {
      const boxes = [{ from: [0, 0, 0] as [number, number, number], to: [16, 16, 16] as [number, number, number] }];

      const result = boxesToGeometryWithFaceTracking(boxes, mockThree as any);

      expect(result.faceRanges).toHaveLength(6);
      expect(result.faceRanges.map(fr => fr.face)).toEqual([
        'east', 'west', 'top', 'bottom', 'south', 'north'
      ]);
      expect(result.faceRanges.every(fr => fr.boxIndex === 0)).toBe(true);
    });

    it('returns 12 face ranges for two boxes', () => {
      const boxes = [
        { from: [0, 0, 0] as [number, number, number], to: [16, 8, 16] as [number, number, number] },
        { from: [0, 8, 8] as [number, number, number], to: [16, 16, 16] as [number, number, number] },
      ];

      const result = boxesToGeometryWithFaceTracking(boxes, mockThree as any);

      expect(result.faceRanges).toHaveLength(12);

      // First box faces
      const box0Faces = result.faceRanges.filter(fr => fr.boxIndex === 0);
      expect(box0Faces).toHaveLength(6);

      // Second box faces
      const box1Faces = result.faceRanges.filter(fr => fr.boxIndex === 1);
      expect(box1Faces).toHaveLength(6);
    });

    it('correctly calculates face range indices for multi-box geometry', () => {
      const boxes = [
        { from: [0, 0, 0] as [number, number, number], to: [16, 8, 16] as [number, number, number] },
        { from: [0, 8, 8] as [number, number, number], to: [16, 16, 16] as [number, number, number] },
      ];

      const result = boxesToGeometryWithFaceTracking(boxes, mockThree as any);

      // Box 0: vertices 0-23 (24 vertices per box)
      const box0Faces = result.faceRanges.filter(fr => fr.boxIndex === 0);
      expect(box0Faces[0].startIndex).toBe(0);  // east face starts at vertex 0
      expect(box0Faces[0].endIndex).toBe(3);    // east face ends at vertex 3

      // Box 1: vertices 24-47
      const box1Faces = result.faceRanges.filter(fr => fr.boxIndex === 1);
      expect(box1Faces[0].startIndex).toBe(24); // east face of box 1 starts at vertex 24
      expect(box1Faces[0].endIndex).toBe(27);   // east face of box 1 ends at vertex 27
    });
  });

  describe('applyFaceUVsToMergedGeometry', () => {
    it('applies correct UVs to single box geometry', () => {
      // Create a mock merged geometry with UV attribute
      const uvArray = new Float32Array(48);
      const mockGeometry = {
        getAttribute: vi.fn().mockImplementation((name: string) => {
          if (name === 'uv') {
            return {
              array: uvArray,
              needsUpdate: false,
            };
          }
          return null;
        }),
      };

      const faceRanges: FaceRange[] = [
        { startIndex: 0, endIndex: 3, face: 'east', boxIndex: 0 },
        { startIndex: 4, endIndex: 7, face: 'west', boxIndex: 0 },
        { startIndex: 8, endIndex: 11, face: 'top', boxIndex: 0 },
        { startIndex: 12, endIndex: 15, face: 'bottom', boxIndex: 0 },
        { startIndex: 16, endIndex: 19, face: 'south', boxIndex: 0 },
        { startIndex: 20, endIndex: 23, face: 'north', boxIndex: 0 },
      ];

      const faceUVs: UVMapping = { u1: 0.0, v1: 0.0, u2: 0.0625, v2: 0.0625 }; // 16x16 tile in 256x256 atlas
      const faceUVsByBox = [{
        top: faceUVs,
        bottom: faceUVs,
        north: faceUVs,
        south: faceUVs,
        east: faceUVs,
        west: faceUVs,
      }];

      applyFaceUVsToMergedGeometry(mockGeometry as any, faceRanges, faceUVsByBox);

      // Check that east face (vertices 0-3) got correct UVs
      // Vertex order: bottom-left, bottom-right, top-left, top-right
      expect(uvArray[0]).toBeCloseTo(0.0);      // bl_u
      expect(uvArray[1]).toBeCloseTo(0.9375);   // bl_v = 1 - 0.0625
      expect(uvArray[2]).toBeCloseTo(0.0625);   // br_u
      expect(uvArray[3]).toBeCloseTo(0.9375);   // br_v
      expect(uvArray[4]).toBeCloseTo(0.0);      // tl_u
      expect(uvArray[5]).toBeCloseTo(1.0);      // tl_v = 1 - 0
      expect(uvArray[6]).toBeCloseTo(0.0625);   // tr_u
      expect(uvArray[7]).toBeCloseTo(1.0);      // tr_v
    });

    it('applies different UVs to each face', () => {
      const uvArray = new Float32Array(48);
      const mockGeometry = {
        getAttribute: vi.fn().mockImplementation((name: string) => {
          if (name === 'uv') {
            return {
              array: uvArray,
              needsUpdate: false,
            };
          }
          return null;
        }),
      };

      const faceRanges: FaceRange[] = [
        { startIndex: 0, endIndex: 3, face: 'east', boxIndex: 0 },
        { startIndex: 4, endIndex: 7, face: 'west', boxIndex: 0 },
        { startIndex: 8, endIndex: 11, face: 'top', boxIndex: 0 },
        { startIndex: 12, endIndex: 15, face: 'bottom', boxIndex: 0 },
        { startIndex: 16, endIndex: 19, face: 'south', boxIndex: 0 },
        { startIndex: 20, endIndex: 23, face: 'north', boxIndex: 0 },
      ];

      const topUV: UVMapping = { u1: 0.0, v1: 0.0, u2: 0.0625, v2: 0.0625 };
      const sideUV: UVMapping = { u1: 0.0625, v1: 0.0, u2: 0.125, v2: 0.0625 };
      const bottomUV: UVMapping = { u1: 0.125, v1: 0.0, u2: 0.1875, v2: 0.0625 };

      const faceUVsByBox = [{
        top: topUV,
        bottom: bottomUV,
        north: sideUV,
        south: sideUV,
        east: sideUV,
        west: sideUV,
      }];

      applyFaceUVsToMergedGeometry(mockGeometry as any, faceRanges, faceUVsByBox);

      // Check top face (vertices 8-11) got correct top UVs
      const topBaseIndex = 8 * 2; // 16
      expect(uvArray[topBaseIndex]).toBeCloseTo(0.0);     // u1
      expect(uvArray[topBaseIndex + 2]).toBeCloseTo(0.0625); // u2

      // Check east face (vertices 0-3) got correct side UVs
      expect(uvArray[0]).toBeCloseTo(0.0625);  // u1 for side
      expect(uvArray[2]).toBeCloseTo(0.125);   // u2 for side

      // Check bottom face (vertices 12-15) got correct bottom UVs
      const bottomBaseIndex = 12 * 2; // 24
      expect(uvArray[bottomBaseIndex]).toBeCloseTo(0.125);    // u1 for bottom
      expect(uvArray[bottomBaseIndex + 2]).toBeCloseTo(0.1875); // u2 for bottom
    });

    it('correctly handles multi-box geometry UV application', () => {
      // 96 values for 2 boxes (48 per box)
      const uvArray = new Float32Array(96);
      const mockGeometry = {
        getAttribute: vi.fn().mockImplementation((name: string) => {
          if (name === 'uv') {
            return {
              array: uvArray,
              needsUpdate: false,
            };
          }
          return null;
        }),
      };

      // Face ranges for 2 boxes
      const faceRanges: FaceRange[] = [
        // Box 0
        { startIndex: 0, endIndex: 3, face: 'east', boxIndex: 0 },
        { startIndex: 4, endIndex: 7, face: 'west', boxIndex: 0 },
        { startIndex: 8, endIndex: 11, face: 'top', boxIndex: 0 },
        { startIndex: 12, endIndex: 15, face: 'bottom', boxIndex: 0 },
        { startIndex: 16, endIndex: 19, face: 'south', boxIndex: 0 },
        { startIndex: 20, endIndex: 23, face: 'north', boxIndex: 0 },
        // Box 1
        { startIndex: 24, endIndex: 27, face: 'east', boxIndex: 1 },
        { startIndex: 28, endIndex: 31, face: 'west', boxIndex: 1 },
        { startIndex: 32, endIndex: 35, face: 'top', boxIndex: 1 },
        { startIndex: 36, endIndex: 39, face: 'bottom', boxIndex: 1 },
        { startIndex: 40, endIndex: 43, face: 'south', boxIndex: 1 },
        { startIndex: 44, endIndex: 47, face: 'north', boxIndex: 1 },
      ];

      const faceUV: UVMapping = { u1: 0.0, v1: 0.0, u2: 0.0625, v2: 0.0625 };
      const faceUVsByBox = [
        { top: faceUV, bottom: faceUV, north: faceUV, south: faceUV, east: faceUV, west: faceUV },
        { top: faceUV, bottom: faceUV, north: faceUV, south: faceUV, east: faceUV, west: faceUV },
      ];

      applyFaceUVsToMergedGeometry(mockGeometry as any, faceRanges, faceUVsByBox);

      // Verify box 1 east face (starting at vertex 24) got UVs applied
      const box1EastBaseIndex = 24 * 2; // 48
      expect(uvArray[box1EastBaseIndex]).toBeCloseTo(0.0);     // u1
      expect(uvArray[box1EastBaseIndex + 1]).toBeCloseTo(0.9375); // v = 1 - v2
      expect(uvArray[box1EastBaseIndex + 2]).toBeCloseTo(0.0625); // u2
    });
  });

  describe('UV height scaling for non-full blocks', () => {
    it('applies height-scaled UVs for slab (half-height block)', () => {
      const uvArray = new Float32Array(48);
      const mockGeometry = {
        getAttribute: vi.fn().mockImplementation((name: string) => {
          if (name === 'uv') {
            return {
              array: uvArray,
              needsUpdate: false,
            };
          }
          return null;
        }),
      };

      const faceRanges: FaceRange[] = [
        { startIndex: 0, endIndex: 3, face: 'east', boxIndex: 0 },
        { startIndex: 4, endIndex: 7, face: 'west', boxIndex: 0 },
        { startIndex: 8, endIndex: 11, face: 'top', boxIndex: 0 },
        { startIndex: 12, endIndex: 15, face: 'bottom', boxIndex: 0 },
        { startIndex: 16, endIndex: 19, face: 'south', boxIndex: 0 },
        { startIndex: 20, endIndex: 23, face: 'north', boxIndex: 0 },
      ];

      // For a slab (8/16 = 0.5 height), side faces should only use half of the V range
      const faceUV: UVMapping = { u1: 0.0, v1: 0.0, u2: 0.0625, v2: 0.0625 };
      const heightScale = 0.5; // Slab is half height

      const faceUVsByBox = [{
        top: faceUV,
        bottom: faceUV,
        north: { ...faceUV, v2: faceUV.v1 + (faceUV.v2 - faceUV.v1) * heightScale },
        south: { ...faceUV, v2: faceUV.v1 + (faceUV.v2 - faceUV.v1) * heightScale },
        east: { ...faceUV, v2: faceUV.v1 + (faceUV.v2 - faceUV.v1) * heightScale },
        west: { ...faceUV, v2: faceUV.v1 + (faceUV.v2 - faceUV.v1) * heightScale },
      }];

      applyFaceUVsToMergedGeometry(mockGeometry as any, faceRanges, faceUVsByBox);

      // For side faces, V range should be half
      // east face at index 0: v2 should be scaled
      // Bottom-left V = 1 - v2_scaled = 1 - 0.03125 = 0.96875
      expect(uvArray[1]).toBeCloseTo(0.96875);
    });
  });
});
