# Infra レイヤ - 設計ドキュメント

## Repository 実装一覧

| 実装クラス | 実装するPort | 使用技術 | 説明 |
|-----------|-------------|---------|------|
| PostgresStructureRepository | StructureRepositoryPort | PostgreSQL + Prisma | 建築データメタの永続化 |
| PostgresPostRepository | PostRepositoryPort | PostgreSQL + Prisma | 投稿データの永続化 |
| PostgresUserRepository | UserRepositoryPort | PostgreSQL + Prisma | ユーザーデータの永続化 |
| PostgresCommentRepository | CommentRepositoryPort | PostgreSQL + Prisma | コメントデータの永続化 |
| S3StructureStorage | StructureStoragePort | AWS S3 / MinIO | 建築データファイルの保存 |
| InMemoryStructureRepository | StructureRepositoryPort | Map | テスト用インメモリ実装 |
| InMemoryPostRepository | PostRepositoryPort | Map | テスト用インメモリ実装 |

---

## Gateway 実装一覧

| Adapter名 | 実装するPort | 外部サービス | 説明 |
|----------|-------------|-------------|------|
| StructureConverterAdapter | StructureConverterPort | 変換エンジン | Java↔Bedrock変換 |
| RendererDataGenerator | RendererDataPort | 変換エンジン | 3Dレンダリングデータ生成 |
| SendGridEmailAdapter | EmailPort | SendGrid | メール送信 |
| TwilioSmsAdapter | SmsPort | Twilio | SMS送信 |
| RedisSpamDetector | SpamDetectorPort | Redis | スパム検出・レート制限 |
| WebSocketNotificationAdapter | NotificationPort | WebSocket | リアルタイム通知 |
| WebPushNotificationAdapter | NotificationPort | Web Push | プッシュ通知 |

---

## 設定・環境変数一覧

### データベース設定

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|-----------|------|-------------|------|
| DATABASE_URL | Yes | - | PostgreSQL接続文字列 |
| DATABASE_POOL_SIZE | No | 10 | コネクションプール数 |
| DATABASE_TIMEOUT_MS | No | 5000 | クエリタイムアウト（ミリ秒） |

### Redis設定

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|-----------|------|-------------|------|
| REDIS_URL | Yes | - | Redis接続文字列 |
| REDIS_TTL_SECONDS | No | 3600 | デフォルトTTL（秒） |
| SPAM_RATE_LIMIT | No | 10 | コメント投稿レート制限（件/分） |

### S3/MinIO設定

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|-----------|------|-------------|------|
| S3_ENDPOINT | No | - | S3互換エンドポイント（MinIO用） |
| S3_BUCKET | Yes | - | バケット名 |
| S3_ACCESS_KEY | Yes | - | アクセスキー |
| S3_SECRET_KEY | Yes | - | シークレットキー |
| S3_REGION | No | ap-northeast-1 | リージョン |
| DOWNLOAD_URL_EXPIRY | No | 300 | 署名付きURLの有効期限（秒） |

### 外部サービス設定

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|-----------|------|-------------|------|
| SENDGRID_API_KEY | Yes | - | SendGrid APIキー |
| TWILIO_ACCOUNT_SID | Yes | - | Twilioアカウント |
| TWILIO_AUTH_TOKEN | Yes | - | Twilio認証トークン |
| TWILIO_PHONE_NUMBER | Yes | - | Twilio発信番号 |

### 建築データ変換設定

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|-----------|------|-------------|------|
| MAX_STRUCTURE_SIZE_MB | No | 100 | アップロードサイズ上限（MB） |
| CONVERTER_TIMEOUT_MS | No | 60000 | 変換タイムアウト（ミリ秒） |
| BLOCK_MAPPING_VERSION | No | latest | ブロックマッピングバージョン |

---

## 建築データ変換エンジン

### 対応フォーマット

| フォーマット | 拡張子 | Edition | 説明 |
|-------------|--------|---------|------|
| Schematic | .schematic | Java | MCEdit形式（旧） |
| Litematic | .litematic | Java | Litematica形式 |
| McStructure | .mcstructure | Bedrock | 統合版構造物 |

### 変換フロー

```
入力ファイル
    ↓
パース（NBT解析）
    ↓
内部表現（ブロックパレット + 配置データ）
    ↓
ブロックマッピング（Java ↔ Bedrock）
    ↓
変換不可ブロック → 空気ブロック化 + 警告リスト生成
    ↓
出力ファイル生成
```

### バージョン対応

- 1.12〜最新
- バージョン間のブロックID変更に対応
- フラットニング（1.13）対応

---

## 3Dレンダリングデータ生成

### 出力形式

```typescript
interface RenderData {
  vertices: Float32Array       // 頂点座標
  normals: Float32Array        // 法線ベクトル
  uvs: Float32Array            // テクスチャ座標
  indices: Uint32Array         // インデックス
  textureAtlas: string         // テクスチャアトラスURL
  lodLevels: LodLevel[]        // LODレベル別データ
}

interface LodLevel {
  level: number                // 0: 最高品質, 1-3: 簡略化
  distanceThreshold: number    // このLODに切り替える距離
  vertexCount: number          // 頂点数
  dataUrl: string              // データURL
}
```

### LOD戦略

| LODレベル | 距離 | 品質 | 対象 |
|----------|------|------|------|
| 0 | 0-50 | 最高 | 全ブロック、フルディテール |
| 1 | 50-200 | 高 | 小ブロック統合 |
| 2 | 200-500 | 中 | チャンク単位統合 |
| 3 | 500+ | 低 | シルエットのみ |

---

## ファイル構成

```
src/infra/
├── database/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── client.ts
│   └── index.ts
├── repositories/
│   ├── PostgresStructureRepository.ts
│   ├── PostgresPostRepository.ts
│   ├── PostgresUserRepository.ts
│   ├── PostgresCommentRepository.ts
│   ├── InMemoryStructureRepository.ts
│   ├── InMemoryPostRepository.ts
│   └── index.ts
├── storage/
│   ├── S3StructureStorage.ts
│   ├── ResourcePackCache.ts
│   └── index.ts
├── converters/
│   ├── StructureConverter.ts
│   ├── BlockMapper.ts
│   ├── parsers/
│   │   ├── SchematicParser.ts
│   │   ├── LitematicParser.ts
│   │   └── McStructureParser.ts
│   └── index.ts
├── renderers/
│   ├── RendererDataGenerator.ts
│   ├── MeshBuilder.ts
│   ├── TextureAtlasGenerator.ts
│   └── index.ts
├── gateways/
│   ├── email/
│   │   └── SendGridEmailAdapter.ts
│   ├── sms/
│   │   └── TwilioSmsAdapter.ts
│   ├── notification/
│   │   ├── WebSocketNotificationAdapter.ts
│   │   └── WebPushNotificationAdapter.ts
│   ├── spam/
│   │   └── RedisSpamDetector.ts
│   └── index.ts
├── config/
│   ├── database.ts
│   ├── redis.ts
│   ├── s3.ts
│   ├── external.ts
│   └── index.ts
└── di/
    ├── container.ts
    └── index.ts
```

---

## 設計チェックリスト

- [ ] 全てのPort実装がインターフェースを満たしているか
- [ ] 環境変数は直接参照せず、設定ファイル経由で読み込んでいるか
- [ ] 接続エラー時のリトライ処理が実装されているか
- [ ] トランザクション境界が適切に設定されているか
- [ ] テスト用のインメモリ実装が用意されているか
- [ ] 機密情報（APIキーなど）がログに出力されないか
- [ ] 変換処理のタイムアウトが設定されているか
- [ ] ファイルサイズチェックがアップロード前に行われているか
