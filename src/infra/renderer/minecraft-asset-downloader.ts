/**
 * Minecraft Asset Downloader
 *
 * Downloads vanilla Minecraft textures from Mojang's official servers.
 * Textures are extracted from the client.jar file.
 */

import JSZip from 'jszip';

/**
 * Version manifest entry
 */
interface VersionEntry {
  readonly id: string;
  readonly type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  readonly url: string;
  readonly releaseTime: string;
}

/**
 * Version manifest response
 */
interface VersionManifest {
  readonly latest: {
    readonly release: string;
    readonly snapshot: string;
  };
  readonly versions: VersionEntry[];
}

/**
 * Version details response
 */
interface VersionDetails {
  readonly downloads: {
    readonly client: {
      readonly sha1: string;
      readonly size: number;
      readonly url: string;
    };
  };
}

/**
 * Texture cache entry
 */
interface CacheEntry {
  readonly data: Uint8Array;
  readonly timestamp: number;
}

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// In-memory cache for textures
const textureCache = new Map<string, CacheEntry>();
const clientJarCache = new Map<string, { zip: JSZip; timestamp: number }>();
const versionManifestCache: { data: VersionManifest | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

/**
 * Get the version manifest from Mojang
 */
export async function getVersionManifest(): Promise<VersionManifest> {
  const now = Date.now();

  if (versionManifestCache.data && now - versionManifestCache.timestamp < CACHE_TTL) {
    return versionManifestCache.data;
  }

  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch version manifest: ${response.status}`);
  }

  const manifest = (await response.json()) as VersionManifest;
  versionManifestCache.data = manifest;
  versionManifestCache.timestamp = now;

  return manifest;
}

/**
 * Get available Minecraft versions (releases only by default)
 */
export async function getAvailableVersions(
  includeSnapshots = false
): Promise<{ id: string; type: string; releaseTime: string }[]> {
  const manifest = await getVersionManifest();

  return manifest.versions
    .filter((v) => v.type === 'release' || (includeSnapshots && v.type === 'snapshot'))
    .map((v) => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
    }));
}

/**
 * Get the latest release version
 */
export async function getLatestVersion(): Promise<string> {
  const manifest = await getVersionManifest();
  return manifest.latest.release;
}

/**
 * Get version details including client JAR URL
 */
async function getVersionDetails(version: string): Promise<VersionDetails> {
  const manifest = await getVersionManifest();
  const versionEntry = manifest.versions.find((v) => v.id === version);

  if (!versionEntry) {
    throw new Error(`Version not found: ${version}`);
  }

  const response = await fetch(versionEntry.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch version details: ${response.status}`);
  }

  return (await response.json()) as VersionDetails;
}

/**
 * Download and cache the client JAR for a version
 */
async function getClientJar(version: string): Promise<JSZip> {
  const now = Date.now();
  const cached = clientJarCache.get(version);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.zip;
  }

  console.log(`[TextureDownloader] Downloading client.jar for ${version}...`);

  const details = await getVersionDetails(version);
  const response = await fetch(details.downloads.client.url);

  if (!response.ok) {
    throw new Error(`Failed to download client.jar: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  clientJarCache.set(version, { zip, timestamp: now });
  console.log(`[TextureDownloader] Client.jar loaded for ${version}`);

  return zip;
}

/**
 * Download block textures for a specific version
 *
 * @param version - Minecraft version (e.g., "1.20.4")
 * @param blockIds - Optional list of block IDs to filter (e.g., ["stone", "dirt"])
 * @returns Map of texture path to texture data
 */
export async function downloadBlockTextures(
  version: string,
  blockIds?: string[]
): Promise<Map<string, Uint8Array>> {
  const zip = await getClientJar(version);
  const textures = new Map<string, Uint8Array>();

  // Block textures path in the JAR
  const blockTexturePath = 'assets/minecraft/textures/block/';

  // Get all files in the block textures folder
  const files = Object.keys(zip.files).filter(
    (path) => path.startsWith(blockTexturePath) && path.endsWith('.png')
  );

  console.log(`[TextureDownloader] Found ${files.length} block textures in client.jar`);

  // If blockIds provided, filter using texture name resolution
  const filteredFiles = blockIds
    ? (() => {
        // Get all texture names needed for the block IDs
        const neededTextures = new Set(getTextureNamesForBlocks(blockIds));

        // Also add normalized block IDs directly (some blocks use their ID as texture name)
        for (const id of blockIds) {
          neededTextures.add(id.replace('minecraft:', ''));
        }

        return files.filter((path) => {
          const fileName = path.replace(blockTexturePath, '').replace('.png', '');
          return neededTextures.has(fileName);
        });
      })()
    : files;

  console.log(`[TextureDownloader] Filtered to ${filteredFiles.length} textures`);

  // Extract textures
  for (const filePath of filteredFiles) {
    try {
      const file = zip.files[filePath];
      const data = await file.async('uint8array');

      // Normalize the path to just the block name
      const blockName = filePath.replace(blockTexturePath, '').replace('.png', '');
      textures.set(blockName, data);
    } catch (error) {
      console.warn(`Failed to extract texture: ${filePath}`, error);
    }
  }

  return textures;
}

/**
 * Wood types for derived blocks
 */
const WOOD_TYPES = [
  'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak',
  'mangrove', 'cherry', 'bamboo', 'crimson', 'warped', 'pale_oak',
] as const;

/**
 * Stone types for derived blocks
 * Note: Currently unused but kept for future texture resolution enhancements
 */
const _STONE_TYPES = [
  'stone', 'cobblestone', 'mossy_cobblestone', 'stone_brick', 'mossy_stone_brick',
  'granite', 'polished_granite', 'diorite', 'polished_diorite', 'andesite', 'polished_andesite',
  'deepslate', 'cobbled_deepslate', 'polished_deepslate', 'deepslate_brick', 'deepslate_tile',
  'tuff', 'polished_tuff', 'tuff_brick',
  'blackstone', 'polished_blackstone', 'polished_blackstone_brick',
  'end_stone_brick', 'purpur',
  'prismarine', 'prismarine_brick', 'dark_prismarine',
  'mud_brick', 'packed_mud',
  'resin_brick',
] as const;
void _STONE_TYPES; // Suppress unused variable warning

/**
 * Mapping for derived blocks (stairs, slabs, walls, fences) to their base texture
 */
const DERIVED_TEXTURE_MAP: Record<string, string> = {
  // Wood planks derived
  ...Object.fromEntries(WOOD_TYPES.flatMap(wood => {
    const planks = wood === 'crimson' || wood === 'warped' ? `${wood}_planks` : `${wood}_planks`;
    return [
      [`${wood}_stairs`, planks],
      [`${wood}_slab`, planks],
      [`${wood}_fence`, planks],
      [`${wood}_fence_gate`, planks],
    ];
  })),

  // Stone derived
  stone_stairs: 'stone',
  stone_slab: 'stone',
  cobblestone_stairs: 'cobblestone',
  cobblestone_slab: 'cobblestone',
  cobblestone_wall: 'cobblestone',
  mossy_cobblestone_stairs: 'mossy_cobblestone',
  mossy_cobblestone_slab: 'mossy_cobblestone',
  mossy_cobblestone_wall: 'mossy_cobblestone',
  stone_brick_stairs: 'stone_bricks',
  stone_brick_slab: 'stone_bricks',
  stone_brick_wall: 'stone_bricks',
  mossy_stone_brick_stairs: 'mossy_stone_bricks',
  mossy_stone_brick_slab: 'mossy_stone_bricks',
  mossy_stone_brick_wall: 'mossy_stone_bricks',

  // Granite, Diorite, Andesite
  granite_stairs: 'granite',
  granite_slab: 'granite',
  granite_wall: 'granite',
  polished_granite_stairs: 'polished_granite',
  polished_granite_slab: 'polished_granite',
  diorite_stairs: 'diorite',
  diorite_slab: 'diorite',
  diorite_wall: 'diorite',
  polished_diorite_stairs: 'polished_diorite',
  polished_diorite_slab: 'polished_diorite',
  andesite_stairs: 'andesite',
  andesite_slab: 'andesite',
  andesite_wall: 'andesite',
  polished_andesite_stairs: 'polished_andesite',
  polished_andesite_slab: 'polished_andesite',

  // Deepslate
  cobbled_deepslate_stairs: 'cobbled_deepslate',
  cobbled_deepslate_slab: 'cobbled_deepslate',
  cobbled_deepslate_wall: 'cobbled_deepslate',
  polished_deepslate_stairs: 'polished_deepslate',
  polished_deepslate_slab: 'polished_deepslate',
  polished_deepslate_wall: 'polished_deepslate',
  deepslate_brick_stairs: 'deepslate_bricks',
  deepslate_brick_slab: 'deepslate_bricks',
  deepslate_brick_wall: 'deepslate_bricks',
  deepslate_tile_stairs: 'deepslate_tiles',
  deepslate_tile_slab: 'deepslate_tiles',
  deepslate_tile_wall: 'deepslate_tiles',

  // Tuff
  tuff_stairs: 'tuff',
  tuff_slab: 'tuff',
  tuff_wall: 'tuff',
  polished_tuff_stairs: 'polished_tuff',
  polished_tuff_slab: 'polished_tuff',
  polished_tuff_wall: 'polished_tuff',
  tuff_brick_stairs: 'tuff_bricks',
  tuff_brick_slab: 'tuff_bricks',
  tuff_brick_wall: 'tuff_bricks',

  // Blackstone
  blackstone_stairs: 'blackstone',
  blackstone_slab: 'blackstone',
  blackstone_wall: 'blackstone',
  polished_blackstone_stairs: 'polished_blackstone',
  polished_blackstone_slab: 'polished_blackstone',
  polished_blackstone_wall: 'polished_blackstone',
  polished_blackstone_brick_stairs: 'polished_blackstone_bricks',
  polished_blackstone_brick_slab: 'polished_blackstone_bricks',
  polished_blackstone_brick_wall: 'polished_blackstone_bricks',

  // Brick
  brick_stairs: 'bricks',
  brick_slab: 'bricks',
  brick_wall: 'bricks',

  // Nether brick
  nether_brick_stairs: 'nether_bricks',
  nether_brick_slab: 'nether_bricks',
  nether_brick_wall: 'nether_bricks',
  nether_brick_fence: 'nether_bricks',
  red_nether_brick_stairs: 'red_nether_bricks',
  red_nether_brick_slab: 'red_nether_bricks',
  red_nether_brick_wall: 'red_nether_bricks',

  // Sandstone
  sandstone_stairs: 'sandstone',
  sandstone_slab: 'sandstone',
  sandstone_wall: 'sandstone',
  smooth_sandstone_stairs: 'sandstone_top',
  smooth_sandstone_slab: 'sandstone_top',
  cut_sandstone_slab: 'cut_sandstone',
  red_sandstone_stairs: 'red_sandstone',
  red_sandstone_slab: 'red_sandstone',
  red_sandstone_wall: 'red_sandstone',
  smooth_red_sandstone_stairs: 'red_sandstone_top',
  smooth_red_sandstone_slab: 'red_sandstone_top',
  cut_red_sandstone_slab: 'cut_red_sandstone',

  // Quartz
  quartz_stairs: 'quartz_block_side',
  quartz_slab: 'quartz_block_side',
  smooth_quartz_stairs: 'quartz_block_bottom',
  smooth_quartz_slab: 'quartz_block_bottom',

  // Prismarine
  prismarine_stairs: 'prismarine',
  prismarine_slab: 'prismarine',
  prismarine_wall: 'prismarine',
  prismarine_brick_stairs: 'prismarine_bricks',
  prismarine_brick_slab: 'prismarine_bricks',
  dark_prismarine_stairs: 'dark_prismarine',
  dark_prismarine_slab: 'dark_prismarine',

  // End stone
  end_stone_brick_stairs: 'end_stone_bricks',
  end_stone_brick_slab: 'end_stone_bricks',
  end_stone_brick_wall: 'end_stone_bricks',

  // Purpur
  purpur_stairs: 'purpur_block',
  purpur_slab: 'purpur_block',

  // Mud brick
  mud_brick_stairs: 'mud_bricks',
  mud_brick_slab: 'mud_bricks',
  mud_brick_wall: 'mud_bricks',

  // Resin brick (1.21.4)
  resin_brick_stairs: 'resin_bricks',
  resin_brick_slab: 'resin_bricks',
  resin_brick_wall: 'resin_bricks',

  // Copper
  cut_copper_stairs: 'cut_copper',
  cut_copper_slab: 'cut_copper',
  exposed_cut_copper_stairs: 'exposed_cut_copper',
  exposed_cut_copper_slab: 'exposed_cut_copper',
  weathered_cut_copper_stairs: 'weathered_cut_copper',
  weathered_cut_copper_slab: 'weathered_cut_copper',
  oxidized_cut_copper_stairs: 'oxidized_cut_copper',
  oxidized_cut_copper_slab: 'oxidized_cut_copper',
  waxed_cut_copper_stairs: 'cut_copper',
  waxed_cut_copper_slab: 'cut_copper',
  waxed_exposed_cut_copper_stairs: 'exposed_cut_copper',
  waxed_exposed_cut_copper_slab: 'exposed_cut_copper',
  waxed_weathered_cut_copper_stairs: 'weathered_cut_copper',
  waxed_weathered_cut_copper_slab: 'weathered_cut_copper',
  waxed_oxidized_cut_copper_stairs: 'oxidized_cut_copper',
  waxed_oxidized_cut_copper_slab: 'oxidized_cut_copper',
};

/**
 * Known prefix aliases for blocks that share textures
 */
const DOWNLOAD_PREFIX_ALIASES: [string, string][] = [
  ['waxed_', ''],
  ['infested_', ''],
  ['chipped_', ''],
  ['damaged_', ''],
];

/**
 * Resolve texture names for a derived block
 */
function resolveTextureNameForBlock(blockName: string): string[] {
  const name = blockName.replace('minecraft:', '');

  // Direct mapping exists
  if (DERIVED_TEXTURE_MAP[name]) {
    return [DERIVED_TEXTURE_MAP[name]];
  }

  // Strip known prefixes and retry (e.g. waxed_copper_block → copper_block)
  for (const [prefix, replacement] of DOWNLOAD_PREFIX_ALIASES) {
    if (name.startsWith(prefix)) {
      const stripped = replacement + name.slice(prefix.length);
      const resolved = resolveTextureNameForBlock(stripped);
      // Also add the original name
      return [...resolved, name];
    }
  }

  // Pattern-based resolution for blocks not in the map
  // Stairs
  if (name.endsWith('_stairs')) {
    const base = name.replace('_stairs', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return [`${wood}_planks`];
      }
    }
    return [base, `${base}s`];
  }

  // Slabs
  if (name.endsWith('_slab')) {
    const base = name.replace('_slab', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return [`${wood}_planks`];
      }
    }
    return [base, `${base}s`];
  }

  // Walls
  if (name.endsWith('_wall')) {
    const base = name.replace('_wall', '');
    return [base, `${base}s`];
  }

  // Fences (not fence gates)
  if (name.endsWith('_fence') && !name.includes('fence_gate')) {
    const base = name.replace('_fence', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return [`${wood}_planks`];
      }
    }
    if (base === 'nether_brick') {
      return ['nether_bricks'];
    }
    return [base, `${base}s`];
  }

  // Fence gates
  if (name.endsWith('_fence_gate')) {
    const base = name.replace('_fence_gate', '');
    for (const wood of WOOD_TYPES) {
      if (base === wood) {
        return [`${wood}_planks`];
      }
    }
    return [base, `${base}s`];
  }

  // Buttons, pressure plates, signs
  const suffixes = ['_button', '_pressure_plate', '_wall_hanging_sign', '_hanging_sign', '_wall_sign', '_sign'];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      const base = name.replace(suffix, '');
      for (const wood of WOOD_TYPES) {
        if (base === wood) {
          return [`${wood}_planks`, name];
        }
      }
      return [base, name];
    }
  }

  // Doors → use door_top and door_bottom textures
  if (name.endsWith('_door')) {
    return [`${name}_top`, `${name}_bottom`];
  }

  // Trapdoors → direct texture
  if (name.endsWith('_trapdoor')) {
    return [name];
  }

  // Beds → use wool texture
  if (name.endsWith('_bed')) {
    const color = name.replace('_bed', '');
    return [`${color}_wool`];
  }

  // Stained glass panes → stained glass texture
  if (name.endsWith('_stained_glass_pane')) {
    return [name.replace('_pane', ''), name];
  }

  // Glass pane → glass
  if (name === 'glass_pane') {
    return ['glass'];
  }

  // Potted plants → need flower_pot texture
  if (name.startsWith('potted_')) {
    return ['flower_pot'];
  }

  // Entity-rendered blocks (heads, skulls, banners) → no block texture
  if (name.endsWith('_head') || name.endsWith('_skull') ||
      name.endsWith('_banner') || name.endsWith('_wall_banner')) {
    return [];
  }

  // Default: return block name as-is
  return [name];
}

/**
 * Get texture names needed for a list of block IDs
 *
 * Maps block IDs to their texture file names (handling multi-face blocks)
 */
/**
 * Block-to-texture-names mapping for blocks with multiple face textures.
 * Module-level constant to avoid re-creation on each function call.
 */
const MULTI_TEXTURE_BLOCKS: Record<string, string[]> = {
      // Grass and similar
      grass_block: ['grass_block_top', 'grass_block_side', 'dirt'],
      dirt_path: ['dirt_path_top', 'dirt_path_side', 'dirt'],
      mycelium: ['mycelium_top', 'mycelium_side', 'dirt'],
      podzol: ['podzol_top', 'podzol_side', 'dirt'],
      crimson_nylium: ['crimson_nylium', 'crimson_nylium_side', 'netherrack'],
      warped_nylium: ['warped_nylium', 'warped_nylium_side', 'netherrack'],

      // Logs
      oak_log: ['oak_log_top', 'oak_log'],
      spruce_log: ['spruce_log_top', 'spruce_log'],
      birch_log: ['birch_log_top', 'birch_log'],
      jungle_log: ['jungle_log_top', 'jungle_log'],
      acacia_log: ['acacia_log_top', 'acacia_log'],
      dark_oak_log: ['dark_oak_log_top', 'dark_oak_log'],
      mangrove_log: ['mangrove_log_top', 'mangrove_log'],
      cherry_log: ['cherry_log_top', 'cherry_log'],

      // Stripped logs
      stripped_oak_log: ['stripped_oak_log_top', 'stripped_oak_log'],
      stripped_spruce_log: ['stripped_spruce_log_top', 'stripped_spruce_log'],
      stripped_birch_log: ['stripped_birch_log_top', 'stripped_birch_log'],
      stripped_jungle_log: ['stripped_jungle_log_top', 'stripped_jungle_log'],
      stripped_acacia_log: ['stripped_acacia_log_top', 'stripped_acacia_log'],
      stripped_dark_oak_log: ['stripped_dark_oak_log_top', 'stripped_dark_oak_log'],
      stripped_mangrove_log: ['stripped_mangrove_log_top', 'stripped_mangrove_log'],
      stripped_cherry_log: ['stripped_cherry_log_top', 'stripped_cherry_log'],

      // Nether stems
      crimson_stem: ['crimson_stem_top', 'crimson_stem'],
      warped_stem: ['warped_stem_top', 'warped_stem'],
      stripped_crimson_stem: ['stripped_crimson_stem_top', 'stripped_crimson_stem'],
      stripped_warped_stem: ['stripped_warped_stem_top', 'stripped_warped_stem'],

      // Woods (bark on all sides)
      oak_wood: ['oak_log'],
      spruce_wood: ['spruce_log'],
      birch_wood: ['birch_log'],
      jungle_wood: ['jungle_log'],
      acacia_wood: ['acacia_log'],
      dark_oak_wood: ['dark_oak_log'],
      mangrove_wood: ['mangrove_log'],
      cherry_wood: ['cherry_log'],
      crimson_hyphae: ['crimson_stem'],
      warped_hyphae: ['warped_stem'],
      stripped_oak_wood: ['stripped_oak_log'],
      stripped_spruce_wood: ['stripped_spruce_log'],
      stripped_birch_wood: ['stripped_birch_log'],
      stripped_jungle_wood: ['stripped_jungle_log'],
      stripped_acacia_wood: ['stripped_acacia_log'],
      stripped_dark_oak_wood: ['stripped_dark_oak_log'],
      stripped_mangrove_wood: ['stripped_mangrove_log'],
      stripped_cherry_wood: ['stripped_cherry_log'],
      stripped_crimson_hyphae: ['stripped_crimson_stem'],
      stripped_warped_hyphae: ['stripped_warped_stem'],

      // Functional blocks
      tnt: ['tnt_top', 'tnt_side', 'tnt_bottom'],
      furnace: ['furnace_top', 'furnace_front', 'furnace_side'],
      blast_furnace: ['blast_furnace_top', 'blast_furnace_front', 'blast_furnace_side'],
      smoker: ['smoker_top', 'smoker_front', 'smoker_front_on', 'smoker_side', 'smoker_bottom'],
      crafting_table: ['crafting_table_top', 'crafting_table_front', 'crafting_table_side'],
      bookshelf: ['oak_planks', 'bookshelf'],
      chiseled_bookshelf: ['chiseled_bookshelf_top', 'chiseled_bookshelf_side', 'chiseled_bookshelf_empty'],
      jukebox: ['jukebox_top', 'jukebox_side'],
      note_block: ['note_block'],
      dispenser: ['dispenser_front', 'furnace_top', 'furnace_side'],
      dropper: ['dropper_front', 'furnace_top', 'furnace_side'],
      observer: ['observer_front', 'observer_back', 'observer_side', 'observer_top'],
      piston: ['piston_top', 'piston_side', 'piston_bottom'],
      sticky_piston: ['piston_top_sticky', 'piston_side', 'piston_bottom'],

      // Pumpkin and melon
      pumpkin: ['pumpkin_top', 'pumpkin_side'],
      carved_pumpkin: ['pumpkin_top', 'carved_pumpkin', 'pumpkin_side'],
      jack_o_lantern: ['pumpkin_top', 'jack_o_lantern', 'pumpkin_side'],
      melon: ['melon_top', 'melon_side'],

      // Cactus
      cactus: ['cactus_top', 'cactus_side', 'cactus_bottom'],

      // Other multi-face blocks
      hay_block: ['hay_block_top', 'hay_block_side'],
      bone_block: ['bone_block_top', 'bone_block_side'],
      quartz_pillar: ['quartz_pillar_top', 'quartz_pillar'],
      quartz_block: ['quartz_block_top', 'quartz_block_side', 'quartz_block_bottom'],
      sandstone: ['sandstone_top', 'sandstone', 'sandstone_bottom'],
      red_sandstone: ['red_sandstone_top', 'red_sandstone', 'red_sandstone_bottom'],
      cut_sandstone: ['sandstone_top', 'cut_sandstone'],
      cut_red_sandstone: ['red_sandstone_top', 'cut_red_sandstone'],
      chiseled_sandstone: ['sandstone_top', 'chiseled_sandstone'],
      chiseled_red_sandstone: ['red_sandstone_top', 'chiseled_red_sandstone'],
      smooth_sandstone: ['sandstone_top'],
      smooth_red_sandstone: ['red_sandstone_top'],

      // Lanterns (special handling)
      lantern: ['lantern'],
      soul_lantern: ['soul_lantern'],

      // Torches
      torch: ['torch'],
      wall_torch: ['torch'],
      soul_torch: ['soul_torch'],
      soul_wall_torch: ['soul_torch'],
      redstone_torch: ['redstone_torch'],
      redstone_wall_torch: ['redstone_torch'],

      // Chain
      chain: ['chain'],

      // Bell
      bell: ['bell_body', 'bell_top'],

      // Beehive
      beehive: ['beehive_front', 'beehive_side', 'beehive_end'],
      bee_nest: ['bee_nest_front', 'bee_nest_side', 'bee_nest_top'],

      // Barrel
      barrel: ['barrel_top', 'barrel_side', 'barrel_bottom'],

      // Composter
      composter: ['composter_top', 'composter_side', 'composter_bottom'],

      // Lectern
      lectern: ['lectern_top', 'lectern_front', 'lectern_sides', 'lectern_base'],

      // Cauldron
      cauldron: ['cauldron_top', 'cauldron_side', 'cauldron_bottom', 'cauldron_inner'],

      // Coral blocks
      brain_coral_block: ['brain_coral_block'],
      bubble_coral_block: ['bubble_coral_block'],
      fire_coral_block: ['fire_coral_block'],
      horn_coral_block: ['horn_coral_block'],
      tube_coral_block: ['tube_coral_block'],
      dead_brain_coral_block: ['dead_brain_coral_block'],
      dead_bubble_coral_block: ['dead_bubble_coral_block'],
      dead_fire_coral_block: ['dead_fire_coral_block'],
      dead_horn_coral_block: ['dead_horn_coral_block'],
      dead_tube_coral_block: ['dead_tube_coral_block'],

      // Coral (cross-shaped)
      brain_coral: ['brain_coral'],
      bubble_coral: ['bubble_coral'],
      fire_coral: ['fire_coral'],
      horn_coral: ['horn_coral'],
      tube_coral: ['tube_coral'],
      dead_brain_coral: ['dead_brain_coral'],
      dead_bubble_coral: ['dead_bubble_coral'],
      dead_fire_coral: ['dead_fire_coral'],
      dead_horn_coral: ['dead_horn_coral'],
      dead_tube_coral: ['dead_tube_coral'],

      // Coral fans
      brain_coral_fan: ['brain_coral_fan'],
      bubble_coral_fan: ['bubble_coral_fan'],
      fire_coral_fan: ['fire_coral_fan'],
      horn_coral_fan: ['horn_coral_fan'],
      tube_coral_fan: ['tube_coral_fan'],
      dead_brain_coral_fan: ['dead_brain_coral_fan'],
      dead_bubble_coral_fan: ['dead_bubble_coral_fan'],
      dead_fire_coral_fan: ['dead_fire_coral_fan'],
      dead_horn_coral_fan: ['dead_horn_coral_fan'],
      dead_tube_coral_fan: ['dead_tube_coral_fan'],

      // Bamboo block
      bamboo_block: ['bamboo_block_top', 'bamboo_block'],
      stripped_bamboo_block: ['stripped_bamboo_block_top', 'stripped_bamboo_block'],

      // Copper
      copper_block: ['copper_block'],
      exposed_copper: ['exposed_copper'],
      weathered_copper: ['weathered_copper'],
      oxidized_copper: ['oxidized_copper'],
      cut_copper: ['cut_copper'],
      exposed_cut_copper: ['exposed_cut_copper'],
      weathered_cut_copper: ['weathered_cut_copper'],
      oxidized_cut_copper: ['oxidized_cut_copper'],

      // Amethyst
      amethyst_block: ['amethyst_block'],
      budding_amethyst: ['budding_amethyst'],

      // Sculk
      sculk: ['sculk'],
      sculk_catalyst: ['sculk_catalyst_top', 'sculk_catalyst_side', 'sculk_catalyst_bottom'],
      sculk_sensor: ['sculk_sensor_top', 'sculk_sensor_side', 'sculk_sensor_bottom'],
      sculk_shrieker: ['sculk_shrieker_top', 'sculk_shrieker_side', 'sculk_shrieker_bottom'],

      // Reinforced deepslate
      reinforced_deepslate: ['reinforced_deepslate_top', 'reinforced_deepslate_side', 'reinforced_deepslate_bottom'],

      // === 1.21+ New blocks ===

      // Pale Oak (1.21.4)
      pale_oak_log: ['pale_oak_log_top', 'pale_oak_log'],
      stripped_pale_oak_log: ['stripped_pale_oak_log_top', 'stripped_pale_oak_log'],
      pale_oak_wood: ['pale_oak_log'],
      stripped_pale_oak_wood: ['stripped_pale_oak_log'],
      pale_oak_planks: ['pale_oak_planks'],
      pale_oak_leaves: ['pale_oak_leaves'],
      pale_oak_sapling: ['pale_oak_sapling'],
      pale_oak_door: ['pale_oak_door_top', 'pale_oak_door_bottom'],
      pale_oak_trapdoor: ['pale_oak_trapdoor'],

      // Creaking Heart (1.21.4)
      creaking_heart: ['creaking_heart_top', 'creaking_heart_side'],

      // Resin (1.21.4)
      resin_clump: ['resin_clump'],
      resin_block: ['resin_block'],
      resin_bricks: ['resin_bricks'],
      chiseled_resin_bricks: ['chiseled_resin_bricks'],

      // Pale Moss (1.21.4)
      pale_moss_block: ['pale_moss_block'],
      pale_moss_carpet: ['pale_moss_block'],
      pale_hanging_moss: ['pale_hanging_moss'],

      // Eyeblossom (1.21.4)
      eyeblossom: ['eyeblossom'],
      open_eyeblossom: ['open_eyeblossom'],
      closed_eyeblossom: ['closed_eyeblossom'],

      // Copper new blocks (1.21)
      copper_grate: ['copper_grate'],
      exposed_copper_grate: ['exposed_copper_grate'],
      weathered_copper_grate: ['weathered_copper_grate'],
      oxidized_copper_grate: ['oxidized_copper_grate'],
      waxed_copper_grate: ['copper_grate'],
      waxed_exposed_copper_grate: ['exposed_copper_grate'],
      waxed_weathered_copper_grate: ['weathered_copper_grate'],
      waxed_oxidized_copper_grate: ['oxidized_copper_grate'],

      chiseled_copper: ['chiseled_copper'],
      exposed_chiseled_copper: ['exposed_chiseled_copper'],
      weathered_chiseled_copper: ['weathered_chiseled_copper'],
      oxidized_chiseled_copper: ['oxidized_chiseled_copper'],
      waxed_chiseled_copper: ['chiseled_copper'],
      waxed_exposed_chiseled_copper: ['exposed_chiseled_copper'],
      waxed_weathered_chiseled_copper: ['weathered_chiseled_copper'],
      waxed_oxidized_chiseled_copper: ['oxidized_chiseled_copper'],

      copper_bulb: ['copper_bulb'],
      exposed_copper_bulb: ['exposed_copper_bulb'],
      weathered_copper_bulb: ['weathered_copper_bulb'],
      oxidized_copper_bulb: ['oxidized_copper_bulb'],
      waxed_copper_bulb: ['copper_bulb'],
      waxed_exposed_copper_bulb: ['exposed_copper_bulb'],
      waxed_weathered_copper_bulb: ['weathered_copper_bulb'],
      waxed_oxidized_copper_bulb: ['oxidized_copper_bulb'],

      copper_door: ['copper_door_top', 'copper_door_bottom'],
      exposed_copper_door: ['exposed_copper_door_top', 'exposed_copper_door_bottom'],
      weathered_copper_door: ['weathered_copper_door_top', 'weathered_copper_door_bottom'],
      oxidized_copper_door: ['oxidized_copper_door_top', 'oxidized_copper_door_bottom'],
      waxed_copper_door: ['copper_door_top', 'copper_door_bottom'],
      waxed_exposed_copper_door: ['exposed_copper_door_top', 'exposed_copper_door_bottom'],
      waxed_weathered_copper_door: ['weathered_copper_door_top', 'weathered_copper_door_bottom'],
      waxed_oxidized_copper_door: ['oxidized_copper_door_top', 'oxidized_copper_door_bottom'],

      copper_trapdoor: ['copper_trapdoor'],
      exposed_copper_trapdoor: ['exposed_copper_trapdoor'],
      weathered_copper_trapdoor: ['weathered_copper_trapdoor'],
      oxidized_copper_trapdoor: ['oxidized_copper_trapdoor'],
      waxed_copper_trapdoor: ['copper_trapdoor'],
      waxed_exposed_copper_trapdoor: ['exposed_copper_trapdoor'],
      waxed_weathered_copper_trapdoor: ['weathered_copper_trapdoor'],
      waxed_oxidized_copper_trapdoor: ['oxidized_copper_trapdoor'],

      // Trial Chamber blocks (1.21)
      trial_spawner: ['trial_spawner_top', 'trial_spawner_side', 'trial_spawner_bottom'],
      ominous_trial_spawner: ['trial_spawner_top', 'trial_spawner_side', 'trial_spawner_bottom'],
      vault: ['vault_top', 'vault_front', 'vault_side', 'vault_bottom'],
      ominous_vault: ['vault_top', 'vault_front', 'vault_side', 'vault_bottom'],
      heavy_core: ['heavy_core_top', 'heavy_core_side'],

      // Crafter (1.21)
      crafter: ['crafter_top', 'crafter_side', 'crafter_bottom', 'crafter_north'],

      // 1.21.5 Plants
      bush: ['bush'],
      cactus_flower: ['cactus_flower'],
      firefly_bush: ['firefly_bush'],
      leaf_litter: ['leaf_litter'],
      short_dry_grass: ['short_dry_grass'],
      tall_dry_grass: ['tall_dry_grass_top', 'tall_dry_grass_bottom'],
      wildflowers: ['wildflowers'],

      // Legacy missing blocks
      glow_berries: ['glow_berries'],

      // === Doors (top/bottom textures) ===
      oak_door: ['oak_door_top', 'oak_door_bottom'],
      spruce_door: ['spruce_door_top', 'spruce_door_bottom'],
      birch_door: ['birch_door_top', 'birch_door_bottom'],
      jungle_door: ['jungle_door_top', 'jungle_door_bottom'],
      acacia_door: ['acacia_door_top', 'acacia_door_bottom'],
      dark_oak_door: ['dark_oak_door_top', 'dark_oak_door_bottom'],
      mangrove_door: ['mangrove_door_top', 'mangrove_door_bottom'],
      cherry_door: ['cherry_door_top', 'cherry_door_bottom'],
      bamboo_door: ['bamboo_door_top', 'bamboo_door_bottom'],
      crimson_door: ['crimson_door_top', 'crimson_door_bottom'],
      warped_door: ['warped_door_top', 'warped_door_bottom'],
      iron_door: ['iron_door_top', 'iron_door_bottom'],

      // === Glass and glass panes ===
      glass_pane: ['glass', 'glass_pane_top'],
      glass: ['glass'],
      // Stained glass panes → stained_glass texture + color-specific pane_top for edges
      white_stained_glass_pane: ['white_stained_glass', 'white_stained_glass_pane_top'],
      orange_stained_glass_pane: ['orange_stained_glass', 'orange_stained_glass_pane_top'],
      magenta_stained_glass_pane: ['magenta_stained_glass', 'magenta_stained_glass_pane_top'],
      light_blue_stained_glass_pane: ['light_blue_stained_glass', 'light_blue_stained_glass_pane_top'],
      yellow_stained_glass_pane: ['yellow_stained_glass', 'yellow_stained_glass_pane_top'],
      lime_stained_glass_pane: ['lime_stained_glass', 'lime_stained_glass_pane_top'],
      pink_stained_glass_pane: ['pink_stained_glass', 'pink_stained_glass_pane_top'],
      gray_stained_glass_pane: ['gray_stained_glass', 'gray_stained_glass_pane_top'],
      light_gray_stained_glass_pane: ['light_gray_stained_glass', 'light_gray_stained_glass_pane_top'],
      cyan_stained_glass_pane: ['cyan_stained_glass', 'cyan_stained_glass_pane_top'],
      purple_stained_glass_pane: ['purple_stained_glass', 'purple_stained_glass_pane_top'],
      blue_stained_glass_pane: ['blue_stained_glass', 'blue_stained_glass_pane_top'],
      brown_stained_glass_pane: ['brown_stained_glass', 'brown_stained_glass_pane_top'],
      green_stained_glass_pane: ['green_stained_glass', 'green_stained_glass_pane_top'],
      red_stained_glass_pane: ['red_stained_glass', 'red_stained_glass_pane_top'],
      black_stained_glass_pane: ['black_stained_glass', 'black_stained_glass_pane_top'],

      // === Trapdoors ===
      oak_trapdoor: ['oak_trapdoor'],
      spruce_trapdoor: ['spruce_trapdoor'],
      birch_trapdoor: ['birch_trapdoor'],
      jungle_trapdoor: ['jungle_trapdoor'],
      acacia_trapdoor: ['acacia_trapdoor'],
      dark_oak_trapdoor: ['dark_oak_trapdoor'],
      mangrove_trapdoor: ['mangrove_trapdoor'],
      cherry_trapdoor: ['cherry_trapdoor'],
      bamboo_trapdoor: ['bamboo_trapdoor'],
      crimson_trapdoor: ['crimson_trapdoor'],
      warped_trapdoor: ['warped_trapdoor'],
      iron_trapdoor: ['iron_trapdoor'],

      // === Entity-rendered blocks (use planks/wood textures as fallback) ===
      chest: ['oak_planks'],
      ender_chest: ['obsidian'],
      trapped_chest: ['oak_planks'],

      // === Beds (use wool textures as fallback) ===
      white_bed: ['white_wool'],
      orange_bed: ['orange_wool'],
      magenta_bed: ['magenta_wool'],
      light_blue_bed: ['light_blue_wool'],
      yellow_bed: ['yellow_wool'],
      lime_bed: ['lime_wool'],
      pink_bed: ['pink_wool'],
      gray_bed: ['gray_wool'],
      light_gray_bed: ['light_gray_wool'],
      cyan_bed: ['cyan_wool'],
      purple_bed: ['purple_wool'],
      blue_bed: ['blue_wool'],
      brown_bed: ['brown_wool'],
      green_bed: ['green_wool'],
      red_bed: ['red_wool'],
      black_bed: ['black_wool'],

      // === Campfire ===
      campfire: ['campfire_log_lit', 'campfire_fire'],
      soul_campfire: ['soul_campfire_log_lit', 'soul_fire_0'],

      // === Azalea ===
      azalea: ['azalea_top', 'azalea_side', 'azalea_plant'],
      flowering_azalea: ['flowering_azalea_top', 'flowering_azalea_side', 'azalea_plant'],
      azalea_leaves: ['azalea_leaves'],
      flowering_azalea_leaves: ['flowering_azalea_leaves'],

      // === Signs (use planks) ===
      oak_sign: ['oak_planks'],
      oak_wall_sign: ['oak_planks'],
      spruce_sign: ['spruce_planks'],
      spruce_wall_sign: ['spruce_planks'],
      birch_sign: ['birch_planks'],
      birch_wall_sign: ['birch_planks'],
      jungle_sign: ['jungle_planks'],
      jungle_wall_sign: ['jungle_planks'],
      acacia_sign: ['acacia_planks'],
      acacia_wall_sign: ['acacia_planks'],
      dark_oak_sign: ['dark_oak_planks'],
      dark_oak_wall_sign: ['dark_oak_planks'],
      mangrove_sign: ['mangrove_planks'],
      mangrove_wall_sign: ['mangrove_planks'],
      cherry_sign: ['cherry_planks'],
      cherry_wall_sign: ['cherry_planks'],
      bamboo_sign: ['bamboo_planks'],
      bamboo_wall_sign: ['bamboo_planks'],
      crimson_sign: ['crimson_planks'],
      crimson_wall_sign: ['crimson_planks'],
      warped_sign: ['warped_planks'],
      warped_wall_sign: ['warped_planks'],

      // === Carpets (use wool textures) ===
      white_carpet: ['white_wool'],
      orange_carpet: ['orange_wool'],
      magenta_carpet: ['magenta_wool'],
      light_blue_carpet: ['light_blue_wool'],
      yellow_carpet: ['yellow_wool'],
      lime_carpet: ['lime_wool'],
      pink_carpet: ['pink_wool'],
      gray_carpet: ['gray_wool'],
      light_gray_carpet: ['light_gray_wool'],
      cyan_carpet: ['cyan_wool'],
      purple_carpet: ['purple_wool'],
      blue_carpet: ['blue_wool'],
      brown_carpet: ['brown_wool'],
      green_carpet: ['green_wool'],
      red_carpet: ['red_wool'],
      black_carpet: ['black_wool'],

      // === Glazed terracotta ===
      white_glazed_terracotta: ['white_glazed_terracotta'],
      orange_glazed_terracotta: ['orange_glazed_terracotta'],
      magenta_glazed_terracotta: ['magenta_glazed_terracotta'],
      light_blue_glazed_terracotta: ['light_blue_glazed_terracotta'],
      yellow_glazed_terracotta: ['yellow_glazed_terracotta'],
      lime_glazed_terracotta: ['lime_glazed_terracotta'],
      pink_glazed_terracotta: ['pink_glazed_terracotta'],
      gray_glazed_terracotta: ['gray_glazed_terracotta'],
      light_gray_glazed_terracotta: ['light_gray_glazed_terracotta'],
      cyan_glazed_terracotta: ['cyan_glazed_terracotta'],
      purple_glazed_terracotta: ['purple_glazed_terracotta'],
      blue_glazed_terracotta: ['blue_glazed_terracotta'],
      brown_glazed_terracotta: ['brown_glazed_terracotta'],
      green_glazed_terracotta: ['green_glazed_terracotta'],
      red_glazed_terracotta: ['red_glazed_terracotta'],
      black_glazed_terracotta: ['black_glazed_terracotta'],

      // === Concrete powder ===
      white_concrete_powder: ['white_concrete_powder'],
      orange_concrete_powder: ['orange_concrete_powder'],
      magenta_concrete_powder: ['magenta_concrete_powder'],
      light_blue_concrete_powder: ['light_blue_concrete_powder'],
      yellow_concrete_powder: ['yellow_concrete_powder'],
      lime_concrete_powder: ['lime_concrete_powder'],
      pink_concrete_powder: ['pink_concrete_powder'],
      gray_concrete_powder: ['gray_concrete_powder'],
      light_gray_concrete_powder: ['light_gray_concrete_powder'],
      cyan_concrete_powder: ['cyan_concrete_powder'],
      purple_concrete_powder: ['purple_concrete_powder'],
      blue_concrete_powder: ['blue_concrete_powder'],
      brown_concrete_powder: ['brown_concrete_powder'],
      green_concrete_powder: ['green_concrete_powder'],
      red_concrete_powder: ['red_concrete_powder'],
      black_concrete_powder: ['black_concrete_powder'],

      // === Enchanting / Brewing / Redstone ===
      enchanting_table: ['enchanting_table_top', 'enchanting_table_bottom', 'enchanting_table_side'],
      brewing_stand: ['brewing_stand', 'brewing_stand_base'],
      redstone_lamp: ['redstone_lamp'],
      target: ['target_top', 'target_side'],
      daylight_detector: ['daylight_detector_top', 'daylight_detector_side'],

      // === Mushroom blocks ===
      mushroom_stem: ['mushroom_stem', 'mushroom_block_inside'],
      brown_mushroom_block: ['brown_mushroom_block', 'mushroom_block_inside'],
      red_mushroom_block: ['red_mushroom_block', 'mushroom_block_inside'],

      // === Misc blocks ===
      dried_kelp_block: ['dried_kelp_block_top', 'dried_kelp_block_side', 'dried_kelp_block_bottom'],
      end_portal_frame: ['end_portal_frame_top', 'end_portal_frame_side', 'end_stone'],
      respawn_anchor: ['respawn_anchor_top', 'respawn_anchor_bottom', 'respawn_anchor_side'],
      lodestone: ['lodestone_top', 'lodestone_side'],
      flower_pot: ['flower_pot'],

      // === Froglights ===
      pearlescent_froglight: ['pearlescent_froglight_top', 'pearlescent_froglight_side'],
      verdant_froglight: ['verdant_froglight_top', 'verdant_froglight_side'],
      ochre_froglight: ['ochre_froglight_top', 'ochre_froglight_side'],

      // === Complex mechanism blocks ===
      grindstone: ['grindstone_side', 'grindstone_round', 'grindstone_pivot'],
      hopper: ['hopper_top', 'hopper_outside', 'hopper_inside'],
      smithing_table: ['smithing_table_top', 'smithing_table_bottom', 'smithing_table_side'],
      stonecutter: ['stonecutter_top', 'stonecutter_bottom', 'stonecutter_side'],

      // === Tall flowers ===
      lilac: ['lilac_top', 'lilac_bottom'],
      peony: ['peony_top', 'peony_bottom'],
      rose_bush: ['rose_bush_top', 'rose_bush_bottom'],
      sunflower: ['sunflower_front', 'sunflower_back', 'sunflower_bottom'],
      tall_grass: ['tall_grass_top', 'tall_grass_bottom'],
      large_fern: ['large_fern_top', 'large_fern_bottom'],

      // === Short grass (renamed from grass in 1.20+) ===
      short_grass: ['short_grass'],

      // === Misc ===
      fire: ['fire_0'],
      soul_fire: ['soul_fire_0'],
      cobweb: ['cobweb'],
      moss_block: ['moss_block'],
      moss_carpet: ['moss_block'],
      hanging_roots: ['hanging_roots'],
      spore_blossom: ['spore_blossom'],

      // === Candles ===
      candle: ['candle'],
      white_candle: ['white_candle'],
      orange_candle: ['orange_candle'],
      magenta_candle: ['magenta_candle'],
      light_blue_candle: ['light_blue_candle'],
      yellow_candle: ['yellow_candle'],
      lime_candle: ['lime_candle'],
      pink_candle: ['pink_candle'],
      gray_candle: ['gray_candle'],
      light_gray_candle: ['light_gray_candle'],
      cyan_candle: ['cyan_candle'],
      purple_candle: ['purple_candle'],
      blue_candle: ['blue_candle'],
      brown_candle: ['brown_candle'],
      green_candle: ['green_candle'],
      red_candle: ['red_candle'],
      black_candle: ['black_candle'],
};

export function getTextureNamesForBlocks(blockIds: string[]): string[] {
  const textureNames = new Set<string>();

  for (const blockId of blockIds) {
    const name = blockId.replace('minecraft:', '');

    if (MULTI_TEXTURE_BLOCKS[name]) {
      MULTI_TEXTURE_BLOCKS[name].forEach((t) => textureNames.add(t));
    } else {
      // Try to resolve derived block textures
      const resolved = resolveTextureNameForBlock(name);
      resolved.forEach((t) => textureNames.add(t));
      // Also add the original name in case it exists
      textureNames.add(name);
    }
  }

  return Array.from(textureNames);
}

/**
 * Clear the texture cache
 */
export function clearTextureCache(): void {
  textureCache.clear();
  clientJarCache.clear();
  versionManifestCache.data = null;
  versionManifestCache.timestamp = 0;
}
