# AdSense Banner Generator

> [!NOTE]
> 初回MVPでは **Simpleテンプレートのみ**を実装し、Photo／Split、グラデーション、ロゴ、Google FontsはPhase 2とします。
> UIは白〜淡いグレー＋青系アクセント、フォントはOS標準の日本語フォントを使用します。


## 1. 概要

Google
AdSense／ディスプレイ広告向けのバナー画像を、ブラウザ上で簡単に作成・書き出しできるジェネレーターを開発する。

ユーザーは背景画像・テキスト・CTA・配色などを設定し、主要な広告サイズのバナーを生成できる。

MVPでは「デザインツール化」しすぎず、**テンプレート＋必要項目を入力するだけで広告バナーが完成する**ことを優先する。

## 2. 基本方針

-   ブラウザのみで完結
-   ログイン不要
-   サーバー保存不要
-   入力内容・画像は原則クライアント側で処理
-   PC利用をメインターゲットとする
-   レスポンシブUI
-   バナーはPNG形式で書き出す
-   複数広告サイズへ展開しやすい構造にする
-   将来的なテンプレート追加を容易にする

## 3. 想定技術

-   SvelteKit
-   TypeScript
-   HTML Canvas
-   CSS
-   必要に応じて Canvas 描画補助ライブラリを利用
-   画像生成処理は可能な限りクライアントサイド

## 4. 画面構成

画面は大きく以下の2カラム構成とする。

### 左カラム：設定パネル

バナー内容を編集するUI。

### 右カラム：プレビュー

生成中のバナーをリアルタイム表示する。

PCでは左右配置、画面幅が狭い場合は上下配置とする。

## 5. バナーサイズ

初期対応サイズ：

-   300 × 250
-   336 × 280
-   728 × 90
-   970 × 90
-   970 × 250
-   300 × 600
-   320 × 100
-   320 × 50

サイズは定数ファイル等で一元管理し、後から簡単に追加できる構造とする。

``` ts
type BannerSize = {
  id: string;
  width: number;
  height: number;
  label: string;
};
```

## 6. 編集項目

### 6.1 バナーサイズ

セレクトボックスまたはボタンから選択。変更時にCanvasサイズも変更する。

### 6.2 背景

以下に対応。

-   単色背景
-   グラデーション
-   画像アップロード

画像の場合： - cover - contain - 表示位置 - 拡大縮小 - オーバーレイ

MVPでは最低限、cover表示・中央配置・半透明黒オーバーレイまで対応すればよい。

### 6.3 メインコピー

設定可能項目：

-   メインテキスト
-   文字サイズ
-   太字
-   文字色
-   左寄せ／中央／右寄せ

改行を許可する。Canvas領域から文字がはみ出す場合は警告する。

### 6.4 サブコピー

設定項目：

-   文字サイズ
-   文字色
-   表示／非表示

### 6.5 CTA

設定項目：

-   CTAテキスト
-   背景色
-   文字色
-   角丸
-   表示／非表示

### 6.6 ロゴ

PNG / JPG / WebPなどの画像をアップロード可能。

基本配置： - 左上 - 右上 - 左下 - 右下

MVPではドラッグ移動を実装せず、プリセット位置指定でもよい。

## 7. テンプレート

MVPでは3種類程度用意する。

### Template 01：Simple

-   単色背景
-   大きなメインコピー
-   CTA

### Template 02：Photo

-   背景画像
-   黒半透明オーバーレイ
-   白文字
-   CTA

### Template 03：Split

-   左側にテキスト
-   右側に画像

テンプレート定義はUIロジックから分離する。

## 8. プレビュー

入力変更時に即座にプレビューへ反映する。

更新対象： - テキスト - 背景 - 色 - CTA - ロゴ - サイズ - テンプレート

可能な限りページ再描画ではなくCanvasのみ更新する。

## 9. バナー生成

Canvasを使用して最終画像を描画する。

基本描画順：

背景 → 背景画像 → オーバーレイ → 装飾 → メインコピー → サブコピー → CTA
→ ロゴ

## 10. PNG書き出し

「PNGダウンロード」ボタンを設置。

ファイル名例：

`banner-300x250.png`

Canvasの `canvas.toBlob()` 等を利用してPNGとして保存する。

## 11. 複数サイズ一括生成

最終的には重要機能とするが、MVPではPhase 2でもよい。

複数サイズをチェックして一括生成し、ZIPで保存できる構造を想定しておく。

## 12. 状態管理

バナー状態は1つのオブジェクトとして管理する。

``` ts
type BannerState = {
  size: BannerSize;
  background: {
    type: 'color' | 'gradient' | 'image';
    color: string;
    image?: string;
    overlayOpacity: number;
  };
  headline: {
    text: string;
    fontSize: number;
    color: string;
    align: 'left' | 'center' | 'right';
  };
  subText: {
    enabled: boolean;
    text: string;
    fontSize: number;
    color: string;
  };
  cta: {
    enabled: boolean;
    text: string;
    backgroundColor: string;
    color: string;
    borderRadius: number;
  };
  logo?: {
    src: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  templateId: string;
};
```

## 13. コンポーネント構成案

``` text
src/
 ├─ lib/
 │   ├─ components/
 │   │   ├─ BannerEditor.svelte
 │   │   ├─ BannerPreview.svelte
 │   │   ├─ SizeSelector.svelte
 │   │   ├─ BackgroundEditor.svelte
 │   │   ├─ TextEditor.svelte
 │   │   ├─ CTAEditor.svelte
 │   │   ├─ LogoEditor.svelte
 │   │   └─ TemplateSelector.svelte
 │   ├─ banner/
 │   │   ├─ drawBanner.ts
 │   │   ├─ downloadBanner.ts
 │   │   ├─ sizes.ts
 │   │   └─ templates.ts
 │   └─ types/
 │       └─ banner.ts
 └─ routes/
     └─ +page.svelte
```

## 14. UX要件

-   操作結果は即時プレビュー
-   初回表示時点ですでにサンプルバナーを表示
-   空のCanvasを表示しない
-   入力項目を増やしすぎない
-   高機能デザインツール化しない
-   「何を設定すればいいか」が直感的に分かるUI
-   ダウンロードまで3分以内で完了できる設計を目標とする

## 15. 初期サンプル

初期状態：

``` text
Headline:
あなたのサービスを
もっと多くの人へ

Sub:
効果的な広告バナーを簡単作成

CTA:
詳しく見る
```

300 × 250サイズのSimpleテンプレートを初期表示する。

## 16. バリデーション

最低限以下を実装。

-   メインコピー未入力
-   CTAテキスト未入力
-   Canvasから文字が大幅にはみ出している
-   アップロード画像の読み込み失敗
-   非対応画像形式

エラーで操作不能にするより警告表示を優先する。

## 17. 対応画像形式

アップロード： - PNG - JPEG - WebP

出力： - PNG

## 18. 非対応機能（MVP）

-   ユーザー登録
-   クラウド保存
-   バナー履歴
-   ドラッグ＆ドロップによる自由配置
-   レイヤーパネル
-   Photoshop的な画像加工
-   AI画像生成
-   AIコピー生成
-   SVG編集
-   PSD出力
-   動画広告
-   GIF広告

## 19. Phase 2候補

-   複数サイズ一括生成
-   ZIP出力
-   レイアウト自動調整
-   テキスト自動縮小
-   テンプレート追加
-   Google Fonts選択
-   画像トリミング
-   ドラッグ配置
-   Undo / Redo
-   LocalStorage保存
-   JSONによるデザイン保存・読込

## 20. Phase 3候補

AI機能を追加する場合は、商品名・サービス説明・ターゲット・訴求内容を入力すると、

-   キャッチコピー
-   サブコピー
-   CTA
-   配色候補

を自動生成する。バナー画像そのもののAI生成とは分離する。

## 21. Codexへの実装指示

まずMVPとして以下を完成させること。

1.  SvelteKit + TypeScriptで画面作成
2.  300×250を初期サイズとする
3.  サイズ切替
4.  背景色変更
5.  背景画像アップロード
6.  メインコピー編集
7.  サブコピー編集
8.  CTA編集
9.  Canvasリアルタイムプレビュー
10. PNGダウンロード

コードは機能単位に分割し、Canvas描画処理をSvelteコンポーネントへ直接大量に記述しないこと。

`drawBanner.ts`
を中心にCanvas描画ロジックを分離し、将来的な複数サイズ生成に再利用できる構造にすること。

まず動作するMVPを作成し、その後UI・テンプレート・複数サイズ対応を拡張する。
