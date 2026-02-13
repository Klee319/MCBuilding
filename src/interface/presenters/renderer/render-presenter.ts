/**
 * Render Presenter
 *
 * Transforms domain data to view models for the 3D Structure Renderer.
 * Provides static methods for creating view models from domain objects.
 */

import type { Block } from '../../../domain/renderer/block.js';
import type { Structure } from '../../../domain/renderer/structure.js';
import type { Position } from '../../../domain/renderer/position.js';
import type { BlockState } from '../../../domain/renderer/block-state.js';
import type {
  RenderViewModel,
  BlockInfoViewModel,
  RenderStatsViewModel,
  StructureInfoViewModel,
  RenderStats,
  BlockPropertyViewModel,
} from './types.js';

/**
 * Default empty render stats for loading/error states
 */
const DEFAULT_STATS: RenderStatsViewModel = {
  fps: 0,
  drawCalls: 0,
  triangles: '0',
  memory: '0 B',
};

/**
 * RenderPresenter
 *
 * Static utility class for transforming domain data to view models.
 */
export class RenderPresenter {
  private constructor() {
    // Static methods only
  }

  // ========================================
  // View Model Factory Methods
  // ========================================

  /**
   * Creates a loading view model
   *
   * @param progress - Loading progress (0-100)
   * @returns RenderViewModel in loading state
   */
  public static loading(progress: number): RenderViewModel {
    return {
      isLoading: true,
      progress,
      error: null,
      blockInfo: null,
      stats: DEFAULT_STATS,
    };
  }

  /**
   * Creates an error view model
   *
   * @param message - Error message to display
   * @returns RenderViewModel in error state
   */
  public static error(message: string): RenderViewModel {
    return {
      isLoading: false,
      progress: 0,
      error: message,
      blockInfo: null,
      stats: DEFAULT_STATS,
    };
  }

  /**
   * Creates a ready view model with stats and optional selected block
   *
   * @param stats - Raw render statistics
   * @param selectedBlock - Currently selected block or null
   * @returns RenderViewModel in ready state
   */
  public static ready(stats: RenderStats, selectedBlock: Block | null): RenderViewModel {
    return {
      isLoading: false,
      progress: 100,
      error: null,
      blockInfo: selectedBlock ? this.formatBlockInfo(selectedBlock) : null,
      stats: this.formatStats(stats),
    };
  }

  // ========================================
  // Formatting Methods
  // ========================================

  /**
   * Formats a block name for display (minecraft:stone -> Stone)
   *
   * @param state - BlockState to format
   * @returns Human-readable block name
   */
  public static formatBlockName(state: BlockState): string {
    // Get block ID without namespace
    const blockId = state.blockId;

    // Convert snake_case to Title Case
    return blockId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Formats a position for display
   *
   * @param pos - Position to format
   * @returns Formatted string "X: x, Y: y, Z: z"
   */
  public static formatPosition(pos: Position): string {
    return `X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z}`;
  }

  /**
   * Formats structure info for display
   *
   * @param structure - Structure to format
   * @returns StructureInfoViewModel
   */
  public static formatStructureInfo(structure: Structure): StructureInfoViewModel {
    const dimensions = structure.dimensions;

    return {
      name: structure.name,
      dimensions: `${dimensions.x} x ${dimensions.y} x ${dimensions.z}`,
      blockCount: this.formatNumber(structure.blockCount),
      format: structure.metadata?.tags?.includes('format')
        ? (structure.metadata.tags[0] ?? 'Unknown')
        : 'Unknown',
    };
  }

  /**
   * Formats a number with commas (1000000 -> "1,000,000")
   *
   * @param n - Number to format
   * @returns Formatted string with commas
   */
  public static formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  /**
   * Formats bytes to human readable string
   *
   * @param bytes - Number of bytes
   * @returns Formatted string with unit (e.g., "256 MB")
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    // Use toFixed(1) only if there's a decimal, otherwise integer
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);

    return `${formatted} ${units[i]}`;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Formats block info for display
   *
   * @param block - Block to format
   * @returns BlockInfoViewModel
   */
  private static formatBlockInfo(block: Block): BlockInfoViewModel {
    const state = block.state;
    const properties = state.properties;

    // Convert properties object to array of key-value pairs
    const propertyList: BlockPropertyViewModel[] = Object.entries(properties).map(
      ([key, value]) => ({
        key,
        value,
      })
    );

    return {
      name: state.name,
      displayName: this.formatBlockName(state),
      position: this.formatPosition(block.position),
      properties: propertyList,
    };
  }

  /**
   * Formats render stats for display
   *
   * @param stats - Raw render statistics
   * @returns RenderStatsViewModel
   */
  private static formatStats(stats: RenderStats): RenderStatsViewModel {
    return {
      fps: stats.fps,
      drawCalls: stats.drawCalls,
      triangles: this.formatTriangles(stats.triangles),
      memory: this.formatBytes(stats.memoryBytes),
    };
  }

  /**
   * Formats triangle count with K/M suffix
   *
   * @param triangles - Number of triangles
   * @returns Formatted string (e.g., "1.2M")
   */
  private static formatTriangles(triangles: number): string {
    if (triangles === 0) {
      return '0';
    }

    if (triangles >= 1000000) {
      const value = triangles / 1000000;
      // Round to 1 decimal place, but remove .0 if integer
      const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);
      return `${formatted}M`;
    }

    if (triangles >= 1000) {
      const value = triangles / 1000;
      const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1);
      return `${formatted}K`;
    }

    return triangles.toString();
  }
}
