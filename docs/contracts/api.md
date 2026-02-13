# API定義 - Minecraft建築データ共有SNS

本ドキュメントは外部公開APIの Single Source of Truth である。

---

## 概要

| API種別 | 用途 | 認証 |
|---------|------|------|
| REST API | 標準的なCRUD操作 | Bearer Token |
| Embed API | 外部サイト埋め込み | 不要（CORS制限） |

---

## REST API エンドポイント一覧

### 投稿（Posts）

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | /api/v1/posts | 投稿一覧・検索 | 不要 |
| GET | /api/v1/posts/:id | 投稿詳細 | 不要 |
| GET | /api/v1/posts/unlisted/:token | 限定公開投稿 | 不要 |
| POST | /api/v1/posts | 投稿作成 | 必須 |
| PATCH | /api/v1/posts/:id | 投稿更新 | 必須（本人のみ） |
| DELETE | /api/v1/posts/:id | 投稿削除 | 必須（本人のみ） |

### 建築データ（Structures）

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | /api/v1/structures/upload | ファイルアップロード | 必須 |
| GET | /api/v1/structures/:id/download | ダウンロード | 必須 |
| GET | /api/v1/structures/:id/render-data | レンダリングデータ | 不要 |

### ユーザー（Users）

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | /api/v1/users/register | 新規登録 | 不要 |
| POST | /api/v1/users/login | ログイン | 不要 |
| GET | /api/v1/users/me | 自分の情報 | 必須 |
| PATCH | /api/v1/users/me | プロフィール更新 | 必須 |
| DELETE | /api/v1/users/me | アカウント削除 | 必須 |
| GET | /api/v1/users/:id | ユーザー詳細 | 不要 |
| POST | /api/v1/users/verify-email | メール認証 | 不要 |
| POST | /api/v1/users/verify-phone | 電話認証 | 必須 |

### ソーシャル（Social）

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | /api/v1/posts/:id/like | いいね | 必須 |
| DELETE | /api/v1/posts/:id/like | いいね取消 | 必須 |
| GET | /api/v1/posts/:id/comments | コメント一覧 | 不要 |
| POST | /api/v1/posts/:id/comments | コメント投稿 | 必須 |
| DELETE | /api/v1/comments/:id | コメント削除 | 必須（本人のみ） |
| POST | /api/v1/users/:id/follow | フォロー | 必須 |
| DELETE | /api/v1/users/:id/follow | フォロー解除 | 必須 |
| POST | /api/v1/reports | 通報 | 必須 |

### 通知（Notifications）

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | /api/v1/notifications | 通知一覧 | 必須 |
| PATCH | /api/v1/notifications/:id/read | 既読にする | 必須 |

---

## 主要エンドポイント詳細

### POST /api/v1/structures/upload

```yaml
endpoint:
  path: "/api/v1/structures/upload"
  method: "POST"
  summary: "建築データファイルをアップロード"
  description: |
    .schematic/.litematic/.mcstructure ファイルをアップロードし、
    自動でJava↔統合版の相互変換を行う。
  tags: ["Structures"]

  authentication:
    required: true
    type: "Bearer"

  requestBody:
    contentType: "multipart/form-data"
    fields:
      - name: "file"
        type: "binary"
        required: true
        description: "建築データファイル（100MB以下）"
      - name: "originalEdition"
        type: "string"
        required: true
        description: "元のエディション（java/bedrock）"
      - name: "originalVersion"
        type: "string"
        required: true
        description: "元のバージョン（1.12以上）"

  responses:
    - status: 201
      description: "アップロード成功"
      schema: "StructureOutput"
    - status: 400
      description: "バリデーションエラー"
      errors:
        - code: "INVALID_FORMAT"
          message: "対応形式は .schematic / .litematic / .mcstructure です"
        - code: "FILE_TOO_LARGE"
          message: "ファイルサイズが上限（100MB）を超えています"
        - code: "UNSUPPORTED_VERSION"
          message: "1.12以上のバージョンを指定してください"
    - status: 401
      description: "認証エラー"
```

### GET /api/v1/structures/:id/download

```yaml
endpoint:
  path: "/api/v1/structures/:id/download"
  method: "GET"
  summary: "建築データをダウンロード"
  description: "指定エディション/バージョンの建築データをダウンロード"
  tags: ["Structures"]

  authentication:
    required: true
    type: "Bearer"

  parameters:
    path:
      - name: "id"
        type: "string"
        required: true
        description: "建築データID"
    query:
      - name: "edition"
        type: "string"
        required: true
        description: "ダウンロードするエディション（java/bedrock）"
      - name: "version"
        type: "string"
        required: true
        description: "ダウンロードするバージョン"

  responses:
    - status: 200
      description: "ダウンロードURL（署名付き、5分間有効）"
      schema:
        type: "object"
        properties:
          downloadUrl:
            type: "string"
            description: "署名付きダウンロードURL"
    - status: 401
      description: "認証エラー"
    - status: 404
      description: "建築データが見つからない"
```

### GET /api/v1/posts

```yaml
endpoint:
  path: "/api/v1/posts"
  method: "GET"
  summary: "投稿一覧・検索"
  description: "公開投稿を検索・フィルタして取得"
  tags: ["Posts"]

  authentication:
    required: false

  parameters:
    query:
      - name: "keyword"
        type: "string"
        required: false
        description: "キーワード検索（タイトル/説明/タグ）"
      - name: "edition"
        type: "string"
        required: false
        description: "エディションフィルタ（java,bedrock）"
      - name: "version"
        type: "string"
        required: false
        description: "バージョンフィルタ（カンマ区切り）"
      - name: "sizeCategory"
        type: "string"
        required: false
        description: "サイズカテゴリ（small,medium,large,xlarge）"
      - name: "hasRequiredMods"
        type: "boolean"
        required: false
        description: "前提MODあり/なし"
      - name: "createdWithin"
        type: "string"
        required: false
        description: "投稿期間（1day,1week,1month,all）"
      - name: "sortBy"
        type: "string"
        required: false
        description: "ソート基準（popular,newest,downloads）"
        default: "popular"
      - name: "page"
        type: "integer"
        required: false
        default: 1
      - name: "limit"
        type: "integer"
        required: false
        default: 20
        max: 100

  responses:
    - status: 200
      description: "成功"
      schema: "PaginatedResult<PostOutput>"
```

### POST /api/v1/posts/:id/comments

```yaml
endpoint:
  path: "/api/v1/posts/:id/comments"
  method: "POST"
  summary: "コメント投稿"
  description: "投稿にコメント（または返信）を投稿"
  tags: ["Social"]

  authentication:
    required: true
    type: "Bearer"

  parameters:
    path:
      - name: "id"
        type: "string"
        required: true
        description: "投稿ID"

  requestBody:
    contentType: "application/json"
    schema: "CreateCommentInput"
    example: |
      {
        "content": "素晴らしい建築ですね！",
        "parentCommentId": null
      }

  responses:
    - status: 201
      description: "コメント投稿成功"
      schema: "CommentOutput"
    - status: 400
      description: "バリデーションエラー"
      errors:
        - code: "CONTENT_TOO_LONG"
          message: "コメントは1000文字以内で入力してください"
        - code: "INAPPROPRIATE_CONTENT"
          message: "このコメントは投稿できません"
    - status: 429
      description: "レート制限"
      errors:
        - code: "RATE_LIMITED"
          message: "投稿間隔が短すぎます。しばらくお待ちください"
```

---

## Embed API

### GET /embed/:postId

```yaml
endpoint:
  path: "/embed/:postId"
  method: "GET"
  summary: "埋め込み用3Dプレビュー"
  description: |
    外部サイトに埋め込むためのiframe用エンドポイント。
    認証不要、CORS制限で保護。
  tags: ["Embed"]

  authentication:
    required: false

  parameters:
    path:
      - name: "postId"
        type: "string"
        required: true
        description: "投稿ID"
    query:
      - name: "width"
        type: "integer"
        required: false
        default: 600
      - name: "height"
        type: "integer"
        required: false
        default: 400
      - name: "autoRotate"
        type: "boolean"
        required: false
        default: true

  responses:
    - status: 200
      description: "3Dプレビューを含むHTMLページ"
      contentType: "text/html"
    - status: 404
      description: "投稿が見つからないか、埋め込み不可"
```

### 埋め込みコード例

```html
<iframe
  src="https://example.com/embed/post_01HXYZ456DEF?width=600&height=400&autoRotate=true"
  width="600"
  height="400"
  frameborder="0"
  allowfullscreen>
</iframe>
```

---

## エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "fieldName",
        "message": "フィールド固有のエラー"
      }
    ]
  }
}
```

### 共通エラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証が必要 |
| FORBIDDEN | 403 | 権限がない |
| NOT_FOUND | 404 | リソースが存在しない |
| VALIDATION_ERROR | 400 | 入力値が不正 |
| RATE_LIMITED | 429 | レート制限 |
| INTERNAL_ERROR | 500 | サーバーエラー |

---

## 認証

### Bearer Token

```
Authorization: Bearer <access_token>
```

- トークンは `/api/v1/users/login` で取得
- 有効期限: 1時間
- リフレッシュトークンで更新可能

---

## 参照

- DTO定義: `docs/contracts/dtos.md`
- Port定義: `docs/contracts/ports.md`
- 要件定義書: `docs/requirements.md`
