/**
 * Textures API
 *
 * API client for texture-related endpoints.
 */

import { apiClient, type ApiResponse } from './client';
import type { TextureAtlasResponse, MinecraftVersion } from '../types/texture';

/**
 * Versions response from API
 */
interface VersionsResponse {
  readonly latest: string;
  readonly versions: MinecraftVersion[];
}

export const texturesApi = {
  /**
   * Get available Minecraft versions
   */
  getVersions: async (): Promise<ApiResponse<VersionsResponse>> => {
    const { data } = await apiClient.get('/textures/versions');
    return data;
  },

  /**
   * Get texture atlas for vanilla Minecraft
   *
   * @param blockIds - Array of block IDs to include
   * @param version - Minecraft version (optional, defaults to latest)
   */
  getAtlas: async (
    blockIds: string[],
    version?: string
  ): Promise<ApiResponse<TextureAtlasResponse>> => {
    const { data } = await apiClient.post('/textures/atlas', {
      blocks: blockIds,
      version,
    });
    return data;
  },

  /**
   * Get texture atlas from a custom resource pack
   *
   * @param resourcePackUrl - URL to the resource pack ZIP file
   * @param blockIds - Optional array of block IDs to filter
   */
  getResourcePackAtlas: async (
    resourcePackUrl: string,
    blockIds?: string[]
  ): Promise<ApiResponse<TextureAtlasResponse>> => {
    const { data } = await apiClient.post('/textures/resource-pack', {
      resourcePackUrl,
      blockIds,
    });
    return data;
  },

  /**
   * Clear texture cache (for development)
   */
  clearCache: async (): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await apiClient.delete('/textures/cache');
    return data;
  },
};
