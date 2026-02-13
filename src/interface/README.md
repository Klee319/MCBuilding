# Interface レイヤー

## ディレクトリの目的

このディレクトリはインターフェースアダプター層（Interface Adapters Layer）を構成します。
外部世界（Web、CLI、外部システム）とアプリケーションコア（usecase、domain）の間の変換を担当します。

このレイヤーは、外部からの入力をユースケースが理解できる形式に変換し、
ユースケースの出力を外部に適した形式に変換する役割を持ちます。

## 配置するファイルの種類

### コントローラー (Controller)

外部からのリクエストを受け取り、適切なユースケースを呼び出します。
HTTPリクエスト、CLIコマンド、GraphQLクエリなどの入口点となります。

```
controllers/
  UserController.ts         # ユーザー関連のHTTPエンドポイント
  AuthController.ts         # 認証関連のHTTPエンドポイント
  OrderController.ts        # 注文関連のHTTPエンドポイント
```

### プレゼンター (Presenter)

ユースケースの出力を特定の形式（JSON、HTML、XML等）に変換します。
表示ロジックやフォーマット処理を担当します。

```
presenters/
  UserJsonPresenter.ts      # ユーザーをJSON形式で出力
  OrderHtmlPresenter.ts     # 注文をHTML形式で出力
  ErrorPresenter.ts         # エラーレスポンスの整形
```

### ゲートウェイ (Gateway)

外部サービスとの通信を抽象化するインターフェースおよびその実装です。
usecase層で定義されたポートの具体的な実装を提供します。

```
gateways/
  MailGateway.ts            # メール送信ゲートウェイ
  PaymentGateway.ts         # 決済ゲートウェイ
  NotificationGateway.ts    # 通知ゲートウェイ
```

### ビューモデル (ViewModel)

プレゼンテーション層で使用するデータ構造を定義します。

```
viewModels/
  UserViewModel.ts          # ユーザー表示用モデル
  OrderListViewModel.ts     # 注文一覧表示用モデル
```

### ミドルウェア (Middleware)

リクエスト/レスポンスの前後処理を担当します。

```
middlewares/
  AuthMiddleware.ts         # 認証ミドルウェア
  LoggingMiddleware.ts      # ロギングミドルウェア
  ValidationMiddleware.ts   # バリデーションミドルウェア
```

## 命名規則

| 種類 | 命名パターン | 例 |
|------|-------------|-----|
| コントローラー | 名詞 + Controller | `UserController.ts` |
| プレゼンター | 名詞 + 形式 + Presenter | `UserJsonPresenter.ts` |
| ゲートウェイ | 名詞 + Gateway | `MailGateway.ts` |
| ビューモデル | 名詞 + ViewModel | `UserViewModel.ts` |
| ミドルウェア | 目的 + Middleware | `AuthMiddleware.ts` |
| ルーター | 名詞 + Router / Routes | `UserRouter.ts`, `userRoutes.ts` |

## 依存ルール

**usecase層とdomain層へのimportが許可されています**

インターフェース層は以下の依存ルールを厳守します：

1. **許可される依存**
   - usecase層のユースケース、DTO
   - domain層のエンティティ、値オブジェクト（参照のみ）
   - 同じinterface層内の他ファイル
   - フレームワーク固有のライブラリ（Express、Fastify等）

2. **禁止される依存**
   - infra層への直接依存禁止
   - 具体的なリポジトリ実装への依存禁止

```typescript
// 良い例 - usecase層からのimport
import { CreateUserUseCase } from '../usecase/user/CreateUserUseCase';
import { CreateUserInput } from '../usecase/dto/input/CreateUserInput';
import { UserOutput } from '../usecase/dto/output/UserOutput';

// 良い例 - domain層からのimport（参照目的）
import { User } from '../domain/entities/User';
import { DomainError } from '../domain/errors/DomainError';

// 良い例 - フレームワーク
import { Request, Response } from 'express';

// 良い例 - 同一レイヤー内
import { UserJsonPresenter } from '../presenters/UserJsonPresenter';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';

// 悪い例 - infra層
import { PrismaUserRepository } from '../infra/PrismaUserRepository'; // 禁止
import { RedisCache } from '../infra/RedisCache'; // 禁止
```

## コントローラーの実装パターン

```typescript
// UserController.ts
import { Request, Response, NextFunction } from 'express';
import { CreateUserUseCase } from '../usecase/user/CreateUserUseCase';
import { GetUserByIdUseCase } from '../usecase/user/GetUserByIdUseCase';
import { CreateUserInput } from '../usecase/dto/input/CreateUserInput';
import { UserJsonPresenter } from './presenters/UserJsonPresenter';

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly presenter: UserJsonPresenter
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = new CreateUserInput(req.body);
      const output = await this.createUserUseCase.execute(input);
      const response = this.presenter.present(output);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const output = await this.getUserByIdUseCase.execute({ id });
      const response = this.presenter.present(output);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
```

## ディレクトリ構成例

```
src/interface/
  controllers/
    UserController.ts
    AuthController.ts
    OrderController.ts
  presenters/
    UserJsonPresenter.ts
    OrderJsonPresenter.ts
    ErrorPresenter.ts
  gateways/
    MailGateway.ts
    PaymentGateway.ts
    SmsGateway.ts
  viewModels/
    UserViewModel.ts
    OrderViewModel.ts
  middlewares/
    AuthMiddleware.ts
    ErrorHandlerMiddleware.ts
    ValidationMiddleware.ts
    RateLimitMiddleware.ts
  routes/
    userRoutes.ts
    authRoutes.ts
    orderRoutes.ts
    index.ts
  validators/
    userValidators.ts
    authValidators.ts
  index.ts
```
