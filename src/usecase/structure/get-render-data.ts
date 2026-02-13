/**
 * GetRenderData Usecase
 *
 * Gets 3D rendering data for a structure preview.
 */

import type { StructureRepositoryPort } from '../ports/repository-ports.js';
import type { RendererDataPort } from '../ports/gateway-ports.js';
import type { RenderData, LodLevel, StructureData } from '../ports/types.js';

export interface GetRenderDataInput {
  readonly structureId: string;
  readonly lodLevel?: LodLevel;
}

export class GetRenderDataError extends Error {
  public override readonly name = 'GetRenderDataError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, GetRenderDataError.prototype);
  }
}

export class GetRenderData {
  private readonly _structureRepository: StructureRepositoryPort;
  private readonly _rendererDataPort: RendererDataPort;

  private constructor(
    structureRepository: StructureRepositoryPort,
    rendererDataPort: RendererDataPort
  ) {
    this._structureRepository = structureRepository;
    this._rendererDataPort = rendererDataPort;

    Object.freeze(this);
  }

  public static create(
    structureRepository: StructureRepositoryPort,
    rendererDataPort: RendererDataPort
  ): GetRenderData {
    return new GetRenderData(structureRepository, rendererDataPort);
  }

  public async execute(input: GetRenderDataInput): Promise<RenderData> {
    this.validateInput(input);

    const { structureId, lodLevel } = input;

    // Find the structure
    const structure = await this._structureRepository.findById(structureId);
    if (!structure) {
      throw new GetRenderDataError('Structure not found');
    }

    // Create structure data reference with ID for cached lookup
    const structureData: StructureData = {
      content: new Uint8Array(0), // Raw data is in the cache
      format: structure.originalFormat,
      structureId: structureId, // Used to look up cached parsed data
    };

    // Generate render data from cached parsed data
    return this._rendererDataPort.generateRenderData(structureData, lodLevel);
  }

  private validateInput(input: GetRenderDataInput): void {
    if (!input.structureId || input.structureId.trim().length === 0) {
      throw new GetRenderDataError('structureId cannot be empty');
    }
  }
}
