# Port定義 - Minecraft建築データ共有SNS

本ドキュメントは依存性逆転のためのPort（境界インターフェース）の Single Source of Truth である。

---

## Repository Ports（データ永続化）

### StructureRepositoryPort

```yaml
port:
  name: "StructureRepositoryPort"
  description: "建築データの永続化を担当"
  layer: "usecase → infra"

  dependencies:
    - "Structure"
    - "StructureId"
    - "Edition"
    - "Version"

  methods:
    - name: "findById"
      description: "IDによる建築データ検索"
      parameters:
        - name: "id"
          type: "StructureId"
          required: true
      returns:
        type: "Structure | null"
      errors: []

    - name: "save"
      description: "建築データの保存"
      parameters:
        - name: "structure"
          type: "Structure"
          required: true
      returns:
        type: "Structure"
      errors:
        - code: "STORAGE_ERROR"
          condition: "ストレージへの保存失敗"

    - name: "delete"
      description: "建築データの削除"
      parameters:
        - name: "id"
          type: "StructureId"
          required: true
      returns:
        type: "void"
      errors:
        - code: "NOT_FOUND"
          condition: "指定IDが存在しない"

    - name: "getDownloadUrl"
      description: "ダウンロード用URLの取得"
      parameters:
        - name: "id"
          type: "StructureId"
          required: true
        - name: "edition"
          type: "Edition"
          required: true
        - name: "version"
          type: "Version"
          required: true
      returns:
        type: "string"
        description: "署名付きダウンロードURL"
      errors:
        - code: "NOT_FOUND"
          condition: "指定ID/Edition/Versionが存在しない"
        - code: "VERSION_NOT_SUPPORTED"
          condition: "指定バージョンが未対応"
```

### PostRepositoryPort

```yaml
port:
  name: "PostRepositoryPort"
  description: "投稿の永続化を担当"
  layer: "usecase → infra"

  dependencies:
    - "Post"
    - "PostId"
    - "PostQuery"
    - "PaginatedResult"

  methods:
    - name: "findById"
      description: "IDによる投稿検索"
      parameters:
        - name: "id"
          type: "PostId"
          required: true
      returns:
        type: "Post | null"
      errors: []

    - name: "findByUnlistedUrl"
      description: "限定公開URLによる投稿検索"
      parameters:
        - name: "unlistedUrl"
          type: "string"
          required: true
      returns:
        type: "Post | null"
      errors: []

    - name: "search"
      description: "投稿の検索"
      parameters:
        - name: "query"
          type: "PostQuery"
          required: true
      returns:
        type: "PaginatedResult<Post>"
      errors: []

    - name: "findByAuthor"
      description: "投稿者による投稿検索"
      parameters:
        - name: "authorId"
          type: "UserId"
          required: true
        - name: "includePrivate"
          type: "boolean"
          required: false
          description: "非公開投稿を含むか（本人のみtrue可）"
      returns:
        type: "Post[]"
      errors: []

    - name: "save"
      description: "投稿の保存"
      parameters:
        - name: "post"
          type: "Post"
          required: true
      returns:
        type: "Post"
      errors: []

    - name: "delete"
      description: "投稿の削除"
      parameters:
        - name: "id"
          type: "PostId"
          required: true
      returns:
        type: "void"
      errors:
        - code: "NOT_FOUND"
          condition: "指定IDが存在しない"

    - name: "incrementDownloadCount"
      description: "ダウンロード数をインクリメント"
      parameters:
        - name: "id"
          type: "PostId"
          required: true
      returns:
        type: "void"
      errors: []
```

### UserRepositoryPort

```yaml
port:
  name: "UserRepositoryPort"
  description: "ユーザーの永続化を担当"
  layer: "usecase → infra"

  dependencies:
    - "User"
    - "UserId"

  methods:
    - name: "findById"
      description: "IDによるユーザー検索"
      parameters:
        - name: "id"
          type: "UserId"
          required: true
      returns:
        type: "User | null"
      errors: []

    - name: "findByEmail"
      description: "メールアドレスによるユーザー検索"
      parameters:
        - name: "email"
          type: "string"
          required: true
      returns:
        type: "User | null"
      errors: []

    - name: "save"
      description: "ユーザーの保存"
      parameters:
        - name: "user"
          type: "User"
          required: true
      returns:
        type: "User"
      errors:
        - code: "DUPLICATE_EMAIL"
          condition: "メールアドレスが既に存在"

    - name: "delete"
      description: "ユーザーの削除（関連データも削除）"
      parameters:
        - name: "id"
          type: "UserId"
          required: true
      returns:
        type: "void"
      errors:
        - code: "NOT_FOUND"
          condition: "指定IDが存在しない"
```

### CommentRepositoryPort

```yaml
port:
  name: "CommentRepositoryPort"
  description: "コメントの永続化を担当"
  layer: "usecase → infra"

  dependencies:
    - "Comment"
    - "CommentId"
    - "PostId"

  methods:
    - name: "findById"
      description: "IDによるコメント検索"
      parameters:
        - name: "id"
          type: "CommentId"
          required: true
      returns:
        type: "Comment | null"
      errors: []

    - name: "findByPost"
      description: "投稿に紐づくコメント一覧（スレッド構造）"
      parameters:
        - name: "postId"
          type: "PostId"
          required: true
      returns:
        type: "Comment[]"
        description: "親コメント + 返信のツリー構造"
      errors: []

    - name: "save"
      description: "コメントの保存"
      parameters:
        - name: "comment"
          type: "Comment"
          required: true
      returns:
        type: "Comment"
      errors: []

    - name: "softDelete"
      description: "コメントの論理削除（返信は残す）"
      parameters:
        - name: "id"
          type: "CommentId"
          required: true
      returns:
        type: "void"
      errors:
        - code: "NOT_FOUND"
          condition: "指定IDが存在しない"
```

---

## Gateway Ports（外部サービス連携）

### StructureConverterPort

```yaml
port:
  name: "StructureConverterPort"
  description: "建築データのエディション/バージョン変換を担当"
  layer: "usecase → infra"

  dependencies:
    - "StructureData"
    - "Edition"
    - "Version"
    - "ConversionResult"

  methods:
    - name: "convert"
      description: "建築データを指定エディション/バージョンに変換"
      parameters:
        - name: "source"
          type: "StructureData"
          required: true
          description: "元の建築データ"
        - name: "sourceEdition"
          type: "Edition"
          required: true
        - name: "sourceVersion"
          type: "Version"
          required: true
        - name: "targetEdition"
          type: "Edition"
          required: true
        - name: "targetVersion"
          type: "Version"
          required: true
      returns:
        type: "ConversionResult"
        description: "変換結果（成功データ + 空気化されたブロックリスト）"
      errors:
        - code: "UNSUPPORTED_VERSION"
          condition: "指定バージョンが未対応（1.12未満）"
        - code: "CONVERSION_FAILED"
          condition: "変換処理に失敗"

    - name: "parseStructure"
      description: "建築ファイルをパースしてメタデータ取得"
      parameters:
        - name: "file"
          type: "binary"
          required: true
        - name: "format"
          type: "FileFormat"
          required: true
      returns:
        type: "StructureMetadata"
        description: "サイズ、ブロック数、使用ブロック一覧等"
      errors:
        - code: "INVALID_FORMAT"
          condition: "ファイル形式が不正"
        - code: "PARSE_ERROR"
          condition: "パース処理に失敗"

    - name: "exportStructure"
      description: "構造データを指定されたファイル形式にエクスポート"
      parameters:
        - name: "structureId"
          type: "StructureId"
          required: true
          description: "エクスポート対象の構造データID"
        - name: "targetFormat"
          type: "FileFormat"
          required: true
          description: "出力ファイル形式"
        - name: "targetEdition"
          type: "Edition"
          required: true
        - name: "targetVersion"
          type: "Version"
          required: true
      returns:
        type: "ExportResult"
        description: "エクスポートされたファイルデータ"
      errors:
        - code: "NOT_FOUND"
          condition: "指定IDの構造データが存在しない"
        - code: "UNSUPPORTED_CONVERSION"
          condition: "変換不可能な形式の組み合わせ"
        - code: "EXPORT_FAILED"
          condition: "エクスポート処理に失敗"
```

### RendererDataPort

```yaml
port:
  name: "RendererDataPort"
  description: "3Dレンダリング用データの生成を担当"
  layer: "usecase → infra"

  dependencies:
    - "StructureData"
    - "RenderData"
    - "LodLevel"

  methods:
    - name: "generateRenderData"
      description: "3Dプレビュー用データを生成"
      parameters:
        - name: "structure"
          type: "StructureData"
          required: true
        - name: "lodLevel"
          type: "LodLevel"
          required: false
          description: "LODレベル（省略時は自動判定）"
      returns:
        type: "RenderData"
        description: "WebGL用レンダリングデータ"
      errors:
        - code: "GENERATION_FAILED"
          condition: "データ生成に失敗"

    - name: "applyResourcePack"
      description: "リソースパックを適用したテクスチャ取得"
      parameters:
        - name: "resourcePackUrl"
          type: "string"
          required: true
        - name: "blockIds"
          type: "string[]"
          required: true
          description: "必要なブロックIDリスト"
      returns:
        type: "TextureAtlas"
        description: "テクスチャアトラス"
      errors:
        - code: "INVALID_RESOURCE_PACK"
          condition: "リソースパックが不正"
        - code: "FETCH_FAILED"
          condition: "リソースパック取得に失敗"
```

### NotificationPort

```yaml
port:
  name: "NotificationPort"
  description: "通知の送信を担当"
  layer: "usecase → infra"

  dependencies:
    - "NotificationPayload"
    - "UserId"

  methods:
    - name: "notify"
      description: "ユーザーへの通知を送信"
      parameters:
        - name: "userId"
          type: "UserId"
          required: true
        - name: "payload"
          type: "NotificationPayload"
          required: true
      returns:
        type: "void"
      errors:
        - code: "SEND_FAILED"
          condition: "通知送信に失敗"

    - name: "notifyBulk"
      description: "複数ユーザーへの一括通知"
      parameters:
        - name: "userIds"
          type: "UserId[]"
          required: true
        - name: "payload"
          type: "NotificationPayload"
          required: true
      returns:
        type: "BulkNotificationResult"
      errors: []
```

### EmailPort

```yaml
port:
  name: "EmailPort"
  description: "メール送信を担当"
  layer: "usecase → infra"

  methods:
    - name: "sendVerificationEmail"
      description: "メールアドレス確認メールを送信"
      parameters:
        - name: "email"
          type: "string"
          required: true
        - name: "verificationToken"
          type: "string"
          required: true
      returns:
        type: "void"
      errors:
        - code: "SEND_FAILED"
          condition: "メール送信に失敗"

    - name: "sendPasswordResetEmail"
      description: "パスワードリセットメールを送信"
      parameters:
        - name: "email"
          type: "string"
          required: true
        - name: "resetToken"
          type: "string"
          required: true
      returns:
        type: "void"
      errors:
        - code: "SEND_FAILED"
          condition: "メール送信に失敗"
```

### SmsPort

```yaml
port:
  name: "SmsPort"
  description: "SMS送信を担当（電話認証用）"
  layer: "usecase → infra"

  methods:
    - name: "sendVerificationCode"
      description: "認証コードをSMSで送信"
      parameters:
        - name: "phoneNumber"
          type: "string"
          required: true
        - name: "code"
          type: "string"
          required: true
      returns:
        type: "void"
      errors:
        - code: "INVALID_PHONE_NUMBER"
          condition: "電話番号が不正"
        - code: "SEND_FAILED"
          condition: "SMS送信に失敗"
```

### SpamDetectorPort

```yaml
port:
  name: "SpamDetectorPort"
  description: "スパム検出を担当"
  layer: "usecase → infra"

  methods:
    - name: "checkRateLimit"
      description: "レート制限をチェック"
      parameters:
        - name: "userId"
          type: "UserId"
          required: true
        - name: "action"
          type: "string"
          required: true
          description: "アクション種別（comment, post, etc.）"
      returns:
        type: "RateLimitResult"
        description: "制限状態（allowed: boolean, retryAfter?: number）"
      errors: []

    - name: "checkContent"
      description: "コンテンツの不適切チェック"
      parameters:
        - name: "content"
          type: "string"
          required: true
      returns:
        type: "ContentCheckResult"
        description: "チェック結果（allowed: boolean, reason?: string）"
      errors: []
```

---

## 参照

- DTO定義: `docs/contracts/dtos.md`
- API定義: `docs/contracts/api.md`
- アーキテクチャ概要: `docs/architecture/00_overview.md`
