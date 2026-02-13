# Infra レイヤ - メモ

## 設計判断メモ

### 2026-01-27: S3互換ストレージ

- 決定: AWS S3またはMinIO（S3互換）を使用
- 理由: 署名付きURL、大容量ファイル対応、スケーラビリティ
- 影響: 開発環境ではMinIO、本番ではS3を使用

### 2026-01-27: 変換エンジンの実装方式

- 決定: TypeScript/Rustで自前実装
- 理由: 既存ライブラリではJava↔Bedrock双方向変換が不十分
- 影響: ブロックマッピングテーブルのメンテナンスが必要

### 2026-01-27: レート制限の実装

- 決定: Redisでスライディングウィンドウ方式
- 理由: 分散環境対応、精度とパフォーマンスのバランス
- 影響: RedisSpamDetectorの実装

### 2026-01-29: 非フルブロック描画バグ修正

- 決定: TexturedBlockRenderer.tsにBoxDimensionsベースのUVスケーリングを実装
- 理由: 階段、スラブ、フェンス等のテクスチャが圧縮/ずれて表示されるバグ
- 影響:
  - `scaleUVForFace()` 関数追加（面ごとのUVスケーリング）
  - `applyBoxUVsToMergedGeometryWithFaceRanges()` に boxDimensions パラメータ追加
  - `createConnectableGeometry()` でボックス寸法計算追加
  - テスト24件追加（geometry-generator: 8件、textured-block-renderer: 16件）

### (追加メモ)

- 決定:
- 理由:
- 影響:

---

## 未解決課題

### 高優先度

- [ ] ブロックマッピングテーブルの整備（1.12〜最新）
- [ ] 大容量ファイル（50MB以上）の変換パフォーマンス

### 中優先度

- [ ] LODデータの事前生成 vs オンデマンド生成
- [ ] リソースパックキャッシュの有効期限

### 低優先度

- [ ] 変換キューの優先度設定
- [ ] (追加課題)

---

## 参考リンク

### 技術

- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS S3 SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [MinIO JavaScript Client](https://min.io/docs/minio/linux/developers/javascript/API.html)
- [NBT.js](https://github.com/sjmulder/nbt-js) - NBTパーサー

### Minecraft関連

- [Block ID Changes (1.13)](https://minecraft.wiki/w/Java_Edition_data_values/Pre-flattening)
- [Bedrock Block IDs](https://wiki.bedrock.dev/blocks/block-states.html)

### プロジェクト固有

- docs/contracts/ports.md - Port定義

---

## 変更履歴

| 日付 | 変更者 | 変更内容 |
|------|--------|----------|
| 2026-01-27 | PM | 初版作成（MC建築データ共有SNS用） |
| 2026-01-29 | PM | 非フルブロック描画バグ修正（UV スケーリング実装） |
| - | - | - |
