# UseCase レイヤー

## ディレクトリの目的

このディレクトリはアプリケーションのユースケース（アプリケーションサービス）層を構成します。
ユーザーの操作やシステムのアクションに対応するビジネスロジックのオーケストレーションを担当します。

ユースケース層は、ドメイン層のオブジェクトを組み合わせて、特定のアプリケーション機能を実現します。

## 配置するファイルの種類

### ユースケース (UseCase / Interactor)

特定のアプリケーション機能を実現するクラスです。
1つのユースケースは1つの具体的なアクションに対応します。

```
usecases/
  CreateUserUseCase.ts      # ユーザー作成
  GetUserByIdUseCase.ts     # ユーザー取得
  UpdateUserUseCase.ts      # ユーザー更新
  DeleteUserUseCase.ts      # ユーザー削除
  LoginUseCase.ts           # ログイン処理
```

### 入力DTO (Input DTO / Request)

ユースケースへの入力データを定義します。
外部からの入力をユースケースが理解できる形式に変換します。

```
dto/input/
  CreateUserInput.ts        # ユーザー作成入力
  LoginInput.ts             # ログイン入力
  UpdateUserInput.ts        # ユーザー更新入力
```

### 出力DTO (Output DTO / Response)

ユースケースからの出力データを定義します。
ドメインオブジェクトを外部に公開可能な形式に変換します。

```
dto/output/
  UserOutput.ts             # ユーザー出力
  LoginOutput.ts            # ログイン結果出力
  ListUsersOutput.ts        # ユーザー一覧出力
```

### ポート (Port)

外部サービスやインフラストラクチャとの接続点を定義するインターフェースです。

```
ports/
  IMailSender.ts            # メール送信ポート
  IPaymentGateway.ts        # 決済ゲートウェイポート
  IFileStorage.ts           # ファイルストレージポート
```

## 命名規則

| 種類 | 命名パターン | 例 |
|------|-------------|-----|
| ユースケース | 動詞 + 名詞 + UseCase | `CreateUserUseCase.ts` |
| 入力DTO | 動詞 + 名詞 + Input | `CreateUserInput.ts` |
| 出力DTO | 名詞 + Output | `UserOutput.ts` |
| ポート | I + 名詞 + 動詞/目的 | `IMailSender.ts`, `IPaymentGateway.ts` |

### ユースケースの命名パターン例

| 操作 | 命名 |
|------|------|
| 作成 | `CreateXxxUseCase` |
| 取得（単一） | `GetXxxByIdUseCase` |
| 取得（一覧） | `ListXxxUseCase` |
| 更新 | `UpdateXxxUseCase` |
| 削除 | `DeleteXxxUseCase` |
| 検索 | `SearchXxxUseCase` |
| 認証 | `AuthenticateXxxUseCase`, `LoginUseCase` |

## 依存ルール

**domainレイヤーのみimport可能です**

ユースケース層は以下の依存ルールを厳守します：

1. **許可される依存**
   - domain層のエンティティ、値オブジェクト、ドメインサービス
   - domain層のリポジトリインターフェース
   - 同じusecase層内の他ファイル

2. **禁止される依存**
   - interface層への依存禁止
   - infra層への依存禁止
   - 外部フレームワークへの直接依存禁止

```typescript
// 良い例 - domain層からのimport
import { User } from '../domain/entities/User';
import { Email } from '../domain/valueObjects/Email';
import { IUserRepository } from '../domain/repositories/IUserRepository';

// 良い例 - 同一レイヤー内のimport
import { CreateUserInput } from './dto/input/CreateUserInput';
import { UserOutput } from './dto/output/UserOutput';

// 悪い例 - interface層
import { UserController } from '../interface/UserController'; // 禁止

// 悪い例 - infra層
import { PrismaUserRepository } from '../infra/PrismaUserRepository'; // 禁止

// 悪い例 - 外部フレームワーク
import { Request, Response } from 'express'; // 禁止
```

## ユースケースの実装パターン

```typescript
// CreateUserUseCase.ts
import { User } from '../domain/entities/User';
import { Email } from '../domain/valueObjects/Email';
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { CreateUserInput } from './dto/input/CreateUserInput';
import { UserOutput } from './dto/output/UserOutput';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async execute(input: CreateUserInput): Promise<UserOutput> {
    const email = new Email(input.email);
    const user = User.create({
      name: input.name,
      email: email,
    });

    await this.userRepository.save(user);

    return UserOutput.fromEntity(user);
  }
}
```

## ディレクトリ構成例

```
src/usecase/
  user/
    CreateUserUseCase.ts
    GetUserByIdUseCase.ts
    UpdateUserUseCase.ts
    DeleteUserUseCase.ts
    ListUsersUseCase.ts
  auth/
    LoginUseCase.ts
    LogoutUseCase.ts
    RefreshTokenUseCase.ts
  order/
    CreateOrderUseCase.ts
    CancelOrderUseCase.ts
  dto/
    input/
      CreateUserInput.ts
      LoginInput.ts
    output/
      UserOutput.ts
      LoginOutput.ts
  ports/
    IMailSender.ts
    IPaymentGateway.ts
  index.ts
```
