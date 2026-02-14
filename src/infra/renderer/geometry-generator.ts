/**
 * Geometry Generator
 *
 * Generates Three.js BufferGeometry from block shape registry definitions.
 * Supports rotation, half positions, and connection states.
 */

import type { BoxDefinition, ShapeDefinition } from './block-shape-registry.js';
import type { BufferGeometry } from 'three';

type ThreeModule = typeof import('three');

// ========================================
// Types
// ========================================

/**
 * Stair shape variants for corner connections
 */
export type StairShapeVariant = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';

/**
 * Generator options for controlling geometry transformation
 */
export interface GeneratorOptions {
  readonly facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  readonly half?: 'top' | 'bottom';
  readonly stairShape?: StairShapeVariant;
  readonly connections?: {
    readonly north?: boolean;
    readonly south?: boolean;
    readonly east?: boolean;
    readonly west?: boolean;
  };
}

/**
 * UV mapping coordinates
 */
export interface UVMapping {
  readonly u1: number;
  readonly v1: number;
  readonly u2: number;
  readonly v2: number;
}

/**
 * Face type for box geometry
 * Three.js BoxGeometry face order:
 * - 0-1: +X (east)
 * - 2-3: -X (west)
 * - 4-5: +Y (top)
 * - 6-7: -Y (bottom)
 * - 8-9: +Z (south)
 * - 10-11: -Z (north)
 */
export type FaceType = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

/**
 * Face range information for merged geometry
 */
export interface FaceRange {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly face: FaceType;
  readonly boxIndex: number;
}

/**
 * Result of merging geometries with face tracking
 */
export interface MergedGeometryResult {
  readonly geometry: BufferGeometry;
  readonly faceRanges: readonly FaceRange[];
}

// ========================================
// Constants
// ========================================

const SCALE_FACTOR = 1 / 16;

const FACING_ROTATIONS: Record<string, number> = {
  north: Math.PI,
  east: Math.PI / 2,
  south: 0,
  west: -Math.PI / 2,
  up: 0,
  down: 0,
};

const CONNECTION_ARM_DIMENSIONS = {
  fence: { width: 2 / 16, height: 12 / 16, length: 6 / 16 },
  wall: { width: 3 / 16, height: 14 / 16, length: 8 / 16 },
};

// ========================================
// Stair Shape Variants
// ========================================

/**
 * Base stair model boxes matching official Minecraft block models.
 * Only 3 base shapes exist; left/right variants use different rotations.
 *
 * stairs.json:       bottom slab + east half upper
 * inner_stairs.json: bottom slab + east half upper + west-south quarter upper
 * outer_stairs.json: bottom slab + east-south quarter upper
 */
function getStairBaseModel(shape: StairShapeVariant): BoxDefinition[] {
  switch (shape) {
    case 'inner_left':
    case 'inner_right':
      return [
        { from: [0, 0, 0], to: [16, 8, 16] },
        { from: [8, 8, 0], to: [16, 16, 16] },
        { from: [0, 8, 8], to: [8, 16, 16] },
      ];
    case 'outer_left':
    case 'outer_right':
      return [
        { from: [0, 0, 0], to: [16, 8, 16] },
        { from: [8, 8, 8], to: [16, 16, 16] },
      ];
    case 'straight':
    default:
      return [
        { from: [0, 0, 0], to: [16, 8, 16] },
        { from: [8, 8, 0], to: [16, 16, 16] },
      ];
  }
}

/**
 * Official Minecraft blockstate rotation lookup for stairs.
 * Extracted from oak_stairs.json blockstates.
 * Key: "facing:shape" → { yDeg, xDeg }
 */
const STAIR_ROTATIONS: Record<string, Record<string, { yDeg: number; xDeg: number }>> = {
  bottom: {
    'east:straight':     { yDeg: 0,   xDeg: 0 },
    'east:inner_left':   { yDeg: 270, xDeg: 0 },
    'east:inner_right':  { yDeg: 0,   xDeg: 0 },
    'east:outer_left':   { yDeg: 270, xDeg: 0 },
    'east:outer_right':  { yDeg: 0,   xDeg: 0 },
    'south:straight':    { yDeg: 90,  xDeg: 0 },
    'south:inner_left':  { yDeg: 0,   xDeg: 0 },
    'south:inner_right': { yDeg: 90,  xDeg: 0 },
    'south:outer_left':  { yDeg: 0,   xDeg: 0 },
    'south:outer_right': { yDeg: 90,  xDeg: 0 },
    'west:straight':     { yDeg: 180, xDeg: 0 },
    'west:inner_left':   { yDeg: 90,  xDeg: 0 },
    'west:inner_right':  { yDeg: 180, xDeg: 0 },
    'west:outer_left':   { yDeg: 90,  xDeg: 0 },
    'west:outer_right':  { yDeg: 180, xDeg: 0 },
    'north:straight':    { yDeg: 270, xDeg: 0 },
    'north:inner_left':  { yDeg: 180, xDeg: 0 },
    'north:inner_right': { yDeg: 270, xDeg: 0 },
    'north:outer_left':  { yDeg: 180, xDeg: 0 },
    'north:outer_right': { yDeg: 270, xDeg: 0 },
  },
  top: {
    'east:straight':     { yDeg: 0,   xDeg: 180 },
    'east:inner_left':   { yDeg: 0,   xDeg: 180 },
    'east:inner_right':  { yDeg: 90,  xDeg: 180 },
    'east:outer_left':   { yDeg: 0,   xDeg: 180 },
    'east:outer_right':  { yDeg: 90,  xDeg: 180 },
    'south:straight':    { yDeg: 90,  xDeg: 180 },
    'south:inner_left':  { yDeg: 90,  xDeg: 180 },
    'south:inner_right': { yDeg: 180, xDeg: 180 },
    'south:outer_left':  { yDeg: 90,  xDeg: 180 },
    'south:outer_right': { yDeg: 180, xDeg: 180 },
    'west:straight':     { yDeg: 180, xDeg: 180 },
    'west:inner_left':   { yDeg: 180, xDeg: 180 },
    'west:inner_right':  { yDeg: 270, xDeg: 180 },
    'west:outer_left':   { yDeg: 180, xDeg: 180 },
    'west:outer_right':  { yDeg: 270, xDeg: 180 },
    'north:straight':    { yDeg: 270, xDeg: 180 },
    'north:inner_left':  { yDeg: 270, xDeg: 180 },
    'north:inner_right': { yDeg: 0,   xDeg: 180 },
    'north:outer_left':  { yDeg: 270, xDeg: 180 },
    'north:outer_right': { yDeg: 0,   xDeg: 180 },
  },
};

/**
 * Get stair rotation from the official blockstate lookup.
 */
export function getStairRotation(
  facing: string,
  shape: StairShapeVariant,
  half: string
): { yDeg: number; xDeg: number } {
  const halfKey = half === 'top' ? 'top' : 'bottom';
  const key = `${facing}:${shape}`;
  return STAIR_ROTATIONS[halfKey]?.[key] ?? { yDeg: 0, xDeg: 0 };
}

/**
 * Get box definitions for stair shape variants (public API).
 * Returns the base model boxes for the given shape variant.
 */
export function getStairBoxes(shape: StairShapeVariant): BoxDefinition[] {
  return getStairBaseModel(shape);
}

// ========================================
// Main Functions
// ========================================

/**
 * Generates a BufferGeometry from a shape definition
 */
export function generateGeometry(
  shapeDef: ShapeDefinition,
  THREE: ThreeModule,
  options: GeneratorOptions = {}
): BufferGeometry {
  const { facing, half, stairShape } = options;
  const geomDef = shapeDef.geometry;

  let resultGeometry: BufferGeometry;

  // For stairs with shape variants, dynamically replace boxes
  const effectiveBoxes = (geomDef.type === 'multi_box' && stairShape)
    ? getStairBoxes(stairShape)
    : geomDef.boxes;

  switch (geomDef.type) {
    case 'box':
    case 'multi_box':
      resultGeometry = boxesToGeometry(effectiveBoxes ?? [], THREE);
      break;

    case 'cross':
      resultGeometry = createCrossGeometry(THREE);
      break;

    case 'custom':
      // Custom generators fallback to boxes if provided, else full block
      resultGeometry = boxesToGeometry(
        geomDef.boxes ?? [{ from: [0, 0, 0], to: [16, 16, 16] }],
        THREE
      );
      break;

    default:
      resultGeometry = new THREE.BoxGeometry(1, 1, 1);
  }

  // Apply connections for connectable blocks
  if (shapeDef.connectable && options.connections) {
    resultGeometry = applyConnections(resultGeometry, options.connections, THREE);
  }

  // Apply rotation: stairs use official blockstate rotations, others use generic facing
  const isStair = geomDef.type === 'multi_box' && stairShape;
  if (isStair && facing) {
    const rot = getStairRotation(facing, stairShape ?? 'straight', half ?? 'bottom');
    // Minecraft internally negates blockstate rotation angles:
    // BlockModelRotation uses rotateYXZ(-y, -x, 0) in the source code
    const xRad = -(rot.xDeg * Math.PI) / 180;
    const yRad = -(rot.yDeg * Math.PI) / 180;
    if (xRad !== 0) resultGeometry.rotateX(xRad);
    if (yRad !== 0) resultGeometry.rotateY(yRad);
  } else {
    // Generic facing rotation for non-stair blocks
    if (shapeDef.rotatable && facing) {
      if (shapeDef.facingMode === 'directional') {
        // 6-direction blocks: from official Minecraft blockstate JSON
        // (e.g., amethyst_cluster.json, end_rod.json, lightning_rod.json)
        // Minecraft internally negates blockstate angles: rotateYXZ(-y, -x, 0)
        // Default model points UP (facing=up has no rotation)
        const DIRECTIONAL_ROTATIONS: Record<string, { x: number; y: number }> = {
          up:    { x: 0,             y: 0 },
          down:  { x: -Math.PI,      y: 0 },              // x=180 → -180
          north: { x: -Math.PI / 2,  y: 0 },              // x=90 → -90
          south: { x: -Math.PI / 2,  y: -Math.PI },        // x=90,y=180 → -90,-180
          east:  { x: -Math.PI / 2,  y: -Math.PI / 2 },    // x=90,y=90 → -90,-90
          west:  { x: -Math.PI / 2,  y: Math.PI / 2 },     // x=90,y=270 → -90,+90
        };
        const rot = DIRECTIONAL_ROTATIONS[facing] ?? { x: 0, y: 0 };
        if (rot.x !== 0) resultGeometry.rotateX(rot.x);
        if (rot.y !== 0) resultGeometry.rotateY(rot.y);
      } else {
        // Horizontal-only blocks
        if (facing !== 'up' && facing !== 'down') {
          const angle = FACING_ROTATIONS[facing] ?? 0;
          if (angle !== 0) resultGeometry.rotateY(angle);
        }
      }
    }
    // Half transformation for non-stair multi_box (if any)
    if (half === 'top' && geomDef.type === 'multi_box') {
      resultGeometry.rotateX(Math.PI);
    }
  }

  return resultGeometry;
}

/**
 * Generates a BufferGeometry from an array of box definitions in 0-16 scale
 */
export function boxesToGeometry(
  boxes: BoxDefinition[],
  THREE: ThreeModule
): BufferGeometry {
  if (boxes.length === 0) {
    return new THREE.BufferGeometry();
  }

  if (boxes.length === 1) {
    return createBoxFromMinecraftScale(boxes[0], THREE);
  }

  const geometries = boxes.map((box) => createBoxFromMinecraftScale(box, THREE));
  const merged = mergeGeometries(geometries, THREE);

  for (const geom of geometries) {
    geom.dispose();
  }

  return merged;
}

/**
 * Applies UV coordinates to a BufferGeometry
 */
export function applyUVs(
  geometry: BufferGeometry,
  uvMapping: UVMapping
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) {
    return;
  }

  const uvArray = uvAttribute.array as Float32Array;
  const { u1, v1, u2, v2 } = uvMapping;
  const uRange = u2 - u1;
  const vRange = v2 - v1;

  for (let i = 0; i < uvArray.length; i += 2) {
    const normalizedU = uvArray[i];
    const normalizedV = uvArray[i + 1];

    uvArray[i] = u1 + normalizedU * uRange;
    uvArray[i + 1] = 1 - (v1 + (1 - normalizedV) * vRange);
  }

  uvAttribute.needsUpdate = true;
}

// ========================================
// Internal Helper Functions
// ========================================

/**
 * Creates a box geometry from 0-16 scale Minecraft format
 */
function createBoxFromMinecraftScale(
  box: BoxDefinition,
  THREE: ThreeModule
): BufferGeometry {
  const { from, to, rotation } = box;

  const width = (to[0] - from[0]) * SCALE_FACTOR;
  const height = (to[1] - from[1]) * SCALE_FACTOR;
  const depth = (to[2] - from[2]) * SCALE_FACTOR;

  const geometry = new THREE.BoxGeometry(width, height, depth);

  const centerX = ((from[0] + to[0]) / 2) * SCALE_FACTOR - 0.5;
  const centerY = ((from[1] + to[1]) / 2) * SCALE_FACTOR - 0.5;
  const centerZ = ((from[2] + to[2]) / 2) * SCALE_FACTOR - 0.5;

  geometry.translate(centerX, centerY, centerZ);

  if (rotation) {
    applyBoxRotation(geometry, rotation);
  }

  return geometry;
}

/**
 * Applies rotation to a box geometry
 */
function applyBoxRotation(
  geometry: BufferGeometry,
  rotation: NonNullable<BoxDefinition['rotation']>
): void {
  const { axis, angle, origin } = rotation;
  const angleRad = (angle * Math.PI) / 180;

  const originX = origin[0] * SCALE_FACTOR - 0.5;
  const originY = origin[1] * SCALE_FACTOR - 0.5;
  const originZ = origin[2] * SCALE_FACTOR - 0.5;

  geometry.translate(-originX, -originY, -originZ);

  switch (axis) {
    case 'x':
      geometry.rotateX(angleRad);
      break;
    case 'y':
      geometry.rotateY(angleRad);
      break;
    case 'z':
      geometry.rotateZ(angleRad);
      break;
  }

  geometry.translate(originX, originY, originZ);
}

/**
 * Creates a cross-shaped geometry for plants, flowers, etc.
 */
function createCrossGeometry(THREE: ThreeModule): BufferGeometry {
  const positions: number[] = [
    -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
    0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
    0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
    -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5,
    0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
    0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  ];

  const uvs: number[] = [];
  for (let i = 0; i < 4; i++) {
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Applies connection arms to a geometry for connectable blocks
 */
function applyConnections(
  baseGeometry: BufferGeometry,
  connections: NonNullable<GeneratorOptions['connections']>,
  THREE: ThreeModule
): BufferGeometry {
  const geometriesToMerge: BufferGeometry[] = [baseGeometry];

  const dims = CONNECTION_ARM_DIMENSIONS.fence;

  if (connections.north) {
    geometriesToMerge.push(createConnectionArm('north', dims, THREE));
  }
  if (connections.south) {
    geometriesToMerge.push(createConnectionArm('south', dims, THREE));
  }
  if (connections.east) {
    geometriesToMerge.push(createConnectionArm('east', dims, THREE));
  }
  if (connections.west) {
    geometriesToMerge.push(createConnectionArm('west', dims, THREE));
  }

  if (geometriesToMerge.length === 1) {
    return baseGeometry;
  }

  const merged = mergeGeometries(geometriesToMerge, THREE);

  for (let i = 1; i < geometriesToMerge.length; i++) {
    geometriesToMerge[i].dispose();
  }

  baseGeometry.dispose();

  return merged;
}

/**
 * Creates a connection arm geometry for fence/wall connections
 */
function createConnectionArm(
  direction: 'north' | 'south' | 'east' | 'west',
  dims: { width: number; height: number; length: number },
  THREE: ThreeModule
): BufferGeometry {
  const { width, height } = dims;
  const armLength = 0.5 - width / 2;

  let geometry: BufferGeometry;

  switch (direction) {
    case 'north':
      geometry = new THREE.BoxGeometry(width, height, armLength);
      geometry.translate(0, (height - 1) / 2, -armLength / 2 - width / 2);
      break;
    case 'south':
      geometry = new THREE.BoxGeometry(width, height, armLength);
      geometry.translate(0, (height - 1) / 2, armLength / 2 + width / 2);
      break;
    case 'east':
      geometry = new THREE.BoxGeometry(armLength, height, width);
      geometry.translate(armLength / 2 + width / 2, (height - 1) / 2, 0);
      break;
    case 'west':
      geometry = new THREE.BoxGeometry(armLength, height, width);
      geometry.translate(-armLength / 2 - width / 2, (height - 1) / 2, 0);
      break;
  }

  return geometry;
}

/**
 * Face order in Three.js BoxGeometry (each face has 4 vertices)
 * Index: 0=east(+X), 1=west(-X), 2=top(+Y), 3=bottom(-Y), 4=south(+Z), 5=north(-Z)
 */
const FACE_ORDER: readonly FaceType[] = ['east', 'west', 'top', 'bottom', 'south', 'north'] as const;

/**
 * Vertices per face in BoxGeometry
 */
const VERTICES_PER_FACE = 4;

/**
 * Total vertices per box (6 faces * 4 vertices)
 */
const VERTICES_PER_BOX = 24;

/**
 * Merges multiple BufferGeometries into one (legacy version without face tracking)
 */
function mergeGeometries(
  geometries: BufferGeometry[],
  THREE: ThreeModule
): BufferGeometry {
  const result = mergeGeometriesWithFaceTracking(geometries, THREE);
  return result.geometry;
}

/**
 * Merges multiple BufferGeometries into one with face range tracking
 */
export function mergeGeometriesWithFaceTracking(
  geometries: BufferGeometry[],
  THREE: ThreeModule
): MergedGeometryResult {
  if (geometries.length === 0) {
    return {
      geometry: new THREE.BufferGeometry(),
      faceRanges: [],
    };
  }

  if (geometries.length === 1) {
    const faceRanges = createFaceRangesForSingleBox(0, 0);
    return {
      geometry: geometries[0].clone(),
      faceRanges,
    };
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const faceRanges: FaceRange[] = [];
  let indexOffset = 0;
  let boxIndex = 0;

  for (const geometry of geometries) {
    const posAttr = geometry.getAttribute('position');
    const normAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');
    const indexAttr = geometry.getIndex();

    if (!posAttr || posAttr.count === 0) {
      continue;
    }

    const vertexCount = posAttr.count;
    const isStandardBox = vertexCount === VERTICES_PER_BOX;

    // Track face ranges for standard box geometries
    if (isStandardBox) {
      const boxFaceRanges = createFaceRangesForSingleBox(boxIndex, indexOffset);
      faceRanges.push(...boxFaceRanges);
      boxIndex++;
    }

    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }

    if (normAttr) {
      for (let i = 0; i < normAttr.count; i++) {
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      }
    }

    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      }
    }

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i++) {
        indices.push(indexAttr.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i + indexOffset);
      }
    }

    indexOffset += posAttr.count;
  }

  const merged = new THREE.BufferGeometry();

  if (positions.length > 0) {
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  }

  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }

  if (uvs.length > 0) {
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  if (indices.length > 0) {
    merged.setIndex(indices);
  }

  return {
    geometry: merged,
    faceRanges,
  };
}

/**
 * Creates face ranges for a single box geometry
 */
function createFaceRangesForSingleBox(boxIndex: number, vertexOffset: number): FaceRange[] {
  return FACE_ORDER.map((face, faceIndex) => ({
    startIndex: vertexOffset + faceIndex * VERTICES_PER_FACE,
    endIndex: vertexOffset + (faceIndex + 1) * VERTICES_PER_FACE - 1,
    face,
    boxIndex,
  }));
}

/**
 * Applies UV coordinates to each face of a box geometry
 */
export function applyFaceUVs(
  geometry: BufferGeometry,
  faceUVs: {
    readonly top?: UVMapping;
    readonly bottom?: UVMapping;
    readonly north?: UVMapping;
    readonly south?: UVMapping;
    readonly east?: UVMapping;
    readonly west?: UVMapping;
  }
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) {
    return;
  }

  const uvArray = uvAttribute.array as Float32Array;

  const faceMapping: Array<[number, UVMapping | undefined]> = [
    [0, faceUVs.east],
    [1, faceUVs.west],
    [2, faceUVs.top],
    [3, faceUVs.bottom],
    [4, faceUVs.south],
    [5, faceUVs.north],
  ];

  for (const [faceIndex, uv] of faceMapping) {
    if (!uv) {
      continue;
    }

    const baseIndex = faceIndex * 8;

    uvArray[baseIndex + 0] = uv.u1;
    uvArray[baseIndex + 1] = 1 - uv.v2;
    uvArray[baseIndex + 2] = uv.u2;
    uvArray[baseIndex + 3] = 1 - uv.v2;
    uvArray[baseIndex + 4] = uv.u1;
    uvArray[baseIndex + 5] = 1 - uv.v1;
    uvArray[baseIndex + 6] = uv.u2;
    uvArray[baseIndex + 7] = 1 - uv.v1;
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Applies UV coordinates to each face of a merged geometry using face ranges
 */
export function applyFaceUVsToMergedGeometry(
  geometry: BufferGeometry,
  faceRanges: readonly FaceRange[],
  faceUVsByBox: ReadonlyArray<{
    readonly top?: UVMapping;
    readonly bottom?: UVMapping;
    readonly north?: UVMapping;
    readonly south?: UVMapping;
    readonly east?: UVMapping;
    readonly west?: UVMapping;
  }>
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) {
    return;
  }

  const uvArray = uvAttribute.array as Float32Array;

  for (const faceRange of faceRanges) {
    const { startIndex, face, boxIndex } = faceRange;
    const boxUVs = faceUVsByBox[boxIndex];

    if (!boxUVs) {
      continue;
    }

    const uv = boxUVs[face];
    if (!uv) {
      continue;
    }

    // Each face has 4 vertices, each vertex has 2 UV components
    const baseUVIndex = startIndex * 2;

    // Apply UV coordinates to the 4 vertices of this face
    // Vertex order: bottom-left, bottom-right, top-left, top-right
    uvArray[baseUVIndex + 0] = uv.u1;
    uvArray[baseUVIndex + 1] = 1 - uv.v2;
    uvArray[baseUVIndex + 2] = uv.u2;
    uvArray[baseUVIndex + 3] = 1 - uv.v2;
    uvArray[baseUVIndex + 4] = uv.u1;
    uvArray[baseUVIndex + 5] = 1 - uv.v1;
    uvArray[baseUVIndex + 6] = uv.u2;
    uvArray[baseUVIndex + 7] = 1 - uv.v1;
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Generates a BufferGeometry from boxes with face tracking
 */
export function boxesToGeometryWithFaceTracking(
  boxes: BoxDefinition[],
  THREE: ThreeModule
): MergedGeometryResult {
  if (boxes.length === 0) {
    return {
      geometry: new THREE.BufferGeometry(),
      faceRanges: [],
    };
  }

  if (boxes.length === 1) {
    const geometry = createBoxFromMinecraftScale(boxes[0], THREE);
    const faceRanges = createFaceRangesForSingleBox(0, 0);
    return {
      geometry,
      faceRanges,
    };
  }

  const geometries = boxes.map((box) => createBoxFromMinecraftScale(box, THREE));
  const result = mergeGeometriesWithFaceTracking(geometries, THREE);

  for (const geom of geometries) {
    geom.dispose();
  }

  return result;
}
