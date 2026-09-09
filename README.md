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

Googleログイン・Google Adsテストアカウント接続は実操作で検証済みです。停止状態での入稿も実操作で成功表示と作成リソースIDを確認済みです。Google側の状態再取得は未確認です。未実装：本番アカウントへの入稿、実績取得、Dashboard、AI Campaign Assistant、Execution Plan、Creativeのクラウド保存。最新の再開位置は末尾の2026-09-09の記録を参照してください。

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
