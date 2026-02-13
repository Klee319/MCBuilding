# Frontend Architecture Design - MC Structure SNS

## 1. 概要

Minecraft建築データ共有SNSのフロントエンドアーキテクチャ設計。

### 1.1 設計目標

1. **ギャラリースタイル表示**: 多様な投稿を見やすいグリッドレイアウトで表示
2. **Instagram風詳細ページ**: 直感的なUI/UXで3Dビューワーと情報を提示
3. **モバイルファースト**: レスポンシブデザインで全デバイス対応
4. **高パフォーマンス**: 3Dレンダリングを含む大量コンテンツの効率的な表示

---

## 2. 技術スタック

| カテゴリ | 技術 | 採用理由 |
|---------|------|---------|
| フレームワーク | React 18 | Concurrent Rendering、Suspense対応 |
| 言語 | TypeScript 5 | 型安全性、IDE補完 |
| ビルドツール | Vite 5 | 高速HMR、ESBuild統合 |
| ルーティング | React Router 6 | 宣言的ルーティング |
| サーバー状態 | TanStack Query 5 | キャッシュ管理、楽観的更新 |
| UI状態 | Zustand 4 | 軽量、シンプルAPI |
| フォーム | React Hook Form + Zod | バリデーション統合 |
| スタイリング | Tailwind CSS 3 | ユーティリティファースト |
| 3Dレンダリング | Three.js | 既存レンダラー互換 |

---

## 3. プロジェクト構造

```
src/frontend/
├── app/                    # アプリケーションエントリ
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
│
├── pages/                  # ページコンポーネント
│   ├── home/
│   │   ├── HomePage.tsx
│   │   └── components/
│   ├── post/
│   │   ├── PostDetailPage.tsx
│   │   └── components/
│   ├── user/
│   ├── upload/
│   └── auth/
│
├── components/             # 共通UIコンポーネント
│   ├── ui/                # 基礎UIパーツ (Button, Input, Modal)
│   ├── layout/            # レイアウト (Header, Footer, Sidebar)
│   ├── post/              # 投稿関連 (PostCard, PostGrid)
│   ├── viewer/            # 3Dビューワー
│   ├── comment/           # コメント
│   └── user/              # ユーザー
│
├── hooks/                  # カスタムフック
├── api/                    # APIクライアント
├── store/                  # Zustand状態管理
├── types/                  # TypeScript型定義
├── utils/                  # ユーティリティ
└── styles/                 # グローバルスタイル
```

---

## 4. ルーティング設計

| パス | ページ | 認証 | 説明 |
|------|--------|------|------|
| `/` | HomePage | 不要 | ギャラリービュー |
| `/post/:id` | PostDetailPage | 不要 | 投稿詳細（Instagram風） |
| `/post/unlisted/:token` | PostDetailPage | 不要 | 限定公開投稿 |
| `/user/:id` | UserProfilePage | 不要 | ユーザープロフィール |
| `/upload` | UploadPage | 必須 | 建築データアップロード |
| `/login` | LoginPage | 不要 | ログイン |
| `/register` | RegisterPage | 不要 | 新規登録 |
| `/settings` | SettingsPage | 必須 | アカウント設定 |
| `/notifications` | NotificationsPage | 必須 | 通知一覧 |

---

## 5. コンポーネント設計

### 5.1 コンポーネント階層

```
App
├── Header (logo, nav, search, user menu)
├── Routes
│   ├── HomePage
│   │   ├── SortBar (人気順/新着順/DL数順)
│   │   ├── FilterSidebar (edition, version, size, tags)
│   │   └── PostGrid
│   │       └── PostCard (multiple)
│   │           ├── StructureThumbnail
│   │           ├── Title
│   │           ├── AuthorInfo
│   │           ├── Stats (likes, downloads)
│   │           └── Badges (edition, version)
│   │
│   ├── PostDetailPage (Instagram風)
│   │   ├── StructureViewer (3D, 60%幅)
│   │   ├── PostInfoSidebar (40%幅)
│   │   │   ├── AuthorInfo + FollowButton
│   │   │   ├── ActionBar (like, download, share, bookmark)
│   │   │   ├── Title + Description
│   │   │   ├── Tags
│   │   │   └── StructureInfo (dimensions, block count)
│   │   ├── CommentSection
│   │   └── RelatedPosts
│   │
│   ├── UserProfilePage
│   ├── UploadPage
│   ├── LoginPage
│   └── RegisterPage
│
├── MobileNav (モバイル用ボトムナビ)
└── Footer
```

### 5.2 ギャラリービュー (HomePage)

**PostCard** - 投稿カード
- サムネイル（3Dプレビュー or 静止画）
- タイトル
- 作者アバター・名前
- いいね数・DL数
- Edition/Versionバッジ

**SortBar** - ソートオプション
- 人気順（いいね数）
- 新着順（投稿日時）
- DL数順

**FilterSidebar** - フィルタ
- エディション（Java/統合版）
- バージョン
- サイズ（小/中/大/特大）
- 投稿期間
- 前提MOD有無

**PostGrid** - グリッドレイアウト
- 無限スクロール
- レスポンシブ列数（1/2/3/4列）

### 5.3 投稿詳細ページ (Instagram風)

**デスクトップレイアウト**
```
┌─────────────────────────────────────────────────┐
│                    Header                        │
├─────────────────────────┬───────────────────────┤
│                         │  Author + Follow      │
│                         ├───────────────────────┤
│    3D Viewer            │  ♡ Like  ⬇ DL  Share │
│    (60%)                ├───────────────────────┤
│                         │  Title                │
│                         │  Description          │
│                         ├───────────────────────┤
│                         │  #tag1 #tag2 #tag3    │
│                         ├───────────────────────┤
│                         │  Edition: Java        │
│                         │  Version: 1.20.4      │
│                         │  Size: 100x50x100     │
├─────────────────────────┴───────────────────────┤
│                  Comments                        │
├─────────────────────────────────────────────────┤
│                Related Posts                     │
└─────────────────────────────────────────────────┘
```

**モバイルレイアウト** - 縦並び

---

## 6. 状態管理設計

### 6.1 状態の分類

| 種類 | ライブラリ | 用途 |
|------|-----------|------|
| サーバー状態 | TanStack Query | 投稿、ユーザー、コメント |
| クライアント状態 | Zustand | 認証、UI、フィルタ、ビューワー |
| フォーム状態 | React Hook Form | ログイン、アップロード、コメント |

### 6.2 Zustand ストア

**authStore** - 認証状態
- user, accessToken, refreshToken
- login(), logout(), updateUser()

**uiStore** - UI状態
- isSidebarOpen, isLoginModalOpen, theme, toasts

**filterStore** - フィルタ状態
- keyword, edition, version, sizeCategory, sortBy
- resetFilters()

**viewerStore** - ビューワー状態
- renderState, quality, selectedBlock
- updateCamera(), setQuality(), resetCamera()

---

## 7. API統合

### 7.1 APIクライアント (Axios)

- ベースURL設定
- 認証トークン自動付与
- トークンリフレッシュ処理
- エラーハンドリング

### 7.2 カスタムフック

```typescript
// 投稿一覧（無限スクロール）
usePosts(filters) → useInfiniteQuery

// 投稿詳細
usePost(postId) → useQuery

// いいね（楽観的更新）
useLikePost() → useMutation

// コメント追加
useAddComment() → useMutation
```

---

## 8. 3Dビューワー統合

既存の `src/infra/renderer/` を統合:

```typescript
// useViewer Hook
function useViewer({ structureId, canvas, quality }) {
  // WebGLRendererAdapter を使用
  // カメラ操作、ブロック選択、品質設定
}
```

**機能**:
- 構造物の3D表示
- マウス/タッチでのカメラ操作
- クリックでブロック選択・情報表示
- 品質設定（影、AO、アンチエイリアス）

---

## 9. レスポンシブデザイン

### ブレークポイント

| サイズ | 幅 | グリッド列数 |
|--------|-----|-------------|
| sm | 640px | 2列 |
| md | 768px | 3列 |
| lg | 1024px | 4列 |
| xl | 1280px | 4列 |

### モバイル対応

- ボトムナビゲーション
- タッチ操作対応
- スワイプジェスチャー

---

## 10. 実装フェーズ

### Phase 1: 基盤構築（1週間）
- Viteプロジェクト初期化
- TypeScript/Tailwind設定
- React Router/TanStack Query設定
- ディレクトリ構造作成

### Phase 2: ギャラリービュー（1.5週間）
- PostCard, PostGrid
- SortBar, FilterSidebar
- 無限スクロール
- モックデータ表示

### Phase 3: API統合（1週間）
- APIクライアント
- 認証フロー
- データ取得・表示

### Phase 4: 投稿詳細ページ（1.5週間）
- Instagram風レイアウト
- PostInfoSidebar
- ActionBar
- CommentSection

### Phase 5: 3Dビューワー統合（2週間）
- StructureViewer
- useViewerフック
- カメラコントロール
- パフォーマンス最適化

### Phase 6: 認証・アップロード（1.5週間）
- Login/RegisterPage
- UploadPage
- ファイルアップロードUI

### Phase 7: 仕上げ（1週間）
- レスポンシブ調整
- アクセシビリティ
- パフォーマンス最適化
- E2Eテスト

---

## 11. 依存関係

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "three": "^0.160.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/three": "^0.160.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 12. 関連ドキュメント

- [3Dレンダラー設計](./3d-renderer-design.md)
- [API契約](../contracts/api.md)
- [DTO定義](../contracts/dtos.md)
