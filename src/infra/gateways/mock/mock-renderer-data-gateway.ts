/**
 * Mock Renderer Data Gateway
 *
 * Returns actual parsed structure data for rendering.
 */

import type { RendererDataPort } from '../../../usecase/ports/gateway-ports.js';
import type {
  StructureData,
  RenderData,
  TextureAtlas,
  LodLevel,
} from '../../../usecase/ports/types.js';
import { PortError } from '../../../usecase/ports/types.js';
import { structureDataStore } from '../structure-data-store.js';
import {
  detectBlockShape,
  extractFacing,
  extractHalf,
  extractStairShape,
  extractConnections,
} from '../../../frontend/components/viewer/TexturedBlockRenderer.js';

export class MockRendererDataGateway implements RendererDataPort {
  private _shouldFailGeneration = false;
  private _shouldFailResourcePack = false;
  private _mockRenderData: RenderData | null = null;
  private _mockTextureAtlas: TextureAtlas | null = null;

  /**
   * Reset all mock state
   */
  public clear(): void {
    this._shouldFailGeneration = false;
    this._shouldFailResourcePack = false;
    this._mockRenderData = null;
    this._mockTextureAtlas = null;
  }

  /**
   * Set whether render data generation should fail
   */
  public setShouldFailGeneration(shouldFail: boolean): void {
    this._shouldFailGeneration = shouldFail;
  }

  /**
   * Set whether resource pack loading should fail
   */
  public setShouldFailResourcePack(shouldFail: boolean): void {
    this._shouldFailResourcePack = shouldFail;
  }

  /**
   * Set mock render data to return
   */
  public setMockRenderData(renderData: RenderData): void {
    this._mockRenderData = renderData;
  }

  /**
   * Set mock texture atlas to return
   */
  public setMockTextureAtlas(atlas: TextureAtlas): void {
    this._mockTextureAtlas = atlas;
  }

  public async generateRenderData(
    structure: StructureData,
    lodLevel?: LodLevel
  ): Promise<RenderData> {
    if (this._shouldFailGeneration) {
      throw new PortError('GENERATION_FAILED', 'Failed to generate render data');
    }

    if (this._mockRenderData) {
      return this._mockRenderData;
    }

    const level = lodLevel ?? 'medium';

    // Try to get cached parsed data by structure ID
    if (structure.structureId) {
      const cachedData = structureDataStore.get(structure.structureId);

      if (cachedData) {
        const { parsed } = cachedData;

        return {
          dimensions: parsed.dimensions,
          blocks: parsed.blocks.map((b) => {
            const paletteEntry = parsed.palette[b.paletteIndex];
            const props = paletteEntry?.properties;
            const shape = detectBlockShape(paletteEntry?.name ?? '', props);

            return {
              x: b.x,
              y: b.y,
              z: b.z,
              paletteIndex: b.paletteIndex,
              shape,
              facing: extractFacing(props),
              half: extractHalf(props),
              stairShape: extractStairShape(props),
              connections: extractConnections(props),
            };
          }),
          palette: parsed.palette.map((p) => ({
            name: p.name,
            properties: p.properties,
          })),
          lodLevel: level,
        } as RenderData;
      }
    }

    // Fallback: generate mock render data
    const dimensions = { x: 16, y: 8, z: 16 };
    const palette = [
      { name: 'minecraft:stone' },
      { name: 'minecraft:cobblestone' },
      { name: 'minecraft:oak_planks' },
    ];

    const blocks: { x: number; y: number; z: number; paletteIndex: number }[] = [];

    // Simple floor
    for (let x = 0; x < dimensions.x; x++) {
      for (let z = 0; z < dimensions.z; z++) {
        blocks.push({ x, y: 0, z, paletteIndex: 0 });
      }
    }

    return {
      dimensions,
      blocks,
      palette,
      lodLevel: level,
    };
  }

  public async applyResourcePack(
    resourcePackUrl: string,
    blockIds: string[]
  ): Promise<TextureAtlas> {
    if (this._shouldFailResourcePack) {
      if (resourcePackUrl.includes('invalid')) {
        throw new PortError(
          'INVALID_RESOURCE_PACK',
          'Invalid resource pack format'
        );
      }
      throw new PortError('FETCH_FAILED', 'Failed to fetch resource pack');
    }

    if (this._mockTextureAtlas) {
      return this._mockTextureAtlas;
    }

    // Generate mock texture atlas
    const atlasSize = Math.ceil(Math.sqrt(blockIds.length)) * 16;
    const uvMapping: Record<
      string,
      { u: number; v: number; width: number; height: number }
    > = {};

    blockIds.forEach((blockId, index) => {
      const row = Math.floor(index / Math.ceil(Math.sqrt(blockIds.length)));
      const col = index % Math.ceil(Math.sqrt(blockIds.length));
      uvMapping[blockId] = {
        u: (col * 16) / atlasSize,
        v: (row * 16) / atlasSize,
        width: 16 / atlasSize,
        height: 16 / atlasSize,
      };
    });

    return {
      imageData: new Uint8Array(atlasSize * atlasSize * 4), // RGBA
      width: atlasSize,
      height: atlasSize,
      uvMapping,
    };
  }
}
