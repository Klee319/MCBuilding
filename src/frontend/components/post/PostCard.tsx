import { Link } from 'react-router-dom';

interface PostCardProps {
  post: {
    id: string;
    title: string;
    author: { id: string; displayName: string };
    likeCount: number;
    downloadCount: number;
    structure: {
      id: string;
      originalEdition: string;
      originalVersion: string;
      dimensions: { x: number; y: number; z: number };
    };
  };
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toString();
}

export function PostCard({ post }: PostCardProps) {
  const structure = post.structure;
  const edition = structure?.originalEdition;
  const version = structure?.originalVersion;

  return (
    <Link to={`/post/${post.id}`} className="group">
      <article className="card hover:shadow-md transition-shadow">
        {/* サムネイル */}
        <div className="relative aspect-square bg-gradient-to-br from-green-400 to-blue-500">
          {/* プレースホルダー - 後で3Dサムネイルに置き換え */}
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-6xl">
            ⛏
          </div>

          {/* バッジ */}
          {structure && (
            <div className="absolute top-2 left-2 flex gap-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                edition === 'java'
                  ? 'bg-orange-500 text-white'
                  : 'bg-green-500 text-white'
              }`}>
                {edition === 'java' ? 'Java' : '統合版'}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-800 text-white">
                {version}
              </span>
            </div>
          )}
        </div>

        {/* 情報 */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600">
            {post.title}
          </h3>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
              <span className="text-sm text-gray-600">{post.author.displayName}</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                ♡ {formatNumber(post.likeCount)}
              </span>
              <span className="flex items-center gap-1">
                ⬇ {formatNumber(post.downloadCount)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
