import { apiClient, type ApiResponse } from './client';
import type { PostOutput, PostSummary, PostFilters } from '../types/post';

export const postsApi = {
  search: async (filters: PostFilters = {}): Promise<ApiResponse<PostSummary[]>> => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.edition?.length) params.set('edition', filters.edition[0]);
    if (filters.version?.length) params.set('version', filters.version[0]);
    if (filters.tag) params.set('tag', filters.tag);
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 20));
    if (filters.sortBy) params.set('sort', filters.sortBy);

    const { data } = await apiClient.get(`/posts?${params.toString()}`);
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<PostOutput>> => {
    const { data } = await apiClient.get(`/posts/${id}`);
    return data;
  },

  getUnlisted: async (token: string): Promise<ApiResponse<PostOutput>> => {
    const { data } = await apiClient.get(`/posts/unlisted/${token}`);
    return data;
  },

  create: async (input: {
    structureId: string;
    title: string;
    description?: string;
    tags?: string[];
    visibility?: 'public' | 'unlisted' | 'private';
  }): Promise<ApiResponse<PostOutput>> => {
    const { data } = await apiClient.post('/posts', input);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete(`/posts/${id}`);
    return data;
  },
};
