# Tests ディレクトリ

## テストディレクトリ構成方針

このディレクトリはプロジェクト全体のテストコードを管理します。
テストは種類ごとに分類し、本番コードのディレクトリ構造を反映した形で配置します。

### 基本方針

1. **テストピラミッドに従う**
   - 単体テストを最も多く（基盤）
   - 統合テストを中程度
   - E2Eテストを最小限（頂点）

2. **テストカバレッジ目標: 80%以上**
   - クリティカルなビジネスロジック: 90%以上
   - ユーティリティ関数: 80%以上
   - インフラ層: 70%以上

3. **テスト駆動開発（TDD）を推奨**
   - RED: 失敗するテストを書く
   - GREEN: テストを通す最小限の実装
   - REFACTOR: コードを改善

## 単体テスト (Unit Tests)

### 配置場所

```
tests/unit/
```

### 対象

- ドメインエンティティ
- 値オブジェクト
- ドメインサービス
- ユースケース（依存関係をモック化）
- ユーティリティ関数

### 特徴

- 外部依存なし（モック/スタブ使用）
- 高速実行（ミリ秒単位）
- 独立して実行可能
- ビジネスロジックの検証に集中

### 構成例

```
tests/unit/
  domain/
    entities/
      User.test.ts
      Order.test.ts
    valueObjects/
      Email.test.ts
      Money.test.ts
    services/
      PricingService.test.ts
  usecase/
    user/
      CreateUserUseCase.test.ts
      GetUserByIdUseCase.test.ts
    auth/
      LoginUseCase.test.ts
```

## 統合テスト (Integration Tests)

### 配置場所

```
tests/integration/
```

### 対象

- リポジトリ実装（実際のDBを使用）
- 外部APIアダプター
- 複数のユースケースを組み合わせた処理
- APIエンドポイント

### 特徴

- 実際の外部リソースを使用（テスト用DB等）
- 中程度の実行速度
- コンポーネント間の連携を検証
- セットアップ/クリーンアップが必要

### 構成例

```
tests/integration/
  repositories/
    PrismaUserRepository.test.ts
    PrismaOrderRepository.test.ts
  adapters/
    SendGridMailAdapter.test.ts
    StripePaymentAdapter.test.ts
  api/
    userApi.test.ts
    authApi.test.ts
```

## E2E テスト (End-to-End Tests)

### 配置場所

```
tests/e2e/
```

### 対象

- ユーザーシナリオ全体
- クリティカルなユーザーフロー
- ブラウザを通じた操作（Webアプリの場合）

### 特徴

- 実際のシステム全体を通じてテスト
- 実行時間が長い
- フレイキー（不安定）になりやすい
- 本番環境に近い構成で実行

### 構成例

```
tests/e2e/
  scenarios/
    userRegistration.spec.ts
    orderCheckout.spec.ts
    authentication.spec.ts
  fixtures/
    users.json
    orders.json
  support/
    commands.ts
    helpers.ts
```

## 共通ディレクトリ

### テストユーティリティ

```
tests/utils/
  factories/              # テストデータ生成ファクトリ
    userFactory.ts
    orderFactory.ts
  mocks/                  # モックオブジェクト
    mockUserRepository.ts
    mockMailSender.ts
  fixtures/               # 固定テストデータ
    testUsers.ts
    testOrders.ts
  helpers/                # テストヘルパー関数
    dbHelper.ts
    authHelper.ts
```

### 設定ファイル

```
tests/
  setup.ts                # テスト共通セットアップ
  teardown.ts             # テスト共通クリーンアップ
  jest.config.ts          # Jest設定
  playwright.config.ts    # Playwright設定（E2E用）
```

## 命名規則

| 種類 | ファイル命名パターン | 例 |
|------|---------------------|-----|
| 単体テスト | `{対象ファイル名}.test.ts` | `User.test.ts` |
| 統合テスト | `{対象ファイル名}.test.ts` | `PrismaUserRepository.test.ts` |
| E2Eテスト | `{シナリオ名}.spec.ts` | `userRegistration.spec.ts` |
| ファクトリ | `{エンティティ名}Factory.ts` | `userFactory.ts` |
| モック | `mock{クラス名}.ts` | `mockUserRepository.ts` |

### テスト関数の命名

```typescript
// describe: テスト対象を記述
describe('User Entity', () => {

  // describe: メソッドやシナリオでグループ化
  describe('create', () => {

    // it/test: 期待する動作を記述
    it('should create a user with valid data', () => {
      // ...
    });

    it('should throw error when email is invalid', () => {
      // ...
    });
  });
});
```

### 日本語での命名も可

```typescript
describe('ユーザーエンティティ', () => {
  describe('作成処理', () => {
    it('有効なデータでユーザーを作成できること', () => {
      // ...
    });

    it('無効なメールアドレスでエラーが発生すること', () => {
      // ...
    });
  });
});
```

## ディレクトリ構成全体像

```
tests/
  unit/
    domain/
      entities/
        User.test.ts
        Order.test.ts
        Product.test.ts
      valueObjects/
        Email.test.ts
        Money.test.ts
        Address.test.ts
      services/
        PricingService.test.ts
    usecase/
      user/
        CreateUserUseCase.test.ts
        GetUserByIdUseCase.test.ts
        UpdateUserUseCase.test.ts
      auth/
        LoginUseCase.test.ts
      order/
        CreateOrderUseCase.test.ts
  integration/
    repositories/
      PrismaUserRepository.test.ts
      PrismaOrderRepository.test.ts
    adapters/
      SendGridMailAdapter.test.ts
      StripePaymentAdapter.test.ts
    api/
      userApi.test.ts
      authApi.test.ts
      orderApi.test.ts
  e2e/
    scenarios/
      userRegistration.spec.ts
      orderCheckout.spec.ts
      authentication.spec.ts
    fixtures/
      users.json
      products.json
    support/
      commands.ts
  utils/
    factories/
      userFactory.ts
      orderFactory.ts
    mocks/
      mockUserRepository.ts
      mockMailSender.ts
    fixtures/
      testUsers.ts
    helpers/
      dbHelper.ts
      authHelper.ts
  setup.ts
  teardown.ts
  jest.config.ts
  playwright.config.ts
  README.md
```

## テスト実行コマンド例

```bash
# 全テスト実行
npm test

# 単体テストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e

# カバレッジレポート生成
npm run test:coverage

# 特定ファイルのテスト
npm test -- User.test.ts

# ウォッチモード
npm run test:watch
```
