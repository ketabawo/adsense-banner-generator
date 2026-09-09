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
- Creative方式の選択（studio制作／完成画像アップロード）
- 完成済みPNG・JPEG・WebPのCreative登録・再編集
- IndexedDBによるCreativeライブラリ保存と別Campaignでの再利用
- 既存CampaignのCreative自動移行、使用数表示、ライブラリ削除
- Google Adsディスプレイ広告の最小設定
- 入稿前Reviewとテストアカウントへの停止状態での入稿（実操作で成功確認済み）
- Creative制作MVP

- Canvasによるリアルタイムプレビュー
- 単色背景、背景画像、オーバーレイ
- メインコピー、サブコピー、CTA
- 配色、文字サイズ、文字揃え、太字、角丸
- 主要な広告サイズの切り替え
- PNG出力
- PNG・JPEG・WebPの背景画像読み込みと下書きへの保持

Googleログイン・Google Adsテストアカウント接続は実操作で検証済みです。停止状態での入稿も実操作で成功表示と作成リソースIDを確認済みです。2026-09-09のターゲティング付きテスト入稿では、Google側から地域8件・KW5件とCampaign・Ad Group・広告のPAUSED状態を再取得して確認済みです。未実装：本番アカウントへの入稿、実績取得、Dashboard、AI Campaign Assistant、Execution Plan、Creativeのクラウド保存。最新の再開位置は末尾の2026-09-09の記録を参照してください。

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
| `npm test` | Vitestの自動テストを1回実行 |
| `npm run test:watch` | Vitestを監視モードで実行 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果を確認 |
| `npm run deploy` | 静的版をビルド後、CORESERVERへFTPSでアップロード |

## プロジェクト構成

```text
src/
├─ lib/
│  ├─ banner/       # 現Creative制作MVPのCanvas描画・出力処理
│  ├─ components/   # Creativeの編集パネルとプレビューUI
│  ├─ campaign/     # Campaign検証・ブラウザ保存
│  ├─ creative/     # IndexedDBライブラリ
│  ├─ server/       # PostgreSQL・トークン暗号化・接続情報保存
│  └─ types/
│     └─ creative.ts
└─ routes/
   ├─ api/         # health / ready
   └─ +page.svelte  # Campaign・Creative・Review画面
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

## 画像生成・クリエイティブ機能のロードマップ（2026-09-09更新）

### 目的とスコープ

studioの画像生成・広告クリエイティブ機能について、MVP以降の拡張方針を共有します。前回の画像生成ロードマップをこの詳細版に更新します。

現在進行中のMVPの完成を最優先とし、以下の将来機能をすべて現在のスコープへ追加するものではありません。将来の追加で大規模な作り直しが発生しないよう、データ構造・型・サービス境界の拡張可能性を考慮します。既存のstudio制作・外部アップロード・Creative再利用の入口は維持します。

### 1. Image Generation Provider

画像生成のMVPはOpenAI / GPT系のみを使用し、複数Providerには対応しません。将来的にはOpenAI、Google / Gemini / Nano Banana系、その他の画像生成Providerをユーザーが選択できる構成を想定します。用途に応じてstudioがProviderを自動選択する機能も将来の検討対象です。

OpenAI固有のAPI仕様へアプリケーション全体が直接依存しないよう、次の差し替え可能な境界を意識します。MVPではOpenAI Adapterのみで十分であり、他Providerの先行実装は不要です。

```text
studio
  ↓
Image Generation Interface
  ↓
Provider Adapter
  ├─ OpenAI（MVP）
  ├─ Google（将来）
  └─ Other Providers（将来）
```

### 2. 複数広告画像サイズ

同一Creativeから複数のアスペクト比・画像サイズへ展開できることを、将来的な基本仕様とします。Google Ads向け標準プリセット候補は以下です。

| プリセット | アスペクト比 | サイズ |
| --- | --- | --- |
| Landscape | 約1.91:1 | 1200 × 628 |
| Square | 1:1 | 1200 × 1200 |
| Portrait | 4:5 | 960 × 1200 |
| Vertical | 9:16 | 900 × 1600 |

これらは計画上の候補であり、すべてのGoogle Ads広告形式で共通に使えることを保証するものではありません。実装時に対象広告形式の仕様を確認します。現在の固定サイズ画像広告の8種類の入稿対応サイズは、この追記では変更しません。

### 3. 単純リサイズではなくVariantとして管理

異なるアスペクト比への展開は、単純な拡大縮小や引き伸ばしではなく、同一Creativeに属する別Variantとして管理します。CampaignとCreativeの関連を保ちながら、サイズ違いを扱える構造を想定します。

```text
Creative
  ├─ 1200×628 Variant
  ├─ 1200×1200 Variant
  ├─ 960×1200 Variant
  └─ 900×1600 Variant
```

各Variantでは、構図・クロップ・余白・被写体位置・テキスト位置・CTA位置・その他のレイアウトを必要に応じて個別調整できる構造を想定します。将来的にはAIで「1つのCreativeを指定した複数サイズへ展開」する処理も検討します。

### 4. Safe Area

クロップや表示環境によって重要要素が欠ける可能性を考慮し、エディタ上のSafe Area表示、Safe Area内への重要要素配置、AI生成時のSafe Area考慮を将来の検討対象とします。MVPではSafe Area UIの実装は必須ではありません。

### 5. Logo Asset

通常のCreative Imageとは別種のAssetとして、Google Ads等で使うLogo Assetを将来的に管理します。想定例はSquare Logo（1:1）とLandscape Logo（4:1）です。MVPでLogo管理機能を完成させる必要はありません。

### 6. Custom Size Presets

将来的にはユーザー独自の画像サイズを登録できる構造を想定します。

```text
name: Instagram Portrait
width: 1080
height: 1350
category: Social
```

用途例は社内独自広告フォーマット、Meta、Instagram、LINE、TikTok、その他の広告媒体、クライアント独自仕様です。

画像生成のMVPではGoogle Ads向け標準プリセットのみとし、Custom Size PresetsのUI・CRUDは実装しません。ただし、画像サイズを固定enum等に強く依存させて「この4サイズ以外は存在できない」設計にはせず、ユーザー定義サイズを追加できる余地を残します。生成・管理用サイズと、広告媒体・広告形式ごとの入稿制約は分けて扱います。

### 7. 将来的なCreative生成フロー

```text
Campaign作成 → Creative作成 → AIによるベース画像生成
  → 必要な広告サイズを選択 → 各サイズのVariant生成
  → 必要に応じて編集 → Google Adsへ入稿
```

さらに将来的には、広告実績を使った改善ループへ発展させます。

```text
Creative → 複数Variant生成 → 広告配信 → Performance取得
  → 成果の良いCreativeを分析 → AIによる改善Creative生成
```

### 8. 実装優先順位

1. 現在のMVPを完成させる
2. OpenAIベースの画像生成フローを完成させる
3. Google Ads向け主要画像サイズへの対応
4. Creative / Variant管理
5. 画像生成・編集とGoogle Ads入稿の統合
6. Safe Area等の広告制作支援
7. Custom Size Presets
8. 複数Image Provider対応
9. Provider自動選択等の高度化
10. 広告実績を利用したCreative改善ループ

Creative / Variant管理では保存・編集・Campaignとの連携を強化します。既存のGoogle Adsテスト入稿は実装・成功確認済みであり、上記の統合は生成したCreativeと入稿フローをつなぐ作業です。作成済み広告のPAUSED状態の再確認は、現在の動作確認の残項目として維持します。

### 現時点で実装しないもの

- 複数Image Provider
- Custom Size Presets UI・CRUD
- Provider自動選択
- 高度なSafe Area編集
- 全広告媒体への対応

このロードマップを理由に現在のMVPスコープを不必要に広げません。今必要なのは、将来これらを追加できなくなるような強い固定設計を避けることだけです。まず現在進行中のMVPを完成させます。

## デプロイ

通常のビルドは`adapter-node`を使用し、`build`へNodeサーバーを出力します。既存CORESERVER向けの`npm run deploy`は`build:static`を実行し、`build-static`の静的ファイルだけを送ります。静的版にはサーバーAPIは含まれません。`.env.deploy.example`を`.env.deploy`へコピーし、CORESERVERのFTPS情報を設定してから実行します。

```bash
npm run deploy
```

`.env.deploy`はGit管理対象外です。デプロイ処理は公開先の既存ファイルを削除せず、同名ファイルのみ上書きします。


## 接続用サーバー基盤（2026-09-08）

既存の画面とブラウザ保存を維持したまま、Nodeサーバー、PostgreSQL、接続トークンの暗号化保存を追加しました。OAuthと利用者認証は下記の手順で追加済みです。Google Adsへの接続・入稿は次の段階です。接続情報の保存関数はサーバー内部専用で、HTTPから読み書きする入口はまだありません。

### ローカル起動

```bash
cp .env.example .env
openssl rand -hex 32
```

生成した鍵を`.env`の`TOKEN_ENCRYPTION_KEY`へ設定します。鍵を変更・紛失すると保存済みトークンを復号できなくなるので、DBとは別に保管してください。`.env`はGitとDockerビルド対象から除外しています。

```bash
docker compose up -d --wait db
npm run db:migrate
npm run dev
```

ローカルDBは127.0.0.1:5433で待ち受けます。Composeの認証情報はローカル開発専用です。停止は`docker compose stop db`で行い、データは名前付きvolumeに残ります。

本番相当のNode起動：

```bash
npm run build
npm start
```

`ORIGIN`はアクセス先のURLに合わせて設定してください（上記起動の既定ポートは3000）。開発用ViteサーバーのURLは起動ログで確認できます。

- `/api/health`：プロセス稼働確認（200）
- `/api/ready`：DB接続と接続情報テーブルの利用可否（200／503）。詳細エラー・秘密情報は返しません。
- DBと暗号化鍵はビルド時には不要です。DB未設定でもCreative編集画面は使用できます。
- CampaignはlocalStorage、CreativeはIndexedDBに引き続き保存されます。公開元のドメイン／ポートが変わると既存のブラウザ保存にはアクセスできません。

### 保存とマイグレーション

`src/lib/server/`はサーバー専用です。`google-ads/connections.ts`は検証済みGoogle subjectを受け取り、refresh tokenをAES-256-GCMで暗号化して保存します。subjectを認証データに含め、別の利用者への暗号文の付け替えも拒否します。Google Ads用の公開APIを追加するときは`requireUser`で本人確認し、認証済みsubjectだけを渡してください。Googleログインでは広告の権限やrefresh tokenは取得しません。

`migrations/001_google_ads_connections.sql`が接続情報の初期スキーマです。Customer ID欄は将来のアカウント選択用で、現段階では未使用です。`npm run db:migrate`はトランザクションと排他ロックを使い、適用済みファイルのチェックサムを検証します。適用済みSQLは編集せず、新しい番号のSQLを追加します。

### Node環境への配置

DockerfileはNodeアプリをビルドし、非rootユーザーで起動します。実行環境へ`DATABASE_URL`、`TOKEN_ENCRYPTION_KEY`、HTTPSの`ORIGIN`を設定し、同じ環境で`npm run db:migrate`を実行してから起動してください。`PORT`は実行環境の指定を使えます。DBのTLS設定は接続先が提供する接続情報に従い、証明書検証を無効化しないでください。

Railwayは配置候補ですが、サービス作成・公開・ドメイン切替は未実施です。既存のFTPS公開は静的版専用です。

実装根拠：[SvelteKit Node adapter](https://svelte.dev/docs/kit/adapter-node)、[server-only modules](https://svelte.dev/docs/kit/server-only-modules)、[node-postgres pooling](https://node-postgres.com/features/pooling)。

次回：Google Cloud設定後に実アカウントでログインを検証し、Google Adsの権限取得とアカウント読み取りを追加する。その後、PAUSEDでの入稿を実装する。

DB統合テストは専用のローカルDBを指定して実行します（通常の`npm test`ではスキップ）。テスト用接続情報だけを作成し、終了時に削除します。

```bash
TEST_DATABASE_URL=postgresql://studio:studio_local@localhost:5433/studio npm test
```


## Googleログイン（2026-09-08）

Google公式`google-auth-library`によるAuthorization Codeフローを追加しました。ログインで要求する権限は`openid email`だけです。Google Adsの操作権限はまだ要求せず、広告は作成しません。

### Google Cloudとローカル設定

1. Google CloudでOAuth同意画面を設定し、テスト用アカウントを登録します。
2. OAuthクライアントを「ウェブアプリケーション」として作成します。
3. 承認済みリダイレクトURIに、利用するURLに対応した値を登録します。
   - 開発：`http://localhost:5173/auth/google/callback`
   - Node起動：`http://localhost:3000/auth/google/callback`
   - 本番：`https://studio.ketabawo.asia/auth/google/callback`（Node環境への切替後）
4. `.env`に`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`AUTH_ALLOWED_EMAILS`を設定します。`AUTH_ALLOWED_EMAILS`はログインを許可するGoogleメールアドレスです（複数はカンマ区切り）。空の場合、ログインは無効です。
5. `ORIGIN`を利用するURLに合わせます。開発なら`http://localhost:5173`です。末尾の`/`は付けません。localhostと127.0.0.1を混在させないでください。
6. `npm run db:migrate`で`002_auth.sql`を適用し、サーバーを再起動します。
7. 編集画面の「Googleでログイン（別タブ）」から進み、完了後は元のタブへ戻ります。

Client Secretや暗号化鍵をチャットやGitへ貼り付ける必要はありません。`.env`は手元で編集します。既存の暗号化鍵は再生成しないでください。

### 動作と境界

- `app_users`はGoogleのsubjectを主キーに使用します。メールアドレスは検証済みで、許可リストと一致する必要があります。
- ID tokenの署名・発行者・対象クライアント・期限をGoogleライブラリで検証し、nonceも照合します。
- OAuthのstateはブラウザCookieと紐付け、10分で失効、一度使うとDBから削除します。PKCE verifierは暗号化して保存します。
- ログインセッションは7日間有効です。CookieはHttpOnly／SameSite=Lax、本番HTTPSではSecureです。DBにはセッショントークンのハッシュだけを保存します。
- ログイン開始・ログアウトはPOSTとOrigin検証を使用します。ログアウトでDBのセッションも削除します。許可リストから外れた利用者のセッションは認証に使えません。
- `/api/auth/session`はメールアドレスとログイン状態のみを返し、キャッシュは禁止します。秘密情報やGoogle subjectをフロントへ返しません。
- Creative編集はログインなしでも使えます。ブラウザ保存はGoogleアカウント別の保存ではなく、従来どおり同じブラウザの保存領域です。共有端末では他の利用者にも見えます。
- Google Ads接続情報・API操作を公開するときは`src/lib/server/auth/http.ts`の`requireUser`と、変更操作の`requireSameOrigin`を使用してください。ログインだけでは広告アカウントへの接続は完了しません。
- 静的版ではログインAPIを出力しません。ログインはNode版で使用します。

実装参考：[Google Web Server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)、[Google Auth Library](https://github.com/googleapis/google-cloud-node-core/tree/main/packages/google-auth-library)。

検証：ローカルDBで一回限りのstate、期限切れ、セッション更新・削除、許可リストからの除外を確認。HTTPでログイン開始、Origin拒否、コールバック拒否、ログイン状態とログアウトを確認。実Googleアカウントのログインとブラウザ目視は未確認です。


## Google Adsテストアカウントへの接続（2026-09-08）

Google Adsの追加認可、アカウント一覧取得、接続先保存まで実装しました。ログイン済みの画面に「Google Ads接続」が表示されます。API呼び出しは読み取り専用で、広告・予算等の作成や変更は未実装です。

### 実アカウントでの確認手順

1. Google CloudのOAuthクライアントと同じプロジェクトで、Google Ads APIを有効にします。
2. `.env`の`GOOGLE_ADS_DEVELOPER_TOKEN`へ取得済みトークンを設定し、開発サーバーを再起動します。
3. `npm run db:migrate`で`003_ads_oauth.sql`まで適用します。
4. ログイン中のGoogleアカウントに、テスト用マネージャー／広告アカウントへのアクセス権限があることを確認します。OAuth同意画面がテスト公開の場合は、そのGoogleアカウントをテストユーザーとして登録します。
5. 「Google Adsへのアクセスを許可（別タブ）」を押し、ログイン時と同じGoogleアカウントで権限を許可します。コールバックURIは従来の`/auth/google/callback`を共用するため、Google側にURIを追加する必要はありません。
6. 元のタブに戻り、「テストアカウント一覧を取得」を押します。
7. 作成したテスト用広告アカウントの「このアカウントに接続」を押します。接続先IDが保存されたら確認完了です。

### 実装範囲

- Google Adsの`https://www.googleapis.com/auth/adwords`権限を追加要求し、refresh tokenを暗号化保存します。この権限自体は広告管理も許可しますが、現状のアプリに広告変更APIはありません。
- 認可のstateをログイン利用者と開始時のセッションに紐付けます。途中のログアウト・別セッションへの変更・別Googleアカウントでの認可は拒否します。
- Google Ads REST API v25を利用し、`listAccessibleCustomers`で直接アクセスできるアカウントを取得します。マネージャー配下は`customer_client`を照会します。
- テスト用の広告アカウントだけを選択候補に表示します。直接アクセスとマネージャー経由の両方を扱います。
- 一覧取得に失敗した一部のルートはスキップし、その旨を表示します。最大50ルート・各検索10ページで打ち切り、過大な走査を避けます。
- 保存時に再度Googleへ照会し、当該ユーザーのアクセス権限、テストアカウントであること、非マネージャーであることを検証します。Customer IDと経由するLogin Customer IDはユーザーごとにDBへ保存します。
- 認可済み表示は保存済みトークンの存在を示します。失効の有無は一覧取得・接続先選択時に判明します。失効時は「権限を再取得」から再認可します。
- `/api/google-ads/status`、`/accounts`、`/selection`はログイン必須です。選択・認可開始はOrigin検証を行います。

現在のDeveloper TokenはTest Account Accessです。本番出稿には本番アカウントへのAPIアクセス承認が別途必要です。次の開発段階は、選択済みテストアカウントへのPAUSEDでの入稿です。

参考：[Google Ads認証ヘッダー](https://developers.google.com/google-ads/api/rest/auth)、[アカウント一覧取得](https://developers.google.com/google-ads/api/docs/account-management/listing-accounts)、[GAQL検索とページング](https://developers.google.com/google-ads/api/rest/common/search)。

### 接続確認の現在地

2026-09-08：ユーザーの実操作で、Googleログイン → Ads追加認可 → テスト広告アカウント一覧取得 → 接続先の再検証・DB保存まで成功を確認しました。画面に「テスト用広告アカウントへの接続を確認し、接続先を保存しました。」と表示されています。接続先IDはユーザー別のDB保存値を参照してください。

解決済み：Google CloudでGoogle Ads APIを有効化。別のGoogleアカウントで作成したテストMCCへ、アプリで認可したGoogleアカウントを標準権限で招待し、アクセスを付与しました。テストアカウントがCLOSEDになる仕様に合わせ、一覧・選択のENABLED限定条件も修正済みです。

一部アカウントの取得対象外・取得失敗の警告は、目的のテスト広告アカウントの接続成功とは別です。アプリのエラー表示は既知のエラーコードを使い、Googleのメッセージ本文や秘密情報を公開しません。

次に着手する作業：現在のコードとGoogle Adsの仕様を確認し、既存Reviewから選択済みテスト広告アカウントへPAUSEDで入稿する最小経路を実装する。Budget・Campaign・Ad Group・画像・広告の作成、入力検証、結果保存、重複送信防止を扱います。広告作成・配信はまだ実行していません。本番公開も未実施です。

## 停止状態でのテスト入稿（2026-09-09）

Reviewからテスト広告アカウントへ入稿する最小経路を追加しました。`004_ads_submissions.sql`をローカルDBに適用済みです。実Google Adsへの入稿確認と本番公開はまだ実施していません。

- Reviewの「接続先を確認」から接続先IDを確認し、EU政治広告を含まない旨を確認して「この内容で停止状態の広告を作成」を押します。
- 日本・日本語・JPYのテスト用非マネージャーアカウント限定です。接続先はDBから取得し、ブラウザで確認したIDとの一致、Google側のアクセス権限・テストアカウント状態を再検証します。
- 既存CreativeをブラウザでPNGに変換します。対応する8種類の広告サイズ、150KB以下に限定します。WebP/JPEGもPNG変換後の容量で判定します。サーバーは外部画像URLを取得しません。
- Budget・Campaign・日本/日本語の配信条件・Ad Group・画像広告を一つの非部分成功リクエストで作成します。画像はImageAdのデータとして同時作成し、独立Assetは作りません。Campaign・Ad Group・広告はすべてPAUSED固定です。
- Google Ads v25の`startDateTime`/`endDateTime`を使用し、開始日はアカウントのタイムゾーンの今日以降に限定します。目標KPIは管理用の目安であり、入札単価の上限や目標CPAとしては送信しません。
- 先に`validateOnly`でGoogle側の検証を行い、実送信前にユーザー・接続先・入力内容のハッシュをDBに一意保存します。同じ内容の再操作や並行送信は保存済み記録を返し、再作成しません。
- 成功したリソース名をDBと画面に保存・表示します。送信後の通信切断や結果保存失敗は`unknown`、処理中のクラッシュは`sending`として再送を止めます。Google Ads側で`studio-記録ID`のCampaign名を照合してください。未確定状態の自動復旧・再送解除は未実装です。確認前に入力内容を変えて再送しないでください。
- `/api/google-ads/submissions`はログイン必須・同一Origin限定です。入力本文を230KBに制限し、秘密情報やGoogleのエラー本文は返しません。静的公開版では使用できません。

検証：型チェック（エラー・警告0）、DB統合テストを含む95テスト成功、Nodeビルド成功。停止状態・入力検証・接続先変更・非JPY・再送・競合・通信失敗・DB失敗・Reviewの確認操作を検証しました。ブラウザ接続が利用できず目視確認は未実施です。次に行う作業は、ローカル画面のReviewで実際のテスト用Creativeを確認し、テストアカウントへの作成を検証することです。

仕様参照：[一括Mutateと一時ID](https://developers.google.com/google-ads/api/docs/mutating/best-practices)、[Campaign v25の配信日時](https://developers.google.com/google-ads/api/reference/rpc/v25/Campaign)、[ImageAdの画像データ](https://developers.google.com/google-ads/api/reference/rpc/v25/ImageAdInfo)。

### 入稿前検証の修正（2026-09-09）

ユーザーの初回テストで汎用エラーを表示。送信記録0件を確認し、検証専用APIで画像広告の`display_url`不足（REQUIRED）を再現しました。Landing Pageのホスト名を`displayUrl`に設定するよう修正し、代替の300×250 PNGでGoogle Adsの`validateOnly`がHTTP 200となることを確認しました。ユーザーのCreativeそのものの再検証・実作成は未実施です。入稿前検証失敗時は作成前であることと既知のエラーコードを表示するよう改善しました。次回は元のReviewから同じ内容で再操作し、結果を確認します。


### 初回入稿成功・現在の再開位置（2026-09-09）

ユーザーが再入力・下書き保存後に入稿し、「停止状態で入稿済みです」の表示と以下の作成リソースを共有しました。実テストアカウントへの作成とアプリの成功表示を確認済みです。上記の「実作成は未実施」という記述はこの確認前の記録です。

- 記録ID：`b6635e9e-c070-4cc0-bf36-5bb536603f36`
- テストアカウント：`1828902919`
- Budget：`15857178125`
- Campaign：`24225128295`
- 配信条件：`24225128295~2392`（日本）、`24225128295~1005`（日本語）
- Ad Group：`198350331005`
- Ad Group Ad：`198350331005~823936344384`

次はGoogle Ads側のCampaign・Ad Group・広告の状態を読み取り、PAUSEDであることを確認します。作成時はすべてPAUSEDを指定していますが、作成後の独立した状態確認は未実施です。本番公開・本番出稿は未実施です。

今回、開発中のリロードで未保存の入力が消失しました。ユーザーは再入力後に下書き保存して成功しています。未保存フォームの復元は今後の改善候補です。

## Targeting仕様と実装（2026-09-09）

今回の追加は、現在のDisplay MVPに対する「地域＋キーワード」に限定します。地域は日本全国または47都道府県の複数選択、キーワードは掲載コンテンツ向けの複数指定です。設定・下書き保存・再編集・Review表示・新規テスト入稿への反映を実装しました。既存広告を更新するAPIは追加しておらず、内容変更後の入稿は新しいCampaignを作成します。

### 地域

- 全国と都道府県は排他的に選択します。都道府県モードは最低1件必須です。
- 2026-09-09にGoogle Ads v25の`geo_target_constant`から取得した、ENABLEDの日本全国・47都道府県のIDを使用します。地域ごとにCampaign Criterionを作成します。
- 内部データは`JP-14`等の都道府県コードで保持し、Google Ads向けIDへの変換は入稿処理で行います。
- 旧下書きの「日本」は全国として扱います。旧自由入力が都道府県名と一致すれば引き継ぎ、それ以外は都道府県の選び直しを求め、全国へ勝手に広げません。
- 市区町村・郵便番号・半径・配信除外地域・高度な地域設定のUI/APIは実装しません。地域判定は従来のPRESENCEを内部設定として維持します。

### キーワード

- 1行1件、アプリの上限は100件・各80文字です。空行を除去し、大文字小文字を無視した重複をまとめます。空欄ならキーワード条件を追加しません。
- `kind: display_content`として保存し、DisplayのAd Group Criterionに`keyword`（BROAD）を登録します。検索キャンペーンの検索語句や検索マッチタイプ選択とは区別します。
- Googleの仕様上、キーワード自体がターゲティング条件になります。KEYWORDのTargetRestrictionは不要で、v25の検証でも拒否されたため設定しません。Ad Groupの`optimizedTargetingEnabled`はfalseとし、指定条件を超えた自動拡張を無効にします。
- 言語は今回の始祖会テストに合わせ、日本語を内部設定します。言語選択UIは追加しません。

### データ・保存・送信

`src/lib/types/targeting.ts`のTargetingに`locations`・`keywords`・`languages`をまとめます。将来の条件追加はこのモデルと媒体Adapterの拡張で扱い、エディタやAIからGoogle固有のリクエスト構造を直接操作しない境界を維持します。将来用の空フィールド・UI・CRUDは追加しません。

下書きは既存のlocalStorage保存へTargetingを含めます。サーバーでも地域・KW種別・件数・文字数・日本語設定を検証します。送信結果は条件数に応じた可変件数に対応し、地域・KWを含む入力で重複を判定します。地域の順序・KWの順序や大小文字の違いで再作成せず、従来の全国・KWなしの送信記録とも照合できます。Campaign・Ad Group・広告のPAUSED固定とテストアカウント限定は維持します。

### 将来対応・今回の対象外

年齢、性別、世帯収入、子供の有無、オーディエンス、興味・関心、購買意向、カスタムセグメント、トピック、プレースメント、デバイス、リマーケティング、顧客データ、各種除外、その他Google Adsの主要ターゲティング条件は将来の検討対象とし、今回UI・CRUD・API連携を追加しません。高度な地域設定、AI自動最適化・自動変更も対象外です。

将来は「配信 → クリック・費用・CV等の実績取得 → AI分析 → 改善案 → ユーザー承認 → API反映」を想定します。地域の除外候補・地域別の予算配分案・KW候補・範囲の拡大縮小などを提案できるデータ構造を維持します。検索語句の分析・除外KW提案は、検索キャンペーン等で該当データが利用できる場合に扱い、現在のDisplayで検索語句レポートを前提にしません。

### 検証と次回

99テスト成功（DB統合テスト5件は通常実行でスキップ）、型チェックのエラー・警告0、Nodeビルド成功。都道府県の複数選択、KW入力、保存・再編集、旧データの互換性、不正入力、可変件数のAPI結果保存を検証しました。神奈川・東京・千葉・埼玉・静岡＋GPZ1000RX・ZX-10・ZXT00A・ZXT00Bを含むリクエストは、テストアカウントの`validateOnly`でHTTP 200を確認済みです。今回の追加条件で実広告の作成は行っていません。ブラウザ目視と実入稿後の条件確認が残っています。

次回は保存済みCampaignを開き、Google Ads設定の地域と掲載コンテンツKWを入力して下書き保存し、Reviewで確認します。今回のターゲティングで新規作成する場合は、停止状態のテスト入稿後にGoogle Ads側の地域・KWを確認してください。

参考：[地域ID](https://developers.google.com/google-ads/api/data/geotargets)、[地域ターゲティング](https://developers.google.com/google-ads/api/docs/targeting/location-targeting)、[Keywordターゲティングの扱い](https://developers.google.com/google-ads/api/reference/rpc/v25/TargetingDimensionEnum.TargetingDimension)、[Ad Group設定](https://developers.google.com/google-ads/api/reference/rpc/v25/AdGroup)。


### ターゲティング付き実入稿・状態再取得の確認（2026-09-09）

ユーザーの画面操作で停止状態のテスト入稿が成功し、Google Ads v25の読み取りAPIで作成後の状態を独立して確認しました。上記の「今回の追加条件で実広告の作成は行っていません」「実入稿後の条件確認が残っています」は、この確認前の記録です。

- 記録ID：`8aac7377-a0d2-4590-8d0d-67299ddf5b56`。DBの状態は`succeeded`、保存済みリソースはユーザー共有値と一致。
- テストアカウント：`1828902919`。APIでテスト用・非マネージャーを再確認。
- Campaign：`24231792698`、Ad Group：`198734552046`、広告：`823964885724`。すべてGoogle側で`PAUSED`。
- 地域：神奈川県・東京都・千葉県・埼玉県・群馬県・山梨県・長野県・静岡県の8件が一致。全国の地域条件はなし。地域判定は`PRESENCE`。
- KW：`GPZ1000RX`、`ZX10`、`オフ会`、`ミーティング`、`始祖会`の5件が一致。すべて非除外・`BROAD`・条件自体は`ENABLED`。親のCampaign・Ad Groupと広告は停止状態。
- 言語：日本語（`1005`）を確認。

今回の確認は読み取りのみで、広告状態の変更・再入稿は実施していません。ブラウザ操作はユーザーが担当し、保存後の再編集や各画面の表示についての個別の目視結果は未報告です。地域・KWを含むテスト入稿と作成後の状態確認は完了しました。次のロードマップ項目はPerformance取得とDashboardです。本番公開・本番出稿は未実施です。

ロードマップ追記・ターゲティング実装・今回の記録は未コミット／未pushのまま保持しています。`tmp/`の診断スクリプトは一時用途で、コミット対象外です。


### データ送信の説明とプライバシーポリシー（2026-09-09）

`/privacy`に、現在の本人利用の開発版に沿ったプライバシーポリシーを追加しました。Creativeと下書きのブラウザ保存、Googleログイン・Cookie・Ads接続情報、入稿時の画像と広告情報の送信、入稿記録、保存期間、削除・許可取り消しの違いを記載しています。画面の「アップロード画像は外部へ送信されません」を修正し、ログイン・Ads認可・入稿前とフッターに別タブのリンクを設けました。

運営者名と問い合わせ先は未確定です。第三者への提供前に確定してページへ掲載し、サーバーデータの削除受付手順を整備してください。公開・OAuth設定へのURL登録は未実施であり、ページ追加だけでGoogleの審査や規約適合確認が完了するものではありません。ブラウザでの目視確認はユーザーが担当します。
