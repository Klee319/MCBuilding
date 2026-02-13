import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { usePost, useLikePost } from '../../hooks/usePosts';
import { StructureViewer } from '../../components/viewer/StructureViewer';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

// モックデータ（APIが返すまでのフォールバック）
const mockPost = {
  id: '1',
  title: '中世風城',
  description: '中世ヨーロッパ風の城です。細部までこだわって作りました。\n\n特徴:\n- 高さ80ブロックの塔\n- 内装完備\n- 城壁と堀',
  author: { id: '1', displayName: 'Builder1' },
  likeCount: 128,
  downloadCount: 45,
  commentCount: 0,
  tags: ['城', '中世', 'ファンタジー'],
  requiredMods: [],
  visibility: 'public' as const,
  unlistedUrl: null,
  structure: {
    id: 's1',
    originalEdition: 'java' as const,
    originalVersion: '1.20.4',
    dimensions: { x: 100, y: 80, z: 100 },
    blockCount: 245000,
  },
  createdAt: '2024-01-15',
  updatedAt: '2024-01-15',
};

export default function PostDetailPage() {
  const { id } = useParams();
  const { data: post, isLoading, error } = usePost(id);
  const likeMutation = useLikePost();
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);

  // APIデータまたはモックデータを使用
  const displayPost = post || mockPost;

  const handleLike = () => {
    if (!isAuthenticated) {
      alert('いいねするにはログインが必要です');
      return;
    }
    if (id) {
      likeMutation.mutate(id);
      setIsLiked(!isLiked);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">投稿が見つかりません</h1>
        <p className="text-gray-600 mt-2">この投稿は存在しないか、削除された可能性があります。</p>
        <Link to="/" className="btn-primary mt-4 inline-block">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* メインコンテンツ */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        {/* 左: 3Dビューワー (3/5) */}
        <div className="lg:col-span-3">
          <div className="aspect-square lg:aspect-[4/3] rounded-lg overflow-hidden">
            <StructureViewer
              structureId={displayPost.structure.id}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* 右: 情報サイドバー (2/5) */}
        <div className="lg:col-span-2 mt-6 lg:mt-0">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* 作者情報 */}
            <div className="flex items-center gap-3">
              <Link to={`/user/${displayPost.author.id}`}>
                <div className="w-12 h-12 bg-gray-300 rounded-full" />
              </Link>
              <div className="flex-1">
                <Link
                  to={`/user/${displayPost.author.id}`}
                  className="font-semibold text-gray-900 hover:text-primary-600"
                >
                  {displayPost.author.displayName}
                </Link>
              </div>
              <button className="btn-secondary text-sm">
                フォロー
              </button>
            </div>

            {/* アクションバー */}
            <div className="flex items-center gap-4 py-3 border-y">
              <button
                onClick={handleLike}
                disabled={likeMutation.isPending}
                className={`flex items-center gap-2 text-lg transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <span className="text-2xl">{isLiked ? '♥' : '♡'}</span>
                <span className="font-semibold">
                  {displayPost.likeCount + (isLiked ? 1 : 0)}
                </span>
              </button>

              <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
                <span className="text-xl">⬇</span>
                <span>ダウンロード</span>
              </button>

              <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 ml-auto">
                <span className="text-xl">⎘</span>
              </button>
            </div>

            {/* タイトルと説明 */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{displayPost.title}</h1>
              {displayPost.description && (
                <p className="mt-3 text-gray-700 whitespace-pre-wrap">
                  {displayPost.description}
                </p>
              )}
            </div>

            {/* タグ */}
            {displayPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayPost.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/?keyword=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* 建築データ情報 */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">エディション</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  displayPost.structure.originalEdition === 'java'
                    ? 'bg-orange-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {displayPost.structure.originalEdition === 'java' ? 'Java版' : '統合版'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">バージョン</span>
                <span className="text-gray-900">{displayPost.structure.originalVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">サイズ</span>
                <span className="text-gray-900">
                  {displayPost.structure.dimensions.x} × {displayPost.structure.dimensions.y} × {displayPost.structure.dimensions.z}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ブロック数</span>
                <span className="text-gray-900">
                  {displayPost.structure.blockCount?.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">投稿日</span>
                <span className="text-gray-900">
                  {new Date(displayPost.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* コメントセクション */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          コメント ({displayPost.commentCount})
        </h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isAuthenticated ? (
            <>
              <textarea
                placeholder="コメントを入力..."
                className="input h-24 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button className="btn-primary">送信</button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-4">
              コメントするには
              <Link to="/login" className="text-primary-600 hover:underline ml-1">
                ログイン
              </Link>
              してください
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
