/**
 * Block Shape Registry
 *
 * Centralized registry for block shape definitions.
 * Supports loading from JSON file for easy updates with Minecraft versions.
 */

import type { BlockShape } from '../../frontend/types/structure.js';

// ========================================
// Types (JSON-compatible)
// ========================================

/**
 * Box definition for geometry generation (0-16 scale, Minecraft model format)
 */
export interface BoxDefinition {
  /** Start coordinates [x, y, z] in 0-16 scale */
  readonly from: [number, number, number];
  /** End coordinates [x, y, z] in 0-16 scale */
  readonly to: [number, number, number];
  /** Optional rotation */
  readonly rotation?: {
    readonly axis: 'x' | 'y' | 'z';
    readonly angle: number;
    readonly origin: [number, number, number];
  };
}

/**
 * Geometry definition within a shape
 */
export interface GeometryDefinition {
  /** Geometry type */
  readonly type: 'box' | 'multi_box' | 'cross' | 'custom';
  /** Box definitions for box/multi_box types */
  readonly boxes?: BoxDefinition[];
  /** Custom generator function name */
  readonly customGenerator?: string;
}

/**
 * Shape definition containing all geometry parameters
 */
export interface ShapeDefinition {
  /** Geometry definition */
  readonly geometry: GeometryDefinition;
  /** Whether rotation based on facing is supported */
  readonly rotatable: boolean;
  /** Facing mode: 'horizontal' (default, Y-only rotation) or 'directional' (all 6 directions, X+Y rotation) */
  readonly facingMode?: 'horizontal' | 'directional';
  /** Connection type for connectable blocks */
  readonly connectable?: 'horizontal' | 'vertical' | 'both';
}

/**
 * Block shape registry structure
 */
interface BlockShapeRegistry {
  readonly version: string;
  readonly lastUpdated: string;
  readonly shapes: Record<string, ShapeDefinition>;
  readonly blockMapping: Record<string, string>;
}

// ========================================
// Default Shape Definitions
// ========================================

const defaultShapes: Record<string, ShapeDefinition> = {
  full: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: false,
  },
  slab: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 8, 16] }] },
    rotatable: false,
  },
  stairs: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [0, 0, 0], to: [16, 8, 16] },
        { from: [0, 8, 8], to: [16, 16, 16] },
      ],
    },
    rotatable: true,
  },
  carpet: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 1, 16] }] },
    rotatable: false,
  },
  pressure_plate: {
    geometry: { type: 'box', boxes: [{ from: [1, 0, 1], to: [15, 1, 15] }] },
    rotatable: false,
  },
  torch: {
    geometry: { type: 'cross' },
    rotatable: false,
  },
  fence: {
    geometry: { type: 'box', boxes: [{ from: [6, 0, 6], to: [10, 16, 10] }] },
    rotatable: false,
    connectable: 'horizontal',
  },
  wall: {
    geometry: { type: 'box', boxes: [{ from: [4, 0, 4], to: [12, 16, 12] }] },
    rotatable: false,
    connectable: 'horizontal',
  },
  glass_pane: {
    geometry: { type: 'box', boxes: [{ from: [7, 0, 0], to: [9, 16, 16] }] },
    rotatable: false,
    connectable: 'horizontal',
  },
  trapdoor: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 3, 16] }] },
    rotatable: true,
  },
  door: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 3] }] },
    rotatable: true,
  },
  button: {
    geometry: { type: 'box', boxes: [{ from: [5, 6, 14], to: [11, 10, 16] }] },
    rotatable: true,
  },
  lantern: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [5, 0, 5], to: [11, 7, 11] },
        { from: [6, 7, 6], to: [10, 9, 10] },
      ],
    },
    rotatable: false,
  },
  chain: {
    geometry: { type: 'box', boxes: [{ from: [7, 0, 7], to: [9, 16, 9] }] },
    rotatable: true,
  },
  cross: {
    geometry: { type: 'cross' },
    rotatable: false,
  },
  lever: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [5, 0, 4], to: [11, 3, 12] },
        { from: [7, 1, 7], to: [9, 10, 9] },
      ],
    },
    rotatable: true,
  },
  sign: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [0, 7, 7], to: [16, 16, 9] },
        { from: [7, 0, 7], to: [9, 7, 9] },
      ],
    },
    rotatable: true,
  },
  banner: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [1, 0, 7], to: [15, 16, 9] },
        { from: [7, -12, 7], to: [9, 0, 9] },
      ],
    },
    rotatable: true,
  },
  bed: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 9, 16] }] },
    rotatable: true,
  },
  chest: {
    geometry: { type: 'box', boxes: [{ from: [1, 0, 1], to: [15, 14, 15] }] },
    rotatable: true,
  },
  anvil: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [2, 0, 2], to: [14, 4, 14] },
        { from: [4, 4, 3], to: [12, 5, 13] },
        { from: [6, 5, 4], to: [10, 10, 12] },
        { from: [3, 10, 0], to: [13, 16, 16] },
      ],
    },
    rotatable: true,
  },
  cauldron: {
    geometry: { type: 'custom', customGenerator: 'generateCauldron' },
    rotatable: false,
  },
  hopper: {
    geometry: { type: 'custom', customGenerator: 'generateHopper' },
    rotatable: true,
  },
  brewing_stand: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [1, 0, 1], to: [15, 2, 15] },
        { from: [7, 0, 7], to: [9, 14, 9] },
      ],
    },
    rotatable: false,
  },
  enchanting_table: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 12, 16] }] },
    rotatable: false,
  },
  end_portal_frame: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 13, 16] }] },
    rotatable: true,
  },
  dragon_egg: {
    geometry: { type: 'custom', customGenerator: 'generateDragonEgg' },
    rotatable: false,
  },
  bell: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [4, 4, 4], to: [12, 12, 12] },
        { from: [7, 12, 7], to: [9, 14, 9] },
      ],
    },
    rotatable: true,
  },
  campfire: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 7, 16] }] },
    rotatable: true,
  },
  grindstone: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [2, 0, 6], to: [4, 7, 10] },
        { from: [12, 0, 6], to: [14, 7, 10] },
        { from: [4, 2, 4], to: [12, 10, 12] },
      ],
    },
    rotatable: true,
  },
  lectern: {
    geometry: {
      type: 'multi_box',
      boxes: [
        { from: [0, 0, 0], to: [16, 2, 16] },
        { from: [4, 2, 4], to: [12, 10, 12] },
        { from: [0, 10, 0], to: [16, 14, 16] },
      ],
    },
    rotatable: true,
  },
  stonecutter: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 9, 16] }] },
    rotatable: true,
  },
  composter: {
    geometry: { type: 'custom', customGenerator: 'generateComposter' },
    rotatable: false,
  },
  beehive: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: true,
  },
  candle: {
    geometry: { type: 'box', boxes: [{ from: [7, 0, 7], to: [9, 6, 9] }] },
    rotatable: false,
  },
  amethyst_cluster: {
    geometry: { type: 'box', boxes: [{ from: [3, 0, 3], to: [13, 7, 13] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  small_amethyst_bud: {
    geometry: { type: 'box', boxes: [{ from: [3, 0, 3], to: [13, 4, 13] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  medium_amethyst_bud: {
    geometry: { type: 'box', boxes: [{ from: [2, 0, 2], to: [14, 6, 14] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  large_amethyst_bud: {
    geometry: { type: 'box', boxes: [{ from: [2, 0, 2], to: [14, 8, 14] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  pointed_dripstone: {
    geometry: { type: 'box', boxes: [{ from: [5, 0, 5], to: [11, 11, 11] }] },
    rotatable: false,
  },
  sculk_sensor: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 8, 16] }] },
    rotatable: false,
  },
  decorated_pot: {
    geometry: { type: 'box', boxes: [{ from: [1, 0, 1], to: [15, 16, 15] }] },
    rotatable: true,
  },
  head: {
    geometry: { type: 'box', boxes: [{ from: [4, 0, 4], to: [12, 8, 12] }] },
    rotatable: true,
  },
  flower_pot: {
    geometry: { type: 'box', boxes: [{ from: [5, 0, 5], to: [11, 6, 11] }] },
    rotatable: false,
  },
  rail: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 2, 16] }] },
    rotatable: true,
  },
  ladder: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 15], to: [16, 16, 16] }] },
    rotatable: true,
  },
  snow_layer: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 2, 16] }] },
    rotatable: false,
  },
  farmland: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 15, 16] }] },
    rotatable: false,
  },
  path: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 15, 16] }] },
    rotatable: false,
  },
  cake: {
    geometry: { type: 'box', boxes: [{ from: [1, 0, 1], to: [15, 8, 15] }] },
    rotatable: false,
  },
  end_rod: {
    geometry: { type: 'box', boxes: [{ from: [6, 0, 6], to: [10, 16, 10] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  lightning_rod: {
    geometry: { type: 'box', boxes: [{ from: [6, 0, 6], to: [10, 16, 10] }] },
    rotatable: true,
    facingMode: 'directional',
  },
  custom: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: false,
  },
  // === 1.21+ New shapes ===
  copper_grate: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: false,
  },
  heavy_core: {
    geometry: { type: 'box', boxes: [{ from: [4, 0, 4], to: [12, 8, 12] }] },
    rotatable: false,
  },
  resin_clump: {
    geometry: { type: 'box', boxes: [{ from: [3, 0, 3], to: [13, 6, 13] }] },
    rotatable: true,
  },
  vine: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 15], to: [16, 16, 16] }] },
    rotatable: true,
  },
  hanging_moss: {
    geometry: { type: 'box', boxes: [{ from: [1, 0, 1], to: [15, 16, 15] }] },
    rotatable: false,
  },
  trial_spawner: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: false,
  },
  vault: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: true,
  },
  crafter: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 16, 16] }] },
    rotatable: true,
  },
  leaf_litter: {
    geometry: { type: 'box', boxes: [{ from: [0, 0, 0], to: [16, 1, 16] }] },
    rotatable: false,
  },
};

// ========================================
// Shape Cache & Registry
// ========================================

let loadedRegistry: BlockShapeRegistry | null = null;
const shapeCache = new Map<string, BlockShape>();

/**
 * Get shape definition for a given block shape
 */
export function getShapeDefinition(shape: BlockShape | string): ShapeDefinition {
  // Check loaded registry first
  if (loadedRegistry?.shapes[shape]) {
    return loadedRegistry.shapes[shape];
  }
  // Fall back to defaults
  return defaultShapes[shape] || defaultShapes.full;
}

/**
 * Load registry from JSON data (for runtime updates)
 */
export function loadRegistry(data: BlockShapeRegistry): void {
  loadedRegistry = data;
  shapeCache.clear();
}

/**
 * Get registry version
 */
export function getRegistryVersion(): string {
  return loadedRegistry?.version || '1.0.0';
}

/**
 * Check if a shape supports rotation
 */
export function supportsRotation(shape: BlockShape | string): boolean {
  const def = getShapeDefinition(shape);
  return def.rotatable === true;
}

// ========================================
// Block Name to Shape Mapping
// ========================================

/**
 * Shape detection patterns
 */
interface ShapePattern {
  readonly pattern: RegExp | string[];
  readonly shape: BlockShape;
  readonly matchType: 'suffix' | 'contains' | 'list';
}

const shapePatterns: readonly ShapePattern[] = [
  { pattern: /_stairs$/, shape: 'stairs', matchType: 'suffix' },
  { pattern: /_slab$/, shape: 'slab', matchType: 'suffix' },
  { pattern: /_fence$/, shape: 'fence', matchType: 'suffix' },
  { pattern: /_wall$/, shape: 'wall', matchType: 'suffix' },
  { pattern: /_trapdoor$/, shape: 'trapdoor', matchType: 'suffix' },
  { pattern: /_door$/, shape: 'door', matchType: 'suffix' },
  { pattern: /_pressure_plate$/, shape: 'pressure_plate', matchType: 'suffix' },
  { pattern: /_button$/, shape: 'button', matchType: 'suffix' },
  { pattern: /torch/, shape: 'torch', matchType: 'contains' },
  { pattern: /_carpet$/, shape: 'carpet', matchType: 'suffix' },
  { pattern: /_pane$/, shape: 'glass_pane', matchType: 'suffix' },
  { pattern: ['iron_bars'], shape: 'glass_pane', matchType: 'list' },
  { pattern: ['chain'], shape: 'chain', matchType: 'list' },
  { pattern: /lantern/, shape: 'lantern', matchType: 'contains' },
  { pattern: /_sign$/, shape: 'sign', matchType: 'suffix' },
  { pattern: /_banner$/, shape: 'banner', matchType: 'suffix' },
  { pattern: /_bed$/, shape: 'bed', matchType: 'suffix' },
  { pattern: ['chest', 'ender_chest', 'trapped_chest'], shape: 'chest', matchType: 'list' },
  { pattern: ['anvil', 'chipped_anvil', 'damaged_anvil'], shape: 'anvil', matchType: 'list' },
  { pattern: ['cauldron', 'water_cauldron', 'lava_cauldron', 'powder_snow_cauldron'], shape: 'cauldron', matchType: 'list' },
  { pattern: ['hopper'], shape: 'hopper', matchType: 'list' },
  { pattern: ['brewing_stand'], shape: 'brewing_stand', matchType: 'list' },
  { pattern: ['enchanting_table'], shape: 'enchanting_table', matchType: 'list' },
  { pattern: ['end_portal_frame'], shape: 'end_portal_frame', matchType: 'list' },
  { pattern: ['dragon_egg'], shape: 'dragon_egg', matchType: 'list' },
  { pattern: ['bell'], shape: 'bell', matchType: 'list' },
  { pattern: /campfire/, shape: 'campfire', matchType: 'contains' },
  { pattern: ['grindstone'], shape: 'grindstone', matchType: 'list' },
  { pattern: ['lectern'], shape: 'lectern', matchType: 'list' },
  { pattern: ['stonecutter'], shape: 'stonecutter', matchType: 'list' },
  { pattern: ['composter'], shape: 'composter', matchType: 'list' },
  { pattern: ['beehive', 'bee_nest'], shape: 'beehive', matchType: 'list' },
  { pattern: /candle/, shape: 'candle', matchType: 'contains' },
  { pattern: ['small_amethyst_bud'], shape: 'small_amethyst_bud', matchType: 'list' },
  { pattern: ['medium_amethyst_bud'], shape: 'medium_amethyst_bud', matchType: 'list' },
  { pattern: ['large_amethyst_bud'], shape: 'large_amethyst_bud', matchType: 'list' },
  { pattern: /amethyst_cluster/, shape: 'amethyst_cluster', matchType: 'contains' },
  { pattern: ['pointed_dripstone'], shape: 'pointed_dripstone', matchType: 'list' },
  { pattern: /sculk_sensor|calibrated_sculk_sensor/, shape: 'sculk_sensor', matchType: 'contains' },
  { pattern: ['decorated_pot'], shape: 'decorated_pot', matchType: 'list' },
  { pattern: /_head$|_skull$/, shape: 'head', matchType: 'suffix' },
  { pattern: ['flower_pot', 'potted_'], shape: 'flower_pot', matchType: 'list' },
  { pattern: /rail/, shape: 'rail', matchType: 'contains' },
  { pattern: ['ladder'], shape: 'ladder', matchType: 'list' },
  { pattern: ['snow'], shape: 'snow_layer', matchType: 'list' },
  { pattern: ['farmland'], shape: 'farmland', matchType: 'list' },
  { pattern: ['dirt_path', 'grass_path'], shape: 'path', matchType: 'list' },
  { pattern: ['cake'], shape: 'cake', matchType: 'list' },
  { pattern: ['end_rod'], shape: 'end_rod', matchType: 'list' },
  { pattern: ['lightning_rod'], shape: 'lightning_rod', matchType: 'list' },
  { pattern: ['lever'], shape: 'lever', matchType: 'list' },
  {
    // NOTE: Use exact match patterns to avoid 'grass' matching 'grass_block'
    pattern: /^(grass|short_grass|fern|dead_bush|seagrass|sea_pickle|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|tall_grass|large_fern|oak_sapling|spruce_sapling|birch_sapling|jungle_sapling|acacia_sapling|dark_oak_sapling|cherry_sapling|mangrove_propagule|crimson_fungus|warped_fungus|crimson_roots|warped_roots|nether_sprouts|sugar_cane|kelp|bamboo|sweet_berry_bush|torchflower|pitcher_plant|pink_petals|pale_oak_sapling|eyeblossom|open_eyeblossom|closed_eyeblossom|bush|cactus_flower|firefly_bush|short_dry_grass|tall_dry_grass|wildflowers|glow_berries)$/,
    shape: 'cross',
    matchType: 'contains',  // Using regex with exact match via ^ and $
  },
  // === 1.21+ New patterns ===
  { pattern: /copper_grate/, shape: 'copper_grate', matchType: 'contains' },
  { pattern: /copper_bulb/, shape: 'full', matchType: 'contains' },
  { pattern: /chiseled_copper/, shape: 'full', matchType: 'contains' },
  { pattern: ['trial_spawner', 'ominous_trial_spawner'], shape: 'trial_spawner', matchType: 'list' },
  { pattern: ['vault', 'ominous_vault'], shape: 'vault', matchType: 'list' },
  { pattern: ['crafter'], shape: 'crafter', matchType: 'list' },
  { pattern: ['heavy_core'], shape: 'heavy_core', matchType: 'list' },
  { pattern: ['creaking_heart'], shape: 'full', matchType: 'list' },
  { pattern: ['pale_hanging_moss'], shape: 'hanging_moss', matchType: 'list' },
  { pattern: ['leaf_litter'], shape: 'leaf_litter', matchType: 'list' },
  { pattern: ['resin_clump'], shape: 'resin_clump', matchType: 'list' },
  { pattern: ['resin_block', 'block_of_resin'], shape: 'full', matchType: 'list' },
  { pattern: ['resin_bricks', 'chiseled_resin_bricks'], shape: 'full', matchType: 'list' },
  { pattern: ['pale_moss_block'], shape: 'full', matchType: 'list' },
  { pattern: ['pale_moss_carpet'], shape: 'carpet', matchType: 'list' },
  { pattern: ['chorus_flower'], shape: 'full', matchType: 'list' },
];

/**
 * Match a block name against a shape pattern
 */
function matchPattern(name: string, patternDef: ShapePattern): boolean {
  const { pattern, matchType } = patternDef;

  switch (matchType) {
    case 'suffix':
    case 'contains':
      return (pattern as RegExp).test(name);
    case 'list':
      return Array.isArray(pattern) && pattern.some((p) => name.includes(p));
    default:
      return false;
  }
}

/**
 * Determine the shape type for a block based on its name
 */
export function getShapeForBlock(blockName: string): BlockShape {
  const name = blockName.replace('minecraft:', '');

  // Check cache first
  const cached = shapeCache.get(name);
  if (cached) {
    return cached;
  }

  // Check loaded registry mapping
  if (loadedRegistry?.blockMapping[name]) {
    const shape = loadedRegistry.blockMapping[name] as BlockShape;
    shapeCache.set(name, shape);
    return shape;
  }

  // Exclusion rules
  if (name.includes('fence_gate')) {
    shapeCache.set(name, 'full');
    return 'full';
  }

  // Match against patterns
  for (const patternDef of shapePatterns) {
    if (matchPattern(name, patternDef)) {
      shapeCache.set(name, patternDef.shape);
      return patternDef.shape;
    }
  }

  // Default to full block
  shapeCache.set(name, 'full');
  return 'full';
}

/**
 * Clear the shape cache
 */
export function clearShapeCache(): void {
  shapeCache.clear();
}
