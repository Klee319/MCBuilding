/**
 * Texture Routes
 *
 * API endpoints for texture atlas generation.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import {
  downloadBlockTextures,
  getAvailableVersions,
  getLatestVersion,
  getTextureNamesForBlocks,
} from '../../renderer/minecraft-asset-downloader.js';
import {
  downloadResourcePack,
  filterTexturesByBlockIds,
} from '../../renderer/resource-pack-parser.js';
import {
  generateTextureAtlas,
  createMissingTexture,
} from '../../renderer/texture-atlas-generator.js';

/**
 * Cache for generated atlases
 */
interface AtlasCache {
  readonly imageBase64: string;
  readonly width: number;
  readonly height: number;
  readonly uvMapping: Record<string, unknown>;
  readonly timestamp: number;
}

const atlasCache = new Map<string, AtlasCache>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Body schema for atlas request (POST)
 */
const atlasBodySchema = z.object({
  version: z.string().optional(),
  blocks: z.array(z.string()).min(1, 'ブロックIDを指定してください'),
});

/**
 * Body schema for resource pack request
 */
const resourcePackBodySchema = z.object({
  resourcePackUrl: z.string().url(),
  blockIds: z.array(z.string()).optional(),
});

/**
 * Create texture routes
 */
export function createTextureRoutes(): Hono {
  const app = new Hono();

  /**
   * GET /versions
   * Get available Minecraft versions
   */
  app.get('/versions', async (c) => {
    try {
      const versions = await getAvailableVersions(false);

      return c.json({
        success: true,
        data: {
          latest: await getLatestVersion(),
          versions: versions.slice(0, 20), // Return only recent versions
        },
      });
    } catch (error) {
      console.error('Failed to get versions:', error);
      return c.json(
        {
          success: false,
          error: {
            code: 'VERSION_FETCH_ERROR',
            message: 'Minecraftバージョンの取得に失敗しました',
          },
        },
        500
      );
    }
  });

  /**
   * POST /atlas
   * Generate texture atlas for vanilla Minecraft
   *
   * Body:
   * - version: Minecraft version (default: latest)
   * - blocks: Array of block IDs
   */
  app.post('/atlas', zValidator('json', atlasBodySchema), async (c) => {
    try {
      const { version: requestedVersion, blocks } = c.req.valid('json');

      // Get version (default to latest)
      const version = requestedVersion || (await getLatestVersion());

      // Block IDs from body (already validated as non-empty array)
      const blockIds = blocks;

      // Check cache
      const cacheKey = `vanilla:${version}:${blockIds.sort().join(',')}`;
      const cached = atlasCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_TTL) {
        return c.json({
          success: true,
          data: {
            atlasImage: cached.imageBase64,
            width: cached.width,
            height: cached.height,
            uvMapping: cached.uvMapping,
            version,
            isCustomResourcePack: false,
          },
        });
      }

      // Get texture names needed for the blocks
      const textureNames = getTextureNamesForBlocks(blockIds);

      // Download textures
      const textures = await downloadBlockTextures(version, textureNames);

      if (textures.size === 0) {
        // Add missing texture as fallback
        const missingTexture = await createMissingTexture();
        textures.set('missing', new Uint8Array(missingTexture));
      }

      // Generate atlas
      const atlas = await generateTextureAtlas(textures, blockIds);

      // Convert to base64
      const base64Image = atlas.imageBuffer.toString('base64');

      // Cache the result
      atlasCache.set(cacheKey, {
        imageBase64: base64Image,
        width: atlas.width,
        height: atlas.height,
        uvMapping: atlas.uvMapping,
        timestamp: now,
      });

      return c.json({
        success: true,
        data: {
          atlasImage: base64Image,
          width: atlas.width,
          height: atlas.height,
          uvMapping: atlas.uvMapping,
          version,
          isCustomResourcePack: false,
        },
      });
    } catch (error) {
      console.error('Failed to generate texture atlas:', error);
      return c.json(
        {
          success: false,
          error: {
            code: 'ATLAS_GENERATION_ERROR',
            message: 'テクスチャアトラスの生成に失敗しました',
          },
        },
        500
      );
    }
  });

  /**
   * POST /resource-pack
   * Generate texture atlas from custom resource pack
   */
  app.post(
    '/resource-pack',
    zValidator('json', resourcePackBodySchema),
    async (c) => {
      try {
        const { resourcePackUrl, blockIds } = c.req.valid('json');

        // Check cache
        const cacheKey = `custom:${resourcePackUrl}:${(blockIds || []).sort().join(',')}`;
        const cached = atlasCache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_TTL) {
          return c.json({
            success: true,
            data: {
              atlasImage: cached.imageBase64,
              width: cached.width,
              height: cached.height,
              uvMapping: cached.uvMapping,
              version: 'custom',
              isCustomResourcePack: true,
            },
          });
        }

        // Download and parse resource pack
        let textures = await downloadResourcePack(resourcePackUrl);

        // Filter by block IDs if provided
        if (blockIds && blockIds.length > 0) {
          textures = filterTexturesByBlockIds(textures, blockIds);
        }

        if (textures.size === 0) {
          // Add missing texture as fallback
          const missingTexture = await createMissingTexture();
          textures.set('missing', new Uint8Array(missingTexture));
        }

        // Generate atlas
        const atlas = await generateTextureAtlas(
          textures,
          blockIds || Array.from(textures.keys())
        );

        // Convert to base64
        const base64Image = atlas.imageBuffer.toString('base64');

        // Cache the result
        atlasCache.set(cacheKey, {
          imageBase64: base64Image,
          width: atlas.width,
          height: atlas.height,
          uvMapping: atlas.uvMapping,
          timestamp: now,
        });

        return c.json({
          success: true,
          data: {
            atlasImage: base64Image,
            width: atlas.width,
            height: atlas.height,
            uvMapping: atlas.uvMapping,
            version: 'custom',
            isCustomResourcePack: true,
          },
        });
      } catch (error) {
        console.error('Failed to process resource pack:', error);
        return c.json(
          {
            success: false,
            error: {
              code: 'RESOURCE_PACK_ERROR',
              message: 'リソースパックの処理に失敗しました',
            },
          },
          500
        );
      }
    }
  );

  /**
   * DELETE /cache
   * Clear texture cache (for development/debugging)
   */
  app.delete('/cache', (c) => {
    atlasCache.clear();
    return c.json({ success: true, message: 'キャッシュをクリアしました' });
  });

  return app;
}
