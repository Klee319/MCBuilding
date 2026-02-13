import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">MC Structure SNS</h3>
            <p className="text-sm">
              Minecraft建築データを共有しよう
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">リンク</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white">ホーム</Link></li>
              <li><Link to="/upload" className="hover:text-white">投稿する</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">サポート</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">ヘルプ</a></li>
              <li><a href="#" className="hover:text-white">お問い合わせ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3">法的情報</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">利用規約</a></li>
              <li><a href="#" className="hover:text-white">プライバシー</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
          &copy; 2024 MC Structure SNS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
