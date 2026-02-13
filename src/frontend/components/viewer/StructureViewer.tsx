import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useRenderData } from '../../hooks/useStructure';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { texturesApi } from '../../api/textures';
import type { TextureAtlasResponse, RenderMode } from '../../types/texture';
import type { BlockData, BlockShape, BlockFacing, BlockHalf } from '../../types/structure';
import {
  createTexturedMeshes,
  disposeTexturedMeshes,
  detectBlockShape,
  extractFacing,
  extractHalf,
  extractStairShape,
  extractConnections,
  computeStairShape,
} from './TexturedBlockRenderer';
import { getShapeDefinition } from '../../../infra/renderer/block-shape-registry';
import { generateGeometry } from '../../../infra/renderer/geometry-generator';
import { CreativeCameraController } from './CreativeCameraController';

interface StructureViewerProps {
  structureId: string;
  className?: string;
}

export function StructureViewer({ structureId, className = '' }: StructureViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: renderData, isLoading, error } = useRenderData(structureId);
  const [isRendererReady, setIsRendererReady] = useState(false);

  // Texture mode state
  const [renderMode, setRenderMode] = useState<RenderMode>('fast');
  const [resourcePackUrl, setResourcePackUrl] = useState('');
  const [textureAtlas, setTextureAtlas] = useState<TextureAtlasResponse | null>(null);
  const [isLoadingTextures, setIsLoadingTextures] = useState(false);
  const [textureError, setTextureError] = useState<string | null>(null);

  // Camera state
  const [moveSpeed, setMoveSpeed] = useState(10);
  const moveSpeedRef = useRef(10);
  const creativeControllerRef = useRef<CreativeCameraController | null>(null);

  // Load textures when mode changes to 'texture'
  const loadTextures = useCallback(async () => {
    if (!renderData || renderData.palette.length === 0) return;

    setIsLoadingTextures(true);
    setTextureError(null);

    try {
      const blockIds = renderData.palette.map((p) => p.name);

      let response;
      if (resourcePackUrl) {
        response = await texturesApi.getResourcePackAtlas(resourcePackUrl, blockIds);
      } else {
        response = await texturesApi.getAtlas(blockIds);
      }

      if (response.success && response.data) {
        setTextureAtlas(response.data);
      } else {
        setTextureError('テクスチャの読み込みに失敗しました');
      }
    } catch (err) {
      console.error('Failed to load textures:', err);
      setTextureError('テクスチャの読み込みに失敗しました');
    } finally {
      setIsLoadingTextures(false);
    }
  }, [renderData, resourcePackUrl]);

  // Load textures when switching to texture mode
  useEffect(() => {
    if (renderMode === 'texture' && !textureAtlas && !isLoadingTextures) {
      loadTextures();
    }
  }, [renderMode, textureAtlas, isLoadingTextures, loadTextures]);

  // Toggle render mode
  const handleModeToggle = () => {
    setRenderMode((prev) => (prev === 'fast' ? 'texture' : 'fast'));
  };

  // Process blocks with shape detection (2-pass for stair shape computation)
  const processedBlocks = useMemo(() => {
    if (!renderData) return [];

    // Pass 1: Extract basic properties
    const blocks = renderData.blocks.map((block) => {
      const paletteEntry = renderData.palette[block.paletteIndex];
      if (!paletteEntry) return block;

      const shape = block.shape ?? detectBlockShape(paletteEntry.name, paletteEntry.properties);
      const facing = block.facing ?? extractFacing(paletteEntry.properties);
      const half = block.half ?? extractHalf(paletteEntry.properties);
      const stairShape = block.stairShape ?? extractStairShape(paletteEntry.properties);
      const connections = block.connections ?? extractConnections(paletteEntry.properties);

      return {
        ...block,
        shape,
        facing,
        half,
        stairShape,
        connections,
      } as BlockData;
    });

    // Pass 2: Compute stair shapes from neighbors when not available from NBT
    const needsStairComputation = blocks.some(
      (b) => b.shape === 'stairs' && !b.stairShape && b.facing
    );

    if (!needsStairComputation) return blocks;

    // Build spatial index for neighbor lookup
    const blockMap = new Map<string, BlockData>();
    for (const b of blocks) {
      blockMap.set(`${b.x},${b.y},${b.z}`, b);
    }

    return blocks.map((block) => {
      if (block.shape !== 'stairs' || block.stairShape || !block.facing) return block;

      // Stair shape is determined only by same-level horizontal neighbors
      const getNeighborInfo = (dx: number, dz: number): { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } | undefined => {
        const neighbor = blockMap.get(`${block.x + dx},${block.y},${block.z + dz}`);
        if (!neighbor) return undefined;
        const info: { isStair: boolean; facing?: BlockFacing; half?: BlockHalf } = {
          isStair: neighbor.shape === 'stairs',
        };
        if (neighbor.facing !== undefined) {
          info.facing = neighbor.facing;
        }
        if (neighbor.half !== undefined) {
          info.half = neighbor.half;
        }
        return info;
      };

      const computed = computeStairShape(block.facing, block.half, {
        north: getNeighborInfo(0, -1),
        south: getNeighborInfo(0, 1),
        east: getNeighborInfo(1, 0),
        west: getNeighborInfo(-1, 0),
      });

      return { ...block, stairShape: computed };
    });
  }, [renderData]);

  // Apply resource pack
  const handleApplyResourcePack = () => {
    setTextureAtlas(null);
    loadTextures();
  };

  useEffect(() => {
    if (!canvasRef.current || !renderData) return;

    // Three.jsレンダラーを初期化
    const initRenderer = async (): Promise<(() => void) | undefined> => {
      try {
        const THREE = await import('three');

        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : 800;
        const height = rect.height > 0 ? rect.height : 600;

        // シーン、カメラ、レンダラーのセットアップ
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Camera controller (orbit-style drag + WASD fly)
        const cameraController = new CreativeCameraController(camera, canvas, THREE);
        await cameraController.init();
        creativeControllerRef.current = cameraController;

        // ライト
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        // ブロックを描画
        const { dimensions, palette } = renderData;

        if (!processedBlocks || processedBlocks.length === 0) {
          console.warn('No blocks to render');
          setIsRendererReady(true);
          return;
        }

        const centerX = dimensions.x / 2;
        const centerY = dimensions.y / 2;
        const centerZ = dimensions.z / 2;

        // Store references for cleanup
        let meshGroup: InstanceType<typeof THREE.Group> | null = null;

        // Choose rendering method based on mode
        if (renderMode === 'texture' && textureAtlas) {
          // Texture mode: use textured meshes with shapes
          meshGroup = createTexturedMeshes(processedBlocks, palette, textureAtlas, THREE);
          scene.add(meshGroup);
        } else {
          // Fast mode: use solid colors with shapes
          meshGroup = createFastModeGroup(processedBlocks, palette, centerX, centerY, centerZ, THREE);
          scene.add(meshGroup);
        }

        // カメラ位置を調整
        const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
        camera.position.set(maxDim, maxDim * 0.8, maxDim);
        camera.lookAt(0, 0, 0);

        // アニメーションループ
        const clock = new THREE.Clock();
        let animationId: number;
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          const delta = clock.getDelta();
          cameraController.update(delta);
          const currentSpeed = cameraController.getSpeed();
          if (currentSpeed !== moveSpeedRef.current) {
            moveSpeedRef.current = currentSpeed;
            setMoveSpeed(currentSpeed);
          }
          renderer.render(scene, camera);
        };
        animate();

        setIsRendererReady(true);

        // リサイズハンドラ
        const handleResize = () => {
          const { width, height } = canvas.getBoundingClientRect();
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // クリーンアップ
        return () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener('resize', handleResize);

          if (meshGroup) {
            disposeTexturedMeshes(meshGroup);
            scene.remove(meshGroup);
          }

          cameraController.dispose();
          creativeControllerRef.current = null;
          renderer.dispose();
        };
      } catch (err) {
        console.error('Failed to initialize renderer:', err);
        return undefined;
      }
    };

    setIsRendererReady(false);
    const cleanup = initRenderer();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [renderData, renderMode, textureAtlas, processedBlocks]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center text-white">
          <p className="text-lg">読み込みエラー</p>
          <p className="text-sm text-gray-400 mt-2">構造データを取得できませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 ${className}`}>
      {/* Mode Toggle Controls */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={handleModeToggle}
            disabled={isLoadingTextures}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              renderMode === 'fast'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoadingTextures ? (
              <span className="flex items-center gap-1">
                <LoadingSpinner size="sm" />
                読込中...
              </span>
            ) : renderMode === 'fast' ? (
              'テクスチャ'
            ) : (
              '高速'
            )}
          </button>
        </div>

        {/* Resource Pack URL Input (only in texture mode) */}
        {renderMode === 'texture' && (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="リソースパックURL（空欄でバニラ）"
              value={resourcePackUrl}
              onChange={(e) => setResourcePackUrl(e.target.value)}
              className="px-2 py-1 rounded text-xs bg-gray-800 text-white border border-gray-600 focus:border-blue-500 focus:outline-none w-48"
            />
            <button
              onClick={handleApplyResourcePack}
              disabled={isLoadingTextures}
              className="px-2 py-1 rounded text-xs bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              適用
            </button>
          </div>
        )}

        {/* Texture Error Message */}
        {textureError && (
          <div className="text-xs text-red-400 bg-red-900/50 px-2 py-1 rounded">
            {textureError}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {(isLoading || isLoadingTextures) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Controls HUD */}
      {isRendererReady && (
        <div className="absolute bottom-2 left-2 z-20 bg-black/50 text-white px-2 py-1 rounded text-xs">
          Drag: Look / WASD: Move / Space: Up / Shift: Down / Scroll: Speed ({moveSpeed.toFixed(0)})
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          opacity: isRendererReady ? 1 : 0,
          minHeight: '300px'
        }}
      />

      {/* Initialization Overlay */}
      {!isLoading && !isLoadingTextures && !isRendererReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/50 text-center">
            <div className="text-6xl mb-2">3D</div>
            <p>3Dビューワーを初期化中...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Create fast mode rendering group with shape support
 */
function createFastModeGroup(
  blocks: BlockData[],
  palette: { name: string; properties?: Record<string, string> }[],
  centerX: number,
  centerY: number,
  centerZ: number,
  THREE: typeof import('three')
): InstanceType<typeof import('three').Group> {
  const group = new THREE.Group();

  // Group blocks by palette+shape+facing+half for instancing
  const blockGroups = new Map<string, BlockData[]>();

  for (const block of blocks) {
    const shape = block.shape || 'full';
    const facing = block.facing || 'north';
    const half = block.half || 'bottom';
    const key = `${block.paletteIndex}:${shape}:${facing}:${half}`;

    const existing = blockGroups.get(key) || [];
    existing.push(block);
    blockGroups.set(key, existing);
  }

  // Create meshes for each group
  for (const [, blockList] of blockGroups) {
    if (blockList.length === 0) continue;

    const firstBlock = blockList[0];
    const paletteIndex = firstBlock.paletteIndex;

    if (paletteIndex < 0 || paletteIndex >= palette.length) continue;

    const blockName = palette[paletteIndex].name;
    const color = getBlockColor(blockName);
    const shape = firstBlock.shape || 'full';
    const facing = firstBlock.facing;
    const half = firstBlock.half;

    // Create geometry based on shape
    const geometry = createShapeGeometryFast(shape, facing, half, THREE);
    const material = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

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
 * Create geometry for fast mode based on shape (registry-based)
 */
function createShapeGeometryFast(
  shape: BlockShape,
  facing: BlockFacing | undefined,
  half: BlockHalf | undefined,
  THREE: typeof import('three')
): InstanceType<typeof import('three').BufferGeometry> {
  const shapeDef = getShapeDefinition(shape);
  // Create options object conditionally to satisfy exactOptionalPropertyTypes
  const options: { facing?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down'; half?: 'top' | 'bottom' } = {};
  if (facing !== undefined) {
    options.facing = facing;
  }
  if (half !== undefined) {
    options.half = half;
  }
  return generateGeometry(shapeDef, THREE, options);
}

// Color palette for colored blocks
const dyeColors: Record<string, number> = {
  white: 0xf0f0f0,
  orange: 0xd87f33,
  magenta: 0xb24cd8,
  light_blue: 0x6699d8,
  yellow: 0xe5e533,
  lime: 0x7fcc19,
  pink: 0xf27fa5,
  gray: 0x4c4c4c,
  light_gray: 0x999999,
  cyan: 0x4c7f99,
  purple: 0x7f3fb2,
  blue: 0x334cb2,
  brown: 0x664c33,
  green: 0x667f33,
  red: 0x993333,
  black: 0x191919,
};

// ブロック名から色を生成
function getBlockColor(blockName: string): number {
  const colorMap: Record<string, number> = {
    'minecraft:stone': 0x7d7d7d,
    'minecraft:dirt': 0x8b5a2b,
    'minecraft:grass_block': 0x5d8c3d,
    'minecraft:cobblestone': 0x6b6b6b,
    'minecraft:oak_log': 0x6b5139,
    'minecraft:oak_planks': 0xb8945f,
    'minecraft:spruce_log': 0x3b2d1e,
    'minecraft:spruce_planks': 0x6a5238,
    'minecraft:birch_log': 0xd8d0a8,
    'minecraft:birch_planks': 0xc8b77a,
    'minecraft:dark_oak_log': 0x3b2d1e,
    'minecraft:dark_oak_planks': 0x3e2912,
    'minecraft:bricks': 0x9c5a4a,
    'minecraft:stone_bricks': 0x7a7a7a,
    'minecraft:mossy_stone_bricks': 0x6a7a5a,
    'minecraft:cracked_stone_bricks': 0x6a6a6a,
    'minecraft:glass': 0xc0e8ff,
    'minecraft:water': 0x3f76e4,
    'minecraft:lava': 0xd96415,
    'minecraft:sand': 0xdbd3a0,
    'minecraft:sandstone': 0xdbd3a0,
    'minecraft:gravel': 0x857b72,
    'minecraft:iron_block': 0xd8d8d8,
    'minecraft:gold_block': 0xf9d849,
    'minecraft:diamond_block': 0x41d6c3,
    'minecraft:emerald_block': 0x41d63c,
    'minecraft:redstone_block': 0xaa0f01,
    'minecraft:quartz_block': 0xebe8e0,
    'minecraft:quartz_pillar': 0xebe8e0,
    'minecraft:smooth_quartz': 0xebe8e0,
    'minecraft:obsidian': 0x0f0a18,
    'minecraft:netherrack': 0x6f3535,
    'minecraft:nether_bricks': 0x2d1717,
    'minecraft:glowstone': 0xf9d849,
    'minecraft:prismarine': 0x63a29a,
    'minecraft:dark_prismarine': 0x335c54,
    'minecraft:sea_lantern': 0xa8d4d4,
    'minecraft:purpur_block': 0xa97fa9,
    'minecraft:end_stone': 0xdbd6a3,
    'minecraft:end_stone_bricks': 0xdbd6a3,
    'minecraft:air': 0x000000,
  };

  // 完全一致を探す
  if (blockName in colorMap) {
    return colorMap[blockName];
  }

  // Check for colored blocks (concrete, wool, terracotta, glass, etc.)
  for (const [dyeName, dyeColor] of Object.entries(dyeColors)) {
    if (blockName.includes(dyeName)) {
      if (blockName.includes('concrete')) {
        return dyeColor;
      }
      if (blockName.includes('wool')) {
        return dyeColor;
      }
      if (blockName.includes('terracotta')) {
        const r = ((dyeColor >> 16) & 0xff) * 0.7;
        const g = ((dyeColor >> 8) & 0xff) * 0.7;
        const b = (dyeColor & 0xff) * 0.7;
        return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
      }
      if (blockName.includes('stained_glass')) {
        const r = Math.min(255, ((dyeColor >> 16) & 0xff) + 60);
        const g = Math.min(255, ((dyeColor >> 8) & 0xff) + 60);
        const b = Math.min(255, (dyeColor & 0xff) + 60);
        return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
      }
      return dyeColor;
    }
  }

  // 部分一致を探す（基本ブロック）
  for (const [key, color] of Object.entries(colorMap)) {
    if (blockName.includes(key.replace('minecraft:', ''))) {
      return color;
    }
  }

  // デフォルトカラー（ハッシュベース）
  let hash = 0;
  for (let i = 0; i < blockName.length; i++) {
    hash = blockName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = Math.max(64, (hash >> 16) & 0xff);
  const g = Math.max(64, (hash >> 8) & 0xff);
  const b = Math.max(64, hash & 0xff);
  return (r << 16) | (g << 8) | b;
}
