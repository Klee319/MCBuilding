/**
 * Textured Block Renderer
 *
 * Renders Minecraft blocks with actual textures using Three.js.
 * Uses registry-based shape definitions for geometry generation.
 */

import type { TextureAtlasResponse, BlockFaceTextures, UVCoords } from '../../types/texture';
import type { BlockShape, BlockFacing, BlockHalf, StairShape, BlockConnections, WallHeight } from '../../types/structure';
import { getShapeDefinition, getShapeForBlock, type ShapeDefinition } from '../../../infra/renderer/block-shape-registry';
import {
  generateGeometry,
  boxesToGeometryWithFaceTracking,
  applyFaceUVsToMergedGeometry,
  getStairBoxes,
  getStairRotation,
  type FaceRange,
  type StairShapeVariant,
} from '../../../infra/renderer/geometry-generator';

/**
 * Block data for rendering
 */
interface BlockData {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly paletteIndex: number;
  readonly shape?: BlockShape;
  readonly facing?: BlockFacing;
  readonly half?: BlockHalf;
  readonly stairShape?: StairShape;
  readonly connections?: BlockConnections;
}

/**
 * Palette entry
 */
interface PaletteEntry {
  readonly name: string;
  readonly properties?: Record<string, string>;
}

/**
 * Three.js module type
 */
type ThreeModule = typeof import('three');

/**
 * Debug: Track logged block names to avoid log spam (1 log per block type)
 * Set DEBUG_ENABLED to false in production builds
 */
const DEBUG_LOGGED_BLOCKS = new Set<string>();
const DEBUG_ENABLED = false;

/**
 * Create a fallback UV that references the first tile in the atlas
 * The actual UV depends on the atlas size, so we use a function
 */
function createFallbackUV(atlasWidth: number, atlasHeight: number): UVCoords {
  // Each tile is 16x16 pixels
  const TILE_SIZE = 16;
  return {
    u1: 0,
    v1: 0,
    u2: TILE_SIZE / atlasWidth,
    v2: TILE_SIZE / atlasHeight,
  };
}

/**
 * Create default face textures with proper atlas-aware fallback
 */
function getDefaultFaces(
  faceTextures: BlockFaceTextures | undefined,
  atlasWidth: number,
  atlasHeight: number
): BlockFaceTextures {
  if (faceTextures) {
    return faceTextures;
  }
  const fallbackUV = createFallbackUV(atlasWidth, atlasHeight);
  return {
    top: fallbackUV, bottom: fallbackUV,
    north: fallbackUV, south: fallbackUV,
    east: fallbackUV, west: fallbackUV,
  };
}

/**
 * Create textured meshes for blocks
 */
export function createTexturedMeshes(
  blocks: BlockData[],
  palette: PaletteEntry[],
  atlas: TextureAtlasResponse,
  THREE: ThreeModule
): InstanceType<typeof import('three').Group> {
  const group = new THREE.Group();

  // Create texture from base64 atlas image
  const texture = createTextureFromBase64(atlas.atlasImage, THREE);

  // Calculate center offset
  let maxX = 0, maxY = 0, maxZ = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;

  for (const block of blocks) {
    maxX = Math.max(maxX, block.x);
    maxY = Math.max(maxY, block.y);
    maxZ = Math.max(maxZ, block.z);
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    minZ = Math.min(minZ, block.z);
  }

  const centerX = (maxX + minX) / 2;
  const centerY = (maxY + minY) / 2;
  const centerZ = (maxZ + minZ) / 2;

  // Group blocks by shape+palette+facing+half for instancing
  const blockGroups = groupBlocksForInstancing(blocks, palette);

  // Create meshes for each group
  for (const [, blockList] of blockGroups) {
    if (blockList.length === 0) continue;

    const firstBlock = blockList[0];
    const paletteIndex = firstBlock.paletteIndex;

    if (paletteIndex < 0 || paletteIndex >= palette.length) {
      continue;
    }

    const blockName = palette[paletteIndex].name;
    const faceTextures = atlas.uvMapping[blockName];
    const shape = firstBlock.shape || 'full';

    // Create geometry based on shape with proper UVs (registry-based)
    const geometry = createShapeGeometry(
      shape,
      faceTextures,
      firstBlock.facing,
      firstBlock.half,
      firstBlock.stairShape,
      firstBlock.connections,
      THREE,
      atlas.width,
      atlas.height
    );

    // Debug: Log once per block type
    if (DEBUG_ENABLED && !DEBUG_LOGGED_BLOCKS.has(blockName)) {
      DEBUG_LOGGED_BLOCKS.add(blockName);
      const uvAttr = geometry.getAttribute('uv');
      const posAttr = geometry.getAttribute('position');
      console.log(`[BlockRenderer] ${blockName}`, {
        shape,
        facing: firstBlock.facing,
        half: firstBlock.half,
        stairShape: firstBlock.stairShape,
        connections: firstBlock.connections,
        hasUV: !!uvAttr,
        uvCount: uvAttr?.count ?? 0,
        posCount: posAttr?.count ?? 0,
        hasFaceTextures: !!faceTextures,
        faceTexturesKeys: faceTextures ? Object.keys(faceTextures) : [],
        uvSample: uvAttr && 'getX' in uvAttr ? [(uvAttr as { getX(i: number): number }).getX(0), (uvAttr as { getY(i: number): number }).getY(0), (uvAttr as { getX(i: number): number }).getX(1), (uvAttr as { getY(i: number): number }).getY(1)] : null,
      });
    }

    // Create material with the texture atlas
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });

    // Use InstancedMesh for performance
    // Cast geometry to satisfy Three.js generic type requirements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = new THREE.InstancedMesh(geometry as any, material, blockList.length);
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < blockList.length; i++) {
      const block = blockList[i];
      matrix.setPosition(
        block.x - centerX,
        block.y - centerY,
        block.z - centerZ
      );
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return group;
}

/**
 * Group blocks by shape, palette, facing, half, stairShape, connections for efficient instancing
 */
function groupBlocksForInstancing(
  blocks: BlockData[],
  _palette: PaletteEntry[]
): Map<string, BlockData[]> {
  const groups = new Map<string, BlockData[]>();

  for (const block of blocks) {
    const shape = block.shape || 'full';
    const facing = block.facing || 'north';
    const half = block.half || 'bottom';
    const stairShape = block.stairShape || 'straight';
    // Serialize connections for grouping key
    const connectionsKey = block.connections
      ? `${block.connections.north ?? '_'}:${block.connections.south ?? '_'}:${block.connections.east ?? '_'}:${block.connections.west ?? '_'}:${block.connections.up ?? '_'}`
      : 'none';

    const key = `${block.paletteIndex}:${shape}:${facing}:${half}:${stairShape}:${connectionsKey}`;

    const existing = groups.get(key) || [];
    existing.push(block);
    groups.set(key, existing);
  }

  return groups;
}

/**
 * Debug: Track logged shapes for multi_box details
 */
const DEBUG_LOGGED_SHAPES = new Set<string>();

/**
 * Create geometry based on block shape using registry definitions
 */
function createShapeGeometry(
  shape: BlockShape,
  faceTextures: BlockFaceTextures | undefined,
  facing: BlockFacing | undefined,
  half: BlockHalf | undefined,
  stairShape: StairShape | undefined,
  connections: BlockConnections | undefined,
  THREE: ThreeModule,
  atlasWidth: number,
  atlasHeight: number
): InstanceType<typeof import('three').BufferGeometry> {
  const faces = getDefaultFaces(faceTextures, atlasWidth, atlasHeight);

  // For connectable blocks (wall, fence, glass_pane), generate dynamic geometry
  if ((shape === 'wall' || shape === 'fence' || shape === 'glass_pane') && connections) {
    return createConnectableGeometry(shape, faces, connections, THREE);
  }

  const shapeDef = getShapeDefinition(shape);
  const geomDef = shapeDef.geometry;

  // For multi-box shapes, use face tracking for proper UV mapping
  // Use stair shape variant boxes if applicable
  const effectiveBoxes = (geomDef.type === 'multi_box' && stairShape)
    ? getStairBoxes(stairShape as StairShapeVariant)
    : geomDef.boxes;

  if (geomDef.type === 'multi_box' && effectiveBoxes && effectiveBoxes.length > 1) {
    const result = boxesToGeometryWithFaceTracking(effectiveBoxes, THREE);
    const geometry = result.geometry;

    // Calculate box dimensions with position for Minecraft auto-UV
    const boxDimensions: BoxDimensions[] = effectiveBoxes.map(box => ({
      width: box.to[0] - box.from[0],
      height: box.to[1] - box.from[1],
      depth: box.to[2] - box.from[2],
      fromX: box.from[0],
      fromY: box.from[1],
      fromZ: box.from[2],
    }));

    // Debug: Log multi_box details once per shape
    if (DEBUG_ENABLED && !DEBUG_LOGGED_SHAPES.has(shape)) {
      DEBUG_LOGGED_SHAPES.add(shape);
      console.log(`[BlockRenderer:multi_box] ${shape}`, {
        boxCount: effectiveBoxes.length,
        faceRangesCount: result.faceRanges.length,
        faceRanges: result.faceRanges.slice(0, 6).map(fr => ({
          face: fr.face,
          startIndex: fr.startIndex,
          endIndex: fr.endIndex,
          boxIndex: fr.boxIndex,
        })),
        boxDimensions,
        posCount: geometry.getAttribute('position')?.count ?? 0,
        uvCount: geometry.getAttribute('uv')?.count ?? 0,
      });
    }

    // Apply rotation: stairs use official blockstate rotations, others use generic facing
    const isStair = geomDef.type === 'multi_box' && stairShape;
    if (isStair && facing) {
      const rot = getStairRotation(facing, (stairShape ?? 'straight') as StairShapeVariant, half ?? 'bottom');
      // Minecraft internally negates blockstate rotation angles:
      // BlockModelRotation uses rotateYXZ(-y, -x, 0) in the source code
      const xRad = -(rot.xDeg * Math.PI) / 180;
      const yRad = -(rot.yDeg * Math.PI) / 180;
      if (xRad !== 0) geometry.rotateX(xRad);
      if (yRad !== 0) geometry.rotateY(yRad);
    } else {
      if (shapeDef.rotatable && facing) {
        const FACING_Y_ROTATIONS: Record<string, number> = {
          north: Math.PI,
          east: Math.PI / 2,
          south: 0,
          west: -Math.PI / 2,
        };
        if (shapeDef.facingMode === 'directional') {
          // 6-direction blocks: from official Minecraft blockstate JSON
          // Minecraft internally negates blockstate angles: rotateYXZ(-y, -x, 0)
          const DIRECTIONAL_ROTATIONS: Record<string, { x: number; y: number }> = {
            up:    { x: 0,             y: 0 },
            down:  { x: -Math.PI,      y: 0 },              // x=180 → -180
            north: { x: -Math.PI / 2,  y: 0 },              // x=90 → -90
            south: { x: -Math.PI / 2,  y: -Math.PI },        // x=90,y=180 → -90,-180
            east:  { x: -Math.PI / 2,  y: -Math.PI / 2 },    // x=90,y=90 → -90,-90
            west:  { x: -Math.PI / 2,  y: Math.PI / 2 },     // x=90,y=270 → -90,+90
          };
          const rot = DIRECTIONAL_ROTATIONS[facing] ?? { x: 0, y: 0 };
          if (rot.x !== 0) geometry.rotateX(rot.x);
          if (rot.y !== 0) geometry.rotateY(rot.y);
        } else {
          // Horizontal-only blocks (furnaces, chests, trapdoors, etc.)
          if (facing !== 'up' && facing !== 'down') {
            const yAngle = FACING_Y_ROTATIONS[facing] ?? 0;
            if (yAngle !== 0) geometry.rotateY(yAngle);
          }
        }
      }
      if (half === 'top' && geomDef.type === 'multi_box') {
        geometry.rotateX(Math.PI);
      }
    }

    // Apply UVs using face ranges with box dimensions for proper scaling
    applyUVsToGeometry(geometry, faces, shapeDef, THREE, result.faceRanges, boxDimensions);

    return geometry;
  }

  // Generate base geometry from registry definition (non-multi-box)
  // Create options object conditionally to satisfy exactOptionalPropertyTypes
  const genOptions: { facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down'; half?: 'top' | 'bottom' } = {};
  if (facing !== undefined) {
    genOptions.facing = facing;
  }
  if (half !== undefined) {
    genOptions.half = half;
  }
  const geometry = generateGeometry(shapeDef, THREE, genOptions);

  // Apply UVs based on shape type
  applyUVsToGeometry(geometry, faces, shapeDef, THREE);

  return geometry;
}

/**
 * Create geometry for connectable blocks (wall, fence, glass_pane) based on connection state
 */
function createConnectableGeometry(
  shape: BlockShape,
  faces: BlockFaceTextures,
  connections: BlockConnections,
  THREE: ThreeModule
): InstanceType<typeof import('three').BufferGeometry> {
  const boxes: Array<{ from: [number, number, number]; to: [number, number, number] }> = [];

  if (shape === 'wall') {
    // Wall: center post + arms
    const hasNorth = connections.north && connections.north !== 'none';
    const hasSouth = connections.south && connections.south !== 'none';
    const hasEast = connections.east && connections.east !== 'none';
    const hasWest = connections.west && connections.west !== 'none';
    const hasUp = connections.up;

    // Center post (if up or no horizontal connections or 2+ connections)
    const connectionCount = [hasNorth, hasSouth, hasEast, hasWest].filter(Boolean).length;
    if (hasUp || connectionCount !== 2 || (hasNorth && hasEast) || (hasNorth && hasWest) || (hasSouth && hasEast) || (hasSouth && hasWest)) {
      const postHeight = hasUp ? 16 : 13;
      boxes.push({ from: [5, 0, 5], to: [11, postHeight, 11] });
    }

    // North arm
    if (hasNorth) {
      const height = connections.north === 'tall' ? 16 : 13;
      boxes.push({ from: [5, 0, 0], to: [11, height, 5] });
    }
    // South arm
    if (hasSouth) {
      const height = connections.south === 'tall' ? 16 : 13;
      boxes.push({ from: [5, 0, 11], to: [11, height, 16] });
    }
    // East arm
    if (hasEast) {
      const height = connections.east === 'tall' ? 16 : 13;
      boxes.push({ from: [11, 0, 5], to: [16, height, 11] });
    }
    // West arm
    if (hasWest) {
      const height = connections.west === 'tall' ? 16 : 13;
      boxes.push({ from: [0, 0, 5], to: [5, height, 11] });
    }
  } else if (shape === 'fence') {
    // Fence: center post [6,0,6]-[10,16,10] + bars that overlap into post
    // Official: fence_side bars extend z=0..9 (into post region 6..10)
    boxes.push({ from: [6, 0, 6], to: [10, 16, 10] });

    const hasNorth = connections.north === true;
    const hasSouth = connections.south === true;
    const hasEast = connections.east === true;
    const hasWest = connections.west === true;

    // North bars: [7,12,0]-[9,15,9] and [7,6,0]-[9,9,9]
    if (hasNorth) {
      boxes.push({ from: [7, 12, 0], to: [9, 15, 9] });
      boxes.push({ from: [7, 6, 0], to: [9, 9, 9] });
    }
    // South bars: rotated 180° from north
    if (hasSouth) {
      boxes.push({ from: [7, 12, 7], to: [9, 15, 16] });
      boxes.push({ from: [7, 6, 7], to: [9, 9, 16] });
    }
    // East bars: rotated 90° from north
    if (hasEast) {
      boxes.push({ from: [7, 12, 7], to: [16, 15, 9] });
      boxes.push({ from: [7, 6, 7], to: [16, 9, 9] });
    }
    // West bars: rotated 270° from north
    if (hasWest) {
      boxes.push({ from: [0, 12, 7], to: [9, 15, 9] });
      boxes.push({ from: [0, 6, 7], to: [9, 9, 9] });
    }
  } else if (shape === 'glass_pane') {
    // Glass pane: center post always rendered + side arms
    // Official: post [7,0,7]-[9,16,9] is unconditional
    const hasNorth = connections.north === true;
    const hasSouth = connections.south === true;
    const hasEast = connections.east === true;
    const hasWest = connections.west === true;

    // Center post (always present per official blockstate)
    boxes.push({ from: [7, 0, 7], to: [9, 16, 9] });

    // North arm: [7,0,0]-[9,16,7]
    if (hasNorth) {
      boxes.push({ from: [7, 0, 0], to: [9, 16, 7] });
    }
    // South arm: [7,0,9]-[9,16,16]
    if (hasSouth) {
      boxes.push({ from: [7, 0, 9], to: [9, 16, 16] });
    }
    // East arm: [9,0,7]-[16,16,9]
    if (hasEast) {
      boxes.push({ from: [9, 0, 7], to: [16, 16, 9] });
    }
    // West arm: [0,0,7]-[7,16,9]
    if (hasWest) {
      boxes.push({ from: [0, 0, 7], to: [7, 16, 9] });
    }
  }

  // Generate geometry from boxes
  if (boxes.length === 0) {
    // Fallback to default shape
    const shapeDef = getShapeDefinition(shape);
    return generateGeometry(shapeDef, THREE);
  }

  // Calculate box dimensions for UV scaling
  const boxDimensions: BoxDimensions[] = boxes.map(box => ({
    width: box.to[0] - box.from[0],
    height: box.to[1] - box.from[1],
    depth: box.to[2] - box.from[2],
  }));

  // Build per-box face texture overrides for glass panes
  // Thin edges use glass_pane_top, flat surfaces use glass
  const perBoxFaces: BlockFaceTextures[] | undefined = shape === 'glass_pane'
    ? boxDimensions.map(dims => {
        const edgeUV = faces.top;    // glass_pane_top
        const glassUV = faces.north; // glass (any side face)
        const isThinX = dims.width <= 2;
        const isThinZ = dims.depth <= 2;

        if (isThinX && isThinZ) {
          // Center post: all faces show edge texture
          return { top: edgeUV, bottom: edgeUV, north: edgeUV, south: edgeUV, east: edgeUV, west: edgeUV };
        } else if (isThinX) {
          // N-S arm: east/west are flat glass, north/south are thin edges
          return { top: edgeUV, bottom: edgeUV, north: edgeUV, south: edgeUV, east: glassUV, west: glassUV };
        } else if (isThinZ) {
          // E-W arm: north/south are flat glass, east/west are thin edges
          return { top: edgeUV, bottom: edgeUV, north: glassUV, south: glassUV, east: edgeUV, west: edgeUV };
        }
        return faces;
      })
    : undefined;

  const result = boxesToGeometryWithFaceTracking(boxes, THREE);
  applyBoxUVsToMergedGeometryWithFaceRanges(result.geometry, faces, result.faceRanges, boxDimensions, perBoxFaces);

  return result.geometry;
}

/**
 * Box dimensions for UV scaling calculation
 */
interface BoxDimensions {
  readonly width: number;  // X size (0-16 scale)
  readonly height: number; // Y size (0-16 scale)
  readonly depth: number;  // Z size (0-16 scale)
  readonly fromX?: number; // X start in 0-16 scale
  readonly fromY?: number; // Y start in 0-16 scale
  readonly fromZ?: number; // Z start in 0-16 scale
}

/**
 * Scale UV coordinates for a face based on box dimensions and position.
 * Implements Minecraft's auto-UV algorithm: UV coordinates are derived from
 * the box's position and size in the 0-16 grid, ensuring correct texture
 * portion is shown for each face of each box element.
 *
 * UV mapping convention (matching Minecraft):
 * - North (-Z): U=X, V=Y (inverted)
 * - South (+Z): U=X (mirrored), V=Y (inverted)
 * - East (+X): U=Z (mirrored), V=Y (inverted)
 * - West (-X): U=Z, V=Y (inverted)
 * - Top (+Y): U=X, V=Z
 * - Bottom (-Y): U=X, V=Z (mirrored)
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
      // North face (-Z): U maps to X, V maps to Y (top of texture = top of block)
      uOffset = fx / 16;
      uScale = width / 16;
      vOffset = (16 - ty) / 16;
      vScale = height / 16;
      break;
    case 'south':
      // South face (+Z): U maps to X (mirrored), V maps to Y
      uOffset = (16 - tx) / 16;
      uScale = width / 16;
      vOffset = (16 - ty) / 16;
      vScale = height / 16;
      break;
    case 'east':
      // East face (+X): U maps to Z (mirrored), V maps to Y
      uOffset = (16 - tz) / 16;
      uScale = depth / 16;
      vOffset = (16 - ty) / 16;
      vScale = height / 16;
      break;
    case 'west':
      // West face (-X): U maps to Z, V maps to Y
      uOffset = fz / 16;
      uScale = depth / 16;
      vOffset = (16 - ty) / 16;
      vScale = height / 16;
      break;
    case 'top':
      // Top face (+Y): U maps to X, V maps to Z
      uOffset = fx / 16;
      uScale = width / 16;
      vOffset = fz / 16;
      vScale = depth / 16;
      break;
    case 'bottom':
      // Bottom face (-Y): U maps to X, V maps to Z (mirrored)
      uOffset = fx / 16;
      uScale = width / 16;
      vOffset = (16 - tz) / 16;
      vScale = depth / 16;
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

/**
 * Apply box UVs to merged geometry using face ranges for proper per-face texturing
 * Includes box-specific UV scaling based on dimensions
 */
function applyBoxUVsToMergedGeometryWithFaceRanges(
  geometry: InstanceType<typeof import('three').BufferGeometry>,
  faces: BlockFaceTextures,
  faceRanges: readonly FaceRange[],
  boxDimensions?: readonly BoxDimensions[],
  perBoxFaces?: readonly BlockFaceTextures[]
): void {
  // Determine the number of boxes from faceRanges
  const maxBoxIndex = faceRanges.reduce((max, fr) => Math.max(max, fr.boxIndex), 0);
  const boxCount = maxBoxIndex + 1;

  // Create face UV mapping for all boxes with proper scaling
  const faceUVsByBox: Array<{
    readonly top?: { u1: number; v1: number; u2: number; v2: number };
    readonly bottom?: { u1: number; v1: number; u2: number; v2: number };
    readonly north?: { u1: number; v1: number; u2: number; v2: number };
    readonly south?: { u1: number; v1: number; u2: number; v2: number };
    readonly east?: { u1: number; v1: number; u2: number; v2: number };
    readonly west?: { u1: number; v1: number; u2: number; v2: number };
  }> = [];

  for (let i = 0; i < boxCount; i++) {
    const dims = boxDimensions?.[i];
    const boxFaces = perBoxFaces?.[i] ?? faces;

    if (dims) {
      // Apply UV scaling based on box dimensions
      faceUVsByBox.push({
        top: scaleUVForFace(boxFaces.top, 'top', dims),
        bottom: scaleUVForFace(boxFaces.bottom, 'bottom', dims),
        north: scaleUVForFace(boxFaces.north, 'north', dims),
        south: scaleUVForFace(boxFaces.south, 'south', dims),
        east: scaleUVForFace(boxFaces.east, 'east', dims),
        west: scaleUVForFace(boxFaces.west, 'west', dims),
      });
    } else {
      // No dimensions provided, use original UVs (full block assumption)
      faceUVsByBox.push({
        top: boxFaces.top,
        bottom: boxFaces.bottom,
        north: boxFaces.north,
        south: boxFaces.south,
        east: boxFaces.east,
        west: boxFaces.west,
      });
    }
  }

  // Use the geometry-generator's function for proper UV application
  // Cast geometry to satisfy generic type requirements
  applyFaceUVsToMergedGeometry(geometry as unknown as import('three').BufferGeometry, faceRanges, faceUVsByBox);
}

/**
 * Apply UV coordinates to geometry based on shape definition
 */
function applyUVsToGeometry(
  geometry: InstanceType<typeof import('three').BufferGeometry>,
  faces: BlockFaceTextures,
  shapeDef: ShapeDefinition,
  THREE: ThreeModule,
  faceRanges?: readonly FaceRange[],
  boxDimensions?: readonly BoxDimensions[]
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) return;

  const geomType = shapeDef.geometry.type;

  if (geomType === 'cross') {
    // Apply UVs for cross geometry
    applyCrossUVs(geometry, faces, THREE);
  } else if (geomType === 'multi_box' && faceRanges && faceRanges.length > 0) {
    // For multi-box with face tracking, apply per-face UVs with box dimensions
    applyBoxUVsToMergedGeometryWithFaceRanges(geometry, faces, faceRanges, boxDimensions);
  } else if (geomType === 'multi_box') {
    // Legacy: For multi_box without face tracking
    applyBoxUVsToMergedGeometry(geometry, faces);
  } else {
    // For box type, apply standard box UVs with full dimension + position scaling
    const boxes = shapeDef.geometry.boxes;
    if (boxes && boxes.length > 0) {
      const dims: BoxDimensions = {
        width: boxes[0].to[0] - boxes[0].from[0],
        height: boxes[0].to[1] - boxes[0].from[1],
        depth: boxes[0].to[2] - boxes[0].from[2],
        fromX: boxes[0].from[0],
        fromY: boxes[0].from[1],
        fromZ: boxes[0].from[2],
      };
      applyUVsToBoxGeometry(geometry as InstanceType<typeof import('three').BoxGeometry>, faces, dims);
    } else {
      applyUVsToBoxGeometry(geometry as InstanceType<typeof import('three').BoxGeometry>, faces);
    }
  }
}

/**
 * Apply UV coordinates to cross geometry
 */
function applyCrossUVs(
  geometry: InstanceType<typeof import('three').BufferGeometry>,
  faces: BlockFaceTextures,
  _THREE: ThreeModule
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) return;

  const uvArray = (uvAttribute as { array: Float32Array }).array;
  const uv = faces.north;

  // Each plane has 6 vertices (2 triangles), we have 4 planes
  for (let plane = 0; plane < 4; plane++) {
    const baseIdx = plane * 12; // 6 vertices * 2 components

    // Triangle 1: bottom-left, bottom-right, top-right
    uvArray[baseIdx + 0] = uv.u1; uvArray[baseIdx + 1] = 1 - uv.v2;
    uvArray[baseIdx + 2] = uv.u2; uvArray[baseIdx + 3] = 1 - uv.v2;
    uvArray[baseIdx + 4] = uv.u2; uvArray[baseIdx + 5] = 1 - uv.v1;

    // Triangle 2: bottom-left, top-right, top-left
    uvArray[baseIdx + 6] = uv.u1; uvArray[baseIdx + 7] = 1 - uv.v2;
    uvArray[baseIdx + 8] = uv.u2; uvArray[baseIdx + 9] = 1 - uv.v1;
    uvArray[baseIdx + 10] = uv.u1; uvArray[baseIdx + 11] = 1 - uv.v1;
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Apply box UVs to merged geometry (for multi-box shapes like stairs)
 * Legacy fallback when face ranges are not available
 * Attempts to infer face type from vertex normals for proper texture mapping
 */
function applyBoxUVsToMergedGeometry(
  geometry: InstanceType<typeof import('three').BufferGeometry>,
  faces: BlockFaceTextures
): void {
  const uvAttribute = geometry.getAttribute('uv');
  const normalAttribute = geometry.getAttribute('normal');
  if (!uvAttribute) return;

  const uvArray = (uvAttribute as { array: Float32Array }).array;
  const vertexCount = uvAttribute.count;

  // If we have normals, use them to determine which face texture to apply
  if (normalAttribute && 'getX' in normalAttribute) {
    const normAttr = normalAttribute as { getX(i: number): number; getY(i: number): number; getZ(i: number): number };
    for (let i = 0; i < vertexCount; i++) {
      const nx = normAttr.getX(i);
      const ny = normAttr.getY(i);
      const nz = normAttr.getZ(i);

      // Determine face type from normal direction
      let uv: UVCoords;
      if (Math.abs(ny) > 0.5) {
        // Top or bottom face
        uv = ny > 0 ? faces.top : faces.bottom;
      } else if (Math.abs(nz) > 0.5) {
        // North or south face
        uv = nz > 0 ? faces.south : faces.north;
      } else {
        // East or west face
        uv = nx > 0 ? faces.east : faces.west;
      }

      // Map UV coordinates
      const u = uvArray[i * 2];
      const v = uvArray[i * 2 + 1];
      uvArray[i * 2] = uv.u1 + u * (uv.u2 - uv.u1);
      uvArray[i * 2 + 1] = 1 - (uv.v1 + (1 - v) * (uv.v2 - uv.v1));
    }
  } else {
    // Fallback: use north face for all (original behavior)
    const uv = faces.north;
    for (let i = 0; i < uvArray.length; i += 2) {
      const u = uvArray[i];
      const v = uvArray[i + 1];
      uvArray[i] = uv.u1 + u * (uv.u2 - uv.u1);
      uvArray[i + 1] = 1 - (uv.v1 + (1 - v) * (uv.v2 - uv.v1));
    }
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Create a Three.js texture from base64 PNG data
 */
function createTextureFromBase64(base64: string, THREE: ThreeModule): InstanceType<typeof import('three').Texture> {
  const img = new Image();
  img.src = `data:image/png;base64,${base64}`;

  const texture = new THREE.Texture(img);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  img.onload = () => {
    texture.needsUpdate = true;
  };

  return texture;
}

/**
 * Apply UV coordinates to a BoxGeometry with proper dimension scaling.
 * When dimensions are provided, UV coordinates are scaled per-face so that
 * textures show the correct portion (Minecraft-style cropping, not stretching).
 */
function applyUVsToBoxGeometry(
  geometry: InstanceType<typeof import('three').BoxGeometry> | InstanceType<typeof import('three').BufferGeometry>,
  faces: BlockFaceTextures,
  dimensions?: BoxDimensions
): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) return;

  const uvArray = (uvAttribute as { array: Float32Array }).array;

  // Check if this is a standard BoxGeometry (48 UV values = 24 vertices * 2)
  if (uvArray.length !== 48) {
    // For non-standard geometries, apply simple mapping
    applyBoxUVsToMergedGeometry(geometry, faces);
    return;
  }

  // Scale UVs per face using dimensions if provided
  const scaledFaces = dimensions
    ? {
        east: scaleUVForFace(faces.east, 'east', dimensions),
        west: scaleUVForFace(faces.west, 'west', dimensions),
        top: scaleUVForFace(faces.top, 'top', dimensions),
        bottom: scaleUVForFace(faces.bottom, 'bottom', dimensions),
        south: scaleUVForFace(faces.south, 'south', dimensions),
        north: scaleUVForFace(faces.north, 'north', dimensions),
      }
    : faces;

  // BoxGeometry face order:
  // 0: Right (+X), 1: Left (-X), 2: Top (+Y), 3: Bottom (-Y), 4: Front (+Z), 5: Back (-Z)
  const faceMapping: [number, UVCoords][] = [
    [0, scaledFaces.east],
    [1, scaledFaces.west],
    [2, scaledFaces.top],
    [3, scaledFaces.bottom],
    [4, scaledFaces.south],
    [5, scaledFaces.north],
  ];

  for (const [faceIndex, uv] of faceMapping) {
    const baseIndex = faceIndex * 8;

    // BoxGeometry UV layout per face: [bl, br, tl, tr]
    uvArray[baseIndex + 0] = uv.u1;     // bottom-left U
    uvArray[baseIndex + 1] = 1 - uv.v2; // bottom-left V (flipped)
    uvArray[baseIndex + 2] = uv.u2;     // bottom-right U
    uvArray[baseIndex + 3] = 1 - uv.v2; // bottom-right V (flipped)
    uvArray[baseIndex + 4] = uv.u1;     // top-left U
    uvArray[baseIndex + 5] = 1 - uv.v1; // top-left V (flipped)
    uvArray[baseIndex + 6] = uv.u2;     // top-right U
    uvArray[baseIndex + 7] = 1 - uv.v1; // top-right V (flipped)
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Dispose of textured mesh resources
 */
export function disposeTexturedMeshes(group: InstanceType<typeof import('three').Group>): void {
  group.traverse((object) => {
    const obj = object as unknown as {
      geometry?: { dispose(): void };
      material?: { dispose(): void; map?: { dispose(): void } } | Array<{ dispose(): void; map?: { dispose(): void } }>;
    };

    if (obj.geometry) {
      obj.geometry.dispose();
    }

    if (obj.material) {
      const material = obj.material;

      if (Array.isArray(material)) {
        for (const mat of material) {
          disposeMaterial(mat);
        }
      } else {
        disposeMaterial(material);
      }
    }
  });
}

/**
 * Dispose of material and its textures
 */
function disposeMaterial(material: { dispose(): void; map?: { dispose(): void } }): void {
  if ('map' in material && material.map) {
    material.map.dispose();
  }
  material.dispose();
}

/**
 * Detect block shape from block name (registry-based)
 */
export function detectBlockShape(blockName: string, properties?: Record<string, string>): BlockShape {
  const base = getShapeForBlock(blockName);
  // Hanging lanterns use a different model
  if (base === 'lantern' && properties?.['hanging'] === 'true') {
    return 'hanging_lantern';
  }
  return base;
}

/**
 * Extract facing from block properties
 */
export function extractFacing(properties?: Record<string, string>): BlockFacing | undefined {
  if (!properties) return undefined;
  const facing = properties['facing'];
  if (facing && ['north', 'south', 'east', 'west', 'up', 'down'].includes(facing)) {
    return facing as BlockFacing;
  }
  return undefined;
}

/**
 * Extract half from block properties
 */
export function extractHalf(properties?: Record<string, string>): BlockHalf | undefined {
  if (!properties) return undefined;

  const type = properties['type'];
  if (type === 'top') return 'top';
  if (type === 'bottom') return 'bottom';

  const half = properties['half'];
  if (half === 'top') return 'top';
  if (half === 'bottom') return 'bottom';

  return undefined;
}

/**
 * Extract stair shape from block properties
 */
export function extractStairShape(properties?: Record<string, string>): StairShape | undefined {
  if (!properties) return undefined;
  const shape = properties['shape'];
  if (shape && ['straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right'].includes(shape)) {
    return shape as StairShape;
  }
  return undefined;
}

/**
 * Compute stair shape from adjacent blocks using Minecraft's exact algorithm.
 * Matches the decompiled StairBlock.getStairsShape() logic including:
 * - half property check (bottom connects only to bottom, top to top)
 * - canTakeShape validation (prevents false corners when stair continues alongside)
 *
 * @param facing - The facing direction of this stair block
 * @param half - The half (top/bottom) of this stair block
 * @param neighbors - Map of direction to adjacent block info
 * @returns Computed stair shape
 */
export function computeStairShape(
  facing: BlockFacing,
  half: BlockHalf | undefined,
  neighbors: {
    north: { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined;
    south: { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined;
    east: { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined;
    west: { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined;
  }
): StairShape {
  const selfHalf = half ?? 'bottom';
  const frontDir = facing;
  const backDir = getOppositeFacing(facing);
  const leftDir = getLeftFacing(facing);
  const rightDir = getRightFacing(facing);

  const front = neighbors[frontDir as keyof typeof neighbors];
  const back = neighbors[backDir as keyof typeof neighbors];

  // Check front neighbor for inner corners (Minecraft: pos.relative(facing))
  if (front?.isStair && front.facing && (front.half ?? 'bottom') === selfHalf) {
    // Front neighbor must face perpendicular to this stair
    if (front.facing === leftDir || front.facing === rightDir) {
      // canTakeShape: check that the block on the opposite side of the front neighbor's facing
      // is not a stair with the same facing and half as this stair
      const checkDir = getOppositeFacing(front.facing);
      const sideNeighbor = neighbors[checkDir as keyof typeof neighbors];
      const canTake = !sideNeighbor?.isStair ||
        sideNeighbor.facing !== facing ||
        (sideNeighbor.half ?? 'bottom') !== selfHalf;

      if (canTake) {
        if (front.facing === leftDir) return 'inner_left';
        return 'inner_right';
      }
    }
  }

  // Check back neighbor for outer corners (Minecraft: pos.relative(facing.getOpposite()))
  if (back?.isStair && back.facing && (back.half ?? 'bottom') === selfHalf) {
    if (back.facing === leftDir || back.facing === rightDir) {
      // canTakeShape: check the block on the same side as back neighbor's facing
      const checkDir = back.facing;
      const sideNeighbor = neighbors[checkDir as keyof typeof neighbors];
      const canTake = !sideNeighbor?.isStair ||
        sideNeighbor.facing !== facing ||
        (sideNeighbor.half ?? 'bottom') !== selfHalf;

      if (canTake) {
        if (back.facing === leftDir) return 'outer_left';
        return 'outer_right';
      }
    }
  }

  return 'straight';
}

function getOppositeFacing(facing: BlockFacing): BlockFacing {
  const opposites: Record<string, BlockFacing> = {
    north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up',
  };
  return opposites[facing] ?? facing;
}

function getLeftFacing(facing: BlockFacing): BlockFacing {
  const lefts: Record<string, BlockFacing> = {
    north: 'west', south: 'east', east: 'north', west: 'south',
  };
  return lefts[facing] ?? facing;
}

function getRightFacing(facing: BlockFacing): BlockFacing {
  const rights: Record<string, BlockFacing> = {
    north: 'east', south: 'west', east: 'south', west: 'north',
  };
  return rights[facing] ?? facing;
}

/**
 * Extract connection state for walls, fences, glass panes
 */
export function extractConnections(properties?: Record<string, string>): BlockConnections | undefined {
  if (!properties) return undefined;

  // Check if any connection properties exist
  const hasConnectionProps = ['north', 'south', 'east', 'west', 'up'].some(dir => dir in properties);
  if (!hasConnectionProps) return undefined;

  const parseConnection = (value: string | undefined): boolean | WallHeight | undefined => {
    if (!value) return undefined;
    // For walls: 'none', 'low', 'tall'
    if (value === 'none' || value === 'low' || value === 'tall') {
      return value as WallHeight;
    }
    // For fences/glass panes: 'true', 'false'
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };

  const connections: BlockConnections = {};

  const north = parseConnection(properties['north']);
  const south = parseConnection(properties['south']);
  const east = parseConnection(properties['east']);
  const west = parseConnection(properties['west']);
  const up = properties['up'] === 'true';

  if (north !== undefined) connections.north = north;
  if (south !== undefined) connections.south = south;
  if (east !== undefined) connections.east = east;
  if (west !== undefined) connections.west = west;
  if (properties['up'] !== undefined) connections.up = up;

  return Object.keys(connections).length > 0 ? connections : undefined;
}
