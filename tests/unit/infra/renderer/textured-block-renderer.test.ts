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
    fromX?: number;
    fromY?: number;
    fromZ?: number;
  }

  /**
   * Minecraft auto-UV algorithm: UV coordinates derived from box position and size.
   * Matches the implementation in TexturedBlockRenderer.ts.
   */
  function scaleUVForFace(
    uv: UVCoords,
    face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west',
    dimensions: BoxDimensions
  ): UVCoords {
    const { width, height, depth } = dimensions;
    const fx = dimensions.fromX ?? 0;
    const fy = dimensions.fromY ?? 0;
    const fz = dimensions.fromZ ?? 0;
    const tx = fx + width;
    const ty = fy + height;
    const tz = fz + depth;

    const uRange = uv.u2 - uv.u1;
    const vRange = uv.v2 - uv.v1;

    let uOffset: number, uScale: number, vOffset: number, vScale: number;

    switch (face) {
      case 'north':
        uOffset = fx / 16; uScale = width / 16;
        vOffset = (16 - ty) / 16; vScale = height / 16;
        break;
      case 'south':
        uOffset = (16 - tx) / 16; uScale = width / 16;
        vOffset = (16 - ty) / 16; vScale = height / 16;
        break;
      case 'east':
        uOffset = (16 - tz) / 16; uScale = depth / 16;
        vOffset = (16 - ty) / 16; vScale = height / 16;
        break;
      case 'west':
        uOffset = fz / 16; uScale = depth / 16;
        vOffset = (16 - ty) / 16; vScale = height / 16;
        break;
      case 'top':
        uOffset = fx / 16; uScale = width / 16;
        vOffset = fz / 16; vScale = depth / 16;
        break;
      case 'bottom':
        uOffset = fx / 16; uScale = width / 16;
        vOffset = (16 - tz) / 16; vScale = depth / 16;
        break;
      default:
        return uv;
    }

    return {
      u1: uv.u1 + uRange * uOffset,
      v1: uv.v1 + vRange * vOffset,
      u2: uv.u1 + uRange * (uOffset + uScale),
      v2: uv.v1 + vRange * (vOffset + vScale),
    };
  }

  describe('scaleUVForFace (Minecraft auto-UV)', () => {
    const T = 0.0625; // tile size in atlas (16/256)

    it('returns unchanged UVs for full block at origin [0,0,0]-[16,16,16]', () => {
      const fullBlock: BoxDimensions = { width: 16, height: 16, depth: 16 };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      const scaledTop = scaleUVForFace(uv, 'top', fullBlock);
      const scaledNorth = scaleUVForFace(uv, 'north', fullBlock);
      const scaledEast = scaleUVForFace(uv, 'east', fullBlock);

      expect(scaledTop.u1).toBeCloseTo(0);
      expect(scaledTop.v1).toBeCloseTo(0);
      expect(scaledTop.u2).toBeCloseTo(T);
      expect(scaledTop.v2).toBeCloseTo(T);
      expect(scaledNorth.u2).toBeCloseTo(T);
      expect(scaledNorth.v2).toBeCloseTo(T);
      expect(scaledEast.u2).toBeCloseTo(T);
      expect(scaledEast.v2).toBeCloseTo(T);
    });

    it('slab [0,0,0]-[16,8,16]: north face shows bottom half of texture', () => {
      // Slab from y=0 to y=8: north face vOffset = (16-8)/16 = 0.5
      const slab: BoxDimensions = { width: 16, height: 8, depth: 16 };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      const scaledNorth = scaleUVForFace(uv, 'north', slab);

      // North: uOffset=0, uScale=1, vOffset=0.5, vScale=0.5
      expect(scaledNorth.u1).toBeCloseTo(0);
      expect(scaledNorth.u2).toBeCloseTo(T);      // full width
      expect(scaledNorth.v1).toBeCloseTo(T * 0.5); // bottom half starts at 0.5
      expect(scaledNorth.v2).toBeCloseTo(T);        // ends at full
    });

    it('top-half slab [0,8,0]-[16,16,16]: north face shows top half of texture', () => {
      const slab: BoxDimensions = { width: 16, height: 8, depth: 16, fromY: 8 };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      const scaledNorth = scaleUVForFace(uv, 'north', slab);

      // North: vOffset = (16-16)/16 = 0, vScale = 0.5
      expect(scaledNorth.v1).toBeCloseTo(0);        // top half
      expect(scaledNorth.v2).toBeCloseTo(T * 0.5);
    });

    it('stair upper step [8,8,0]-[16,16,16]: correct UV offsets', () => {
      const stairUpper: BoxDimensions = {
        width: 8, height: 8, depth: 16, fromX: 8, fromY: 8, fromZ: 0,
      };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      // North face: uOffset=8/16=0.5, uScale=0.5, vOffset=0, vScale=0.5
      const north = scaleUVForFace(uv, 'north', stairUpper);
      expect(north.u1).toBeCloseTo(T * 0.5);  // starts at half
      expect(north.u2).toBeCloseTo(T);          // ends at full
      expect(north.v1).toBeCloseTo(0);           // top half
      expect(north.v2).toBeCloseTo(T * 0.5);

      // Top face: uOffset=0.5, uScale=0.5, vOffset=0, vScale=1
      const top = scaleUVForFace(uv, 'top', stairUpper);
      expect(top.u1).toBeCloseTo(T * 0.5);
      expect(top.u2).toBeCloseTo(T);
      expect(top.v1).toBeCloseTo(0);
      expect(top.v2).toBeCloseTo(T);  // full depth
    });

    it('narrow block [4,0,4]-[12,16,12]: centered UV', () => {
      const narrow: BoxDimensions = {
        width: 8, height: 16, depth: 8, fromX: 4, fromY: 0, fromZ: 4,
      };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      // Top face: uOffset=4/16=0.25, uScale=0.5, vOffset=4/16=0.25, vScale=0.5
      const top = scaleUVForFace(uv, 'top', narrow);
      expect(top.u1).toBeCloseTo(T * 0.25);
      expect(top.u2).toBeCloseTo(T * 0.75);
      expect(top.v1).toBeCloseTo(T * 0.25);
      expect(top.v2).toBeCloseTo(T * 0.75);
    });

    it('carpet [0,0,0]-[16,1,16]: very thin north face', () => {
      const carpet: BoxDimensions = { width: 16, height: 1, depth: 16 };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      const north = scaleUVForFace(uv, 'north', carpet);

      // North: vOffset = (16-1)/16 = 15/16, vScale = 1/16
      expect(north.u1).toBeCloseTo(0);
      expect(north.u2).toBeCloseTo(T);
      expect(north.v1).toBeCloseTo(T * (15/16));
      expect(north.v2).toBeCloseTo(T);
    });

    it('fence post [6,0,6]-[10,16,10]: offset UV', () => {
      const fencePost: BoxDimensions = {
        width: 4, height: 16, depth: 4, fromX: 6, fromY: 0, fromZ: 6,
      };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      // North: uOffset=6/16, uScale=4/16, vOffset=0, vScale=1
      const north = scaleUVForFace(uv, 'north', fencePost);
      expect(north.u1).toBeCloseTo(T * (6/16));
      expect(north.u2).toBeCloseTo(T * (10/16));
      expect(north.v1).toBeCloseTo(0);
      expect(north.v2).toBeCloseTo(T);
    });

    it('east face uses Z for U axis', () => {
      // East face: U maps to Z (mirrored), V maps to Y
      const box: BoxDimensions = {
        width: 16, height: 16, depth: 8, fromX: 0, fromY: 0, fromZ: 0,
      };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      // East: uOffset = (16 - 8) / 16 = 0.5, uScale = 0.5
      const east = scaleUVForFace(uv, 'east', box);
      expect(east.u1).toBeCloseTo(T * 0.5);
      expect(east.u2).toBeCloseTo(T);
    });

    it('west face uses Z for U axis (non-mirrored)', () => {
      const box: BoxDimensions = {
        width: 16, height: 16, depth: 8, fromX: 0, fromY: 0, fromZ: 4,
      };
      const uv: UVCoords = { u1: 0, v1: 0, u2: T, v2: T };

      // West: uOffset = fromZ/16 = 0.25, uScale = 0.5
      const west = scaleUVForFace(uv, 'west', box);
      expect(west.u1).toBeCloseTo(T * 0.25);
      expect(west.u2).toBeCloseTo(T * 0.75);
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
