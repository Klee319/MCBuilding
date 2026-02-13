import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター: 認証トークン付与 & FormData対応
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // FormDataの場合はContent-Typeを削除（Axiosが自動でboundary付きで設定）
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// レスポンスインターセプター: エラーハンドリング
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
