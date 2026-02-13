# Usecase Layer - 目標と責務

## 概要

Usecaseレイヤは、Minecraft建築データ共有SNSのアプリケーション固有ビジネスロジックを実装する。ユーザーの意図（ユースケース）を実現するためのオーケストレーションを担当する。

---

## 責務

### ユースケースの実装

| UseCase | 説明 | 関連Port |
|---------|------|----------|
| UploadStructure | 建築データアップロード＋自動変換 | StructureRepositoryPort, StructureConverterPort |
| CreatePost | 投稿作成 | PostRepositoryPort |
| UpdatePost | 投稿編集 | PostRepositoryPort |
| DeletePost | 投稿削除 | PostRepositoryPort, StructureRepositoryPort |
| SearchPosts | 投稿検索 | PostRepositoryPort |
| DownloadStructure | 建築データダウンロード | StructureRepositoryPort, PostRepositoryPort |
| RegisterUser | ユーザー登録 | UserRepositoryPort, EmailPort |
| VerifyEmail | メール認証 | UserRepositoryPort |
| VerifyPhone | 電話認証 | UserRepositoryPort, SmsPort |
| LikePost | いいね | PostRepositoryPort, NotificationPort |
| UnlikePost | いいね取消 | PostRepositoryPort |
| AddComment | コメント追加 | CommentRepositoryPort, SpamDetectorPort, NotificationPort |
| DeleteComment | コメント削除 | CommentRepositoryPort |
| FollowUser | フォロー | UserRepositoryPort, NotificationPort |
| UnfollowUser | フォロー解除 | UserRepositoryPort |
| ReportContent | 通報 | ReportRepositoryPort |
| GetRenderData | レンダリングデータ取得 | StructureRepositoryPort, RendererDataPort |
| ApplyResourcePack | リソパ適用 | RendererDataPort |

### ポート（インターフェース）の定義

→ `docs/contracts/ports.md` で一元管理

### 入出力の変換

- DTOの定義とバリデーション
- ドメインオブジェクト ↔ DTO の変換

---

## 許可される依存

**Domainレイヤのみ**

- エンティティ、値オブジェクトの使用
- ドメインサービスの呼び出し
- ドメインイベントの発行
- Portインターフェースの定義と使用

---

## 禁止事項

### Interface層への依存禁止

- コントローラー、プレゼンターを参照しない
- HTTPリクエスト/レスポンス型を使用しない
- Webフレームワーク固有の型を使用しない

### Infrastructure層への依存禁止

- リポジトリの具象実装を参照しない
- データベース固有のコードを含めない
- 外部APIクライアントの具象実装を参照しない
- StructureConverterの具象実装を参照しない

### フレームワーク依存の禁止

- DIコンテナのアノテーションを使用しない（Portとして抽象化）
- ORM固有の型やアノテーションを使用しない
- 特定のWebフレームワークに依存しない

### その他の禁止事項

- 環境変数の直接参照（設定はPort経由で取得）
- ファイルI/Oの直接実行
- 具象クラスへの直接依存（インターフェース経由にする）

---

## 設計原則

1. **単一責任**: 1ユースケース = 1クラス/関数
2. **依存性逆転**: 外部依存はすべてPort（インターフェース）経由
3. **入出力の明確化**: DTOで入出力を型安全に定義
4. **テスト容易性**: Portをモック化することで単体テスト可能

---

## 参照

- Port定義: `docs/contracts/ports.md`
- DTO定義: `docs/contracts/dtos.md`
