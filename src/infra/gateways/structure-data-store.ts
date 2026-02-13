/**
 * Structure Data Store
 *
 * In-memory store for parsed structure data.
 * Used to cache parsed schematic data for rendering.
 */

import type { ParsedSchematic } from './schematic-parser.js';

/**
 * Stored structure data with raw file and parsed data
 */
export interface StoredStructureData {
  readonly rawFile: Uint8Array;
  readonly format: string;
  readonly parsed: ParsedSchematic;
}

/**
 * Singleton store for structure data
 */
class StructureDataStore {
  private readonly _data = new Map<string, StoredStructureData>();

  /**
   * Store structure data
   */
  public set(structureId: string, data: StoredStructureData): void {
    this._data.set(structureId, data);
  }

  /**
   * Get structure data
   */
  public get(structureId: string): StoredStructureData | undefined {
    return this._data.get(structureId);
  }

  /**
   * Check if structure data exists
   */
  public has(structureId: string): boolean {
    return this._data.has(structureId);
  }

  /**
   * Delete structure data
   */
  public delete(structureId: string): boolean {
    return this._data.delete(structureId);
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this._data.clear();
  }
}

// Export singleton instance
export const structureDataStore = new StructureDataStore();
