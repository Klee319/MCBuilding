/**
 * Textured Block Renderer Unit Tests
 *
 * Tests for UV scaling and face texture mapping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeStairShape } from '../../../../src/frontend/components/viewer/TexturedBlockRenderer.js';

// Test the scaleUVForFace logic (internal function behavior)
describe('UV Scaling for Non-Full Blocks', () => {
  // Define the scaling function as it would work internally
  interface UVCoords {
    u1: number;
    v1: number;
    u2: number;
    v2: number;
  }

  interface BoxDimensions {
    width: number;
    height: number;
    depth: number;
  }

  function scaleUVForFace(
    uv: UVCoords,
    face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west',
    dimensions: BoxDimensions
  ): UVCoords {
    const { width, height, depth } = dimensions;
    const heightScale = height / 16;
    const widthScale = width / 16;
    const depthScale = depth / 16;
    const uRange = uv.u2 - uv.u1;
    const vRange = uv.v2 - uv.v1;

    switch (face) {
      case 'top':
      case 'bottom':
        return {
          u1: uv.u1,
          v1: uv.v1,
          u2: uv.u1 + uRange * widthScale,
          v2: uv.v1 + vRange * depthScale,
        };
      case 'north':
      case 'south':
        return {
          u1: uv.u1,
          v1: uv.v1,
          u2: uv.u1 + uRange * widthScale,
          v2: uv.v1 + vRange * heightScale,
        };
      case 'east':
      case 'west':
        return {
          u1: uv.u1,
          v1: uv.v1,
          u2: uv.u1 + uRange * depthScale,
          v2: uv.v1 + vRange * heightScale,
        };
      default:
        return uv;
    }
  }

  describe('scaleUVForFace', () => {
    const fullBlockUV: UVCoords = { u1: 0, v1: 0, u2: 0.0625, v2: 0.0625 };

    it('returns unchanged UVs for full block dimensions', () => {
      const fullBlock: BoxDimensions = { width: 16, height: 16, depth: 16 };

      const scaledTop = scaleUVForFace(fullBlockUV, 'top', fullBlock);
      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', fullBlock);
      const scaledEast = scaleUVForFace(fullBlockUV, 'east', fullBlock);

      expect(scaledTop.u2).toBeCloseTo(0.0625);
      expect(scaledTop.v2).toBeCloseTo(0.0625);
      expect(scaledNorth.u2).toBeCloseTo(0.0625);
      expect(scaledNorth.v2).toBeCloseTo(0.0625);
      expect(scaledEast.u2).toBeCloseTo(0.0625);
      expect(scaledEast.v2).toBeCloseTo(0.0625);
    });

    it('scales side face V by half for slab (height=8)', () => {
      const slab: BoxDimensions = { width: 16, height: 8, depth: 16 };

      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', slab);
      const scaledEast = scaleUVForFace(fullBlockUV, 'east', slab);

      // V should be scaled by 0.5 (8/16)
      expect(scaledNorth.v2).toBeCloseTo(0.03125); // 0.0625 * 0.5
      expect(scaledEast.v2).toBeCloseTo(0.03125);

      // U should remain full width
      expect(scaledNorth.u2).toBeCloseTo(0.0625);
      expect(scaledEast.u2).toBeCloseTo(0.0625);
    });

    it('scales top/bottom faces by width and depth', () => {
      const narrowBlock: BoxDimensions = { width: 8, height: 16, depth: 8 };

      const scaledTop = scaleUVForFace(fullBlockUV, 'top', narrowBlock);

      // Both U and V should be scaled by 0.5
      expect(scaledTop.u2).toBeCloseTo(0.03125);
      expect(scaledTop.v2).toBeCloseTo(0.03125);
    });

    it('scales east/west faces U by depth', () => {
      const thinBlock: BoxDimensions = { width: 16, height: 16, depth: 2 };

      const scaledEast = scaleUVForFace(fullBlockUV, 'east', thinBlock);

      // U should be scaled by 2/16 = 0.125
      expect(scaledEast.u2).toBeCloseTo(0.0625 * 0.125);
      // V should remain full (height = 16)
      expect(scaledEast.v2).toBeCloseTo(0.0625);
    });

    it('handles stair step dimensions correctly', () => {
      // Stair bottom part: full width, half height, full depth
      const stairBottom: BoxDimensions = { width: 16, height: 8, depth: 16 };
      // Stair top part: full width, half height, half depth
      const stairTop: BoxDimensions = { width: 16, height: 8, depth: 8 };

      const bottomNorth = scaleUVForFace(fullBlockUV, 'north', stairBottom);
      const topNorth = scaleUVForFace(fullBlockUV, 'north', stairTop);

      // Both should have V scaled by 0.5 (half height)
      expect(bottomNorth.v2).toBeCloseTo(0.03125);
      expect(topNorth.v2).toBeCloseTo(0.03125);

      // U for north face depends on width (both full)
      expect(bottomNorth.u2).toBeCloseTo(0.0625);
      expect(topNorth.u2).toBeCloseTo(0.0625);

      // East face for top part: U scaled by depth (0.5)
      const topEast = scaleUVForFace(fullBlockUV, 'east', stairTop);
      expect(topEast.u2).toBeCloseTo(0.03125);
    });

    it('handles carpet dimensions (very flat)', () => {
      const carpet: BoxDimensions = { width: 16, height: 1, depth: 16 };

      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', carpet);

      // V should be scaled by 1/16
      expect(scaledNorth.v2).toBeCloseTo(0.0625 * (1/16));
      // U should remain full
      expect(scaledNorth.u2).toBeCloseTo(0.0625);
    });

    it('handles torch dimensions (thin post)', () => {
      const torch: BoxDimensions = { width: 2, height: 10, depth: 2 };

      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', torch);
      const scaledTop = scaleUVForFace(fullBlockUV, 'top', torch);

      // North face: U scaled by 2/16, V scaled by 10/16
      expect(scaledNorth.u2).toBeCloseTo(0.0625 * 0.125);
      expect(scaledNorth.v2).toBeCloseTo(0.0625 * 0.625);

      // Top face: both U and V scaled by 2/16
      expect(scaledTop.u2).toBeCloseTo(0.0625 * 0.125);
      expect(scaledTop.v2).toBeCloseTo(0.0625 * 0.125);
    });

    it('handles fence post dimensions', () => {
      const fencePost: BoxDimensions = { width: 4, height: 16, depth: 4 };

      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', fencePost);

      // U scaled by 4/16 = 0.25
      expect(scaledNorth.u2).toBeCloseTo(0.0625 * 0.25);
      // V full (height = 16)
      expect(scaledNorth.v2).toBeCloseTo(0.0625);
    });

    it('handles wall arm dimensions', () => {
      // Wall north arm: width=6, height=13, depth=5
      const wallArm: BoxDimensions = { width: 6, height: 13, depth: 5 };

      const scaledNorth = scaleUVForFace(fullBlockUV, 'north', wallArm);
      const scaledEast = scaleUVForFace(fullBlockUV, 'east', wallArm);

      // North face: U scaled by 6/16, V scaled by 13/16
      expect(scaledNorth.u2).toBeCloseTo(0.0625 * (6/16));
      expect(scaledNorth.v2).toBeCloseTo(0.0625 * (13/16));

      // East face: U scaled by 5/16, V scaled by 13/16
      expect(scaledEast.u2).toBeCloseTo(0.0625 * (5/16));
      expect(scaledEast.v2).toBeCloseTo(0.0625 * (13/16));
    });
  });
});

describe('Face Detection from Normals', () => {
  it('detects top face from positive Y normal', () => {
    const nx = 0, ny = 1, nz = 0;
    const isTop = Math.abs(ny) > 0.5 && ny > 0;
    expect(isTop).toBe(true);
  });

  it('detects bottom face from negative Y normal', () => {
    const nx = 0, ny = -1, nz = 0;
    const isBottom = Math.abs(ny) > 0.5 && ny < 0;
    expect(isBottom).toBe(true);
  });

  it('detects north face from negative Z normal', () => {
    const nx = 0, ny = 0, nz = -1;
    const isNorth = Math.abs(nz) > 0.5 && nz < 0;
    expect(isNorth).toBe(true);
  });

  it('detects south face from positive Z normal', () => {
    const nx = 0, ny = 0, nz = 1;
    const isSouth = Math.abs(nz) > 0.5 && nz > 0;
    expect(isSouth).toBe(true);
  });

  it('detects east face from positive X normal', () => {
    const nx = 1, ny = 0, nz = 0;
    const isEast = Math.abs(nx) > 0.5 && nx > 0;
    expect(isEast).toBe(true);
  });

  it('detects west face from negative X normal', () => {
    const nx = -1, ny = 0, nz = 0;
    const isWest = Math.abs(nx) > 0.5 && nx < 0;
    expect(isWest).toBe(true);
  });
});

describe('Cross Geometry UV Application', () => {
  it('applies correct UV pattern to cross vertices', () => {
    // Cross geometry has 4 planes, each with 6 vertices (2 triangles)
    // Total: 24 vertices = 48 UV values
    const uvArray = new Float32Array(48);
    const uv = { u1: 0, v1: 0, u2: 0.0625, v2: 0.0625 };

    // Apply cross UVs (mimicking applyCrossUVs logic)
    for (let plane = 0; plane < 4; plane++) {
      const baseIdx = plane * 12;

      // Triangle 1: bottom-left, bottom-right, top-right
      uvArray[baseIdx + 0] = uv.u1; uvArray[baseIdx + 1] = 1 - uv.v2;
      uvArray[baseIdx + 2] = uv.u2; uvArray[baseIdx + 3] = 1 - uv.v2;
      uvArray[baseIdx + 4] = uv.u2; uvArray[baseIdx + 5] = 1 - uv.v1;

      // Triangle 2: bottom-left, top-right, top-left
      uvArray[baseIdx + 6] = uv.u1; uvArray[baseIdx + 7] = 1 - uv.v2;
      uvArray[baseIdx + 8] = uv.u2; uvArray[baseIdx + 9] = 1 - uv.v1;
      uvArray[baseIdx + 10] = uv.u1; uvArray[baseIdx + 11] = 1 - uv.v1;
    }

    // Verify first plane UVs
    expect(uvArray[0]).toBeCloseTo(0);          // u1
    expect(uvArray[1]).toBeCloseTo(0.9375);     // 1 - v2
    expect(uvArray[2]).toBeCloseTo(0.0625);     // u2
    expect(uvArray[5]).toBeCloseTo(1);          // 1 - v1

    // All 4 planes should have the same UV pattern
    for (let plane = 1; plane < 4; plane++) {
      const baseIdx = plane * 12;
      expect(uvArray[baseIdx + 0]).toBeCloseTo(0);
      expect(uvArray[baseIdx + 1]).toBeCloseTo(0.9375);
    }
  });
});

describe('computeStairShape', () => {
  type BlockFacing = 'north' | 'south' | 'east' | 'west';
  type BlockHalf = 'top' | 'bottom';
  type NeighborInfo = { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined;
  type Neighbors = {
    north: NeighborInfo;
    south: NeighborInfo;
    east: NeighborInfo;
    west: NeighborInfo;
  };

  const noNeighbors: Neighbors = {
    north: undefined,
    south: undefined,
    east: undefined,
    west: undefined,
  };

  const stairFacing = (facing: BlockFacing, half: BlockHalf = 'bottom'): { isStair: boolean; facing: BlockFacing; half: BlockHalf } => ({
    isStair: true,
    facing,
    half,
  });

  const nonStair: { isStair: boolean } = { isStair: false };

  it('returns straight when no neighbors', () => {
    expect(computeStairShape('north', 'bottom', noNeighbors)).toBe('straight');
    expect(computeStairShape('south', 'bottom', noNeighbors)).toBe('straight');
    expect(computeStairShape('east', 'bottom', noNeighbors)).toBe('straight');
    expect(computeStairShape('west', 'bottom', noNeighbors)).toBe('straight');
  });

  it('returns straight when neighbors are not stairs', () => {
    const neighbors: Neighbors = {
      north: nonStair,
      south: nonStair,
      east: nonStair,
      west: nonStair,
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('straight');
  });

  it('returns straight when front neighbor is a stair with same facing', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('north'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('straight');
  });

  // Inner corner: front neighbor is a stair with perpendicular facing
  it('returns inner_left when front neighbor faces left', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('west'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('inner_left');
  });

  it('returns inner_right when front neighbor faces right', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('east'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('inner_right');
  });

  // Outer corner: back neighbor is a stair with perpendicular facing
  it('returns outer_left when back neighbor faces left', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      south: stairFacing('west'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('outer_left');
  });

  it('returns outer_right when back neighbor faces right', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      south: stairFacing('east'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('outer_right');
  });

  // Inner takes priority over outer
  it('inner corner takes priority over outer corner', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('west'),
      south: stairFacing('east'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('inner_left');
  });

  // East-facing stair variants
  it('handles east-facing stair inner corners', () => {
    const innerLeft: Neighbors = {
      ...noNeighbors,
      east: stairFacing('north'),
    };
    const innerRight: Neighbors = {
      ...noNeighbors,
      east: stairFacing('south'),
    };
    expect(computeStairShape('east', 'bottom', innerLeft)).toBe('inner_left');
    expect(computeStairShape('east', 'bottom', innerRight)).toBe('inner_right');
  });

  it('handles east-facing stair outer corners', () => {
    const outerLeft: Neighbors = {
      ...noNeighbors,
      west: stairFacing('north'),
    };
    const outerRight: Neighbors = {
      ...noNeighbors,
      west: stairFacing('south'),
    };
    expect(computeStairShape('east', 'bottom', outerLeft)).toBe('outer_left');
    expect(computeStairShape('east', 'bottom', outerRight)).toBe('outer_right');
  });

  // South and West-facing stair variants
  it('handles south-facing stair corners', () => {
    expect(computeStairShape('south', 'bottom', { ...noNeighbors, south: stairFacing('east') })).toBe('inner_left');
    expect(computeStairShape('south', 'bottom', { ...noNeighbors, south: stairFacing('west') })).toBe('inner_right');
    expect(computeStairShape('south', 'bottom', { ...noNeighbors, north: stairFacing('east') })).toBe('outer_left');
    expect(computeStairShape('south', 'bottom', { ...noNeighbors, north: stairFacing('west') })).toBe('outer_right');
  });

  it('handles west-facing stair corners', () => {
    expect(computeStairShape('west', 'bottom', { ...noNeighbors, west: stairFacing('south') })).toBe('inner_left');
    expect(computeStairShape('west', 'bottom', { ...noNeighbors, west: stairFacing('north') })).toBe('inner_right');
    expect(computeStairShape('west', 'bottom', { ...noNeighbors, east: stairFacing('south') })).toBe('outer_left');
    expect(computeStairShape('west', 'bottom', { ...noNeighbors, east: stairFacing('north') })).toBe('outer_right');
  });

  // Half property check: bottom stairs don't connect to top stairs
  it('returns straight when front neighbor has different half', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('west', 'top'),
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('straight');
  });

  it('connects top stairs to top stairs', () => {
    const neighbors: Neighbors = {
      ...noNeighbors,
      north: stairFacing('west', 'top'),
    };
    expect(computeStairShape('north', 'top', neighbors)).toBe('inner_left');
  });

  // canTakeShape: prevents false corners when stair continues straight alongside
  it('returns straight when canTakeShape fails (opposite side has same-facing stair)', () => {
    // North-facing stair, front (north) neighbor faces west → would be inner_left,
    // but canTakeShape checks the EAST neighbor (opposite of front's facing 'west')
    // and finds a north-facing bottom stair → canTakeShape = false → straight
    const neighbors: Neighbors = {
      north: stairFacing('west'),
      south: undefined,
      east: stairFacing('north'),  // same facing+half as self → canTakeShape returns false
      west: undefined,
    };
    expect(computeStairShape('north', 'bottom', neighbors)).toBe('straight');
  });
});
