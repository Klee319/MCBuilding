import { apiClient, type ApiResponse } from './client';
import type { StructureOutput, RenderData } from '../types/structure';

export const structuresApi = {
  upload: async (
    file: File,
    metadata: {
      originalEdition: 'java' | 'bedrock';
      originalVersion: string;
    }
  ): Promise<ApiResponse<StructureOutput>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('originalEdition', metadata.originalEdition);
    formData.append('originalVersion', metadata.originalVersion);

    // Do NOT set Content-Type manually - Axios sets it automatically with boundary
    const { data } = await apiClient.post('/structures/upload', formData);
    return data;
  },

  getRenderData: async (id: string): Promise<ApiResponse<RenderData>> => {
    const { data } = await apiClient.get(`/structures/${id}/render-data`);
    return data;
  },

  download: async (
    id: string,
    edition: 'java' | 'bedrock',
    version: string
  ): Promise<Blob> => {
    const { data } = await apiClient.get(`/structures/${id}/download`, {
      params: { edition, version },
      responseType: 'blob',
    });
    return data;
  },
};
