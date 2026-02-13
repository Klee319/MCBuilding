/**
 * TextureLoaderAdapter
 *
 * Implementation of TextureLoaderPort for loading block textures.
 * Creates a default texture atlas with placeholder colors for common blocks.
 *
 * @example
 * const loader = new TextureLoaderAdapter();
 * const result = await loader.loadDefaultTextures();
 * const textures = loader.getBlockTexture(BlockState.create('minecraft:stone'));
 */

import type {
  TextureLoaderPort,
  TextureAtlas,
  BlockTextures,
  UVCoordinates,
} from '../../usecase/ports/renderer/texture-loader-port.js';
import type { BlockState } from '../../domain/renderer/block-state.js';
import type { Result } from '../../usecase/ports/renderer/nbt-parser-port.js';
import { PortError } from '../../usecase/ports/types.js';

// ========================================
// Constants
// ========================================

/** Default tile size in pixels */
const DEFAULT_TILE_SIZE = 16;

/** Default atlas dimensions (32x32 tiles = 512x512 pixels) */
const ATLAS_TILES = 32;
const ATLAS_SIZE = ATLAS_TILES * DEFAULT_TILE_SIZE;

// ========================================
// Block Color Definitions
// ========================================

/**
 * Helper to create a uniform color entry (all faces same color)
 */
function uniform(r: number, g: number, b: number): { top: number[]; side: number[]; bottom: number[] } {
  const c = [r, g, b];
  return { top: c, side: c, bottom: c };
}

/**
 * Helper to create a block with different top/side/bottom colors
 */
function faced(top: number[], side: number[], bottom: number[]): { top: number[]; side: number[]; bottom: number[] } {
  return { top, side, bottom };
}

/**
 * RGB colors for Minecraft blocks (placeholder textures).
 * Covers all vanilla blocks to minimize magenta fallback.
 */
const BLOCK_COLORS: Record<string, { top: number[]; side: number[]; bottom: number[] }> = {
  // === Air (transparent, skipped in rendering) ===
  'minecraft:air': uniform(0, 0, 0),
  'minecraft:cave_air': uniform(0, 0, 0),
  'minecraft:void_air': uniform(0, 0, 0),

  // === Stone variants ===
  'minecraft:stone': uniform(128, 128, 128),
  'minecraft:granite': uniform(153, 114, 99),
  'minecraft:polished_granite': uniform(154, 106, 89),
  'minecraft:diorite': uniform(188, 188, 188),
  'minecraft:polished_diorite': uniform(192, 192, 192),
  'minecraft:andesite': uniform(136, 136, 136),
  'minecraft:polished_andesite': uniform(132, 135, 132),
  'minecraft:deepslate': uniform(80, 80, 82),
  'minecraft:cobbled_deepslate': uniform(77, 77, 80),
  'minecraft:polished_deepslate': uniform(72, 72, 74),
  'minecraft:deepslate_bricks': uniform(70, 70, 72),
  'minecraft:cracked_deepslate_bricks': uniform(65, 65, 67),
  'minecraft:deepslate_tiles': uniform(54, 54, 56),
  'minecraft:cracked_deepslate_tiles': uniform(50, 50, 52),
  'minecraft:chiseled_deepslate': uniform(54, 54, 56),
  'minecraft:calcite': uniform(224, 224, 222),
  'minecraft:tuff': uniform(108, 109, 102),
  'minecraft:tuff_bricks': uniform(106, 107, 100),
  'minecraft:polished_tuff': uniform(110, 111, 104),
  'minecraft:chiseled_tuff': uniform(108, 109, 102),
  'minecraft:chiseled_tuff_bricks': uniform(106, 107, 100),
  'minecraft:dripstone_block': uniform(134, 107, 92),
  'minecraft:smooth_stone': uniform(158, 158, 158),
  'minecraft:smooth_stone_slab': uniform(158, 158, 158),
  'minecraft:stone_slab': uniform(128, 128, 128),

  // === Dirt/Grass variants ===
  'minecraft:dirt': uniform(134, 96, 67),
  'minecraft:grass_block': faced([91, 140, 56], [134, 96, 67], [134, 96, 67]),
  'minecraft:coarse_dirt': uniform(119, 85, 59),
  'minecraft:podzol': faced([122, 98, 44], [122, 85, 58], [134, 96, 67]),
  'minecraft:mycelium': faced([111, 99, 105], [134, 96, 67], [134, 96, 67]),
  'minecraft:rooted_dirt': uniform(144, 104, 76),
  'minecraft:mud': uniform(60, 57, 60),
  'minecraft:muddy_mangrove_roots': uniform(68, 60, 46),
  'minecraft:packed_mud': uniform(142, 106, 79),
  'minecraft:mud_bricks': uniform(137, 104, 79),
  'minecraft:farmland': faced([110, 75, 45], [134, 96, 67], [134, 96, 67]),
  'minecraft:dirt_path': faced([148, 121, 65], [134, 96, 67], [134, 96, 67]),
  'minecraft:soul_soil': uniform(75, 57, 46),
  'minecraft:clay': uniform(160, 166, 179),

  // === Cobblestone ===
  'minecraft:cobblestone': uniform(100, 100, 100),
  'minecraft:mossy_cobblestone': uniform(90, 108, 90),
  'minecraft:infested_cobblestone': uniform(100, 100, 100),

  // === Sand/Gravel ===
  'minecraft:sand': uniform(219, 207, 163),
  'minecraft:red_sand': uniform(190, 102, 33),
  'minecraft:gravel': uniform(136, 126, 126),
  'minecraft:suspicious_sand': uniform(219, 207, 163),
  'minecraft:suspicious_gravel': uniform(136, 126, 126),

  // === Sandstone ===
  'minecraft:sandstone': uniform(216, 203, 155),
  'minecraft:chiseled_sandstone': uniform(216, 203, 155),
  'minecraft:cut_sandstone': uniform(216, 203, 155),
  'minecraft:smooth_sandstone': uniform(223, 214, 170),
  'minecraft:red_sandstone': uniform(186, 99, 29),
  'minecraft:chiseled_red_sandstone': uniform(186, 99, 29),
  'minecraft:cut_red_sandstone': uniform(186, 99, 29),
  'minecraft:smooth_red_sandstone': uniform(181, 97, 31),

  // === Logs ===
  'minecraft:oak_log': faced([149, 114, 54], [109, 85, 50], [149, 114, 54]),
  'minecraft:spruce_log': faced([104, 78, 47], [58, 37, 16], [104, 78, 47]),
  'minecraft:birch_log': faced([177, 166, 122], [216, 215, 210], [177, 166, 122]),
  'minecraft:jungle_log': faced([149, 109, 54], [85, 67, 25], [149, 109, 54]),
  'minecraft:acacia_log': faced([150, 92, 55], [103, 96, 86], [150, 92, 55]),
  'minecraft:dark_oak_log': faced([96, 76, 49], [60, 46, 26], [96, 76, 49]),
  'minecraft:cherry_log': faced([216, 150, 137], [53, 33, 41], [216, 150, 137]),
  'minecraft:mangrove_log': faced([107, 55, 40], [84, 71, 39], [107, 55, 40]),
  'minecraft:bamboo_block': uniform(176, 179, 70),
  'minecraft:crimson_stem': faced([119, 43, 57], [93, 26, 29], [119, 43, 57]),
  'minecraft:warped_stem': faced([41, 122, 111], [51, 72, 75], [41, 122, 111]),

  // === Stripped Logs ===
  'minecraft:stripped_oak_log': faced([177, 144, 86], [135, 109, 64], [177, 144, 86]),
  'minecraft:stripped_spruce_log': faced([117, 89, 52], [86, 65, 34], [117, 89, 52]),
  'minecraft:stripped_birch_log': faced([186, 175, 129], [200, 186, 135], [186, 175, 129]),
  'minecraft:stripped_jungle_log': faced([171, 132, 84], [169, 123, 64], [171, 132, 84]),
  'minecraft:stripped_acacia_log': faced([174, 92, 59], [174, 92, 59], [174, 92, 59]),
  'minecraft:stripped_dark_oak_log': faced([96, 76, 49], [72, 56, 36], [96, 76, 49]),
  'minecraft:stripped_cherry_log': faced([216, 150, 137], [216, 148, 131], [216, 150, 137]),
  'minecraft:stripped_mangrove_log': faced([120, 62, 44], [115, 55, 38], [120, 62, 44]),
  'minecraft:stripped_crimson_stem': faced([137, 57, 79], [137, 57, 79], [137, 57, 79]),
  'minecraft:stripped_warped_stem': faced([57, 150, 137], [57, 150, 137], [57, 150, 137]),
  'minecraft:stripped_bamboo_block': uniform(194, 175, 82),

  // === Wood (bark on all sides) ===
  'minecraft:oak_wood': uniform(109, 85, 50),
  'minecraft:spruce_wood': uniform(58, 37, 16),
  'minecraft:birch_wood': uniform(216, 215, 210),
  'minecraft:jungle_wood': uniform(85, 67, 25),
  'minecraft:acacia_wood': uniform(103, 96, 86),
  'minecraft:dark_oak_wood': uniform(60, 46, 26),
  'minecraft:cherry_wood': uniform(53, 33, 41),
  'minecraft:mangrove_wood': uniform(84, 71, 39),
  'minecraft:crimson_hyphae': uniform(93, 26, 29),
  'minecraft:warped_hyphae': uniform(51, 72, 75),

  // === Planks ===
  'minecraft:oak_planks': uniform(162, 131, 79),
  'minecraft:spruce_planks': uniform(115, 85, 49),
  'minecraft:birch_planks': uniform(196, 179, 123),
  'minecraft:jungle_planks': uniform(160, 115, 80),
  'minecraft:acacia_planks': uniform(168, 90, 50),
  'minecraft:dark_oak_planks': uniform(60, 46, 26),
  'minecraft:cherry_planks': uniform(226, 178, 165),
  'minecraft:mangrove_planks': uniform(117, 54, 48),
  'minecraft:bamboo_planks': uniform(194, 175, 82),
  'minecraft:bamboo_mosaic': uniform(190, 170, 78),
  'minecraft:crimson_planks': uniform(101, 48, 70),
  'minecraft:warped_planks': uniform(43, 105, 99),

  // === Leaves ===
  'minecraft:oak_leaves': uniform(60, 150, 60),
  'minecraft:spruce_leaves': uniform(50, 90, 60),
  'minecraft:birch_leaves': uniform(80, 140, 70),
  'minecraft:jungle_leaves': uniform(50, 130, 50),
  'minecraft:acacia_leaves': uniform(70, 120, 50),
  'minecraft:dark_oak_leaves': uniform(40, 100, 40),
  'minecraft:cherry_leaves': uniform(230, 180, 200),
  'minecraft:azalea_leaves': uniform(70, 120, 60),
  'minecraft:flowering_azalea_leaves': uniform(200, 150, 180),
  'minecraft:mangrove_leaves': uniform(60, 100, 50),

  // === Ores ===
  'minecraft:gold_ore': uniform(128, 128, 100),
  'minecraft:iron_ore': uniform(128, 115, 110),
  'minecraft:coal_ore': uniform(95, 95, 95),
  'minecraft:diamond_ore': uniform(100, 140, 145),
  'minecraft:lapis_ore': uniform(100, 110, 150),
  'minecraft:redstone_ore': uniform(132, 90, 90),
  'minecraft:emerald_ore': uniform(100, 135, 100),
  'minecraft:copper_ore': uniform(124, 125, 120),
  'minecraft:nether_gold_ore': uniform(115, 75, 50),
  'minecraft:nether_quartz_ore': uniform(125, 85, 85),
  'minecraft:ancient_debris': uniform(100, 84, 76),
  // Deepslate ores
  'minecraft:deepslate_gold_ore': uniform(98, 98, 78),
  'minecraft:deepslate_iron_ore': uniform(98, 88, 84),
  'minecraft:deepslate_coal_ore': uniform(72, 72, 72),
  'minecraft:deepslate_diamond_ore': uniform(78, 108, 112),
  'minecraft:deepslate_lapis_ore': uniform(78, 86, 116),
  'minecraft:deepslate_redstone_ore': uniform(102, 66, 66),
  'minecraft:deepslate_emerald_ore': uniform(78, 104, 78),
  'minecraft:deepslate_copper_ore': uniform(96, 96, 92),
  // Raw ore blocks
  'minecraft:raw_iron_block': uniform(166, 136, 107),
  'minecraft:raw_gold_block': uniform(221, 169, 46),
  'minecraft:raw_copper_block': uniform(154, 105, 73),

  // === Metal/Mineral Blocks ===
  'minecraft:gold_block': uniform(249, 236, 79),
  'minecraft:iron_block': uniform(220, 220, 220),
  'minecraft:diamond_block': uniform(98, 237, 228),
  'minecraft:emerald_block': uniform(42, 176, 72),
  'minecraft:lapis_block': uniform(31, 67, 140),
  'minecraft:redstone_block': uniform(171, 27, 9),
  'minecraft:netherite_block': uniform(66, 61, 63),
  'minecraft:coal_block': uniform(16, 15, 15),
  'minecraft:copper_block': uniform(192, 107, 79),
  'minecraft:exposed_copper': uniform(161, 125, 103),
  'minecraft:weathered_copper': uniform(109, 145, 107),
  'minecraft:oxidized_copper': uniform(82, 162, 132),
  'minecraft:cut_copper': uniform(191, 106, 80),
  'minecraft:exposed_cut_copper': uniform(154, 121, 101),
  'minecraft:weathered_cut_copper': uniform(109, 145, 107),
  'minecraft:oxidized_cut_copper': uniform(79, 153, 126),
  'minecraft:waxed_copper_block': uniform(192, 107, 79),
  'minecraft:waxed_exposed_copper': uniform(161, 125, 103),
  'minecraft:waxed_weathered_copper': uniform(109, 145, 107),
  'minecraft:waxed_oxidized_copper': uniform(82, 162, 132),
  'minecraft:amethyst_block': uniform(133, 97, 191),
  'minecraft:budding_amethyst': uniform(132, 96, 186),

  // === Bricks / Stone Bricks ===
  'minecraft:bricks': uniform(150, 97, 83),
  'minecraft:stone_bricks': uniform(122, 122, 122),
  'minecraft:mossy_stone_bricks': uniform(115, 121, 105),
  'minecraft:cracked_stone_bricks': uniform(118, 118, 118),
  'minecraft:chiseled_stone_bricks': uniform(120, 120, 120),
  'minecraft:infested_stone': uniform(128, 128, 128),
  'minecraft:infested_stone_bricks': uniform(122, 122, 122),
  'minecraft:infested_mossy_stone_bricks': uniform(115, 121, 105),
  'minecraft:infested_cracked_stone_bricks': uniform(118, 118, 118),
  'minecraft:infested_chiseled_stone_bricks': uniform(120, 120, 120),
  'minecraft:infested_deepslate': uniform(80, 80, 82),

  // === Nether Blocks ===
  'minecraft:netherrack': uniform(97, 38, 38),
  'minecraft:nether_bricks': uniform(44, 21, 26),
  'minecraft:red_nether_bricks': uniform(69, 7, 9),
  'minecraft:chiseled_nether_bricks': uniform(47, 24, 28),
  'minecraft:cracked_nether_bricks': uniform(40, 19, 23),
  'minecraft:soul_sand': uniform(81, 62, 50),
  'minecraft:basalt': uniform(72, 72, 78),
  'minecraft:smooth_basalt': uniform(72, 72, 72),
  'minecraft:polished_basalt': faced([88, 88, 90], [72, 72, 78], [88, 88, 90]),
  'minecraft:blackstone': uniform(42, 36, 41),
  'minecraft:polished_blackstone': uniform(53, 48, 56),
  'minecraft:polished_blackstone_bricks': uniform(48, 42, 49),
  'minecraft:cracked_polished_blackstone_bricks': uniform(44, 38, 45),
  'minecraft:chiseled_polished_blackstone': uniform(53, 48, 56),
  'minecraft:gilded_blackstone': uniform(55, 42, 38),
  'minecraft:glowstone': uniform(171, 131, 84),
  'minecraft:magma_block': uniform(142, 63, 31),
  'minecraft:nether_wart_block': uniform(114, 2, 2),
  'minecraft:warped_wart_block': uniform(22, 119, 121),
  'minecraft:crimson_nylium': faced([130, 31, 31], [97, 38, 38], [97, 38, 38]),
  'minecraft:warped_nylium': faced([43, 114, 101], [97, 38, 38], [97, 38, 38]),
  'minecraft:shroomlight': uniform(240, 146, 70),
  'minecraft:crying_obsidian': uniform(32, 10, 60),
  'minecraft:respawn_anchor': uniform(35, 12, 58),

  // === End Blocks ===
  'minecraft:end_stone': uniform(219, 222, 158),
  'minecraft:end_stone_bricks': uniform(218, 224, 162),
  'minecraft:purpur_block': uniform(170, 126, 170),
  'minecraft:purpur_pillar': uniform(172, 130, 172),
  'minecraft:chorus_plant': uniform(93, 57, 93),
  'minecraft:chorus_flower': uniform(152, 111, 152),

  // === Quartz ===
  'minecraft:quartz_block': uniform(236, 233, 226),
  'minecraft:chiseled_quartz_block': uniform(232, 228, 220),
  'minecraft:quartz_pillar': uniform(235, 230, 224),
  'minecraft:smooth_quartz': uniform(236, 233, 226),
  'minecraft:quartz_bricks': uniform(234, 230, 222),

  // === Prismarine ===
  'minecraft:prismarine': uniform(99, 156, 151),
  'minecraft:prismarine_bricks': uniform(99, 171, 158),
  'minecraft:dark_prismarine': uniform(51, 91, 75),
  'minecraft:sea_lantern': uniform(172, 199, 190),

  // === Obsidian ===
  'minecraft:obsidian': uniform(20, 18, 30),

  // === Ice ===
  'minecraft:ice': uniform(145, 183, 253),
  'minecraft:packed_ice': uniform(141, 180, 250),
  'minecraft:blue_ice': uniform(116, 167, 253),
  'minecraft:frosted_ice': uniform(155, 193, 253),

  // === Snow ===
  'minecraft:snow_block': uniform(249, 254, 254),
  'minecraft:snow': uniform(249, 254, 254),
  'minecraft:powder_snow': uniform(248, 253, 253),

  // === Wool (16 colors) ===
  'minecraft:white_wool': uniform(234, 236, 236),
  'minecraft:orange_wool': uniform(241, 118, 20),
  'minecraft:magenta_wool': uniform(189, 68, 179),
  'minecraft:light_blue_wool': uniform(58, 175, 217),
  'minecraft:yellow_wool': uniform(248, 199, 40),
  'minecraft:lime_wool': uniform(112, 185, 25),
  'minecraft:pink_wool': uniform(238, 141, 172),
  'minecraft:gray_wool': uniform(63, 68, 72),
  'minecraft:light_gray_wool': uniform(142, 142, 135),
  'minecraft:cyan_wool': uniform(21, 137, 145),
  'minecraft:purple_wool': uniform(121, 42, 173),
  'minecraft:blue_wool': uniform(53, 57, 157),
  'minecraft:brown_wool': uniform(114, 72, 41),
  'minecraft:green_wool': uniform(84, 109, 27),
  'minecraft:red_wool': uniform(160, 39, 34),
  'minecraft:black_wool': uniform(21, 21, 26),

  // === Terracotta (16 + unglazed) ===
  'minecraft:terracotta': uniform(152, 94, 67),
  'minecraft:white_terracotta': uniform(210, 178, 161),
  'minecraft:orange_terracotta': uniform(162, 84, 38),
  'minecraft:magenta_terracotta': uniform(150, 88, 109),
  'minecraft:light_blue_terracotta': uniform(113, 109, 138),
  'minecraft:yellow_terracotta': uniform(186, 133, 35),
  'minecraft:lime_terracotta': uniform(104, 118, 53),
  'minecraft:pink_terracotta': uniform(162, 78, 79),
  'minecraft:gray_terracotta': uniform(57, 42, 36),
  'minecraft:light_gray_terracotta': uniform(135, 107, 98),
  'minecraft:cyan_terracotta': uniform(87, 92, 92),
  'minecraft:purple_terracotta': uniform(118, 70, 86),
  'minecraft:blue_terracotta': uniform(74, 60, 91),
  'minecraft:brown_terracotta': uniform(77, 51, 36),
  'minecraft:green_terracotta': uniform(76, 83, 42),
  'minecraft:red_terracotta': uniform(143, 61, 47),
  'minecraft:black_terracotta': uniform(37, 23, 16),

  // === Glazed Terracotta (16 colors) ===
  'minecraft:white_glazed_terracotta': uniform(188, 212, 202),
  'minecraft:orange_glazed_terracotta': uniform(154, 147, 91),
  'minecraft:magenta_glazed_terracotta': uniform(208, 100, 192),
  'minecraft:light_blue_glazed_terracotta': uniform(94, 164, 208),
  'minecraft:yellow_glazed_terracotta': uniform(234, 192, 88),
  'minecraft:lime_glazed_terracotta': uniform(162, 198, 55),
  'minecraft:pink_glazed_terracotta': uniform(235, 154, 181),
  'minecraft:gray_glazed_terracotta': uniform(83, 100, 100),
  'minecraft:light_gray_glazed_terracotta': uniform(144, 166, 167),
  'minecraft:cyan_glazed_terracotta': uniform(52, 118, 125),
  'minecraft:purple_glazed_terracotta': uniform(109, 48, 152),
  'minecraft:blue_glazed_terracotta': uniform(47, 65, 139),
  'minecraft:brown_glazed_terracotta': uniform(120, 106, 86),
  'minecraft:green_glazed_terracotta': uniform(117, 142, 67),
  'minecraft:red_glazed_terracotta': uniform(181, 59, 53),
  'minecraft:black_glazed_terracotta': uniform(67, 30, 32),

  // === Concrete (16 colors) ===
  'minecraft:white_concrete': uniform(207, 213, 214),
  'minecraft:orange_concrete': uniform(224, 97, 1),
  'minecraft:magenta_concrete': uniform(169, 48, 159),
  'minecraft:light_blue_concrete': uniform(36, 137, 199),
  'minecraft:yellow_concrete': uniform(241, 175, 21),
  'minecraft:lime_concrete': uniform(94, 169, 24),
  'minecraft:pink_concrete': uniform(214, 101, 143),
  'minecraft:gray_concrete': uniform(55, 58, 62),
  'minecraft:light_gray_concrete': uniform(125, 125, 115),
  'minecraft:cyan_concrete': uniform(21, 119, 136),
  'minecraft:purple_concrete': uniform(100, 32, 156),
  'minecraft:blue_concrete': uniform(45, 47, 143),
  'minecraft:brown_concrete': uniform(96, 60, 32),
  'minecraft:green_concrete': uniform(73, 91, 36),
  'minecraft:red_concrete': uniform(142, 33, 33),
  'minecraft:black_concrete': uniform(8, 10, 15),

  // === Concrete Powder (16 colors) ===
  'minecraft:white_concrete_powder': uniform(226, 227, 228),
  'minecraft:orange_concrete_powder': uniform(227, 132, 31),
  'minecraft:magenta_concrete_powder': uniform(192, 83, 184),
  'minecraft:light_blue_concrete_powder': uniform(74, 180, 213),
  'minecraft:yellow_concrete_powder': uniform(232, 199, 54),
  'minecraft:lime_concrete_powder': uniform(125, 189, 41),
  'minecraft:pink_concrete_powder': uniform(229, 153, 181),
  'minecraft:gray_concrete_powder': uniform(77, 81, 85),
  'minecraft:light_gray_concrete_powder': uniform(155, 155, 148),
  'minecraft:cyan_concrete_powder': uniform(36, 148, 157),
  'minecraft:purple_concrete_powder': uniform(131, 55, 177),
  'minecraft:blue_concrete_powder': uniform(70, 73, 166),
  'minecraft:brown_concrete_powder': uniform(126, 85, 53),
  'minecraft:green_concrete_powder': uniform(97, 119, 45),
  'minecraft:red_concrete_powder': uniform(168, 54, 51),
  'minecraft:black_concrete_powder': uniform(25, 27, 32),

  // === Stained Glass (16 colors) ===
  'minecraft:white_stained_glass': uniform(255, 255, 255),
  'minecraft:orange_stained_glass': uniform(216, 127, 51),
  'minecraft:magenta_stained_glass': uniform(178, 76, 216),
  'minecraft:light_blue_stained_glass': uniform(102, 153, 216),
  'minecraft:yellow_stained_glass': uniform(229, 229, 51),
  'minecraft:lime_stained_glass': uniform(127, 204, 25),
  'minecraft:pink_stained_glass': uniform(242, 127, 165),
  'minecraft:gray_stained_glass': uniform(76, 76, 76),
  'minecraft:light_gray_stained_glass': uniform(153, 153, 153),
  'minecraft:cyan_stained_glass': uniform(76, 127, 153),
  'minecraft:purple_stained_glass': uniform(127, 63, 178),
  'minecraft:blue_stained_glass': uniform(51, 76, 178),
  'minecraft:brown_stained_glass': uniform(102, 76, 51),
  'minecraft:green_stained_glass': uniform(102, 127, 51),
  'minecraft:red_stained_glass': uniform(153, 51, 51),
  'minecraft:black_stained_glass': uniform(25, 25, 25),

  // === Glass ===
  'minecraft:glass': uniform(200, 220, 230),
  'minecraft:glass_pane': uniform(200, 220, 230),
  'minecraft:tinted_glass': uniform(44, 38, 50),

  // === Stained Glass Panes (16 colors) ===
  'minecraft:white_stained_glass_pane': uniform(255, 255, 255),
  'minecraft:orange_stained_glass_pane': uniform(216, 127, 51),
  'minecraft:magenta_stained_glass_pane': uniform(178, 76, 216),
  'minecraft:light_blue_stained_glass_pane': uniform(102, 153, 216),
  'minecraft:yellow_stained_glass_pane': uniform(229, 229, 51),
  'minecraft:lime_stained_glass_pane': uniform(127, 204, 25),
  'minecraft:pink_stained_glass_pane': uniform(242, 127, 165),
  'minecraft:gray_stained_glass_pane': uniform(76, 76, 76),
  'minecraft:light_gray_stained_glass_pane': uniform(153, 153, 153),
  'minecraft:cyan_stained_glass_pane': uniform(76, 127, 153),
  'minecraft:purple_stained_glass_pane': uniform(127, 63, 178),
  'minecraft:blue_stained_glass_pane': uniform(51, 76, 178),
  'minecraft:brown_stained_glass_pane': uniform(102, 76, 51),
  'minecraft:green_stained_glass_pane': uniform(102, 127, 51),
  'minecraft:red_stained_glass_pane': uniform(153, 51, 51),
  'minecraft:black_stained_glass_pane': uniform(25, 25, 25),

  // === Carpet (16 colors) ===
  'minecraft:white_carpet': uniform(234, 236, 236),
  'minecraft:orange_carpet': uniform(241, 118, 20),
  'minecraft:magenta_carpet': uniform(189, 68, 179),
  'minecraft:light_blue_carpet': uniform(58, 175, 217),
  'minecraft:yellow_carpet': uniform(248, 199, 40),
  'minecraft:lime_carpet': uniform(112, 185, 25),
  'minecraft:pink_carpet': uniform(238, 141, 172),
  'minecraft:gray_carpet': uniform(63, 68, 72),
  'minecraft:light_gray_carpet': uniform(142, 142, 135),
  'minecraft:cyan_carpet': uniform(21, 137, 145),
  'minecraft:purple_carpet': uniform(121, 42, 173),
  'minecraft:blue_carpet': uniform(53, 57, 157),
  'minecraft:brown_carpet': uniform(114, 72, 41),
  'minecraft:green_carpet': uniform(84, 109, 27),
  'minecraft:red_carpet': uniform(160, 39, 34),
  'minecraft:black_carpet': uniform(21, 21, 26),
  'minecraft:moss_carpet': uniform(89, 109, 45),

  // === Beds (16 colors - simplified) ===
  'minecraft:white_bed': uniform(234, 236, 236),
  'minecraft:orange_bed': uniform(241, 118, 20),
  'minecraft:magenta_bed': uniform(189, 68, 179),
  'minecraft:light_blue_bed': uniform(58, 175, 217),
  'minecraft:yellow_bed': uniform(248, 199, 40),
  'minecraft:lime_bed': uniform(112, 185, 25),
  'minecraft:pink_bed': uniform(238, 141, 172),
  'minecraft:gray_bed': uniform(63, 68, 72),
  'minecraft:light_gray_bed': uniform(142, 142, 135),
  'minecraft:cyan_bed': uniform(21, 137, 145),
  'minecraft:purple_bed': uniform(121, 42, 173),
  'minecraft:blue_bed': uniform(53, 57, 157),
  'minecraft:brown_bed': uniform(114, 72, 41),
  'minecraft:green_bed': uniform(84, 109, 27),
  'minecraft:red_bed': uniform(160, 39, 34),
  'minecraft:black_bed': uniform(21, 21, 26),

  // === Candles (16 + plain) ===
  'minecraft:candle': uniform(213, 186, 140),
  'minecraft:white_candle': uniform(215, 218, 210),
  'minecraft:orange_candle': uniform(215, 125, 40),
  'minecraft:magenta_candle': uniform(173, 82, 162),
  'minecraft:light_blue_candle': uniform(80, 160, 200),
  'minecraft:yellow_candle': uniform(212, 185, 55),
  'minecraft:lime_candle': uniform(108, 168, 42),
  'minecraft:pink_candle': uniform(222, 130, 157),
  'minecraft:gray_candle': uniform(75, 75, 80),
  'minecraft:light_gray_candle': uniform(135, 135, 128),
  'minecraft:cyan_candle': uniform(38, 125, 132),
  'minecraft:purple_candle': uniform(113, 52, 158),
  'minecraft:blue_candle': uniform(56, 60, 145),
  'minecraft:brown_candle': uniform(107, 72, 44),
  'minecraft:green_candle': uniform(80, 100, 36),
  'minecraft:red_candle': uniform(150, 48, 42),
  'minecraft:black_candle': uniform(30, 28, 32),

  // === Stairs ===
  'minecraft:oak_stairs': uniform(162, 131, 79),
  'minecraft:spruce_stairs': uniform(115, 85, 49),
  'minecraft:birch_stairs': uniform(196, 179, 123),
  'minecraft:jungle_stairs': uniform(160, 115, 80),
  'minecraft:acacia_stairs': uniform(168, 90, 50),
  'minecraft:dark_oak_stairs': uniform(60, 46, 26),
  'minecraft:cherry_stairs': uniform(226, 178, 165),
  'minecraft:mangrove_stairs': uniform(117, 54, 48),
  'minecraft:bamboo_stairs': uniform(194, 175, 82),
  'minecraft:bamboo_mosaic_stairs': uniform(190, 170, 78),
  'minecraft:crimson_stairs': uniform(101, 48, 70),
  'minecraft:warped_stairs': uniform(43, 105, 99),
  'minecraft:stone_stairs': uniform(128, 128, 128),
  'minecraft:cobblestone_stairs': uniform(100, 100, 100),
  'minecraft:mossy_cobblestone_stairs': uniform(90, 108, 90),
  'minecraft:stone_brick_stairs': uniform(122, 122, 122),
  'minecraft:mossy_stone_brick_stairs': uniform(115, 121, 105),
  'minecraft:brick_stairs': uniform(150, 97, 83),
  'minecraft:sandstone_stairs': uniform(216, 203, 155),
  'minecraft:smooth_sandstone_stairs': uniform(223, 214, 170),
  'minecraft:red_sandstone_stairs': uniform(186, 99, 29),
  'minecraft:smooth_red_sandstone_stairs': uniform(181, 97, 31),
  'minecraft:quartz_stairs': uniform(236, 233, 226),
  'minecraft:smooth_quartz_stairs': uniform(236, 233, 226),
  'minecraft:nether_brick_stairs': uniform(44, 21, 26),
  'minecraft:red_nether_brick_stairs': uniform(69, 7, 9),
  'minecraft:prismarine_stairs': uniform(99, 156, 151),
  'minecraft:prismarine_brick_stairs': uniform(99, 171, 158),
  'minecraft:dark_prismarine_stairs': uniform(51, 91, 75),
  'minecraft:granite_stairs': uniform(153, 114, 99),
  'minecraft:polished_granite_stairs': uniform(154, 106, 89),
  'minecraft:diorite_stairs': uniform(188, 188, 188),
  'minecraft:polished_diorite_stairs': uniform(192, 192, 192),
  'minecraft:andesite_stairs': uniform(136, 136, 136),
  'minecraft:polished_andesite_stairs': uniform(132, 135, 132),
  'minecraft:deepslate_brick_stairs': uniform(70, 70, 72),
  'minecraft:deepslate_tile_stairs': uniform(54, 54, 56),
  'minecraft:cobbled_deepslate_stairs': uniform(77, 77, 80),
  'minecraft:polished_deepslate_stairs': uniform(72, 72, 74),
  'minecraft:blackstone_stairs': uniform(42, 36, 41),
  'minecraft:polished_blackstone_stairs': uniform(53, 48, 56),
  'minecraft:polished_blackstone_brick_stairs': uniform(48, 42, 49),
  'minecraft:end_stone_brick_stairs': uniform(218, 224, 162),
  'minecraft:purpur_stairs': uniform(170, 126, 170),
  'minecraft:cut_copper_stairs': uniform(191, 106, 80),
  'minecraft:exposed_cut_copper_stairs': uniform(154, 121, 101),
  'minecraft:weathered_cut_copper_stairs': uniform(109, 145, 107),
  'minecraft:oxidized_cut_copper_stairs': uniform(79, 153, 126),
  'minecraft:mud_brick_stairs': uniform(137, 104, 79),
  'minecraft:tuff_stairs': uniform(108, 109, 102),
  'minecraft:polished_tuff_stairs': uniform(110, 111, 104),
  'minecraft:tuff_brick_stairs': uniform(106, 107, 100),

  // === Slabs (same colors as full blocks) ===
  'minecraft:oak_slab': uniform(162, 131, 79),
  'minecraft:spruce_slab': uniform(115, 85, 49),
  'minecraft:birch_slab': uniform(196, 179, 123),
  'minecraft:jungle_slab': uniform(160, 115, 80),
  'minecraft:acacia_slab': uniform(168, 90, 50),
  'minecraft:dark_oak_slab': uniform(60, 46, 26),
  'minecraft:cherry_slab': uniform(226, 178, 165),
  'minecraft:mangrove_slab': uniform(117, 54, 48),
  'minecraft:bamboo_slab': uniform(194, 175, 82),
  'minecraft:bamboo_mosaic_slab': uniform(190, 170, 78),
  'minecraft:crimson_slab': uniform(101, 48, 70),
  'minecraft:warped_slab': uniform(43, 105, 99),
  'minecraft:cobblestone_slab': uniform(100, 100, 100),
  'minecraft:mossy_cobblestone_slab': uniform(90, 108, 90),
  'minecraft:stone_brick_slab': uniform(122, 122, 122),
  'minecraft:mossy_stone_brick_slab': uniform(115, 121, 105),
  'minecraft:brick_slab': uniform(150, 97, 83),
  'minecraft:sandstone_slab': uniform(216, 203, 155),
  'minecraft:smooth_sandstone_slab': uniform(223, 214, 170),
  'minecraft:red_sandstone_slab': uniform(186, 99, 29),
  'minecraft:smooth_red_sandstone_slab': uniform(181, 97, 31),
  'minecraft:quartz_slab': uniform(236, 233, 226),
  'minecraft:smooth_quartz_slab': uniform(236, 233, 226),
  'minecraft:nether_brick_slab': uniform(44, 21, 26),
  'minecraft:red_nether_brick_slab': uniform(69, 7, 9),
  'minecraft:prismarine_slab': uniform(99, 156, 151),
  'minecraft:prismarine_brick_slab': uniform(99, 171, 158),
  'minecraft:dark_prismarine_slab': uniform(51, 91, 75),
  'minecraft:cut_copper_slab': uniform(191, 106, 80),
  'minecraft:deepslate_brick_slab': uniform(70, 70, 72),
  'minecraft:deepslate_tile_slab': uniform(54, 54, 56),
  'minecraft:cobbled_deepslate_slab': uniform(77, 77, 80),
  'minecraft:polished_deepslate_slab': uniform(72, 72, 74),
  'minecraft:mud_brick_slab': uniform(137, 104, 79),

  // === Fences ===
  'minecraft:oak_fence': uniform(162, 131, 79),
  'minecraft:spruce_fence': uniform(115, 85, 49),
  'minecraft:birch_fence': uniform(196, 179, 123),
  'minecraft:jungle_fence': uniform(160, 115, 80),
  'minecraft:acacia_fence': uniform(168, 90, 50),
  'minecraft:dark_oak_fence': uniform(60, 46, 26),
  'minecraft:cherry_fence': uniform(226, 178, 165),
  'minecraft:mangrove_fence': uniform(117, 54, 48),
  'minecraft:bamboo_fence': uniform(194, 175, 82),
  'minecraft:crimson_fence': uniform(101, 48, 70),
  'minecraft:warped_fence': uniform(43, 105, 99),
  'minecraft:nether_brick_fence': uniform(44, 21, 26),

  // === Walls ===
  'minecraft:cobblestone_wall': uniform(100, 100, 100),
  'minecraft:mossy_cobblestone_wall': uniform(90, 108, 90),
  'minecraft:stone_brick_wall': uniform(122, 122, 122),
  'minecraft:mossy_stone_brick_wall': uniform(115, 121, 105),
  'minecraft:brick_wall': uniform(150, 97, 83),
  'minecraft:sandstone_wall': uniform(216, 203, 155),
  'minecraft:red_sandstone_wall': uniform(186, 99, 29),
  'minecraft:nether_brick_wall': uniform(44, 21, 26),
  'minecraft:red_nether_brick_wall': uniform(69, 7, 9),
  'minecraft:granite_wall': uniform(153, 114, 99),
  'minecraft:diorite_wall': uniform(188, 188, 188),
  'minecraft:andesite_wall': uniform(136, 136, 136),
  'minecraft:prismarine_wall': uniform(99, 156, 151),
  'minecraft:end_stone_brick_wall': uniform(218, 224, 162),
  'minecraft:blackstone_wall': uniform(42, 36, 41),
  'minecraft:polished_blackstone_wall': uniform(53, 48, 56),
  'minecraft:polished_blackstone_brick_wall': uniform(48, 42, 49),
  'minecraft:deepslate_brick_wall': uniform(70, 70, 72),
  'minecraft:deepslate_tile_wall': uniform(54, 54, 56),
  'minecraft:cobbled_deepslate_wall': uniform(77, 77, 80),
  'minecraft:polished_deepslate_wall': uniform(72, 72, 74),
  'minecraft:mud_brick_wall': uniform(137, 104, 79),
  'minecraft:tuff_wall': uniform(108, 109, 102),
  'minecraft:polished_tuff_wall': uniform(110, 111, 104),
  'minecraft:tuff_brick_wall': uniform(106, 107, 100),

  // === Doors ===
  'minecraft:oak_door': uniform(162, 131, 79),
  'minecraft:spruce_door': uniform(115, 85, 49),
  'minecraft:birch_door': uniform(196, 179, 123),
  'minecraft:jungle_door': uniform(160, 115, 80),
  'minecraft:acacia_door': uniform(168, 90, 50),
  'minecraft:dark_oak_door': uniform(60, 46, 26),
  'minecraft:cherry_door': uniform(226, 178, 165),
  'minecraft:mangrove_door': uniform(117, 54, 48),
  'minecraft:bamboo_door': uniform(194, 175, 82),
  'minecraft:crimson_door': uniform(101, 48, 70),
  'minecraft:warped_door': uniform(43, 105, 99),
  'minecraft:iron_door': uniform(193, 193, 193),
  'minecraft:copper_door': uniform(192, 107, 79),
  'minecraft:exposed_copper_door': uniform(161, 125, 103),
  'minecraft:weathered_copper_door': uniform(109, 145, 107),
  'minecraft:oxidized_copper_door': uniform(82, 162, 132),

  // === Trapdoors ===
  'minecraft:oak_trapdoor': uniform(152, 121, 69),
  'minecraft:spruce_trapdoor': uniform(105, 75, 39),
  'minecraft:birch_trapdoor': uniform(186, 169, 113),
  'minecraft:jungle_trapdoor': uniform(150, 105, 70),
  'minecraft:acacia_trapdoor': uniform(158, 80, 40),
  'minecraft:dark_oak_trapdoor': uniform(50, 36, 16),
  'minecraft:cherry_trapdoor': uniform(216, 168, 155),
  'minecraft:mangrove_trapdoor': uniform(107, 44, 38),
  'minecraft:bamboo_trapdoor': uniform(184, 165, 72),
  'minecraft:crimson_trapdoor': uniform(91, 38, 60),
  'minecraft:warped_trapdoor': uniform(33, 95, 89),
  'minecraft:iron_trapdoor': uniform(193, 193, 193),
  'minecraft:copper_trapdoor': uniform(192, 107, 79),

  // === Torch / Light ===
  'minecraft:torch': faced([255, 200, 100], [255, 200, 100], [100, 80, 50]),
  'minecraft:wall_torch': faced([255, 200, 100], [255, 200, 100], [100, 80, 50]),
  'minecraft:soul_torch': faced([100, 200, 200], [100, 200, 200], [100, 80, 50]),
  'minecraft:soul_wall_torch': faced([100, 200, 200], [100, 200, 200], [100, 80, 50]),
  'minecraft:lantern': uniform(60, 60, 60),
  'minecraft:soul_lantern': uniform(50, 80, 80),
  'minecraft:redstone_torch': uniform(190, 50, 30),
  'minecraft:redstone_wall_torch': uniform(190, 50, 30),
  'minecraft:end_rod': uniform(230, 220, 210),

  // === Flowers / Plants ===
  'minecraft:grass': uniform(100, 180, 60),
  'minecraft:short_grass': uniform(100, 180, 60),
  'minecraft:tall_grass': uniform(90, 160, 50),
  'minecraft:fern': uniform(70, 140, 50),
  'minecraft:large_fern': uniform(65, 135, 45),
  'minecraft:dandelion': uniform(255, 220, 50),
  'minecraft:poppy': uniform(200, 50, 50),
  'minecraft:blue_orchid': uniform(50, 150, 200),
  'minecraft:allium': uniform(180, 100, 200),
  'minecraft:azure_bluet': uniform(220, 230, 240),
  'minecraft:red_tulip': uniform(220, 60, 60),
  'minecraft:orange_tulip': uniform(240, 140, 50),
  'minecraft:white_tulip': uniform(240, 240, 240),
  'minecraft:pink_tulip': uniform(240, 180, 200),
  'minecraft:oxeye_daisy': uniform(240, 240, 200),
  'minecraft:cornflower': uniform(70, 100, 200),
  'minecraft:lily_of_the_valley': uniform(230, 240, 230),
  'minecraft:wither_rose': uniform(30, 30, 30),
  'minecraft:torchflower': uniform(230, 140, 50),
  'minecraft:pitcher_plant': uniform(70, 145, 130),
  'minecraft:sunflower': uniform(255, 200, 50),
  'minecraft:lilac': uniform(200, 150, 200),
  'minecraft:rose_bush': uniform(180, 50, 60),
  'minecraft:peony': uniform(240, 180, 200),
  'minecraft:dead_bush': uniform(120, 90, 60),
  'minecraft:sweet_berry_bush': uniform(60, 100, 50),
  'minecraft:cave_vines': uniform(80, 120, 40),
  'minecraft:cave_vines_plant': uniform(80, 120, 40),
  'minecraft:glow_lichen': uniform(106, 131, 100),
  'minecraft:spore_blossom': uniform(200, 100, 150),
  'minecraft:hanging_roots': uniform(130, 105, 75),
  'minecraft:moss_block': uniform(89, 109, 45),
  'minecraft:vine': uniform(50, 110, 50),
  'minecraft:lily_pad': uniform(33, 99, 20),
  'minecraft:seagrass': uniform(40, 100, 50),
  'minecraft:tall_seagrass': uniform(38, 95, 48),
  'minecraft:kelp': uniform(60, 110, 50),
  'minecraft:kelp_plant': uniform(60, 110, 50),
  'minecraft:sugar_cane': uniform(140, 190, 100),
  'minecraft:bamboo': uniform(96, 150, 36),
  'minecraft:cactus': uniform(70, 120, 30),
  'minecraft:nether_sprouts': uniform(20, 120, 110),
  'minecraft:twisting_vines': uniform(20, 130, 120),
  'minecraft:twisting_vines_plant': uniform(20, 130, 120),
  'minecraft:weeping_vines': uniform(120, 20, 15),
  'minecraft:weeping_vines_plant': uniform(120, 20, 15),
  'minecraft:crimson_roots': uniform(126, 8, 41),
  'minecraft:warped_roots': uniform(20, 138, 124),
  'minecraft:crimson_fungus': uniform(143, 38, 29),
  'minecraft:warped_fungus': uniform(74, 154, 125),

  // === Saplings ===
  'minecraft:oak_sapling': uniform(60, 140, 50),
  'minecraft:spruce_sapling': uniform(40, 80, 50),
  'minecraft:birch_sapling': uniform(100, 160, 80),
  'minecraft:jungle_sapling': uniform(50, 120, 40),
  'minecraft:acacia_sapling': uniform(80, 130, 50),
  'minecraft:dark_oak_sapling': uniform(40, 80, 40),
  'minecraft:cherry_sapling': uniform(240, 180, 200),
  'minecraft:mangrove_propagule': uniform(60, 100, 50),

  // === Mushrooms ===
  'minecraft:brown_mushroom': uniform(153, 114, 78),
  'minecraft:red_mushroom': uniform(207, 38, 28),
  'minecraft:brown_mushroom_block': uniform(148, 109, 75),
  'minecraft:red_mushroom_block': uniform(200, 46, 35),
  'minecraft:mushroom_stem': uniform(203, 196, 185),

  // === Crops ===
  'minecraft:wheat': uniform(186, 166, 58),
  'minecraft:carrots': uniform(230, 143, 38),
  'minecraft:potatoes': uniform(200, 180, 70),
  'minecraft:beetroots': uniform(120, 50, 40),
  'minecraft:melon': uniform(115, 145, 42),
  'minecraft:pumpkin': faced([138, 100, 26], [196, 122, 23], [138, 100, 26]),
  'minecraft:carved_pumpkin': faced([138, 100, 26], [196, 122, 23], [138, 100, 26]),
  'minecraft:jack_o_lantern': faced([138, 100, 26], [196, 122, 23], [138, 100, 26]),
  'minecraft:melon_stem': uniform(110, 135, 40),
  'minecraft:pumpkin_stem': uniform(120, 130, 45),
  'minecraft:cocoa': uniform(120, 70, 30),
  'minecraft:nether_wart': uniform(114, 2, 2),

  // === Utility / Functional Blocks ===
  'minecraft:crafting_table': faced([163, 105, 54], [136, 85, 44], [163, 105, 54]),
  'minecraft:furnace': faced([128, 128, 128], [115, 115, 115], [128, 128, 128]),
  'minecraft:blast_furnace': faced([90, 90, 90], [85, 85, 85], [90, 90, 90]),
  'minecraft:smoker': faced([100, 90, 80], [85, 75, 65], [100, 90, 80]),
  'minecraft:smithing_table': faced([55, 55, 60], [65, 65, 70], [55, 55, 60]),
  'minecraft:cartography_table': faced([95, 85, 70], [105, 95, 80], [95, 85, 70]),
  'minecraft:fletching_table': faced([180, 165, 120], [180, 165, 120], [180, 165, 120]),
  'minecraft:loom': faced([155, 135, 105], [148, 128, 98], [155, 135, 105]),
  'minecraft:stonecutter': uniform(128, 128, 128),
  'minecraft:grindstone': uniform(140, 140, 140),
  'minecraft:anvil': uniform(72, 72, 72),
  'minecraft:chipped_anvil': uniform(68, 68, 68),
  'minecraft:damaged_anvil': uniform(64, 64, 64),
  'minecraft:enchanting_table': faced([140, 40, 40], [47, 70, 70], [20, 18, 30]),
  'minecraft:bookshelf': faced([162, 131, 79], [130, 108, 73], [162, 131, 79]),
  'minecraft:chiseled_bookshelf': faced([162, 131, 79], [130, 108, 73], [162, 131, 79]),
  'minecraft:lectern': uniform(162, 131, 79),
  'minecraft:chest': uniform(134, 102, 39),
  'minecraft:trapped_chest': uniform(134, 102, 39),
  'minecraft:ender_chest': uniform(25, 40, 40),
  'minecraft:barrel': faced([142, 110, 65], [115, 85, 50], [142, 110, 65]),
  'minecraft:brewing_stand': uniform(120, 100, 80),
  'minecraft:cauldron': uniform(60, 60, 60),
  'minecraft:water_cauldron': uniform(60, 60, 60),
  'minecraft:lava_cauldron': uniform(60, 60, 60),
  'minecraft:composter': uniform(101, 74, 34),
  'minecraft:hopper': uniform(60, 60, 60),
  'minecraft:bell': uniform(200, 175, 65),
  'minecraft:campfire': uniform(145, 110, 55),
  'minecraft:soul_campfire': uniform(50, 120, 130),
  'minecraft:beehive': faced([180, 155, 80], [165, 140, 72], [180, 155, 80]),
  'minecraft:bee_nest': faced([200, 170, 70], [190, 155, 62], [200, 170, 70]),
  'minecraft:decorated_pot': uniform(165, 110, 80),
  'minecraft:flower_pot': uniform(128, 68, 47),
  'minecraft:armor_stand': uniform(130, 100, 60),

  // === Redstone ===
  'minecraft:redstone_wire': uniform(171, 27, 9),
  'minecraft:redstone_lamp': uniform(100, 60, 30),
  'minecraft:repeater': uniform(160, 160, 160),
  'minecraft:comparator': uniform(160, 160, 160),
  'minecraft:piston': faced([162, 131, 79], [128, 128, 128], [128, 128, 128]),
  'minecraft:sticky_piston': faced([110, 170, 80], [128, 128, 128], [128, 128, 128]),
  'minecraft:observer': uniform(100, 100, 100),
  'minecraft:dropper': uniform(115, 115, 115),
  'minecraft:dispenser': uniform(115, 115, 115),
  'minecraft:note_block': uniform(100, 60, 40),
  'minecraft:jukebox': faced([110, 70, 50], [100, 60, 40], [110, 70, 50]),
  'minecraft:target': uniform(230, 200, 180),
  'minecraft:daylight_detector': faced([200, 190, 160], [155, 140, 100], [155, 140, 100]),
  'minecraft:tripwire_hook': uniform(140, 140, 140),
  'minecraft:lever': uniform(128, 128, 128),
  'minecraft:tnt': faced([170, 170, 170], [180, 60, 50], [170, 170, 170]),
  'minecraft:lightning_rod': uniform(192, 107, 79),

  // === Buttons ===
  'minecraft:oak_button': uniform(162, 131, 79),
  'minecraft:spruce_button': uniform(115, 85, 49),
  'minecraft:birch_button': uniform(196, 179, 123),
  'minecraft:jungle_button': uniform(160, 115, 80),
  'minecraft:acacia_button': uniform(168, 90, 50),
  'minecraft:dark_oak_button': uniform(60, 46, 26),
  'minecraft:cherry_button': uniform(226, 178, 165),
  'minecraft:mangrove_button': uniform(117, 54, 48),
  'minecraft:bamboo_button': uniform(194, 175, 82),
  'minecraft:crimson_button': uniform(101, 48, 70),
  'minecraft:warped_button': uniform(43, 105, 99),
  'minecraft:stone_button': uniform(128, 128, 128),
  'minecraft:polished_blackstone_button': uniform(53, 48, 56),

  // === Pressure Plates ===
  'minecraft:oak_pressure_plate': uniform(162, 131, 79),
  'minecraft:spruce_pressure_plate': uniform(115, 85, 49),
  'minecraft:birch_pressure_plate': uniform(196, 179, 123),
  'minecraft:jungle_pressure_plate': uniform(160, 115, 80),
  'minecraft:acacia_pressure_plate': uniform(168, 90, 50),
  'minecraft:dark_oak_pressure_plate': uniform(60, 46, 26),
  'minecraft:cherry_pressure_plate': uniform(226, 178, 165),
  'minecraft:mangrove_pressure_plate': uniform(117, 54, 48),
  'minecraft:bamboo_pressure_plate': uniform(194, 175, 82),
  'minecraft:crimson_pressure_plate': uniform(101, 48, 70),
  'minecraft:warped_pressure_plate': uniform(43, 105, 99),
  'minecraft:stone_pressure_plate': uniform(128, 128, 128),
  'minecraft:polished_blackstone_pressure_plate': uniform(53, 48, 56),
  'minecraft:light_weighted_pressure_plate': uniform(249, 236, 79),
  'minecraft:heavy_weighted_pressure_plate': uniform(220, 220, 220),

  // === Signs ===
  'minecraft:oak_sign': uniform(162, 131, 79),
  'minecraft:spruce_sign': uniform(115, 85, 49),
  'minecraft:birch_sign': uniform(196, 179, 123),
  'minecraft:jungle_sign': uniform(160, 115, 80),
  'minecraft:acacia_sign': uniform(168, 90, 50),
  'minecraft:dark_oak_sign': uniform(60, 46, 26),
  'minecraft:cherry_sign': uniform(226, 178, 165),
  'minecraft:mangrove_sign': uniform(117, 54, 48),
  'minecraft:bamboo_sign': uniform(194, 175, 82),
  'minecraft:crimson_sign': uniform(101, 48, 70),
  'minecraft:warped_sign': uniform(43, 105, 99),
  'minecraft:oak_hanging_sign': uniform(162, 131, 79),
  'minecraft:spruce_hanging_sign': uniform(115, 85, 49),
  'minecraft:birch_hanging_sign': uniform(196, 179, 123),

  // === Rails ===
  'minecraft:rail': uniform(140, 120, 100),
  'minecraft:powered_rail': uniform(160, 130, 50),
  'minecraft:detector_rail': uniform(130, 110, 100),
  'minecraft:activator_rail': uniform(140, 80, 70),

  // === Ladder / Scaffolding ===
  'minecraft:ladder': uniform(150, 120, 70),
  'minecraft:scaffolding': uniform(185, 170, 100),

  // === Misc blocks ===
  'minecraft:bedrock': uniform(85, 85, 85),
  'minecraft:sponge': uniform(195, 192, 74),
  'minecraft:wet_sponge': uniform(171, 181, 70),
  'minecraft:cobweb': uniform(228, 233, 234),
  'minecraft:hay_block': faced([186, 158, 49], [166, 140, 42], [186, 158, 49]),
  'minecraft:slime_block': uniform(112, 190, 83),
  'minecraft:honey_block': uniform(250, 174, 55),
  'minecraft:honeycomb_block': uniform(229, 148, 29),
  'minecraft:bone_block': faced([229, 225, 207], [210, 206, 178], [229, 225, 207]),
  'minecraft:dried_kelp_block': uniform(51, 58, 36),
  'minecraft:cake': faced([243, 230, 200], [240, 215, 180], [240, 200, 150]),
  'minecraft:sculk': uniform(12, 37, 42),
  'minecraft:sculk_sensor': uniform(30, 70, 75),
  'minecraft:sculk_catalyst': uniform(18, 50, 55),
  'minecraft:sculk_shrieker': uniform(25, 65, 70),
  'minecraft:sculk_vein': uniform(15, 40, 45),
  'minecraft:reinforced_deepslate': uniform(80, 80, 82),
  'minecraft:ochre_froglight': uniform(248, 225, 145),
  'minecraft:verdant_froglight': uniform(200, 240, 195),
  'minecraft:pearlescent_froglight': uniform(228, 198, 215),

  // === Banners (16 colors) ===
  'minecraft:white_banner': uniform(234, 236, 236),
  'minecraft:orange_banner': uniform(241, 118, 20),
  'minecraft:magenta_banner': uniform(189, 68, 179),
  'minecraft:light_blue_banner': uniform(58, 175, 217),
  'minecraft:yellow_banner': uniform(248, 199, 40),
  'minecraft:lime_banner': uniform(112, 185, 25),
  'minecraft:pink_banner': uniform(238, 141, 172),
  'minecraft:gray_banner': uniform(63, 68, 72),
  'minecraft:light_gray_banner': uniform(142, 142, 135),
  'minecraft:cyan_banner': uniform(21, 137, 145),
  'minecraft:purple_banner': uniform(121, 42, 173),
  'minecraft:blue_banner': uniform(53, 57, 157),
  'minecraft:brown_banner': uniform(114, 72, 41),
  'minecraft:green_banner': uniform(84, 109, 27),
  'minecraft:red_banner': uniform(160, 39, 34),
  'minecraft:black_banner': uniform(21, 21, 26),

  // === Shulker Boxes (16 colors + plain) ===
  'minecraft:shulker_box': uniform(140, 100, 140),
  'minecraft:white_shulker_box': uniform(216, 221, 221),
  'minecraft:orange_shulker_box': uniform(234, 106, 8),
  'minecraft:magenta_shulker_box': uniform(174, 54, 164),
  'minecraft:light_blue_shulker_box': uniform(50, 166, 210),
  'minecraft:yellow_shulker_box': uniform(242, 190, 28),
  'minecraft:lime_shulker_box': uniform(100, 175, 14),
  'minecraft:pink_shulker_box': uniform(231, 130, 162),
  'minecraft:gray_shulker_box': uniform(55, 60, 64),
  'minecraft:light_gray_shulker_box': uniform(133, 133, 126),
  'minecraft:cyan_shulker_box': uniform(14, 128, 137),
  'minecraft:purple_shulker_box': uniform(112, 34, 164),
  'minecraft:blue_shulker_box': uniform(44, 48, 148),
  'minecraft:brown_shulker_box': uniform(106, 64, 34),
  'minecraft:green_shulker_box': uniform(76, 100, 20),
  'minecraft:red_shulker_box': uniform(152, 32, 26),
  'minecraft:black_shulker_box': uniform(14, 14, 18),

  // === Fluids (for rendering in sealed structures) ===
  'minecraft:water': uniform(44, 89, 206),
  'minecraft:lava': uniform(207, 92, 15),

  // === Amethyst ===
  'minecraft:small_amethyst_bud': uniform(140, 105, 195),
  'minecraft:medium_amethyst_bud': uniform(140, 105, 195),
  'minecraft:large_amethyst_bud': uniform(140, 105, 195),
  'minecraft:amethyst_cluster': uniform(160, 120, 210),

  // === Pointed Dripstone ===
  'minecraft:pointed_dripstone': uniform(134, 107, 92),

  // === Heads / Skulls ===
  'minecraft:skeleton_skull': uniform(200, 200, 200),
  'minecraft:wither_skeleton_skull': uniform(40, 40, 40),
  'minecraft:zombie_head': uniform(70, 120, 50),
  'minecraft:creeper_head': uniform(70, 140, 50),
  'minecraft:dragon_head': uniform(20, 20, 20),
  'minecraft:player_head': uniform(160, 120, 80),
  'minecraft:piglin_head': uniform(190, 140, 80),

  // === Coral Blocks ===
  'minecraft:tube_coral_block': uniform(49, 88, 202),
  'minecraft:brain_coral_block': uniform(207, 91, 159),
  'minecraft:bubble_coral_block': uniform(165, 26, 162),
  'minecraft:fire_coral_block': uniform(164, 35, 47),
  'minecraft:horn_coral_block': uniform(216, 199, 66),
  'minecraft:dead_tube_coral_block': uniform(130, 124, 119),
  'minecraft:dead_brain_coral_block': uniform(124, 118, 114),
  'minecraft:dead_bubble_coral_block': uniform(131, 123, 120),
  'minecraft:dead_fire_coral_block': uniform(132, 124, 120),
  'minecraft:dead_horn_coral_block': uniform(133, 126, 120),

  // === Misc ===
  'minecraft:chain': uniform(50, 55, 65),
  'minecraft:iron_bars': uniform(140, 140, 140),
  'minecraft:dragon_egg': uniform(12, 9, 15),
  'minecraft:beacon': uniform(120, 216, 214),
  'minecraft:conduit': uniform(164, 143, 100),
  'minecraft:lodestone': uniform(145, 145, 150),
  'minecraft:structure_block': uniform(100, 80, 110),
  'minecraft:jigsaw': uniform(100, 80, 110),
  'minecraft:command_block': uniform(180, 130, 90),
  'minecraft:chain_command_block': uniform(120, 180, 130),
  'minecraft:repeating_command_block': uniform(120, 100, 180),
  'minecraft:barrier': uniform(200, 50, 50),
  'minecraft:light': uniform(255, 255, 200),
  'minecraft:spawner': uniform(28, 38, 48),
};

/** Default/fallback color for unknown blocks */
const DEFAULT_COLOR = [255, 0, 255]; // Magenta for missing textures

// ========================================
// Result Helpers
// ========================================

function ok<T>(value: T): Result<T, PortError> {
  return { success: true, value };
}

// ========================================
// TextureLoaderAdapter
// ========================================

/**
 * TextureLoaderAdapter
 *
 * Creates and manages block textures for 3D rendering.
 */
export class TextureLoaderAdapter implements TextureLoaderPort {
  private atlas: TextureAtlas | null = null;
  private blockTextureCache: Map<string, BlockTextures> = new Map();
  private tileIndex: number = 0;
  private tilePositions: Map<string, { u: number; v: number }> = new Map();

  /**
   * Loads the default Minecraft block textures
   *
   * @returns Texture atlas with all block textures
   */
  async loadDefaultTextures(): Promise<Result<TextureAtlas, PortError>> {
    // Create texture atlas
    const textureData = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4);
    const uvMapping = new Map<string, UVCoordinates>();

    // Reset tile tracking
    this.tileIndex = 0;
    this.tilePositions.clear();

    // Generate textures for all defined blocks
    for (const [blockName, colors] of Object.entries(BLOCK_COLORS)) {
      // Create top texture
      const topPos = this.allocateTile();
      this.fillTile(textureData, topPos.u, topPos.v, colors.top);
      this.tilePositions.set(`${blockName}:top`, topPos);

      // Create side texture (if different)
      let sidePos = topPos;
      if (
        colors.side[0] !== colors.top[0] ||
        colors.side[1] !== colors.top[1] ||
        colors.side[2] !== colors.top[2]
      ) {
        sidePos = this.allocateTile();
        this.fillTile(textureData, sidePos.u, sidePos.v, colors.side);
      }
      this.tilePositions.set(`${blockName}:side`, sidePos);

      // Create bottom texture (if different)
      let bottomPos = topPos;
      if (
        colors.bottom[0] !== colors.top[0] ||
        colors.bottom[1] !== colors.top[1] ||
        colors.bottom[2] !== colors.top[2]
      ) {
        bottomPos = this.allocateTile();
        this.fillTile(textureData, bottomPos.u, bottomPos.v, colors.bottom);
      }
      this.tilePositions.set(`${blockName}:bottom`, bottomPos);

      // Store main UV mapping
      uvMapping.set(blockName, {
        u: topPos.u,
        v: topPos.v,
        width: DEFAULT_TILE_SIZE,
        height: DEFAULT_TILE_SIZE,
      });
    }

    // Create fallback texture
    const fallbackPos = this.allocateTile();
    this.fillTile(textureData, fallbackPos.u, fallbackPos.v, DEFAULT_COLOR);
    this.tilePositions.set('fallback', fallbackPos);

    this.atlas = {
      texture: textureData,
      width: ATLAS_SIZE,
      height: ATLAS_SIZE,
      tileSize: DEFAULT_TILE_SIZE,
      uvMapping,
    };

    // Clear cache when atlas is reloaded
    this.blockTextureCache.clear();

    return ok(this.atlas);
  }

  /**
   * Gets textures for a specific block state
   *
   * @param blockState - Block state to get textures for
   * @returns Block textures for all six faces
   */
  getBlockTexture(blockState: BlockState): BlockTextures {
    const cacheKey = blockState.toString();

    // Check cache first
    const cached = this.blockTextureCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get block name without properties for texture lookup
    const blockName = blockState.name;

    // Try to get textures from tile positions
    const topPos =
      this.tilePositions.get(`${blockName}:top`) ||
      this.tilePositions.get('fallback') ||
      { u: 0, v: 0 };
    const sidePos =
      this.tilePositions.get(`${blockName}:side`) ||
      this.tilePositions.get(`${blockName}:top`) ||
      this.tilePositions.get('fallback') ||
      { u: 0, v: 0 };
    const bottomPos =
      this.tilePositions.get(`${blockName}:bottom`) ||
      this.tilePositions.get(`${blockName}:top`) ||
      this.tilePositions.get('fallback') ||
      { u: 0, v: 0 };

    const topUV: UVCoordinates = {
      u: topPos.u,
      v: topPos.v,
      width: DEFAULT_TILE_SIZE,
      height: DEFAULT_TILE_SIZE,
    };

    const sideUV: UVCoordinates = {
      u: sidePos.u,
      v: sidePos.v,
      width: DEFAULT_TILE_SIZE,
      height: DEFAULT_TILE_SIZE,
    };

    const bottomUV: UVCoordinates = {
      u: bottomPos.u,
      v: bottomPos.v,
      width: DEFAULT_TILE_SIZE,
      height: DEFAULT_TILE_SIZE,
    };

    const textures: BlockTextures = {
      top: topUV,
      bottom: bottomUV,
      north: sideUV,
      south: sideUV,
      east: sideUV,
      west: sideUV,
    };

    // Cache the result
    this.blockTextureCache.set(cacheKey, textures);

    return textures;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Allocates the next tile position in the atlas
   */
  private allocateTile(): { u: number; v: number } {
    const tilesPerRow = Math.floor(ATLAS_SIZE / DEFAULT_TILE_SIZE);
    const row = Math.floor(this.tileIndex / tilesPerRow);
    const col = this.tileIndex % tilesPerRow;

    this.tileIndex++;

    return {
      u: col * DEFAULT_TILE_SIZE,
      v: row * DEFAULT_TILE_SIZE,
    };
  }

  /**
   * Fills a tile with a solid color
   */
  private fillTile(
    textureData: Uint8Array,
    u: number,
    v: number,
    rgb: number[]
  ): void {
    const [r, g, b] = rgb;

    for (let y = 0; y < DEFAULT_TILE_SIZE; y++) {
      for (let x = 0; x < DEFAULT_TILE_SIZE; x++) {
        const pixelX = u + x;
        const pixelY = v + y;
        const index = (pixelY * ATLAS_SIZE + pixelX) * 4;

        textureData[index] = r;
        textureData[index + 1] = g;
        textureData[index + 2] = b;
        textureData[index + 3] = 255; // Alpha
      }
    }
  }
}
