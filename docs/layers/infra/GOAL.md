# Infra Layer - 目標と責務

## 概要

Infraレイヤは、Minecraft建築データ共有SNSの技術的詳細を担当する。データベース、外部API、建築データ変換、ファイルストレージなどの具体的な実装を提供し、UsecaseレイヤのPort（インターフェース）を実装する。

---

## 責務

### Repository実装

| Repository | Port | 説明 |
|------------|------|------|
| StructureRepository | StructureRepositoryPort | 建築データの永続化（ファイルストレージ） |
| PostRepository | PostRepositoryPort | 投稿のCRUD（DB） |
| UserRepository | UserRepositoryPort | ユーザーのCRUD（DB） |
| CommentRepository | CommentRepositoryPort | コメントのCRUD（DB） |

### Gateway実装

| Gateway | Port | 説明 |
|---------|------|------|
| StructureConverter | StructureConverterPort | Java↔統合版変換（建築データ変換エンジン） |
| RendererDataGenerator | RendererDataPort | 3Dレンダリングデータ生成 |
| EmailGateway | EmailPort | メール送信（SendGrid等） |
| SmsGateway | SmsPort | SMS送信（Twilio等） |
| SpamDetector | SpamDetectorPort | スパム/レート制限（Redis等） |
| NotificationGateway | NotificationPort | 通知配信（WebSocket/Push） |

### ストレージ

| Component | 説明 |
|-----------|------|
| FileStorage | 建築データファイルの保存（S3互換） |
| ResourcePackCache | リソースパックのキャッシュ |

---

## 許可される依存

| 依存先 | 許可 | 説明 |
|--------|------|------|
| Domain | OK | Entity、Value Objectの参照と生成 |
| Usecase | OK | Port（インターフェース）の実装 |
| Interface | NG | 直接依存禁止 |
| 外部ライブラリ | OK | ORM、HTTPクライアント、変換ライブラリなど |

---

## 主要な技術的関心事

### 建築データ変換

- .schematic / .litematic / .mcstructure のパース
- Java版 ↔ 統合版のブロックID変換
- バージョン間のブロックマッピング（1.12〜最新）
- 変換不可ブロックの空気ブロック化

### 3Dレンダリングデータ生成

- ブロック配置からメッシュ生成
- LOD（Level of Detail）対応
- テクスチャアトラス生成
- リソースパック適用

### ファイルストレージ

- 署名付きアップロード/ダウンロードURL
- ファイルサイズ上限（100MB）チェック
- 変換後データのキャッシュ

---

## 禁止事項

### ビジネスロジックの実装

- 公開設定の判定はDomain/Usecaseへ
- ユースケースの組み立てはUsecaseへ

### 入出力の整形

- HTTPレスポンスの整形はInterfaceへ
- バリデーションメッセージの生成はInterfaceへ

---

## 設計原則

1. **依存性逆転原則（DIP）**: 上位レイヤのPortを実装し、詳細が抽象に依存する
2. **単一責任原則**: 1つのAdapterは1つの外部リソースのみを扱う
3. **テスト容易性**: インターフェースを介することでモック化が容易
4. **交換可能性**: 技術の変更（DB変更など）がInfra層内で完結する

---

## 参照

- Port定義: `docs/contracts/ports.md`
- DTO定義: `docs/contracts/dtos.md`
