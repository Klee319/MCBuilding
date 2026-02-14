export interface StructureOutput {
  id: string;
  originalEdition: 'java' | 'bedrock';
  originalVersion: string;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  blockCount: number;
  fileFormat: string;
  availableEditions: ('java' | 'bedrock')[];
  availableVersions: string[];
  createdAt: string;
}

export interface StructureSummary {
  id: string;
  originalEdition: 'java' | 'bedrock';
  originalVersion: string;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  blockCount: number;
}

export interface RenderData {
  blocks: BlockData[];
  palette: BlockPalette[];
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Block shape type
 */
export type BlockShape =
  // 基本形状
  | 'full'           // フルブロック
  | 'stairs'         // 階段
  | 'slab'           // スラブ
  | 'fence'          // フェンス
  | 'wall'           // 壁
  | 'door'           // ドア
  | 'trapdoor'       // トラップドア
  | 'pressure_plate' // 感圧板
  | 'button'         // ボタン
  | 'torch'          // 松明
  | 'wall_torch'     // 壁松明
  | 'carpet'         // カーペット
  | 'glass_pane'     // 板ガラス
  | 'chain'          // 鎖
  | 'lantern'        // ランタン
  | 'hanging_lantern' // 吊りランタン
  | 'cross'          // クロス型（花・草等）
  // 拡張形状
  | 'lever'          // レバー
  | 'sign'           // 看板
  | 'banner'         // 旗
  | 'bed'            // ベッド
  | 'chest'          // チェスト
  | 'anvil'          // 金床
  | 'cauldron'       // 大釜
  | 'hopper'         // ホッパー
  | 'brewing_stand'  // 醸造台
  | 'enchanting_table' // エンチャントテーブル
  | 'end_portal_frame' // エンドポータルフレーム
  | 'dragon_egg'     // ドラゴンの卵
  | 'bell'           // 鐘
  | 'campfire'       // 焚き火
  | 'grindstone'     // 砥石
  | 'lectern'        // 書見台
  | 'stonecutter'    // 石切台
  | 'composter'      // コンポスター
  | 'beehive'        // ハチの巣
  | 'candle'         // ろうそく
  | 'amethyst_cluster' // アメジストクラスター
  | 'small_amethyst_bud' // 小さなアメジストの芽
  | 'medium_amethyst_bud' // 中くらいのアメジストの芽
  | 'large_amethyst_bud' // 大きなアメジストの芽
  | 'pointed_dripstone' // 鍾乳石
  | 'sculk_sensor'   // スカルクセンサー
  | 'decorated_pot'  // 飾り壺
  | 'head'           // モブの頭
  | 'flower_pot'     // 植木鉢
  | 'rail'           // レール
  | 'ladder'         // はしご
  | 'snow_layer'     // 雪
  | 'farmland'       // 耕地
  | 'path'           // 土の道
  | 'cake'           // ケーキ
  | 'end_rod'        // エンドロッド
  | 'lightning_rod'  // 避雷針
  // 1.21+ 新形状
  | 'copper_grate'   // 銅格子
  | 'heavy_core'     // 重量コア
  | 'resin_clump'    // 樹脂の塊
  | 'vine'           // ツタ
  | 'hanging_moss'   // 垂れ下がる苔
  | 'trial_spawner'  // トライアルスポナー
  | 'vault'          // 金庫
  | 'crafter'        // クラフター
  | 'leaf_litter'    // 落ち葉
  | 'custom';        // その他/動的定義

/**
 * Block facing direction
 */
export type BlockFacing = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/**
 * Block half position (for slabs and stairs)
 */
export type BlockHalf = 'top' | 'bottom';

/**
 * Stair connection shape
 */
export type StairShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';

/**
 * Wall connection height
 */
export type WallHeight = 'none' | 'low' | 'tall';

/**
 * Block connection state for connectable blocks (walls, fences, glass panes)
 */
export interface BlockConnections {
  /** Connected to north (boolean for fence/pane, WallHeight for walls) */
  north?: boolean | WallHeight;
  /** Connected to south */
  south?: boolean | WallHeight;
  /** Connected to east */
  east?: boolean | WallHeight;
  /** Connected to west */
  west?: boolean | WallHeight;
  /** Center post up (for walls) */
  up?: boolean;
}

/**
 * Block data for rendering
 */
export interface BlockData {
  x: number;
  y: number;
  z: number;
  paletteIndex: number;
  /** Block shape (defaults to 'full') */
  shape?: BlockShape;
  /** Block facing direction */
  facing?: BlockFacing;
  /** Half position for slabs/stairs */
  half?: BlockHalf;
  /** Stair connection shape */
  stairShape?: StairShape;
  /** Waterlogged state */
  waterlogged?: boolean;
  /** Connection state for walls, fences, glass panes */
  connections?: BlockConnections;
}

export interface BlockPalette {
  name: string;
  properties?: Record<string, string>;
}
