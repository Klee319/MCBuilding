import { useParams } from 'react-router-dom';

export default function UserProfilePage() {
  const { id: _userId } = useParams();
  void _userId; // TODO: Use userId to fetch user profile data

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* プロフィールヘッダー */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gray-300 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Builder1</h1>
            <p className="text-gray-600 mt-1">Minecraft建築家 / Java版メイン</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-semibold text-gray-900">12</span>
                <span className="text-gray-500 ml-1">投稿</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">256</span>
                <span className="text-gray-500 ml-1">フォロワー</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900">48</span>
                <span className="text-gray-500 ml-1">フォロー中</span>
              </div>
            </div>
          </div>
          <button className="btn-primary">フォロー</button>
        </div>
      </div>

      {/* 投稿一覧 */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">投稿</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gradient-to-br from-green-400 to-blue-500 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
