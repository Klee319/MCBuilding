/**
 * 3D Renderer ViewModel Types
 *
 * Type definitions for view models used in the 3D Structure Renderer interface.
 * These types define the data structure presented to the UI layer.
 */

// ========================================
// RenderViewModel
// ========================================

/**
 * Main view model for render state
 * Represents the complete UI state for the 3D viewer
 */
export interface RenderViewModel {
  /** Whether the renderer is currently loading */
  readonly isLoading: boolean;

  /** Loading progress (0-100) */
  readonly progress: number;

  /** Error message or null if no error */
  readonly error: string | null;

  /** Selected block information or null if none selected */
  readonly blockInfo: BlockInfoViewModel | null;

  /** Render statistics */
  readonly stats: RenderStatsViewModel;
}

// ========================================
// BlockInfoViewModel
// ========================================

/**
 * View model for selected block information
 */
export interface BlockInfoViewModel {
  /** Block name with namespace (e.g., "minecraft:stone") */
  readonly name: string;

  /** Display name for UI (e.g., "Stone") */
  readonly displayName: string;

  /** Formatted position string (e.g., "X: 10, Y: 20, Z: 30") */
  readonly position: string;

  /** Block state properties as key-value pairs */
  readonly properties: readonly BlockPropertyViewModel[];
}

/**
 * View model for a single block property
 */
export interface BlockPropertyViewModel {
  /** Property key (e.g., "facing") */
  readonly key: string;

  /** Property value (e.g., "north") */
  readonly value: string;
}

// ========================================
// RenderStatsViewModel
// ========================================

/**
 * View model for render statistics
 * All values are formatted for display
 */
export interface RenderStatsViewModel {
  /** Frames per second (integer) */
  readonly fps: number;

  /** Number of draw calls (integer) */
  readonly drawCalls: number;

  /** Triangle count formatted with suffix (e.g., "1.2M") */
  readonly triangles: string;

  /** Memory usage formatted with unit (e.g., "256 MB") */
  readonly memory: string;
}

// ========================================
// StructureInfoViewModel
// ========================================

/**
 * View model for structure information
 */
export interface StructureInfoViewModel {
  /** Structure name */
  readonly name: string;

  /** Formatted dimensions string (e.g., "100 x 50 x 100") */
  readonly dimensions: string;

  /** Formatted block count with commas (e.g., "500,000") */
  readonly blockCount: string;

  /** File format or "Unknown" */
  readonly format: string;
}

// ========================================
// RenderStats Input Type
// ========================================

/**
 * Input type for render statistics from the renderer
 * This is the raw data before formatting
 */
export interface RenderStats {
  /** Frames per second */
  readonly fps: number;

  /** Number of draw calls */
  readonly drawCalls: number;

  /** Number of triangles rendered */
  readonly triangles: number;

  /** Memory usage in bytes */
  readonly memoryBytes: number;
}
