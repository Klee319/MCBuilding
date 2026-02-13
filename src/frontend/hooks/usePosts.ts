import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api/posts';
import { socialApi } from '../api/social';
import { useFilterStore } from '../store/filterStore';
import type { PostFilters } from '../types/post';

export function usePosts(customFilters?: Partial<PostFilters>) {
  const storeFilters = useFilterStore();
  const filters: PostFilters = {
    ...storeFilters,
    ...customFilters,
  };

  return useInfiniteQuery({
    queryKey: ['posts', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await postsApi.search({ ...filters, page: pageParam });
      return {
        posts: response.data || [],
        meta: response.meta,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta) return undefined;
      return lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined;
    },
    initialPageParam: 1,
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID is required');
      const response = await postsApi.getById(postId);
      return response.data;
    },
    enabled: !!postId,
  });
}

export function useUnlistedPost(token: string | undefined) {
  return useQuery({
    queryKey: ['post', 'unlisted', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required');
      const response = await postsApi.getUnlisted(token);
      return response.data;
    },
    enabled: !!token,
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await socialApi.likePost(postId);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previous = queryClient.getQueryData(['post', postId]);

      queryClient.setQueryData(['post', postId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          likeCount: old.likeCount + 1,
        };
      });

      return { previous };
    },
    onError: (_err, postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['post', postId], context.previous);
      }
    },
    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await socialApi.unlikePost(postId);
    },
    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
