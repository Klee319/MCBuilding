# Domain レイヤ - メモ

## 設計判断メモ

### 2026-01-27: エンティティの識別子型

- 決定: プリミティブ型（string/number）ではなく値オブジェクトとして定義
- 理由: 型安全性の向上、誤った引数渡しの防止
- 影響: 全エンティティのIDを値オブジェクト化

### 2026-01-27: 建築データと投稿の分離

- 決定: Structure と Post を別エンティティとして定義
- 理由: 建築データ自体と、その公開設定・ソーシャルメトリクスは異なる関心事
- 影響: Post は Structure を参照する形式に

### 2026-01-27: 変換不可ブロックの扱い

- 決定: 変換不可ブロックは空気ブロック化
- 理由: ユーザー要件、データ欠損より整合性を優先
- 影響: 変換処理で空気ブロック化リストを生成し通知

### (追加メモ)

- 決定:
- 理由:
- 影響:

---

## 未解決課題

### 高優先度

- [ ] LOD（Level of Detail）のレベル定義
- [ ] リソースパック適用時のブロックマッピング

### 中優先度

- [ ] バージョン間のブロックマッピング詳細（1.12〜最新）
- [ ] 限定公開URLのトークン生成方式

### 低優先度

- [ ] 監査ログ用のメタデータ設計
- [ ] (追加課題)

---

## 参考リンク

### Minecraft関連

- [Schematic File Format](https://minecraft.wiki/w/Schematic_file_format)
- [Litematica File Format](https://github.com/maruohon/litematica)
- [McStructure Format](https://wiki.bedrock.dev/nbt/mcstructure.html)

### 実装パターン

- [Value Object パターン](https://martinfowler.com/bliki/ValueObject.html)
- [Aggregate パターン](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [Domain Event パターン](https://martinfowler.com/eaaDev/DomainEvent.html)

### プロジェクト固有

- docs/requirements.md - 要件定義書
- docs/contracts/dtos.md - DTO定義

---

## 変更履歴

| 日付 | 変更者 | 変更内容 |
|------|--------|----------|
| 2026-01-27 | PM | 初版作成（MC建築データ共有SNS用） |
| - | - | - |
