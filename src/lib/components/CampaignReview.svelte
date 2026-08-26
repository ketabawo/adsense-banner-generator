<script lang="ts">
  import type { CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  import type { CreativeState } from '$lib/types/creative';

  let { draft, ads, creative, onCancel, onConfirm }: {
    draft: CampaignDraft;
    ads: GoogleAdsDraft;
    creative: CreativeState;
    onCancel: () => void;
    onConfirm: () => void;
  } = $props();
  const yen = new Intl.NumberFormat('ja-JP');
</script>

<section class="review" aria-live="polite">
  <div class="title"><span>4</span><div><h2>入稿前Review</h2><p>まだGoogle Adsには送信されません。内容を確認して下書き保存します。</p></div></div>
  <div class="review-grid">
    <dl>
      <div><dt>Campaign</dt><dd>{draft.name}</dd></div>
      <div><dt>目的</dt><dd>{draft.objective === 'traffic' ? 'サイトへのアクセス' : 'コンバージョン獲得'}</dd></div>
      <div><dt>1日の予算</dt><dd>¥{yen.format(draft.dailyBudget ?? 0)}</dd></div>
      <div><dt>目標{draft.targetKpi.type.toUpperCase()}</dt><dd>¥{yen.format(draft.targetKpi.value ?? 0)}</dd></div>
    </dl>
    <dl>
      <div><dt>広告</dt><dd>{ads.adName}</dd></div>
      <div><dt>配信先</dt><dd>Google Ads / ディスプレイ</dd></div>
      <div><dt>地域・言語</dt><dd>{ads.location}・日本語</dd></div>
      <div><dt>Creative</dt><dd>{creative.size.width} × {creative.size.height}px</dd></div>
    </dl>
  </div>
  <div class="notice">安全のため、実際のAPI入稿時も一時停止状態で作成します。</div>
  <div class="actions"><button class="cancel" onclick={onCancel}>戻って修正</button><button class="confirm" onclick={onConfirm}>下書きを保存</button></div>
</section>

<style>
  .review { margin-top: 24px; padding: 22px; border: 2px solid #93c5fd; border-radius: 16px; background: white; box-shadow: 0 12px 30px #2563eb12; }
  .title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  h2, p { margin: 0; }
  h2 { font-size: 16px; }
  p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  dl { margin: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 10px; }
  dl div { display: grid; grid-template-columns: 120px 1fr; border-bottom: 1px solid #e2e8f0; }
  dl div:last-child { border-bottom: 0; }
  dt, dd { margin: 0; padding: 10px 12px; font-size: 11px; }
  dt { background: #f8fafc; color: #64748b; }
  dd { color: #172033; font-weight: 650; }
  .notice { margin-top: 15px; padding: 10px 12px; border-radius: 8px; background: #fff7ed; color: #9a3412; font-size: 11px; }
  .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
  button { border: 0; border-radius: 9px; padding: 11px 16px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 750; }
  .cancel { background: #f1f5f9; color: #475569; }
  .confirm { background: #2563eb; color: white; }
  @media (max-width: 700px) { .review-grid { grid-template-columns: 1fr; } dl div { grid-template-columns: 100px 1fr; } }
</style>
