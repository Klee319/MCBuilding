/**
 * InMemory Structure Repository
 *
 * In-memory implementation of StructureRepositoryPort for testing and development.
 */

import type { Structure } from '../../../domain/entities/structure.js';
import type { StructureRepositoryPort } from '../../../usecase/ports/repository-ports.js';
import type { Edition } from '../../../domain/value-objects/edition.js';
import type { Version } from '../../../domain/value-objects/version.js';
import { PortError } from '../../../usecase/ports/types.js';

interface DownloadUrlEntry {
  readonly structureId: string;
  readonly edition: string;
  readonly version: string;
  readonly url: string;
}

export class InMemoryStructureRepository implements StructureRepositoryPort {
  private readonly _structures = new Map<string, Structure>();
  private readonly _downloadUrls = new Map<string, DownloadUrlEntry>();

  /**
   * Clear all stored structures (for test reset)
   */
  public clear(): void {
    this._structures.clear();
    this._downloadUrls.clear();
  }

  /**
   * Get all stored structures (for test verification)
   */
  public getAll(): Structure[] {
    return Array.from(this._structures.values());
  }

  /**
   * Set a mock download URL for testing
   */
  public setDownloadUrl(
    structureId: string,
    edition: Edition,
    version: Version,
    url: string
  ): void {
    const key = `${structureId}:${edition.value}:${version.toString()}`;
    this._downloadUrls.set(key, {
      structureId,
      edition: edition.value,
      version: version.toString(),
      url,
    });
  }

  public async findById(id: string): Promise<Structure | null> {
    return this._structures.get(id) ?? null;
  }

  public async save(structure: Structure): Promise<Structure> {
    this._structures.set(structure.id, structure);
    return structure;
  }

  public async delete(id: string): Promise<void> {
    if (!this._structures.has(id)) {
      throw new PortError('NOT_FOUND', `Structure with id ${id} not found`);
    }
    this._structures.delete(id);

    // Delete associated download URLs
    for (const [key, entry] of this._downloadUrls.entries()) {
      if (entry.structureId === id) {
        this._downloadUrls.delete(key);
      }
    }
  }

  public async getDownloadUrl(
    id: string,
    edition: Edition,
    version: Version
  ): Promise<string> {
    const structure = this._structures.get(id);
    if (!structure) {
      throw new PortError('NOT_FOUND', `Structure with id ${id} not found`);
    }

    // Check version support (>= 1.12)
    const minVersion = 12;
    const versionNumber = parseInt(version.toString().split('.')[1] ?? '0', 10);
    if (versionNumber < minVersion) {
      throw new PortError(
        'UNSUPPORTED_VERSION',
        `Version ${version.toString()} is not supported. Minimum version is 1.12`
      );
    }

    // Look for pre-set URL or generate mock URL
    const key = `${id}:${edition.value}:${version.toString()}`;
    const entry = this._downloadUrls.get(key);
    if (entry) {
      return entry.url;
    }

    // Generate mock signed URL
    return `https://storage.example.com/structures/${id}/${edition.value}/${version.toString()}?token=mock-signed-token`;
  }
}
