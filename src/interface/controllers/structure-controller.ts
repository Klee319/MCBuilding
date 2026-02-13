/**
 * Structure Controller
 *
 * Handles structure-related HTTP requests.
 */

import { ZodError } from 'zod';
import { BaseController, type HttpContext, type HttpResponse } from './types.js';
import {
  uploadStructureSchema,
  downloadStructureQuerySchema,
  structureIdParamSchema,
  getRenderDataQuerySchema,
} from '../validators/index.js';
import {
  StructurePresenter,
  ErrorPresenter,
  ErrorCode,
  type StructureOutput,
  type DownloadOutput,
  type RenderDataOutput,
} from '../presenters/index.js';

// Usecase imports
import type { UploadStructure } from '../../usecase/structure/upload-structure.js';
import type { DownloadStructure } from '../../usecase/structure/download-structure.js';
import type { GetRenderData } from '../../usecase/structure/get-render-data.js';
import type { LodLevel } from '../../usecase/ports/types.js';

export interface StructureControllerDeps {
  readonly uploadStructure: UploadStructure;
  readonly downloadStructure: DownloadStructure;
  readonly getRenderData: GetRenderData;
}

export class StructureController extends BaseController {
  private readonly _deps: StructureControllerDeps;

  private constructor(deps: StructureControllerDeps) {
    super();
    this._deps = deps;
    Object.freeze(this);
  }

  public static create(deps: StructureControllerDeps): StructureController {
    return new StructureController(deps);
  }

  /**
   * POST /api/v1/structures/upload - Upload structure file
   */
  public async upload(ctx: HttpContext): Promise<HttpResponse<StructureOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      if (!ctx.file) {
        return this.createErrorResponse(
          400,
          ErrorPresenter.format(
            ErrorCode.VALIDATION_ERROR,
            'ファイルを選択してください'
          )
        );
      }

      // Validate file size (100MB)
      const maxSize = 100 * 1024 * 1024;
      if (ctx.file.size > maxSize) {
        return this.createErrorResponse(
          413,
          ErrorPresenter.format(
            ErrorCode.FILE_TOO_LARGE,
            'ファイルサイズが上限（100MB）を超えています'
          )
        );
      }

      const input = uploadStructureSchema.parse(ctx.body);

      const structure = await this._deps.uploadStructure.execute({
        file: new Uint8Array(ctx.file.buffer),
        fileName: ctx.file.originalname,
        originalEdition: input.originalEdition,
        originalVersion: input.originalVersion,
        uploaderId: ctx.user.id,
      });

      return this.createResponse(201, StructurePresenter.format(structure));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        // Map specific error messages
        if (error.message.includes('format')) {
          return this.createErrorResponse(
            400,
            ErrorPresenter.format(
              ErrorCode.INVALID_FORMAT,
              '対応形式は .schematic / .litematic / .mcstructure です'
            )
          );
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/structures/:id/download - Download structure
   */
  public async download(ctx: HttpContext): Promise<HttpResponse<DownloadOutput>> {
    try {
      if (!ctx.user) {
        return this.createErrorResponse(401, ErrorPresenter.unauthorized());
      }

      const params = structureIdParamSchema.parse(ctx.params);
      const query = downloadStructureQuerySchema.parse(ctx.query);

      const result = await this._deps.downloadStructure.execute({
        postId: params.id, // Note: The API uses structure ID which maps to post ID
        requestedEdition: query.edition,
        requestedVersion: query.version,
        requesterId: ctx.user.id,
      });

      return this.createResponse(
        200,
        StructurePresenter.formatDownload(
          result.downloadUrl,
          result.edition,
          result.version
        )
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('建築データ'));
        }
        if (error.message.includes('Not authorized')) {
          return this.createErrorResponse(403, ErrorPresenter.forbidden());
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }

  /**
   * GET /api/v1/structures/:id/render-data - Get render data
   */
  public async getRenderData(ctx: HttpContext): Promise<HttpResponse<RenderDataOutput>> {
    try {
      const params = structureIdParamSchema.parse(ctx.params);
      const query = getRenderDataQuerySchema.parse(ctx.query);

      const renderData = await this._deps.getRenderData.execute({
        structureId: params.id,
        ...(query.lodLevel !== undefined && { lodLevel: query.lodLevel as LodLevel }),
      });

      return this.createResponse(200, StructurePresenter.formatRenderData(renderData));
    } catch (error) {
      if (error instanceof ZodError) {
        return this.createErrorResponse(400, ErrorPresenter.fromZodError(error));
      }
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return this.createErrorResponse(404, ErrorPresenter.notFound('建築データ'));
        }
        return this.createErrorResponse(400, ErrorPresenter.fromUsecaseError(error));
      }
      return this.createErrorResponse(500, ErrorPresenter.internal());
    }
  }
}
