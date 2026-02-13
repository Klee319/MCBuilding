# DTO定義 - Minecraft建築データ共有SNS

本ドキュメントはレイヤ間データ転送オブジェクトの Single Source of Truth である。

---

## Value Objects（値オブジェクト）

### Edition（エディション）

```yaml
valueObject:
  name: "Edition"
  description: "Minecraftのエディション（Java版/統合版）"
  type: "enum"
  values:
    - "java"
    - "bedrock"
```

### Version（バージョン）

```yaml
valueObject:
  name: "Version"
  description: "Minecraftのバージョン（1.12〜最新）"
  type: "string"
  constraints:
    - type: "pattern"
      value: "^1\\.(1[2-9]|[2-9][0-9])(\\.\\d+)?$"
      message: "1.12以上のバージョンを指定してください"
  examples: ["1.12", "1.20.4", "1.21"]
```

### FileFormat（ファイル形式）

```yaml
valueObject:
  name: "FileFormat"
  description: "対応する建築データファイル形式"
  type: "enum"
  values:
    - "schematic"
    - "litematic"
    - "mcstructure"
```

### Visibility（公開設定）

```yaml
valueObject:
  name: "Visibility"
  description: "投稿の公開範囲"
  type: "enum"
  values:
    - "public"      # 公開
    - "private"     # 非公開
    - "unlisted"    # 限定公開（URLを知っている人のみ）
```

### AccountLevel（アカウントレベル）

```yaml
valueObject:
  name: "AccountLevel"
  description: "ユーザーの認証レベル"
  type: "enum"
  values:
    - "unregistered"      # 未登録
    - "email_verified"    # メール認証済み
    - "phone_verified"    # 電話認証済み
    - "sns_linked"        # SNS連携済み
```

---

## Entity DTOs

### StructureInput（建築データ入力）

```yaml
dto:
  name: "StructureInput"
  description: "建築データアップロード時の入力"
  category: "input"

  fields:
    - name: "file"
      type: "binary"
      required: true
      nullable: false
      description: "建築データファイル"
      constraints:
        - type: "maxSize"
          value: "100MB"
          message: "ファイルサイズが上限（100MB）を超えています"
        - type: "format"
          value: ["schematic", "litematic", "mcstructure"]
          message: "対応形式は .schematic / .litematic / .mcstructure です"

    - name: "originalEdition"
      type: "Edition"
      required: true
      nullable: false
      description: "元のエディション"
      example: "java"

    - name: "originalVersion"
      type: "Version"
      required: true
      nullable: false
      description: "元のバージョン"
      example: "1.20.4"
```

### StructureOutput（建築データ出力）

```yaml
dto:
  name: "StructureOutput"
  description: "建築データの出力表現"
  category: "output"

  fields:
    - name: "id"
      type: "string"
      required: true
      description: "建築データID"
      example: "str_01HXYZ123ABC"

    - name: "originalFormat"
      type: "FileFormat"
      required: true
      description: "元のファイル形式"

    - name: "originalEdition"
      type: "Edition"
      required: true
      description: "元のエディション"

    - name: "originalVersion"
      type: "Version"
      required: true
      description: "元のバージョン"

    - name: "dimensions"
      type: "object"
      required: true
      description: "建築サイズ"
      fields:
        - name: "x"
          type: "integer"
        - name: "y"
          type: "integer"
        - name: "z"
          type: "integer"

    - name: "blockCount"
      type: "integer"
      required: true
      description: "総ブロック数"

    - name: "convertedBlocks"
      type: "object[]"
      required: false
      nullable: true
      description: "変換で空気化されたブロックリスト"
      fields:
        - name: "blockId"
          type: "string"
        - name: "count"
          type: "integer"

    - name: "availableEditions"
      type: "Edition[]"
      required: true
      description: "ダウンロード可能なエディション"

    - name: "availableVersions"
      type: "Version[]"
      required: true
      description: "ダウンロード可能なバージョン"
```

### PostInput（投稿入力）

```yaml
dto:
  name: "CreatePostInput"
  description: "投稿作成時の入力"
  category: "input"

  fields:
    - name: "title"
      type: "string"
      required: true
      nullable: false
      description: "投稿タイトル"
      constraints:
        - type: "minLength"
          value: 1
          message: "タイトルを入力してください"
        - type: "maxLength"
          value: 50
          message: "タイトルは50文字以内で入力してください"
      example: "中世ヨーロッパ風城"

    - name: "description"
      type: "string"
      required: false
      nullable: true
      description: "説明文"
      constraints:
        - type: "maxLength"
          value: 2000
          message: "説明文は2000文字以内で入力してください"

    - name: "tags"
      type: "string[]"
      required: false
      nullable: true
      description: "タグ（最大10個）"
      constraints:
        - type: "maxItems"
          value: 10
          message: "タグは10個以内で指定してください"

    - name: "requiredMods"
      type: "string[]"
      required: false
      nullable: true
      description: "前提MOD名"

    - name: "visibility"
      type: "Visibility"
      required: true
      nullable: false
      description: "公開設定"
      example: "public"

    - name: "unlistedExpiry"
      type: "datetime | null"
      required: false
      nullable: true
      description: "限定公開の有効期限（無期限はnull）"
```

### PostOutput（投稿出力）

```yaml
dto:
  name: "PostOutput"
  description: "投稿の出力表現"
  category: "output"

  fields:
    - name: "id"
      type: "string"
      required: true
      description: "投稿ID"
      example: "post_01HXYZ456DEF"

    - name: "title"
      type: "string"
      required: true
      description: "タイトル"

    - name: "description"
      type: "string"
      required: true
      nullable: true
      description: "説明文"

    - name: "tags"
      type: "string[]"
      required: true
      description: "タグ"

    - name: "requiredMods"
      type: "string[]"
      required: true
      description: "前提MOD名"

    - name: "visibility"
      type: "Visibility"
      required: true
      description: "公開設定"

    - name: "unlistedUrl"
      type: "string"
      required: false
      nullable: true
      description: "限定公開URL（visibilityがunlistedの場合のみ）"

    - name: "unlistedExpiry"
      type: "datetime"
      required: false
      nullable: true
      description: "限定公開の有効期限"

    - name: "structure"
      type: "StructureOutput"
      required: true
      description: "建築データ"

    - name: "author"
      type: "UserSummaryOutput"
      required: true
      description: "投稿者"

    - name: "likeCount"
      type: "integer"
      required: true
      description: "いいね数"

    - name: "downloadCount"
      type: "integer"
      required: true
      description: "ダウンロード数"

    - name: "commentCount"
      type: "integer"
      required: true
      description: "コメント数"

    - name: "createdAt"
      type: "datetime"
      required: true
      description: "投稿日時"

    - name: "updatedAt"
      type: "datetime"
      required: true
      description: "更新日時"
```

### UserInput（ユーザー入力）

```yaml
dto:
  name: "CreateUserInput"
  description: "ユーザー登録時の入力"
  category: "input"

  fields:
    - name: "email"
      type: "string"
      required: true
      nullable: false
      description: "メールアドレス"
      constraints:
        - type: "format"
          value: "email"
          message: "有効なメールアドレスを入力してください"
        - type: "maxLength"
          value: 255
          message: "メールアドレスは255文字以内で入力してください"

    - name: "password"
      type: "string"
      required: true
      nullable: false
      description: "パスワード"
      constraints:
        - type: "minLength"
          value: 8
          message: "パスワードは8文字以上で入力してください"
        - type: "maxLength"
          value: 128
          message: "パスワードは128文字以内で入力してください"

    - name: "displayName"
      type: "string"
      required: true
      nullable: false
      description: "表示名"
      constraints:
        - type: "minLength"
          value: 1
        - type: "maxLength"
          value: 50
```

### UserOutput（ユーザー出力）

```yaml
dto:
  name: "UserOutput"
  description: "ユーザー情報の出力表現"
  category: "output"

  fields:
    - name: "id"
      type: "string"
      required: true
      description: "ユーザーID"

    - name: "displayName"
      type: "string"
      required: true
      description: "表示名"

    - name: "accountLevel"
      type: "AccountLevel"
      required: true
      description: "アカウントレベル"

    - name: "badges"
      type: "string[]"
      required: true
      description: "バッジ一覧"

    - name: "pinnedPosts"
      type: "PostSummaryOutput[]"
      required: true
      description: "代表作（最大3つ）"

    - name: "followerCount"
      type: "integer"
      required: true
      description: "フォロワー数"

    - name: "followingCount"
      type: "integer"
      required: true
      description: "フォロー数"

    - name: "postCount"
      type: "integer"
      required: true
      description: "投稿数"

    - name: "createdAt"
      type: "datetime"
      required: true
      description: "登録日時"
```

### UserSummaryOutput（ユーザーサマリー出力）

```yaml
dto:
  name: "UserSummaryOutput"
  description: "ユーザーの簡易出力（投稿者表示等）"
  category: "output"

  fields:
    - name: "id"
      type: "string"
      required: true

    - name: "displayName"
      type: "string"
      required: true

    - name: "accountLevel"
      type: "AccountLevel"
      required: true

    - name: "badges"
      type: "string[]"
      required: true
```

### CommentInput（コメント入力）

```yaml
dto:
  name: "CreateCommentInput"
  description: "コメント投稿時の入力"
  category: "input"

  fields:
    - name: "postId"
      type: "string"
      required: true
      description: "対象投稿ID"

    - name: "parentCommentId"
      type: "string"
      required: false
      nullable: true
      description: "返信先コメントID（スレッド用）"

    - name: "content"
      type: "string"
      required: true
      nullable: false
      description: "コメント本文"
      constraints:
        - type: "minLength"
          value: 1
          message: "コメントを入力してください"
        - type: "maxLength"
          value: 1000
          message: "コメントは1000文字以内で入力してください"
```

### CommentOutput（コメント出力）

```yaml
dto:
  name: "CommentOutput"
  description: "コメントの出力表現"
  category: "output"

  fields:
    - name: "id"
      type: "string"
      required: true
      description: "コメントID"

    - name: "content"
      type: "string"
      required: true
      description: "コメント本文"

    - name: "author"
      type: "UserSummaryOutput"
      required: true
      description: "投稿者"

    - name: "parentCommentId"
      type: "string"
      required: true
      nullable: true
      description: "返信先コメントID"

    - name: "replies"
      type: "CommentOutput[]"
      required: true
      description: "返信コメント（スレッド）"

    - name: "isDeleted"
      type: "boolean"
      required: true
      description: "削除済みフラグ"

    - name: "createdAt"
      type: "datetime"
      required: true
      description: "投稿日時"
```

### DownloadStructureInput（ダウンロード入力 - 拡張）

```yaml
dto:
  name: "DownloadStructureInput"
  description: "建築データダウンロード時の入力（クロスフォーマット対応）"
  category: "input"

  fields:
    - name: "postId"
      type: "string"
      required: true

    - name: "requestedEdition"
      type: "Edition"
      required: true

    - name: "requestedVersion"
      type: "Version"
      required: true

    - name: "targetFormat"
      type: "FileFormat"
      required: false
      nullable: true
      description: "ダウンロード時のファイル形式（省略時はオリジナル形式）"

    - name: "requesterId"
      type: "string"
      required: false
      nullable: true

    - name: "unlistedToken"
      type: "string"
      required: false
      nullable: true
```

### ExportResult（エクスポート結果）

```yaml
dto:
  name: "ExportResult"
  description: "構造データエクスポートの結果"
  category: "output"

  fields:
    - name: "data"
      type: "binary"
      required: true
      description: "エクスポートされたファイルデータ"

    - name: "format"
      type: "FileFormat"
      required: true
      description: "出力ファイル形式"

    - name: "fileName"
      type: "string"
      required: true
      description: "推奨ファイル名"

    - name: "hasDataLoss"
      type: "boolean"
      required: true
      description: "変換でデータ損失が発生したか"

    - name: "lostBlocks"
      type: "object[]"
      required: false
      nullable: true
      description: "変換で空気化されたブロックリスト"
      fields:
        - name: "blockId"
          type: "string"
        - name: "count"
          type: "integer"
```

---

## Query DTOs

### PostQuery（投稿検索）

```yaml
dto:
  name: "PostQuery"
  description: "投稿検索のフィルタ条件"
  category: "query"

  fields:
    - name: "keyword"
      type: "string"
      required: false
      description: "キーワード（タイトル/説明/タグ）"

    - name: "edition"
      type: "Edition[]"
      required: false
      description: "エディションフィルタ"

    - name: "version"
      type: "Version[]"
      required: false
      description: "バージョンフィルタ"

    - name: "sizeCategory"
      type: "enum(small, medium, large, xlarge)[]"
      required: false
      description: "サイズカテゴリ（小〜50³/中〜100³/大〜200³/特大200³超）"

    - name: "hasRequiredMods"
      type: "boolean"
      required: false
      description: "前提MODあり/なし"

    - name: "authorId"
      type: "string"
      required: false
      description: "投稿者ID"

    - name: "createdWithin"
      type: "enum(1day, 1week, 1month, all)"
      required: false
      description: "投稿期間フィルタ"

    - name: "sortBy"
      type: "enum(popular, newest, downloads)"
      required: false
      description: "ソート基準"

    - name: "page"
      type: "integer"
      required: false
      constraints:
        - type: "min"
          value: 1

    - name: "limit"
      type: "integer"
      required: false
      constraints:
        - type: "min"
          value: 1
        - type: "max"
          value: 100
```

---

## Render DTOs（レンダリング用）

### BlockShape（ブロック形状）

```yaml
valueObject:
  name: "BlockShape"
  description: "ブロックの形状タイプ"
  type: "enum"
  values:
    # 基本形状
    - "full"           # フルブロック
    - "stairs"         # 階段
    - "slab"           # スラブ
    - "fence"          # フェンス
    - "wall"           # 壁
    - "door"           # ドア
    - "trapdoor"       # トラップドア
    - "pressure_plate" # 感圧板
    - "button"         # ボタン
    - "torch"          # 松明
    - "carpet"         # カーペット
    - "glass_pane"     # 板ガラス
    - "chain"          # 鎖
    - "lantern"        # ランタン
    - "cross"          # クロス型（花・草等）
    # 拡張形状（v1.1+）
    - "lever"          # レバー
    - "sign"           # 看板
    - "banner"         # 旗
    - "bed"            # ベッド
    - "chest"          # チェスト
    - "anvil"          # 金床
    - "cauldron"       # 大釜
    - "hopper"         # ホッパー
    - "brewing_stand"  # 醸造台
    - "enchanting_table" # エンチャントテーブル
    - "end_portal_frame" # エンドポータルフレーム
    - "dragon_egg"     # ドラゴンの卵
    - "bell"           # 鐘
    - "campfire"       # 焚き火
    - "grindstone"     # 砥石
    - "lectern"        # 書見台
    - "stonecutter"    # 石切台
    - "composter"      # コンポスター
    - "beehive"        # ハチの巣
    - "candle"         # ろうそく
    - "amethyst_cluster" # アメジストクラスター
    - "pointed_dripstone" # 鍾乳石
    - "sculk_sensor"   # スカルクセンサー
    - "decorated_pot"  # 飾り壺
    - "head"           # モブの頭
    - "flower_pot"     # 植木鉢
    - "rail"           # レール
    - "ladder"         # はしご
    - "snow_layer"     # 雪
    - "farmland"       # 耕地
    - "path"           # 土の道
    - "cake"           # ケーキ
    - "end_rod"        # エンドロッド
    - "lightning_rod"  # 避雷針
    - "custom"         # その他/動的定義
```

### BlockShapeDefinition（形状定義）

```yaml
dto:
  name: "BlockShapeDefinition"
  description: "ブロック形状のジオメトリ定義（JSONレジストリ用）"
  category: "render"

  fields:
    - name: "shape"
      type: "BlockShape"
      required: true
      description: "形状タイプ"

    - name: "geometry"
      type: "object"
      required: true
      description: "ジオメトリ生成パラメータ"
      fields:
        - name: "type"
          type: "enum(box, multi_box, cross, custom)"
          required: true
          description: "ジオメトリタイプ"
        - name: "boxes"
          type: "BoxDefinition[]"
          required: false
          description: "ボックス定義（type=box/multi_boxの場合）"
        - name: "customGenerator"
          type: "string"
          required: false
          description: "カスタム生成関数名（type=customの場合）"

    - name: "rotatable"
      type: "boolean"
      required: true
      description: "向き対応フラグ"

    - name: "connectable"
      type: "enum(horizontal, vertical, both)"
      required: false
      nullable: true
      description: "接続タイプ（フェンス・壁等）"
```

### BoxDefinition（ボックス定義）

```yaml
dto:
  name: "BoxDefinition"
  description: "ブロック形状を構成するボックス（0-16スケール）"
  category: "render"

  fields:
    - name: "from"
      type: "[number, number, number]"
      required: true
      description: "開始座標（0-16スケール）"
      example: [0, 0, 0]

    - name: "to"
      type: "[number, number, number]"
      required: true
      description: "終了座標（0-16スケール）"
      example: [16, 16, 16]

    - name: "rotation"
      type: "object"
      required: false
      nullable: true
      description: "回転パラメータ"
      fields:
        - name: "axis"
          type: "enum(x, y, z)"
          required: true
        - name: "angle"
          type: "number"
          required: true
          description: "角度（度）"
        - name: "origin"
          type: "[number, number, number]"
          required: true
          description: "回転中心"
```

### BlockFacing（ブロック向き）

```yaml
valueObject:
  name: "BlockFacing"
  description: "ブロックの向き"
  type: "enum"
  values:
    - "north"
    - "south"
    - "east"
    - "west"
    - "up"
    - "down"
```

### BlockHalf（ブロック半分位置）

```yaml
valueObject:
  name: "BlockHalf"
  description: "スラブ・階段の上下位置"
  type: "enum"
  values:
    - "top"
    - "bottom"
```

### StairShape（階段形状）

```yaml
valueObject:
  name: "StairShape"
  description: "階段の接続形状"
  type: "enum"
  values:
    - "straight"
    - "inner_left"
    - "inner_right"
    - "outer_left"
    - "outer_right"
```

### BlockData（レンダリング用ブロックデータ）

```yaml
dto:
  name: "BlockData"
  description: "3Dレンダリング用のブロックデータ"
  category: "render"

  fields:
    - name: "x"
      type: "integer"
      required: true
      description: "X座標"

    - name: "y"
      type: "integer"
      required: true
      description: "Y座標"

    - name: "z"
      type: "integer"
      required: true
      description: "Z座標"

    - name: "paletteIndex"
      type: "integer"
      required: true
      description: "パレットインデックス"

    - name: "shape"
      type: "BlockShape"
      required: false
      nullable: true
      description: "ブロック形状（省略時はfull）"
      default: "full"

    - name: "facing"
      type: "BlockFacing"
      required: false
      nullable: true
      description: "ブロックの向き"

    - name: "half"
      type: "BlockHalf"
      required: false
      nullable: true
      description: "上下位置（スラブ・階段用）"

    - name: "stairShape"
      type: "StairShape"
      required: false
      nullable: true
      description: "階段の接続形状"

    - name: "waterlogged"
      type: "boolean"
      required: false
      nullable: true
      description: "水浸し状態"
```

### BlockPalette（ブロックパレット）

```yaml
dto:
  name: "BlockPalette"
  description: "ブロックパレットエントリ"
  category: "render"

  fields:
    - name: "name"
      type: "string"
      required: true
      description: "ブロックID（minecraft:stone等）"

    - name: "properties"
      type: "Record<string, string>"
      required: false
      nullable: true
      description: "ブロック状態プロパティ"
```

### RenderData（レンダリングデータ）

```yaml
dto:
  name: "RenderData"
  description: "3Dビューワー用レンダリングデータ"
  category: "render"

  fields:
    - name: "blocks"
      type: "BlockData[]"
      required: true
      description: "ブロックデータ配列"

    - name: "palette"
      type: "BlockPalette[]"
      required: true
      description: "ブロックパレット"

    - name: "dimensions"
      type: "object"
      required: true
      description: "構造物サイズ"
      fields:
        - name: "x"
          type: "integer"
        - name: "y"
          type: "integer"
        - name: "z"
          type: "integer"
```

---

## 参照

- 要件定義書: `docs/requirements.md`
- Port定義: `docs/contracts/ports.md`
- API定義: `docs/contracts/api.md`
