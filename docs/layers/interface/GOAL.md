# Interface Layer - 目標と責務

## 概要

Interfaceレイヤは、Minecraft建築データ共有SNSと外部世界との境界を担当する。REST API、Webページ、3Dレンダラーからの入力を受け取り、Usecaseレイヤに委譲する。

---

## 責務

### Controller（入力の受け口）

| Controller | 説明 |
|------------|------|
| PostController | 投稿CRUD、検索 |
| StructureController | アップロード、ダウンロード、レンダリングデータ |
| UserController | 登録、ログイン、プロフィール |
| SocialController | いいね、コメント、フォロー |
| NotificationController | 通知一覧、既読 |
| EmbedController | 外部埋め込み用3Dプレビュー |

### Presenter（出力の整形）

- UsecaseからのOutputを APIレスポンス形式に変換
- エラーレスポンスの標準化
- ページネーション情報の付与

### DTO変換

- APIリクエスト → UseCase Input DTO
- UseCase Output DTO → APIレスポンス

### 3Dレンダラー関連

- WebGLレンダラーコンポーネント
- リソースパック適用UI
- LOD（Level of Detail）制御

---

## 許可される依存

| 依存先 | 許可 | 説明 |
|--------|------|------|
| Usecase | OK | Usecaseの呼び出し、入出力DTOの参照 |
| Domain | OK | Value Objectの利用（読み取り専用） |
| Infra | NG | 直接依存禁止（Portを介して間接的に利用） |

---

## 禁止事項

### Infraレイヤへの直接依存

```typescript
// NG: Infraの具象クラスを直接参照
import { PostgresPostRepository } from '@/infra/repositories/PostgresPostRepository'

// OK: Usecaseを呼び出す
import { SearchPosts } from '@/usecase/post/SearchPosts'
```

### ビジネスロジックの実装

- Controllerでビジネスロジックを書かない
- 公開設定の判定、スパム検出などはUsecaseに委譲

### Domainオブジェクトの直接変更

- Domainから取得したEntityを直接変更しない
- 変更が必要な場合はUsecaseを経由する

---

## 設計原則

1. **薄く保つ**: Controllerは入出力の変換のみを行い、ロジックを持たない
2. **フレームワーク非依存**: 可能な限りフレームワーク固有のコードを局所化する
3. **テスト容易性**: Usecaseをモック化してController単体でテスト可能にする
4. **単一責任**: 1つのControllerは関連する1つの機能群のみを扱う

---

## 参照

- API定義: `docs/contracts/api.md`
- DTO定義: `docs/contracts/dtos.md`
