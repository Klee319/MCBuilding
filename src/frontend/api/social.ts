import { apiClient, type ApiResponse } from './client';

export const socialApi = {
  likePost: async (postId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.post(`/posts/${postId}/like`);
    return data;
  },

  unlikePost: async (postId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete(`/posts/${postId}/like`);
    return data;
  },

  followUser: async (userId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.post(`/users/${userId}/follow`);
    return data;
  },

  unfollowUser: async (userId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete(`/users/${userId}/follow`);
    return data;
  },

  addComment: async (
    postId: string,
    content: string,
    parentCommentId?: string
  ): Promise<ApiResponse<{ id: string }>> => {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, {
      content,
      parentCommentId,
    });
    return data;
  },

  deleteComment: async (_postId: string, commentId: string): Promise<ApiResponse<void>> => {
    // 契約(api.md)に従い、コメントIDのみでエンドポイントを呼び出す
    const { data } = await apiClient.delete(`/comments/${commentId}`);
    return data;
  },
};
