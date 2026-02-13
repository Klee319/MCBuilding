import { usePosts } from '../../hooks/usePosts';
import { PostCard } from './PostCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useEffect, useRef } from 'react';

// モックデータ（APIが返すまでのフォールバック）
const mockPosts = [
  {
    id: '1',
    title: '中世風城',
    author: { id: '1', displayName: 'Builder1' },
    likeCount: 128,
    downloadCount: 45,
    structure: {
      id: 's1',
      originalEdition: 'java' as const,
      originalVersion: '1.20.4',
      dimensions: { x: 100, y: 80, z: 100 },
    },
  },
  {
    id: '2',
    title: 'モダンハウス',
    author: { id: '2', displayName: 'Architect99' },
    likeCount: 256,
    downloadCount: 89,
    structure: {
      id: 's2',
      originalEdition: 'java' as const,
      originalVersion: '1.20.4',
      dimensions: { x: 30, y: 15, z: 25 },
    },
  },
  {
    id: '3',
    title: '日本風寺院',
    author: { id: '3', displayName: 'TempleMaster' },
    likeCount: 512,
    downloadCount: 201,
    structure: {
      id: 's3',
      originalEdition: 'bedrock' as const,
      originalVersion: '1.20',
      dimensions: { x: 60, y: 45, z: 60 },
    },
  },
  {
    id: '4',
    title: 'レッドストーン装置',
    author: { id: '4', displayName: 'RedstoneGuru' },
    likeCount: 89,
    downloadCount: 34,
    structure: {
      id: 's4',
      originalEdition: 'java' as const,
      originalVersion: '1.21',
      dimensions: { x: 20, y: 10, z: 15 },
    },
  },
  {
    id: '5',
    title: 'ファンタジー塔',
    author: { id: '5', displayName: 'MagicBuilder' },
    likeCount: 345,
    downloadCount: 120,
    structure: {
      id: 's5',
      originalEdition: 'java' as const,
      originalVersion: '1.20.4',
      dimensions: { x: 40, y: 120, z: 40 },
    },
  },
  {
    id: '6',
    title: '水中都市',
    author: { id: '6', displayName: 'OceanMaster' },
    likeCount: 678,
    downloadCount: 234,
    structure: {
      id: 's6',
      originalEdition: 'java' as const,
      originalVersion: '1.20.4',
      dimensions: { x: 150, y: 60, z: 150 },
    },
  },
];

export function PostGrid() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts();
  const observerRef = useRef<HTMLDivElement>(null);

  // 無限スクロール
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // APIデータまたはモックデータを使用
  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const displayPosts = posts.length > 0 ? posts : mockPosts;

  if (isLoading && posts.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 無限スクロールトリガー */}
      <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
        {isFetchingNextPage && <LoadingSpinner size="sm" />}
      </div>
    </>
  );
}
