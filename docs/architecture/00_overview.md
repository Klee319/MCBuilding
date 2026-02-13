# Architecture Overview - Minecraft建築データ共有SNS

## 目的

本ドキュメントは、Minecraft建築データ共有SNSのアーキテクチャ概要を定義する。

### プロダクトの目的
1. **エディション間の壁をなくす**: Java版⇔統合版の建築データを自動変換
2. **建築を魅せる場を提供**: 3Dプレビューで作品を埋もれさせない
3. **バージョン互換を実現**: 欲しいバージョン向けに変換済みデータを即取得

### 非目的（スコープ外）
- ワールドデータ丸ごとの共有
- MODブロックの変換（前提MOD名記述のみ）
- リアルタイム共同編集
- ゲーム内からの直接アップロード/ダウンロード
- オフライン閲覧（PWA等）
- 課金・収益化機能（初期リリースでは）
- MC 1.11以前のバージョン対応

---

## 前提条件

### 技術前提
- 対応ファイル形式: `.schematic`, `.litematic`, `.mcstructure`
- ファイルサイズ上限: 100MB
- 対応MCバージョン: 1.12〜最新
- レンダリング目標: スマホで200³ブロックが30fps以上

### ビジネス前提
- 変換で対応できないブロックは空気ブロック化
- リソパ適用はバニラブロックのみ
- 限定公開URLは推測困難なランダム文字列
- スパム判定は「短時間連続投稿」基準

---

## アーキテクチャ方針

### Clean Architecture

本アーキテクチャは、**Context Package化による情報最小化**を核心的な目的として採用する。

```
[Domain] ← [Usecase] ← [Interface] ← [Infra]
   ↑           ↑            ↑           ↑
 Entity    UseCase      Controller   Repository
 ValueObj  Port(IF)     Presenter    Gateway
                        DTO          External
```

### 依存方向
- **外側 → 内側のみ**（逆方向の依存は禁止）
- Domain は何にも依存しない
- Infra は Port を実装し、Usecase に注入される

### レイヤ責務

| Layer | 責務 | 禁止 |
|-------|------|------|
| Domain | Entity, ValueObject, DomainService | 外部依存、I/O |
| Usecase | ビジネスロジック、Port定義 | UI/DB直接アクセス |
| Interface | Controller, Presenter, DTO変換 | ビジネスロジック |
| Infra | Repository実装、外部API連携 | ビジネスロジック |

### Context Package化の原則

```
各レイヤ・モジュールは、自身の責務遂行に必要な最小限の情報のみを
コンテキストとして受け取る。これにより：
- 結合度の低減
- 認知負荷の軽減
- セキュリティリスクの最小化
を実現する。
```

---

## ディレクトリ構成

```
src/
├── domain/                    # Domain Layer
│   ├── entities/             # エンティティ（Structure, Post, User等）
│   ├── value-objects/        # 値オブジェクト（Edition, Version等）
│   ├── services/             # ドメインサービス
│   └── events/               # ドメインイベント
│
├── usecase/                   # UseCase Layer
│   ├── structure/            # 建築データ関連ユースケース
│   ├── post/                 # 投稿関連ユースケース
│   ├── user/                 # ユーザー関連ユースケース
│   ├── social/               # ソーシャル機能ユースケース
│   └── ports/                # Port定義
│
├── interface/                 # Interface Layer
│   ├── api/                  # REST APIコントローラ
│   ├── web/                  # Webページコントローラ
│   ├── renderer/             # 3Dレンダラー関連
│   └── dto/                  # DTOマッピング
│
└── infra/                     # Infrastructure Layer
    ├── repositories/         # リポジトリ実装
    ├── converter/            # 建築データ変換（Java↔統合版）
    ├── storage/              # ファイルストレージ
    └── external/             # 外部APIクライアント
```

---

## 用語集（アーキテクチャ観点）

| 用語 | 定義 |
|------|------|
| Structure | 建築データ（.schematic/.litematic/.mcstructure） |
| Post | 投稿（Structure + メタデータ + 公開設定） |
| Edition | Java版 or 統合版 |
| Version | MCバージョン（1.12, 1.20.4 等） |
| Conversion | Edition/Version間の変換処理 |
| Renderer | 3Dプレビュー表示コンポーネント |
| ResourcePack | テクスチャ変更パック（バニラブロックのみ対応） |
| Visibility | 公開設定（public/private/unlisted） |

---

## 参照

- 要件定義書: `docs/requirements.md`
- 受け入れ条件: `docs/architecture/01_acceptance.md`
- 契約: `docs/contracts/`
