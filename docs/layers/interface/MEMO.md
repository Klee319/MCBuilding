# Interface レイヤ - メモ

## 設計判断メモ

### 2026-01-27: zodによるバリデーション

- 決定: zodスキーマで入力バリデーションを統一
- 理由: 型推論との親和性、宣言的な記述
- 影響: 全Controllerでzodスキーマを使用

### 2026-01-27: 3Dレンダラーの配置

- 決定: Interface層にWebGLレンダラーを配置
- 理由: UI/UX関連はInterface層の責務
- 影響: レンダリングデータ生成はInfra層、表示はInterface層

### 2026-01-27: 埋め込みAPI

- 決定: /embed/:postIdでiframe埋め込み用HTMLを返却
- 理由: 外部サイトでの3Dプレビュー表示要件
- 影響: EmbedController、EmbedPresenterの追加

### (追加メモ)

- 決定:
- 理由:
- 影響:

---

## 未解決課題

### 高優先度

- [ ] WebGLレンダラーのモバイル最適化（30fps達成）
- [ ] LODレベルの閾値決定

### 中優先度

- [ ] リソースパックアップロードUI
- [ ] 埋め込みコード生成UI

### 低優先度

- [ ] ダークモード対応
- [ ] (追加課題)

---

## 参考リンク

### 技術

- [Three.js Documentation](https://threejs.org/docs/)
- [zod Documentation](https://zod.dev/)
- [Hono Framework](https://hono.dev/)

### プロジェクト固有

- docs/contracts/api.md - API定義
- docs/contracts/dtos.md - DTO定義

---

## 変更履歴

| 日付 | 変更者 | 変更内容 |
|------|--------|----------|
| 2026-01-27 | PM | 初版作成（MC建築データ共有SNS用） |
| - | - | - |
