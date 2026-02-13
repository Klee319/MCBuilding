# 受け入れ条件 - Minecraft建築データ共有SNS

## 概要

本ドキュメントは、`docs/requirements.md` のユーザー要件を、テスト可能な受け入れ条件に変換したものである。

---

## 機能要件（Must）

### FR-001: アップロード

```gherkin
Feature: 建築データアップロード
  As a 登録ユーザー
  I want 建築データをアップロードしたい
  So that 作品を共有できる

  Scenario: 正常なアップロード
    Given ログイン済みユーザーがアップロードページにいる
    And .schematic/.litematic/.mcstructure ファイル（100MB以下）を選択
    When 「アップロード」ボタンをクリックする
    Then ファイルがアップロードされる
    And Java版/統合版の両方のデータが自動生成される

  Scenario: 非対応ファイル形式
    Given ログイン済みユーザーがアップロードページにいる
    And .zip ファイルを選択
    When 「アップロード」ボタンをクリックする
    Then エラー「対応形式は .schematic / .litematic / .mcstructure です」が表示される

  Scenario: ファイルサイズ超過
    Given ログイン済みユーザーがアップロードページにいる
    And 150MB の .schematic ファイルを選択
    When 「アップロード」ボタンをクリックする
    Then エラー「ファイルサイズが上限（100MB）を超えています」が表示される
```

### FR-002: 自動変換

```gherkin
Feature: エディション自動変換
  As a システム
  I want アップロード時に自動で変換する
  So that ユーザーは希望のエディションでダウンロードできる

  Scenario: Java版→統合版変換
    Given Java版の .schematic ファイルがアップロードされた
    When 変換処理が実行される
    Then 統合版の .mcstructure データが生成される
    And 対応バージョン（1.12〜最新）のデータが作成される

  Scenario: 変換不可ブロックの処理
    Given MODブロックを含む .litematic ファイルがアップロードされた
    When 変換処理が実行される
    Then MODブロックは空気ブロックに置換される
    And 置換されたブロックリストが表示される
    And 「前提MOD名を入力してください」と促される
```

### FR-003: 3Dプレビュー

```gherkin
Feature: 3Dプレビュー表示
  As a 閲覧者
  I want 建築を3Dで見たい
  So that ダウンロード前に確認できる

  Scenario: 通常サイズのプレビュー
    Given 200×200×200以下の建築の投稿ページにいる
    When ページが読み込まれる
    Then 3Dプレビューがフル品質で表示される
    And スマホで30fps以上で回転/ズーム操作できる

  Scenario: 大規模建築のプレビュー
    Given 200×200×200超の建築の投稿ページにいる
    When ページが読み込まれる
    Then 軽量化モードで3Dプレビューが表示される
    And 「簡易表示モードに切り替えますか？」のオプションが表示される
```

### FR-004: ダウンロード

```gherkin
Feature: 建築データダウンロード
  As a 登録ユーザー
  I want 希望のエディション/バージョンでダウンロードしたい
  So that 自分のワールドで使える

  Scenario: 正常なダウンロード
    Given ログイン済みユーザーが投稿ページにいる
    When 「ダウンロード」ボタンをクリックする
    And エディション「統合版」、バージョン「1.20」を選択する
    Then 統合版1.20向けの .mcstructure ファイルがダウンロードされる

  Scenario: 未登録ユーザーのダウンロード試行
    Given 未登録ユーザーが投稿ページにいる
    When 「ダウンロード」ボタンをクリックする
    Then 「この操作にはアカウント登録が必要です」と表示される
    And 登録ページへのリンクが表示される
```

### FR-005: いいね

```gherkin
Feature: いいね機能
  As a 登録ユーザー
  I want 建築にいいねしたい
  So that 評価を伝えられる

  Scenario: いいねする
    Given ログイン済みユーザーが投稿ページにいる
    And まだいいねしていない
    When ハートアイコンをクリックする
    Then いいねカウントが1増加する
    And ハートアイコンが塗りつぶしになる

  Scenario: 未登録ユーザーのいいね試行
    Given 未登録ユーザーが投稿ページにいる
    When ハートアイコンをクリックする
    Then 「この操作にはアカウント登録が必要です」と表示される
```

### FR-006: コメント/返信

```gherkin
Feature: コメント機能
  As a 登録ユーザー
  I want コメントを投稿したい
  So that 感想を伝えられる

  Scenario: コメント投稿
    Given ログイン済みユーザーが投稿ページにいる
    When 1000文字以内のコメントを入力して投稿する
    Then コメントが表示される

  Scenario: コメントへの返信
    Given ログイン済みユーザーが投稿ページにいる
    And 既存のコメントがある
    When 「返信」ボタンをクリックして返信を入力する
    Then 返信がスレッド形式で元コメントの下に表示される
    And 元コメント投稿者に通知が送られる

  Scenario: スパム検出
    Given ログイン済みユーザーが短時間に連続投稿した
    When 新たにコメントを投稿しようとする
    Then 「投稿間隔が短すぎます。しばらくお待ちください」と表示される
```

### FR-007: アカウント登録

```gherkin
Feature: アカウント登録
  As a 新規ユーザー
  I want アカウントを作成したい
  So that サービスを利用できる

  Scenario: メールアドレスで登録
    Given 登録ページにいる
    When メールアドレスとパスワードを入力して登録する
    Then 確認メールが送信される
    And メール認証後にアカウントが有効化される

  Scenario: 重複メールアドレス
    Given 登録ページにいる
    And 既に登録済みのメールアドレスを入力
    When 登録ボタンをクリックする
    Then 「このメールアドレスは既に登録されています」と表示される
```

### FR-008: 公開設定

```gherkin
Feature: 公開設定
  As a 投稿者
  I want 公開範囲を設定したい
  So that 共有相手をコントロールできる

  Scenario: 限定公開設定
    Given 投稿編集ページにいる
    When 「限定公開」を選択し、有効期限「1週間」を設定する
    Then 共有用URLが発行される
    And 検索結果には表示されない

  Scenario: 限定公開URL期限切れ
    Given 限定公開URLの有効期限が切れている
    When そのURLにアクセスする
    Then 「このリンクは有効期限が切れています」と表示される
```

---

## 非機能要件

### NFR-001: レンダリング性能

```yaml
非機能要件ID: NFR-001
カテゴリ: 性能
要件名: 3Dプレビュー性能
説明: スマホで200³ブロックの建築がスムーズに表示される
測定基準:
  - 指標: フレームレート
    目標値: 30fps以上
    測定方法: Chrome DevTools Performance
  - 指標: 初期表示時間
    目標値: 3秒以内
    測定方法: Lighthouse
検証方法: 実機テスト（iPhone SE, Android mid-range）
優先度: High
```

### NFR-002: ページ読み込み

```yaml
非機能要件ID: NFR-002
カテゴリ: 性能
要件名: ページ読み込み速度
説明: ページが3秒以内に操作可能状態になる
測定基準:
  - 指標: Time to Interactive (TTI)
    目標値: 3秒以内
    測定方法: Lighthouse
  - 指標: First Contentful Paint (FCP)
    目標値: 1.5秒以内
    測定方法: Lighthouse
検証方法: CI/CDでLighthouse自動実行
優先度: High
```

### NFR-003: 可用性

```yaml
非機能要件ID: NFR-003
カテゴリ: 可用性
要件名: システム稼働率
説明: サービスは高い可用性を維持する
測定基準:
  - 指標: 月間稼働率
    目標値: 99%以上
    測定方法: 監視ツール（UptimeRobot等）
検証方法: 月次稼働率レポート
優先度: High
```

### NFR-004: 対応端末

```yaml
非機能要件ID: NFR-004
カテゴリ: 互換性
要件名: ブラウザ対応
説明: 主要ブラウザで動作する
測定基準:
  - 指標: 対応ブラウザ
    目標値: Chrome, Firefox, Edge, Safari（最新2バージョン）
    測定方法: クロスブラウザテスト
  - 指標: 対応端末
    目標値: iOS Safari, Android Chrome
    測定方法: 実機テスト
検証方法: BrowserStack等でのE2Eテスト
優先度: High
```

---

## 完了定義（Definition of Done）

### 機能リリース前チェックリスト

- [ ] 全ての受け入れ条件（Given-When-Then）が自動テストで検証済み
- [ ] ユニットテストカバレッジ 80%以上
- [ ] E2Eテストでクリティカルパスが検証済み
- [ ] セキュリティレビュー完了
- [ ] パフォーマンス基準（NFR-001, NFR-002）を満たしている
- [ ] ドキュメント更新済み

---

## 参照

- 要件定義書: `docs/requirements.md`
- アーキテクチャ概要: `docs/architecture/00_overview.md`
