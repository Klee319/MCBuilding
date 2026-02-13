/**
 * Structure Presenter
 *
 * Formats structure entities for API responses.
 */

import type { Structure } from '../../domain/entities/structure.js';
import type {
  SuccessResponse,
  StructureOutput,
  DownloadOutput,
  RenderDataOutput,
  RenderBlockOutput,
  PaletteEntryOutput,
} from './types.js';
import type { RenderData } from '../../usecase/ports/types.js';

export class StructurePresenter {
  private constructor() {
    // Static methods only
  }

  /**
   * Format a structure for full output
   */
  public static toOutput(structure: Structure): StructureOutput {
    return {
      id: structure.id,
      originalFormat: structure.originalFormat.value,
      originalEdition: structure.originalEdition.value,
      originalVersion: structure.originalVersion.toString(),
      dimensions: {
        x: structure.dimensions.x,
        y: structure.dimensions.y,
        z: structure.dimensions.z,
      },
      blockCount: structure.blockCount,
      availableEditions: ['java', 'bedrock'],
      availableVersions: ['1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2'],
    };
  }

  /**
   * Format a single structure response
   */
  public static format(structure: Structure): SuccessResponse<StructureOutput> {
    return {
      success: true,
      data: this.toOutput(structure),
    };
  }

  /**
   * Format a download response
   */
  public static formatDownload(
    downloadUrl: string,
    edition: string,
    version: string
  ): SuccessResponse<DownloadOutput> {
    return {
      success: true,
      data: {
        downloadUrl,
        edition,
        version,
      },
    };
  }

  /**
   * Format render data response
   */
  public static formatRenderData(renderData: RenderData): SuccessResponse<RenderDataOutput> {
    return {
      success: true,
      data: {
        dimensions: {
          x: renderData.dimensions.x,
          y: renderData.dimensions.y,
          z: renderData.dimensions.z,
        },
        blocks: renderData.blocks.map((block) => {
          const result: RenderBlockOutput = {
            x: block.x,
            y: block.y,
            z: block.z,
            paletteIndex: block.paletteIndex,
          };
          if (block.shape !== undefined) {
            (result as { shape?: typeof block.shape }).shape = block.shape;
          }
          if (block.facing !== undefined) {
            (result as { facing?: typeof block.facing }).facing = block.facing;
          }
          if (block.half !== undefined) {
            (result as { half?: typeof block.half }).half = block.half;
          }
          if (block.stairShape !== undefined) {
            (result as { stairShape?: typeof block.stairShape }).stairShape = block.stairShape;
          }
          if (block.connections !== undefined) {
            (result as { connections?: typeof block.connections }).connections = block.connections;
          }
          return result;
        }),
        palette: renderData.palette.map((entry) => {
          const result: PaletteEntryOutput = {
            name: entry.name,
          };
          if (entry.properties !== undefined) {
            (result as { properties?: typeof entry.properties }).properties = entry.properties;
          }
          return result;
        }),
        lodLevel: renderData.lodLevel,
      },
    };
  }
}
