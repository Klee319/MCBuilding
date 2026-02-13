/**
 * DownloadStructure Usecase
 *
 * Gets a download URL for a structure, converting if needed.
 */

import { Edition } from '../../domain/value-objects/edition.js';
import { Version } from '../../domain/value-objects/version.js';
import { FileFormat, type FileFormatValue } from '../../domain/value-objects/file-format.js';
import type { StructureRepositoryPort, PostRepositoryPort, UserRepositoryPort } from '../ports/repository-ports.js';
import type { StructureConverterPort } from '../ports/gateway-ports.js';
import type { ExportResult } from '../ports/types.js';

export interface DownloadStructureInput {
  readonly postId: string;
  readonly requestedEdition: 'java' | 'bedrock';
  readonly requestedVersion: string;
  readonly requesterId?: string;
  readonly unlistedToken?: string;
  /** Target file format for cross-format download (optional) */
  readonly targetFormat?: FileFormatValue;
}

export interface DownloadStructureOutput {
  /** Pre-signed download URL (empty when exportResult is present) */
  readonly downloadUrl: string;
  readonly edition: 'java' | 'bedrock';
  readonly version: string;
  /** Present when cross-format export was performed; binary data is in exportResult.data */
  readonly exportResult?: ExportResult;
}

export class DownloadStructureError extends Error {
  public override readonly name = 'DownloadStructureError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, DownloadStructureError.prototype);
  }
}

export class DownloadStructure {
  private readonly _structureRepository: StructureRepositoryPort;
  private readonly _postRepository: PostRepositoryPort;
  private readonly _userRepository: UserRepositoryPort;
  private readonly _structureConverter: StructureConverterPort;

  private constructor(
    structureRepository: StructureRepositoryPort,
    postRepository: PostRepositoryPort,
    userRepository: UserRepositoryPort,
    structureConverter: StructureConverterPort
  ) {
    this._structureRepository = structureRepository;
    this._postRepository = postRepository;
    this._userRepository = userRepository;
    this._structureConverter = structureConverter;

    Object.freeze(this);
  }

  public static create(
    structureRepository: StructureRepositoryPort,
    postRepository: PostRepositoryPort,
    userRepository: UserRepositoryPort,
    structureConverter: StructureConverterPort
  ): DownloadStructure {
    return new DownloadStructure(structureRepository, postRepository, userRepository, structureConverter);
  }

  public async execute(input: DownloadStructureInput): Promise<DownloadStructureOutput> {
    this.validateInput(input);

    const { postId, requestedEdition, requestedVersion, requesterId, unlistedToken } = input;

    // Find the post
    const post = await this._postRepository.findById(postId);
    if (!post) {
      throw new DownloadStructureError('Post not found');
    }

    // Get requester (may be null for anonymous)
    const requester = requesterId
      ? await this._userRepository.findById(requesterId)
      : null;

    // Check visibility and download permission
    const isOwner = requesterId === post.authorId;
    const isAccessible = post.isAccessible(isOwner, unlistedToken);

    if (!isAccessible) {
      throw new DownloadStructureError('Not authorized to access this structure');
    }

    // Check if user can download (must be registered)
    if (requester === null || !requester.canDownload()) {
      throw new DownloadStructureError('Not authorized to download this structure');
    }

    // Create edition and version objects
    const edition = requestedEdition === 'java' ? Edition.java() : Edition.bedrock();
    const version = Version.create(requestedVersion);

    // If targetFormat is specified, perform cross-format export
    if (input.targetFormat) {
      const targetFileFormat = FileFormat.create(input.targetFormat);
      const exportResult = await this._structureConverter.exportStructure(
        post.structureId,
        targetFileFormat,
        edition,
        version
      );

      // Increment download count
      await this._postRepository.incrementDownloadCount(postId);

      return {
        downloadUrl: '',
        edition: requestedEdition,
        version: requestedVersion,
        exportResult,
      };
    }

    // Standard download: get pre-signed URL for the original format
    const downloadUrl = await this._structureRepository.getDownloadUrl(
      post.structureId,
      edition,
      version
    );

    // Increment download count
    await this._postRepository.incrementDownloadCount(postId);

    return {
      downloadUrl,
      edition: requestedEdition,
      version: requestedVersion,
    };
  }

  private validateInput(input: DownloadStructureInput): void {
    if (!input.postId || input.postId.trim().length === 0) {
      throw new DownloadStructureError('postId cannot be empty');
    }
    if (!input.requestedVersion || input.requestedVersion.trim().length === 0) {
      throw new DownloadStructureError('requestedVersion cannot be empty');
    }
  }
}
