# Infrastructure レイヤー

## ディレクトリの目的

このディレクトリはインフラストラクチャ層（Infrastructure Layer）を構成します。
技術的な詳細や外部システムとの実際の接続を担当します。

このレイヤーは、上位レイヤー（domain、usecase）で定義されたインターフェース（Port）の
具体的な実装（Adapter）を提供します。データベース、外部API、ファイルシステムなど、
技術的な関心事はすべてこのレイヤーに集約されます。

## 配置するファイルの種類

### リポジトリ実装 (Repository Implementation)

domain層で定義されたリポジトリインターフェースの具体的な実装です。
データベースアクセスやデータ永続化のロジックを含みます。

```
repositories/
  PrismaUserRepository.ts       # PrismaによるUserRepository実装
  TypeORMOrderRepository.ts     # TypeORMによるOrderRepository実装
  MongoProductRepository.ts     # MongoDBによるProductRepository実装
  InMemoryUserRepository.ts     # テスト用インメモリ実装
```

### 外部APIアダプター (External API Adapter)

usecase層で定義されたポートの具体的な実装です。
外部サービスとの通信を担当します。

```
adapters/
  SendGridMailAdapter.ts        # SendGridによるメール送信
  StripePaymentAdapter.ts       # Stripe決済アダプター
  TwilioSmsAdapter.ts           # Twilio SMSアダプター
  S3FileStorageAdapter.ts       # AWS S3ファイルストレージ
  FirebaseAuthAdapter.ts        # Firebase認証アダプター
```

### データベース設定 (Database Configuration)

データベース接続やマイグレーション関連の設定ファイルです。

```
database/
  prisma/
    schema.prisma               # Prismaスキーマ
    migrations/                 # マイグレーションファイル
  connection.ts                 # DB接続設定
  seeds/                        # シードデータ
```

### キャッシュ実装 (Cache Implementation)

キャッシュ機構の実装です。

```
cache/
  RedisCache.ts                 # Redisキャッシュ実装
  MemoryCache.ts                # インメモリキャッシュ実装
```

### 外部サービスクライアント (External Service Client)

外部APIとの通信を行うクライアント実装です。

```
clients/
  HttpClient.ts                 # HTTP通信クライアント
  GraphQLClient.ts              # GraphQL通信クライアント
```

## 命名規則

| 種類 | 命名パターン | 例 |
|------|-------------|-----|
| リポジトリ実装 | 技術名 + Entity名 + Repository | `PrismaUserRepository.ts` |
| 外部APIアダプター | サービス名 + 目的 + Adapter | `SendGridMailAdapter.ts` |
| キャッシュ実装 | 技術名 + Cache | `RedisCache.ts` |
| クライアント | プロトコル/目的 + Client | `HttpClient.ts` |
| 設定 | 目的 + Config / Connection | `DatabaseConnection.ts` |

### 技術固有の命名例

| 技術 | 命名パターン |
|------|-------------|
| Prisma | `Prisma + Entity + Repository` |
| TypeORM | `TypeORM + Entity + Repository` |
| MongoDB | `Mongo + Entity + Repository` |
| Redis | `Redis + Purpose` |
| AWS | `S3/SQS/SNS + Purpose + Adapter` |

## 依存ルール

**Portの実装のみを担当します**

インフラストラクチャ層は以下の依存ルールを厳守します：

1. **許可される依存**
   - domain層で定義されたリポジトリインターフェース（Port）
   - usecase層で定義されたポート（外部サービスインターフェース）
   - domain層のエンティティ、値オブジェクト（データマッピング用）
   - 外部ライブラリ（ORM、SDKなど）
   - 同じinfra層内の他ファイル

2. **禁止される依存**
   - interface層への依存禁止
   - ユースケースクラスへの直接依存禁止

```typescript
// 良い例 - domain層のPort（インターフェース）を実装
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { User } from '../domain/entities/User';
import { Email } from '../domain/valueObjects/Email';
import { UserId } from '../domain/valueObjects/UserId';

// 良い例 - usecase層のPortを実装
import { IMailSender } from '../usecase/ports/IMailSender';

// 良い例 - 外部ライブラリ
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';

// 悪い例 - interface層
import { UserController } from '../interface/controllers/UserController'; // 禁止

// 悪い例 - ユースケース本体
import { CreateUserUseCase } from '../usecase/user/CreateUserUseCase'; // 禁止
```

## リポジトリ実装のパターン

```typescript
// PrismaUserRepository.ts
import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../domain/repositories/IUserRepository';
import { User } from '../domain/entities/User';
import { UserId } from '../domain/valueObjects/UserId';
import { Email } from '../domain/valueObjects/Email';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UserId): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { id: id.value },
    });

    if (!data) {
      return null;
    }

    return this.toDomain(data);
  }

  async save(user: User): Promise<void> {
    const data = this.toPersistence(user);
    await this.prisma.user.upsert({
      where: { id: user.id.value },
      create: data,
      update: data,
    });
  }

  async delete(id: UserId): Promise<void> {
    await this.prisma.user.delete({
      where: { id: id.value },
    });
  }

  // ドメインオブジェクトへの変換
  private toDomain(data: PrismaUser): User {
    return User.reconstruct({
      id: new UserId(data.id),
      name: data.name,
      email: new Email(data.email),
      createdAt: data.createdAt,
    });
  }

  // 永続化形式への変換
  private toPersistence(user: User): PrismaUserData {
    return {
      id: user.id.value,
      name: user.name,
      email: user.email.value,
      createdAt: user.createdAt,
    };
  }
}
```

## 外部APIアダプターの実装パターン

```typescript
// SendGridMailAdapter.ts
import sgMail from '@sendgrid/mail';
import { IMailSender, MailMessage } from '../usecase/ports/IMailSender';

export class SendGridMailAdapter implements IMailSender {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(message: MailMessage): Promise<void> {
    await sgMail.send({
      to: message.to,
      from: message.from,
      subject: message.subject,
      text: message.textBody,
      html: message.htmlBody,
    });
  }
}
```

## ディレクトリ構成例

```
src/infra/
  repositories/
    prisma/
      PrismaUserRepository.ts
      PrismaOrderRepository.ts
      PrismaProductRepository.ts
    inmemory/
      InMemoryUserRepository.ts
      InMemoryOrderRepository.ts
  adapters/
    mail/
      SendGridMailAdapter.ts
      SesMailAdapter.ts
    payment/
      StripePaymentAdapter.ts
    storage/
      S3FileStorageAdapter.ts
      LocalFileStorageAdapter.ts
    auth/
      FirebaseAuthAdapter.ts
  database/
    prisma/
      schema.prisma
      migrations/
    connection.ts
    seeds/
  cache/
    RedisCache.ts
    MemoryCache.ts
  clients/
    HttpClient.ts
  config/
    database.config.ts
    cache.config.ts
  index.ts
```
