# studio.ketabawo.asia

個人広告主がCreativeを作成し、Google Adsへ出稿・計測し、AIと相談しながら改善するための広告運用支援ツールです。現在は、その最初の縦切りとして **Campaign作成とCreative登録** まで実装しています。

## プロダクト方針

Creativeの作成方法と広告運用を分離します。広告運用はstudio内で画像を作ることを前提にせず、次のCreativeを同じ入口から扱える構造を目指します。

- studio内で作成した、再編集可能なCreative
- Photoshop、Canva、生成AI、制作会社などで作成した外部Creative
- 保存済みCreativeの再利用・編集

```text
Creative（studio制作 / 外部アップロード / 再利用）
    ↓
広告入稿 → 配信・予算管理 → 効果測定 → AI分析 → 改善提案
    ↑                                              ↓
    └──────────── Creative改善 / 運用改善 ←─────────┘
```

studio制作Creativeは編集可能な元データを保持できるため、将来的に「広告実績 → AI分析 → Creative修正 → 再配信」をシームレスにつなげられる点を独自価値とします。

## MVPのゴール

```text
Campaign作成 → Creative作成 → Google Ads入稿 → 計測
    → Dashboard → AIとの相談 → 変更案確認 → 承認後に反映
```

複数クライアント・複数媒体・権限管理・承認フロー・完全自動最適化はMVP対象外です。

## 現在の実装範囲

実装済み：

- Campaignの基本設定
- CampaignとCreativeの関連付け
- ブラウザ内へのCampaign下書き保存
- Campaign一覧からの選択・再編集・上書き保存
- Google Adsディスプレイ広告の最小設定
- 入稿前Review（実API送信は未実装）
- Creative制作MVP

- Canvasによるリアルタイムプレビュー
- 単色背景、背景画像、オーバーレイ
- メインコピー、サブコピー、CTA
- 配色、文字サイズ、文字揃え、太字、角丸
- 主要な広告サイズの切り替え
- PNG出力
- PNG・JPEG・WebPの背景画像読み込みと下書きへの保持

未実装：Google Ads連携、実績取得、Dashboard、AI Campaign Assistant、Execution Plan、クラウド保存、ログイン。

## 設計原則

### Creativeを独立したドメインとして扱う

型定義は [`src/lib/types/creative.ts`](src/lib/types/creative.ts) に集約しています。

- `CreativeState`: studio内エディタの編集可能な状態
- `CreativeSource`: `studio` または `upload` の入力元を表す境界
- `Creative`: 広告運用側から参照するCreativeの最小モデル

外部アップロードCreativeはエディタを経由せずに広告運用へ接続できます。Campaign / Ad / Performanceは将来CreativeのIDを参照し、Editor内部の構造には依存させません。

### 編集状態は一つにする

現在のパラメータUIと将来のAIチャットは、どちらも同じ `CreativeState` を更新します。AI専用の編集状態を別に持たせません。

```text
Parameter UI ─┐
              ├─ CreativeState ─→ Preview / 保存 / PNG出力
AI commands ──┘
```

将来の画面は Preview + Chat を主画面とし、数値による厳密な調整は Advanced UIとして残す想定です。

### モジュール間の依存方向

```text
Creative Editor ─→ Creative
External Upload ─→ Creative
                         ↑
Campaign / Ad / Performance
```

広告運用機能からCreative Editorへの依存を作りません。Canvas描画などの制作固有処理も広告運用ドメインへ持ち込みません。

## 開発環境

| 項目 | 内容 |
| --- | --- |
| フレームワーク | SvelteKit 2 / Svelte 5 |
| 言語 | TypeScript 5 |
| ビルドツール | Vite 7 |
| 描画 | HTML Canvas API |
| パッケージ管理 | npm |
| 推奨Node.js | 22.12以上 |

```bash
npm install
npm run dev
```

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run check` | Svelte／TypeScriptの型チェック |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果を確認 |
| `npm run deploy` | 静的ビルド後、CORESERVERへFTPSでアップロード |

## プロジェクト構成

```text
src/
├─ lib/
│  ├─ banner/       # 現Creative制作MVPのCanvas描画・出力処理
│  ├─ components/   # Creativeの編集パネルとプレビューUI
│  └─ types/
│     └─ creative.ts
└─ routes/
   └─ +page.svelte  # Creative制作画面
```

`banner/` と既存コンポーネント名は、動作中のMVPを大規模に作り直さない方針から現時点では維持しています。新しい広告運用機能をこのディレクトリへ追加しないでください。

## ロードマップ上の境界

次の段階では、広告運用サイクルを縦に一周させるために必要な機能だけを追加します。

1. Campaign一覧・詳細・編集
2. Google Ads Adapterと入稿Review
3. Performanceデータ取得とDashboard
4. AIによる状況説明・相談・Recommendation
5. Execution Planの確認、承認後のGoogle Ads反映、Action Log

将来機能のための空実装や、広告媒体ごとの仕様を現段階でドメインモデルへ固定することは避けます。

## デプロイ

本アプリは`adapter-static`を使用し、`build`へ静的出力します。`.env.deploy.example`を`.env.deploy`へコピーし、CORESERVERのFTPS情報を設定してから実行します。

```bash
npm run deploy
```

`.env.deploy`はGit管理対象外です。デプロイ処理は公開先の既存ファイルを削除せず、同名ファイルのみ上書きします。
