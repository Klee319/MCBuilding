/**
 * Texture Atlas Generator
 *
 * Generates a texture atlas from individual block textures.
 * Uses sharp for image processing.
 */

import sharp from 'sharp';

/**
 * UV coordinates for a texture in the atlas
 */
export interface UVCoords {
  readonly u1: number;
  readonly v1: number;
  readonly u2: number;
  readonly v2: number;
}

/**
 * Face texture mapping for a block
 */
export interface BlockFaceTextures {
  readonly top: UVCoords;
  readonly bottom: UVCoords;
  readonly north: UVCoords;
  readonly south: UVCoords;
  readonly east: UVCoords;
  readonly west: UVCoords;
}

/**
 * Generated texture atlas
 */
export interface TextureAtlas {
  /** PNG image data as Buffer */
  readonly imageBuffer: Buffer;
  /** Atlas width in pixels */
  readonly width: number;
  /** Atlas height in pixels */
  readonly height: number;
  /** UV mapping for each block ID */
  readonly uvMapping: Record<string, BlockFaceTextures>;
}

/**
 * Texture tile size (Minecraft uses 16x16)
 */
const TILE_SIZE = 16;

/**
 * Maximum atlas dimension
 */
const MAX_ATLAS_SIZE = 2048;

/**
 * Wood types for texture mapping
 */
const WOOD_TYPES = [
  'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak',
  'mangrove', 'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak',
] as const;

/**
 * Color variants for wool, concrete, terracotta, etc.
 */
const COLOR_VARIANTS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime',
  'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue',
  'brown', 'green', 'red', 'black',
] as const;

/**
 * Generate face map entries for derived blocks (stairs, slabs, walls, fences)
 */
function generateDerivedBlockFaceMap(): Record<string, { top: string; bottom: string; sides: string; front?: string }> {
  const result: Record<string, { top: string; bottom: string; sides: string }> = {};

  // Wood planks derived (stairs, slabs, fences)
  for (const wood of WOOD_TYPES) {
    const planks = `${wood}_planks`;
    result[`${wood}_stairs`] = { top: planks, bottom: planks, sides: planks };
    result[`${wood}_slab`] = { top: planks, bottom: planks, sides: planks };
    result[`${wood}_fence`] = { top: planks, bottom: planks, sides: planks };
    result[`${wood}_fence_gate`] = { top: planks, bottom: planks, sides: planks };
  }

  // Stone variants
  const stoneVariants = [
    { name: 'stone', texture: 'stone' },
    { name: 'cobblestone', texture: 'cobblestone' },
    { name: 'mossy_cobblestone', texture: 'mossy_cobblestone' },
    { name: 'stone_brick', texture: 'stone_bricks' },
    { name: 'mossy_stone_brick', texture: 'mossy_stone_bricks' },
    { name: 'granite', texture: 'granite' },
    { name: 'polished_granite', texture: 'polished_granite' },
    { name: 'diorite', texture: 'diorite' },
    { name: 'polished_diorite', texture: 'polished_diorite' },
    { name: 'andesite', texture: 'andesite' },
    { name: 'polished_andesite', texture: 'polished_andesite' },
    { name: 'cobbled_deepslate', texture: 'cobbled_deepslate' },
    { name: 'polished_deepslate', texture: 'polished_deepslate' },
    { name: 'deepslate_brick', texture: 'deepslate_bricks' },
    { name: 'deepslate_tile', texture: 'deepslate_tiles' },
    { name: 'tuff', texture: 'tuff' },
    { name: 'polished_tuff', texture: 'polished_tuff' },
    { name: 'tuff_brick', texture: 'tuff_bricks' },
    { name: 'blackstone', texture: 'blackstone' },
    { name: 'polished_blackstone', texture: 'polished_blackstone' },
    { name: 'polished_blackstone_brick', texture: 'polished_blackstone_bricks' },
    { name: 'brick', texture: 'bricks' },
    { name: 'nether_brick', texture: 'nether_bricks' },
    { name: 'red_nether_brick', texture: 'red_nether_bricks' },
    { name: 'end_stone_brick', texture: 'end_stone_bricks' },
    { name: 'prismarine', texture: 'prismarine' },
    { name: 'prismarine_brick', texture: 'prismarine_bricks' },
    { name: 'dark_prismarine', texture: 'dark_prismarine' },
    { name: 'mud_brick', texture: 'mud_bricks' },
    { name: 'purpur', texture: 'purpur_block' },
    // 1.21.4 Resin
    { name: 'resin_brick', texture: 'resin_bricks' },
  ];

  for (const { name, texture } of stoneVariants) {
    result[`${name}_stairs`] = { top: texture, bottom: texture, sides: texture };
    result[`${name}_slab`] = { top: texture, bottom: texture, sides: texture };
    result[`${name}_wall`] = { top: texture, bottom: texture, sides: texture };
  }

  // Nether brick fence
  result['nether_brick_fence'] = { top: 'nether_bricks', bottom: 'nether_bricks', sides: 'nether_bricks' };

  // Sandstone variants
  result['sandstone_stairs'] = { top: 'sandstone_top', bottom: 'sandstone_bottom', sides: 'sandstone' };
  result['sandstone_slab'] = { top: 'sandstone_top', bottom: 'sandstone_bottom', sides: 'sandstone' };
  result['sandstone_wall'] = { top: 'sandstone_top', bottom: 'sandstone_bottom', sides: 'sandstone' };
  result['smooth_sandstone_stairs'] = { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'sandstone_top' };
  result['smooth_sandstone_slab'] = { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'sandstone_top' };
  result['cut_sandstone_slab'] = { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'cut_sandstone' };
  result['red_sandstone_stairs'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_bottom', sides: 'red_sandstone' };
  result['red_sandstone_slab'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_bottom', sides: 'red_sandstone' };
  result['red_sandstone_wall'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_bottom', sides: 'red_sandstone' };
  result['smooth_red_sandstone_stairs'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'red_sandstone_top' };
  result['smooth_red_sandstone_slab'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'red_sandstone_top' };
  result['cut_red_sandstone_slab'] = { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'cut_red_sandstone' };

  // Quartz variants
  result['quartz_stairs'] = { top: 'quartz_block_top', bottom: 'quartz_block_bottom', sides: 'quartz_block_side' };
  result['quartz_slab'] = { top: 'quartz_block_top', bottom: 'quartz_block_bottom', sides: 'quartz_block_side' };
  result['smooth_quartz_stairs'] = { top: 'quartz_block_bottom', bottom: 'quartz_block_bottom', sides: 'quartz_block_bottom' };
  result['smooth_quartz_slab'] = { top: 'quartz_block_bottom', bottom: 'quartz_block_bottom', sides: 'quartz_block_bottom' };

  // Copper variants
  const copperVariants = [
    { name: 'cut_copper', texture: 'cut_copper' },
    { name: 'exposed_cut_copper', texture: 'exposed_cut_copper' },
    { name: 'weathered_cut_copper', texture: 'weathered_cut_copper' },
    { name: 'oxidized_cut_copper', texture: 'oxidized_cut_copper' },
    { name: 'waxed_cut_copper', texture: 'cut_copper' },
    { name: 'waxed_exposed_cut_copper', texture: 'exposed_cut_copper' },
    { name: 'waxed_weathered_cut_copper', texture: 'weathered_cut_copper' },
    { name: 'waxed_oxidized_cut_copper', texture: 'oxidized_cut_copper' },
  ];

  for (const { name, texture } of copperVariants) {
    result[`${name}_stairs`] = { top: texture, bottom: texture, sides: texture };
    result[`${name}_slab`] = { top: texture, bottom: texture, sides: texture };
  }

  return result;
}

/**
 * Block face texture configuration
 * Maps block names to their face texture names
 */
const BLOCK_FACE_MAP: Record<string, { top: string; bottom: string; sides: string; front?: string }> = {
  // Grass and dirt variants
  grass_block: { top: 'grass_block_top', bottom: 'dirt', sides: 'grass_block_side' },
  dirt_path: { top: 'dirt_path_top', bottom: 'dirt', sides: 'dirt_path_side' },
  mycelium: { top: 'mycelium_top', bottom: 'dirt', sides: 'mycelium_side' },
  podzol: { top: 'podzol_top', bottom: 'dirt', sides: 'podzol_side' },
  crimson_nylium: { top: 'crimson_nylium', bottom: 'netherrack', sides: 'crimson_nylium_side' },
  warped_nylium: { top: 'warped_nylium', bottom: 'netherrack', sides: 'warped_nylium_side' },

  // Logs
  oak_log: { top: 'oak_log_top', bottom: 'oak_log_top', sides: 'oak_log' },
  spruce_log: { top: 'spruce_log_top', bottom: 'spruce_log_top', sides: 'spruce_log' },
  birch_log: { top: 'birch_log_top', bottom: 'birch_log_top', sides: 'birch_log' },
  jungle_log: { top: 'jungle_log_top', bottom: 'jungle_log_top', sides: 'jungle_log' },
  acacia_log: { top: 'acacia_log_top', bottom: 'acacia_log_top', sides: 'acacia_log' },
  dark_oak_log: { top: 'dark_oak_log_top', bottom: 'dark_oak_log_top', sides: 'dark_oak_log' },
  mangrove_log: { top: 'mangrove_log_top', bottom: 'mangrove_log_top', sides: 'mangrove_log' },
  cherry_log: { top: 'cherry_log_top', bottom: 'cherry_log_top', sides: 'cherry_log' },

  // Stripped logs
  stripped_oak_log: { top: 'stripped_oak_log_top', bottom: 'stripped_oak_log_top', sides: 'stripped_oak_log' },
  stripped_spruce_log: { top: 'stripped_spruce_log_top', bottom: 'stripped_spruce_log_top', sides: 'stripped_spruce_log' },
  stripped_birch_log: { top: 'stripped_birch_log_top', bottom: 'stripped_birch_log_top', sides: 'stripped_birch_log' },
  stripped_jungle_log: { top: 'stripped_jungle_log_top', bottom: 'stripped_jungle_log_top', sides: 'stripped_jungle_log' },
  stripped_acacia_log: { top: 'stripped_acacia_log_top', bottom: 'stripped_acacia_log_top', sides: 'stripped_acacia_log' },
  stripped_dark_oak_log: { top: 'stripped_dark_oak_log_top', bottom: 'stripped_dark_oak_log_top', sides: 'stripped_dark_oak_log' },
  stripped_mangrove_log: { top: 'stripped_mangrove_log_top', bottom: 'stripped_mangrove_log_top', sides: 'stripped_mangrove_log' },
  stripped_cherry_log: { top: 'stripped_cherry_log_top', bottom: 'stripped_cherry_log_top', sides: 'stripped_cherry_log' },

  // Nether stems
  crimson_stem: { top: 'crimson_stem_top', bottom: 'crimson_stem_top', sides: 'crimson_stem' },
  warped_stem: { top: 'warped_stem_top', bottom: 'warped_stem_top', sides: 'warped_stem' },
  stripped_crimson_stem: { top: 'stripped_crimson_stem_top', bottom: 'stripped_crimson_stem_top', sides: 'stripped_crimson_stem' },
  stripped_warped_stem: { top: 'stripped_warped_stem_top', bottom: 'stripped_warped_stem_top', sides: 'stripped_warped_stem' },

  // Woods (bark on all sides)
  oak_wood: { top: 'oak_log', bottom: 'oak_log', sides: 'oak_log' },
  spruce_wood: { top: 'spruce_log', bottom: 'spruce_log', sides: 'spruce_log' },
  birch_wood: { top: 'birch_log', bottom: 'birch_log', sides: 'birch_log' },
  jungle_wood: { top: 'jungle_log', bottom: 'jungle_log', sides: 'jungle_log' },
  acacia_wood: { top: 'acacia_log', bottom: 'acacia_log', sides: 'acacia_log' },
  dark_oak_wood: { top: 'dark_oak_log', bottom: 'dark_oak_log', sides: 'dark_oak_log' },
  mangrove_wood: { top: 'mangrove_log', bottom: 'mangrove_log', sides: 'mangrove_log' },
  cherry_wood: { top: 'cherry_log', bottom: 'cherry_log', sides: 'cherry_log' },
  crimson_hyphae: { top: 'crimson_stem', bottom: 'crimson_stem', sides: 'crimson_stem' },
  warped_hyphae: { top: 'warped_stem', bottom: 'warped_stem', sides: 'warped_stem' },
  stripped_oak_wood: { top: 'stripped_oak_log', bottom: 'stripped_oak_log', sides: 'stripped_oak_log' },
  stripped_spruce_wood: { top: 'stripped_spruce_log', bottom: 'stripped_spruce_log', sides: 'stripped_spruce_log' },
  stripped_birch_wood: { top: 'stripped_birch_log', bottom: 'stripped_birch_log', sides: 'stripped_birch_log' },
  stripped_jungle_wood: { top: 'stripped_jungle_log', bottom: 'stripped_jungle_log', sides: 'stripped_jungle_log' },
  stripped_acacia_wood: { top: 'stripped_acacia_log', bottom: 'stripped_acacia_log', sides: 'stripped_acacia_log' },
  stripped_dark_oak_wood: { top: 'stripped_dark_oak_log', bottom: 'stripped_dark_oak_log', sides: 'stripped_dark_oak_log' },
  stripped_mangrove_wood: { top: 'stripped_mangrove_log', bottom: 'stripped_mangrove_log', sides: 'stripped_mangrove_log' },
  stripped_cherry_wood: { top: 'stripped_cherry_log', bottom: 'stripped_cherry_log', sides: 'stripped_cherry_log' },
  stripped_crimson_hyphae: { top: 'stripped_crimson_stem', bottom: 'stripped_crimson_stem', sides: 'stripped_crimson_stem' },
  stripped_warped_hyphae: { top: 'stripped_warped_stem', bottom: 'stripped_warped_stem', sides: 'stripped_warped_stem' },

  // Bamboo block
  bamboo_block: { top: 'bamboo_block_top', bottom: 'bamboo_block_top', sides: 'bamboo_block' },
  stripped_bamboo_block: { top: 'stripped_bamboo_block_top', bottom: 'stripped_bamboo_block_top', sides: 'stripped_bamboo_block' },

  // Functional blocks
  tnt: { top: 'tnt_top', bottom: 'tnt_bottom', sides: 'tnt_side' },
  furnace: { top: 'furnace_top', bottom: 'furnace_top', sides: 'furnace_side', front: 'furnace_front' },
  blast_furnace: { top: 'blast_furnace_top', bottom: 'blast_furnace_top', sides: 'blast_furnace_side', front: 'blast_furnace_front' },
  smoker: { top: 'smoker_top', bottom: 'smoker_bottom', sides: 'smoker_side', front: 'smoker_front_on' },
  crafting_table: { top: 'crafting_table_top', bottom: 'oak_planks', sides: 'crafting_table_side', front: 'crafting_table_front' },
  bookshelf: { top: 'oak_planks', bottom: 'oak_planks', sides: 'bookshelf' },
  chiseled_bookshelf: { top: 'chiseled_bookshelf_top', bottom: 'chiseled_bookshelf_top', sides: 'chiseled_bookshelf_side', front: 'chiseled_bookshelf_empty' },
  jukebox: { top: 'jukebox_top', bottom: 'jukebox_side', sides: 'jukebox_side' },
  note_block: { top: 'note_block', bottom: 'note_block', sides: 'note_block' },
  dispenser: { top: 'furnace_top', bottom: 'furnace_top', sides: 'furnace_side', front: 'dispenser_front' },
  dropper: { top: 'furnace_top', bottom: 'furnace_top', sides: 'furnace_side', front: 'dropper_front' },
  observer: { top: 'observer_top', bottom: 'observer_top', sides: 'observer_side', front: 'observer_front' },
  piston: { top: 'piston_top', bottom: 'piston_bottom', sides: 'piston_side' },
  sticky_piston: { top: 'piston_top_sticky', bottom: 'piston_bottom', sides: 'piston_side' },

  // Pumpkin and melon
  pumpkin: { top: 'pumpkin_top', bottom: 'pumpkin_top', sides: 'pumpkin_side' },
  carved_pumpkin: { top: 'pumpkin_top', bottom: 'pumpkin_top', sides: 'pumpkin_side', front: 'carved_pumpkin' },
  jack_o_lantern: { top: 'pumpkin_top', bottom: 'pumpkin_top', sides: 'pumpkin_side', front: 'jack_o_lantern' },
  melon: { top: 'melon_top', bottom: 'melon_top', sides: 'melon_side' },

  // Cactus
  cactus: { top: 'cactus_top', bottom: 'cactus_bottom', sides: 'cactus_side' },

  // Multi-face blocks
  hay_block: { top: 'hay_block_top', bottom: 'hay_block_top', sides: 'hay_block_side' },
  bone_block: { top: 'bone_block_top', bottom: 'bone_block_top', sides: 'bone_block_side' },
  quartz_pillar: { top: 'quartz_pillar_top', bottom: 'quartz_pillar_top', sides: 'quartz_pillar' },
  quartz_block: { top: 'quartz_block_top', bottom: 'quartz_block_bottom', sides: 'quartz_block_side' },
  smooth_quartz: { top: 'quartz_block_bottom', bottom: 'quartz_block_bottom', sides: 'quartz_block_bottom' },
  sandstone: { top: 'sandstone_top', bottom: 'sandstone_bottom', sides: 'sandstone' },
  red_sandstone: { top: 'red_sandstone_top', bottom: 'red_sandstone_bottom', sides: 'red_sandstone' },
  cut_sandstone: { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'cut_sandstone' },
  cut_red_sandstone: { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'cut_red_sandstone' },
  chiseled_sandstone: { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'chiseled_sandstone' },
  chiseled_red_sandstone: { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'chiseled_red_sandstone' },
  smooth_sandstone: { top: 'sandstone_top', bottom: 'sandstone_top', sides: 'sandstone_top' },
  smooth_red_sandstone: { top: 'red_sandstone_top', bottom: 'red_sandstone_top', sides: 'red_sandstone_top' },

  // Lanterns (use same texture for all faces)
  lantern: { top: 'lantern', bottom: 'lantern', sides: 'lantern' },
  soul_lantern: { top: 'soul_lantern', bottom: 'soul_lantern', sides: 'soul_lantern' },

  // Torches
  torch: { top: 'torch', bottom: 'torch', sides: 'torch' },
  wall_torch: { top: 'torch', bottom: 'torch', sides: 'torch' },
  soul_torch: { top: 'soul_torch', bottom: 'soul_torch', sides: 'soul_torch' },
  soul_wall_torch: { top: 'soul_torch', bottom: 'soul_torch', sides: 'soul_torch' },
  redstone_torch: { top: 'redstone_torch', bottom: 'redstone_torch', sides: 'redstone_torch' },
  redstone_wall_torch: { top: 'redstone_torch', bottom: 'redstone_torch', sides: 'redstone_torch' },

  // Chain
  chain: { top: 'chain', bottom: 'chain', sides: 'chain' },

  // Bell
  bell: { top: 'bell_body', bottom: 'bell_body', sides: 'bell_body' },

  // Beehive
  beehive: { top: 'beehive_end', bottom: 'beehive_end', sides: 'beehive_side', front: 'beehive_front' },
  bee_nest: { top: 'bee_nest_top', bottom: 'bee_nest_top', sides: 'bee_nest_side', front: 'bee_nest_front' },

  // Barrel
  barrel: { top: 'barrel_top', bottom: 'barrel_bottom', sides: 'barrel_side' },

  // Composter
  composter: { top: 'composter_top', bottom: 'composter_bottom', sides: 'composter_side' },

  // Lectern
  lectern: { top: 'lectern_top', bottom: 'lectern_base', sides: 'lectern_sides', front: 'lectern_front' },

  // Cauldron
  cauldron: { top: 'cauldron_top', bottom: 'cauldron_bottom', sides: 'cauldron_side' },

  // Sculk
  sculk_catalyst: { top: 'sculk_catalyst_top', bottom: 'sculk_catalyst_bottom', sides: 'sculk_catalyst_side' },
  sculk_sensor: { top: 'sculk_sensor_top', bottom: 'sculk_sensor_bottom', sides: 'sculk_sensor_side' },
  sculk_shrieker: { top: 'sculk_shrieker_top', bottom: 'sculk_shrieker_bottom', sides: 'sculk_shrieker_side' },

  // Reinforced deepslate
  reinforced_deepslate: { top: 'reinforced_deepslate_top', bottom: 'reinforced_deepslate_bottom', sides: 'reinforced_deepslate_side' },

  // === 1.21+ New blocks ===

  // Pale Oak (1.21.4)
  pale_oak_log: { top: 'pale_oak_log_top', bottom: 'pale_oak_log_top', sides: 'pale_oak_log' },
  stripped_pale_oak_log: { top: 'stripped_pale_oak_log_top', bottom: 'stripped_pale_oak_log_top', sides: 'stripped_pale_oak_log' },
  pale_oak_wood: { top: 'pale_oak_log', bottom: 'pale_oak_log', sides: 'pale_oak_log' },
  stripped_pale_oak_wood: { top: 'stripped_pale_oak_log', bottom: 'stripped_pale_oak_log', sides: 'stripped_pale_oak_log' },

  // Creaking Heart (1.21.4)
  creaking_heart: { top: 'creaking_heart_top', bottom: 'creaking_heart_top', sides: 'creaking_heart_side' },

  // Crafter (1.21)
  crafter: { top: 'crafter_top', bottom: 'crafter_bottom', sides: 'crafter_side', front: 'crafter_north' },

  // Trial Chamber blocks (1.21)
  trial_spawner: { top: 'trial_spawner_top', bottom: 'trial_spawner_bottom', sides: 'trial_spawner_side' },
  ominous_trial_spawner: { top: 'trial_spawner_top', bottom: 'trial_spawner_bottom', sides: 'trial_spawner_side' },
  vault: { top: 'vault_top', bottom: 'vault_bottom', sides: 'vault_side', front: 'vault_front' },
  ominous_vault: { top: 'vault_top', bottom: 'vault_bottom', sides: 'vault_side', front: 'vault_front' },
  heavy_core: { top: 'heavy_core_top', bottom: 'heavy_core_top', sides: 'heavy_core_side' },

  // Amethyst
  amethyst_cluster: { top: 'amethyst_cluster', bottom: 'amethyst_cluster', sides: 'amethyst_cluster' },
  small_amethyst_bud: { top: 'small_amethyst_bud', bottom: 'small_amethyst_bud', sides: 'small_amethyst_bud' },
  medium_amethyst_bud: { top: 'medium_amethyst_bud', bottom: 'medium_amethyst_bud', sides: 'medium_amethyst_bud' },
  large_amethyst_bud: { top: 'large_amethyst_bud', bottom: 'large_amethyst_bud', sides: 'large_amethyst_bud' },

  // Copper bulb (1.21)
  copper_bulb: { top: 'copper_bulb', bottom: 'copper_bulb', sides: 'copper_bulb' },
  exposed_copper_bulb: { top: 'exposed_copper_bulb', bottom: 'exposed_copper_bulb', sides: 'exposed_copper_bulb' },
  weathered_copper_bulb: { top: 'weathered_copper_bulb', bottom: 'weathered_copper_bulb', sides: 'weathered_copper_bulb' },
  oxidized_copper_bulb: { top: 'oxidized_copper_bulb', bottom: 'oxidized_copper_bulb', sides: 'oxidized_copper_bulb' },
  waxed_copper_bulb: { top: 'copper_bulb', bottom: 'copper_bulb', sides: 'copper_bulb' },
  waxed_exposed_copper_bulb: { top: 'exposed_copper_bulb', bottom: 'exposed_copper_bulb', sides: 'exposed_copper_bulb' },
  waxed_weathered_copper_bulb: { top: 'weathered_copper_bulb', bottom: 'weathered_copper_bulb', sides: 'weathered_copper_bulb' },
  waxed_oxidized_copper_bulb: { top: 'oxidized_copper_bulb', bottom: 'oxidized_copper_bulb', sides: 'oxidized_copper_bulb' },

  // Basalt variants
  basalt: { top: 'basalt_top', bottom: 'basalt_top', sides: 'basalt_side' },
  polished_basalt: { top: 'polished_basalt_top', bottom: 'polished_basalt_top', sides: 'polished_basalt_side' },

  // Deepslate (has top/side variants)
  deepslate: { top: 'deepslate_top', bottom: 'deepslate_top', sides: 'deepslate' },

  // Bamboo mosaic
  bamboo_mosaic: { top: 'bamboo_mosaic', bottom: 'bamboo_mosaic', sides: 'bamboo_mosaic' },

  // === Doors (use top texture for sides, bottom for bottom) ===
  oak_door: { top: 'oak_door_top', bottom: 'oak_door_bottom', sides: 'oak_door_top' },
  spruce_door: { top: 'spruce_door_top', bottom: 'spruce_door_bottom', sides: 'spruce_door_top' },
  birch_door: { top: 'birch_door_top', bottom: 'birch_door_bottom', sides: 'birch_door_top' },
  jungle_door: { top: 'jungle_door_top', bottom: 'jungle_door_bottom', sides: 'jungle_door_top' },
  acacia_door: { top: 'acacia_door_top', bottom: 'acacia_door_bottom', sides: 'acacia_door_top' },
  dark_oak_door: { top: 'dark_oak_door_top', bottom: 'dark_oak_door_bottom', sides: 'dark_oak_door_top' },
  mangrove_door: { top: 'mangrove_door_top', bottom: 'mangrove_door_bottom', sides: 'mangrove_door_top' },
  cherry_door: { top: 'cherry_door_top', bottom: 'cherry_door_bottom', sides: 'cherry_door_top' },
  bamboo_door: { top: 'bamboo_door_top', bottom: 'bamboo_door_bottom', sides: 'bamboo_door_top' },
  crimson_door: { top: 'crimson_door_top', bottom: 'crimson_door_bottom', sides: 'crimson_door_top' },
  warped_door: { top: 'warped_door_top', bottom: 'warped_door_bottom', sides: 'warped_door_top' },
  iron_door: { top: 'iron_door_top', bottom: 'iron_door_bottom', sides: 'iron_door_top' },

  // === Glass panes (top/bottom = thin edge connector, sides = flat glass surface) ===
  glass_pane: { top: 'glass_pane_top', bottom: 'glass_pane_top', sides: 'glass' },
  white_stained_glass_pane: { top: 'white_stained_glass_pane_top', bottom: 'white_stained_glass_pane_top', sides: 'white_stained_glass' },
  orange_stained_glass_pane: { top: 'orange_stained_glass_pane_top', bottom: 'orange_stained_glass_pane_top', sides: 'orange_stained_glass' },
  magenta_stained_glass_pane: { top: 'magenta_stained_glass_pane_top', bottom: 'magenta_stained_glass_pane_top', sides: 'magenta_stained_glass' },
  light_blue_stained_glass_pane: { top: 'light_blue_stained_glass_pane_top', bottom: 'light_blue_stained_glass_pane_top', sides: 'light_blue_stained_glass' },
  yellow_stained_glass_pane: { top: 'yellow_stained_glass_pane_top', bottom: 'yellow_stained_glass_pane_top', sides: 'yellow_stained_glass' },
  lime_stained_glass_pane: { top: 'lime_stained_glass_pane_top', bottom: 'lime_stained_glass_pane_top', sides: 'lime_stained_glass' },
  pink_stained_glass_pane: { top: 'pink_stained_glass_pane_top', bottom: 'pink_stained_glass_pane_top', sides: 'pink_stained_glass' },
  gray_stained_glass_pane: { top: 'gray_stained_glass_pane_top', bottom: 'gray_stained_glass_pane_top', sides: 'gray_stained_glass' },
  light_gray_stained_glass_pane: { top: 'light_gray_stained_glass_pane_top', bottom: 'light_gray_stained_glass_pane_top', sides: 'light_gray_stained_glass' },
  cyan_stained_glass_pane: { top: 'cyan_stained_glass_pane_top', bottom: 'cyan_stained_glass_pane_top', sides: 'cyan_stained_glass' },
  purple_stained_glass_pane: { top: 'purple_stained_glass_pane_top', bottom: 'purple_stained_glass_pane_top', sides: 'purple_stained_glass' },
  blue_stained_glass_pane: { top: 'blue_stained_glass_pane_top', bottom: 'blue_stained_glass_pane_top', sides: 'blue_stained_glass' },
  brown_stained_glass_pane: { top: 'brown_stained_glass_pane_top', bottom: 'brown_stained_glass_pane_top', sides: 'brown_stained_glass' },
  green_stained_glass_pane: { top: 'green_stained_glass_pane_top', bottom: 'green_stained_glass_pane_top', sides: 'green_stained_glass' },
  red_stained_glass_pane: { top: 'red_stained_glass_pane_top', bottom: 'red_stained_glass_pane_top', sides: 'red_stained_glass' },
  black_stained_glass_pane: { top: 'black_stained_glass_pane_top', bottom: 'black_stained_glass_pane_top', sides: 'black_stained_glass' },

  // === Trapdoors ===
  oak_trapdoor: { top: 'oak_trapdoor', bottom: 'oak_trapdoor', sides: 'oak_trapdoor' },
  spruce_trapdoor: { top: 'spruce_trapdoor', bottom: 'spruce_trapdoor', sides: 'spruce_trapdoor' },
  birch_trapdoor: { top: 'birch_trapdoor', bottom: 'birch_trapdoor', sides: 'birch_trapdoor' },
  jungle_trapdoor: { top: 'jungle_trapdoor', bottom: 'jungle_trapdoor', sides: 'jungle_trapdoor' },
  acacia_trapdoor: { top: 'acacia_trapdoor', bottom: 'acacia_trapdoor', sides: 'acacia_trapdoor' },
  dark_oak_trapdoor: { top: 'dark_oak_trapdoor', bottom: 'dark_oak_trapdoor', sides: 'dark_oak_trapdoor' },
  mangrove_trapdoor: { top: 'mangrove_trapdoor', bottom: 'mangrove_trapdoor', sides: 'mangrove_trapdoor' },
  cherry_trapdoor: { top: 'cherry_trapdoor', bottom: 'cherry_trapdoor', sides: 'cherry_trapdoor' },
  bamboo_trapdoor: { top: 'bamboo_trapdoor', bottom: 'bamboo_trapdoor', sides: 'bamboo_trapdoor' },
  crimson_trapdoor: { top: 'crimson_trapdoor', bottom: 'crimson_trapdoor', sides: 'crimson_trapdoor' },
  warped_trapdoor: { top: 'warped_trapdoor', bottom: 'warped_trapdoor', sides: 'warped_trapdoor' },
  iron_trapdoor: { top: 'iron_trapdoor', bottom: 'iron_trapdoor', sides: 'iron_trapdoor' },

  // === Entity-rendered blocks (fallback to similar textures) ===
  chest: { top: 'oak_planks', bottom: 'oak_planks', sides: 'oak_planks' },
  ender_chest: { top: 'obsidian', bottom: 'obsidian', sides: 'obsidian' },
  trapped_chest: { top: 'oak_planks', bottom: 'oak_planks', sides: 'oak_planks' },

  // === Beds (fallback to wool color) ===
  white_bed: { top: 'white_wool', bottom: 'white_wool', sides: 'white_wool' },
  orange_bed: { top: 'orange_wool', bottom: 'orange_wool', sides: 'orange_wool' },
  magenta_bed: { top: 'magenta_wool', bottom: 'magenta_wool', sides: 'magenta_wool' },
  light_blue_bed: { top: 'light_blue_wool', bottom: 'light_blue_wool', sides: 'light_blue_wool' },
  yellow_bed: { top: 'yellow_wool', bottom: 'yellow_wool', sides: 'yellow_wool' },
  lime_bed: { top: 'lime_wool', bottom: 'lime_wool', sides: 'lime_wool' },
  pink_bed: { top: 'pink_wool', bottom: 'pink_wool', sides: 'pink_wool' },
  gray_bed: { top: 'gray_wool', bottom: 'gray_wool', sides: 'gray_wool' },
  light_gray_bed: { top: 'light_gray_wool', bottom: 'light_gray_wool', sides: 'light_gray_wool' },
  cyan_bed: { top: 'cyan_wool', bottom: 'cyan_wool', sides: 'cyan_wool' },
  purple_bed: { top: 'purple_wool', bottom: 'purple_wool', sides: 'purple_wool' },
  blue_bed: { top: 'blue_wool', bottom: 'blue_wool', sides: 'blue_wool' },
  brown_bed: { top: 'brown_wool', bottom: 'brown_wool', sides: 'brown_wool' },
  green_bed: { top: 'green_wool', bottom: 'green_wool', sides: 'green_wool' },
  red_bed: { top: 'red_wool', bottom: 'red_wool', sides: 'red_wool' },
  black_bed: { top: 'black_wool', bottom: 'black_wool', sides: 'black_wool' },

  // === Campfire ===
  campfire: { top: 'campfire_log_lit', bottom: 'campfire_log_lit', sides: 'campfire_log_lit' },
  soul_campfire: { top: 'soul_campfire_log_lit', bottom: 'soul_campfire_log_lit', sides: 'soul_campfire_log_lit' },

  // === Azalea ===
  azalea: { top: 'azalea_top', bottom: 'azalea_plant', sides: 'azalea_side' },
  flowering_azalea: { top: 'flowering_azalea_top', bottom: 'azalea_plant', sides: 'flowering_azalea_side' },

  // === Carpets (use wool textures) ===
  white_carpet: { top: 'white_wool', bottom: 'white_wool', sides: 'white_wool' },
  orange_carpet: { top: 'orange_wool', bottom: 'orange_wool', sides: 'orange_wool' },
  magenta_carpet: { top: 'magenta_wool', bottom: 'magenta_wool', sides: 'magenta_wool' },
  light_blue_carpet: { top: 'light_blue_wool', bottom: 'light_blue_wool', sides: 'light_blue_wool' },
  yellow_carpet: { top: 'yellow_wool', bottom: 'yellow_wool', sides: 'yellow_wool' },
  lime_carpet: { top: 'lime_wool', bottom: 'lime_wool', sides: 'lime_wool' },
  pink_carpet: { top: 'pink_wool', bottom: 'pink_wool', sides: 'pink_wool' },
  gray_carpet: { top: 'gray_wool', bottom: 'gray_wool', sides: 'gray_wool' },
  light_gray_carpet: { top: 'light_gray_wool', bottom: 'light_gray_wool', sides: 'light_gray_wool' },
  cyan_carpet: { top: 'cyan_wool', bottom: 'cyan_wool', sides: 'cyan_wool' },
  purple_carpet: { top: 'purple_wool', bottom: 'purple_wool', sides: 'purple_wool' },
  blue_carpet: { top: 'blue_wool', bottom: 'blue_wool', sides: 'blue_wool' },
  brown_carpet: { top: 'brown_wool', bottom: 'brown_wool', sides: 'brown_wool' },
  green_carpet: { top: 'green_wool', bottom: 'green_wool', sides: 'green_wool' },
  red_carpet: { top: 'red_wool', bottom: 'red_wool', sides: 'red_wool' },
  black_carpet: { top: 'black_wool', bottom: 'black_wool', sides: 'black_wool' },

  // === Concrete powder (same texture all faces) ===
  white_concrete_powder: { top: 'white_concrete_powder', bottom: 'white_concrete_powder', sides: 'white_concrete_powder' },
  orange_concrete_powder: { top: 'orange_concrete_powder', bottom: 'orange_concrete_powder', sides: 'orange_concrete_powder' },
  magenta_concrete_powder: { top: 'magenta_concrete_powder', bottom: 'magenta_concrete_powder', sides: 'magenta_concrete_powder' },
  light_blue_concrete_powder: { top: 'light_blue_concrete_powder', bottom: 'light_blue_concrete_powder', sides: 'light_blue_concrete_powder' },
  yellow_concrete_powder: { top: 'yellow_concrete_powder', bottom: 'yellow_concrete_powder', sides: 'yellow_concrete_powder' },
  lime_concrete_powder: { top: 'lime_concrete_powder', bottom: 'lime_concrete_powder', sides: 'lime_concrete_powder' },
  pink_concrete_powder: { top: 'pink_concrete_powder', bottom: 'pink_concrete_powder', sides: 'pink_concrete_powder' },
  gray_concrete_powder: { top: 'gray_concrete_powder', bottom: 'gray_concrete_powder', sides: 'gray_concrete_powder' },
  light_gray_concrete_powder: { top: 'light_gray_concrete_powder', bottom: 'light_gray_concrete_powder', sides: 'light_gray_concrete_powder' },
  cyan_concrete_powder: { top: 'cyan_concrete_powder', bottom: 'cyan_concrete_powder', sides: 'cyan_concrete_powder' },
  purple_concrete_powder: { top: 'purple_concrete_powder', bottom: 'purple_concrete_powder', sides: 'purple_concrete_powder' },
  blue_concrete_powder: { top: 'blue_concrete_powder', bottom: 'blue_concrete_powder', sides: 'blue_concrete_powder' },
  brown_concrete_powder: { top: 'brown_concrete_powder', bottom: 'brown_concrete_powder', sides: 'brown_concrete_powder' },
  green_concrete_powder: { top: 'green_concrete_powder', bottom: 'green_concrete_powder', sides: 'green_concrete_powder' },
  red_concrete_powder: { top: 'red_concrete_powder', bottom: 'red_concrete_powder', sides: 'red_concrete_powder' },
  black_concrete_powder: { top: 'black_concrete_powder', bottom: 'black_concrete_powder', sides: 'black_concrete_powder' },

  // === Glazed terracotta (single face texture, rotatable) ===
  white_glazed_terracotta: { top: 'white_glazed_terracotta', bottom: 'white_glazed_terracotta', sides: 'white_glazed_terracotta' },
  orange_glazed_terracotta: { top: 'orange_glazed_terracotta', bottom: 'orange_glazed_terracotta', sides: 'orange_glazed_terracotta' },
  magenta_glazed_terracotta: { top: 'magenta_glazed_terracotta', bottom: 'magenta_glazed_terracotta', sides: 'magenta_glazed_terracotta' },
  light_blue_glazed_terracotta: { top: 'light_blue_glazed_terracotta', bottom: 'light_blue_glazed_terracotta', sides: 'light_blue_glazed_terracotta' },
  yellow_glazed_terracotta: { top: 'yellow_glazed_terracotta', bottom: 'yellow_glazed_terracotta', sides: 'yellow_glazed_terracotta' },
  lime_glazed_terracotta: { top: 'lime_glazed_terracotta', bottom: 'lime_glazed_terracotta', sides: 'lime_glazed_terracotta' },
  pink_glazed_terracotta: { top: 'pink_glazed_terracotta', bottom: 'pink_glazed_terracotta', sides: 'pink_glazed_terracotta' },
  gray_glazed_terracotta: { top: 'gray_glazed_terracotta', bottom: 'gray_glazed_terracotta', sides: 'gray_glazed_terracotta' },
  light_gray_glazed_terracotta: { top: 'light_gray_glazed_terracotta', bottom: 'light_gray_glazed_terracotta', sides: 'light_gray_glazed_terracotta' },
  cyan_glazed_terracotta: { top: 'cyan_glazed_terracotta', bottom: 'cyan_glazed_terracotta', sides: 'cyan_glazed_terracotta' },
  purple_glazed_terracotta: { top: 'purple_glazed_terracotta', bottom: 'purple_glazed_terracotta', sides: 'purple_glazed_terracotta' },
  blue_glazed_terracotta: { top: 'blue_glazed_terracotta', bottom: 'blue_glazed_terracotta', sides: 'blue_glazed_terracotta' },
  brown_glazed_terracotta: { top: 'brown_glazed_terracotta', bottom: 'brown_glazed_terracotta', sides: 'brown_glazed_terracotta' },
  green_glazed_terracotta: { top: 'green_glazed_terracotta', bottom: 'green_glazed_terracotta', sides: 'green_glazed_terracotta' },
  red_glazed_terracotta: { top: 'red_glazed_terracotta', bottom: 'red_glazed_terracotta', sides: 'red_glazed_terracotta' },
  black_glazed_terracotta: { top: 'black_glazed_terracotta', bottom: 'black_glazed_terracotta', sides: 'black_glazed_terracotta' },

  // === Flower pots and plants ===
  flower_pot: { top: 'flower_pot', bottom: 'flower_pot', sides: 'flower_pot' },

  // === Brewing stand, anvil, enchanting table ===
  brewing_stand: { top: 'brewing_stand', bottom: 'brewing_stand_base', sides: 'brewing_stand' },
  enchanting_table: { top: 'enchanting_table_top', bottom: 'enchanting_table_bottom', sides: 'enchanting_table_side' },

  // === Redstone components ===
  redstone_lamp: { top: 'redstone_lamp', bottom: 'redstone_lamp', sides: 'redstone_lamp' },
  target: { top: 'target_top', bottom: 'target_top', sides: 'target_side' },
  daylight_detector: { top: 'daylight_detector_top', bottom: 'daylight_detector_side', sides: 'daylight_detector_side' },

  // === Misc blocks ===
  dried_kelp_block: { top: 'dried_kelp_block_top', bottom: 'dried_kelp_block_bottom', sides: 'dried_kelp_block_side' },
  mushroom_stem: { top: 'mushroom_block_inside', bottom: 'mushroom_block_inside', sides: 'mushroom_stem' },
  brown_mushroom_block: { top: 'brown_mushroom_block', bottom: 'mushroom_block_inside', sides: 'brown_mushroom_block' },
  red_mushroom_block: { top: 'red_mushroom_block', bottom: 'mushroom_block_inside', sides: 'red_mushroom_block' },
  end_portal_frame: { top: 'end_portal_frame_top', bottom: 'end_stone', sides: 'end_portal_frame_side' },
  respawn_anchor: { top: 'respawn_anchor_top', bottom: 'respawn_anchor_bottom', sides: 'respawn_anchor_side' },
  lodestone: { top: 'lodestone_top', bottom: 'lodestone_top', sides: 'lodestone_side' },

  // === Froglights ===
  pearlescent_froglight: { top: 'pearlescent_froglight_top', bottom: 'pearlescent_froglight_top', sides: 'pearlescent_froglight_side' },
  verdant_froglight: { top: 'verdant_froglight_top', bottom: 'verdant_froglight_top', sides: 'verdant_froglight_side' },
  ochre_froglight: { top: 'ochre_froglight_top', bottom: 'ochre_froglight_top', sides: 'ochre_froglight_side' },

  // === Complex mechanism blocks (simplified) ===
  grindstone: { top: 'grindstone_round', bottom: 'grindstone_round', sides: 'grindstone_side' },
  hopper: { top: 'hopper_top', bottom: 'hopper_outside', sides: 'hopper_outside' },
  smithing_table: { top: 'smithing_table_top', bottom: 'smithing_table_bottom', sides: 'smithing_table_side' },
  stonecutter: { top: 'stonecutter_top', bottom: 'stonecutter_bottom', sides: 'stonecutter_side' },
  water_cauldron: { top: 'cauldron_top', bottom: 'cauldron_bottom', sides: 'cauldron_side' },

  // === Tall flowers (use top half texture for cross rendering) ===
  lilac: { top: 'lilac_top', bottom: 'lilac_top', sides: 'lilac_top' },
  peony: { top: 'peony_top', bottom: 'peony_top', sides: 'peony_top' },
  rose_bush: { top: 'rose_bush_top', bottom: 'rose_bush_top', sides: 'rose_bush_top' },
  sunflower: { top: 'sunflower_front', bottom: 'sunflower_front', sides: 'sunflower_front' },
  tall_grass: { top: 'tall_grass_top', bottom: 'tall_grass_top', sides: 'tall_grass_top' },
  large_fern: { top: 'large_fern_top', bottom: 'large_fern_top', sides: 'large_fern_top' },

  // Merge derived block mappings
  ...generateDerivedBlockFaceMap(),
};

/**
 * Generate a texture atlas from a map of textures
 *
 * @param textures - Map of texture name to texture data
 * @param blockIds - Block IDs to generate UV mappings for
 * @returns Generated texture atlas
 */
export async function generateTextureAtlas(
  textures: Map<string, Uint8Array>,
  blockIds: string[]
): Promise<TextureAtlas> {
  // Ensure a missing texture placeholder exists in the atlas
  if (!textures.has('__missing__')) {
    const missingPng = await createMissingTexture();
    textures.set('__missing__', new Uint8Array(missingPng));
  }

  const textureCount = textures.size;

  if (textureCount === 0) {
    throw new Error('No textures provided for atlas generation');
  }

  // Calculate atlas dimensions (square)
  const tilesPerRow = Math.ceil(Math.sqrt(textureCount));
  const atlasSize = Math.min(tilesPerRow * TILE_SIZE, MAX_ATLAS_SIZE);
  const actualTilesPerRow = Math.floor(atlasSize / TILE_SIZE);

  // Create atlas canvas
  const compositeInputs: sharp.OverlayOptions[] = [];
  const texturePositions = new Map<string, { x: number; y: number }>();

  let index = 0;
  for (const [name, data] of textures) {
    const x = (index % actualTilesPerRow) * TILE_SIZE;
    const y = Math.floor(index / actualTilesPerRow) * TILE_SIZE;

    try {
      // Resize texture to 16x16 if needed and convert to PNG
      const resizedBuffer = await sharp(Buffer.from(data))
        .resize(TILE_SIZE, TILE_SIZE, { fit: 'fill' })
        .png()
        .toBuffer();

      compositeInputs.push({
        input: resizedBuffer,
        left: x,
        top: y,
      });

      texturePositions.set(name, { x, y });
    } catch (error) {
      console.warn(`Failed to process texture: ${name}`, error);
    }

    index++;
  }

  // Calculate final atlas height
  const rowsNeeded = Math.ceil(index / actualTilesPerRow);
  const atlasHeight = rowsNeeded * TILE_SIZE;
  const atlasWidth = actualTilesPerRow * TILE_SIZE;

  // Generate the atlas image
  const atlasBuffer = await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  // Generate UV mappings for each block
  const uvMapping: Record<string, BlockFaceTextures> = {};

  // Helper: find a texture position with fallback to __missing__
  const findPosition = (name: string, fallbackNames: string[] = []): { x: number; y: number } | undefined => {
    const pos = texturePositions.get(name);
    if (pos) return pos;
    for (const fn of fallbackNames) {
      const fpos = texturePositions.get(fn);
      if (fpos) return fpos;
    }
    return texturePositions.get('__missing__');
  };

  const missingBlocks: string[] = [];

  for (const blockId of blockIds) {
    const blockName = blockId.replace('minecraft:', '');
    const faceConfig = BLOCK_FACE_MAP[blockName];

    if (faceConfig) {
      // Multi-texture block
      const topPos = findPosition(faceConfig.top, [blockName]);
      const bottomPos = findPosition(faceConfig.bottom, [blockName]);
      const sidePos = findPosition(faceConfig.sides, [blockName]);
      const frontPos = faceConfig.front
        ? (texturePositions.get(faceConfig.front) || sidePos)
        : sidePos;

      uvMapping[blockId] = {
        top: positionToUV(topPos, atlasWidth, atlasHeight),
        bottom: positionToUV(bottomPos, atlasWidth, atlasHeight),
        north: positionToUV(frontPos || sidePos, atlasWidth, atlasHeight),
        south: positionToUV(sidePos, atlasWidth, atlasHeight),
        east: positionToUV(sidePos, atlasWidth, atlasHeight),
        west: positionToUV(sidePos, atlasWidth, atlasHeight),
      };
    } else {
      // Try to resolve texture for derived blocks
      const resolvedTexture = resolveBlockTexture(blockName);
      const position = findPosition(resolvedTexture, [blockName]);
      const uv = positionToUV(position, atlasWidth, atlasHeight);

      const INVISIBLE_BLOCKS = ['air', 'cave_air', 'void_air', 'light', 'barrier', 'structure_void'];
      if (!texturePositions.get(resolvedTexture) && !texturePositions.get(blockName) && !INVISIBLE_BLOCKS.includes(blockName)) {
        missingBlocks.push(blockName);
      }

      uvMapping[blockId] = {
        top: uv,
        bottom: uv,
        north: uv,
        south: uv,
        east: uv,
        west: uv,
      };
    }
  }

  if (missingBlocks.length > 0) {
    console.warn(`[TextureAtlas] Missing textures for ${missingBlocks.length} blocks: ${missingBlocks.slice(0, 20).join(', ')}${missingBlocks.length > 20 ? '...' : ''}`);
  }

  return {
    imageBuffer: atlasBuffer,
    width: atlasWidth,
    height: atlasHeight,
    uvMapping,
  };
}

/**
 * Convert a position in the atlas to UV coordinates
 */
function positionToUV(
  position: { x: number; y: number } | undefined,
  atlasWidth: number,
  atlasHeight: number
): UVCoords {
  if (!position) {
    // Return default UV for missing texture (first tile)
    return {
      u1: 0,
      v1: 0,
      u2: TILE_SIZE / atlasWidth,
      v2: TILE_SIZE / atlasHeight,
    };
  }

  return {
    u1: position.x / atlasWidth,
    v1: position.y / atlasHeight,
    u2: (position.x + TILE_SIZE) / atlasWidth,
    v2: (position.y + TILE_SIZE) / atlasHeight,
  };
}

/**
 * Prefix-based aliases for blocks that share textures with non-prefixed variants.
 */
const PREFIX_ALIASES: Record<string, string> = {
  'waxed_': '',                // waxed_copper_block → copper_block
  'infested_': '',             // infested_stone → stone
  'chipped_': '',              // chipped_anvil → anvil
  'damaged_': '',              // damaged_anvil → anvil
};

/**
 * Direct block-to-texture aliases for blocks whose texture filename
 * differs from their block ID.
 */
const TEXTURE_ALIASES: Record<string, string> = {
  smooth_stone: 'smooth_stone',
  smooth_basalt: 'smooth_basalt',
  cracked_stone_bricks: 'cracked_stone_bricks',
  cracked_deepslate_bricks: 'cracked_deepslate_bricks',
  cracked_deepslate_tiles: 'cracked_deepslate_tiles',
  cracked_nether_bricks: 'cracked_nether_bricks',
  cracked_polished_blackstone_bricks: 'cracked_polished_blackstone_bricks',
  chiseled_stone_bricks: 'chiseled_stone_bricks',
  chiseled_deepslate: 'chiseled_deepslate',
  chiseled_nether_bricks: 'chiseled_nether_bricks',
  chiseled_polished_blackstone: 'chiseled_polished_blackstone',
  chiseled_quartz_block: 'chiseled_quartz_block',
  chiseled_sandstone: 'chiseled_sandstone',
  chiseled_red_sandstone: 'chiseled_red_sandstone',
  chiseled_tuff: 'chiseled_tuff',
  chiseled_tuff_bricks: 'chiseled_tuff_bricks',
  chiseled_copper: 'chiseled_copper',
  gilded_blackstone: 'gilded_blackstone',
  mossy_stone_bricks: 'mossy_stone_bricks',
  mossy_cobblestone: 'mossy_cobblestone',
  anvil: 'anvil',
  // Renamed blocks (1.20+)
  grass: 'short_grass',
  // Cauldron variants (water_cauldron and cauldron handled in BLOCK_FACE_MAP)
  lava_cauldron: 'cauldron_side',
  powder_snow_cauldron: 'cauldron_side',
  // Pressure plate variants that use other block textures
  light_weighted_pressure_plate: 'gold_block',
  heavy_weighted_pressure_plate: 'iron_block',
  // Moss carpet uses moss_block texture
  moss_carpet: 'moss_block',
  // Fire uses first animation frame
  fire: 'fire_0',
  soul_fire: 'soul_fire_0',
  // Campfire uses log_lit texture
  campfire: 'campfire_log_lit',
  soul_campfire: 'soul_campfire_log_lit',
};

/**
 * Resolve the base texture name for a block.
 * Handles derived blocks like stairs, slabs, walls, fences,
 * as well as prefix aliases (waxed_, infested_) and direct aliases.
 */
function resolveBlockTexture(blockName: string, depth = 0): string {
  if (depth > 5) return blockName;

  // Check if already in face map
  if (BLOCK_FACE_MAP[blockName]) {
    return BLOCK_FACE_MAP[blockName].sides;
  }

  // Check direct texture aliases
  if (TEXTURE_ALIASES[blockName]) {
    return TEXTURE_ALIASES[blockName];
  }

  // Strip known prefixes and retry (e.g. waxed_copper_block → copper_block)
  for (const [prefix, replacement] of Object.entries(PREFIX_ALIASES)) {
    if (blockName.startsWith(prefix)) {
      const stripped = replacement + blockName.slice(prefix.length);
      return resolveBlockTexture(stripped, depth + 1);
    }
  }

  // Pattern-based resolution for derived blocks
  // Stairs
  if (blockName.endsWith('_stairs')) {
    const base = blockName.replace('_stairs', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return `${wood}_planks`;
      }
    }
    if (base.endsWith('_brick')) {
      return `${base}s`;
    }
    if (base.endsWith('_tile')) {
      return `${base}s`;
    }
    return base;
  }

  // Slabs
  if (blockName.endsWith('_slab')) {
    const base = blockName.replace('_slab', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return `${wood}_planks`;
      }
    }
    if (base.endsWith('_brick')) {
      return `${base}s`;
    }
    if (base.endsWith('_tile')) {
      return `${base}s`;
    }
    return base;
  }

  // Walls
  if (blockName.endsWith('_wall')) {
    const base = blockName.replace('_wall', '');
    if (base.endsWith('_brick')) {
      return `${base}s`;
    }
    return base;
  }

  // Fences (not fence gates)
  if (blockName.endsWith('_fence') && !blockName.includes('fence_gate')) {
    const base = blockName.replace('_fence', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return `${wood}_planks`;
      }
    }
    if (base === 'nether_brick') {
      return 'nether_bricks';
    }
    return base;
  }

  // Fence gates
  if (blockName.endsWith('_fence_gate')) {
    const base = blockName.replace('_fence_gate', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return `${wood}_planks`;
      }
    }
    return base;
  }

  // Stained glass panes → stained glass texture
  if (blockName.endsWith('_stained_glass_pane')) {
    return blockName.replace('_pane', '');
  }

  // Glass pane → glass
  if (blockName === 'glass_pane') {
    return 'glass';
  }

  // Doors → use top texture
  if (blockName.endsWith('_door')) {
    return `${blockName}_top`;
  }

  // Trapdoors → use trapdoor texture directly
  if (blockName.endsWith('_trapdoor')) {
    return blockName;
  }

  // Beds → use wool texture
  if (blockName.endsWith('_bed')) {
    const color = blockName.replace('_bed', '');
    return `${color}_wool`;
  }

  // Buttons, pressure plates, signs → use base block texture
  const suffixes = ['_button', '_pressure_plate', '_wall_hanging_sign', '_hanging_sign', '_wall_sign', '_sign'];
  for (const suffix of suffixes) {
    if (blockName.endsWith(suffix)) {
      const base = blockName.replace(suffix, '');
      for (const wood of WOOD_TYPES) {
        if (base === wood) {
          return `${wood}_planks`;
        }
      }
      // stone_button → stone, polished_blackstone_button → polished_blackstone
      return base;
    }
  }

  // Potted plants → use the plant texture (flower_pot fallback)
  if (blockName.startsWith('potted_')) {
    return 'flower_pot';
  }

  // Entity-based blocks that have no block textures (heads, skulls, banners)
  if (blockName.endsWith('_head') || blockName.endsWith('_skull') ||
      blockName.endsWith('_banner') || blockName.endsWith('_wall_banner')) {
    return '__missing__';
  }

  // Wool, concrete, concrete_powder, terracotta, stained_glass, carpet with color prefix
  for (const color of COLOR_VARIANTS) {
    if (blockName.startsWith(`${color}_`)) {
      return blockName;
    }
  }

  // Default: return as-is
  return blockName;
}

/**
 * Create a fallback texture for missing blocks
 *
 * @returns A pink/magenta "missing texture" pattern as PNG buffer
 */
export async function createMissingTexture(): Promise<Buffer> {
  const size = TILE_SIZE;
  const halfSize = size / 2;

  // Create a checkerboard pattern (pink and black like Minecraft's missing texture)
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const isCheckerPink = (x < halfSize && y < halfSize) || (x >= halfSize && y >= halfSize);

      if (isCheckerPink) {
        pixels[i] = 255;     // R
        pixels[i + 1] = 0;   // G
        pixels[i + 2] = 255; // B
        pixels[i + 3] = 255; // A
      } else {
        pixels[i] = 0;       // R
        pixels[i + 1] = 0;   // G
        pixels[i + 2] = 0;   // B
        pixels[i + 3] = 255; // A
      }
    }
  }

  return sharp(pixels, {
    raw: { width: size, height: size, channels: 4 },
  })
    .png()
    .toBuffer();
}
