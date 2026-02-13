import { useState } from 'react';
import { PostGrid } from '../../components/post/PostGrid';
import { SortBar } from './components/SortBar';
import { FilterSidebar } from './components/FilterSidebar';
import { useFilterStore } from '../../store/filterStore';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { sortBy, setSortBy } = useFilterStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">建築ギャラリー</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="btn-secondary lg:hidden"
        >
          フィルタ
        </button>
      </div>

      {/* ソートバー */}
      <SortBar currentSort={sortBy} onSortChange={setSortBy} />

      {/* メインコンテンツ */}
      <div className="flex gap-8">
        {/* フィルタサイドバー (デスクトップ) */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* 投稿グリッド */}
        <div className="flex-1">
          <PostGrid />
        </div>
      </div>

      {/* モバイルフィルタ (モーダル) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">フィルタ</h2>
              <button onClick={() => setIsSidebarOpen(false)}>✕</button>
            </div>
            <FilterSidebar />
          </div>
        </div>
      )}
    </div>
  );
}
