# Interface レイヤ - 設計ドキュメント

## Controller 一覧

| 名前 | エンドポイント | HTTPメソッド | 対応Usecase | 説明 |
|------|---------------|-------------|-------------|------|
| PostController | /api/v1/posts | GET | SearchPosts | 投稿一覧・検索 |
| PostController | /api/v1/posts/:id | GET | GetPostDetail | 投稿詳細 |
| PostController | /api/v1/posts/unlisted/:token | GET | GetPostDetail | 限定公開投稿 |
| PostController | /api/v1/posts | POST | CreatePost | 投稿作成 |
| PostController | /api/v1/posts/:id | PATCH | UpdatePost | 投稿更新 |
| PostController | /api/v1/posts/:id | DELETE | DeletePost | 投稿削除 |
| StructureController | /api/v1/structures/upload | POST | UploadStructure | ファイルアップロード |
| StructureController | /api/v1/structures/:id/download | GET | DownloadStructure | ダウンロード |
| StructureController | /api/v1/structures/:id/render-data | GET | GetRenderData | レンダリングデータ |
| UserController | /api/v1/users/register | POST | RegisterUser | 新規登録 |
| UserController | /api/v1/users/login | POST | LoginUser | ログイン |
| UserController | /api/v1/users/me | GET | GetCurrentUser | 自分の情報 |
| UserController | /api/v1/users/me | PATCH | UpdateProfile | プロフィール更新 |
| UserController | /api/v1/users/:id | GET | GetUserProfile | ユーザー詳細 |
| UserController | /api/v1/users/verify-email | POST | VerifyEmail | メール認証 |
| UserController | /api/v1/users/verify-phone | POST | VerifyPhone | 電話認証 |
| SocialController | /api/v1/posts/:id/like | POST | LikePost | いいね |
| SocialController | /api/v1/posts/:id/like | DELETE | UnlikePost | いいね取消 |
| SocialController | /api/v1/posts/:id/comments | GET | GetComments | コメント一覧 |
| SocialController | /api/v1/posts/:id/comments | POST | AddComment | コメント投稿 |
| SocialController | /api/v1/comments/:id | DELETE | DeleteComment | コメント削除 |
| SocialController | /api/v1/users/:id/follow | POST | FollowUser | フォロー |
| SocialController | /api/v1/users/:id/follow | DELETE | UnfollowUser | フォロー解除 |
| SocialController | /api/v1/reports | POST | ReportContent | 通報 |
| NotificationController | /api/v1/notifications | GET | GetNotifications | 通知一覧 |
| NotificationController | /api/v1/notifications/:id/read | PATCH | MarkNotificationRead | 既読にする |
| EmbedController | /embed/:postId | GET | GetRenderData | 埋め込み用3Dプレビュー |

---

## Presenter 一覧

| 名前 | 対応Controller | 出力形式 | 説明 |
|------|---------------|---------|------|
| PostPresenter | PostController | JSON | 投稿情報のJSON整形 |
| StructurePresenter | StructureController | JSON | 建築データ情報のJSON整形 |
| UserPresenter | UserController | JSON | ユーザー情報のJSON整形 |
| CommentPresenter | SocialController | JSON | コメント情報のJSON整形 |
| NotificationPresenter | NotificationController | JSON | 通知情報のJSON整形 |
| EmbedPresenter | EmbedController | HTML | 埋め込み用HTMLページ生成 |
| ErrorPresenter | 全Controller | JSON | エラーレスポンスの統一整形 |

---

## バリデーションスキーマ

### 投稿関連

```typescript
import { z } from 'zod'

const createPostSchema = z.object({
  structureId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  unlistedExpiry: z.string().datetime().optional(),
  requiredMods: z.array(z.string()).optional()
})

const postQuerySchema = z.object({
  keyword: z.string().optional(),
  edition: z.string().optional(),
  version: z.string().optional(),
  sizeCategory: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  hasRequiredMods: z.boolean().optional(),
  createdWithin: z.enum(['1day', '1week', '1month', 'all']).optional(),
  sortBy: z.enum(['popular', 'newest', 'downloads']).default('popular'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})
```

### 建築データ関連

```typescript
const uploadStructureSchema = z.object({
  originalEdition: z.enum(['java', 'bedrock']),
  originalVersion: z.string().regex(/^1\.(1[2-9]|[2-9]\d)(\.\d+)?$/)
})

const downloadStructureSchema = z.object({
  edition: z.enum(['java', 'bedrock']),
  version: z.string().regex(/^1\.(1[2-9]|[2-9]\d)(\.\d+)?$/)
})
```

### コメント関連

```typescript
const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().nullable().optional()
})
```

---

## エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string        // エラーコード（例: "VALIDATION_ERROR"）
    message: string     // ユーザー向けメッセージ
    details?: Array<{   // 詳細エラー（バリデーションエラー時）
      field: string
      message: string
    }>
  }
}
```

---

## 3Dレンダラーコンポーネント

### WebGLRenderer

- Three.jsベースの3Dレンダリング
- LOD（Level of Detail）制御
- カメラ操作（回転、ズーム、パン）
- 自動回転オプション

### ResourcePackLoader

- バニラブロックテクスチャのロード
- ユーザー指定リソースパックの適用
- テクスチャアトラス生成

---

## ファイル構成

```
src/interface/
├── controllers/
│   ├── PostController.ts
│   ├── StructureController.ts
│   ├── UserController.ts
│   ├── SocialController.ts
│   ├── NotificationController.ts
│   ├── EmbedController.ts
│   └── index.ts
├── presenters/
│   ├── PostPresenter.ts
│   ├── StructurePresenter.ts
│   ├── UserPresenter.ts
│   ├── CommentPresenter.ts
│   ├── NotificationPresenter.ts
│   ├── EmbedPresenter.ts
│   ├── ErrorPresenter.ts
│   └── index.ts
├── validators/
│   ├── postSchemas.ts
│   ├── structureSchemas.ts
│   ├── userSchemas.ts
│   ├── socialSchemas.ts
│   └── index.ts
├── renderers/
│   ├── WebGLRenderer.ts
│   ├── ResourcePackLoader.ts
│   ├── LODManager.ts
│   └── index.ts
└── routes/
    ├── postRoutes.ts
    ├── structureRoutes.ts
    ├── userRoutes.ts
    ├── socialRoutes.ts
    ├── notificationRoutes.ts
    ├── embedRoutes.ts
    └── index.ts
```

---

## 設計チェックリスト

- [ ] Controllerにビジネスロジックが混入していないか
- [ ] 入力バリデーションはzodスキーマで定義されているか
- [ ] レスポンスに機密情報が含まれていないか
- [ ] エラーレスポンスは統一された形式か
- [ ] Infraレイヤへの直接依存がないか
- [ ] 3Dレンダラーがモバイル30fps要件を満たすか
