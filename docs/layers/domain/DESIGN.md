# Domain レイヤ - 設計ドキュメント

## エンティティ一覧

| エンティティ名 | 説明 | 識別子 | 主要属性 | 不変条件 |
|---------------|------|--------|----------|----------|
| Structure | 建築データ | StructureId | dimensions, blockCount, originalEdition | dimensionsは正の整数 |
| Post | 投稿 | PostId | title, visibility, structureId | titleは空文字不可 |
| User | ユーザー | UserId | displayName, email, accountLevel | emailは一意 |
| Comment | コメント | CommentId | content, postId, authorId | contentは1000文字以内 |
| Like | いいね | LikeId | postId, userId | 同一ユーザーは同一投稿に1回のみ |
| Follow | フォロー関係 | FollowId | followerId, followeeId | 自己フォロー禁止 |
| Notification | 通知 | NotificationId | userId, type, isRead | - |

## 値オブジェクト一覧

| 値オブジェクト名 | 説明 | 構成要素 | バリデーションルール |
|-----------------|------|----------|---------------------|
| Edition | Java/Bedrock | value: 'java' \| 'bedrock' | 列挙値のみ |
| Version | MCバージョン | major, minor, patch | 1.12以上 |
| FileFormat | ファイル形式 | value: 'schematic' \| 'litematic' \| 'mcstructure' | 列挙値のみ |
| Visibility | 公開設定 | value: 'public' \| 'private' \| 'unlisted' | 列挙値のみ |
| AccountLevel | アカウントレベル | value: 'guest' \| 'registered' \| 'verified' \| 'premium' | 列挙値のみ |
| Dimensions | 建築サイズ | x, y, z: number | 各値は1以上 |
| UnlistedUrl | 限定公開URL | token: string, expiresAt: Date \| null | tokenは32文字以上 |
| Email | メールアドレス | value: string | RFC 5322準拠 |
| Tag | タグ | value: string | 1〜30文字、半角英数字・ひらがな・カタカナ・漢字 |

## ドメインサービス一覧

| サービス名 | 責務 | 入力 | 出力 | 備考 |
|-----------|------|------|------|------|
| VisibilityService | アクセス可否判定 | Post, User \| null | boolean | 公開設定・限定公開URLの有効期限を考慮 |
| VersionCompatibilityService | バージョン互換性判定 | Version, Version | boolean | 1.12〜最新の範囲 |

## ビジネスルール一覧

| ルールID | ルール名 | 説明 | 適用対象 | 違反時の振る舞い |
|----------|---------|------|----------|-----------------|
| BR-001 | アップロードサイズ制限 | ファイルサイズは100MB以下 | Structure | FileTooLargeError |
| BR-002 | バージョン範囲制限 | 1.12以上のみ対応 | Version | UnsupportedVersionError |
| BR-003 | コメント文字数制限 | 1000文字以内 | Comment | ContentTooLongError |
| BR-004 | いいね重複禁止 | 同一ユーザーは同一投稿に1回のみ | Like | AlreadyLikedError |
| BR-005 | 自己フォロー禁止 | 自分自身をフォロー不可 | Follow | SelfFollowError |
| BR-006 | ダウンロード認証必須 | email登録済みユーザーのみ | User, Download | UnauthorizedDownloadError |
| BR-007 | 限定公開URL有効期限 | 設定された期限を過ぎたらアクセス不可 | Post, UnlistedUrl | ExpiredUrlError |

## 不変条件（Invariants）

### Structure エンティティ

```
- dimensions.x, dimensions.y, dimensions.z >= 1
- blockCount >= 0
- originalEdition は 'java' | 'bedrock' のいずれか
- originalVersion は 1.12 以上
- originalFormat は 'schematic' | 'litematic' | 'mcstructure' のいずれか
```

### Post エンティティ

```
- title.length >= 1 && title.length <= 200
- description.length <= 5000
- visibility は 'public' | 'private' | 'unlisted' のいずれか
- visibility === 'unlisted' の場合、unlistedUrl は必須
- likeCount, downloadCount, commentCount >= 0
- pinnedPostIds.length <= 5（User側の制約）
```

### User エンティティ

```
- displayName.length >= 1 && displayName.length <= 50
- email は有効な形式であること
- accountLevel の昇格順序: guest -> registered -> verified -> premium
- pinnedPostIds は自分の投稿のみ
- pinnedPostIds.length <= 5
```

### Comment エンティティ

```
- content.length >= 1 && content.length <= 1000
- parentCommentId が設定されている場合、同一postId内の既存コメントを参照
- スレッド深度は5まで
```

## ドメインイベント一覧

| イベント名 | トリガー | ペイロード | 購読者の例 |
|-----------|---------|-----------|-----------|
| PostCreated | 投稿作成時 | postId, authorId, structureId | フィード更新、フォロワー通知 |
| PostLiked | いいね時 | postId, userId, authorId | 投稿者への通知 |
| CommentAdded | コメント追加時 | commentId, postId, authorId | 投稿者への通知、返信先への通知 |
| UserFollowed | フォロー時 | followerId, followeeId | フォローされた通知 |
| StructureUploaded | 建築データアップロード時 | structureId, uploaderId | 変換処理の開始 |
| StructureConverted | 変換完了時 | structureId, edition, version | レンダリングデータ生成 |

## 集約設計

```
Post (集約ルート)
├── Structure (エンティティ、1:1)
│   └── Dimensions (値オブジェクト)
├── Visibility (値オブジェクト)
├── UnlistedUrl (値オブジェクト、optional)
└── Tag[] (値オブジェクト)

User (集約ルート)
├── Email (値オブジェクト)
├── AccountLevel (値オブジェクト)
└── PinnedPostIds[] (値オブジェクト)

Comment (集約ルート)
└── parentCommentId (参照、optional)

Like (独立エンティティ)
Follow (独立エンティティ)
Notification (独立エンティティ)
```

## ファクトリ・リポジトリインターフェース

### リポジトリインターフェース（Port）

```typescript
interface StructureRepository {
  findById(id: StructureId): Promise<Structure | null>
  save(structure: Structure): Promise<void>
  delete(id: StructureId): Promise<void>
}

interface PostRepository {
  findById(id: PostId): Promise<Post | null>
  findByUnlistedToken(token: string): Promise<Post | null>
  findByAuthorId(authorId: UserId, options?: PaginationOptions): Promise<Post[]>
  search(query: PostQuery): Promise<PaginatedResult<Post>>
  save(post: Post): Promise<void>
  delete(id: PostId): Promise<void>
}

interface UserRepository {
  findById(id: UserId): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  save(user: User): Promise<void>
  delete(id: UserId): Promise<void>
}

interface CommentRepository {
  findById(id: CommentId): Promise<Comment | null>
  findByPostId(postId: PostId, options?: PaginationOptions): Promise<Comment[]>
  save(comment: Comment): Promise<void>
  delete(id: CommentId): Promise<void>
}
```

## 備考

- 本ドキュメントは Minecraft建築データ共有SNS の Domain レイヤ設計を定義
- エンティティ追加時は不変条件も必ず定義すること
- ビジネスルール追加時は BR-XXX 形式でIDを付与すること
