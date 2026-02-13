import { apiClient, type ApiResponse } from './client';
import type { UserOutput } from '../types/user';

export const usersApi = {
  register: async (input: {
    email: string;
    displayName: string;
    password: string;
  }): Promise<ApiResponse<UserOutput>> => {
    const { data } = await apiClient.post('/users/register', input);
    return data;
  },

  login: async (input: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: UserOutput; accessToken: string; refreshToken: string }>> => {
    const { data } = await apiClient.post('/users/login', input);
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<UserOutput>> => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },

  getMe: async (): Promise<ApiResponse<UserOutput>> => {
    const { data } = await apiClient.get('/users/me');
    return data;
  },
};
