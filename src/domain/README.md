# Domain レイヤー

## ディレクトリの目的

このディレクトリはドメイン駆動設計（DDD）におけるドメイン層を構成します。
ビジネスロジックの核心部分を格納し、アプリケーション全体で最も重要な概念とルールを表現します。

ドメイン層は外部の技術的関心事から完全に独立しており、純粋なビジネスロジックのみを含みます。

## 配置するファイルの種類

### エンティティ (Entity)

一意の識別子を持ち、ライフサイクルを通じて同一性が保たれるオブジェクトです。

```
entities/
  User.ts           # ユーザーエンティティ
  Order.ts          # 注文エンティティ
  Product.ts        # 商品エンティティ
```

### 値オブジェクト (Value Object)

属性の組み合わせで定義され、識別子を持たない不変オブジェクトです。
等価性は属性値によって判断されます。

```
valueObjects/
  Email.ts          # メールアドレス値オブジェクト
  Money.ts          # 金額値オブジェクト
  Address.ts        # 住所値オブジェクト
```

### ドメインサービス (Domain Service)

特定のエンティティや値オブジェクトに属さない、ドメインロジックを担当します。

```
services/
  PricingService.ts     # 価格計算サービス
  TransferService.ts    # 送金サービス
```

### リポジトリインターフェース (Repository Interface / Port)

エンティティの永続化に関するインターフェース（Port）を定義します。
実装はinfra層で行います。

```
repositories/
  IUserRepository.ts    # ユーザーリポジトリインターフェース
  IOrderRepository.ts   # 注文リポジトリインターフェース
```

## 命名規則

| 種類 | 命名パターン | 例 |
|------|-------------|-----|
| エンティティ | PascalCase（名詞） | `User.ts`, `Order.ts` |
| 値オブジェクト | PascalCase（名詞） | `Email.ts`, `Money.ts` |
| ドメインサービス | PascalCase + Service | `PricingService.ts` |
| リポジトリインターフェース | I + PascalCase + Repository | `IUserRepository.ts` |
| 型定義 | PascalCase + Type | `UserType.ts` |

## 依存ルール

**重要: 外部importは一切禁止です**

ドメイン層は以下の依存ルールを厳守します：

1. **外部ライブラリのimport禁止**
   - フレームワーク（Express、Nest.js等）への依存禁止
   - ORMライブラリ（Prisma、TypeORM等）への依存禁止
   - 外部ユーティリティライブラリへの依存禁止

2. **他レイヤーへの依存禁止**
   - usecase層への依存禁止
   - interface層への依存禁止
   - infra層への依存禁止

3. **許可される依存**
   - 同じdomain層内の他ファイル
   - TypeScript/JavaScript標準機能

```typescript
// 良い例
import { Email } from '../valueObjects/Email';
import { IUserRepository } from '../repositories/IUserRepository';

// 悪い例 - 外部ライブラリ
import { Injectable } from '@nestjs/common';  // 禁止
import { PrismaClient } from '@prisma/client'; // 禁止

// 悪い例 - 他レイヤー
import { UserUseCase } from '../../usecase/UserUseCase'; // 禁止
import { UserController } from '../../interface/UserController'; // 禁止
```

## ディレクトリ構成例

```
src/domain/
  entities/
    User.ts
    Order.ts
    Product.ts
  valueObjects/
    Email.ts
    Money.ts
    Address.ts
    UserId.ts
  services/
    PricingService.ts
    OrderService.ts
  repositories/
    IUserRepository.ts
    IOrderRepository.ts
    IProductRepository.ts
  errors/
    DomainError.ts
    ValidationError.ts
  index.ts
```
