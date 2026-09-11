<svelte:head>
  <title>プライバシーポリシー | studio.ketabawo.asia</title>
  <meta name="description" content="studioのCreative、Googleログイン、Google Ads接続・入稿・AI相談におけるデータの取り扱い。" />
</svelte:head>

<main>
  <nav aria-label="ナビゲーション"><a href="/">studioへ戻る</a></nav>
  <article>
    <p class="brand">studio.ketabawo.asia</p>
    <h1>プライバシーポリシー</h1>
    <p class="updated">最終更新日：2026年9月10日</p>
    <p>studioは、CampaignとCreativeの作成・保存およびGoogle Adsへのテスト入稿、実績確認・AI相談・変更案の確認と承認・反映を支援するツールです。このページは現在の実装におけるデータの取り扱いを説明します。現在は開発者本人が利用する開発版です。</p>

    <section aria-labelledby="local">
      <h2 id="local">1. Creativeと下書き</h2>
      <p>入力したCampaign設定、広告設定、テキスト、アップロード画像、Creativeは、編集・下書き保存の段階では利用中のブラウザ内に保存します。保存にはlocalStorageとIndexedDBを使用し、この操作だけで画像や下書きをstudioサーバーへ送信することはありません。</p>
      <p>ブラウザの保存領域はGoogleログインのアカウント別には分かれていません。同じ端末・ブラウザを使う人が保存内容を閲覧できる場合があります。ログアウトしても下書きとCreativeは残ります。</p>
    </section>

    <section aria-labelledby="google">
      <h2 id="google">2. GoogleログインとAds接続</h2>
      <p>GoogleログインではGoogleアカウントの識別子と確認済みメールアドレスを取得し、本人確認と利用許可の判定に使用します。これらの情報とログインセッションの管理情報をstudioサーバーのデータベースへ保存します。</p>
      <p>Google Adsへの接続はログインとは別に許可を求めます。許可後は、アクセス可能な広告アカウントのID、名称、アカウント種別、通貨、タイムゾーンなどを取得し、接続先の表示とテストアカウントであることの確認に使用します。選択した広告アカウントIDと経由するマネージャーIDを保存します。</p>
      <p>ログイン状態の維持と認可手続きの確認にCookieを使用します。サーバーにはセッショントークンそのものではなくハッシュを保存します。これらのCookieは広告追跡を目的とするものではありません。</p>
      <p>接続を維持するためのrefresh tokenは暗号化してサーバーに保存します。Googleアカウントのパスワードをstudioが取得・保存することはありません。取得した情報は本人確認、接続、入稿、広告実績の表示およびその結果の管理に使用します。</p>
    </section>

    <section aria-labelledby="submission">
      <h2 id="submission">3. 入稿時に送信する情報</h2>
      <p>Reviewで広告作成を実行すると、広告画像とCampaign・広告設定をブラウザからstudioサーバーへ送信します。サーバーは画像、広告名、リンク先URL、予算、期間、入札設定、地域、言語、キーワードなど、入稿に必要な情報をGoogle Adsへ送信します。Google側での入稿前検証にも画像と入稿情報を送信します。</p>
      <p>現在はテスト用広告アカウントへの停止状態での作成に限定しています。送信結果の管理と二重作成防止のため、利用者・広告アカウントとの関連、入力内容のハッシュ、記録ID、処理状態、作成リソースID、日時をサーバーに保存します。現在の実装では入稿画像や入力全文をサーバーのデータベースへ保存しません。Googleへ送信した画像と広告情報はGoogle側でも取り扱われます。</p>
      <p>Dashboardの更新時には、本人の入稿成功記録を使い、Campaignの名称・状態と、指定期間の表示回数・クリック数・費用・コンバージョンなどをGoogle Adsからstudioサーバー経由で取得して表示します。取得した実績はデータベースやブラウザストレージへ永続保存しません。</p>
    </section>

    <section aria-labelledby="plans">
      <h2 id="plans">変更案と承認の記録</h2>
      <p>Execution Planでは、Google Adsから取得したCampaign名・停止状態・予算情報と取得日時、利用者・広告アカウント・Campaignとの関連、変更前後の値、変更理由、作成日時、承認・取消などの状態と状態更新日時をサーバーのデータベースに保存します。変更案を取り消しても記録は残ります。承認時にはGoogle Adsの現在値を再取得して比較します。承認操作だけでは設定を変更しません。別の反映操作で、保存済みのCampaign名・日予算の変更をGoogle Adsのテストアカウントへ送信します。反映直前と反映後に設定を再取得し、結果不明の場合は再照合します。Action Logには変更案の保存・承認・取消・反映処理・結果確認などの状態遷移と日時を保存します。</p>
    </section>

    <section aria-labelledby="sharing">
      <h2 id="sharing">4. 外部サービスへの提供</h2>
      <p>GoogleログインとGoogle Adsの機能にはGoogleのサービスを使用します。Google側の取り扱いは<a href="https://policies.google.com/privacy">Googleのプライバシーポリシー</a>もご確認ください。現在のstudioには、広告・アクセス解析用のトラッカーを実装していません。</p>
      <p>AI相談の送信操作を行うと、選択したCampaignの名称・状態、集計期間・タイムゾーン・通貨・取得日時、合計と日別実績、および質問と直近3往復までの会話を、studioサーバーからOpenAI APIへ送信します。回答は広告運用の説明・相談・改善提案に使用し、広告設定を変更しません。画像・Googleの認証情報・メールアドレス・広告アカウントIDを自動でAIへ添付することはありません。質問やCampaign名に含まれる情報は送信対象になります。</p>
      <p>会話は利用中の画面内に保持し、studioのデータベースやブラウザストレージへ永続保存しません。ただし、AI提案を変更理由に引き継いで変更案を保存した場合、その抜粋は変更案の一部としてサーバーに保存します。Campaign・期間の切替、実績更新、再読み込み、ログアウトで画面内の会話は消えます。OpenAIにはレスポンスを保存しない設定（store: false）でリクエストしますが、これは不正利用監視などを含むすべての保持を無効にする設定ではありません。OpenAI側の扱いは<a href="https://developers.openai.com/api/docs/guides/your-data">APIのデータ管理に関する説明</a>をご確認ください。</p>
      <p>Googleから取得した利用者データの利用・転送は、<a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>および適用されるLimited Use要件に従います。利用者データの販売や、このページで説明した機能と無関係な目的への利用は行いません。</p>
    </section>

    <section aria-labelledby="retention">
      <h2 id="retention">5. 保存期間・削除・接続解除</h2>
      <p>ブラウザ内のCampaignとCreativeは、各一覧の削除操作、またはブラウザ設定からこのサイトの保存データを削除できます。CampaignとCreativeライブラリは別に管理しているため、それぞれの保存内容をご確認ください。ブラウザのデータ削除では、studioサーバーやGoogle Ads側のデータは削除されません。</p>
      <p>ログインセッションの有効期間は7日間、ログイン・接続の認可手続きの有効期間は10分間です。期限切れ後は認証に使用できず、関連するログイン処理で期限切れの記録を削除します。ログアウトすると現在のセッションを削除します。</p>
      <p>利用者情報、Ads接続情報、入稿記録、変更案と承認・取消・反映の状態、Action Logには、現在、自動削除の期限やアプリ内の一括削除機能を設けていません。本人利用の開発環境では、開発者本人がサーバーの保存データを管理・削除します。</p>
      <p>Googleへのアクセス許可はGoogleアカウントの「サードパーティとの接続」設定から取り消せます。ログアウトだけではAdsの許可は取り消されません。許可の取り消しだけでは、保存済みのstudioのデータやGoogle Ads上に作成した広告は削除されません。Google Ads側の広告はGoogle Adsで管理してください。</p>
    </section>

    <section aria-labelledby="security">
      <h2 id="security">6. データの保護</h2>
      <p>ログイン利用者の確認、変更操作の送信元確認、認証トークンの暗号化保存などにより不正アクセスを防ぎます。Googleへの通信はHTTPSを使用します。studioへの接続はローカル開発時のlocalhostを除いてHTTPSを使用する構成です。</p>
    </section>

    <section aria-labelledby="updates">
      <h2 id="updates">7. 運営と変更について</h2>
      <p>現在は開発者本人が運営・利用しています。第三者への提供に先立ち、運営者名と問い合わせ・削除依頼の窓口をこのページに掲載します。</p>
      <p>取得するデータ、利用目的、外部サービスへの提供などを変更する際は、このページを更新し、必要な説明と同意取得を行います。</p>
    </section>
  </article>
</main>

<style>
  :global(body) { margin: 0; background: #f6f8fb; color: #172033; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif; }
  main { max-width: 800px; margin: 0 auto; padding: 24px 16px 48px; }
  nav { margin-bottom: 20px; }
  article { padding: clamp(20px, 5vw, 40px); background: white; border: 1px solid #dbe3ef; border-radius: 5px; }
  h1 { font-size: clamp(24px, 5vw, 32px); line-height: 1.4; margin: 8px 0; }
  h2 { font-size: 19px; line-height: 1.5; margin: 0 0 12px; }
  section { margin-top: 32px; }
  p { font-size: 15px; line-height: 1.9; overflow-wrap: anywhere; }
  .brand, .updated { color: #526174; font-size: 13px; }
  a { color: #1d4ed8; text-underline-offset: 3px; }
  a:focus-visible { outline: 3px solid #93c5fd; outline-offset: 3px; border-radius: 5px; }
</style>
