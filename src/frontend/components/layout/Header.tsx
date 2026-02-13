import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MC</span>
            </div>
            <span className="font-bold text-xl text-gray-900 hidden sm:block">
              Structure SNS
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-lg mx-4 hidden md:block">
            <input
              type="search"
              placeholder="建築を検索..."
              className="input"
            />
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/upload" className="btn-primary">
                  投稿する
                </Link>
                <Link to={`/user/${user?.id}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  ログイン
                </Link>
                <Link to="/register" className="btn-primary">
                  登録
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
