# Usecase レイヤ - メモ

## 設計判断メモ

### 2026-01-27: Result型の採用

- 決定: 例外スローではなくResult型でエラーを返却
- 理由: 型安全性の向上、エラーハンドリングの明示化
- 影響: 全ユースケースの戻り値をResult型に統一

### 2026-01-27: ダウンロード認証レベル

- 決定: email登録済み（registered以上）でダウンロード可能
- 理由: スパムアカウント対策と利用統計の精度向上
- 影響: DownloadStructureUseCaseでaccountLevelチェック

### 2026-01-27: スパム検出のタイミング

- 決定: コメント投稿時にSpamDetectorPortでチェック
- 理由: 事前防止とレート制限の一元管理
- 影響: AddCommentUseCaseがSpamDetectorPortに依存

### (追加メモ)

- 決定:
- 理由:
- 影響:

---

## 未解決課題

### 高優先度

- [ ] 変換処理の非同期化（大きなファイル対応）
- [ ] レンダリングデータ生成の非同期化

### 中優先度

- [ ] ユースケース間の共通処理の抽出方法
- [ ] 通知の配信タイミング（リアルタイム vs バッチ）

### 低優先度

- [ ] ページネーションの標準化
- [ ] (追加課題)

---

## 参考リンク

### 実装パターン

- [Clean Architecture](https://www.oreilly.com/library/view/clean-architecture-a/9780134494166/)
- [Result型によるエラーハンドリング](https://fsharpforfunandprofit.com/rop/)
- [Unit of Work パターン](https://martinfowler.com/eaaCatalog/unitOfWork.html)

### プロジェクト固有

- docs/contracts/ports.md - Port定義
- docs/contracts/dtos.md - DTO定義
- docs/contracts/api.md - API定義

---

## 変更履歴

| 日付 | 変更者 | 変更内容 |
|------|--------|----------|
| 2026-01-27 | PM | 初版作成（MC建築データ共有SNS用） |
| - | - | - |
