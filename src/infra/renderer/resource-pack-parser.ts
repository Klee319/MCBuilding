/**
 * Resource Pack Parser
 *
 * Parses Minecraft resource packs (ZIP files) to extract block textures.
 */

import JSZip from 'jszip';

/**
 * Extracted texture from a resource pack
 */
export interface ExtractedTexture {
  readonly name: string;
  readonly data: Uint8Array;
}

/**
 * Resource pack metadata
 */
export interface ResourcePackMeta {
  readonly packFormat: number;
  readonly description: string;
}

/**
 * Parse a resource pack from a ZIP buffer
 *
 * @param zipData - ZIP file as ArrayBuffer or Uint8Array
 * @returns Extracted block textures
 */
export async function parseResourcePack(
  zipData: ArrayBuffer | Uint8Array
): Promise<Map<string, Uint8Array>> {
  const zip = await JSZip.loadAsync(zipData);
  const textures = new Map<string, Uint8Array>();

  // Find block textures in the resource pack
  const blockTexturePaths = [
    'assets/minecraft/textures/block/',
    'assets/minecraft/textures/blocks/', // Some older packs use this
  ];

  const files = Object.keys(zip.files);

  for (const filePath of files) {
    // Skip directories
    if (filePath.endsWith('/')) continue;

    // Check if it's a block texture
    const isBlockTexture = blockTexturePaths.some((prefix) => filePath.includes(prefix));
    if (!isBlockTexture || !filePath.endsWith('.png')) continue;

    try {
      const file = zip.files[filePath];
      const data = await file.async('uint8array');

      // Extract the texture name from the path
      let textureName = filePath
        .split('/')
        .pop()!
        .replace('.png', '');

      // Normalize texture name
      textureName = normalizeTextureName(textureName);

      textures.set(textureName, data);
    } catch (error) {
      console.warn(`Failed to extract texture: ${filePath}`, error);
    }
  }

  return textures;
}

/**
 * Get resource pack metadata
 *
 * @param zipData - ZIP file as ArrayBuffer or Uint8Array
 * @returns Resource pack metadata or null if not found
 */
export async function getResourcePackMeta(
  zipData: ArrayBuffer | Uint8Array
): Promise<ResourcePackMeta | null> {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const mcmetaFile = zip.files['pack.mcmeta'];

    if (!mcmetaFile) {
      return null;
    }

    const content = await mcmetaFile.async('string');
    const meta = JSON.parse(content) as {
      pack?: { pack_format?: number; description?: string };
    };

    return {
      packFormat: meta.pack?.pack_format ?? 0,
      description: meta.pack?.description ?? '',
    };
  } catch (error) {
    console.warn('Failed to parse resource pack metadata:', error);
    return null;
  }
}

/**
 * Download a resource pack from a URL
 *
 * @param url - URL to the resource pack ZIP file
 * @returns Extracted block textures
 */
export async function downloadResourcePack(url: string): Promise<Map<string, Uint8Array>> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download resource pack: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/zip') && !contentType.includes('application/octet-stream')) {
    console.warn(`Unexpected content type: ${contentType}`);
  }

  const buffer = await response.arrayBuffer();
  return parseResourcePack(buffer);
}

/**
 * Normalize texture name
 *
 * Handles various naming conventions used in different resource packs
 */
function normalizeTextureName(name: string): string {
  // Remove common suffixes that might differ between packs
  return name
    .toLowerCase()
    .replace(/_normal$/, '')
    .replace(/_specular$/, '')
    .replace(/_n$/, '')
    .replace(/_s$/, '');
}

/**
 * Filter textures by block IDs
 *
 * @param textures - All extracted textures
 * @param blockIds - Block IDs to filter by
 * @returns Filtered textures matching the block IDs
 */
export function filterTexturesByBlockIds(
  textures: Map<string, Uint8Array>,
  blockIds: string[]
): Map<string, Uint8Array> {
  const filtered = new Map<string, Uint8Array>();
  const normalizedBlockIds = new Set(
    blockIds.map((id) => id.replace('minecraft:', '').toLowerCase())
  );

  for (const [name, data] of textures) {
    const normalizedName = name.toLowerCase();

    // Check for exact match or prefix match (for multi-texture blocks)
    const matches = Array.from(normalizedBlockIds).some(
      (blockId) =>
        normalizedName === blockId ||
        normalizedName.startsWith(blockId + '_') ||
        normalizedName === blockId + '_top' ||
        normalizedName === blockId + '_side' ||
        normalizedName === blockId + '_bottom' ||
        normalizedName === blockId + '_front' ||
        normalizedName === blockId + '_back'
    );

    if (matches) {
      filtered.set(name, data);
    }
  }

  return filtered;
}
