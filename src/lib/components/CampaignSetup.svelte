<script lang="ts">
  import Field from './Field.svelte';
  import type { CampaignDraft } from '$lib/types/campaign';

  let { draft }: { draft: CampaignDraft } = $props();

  function chooseObjective(event: Event) {
    const objective = (event.currentTarget as HTMLSelectElement).value as CampaignDraft['objective'];
    draft.objective = objective;
    draft.targetKpi.type = objective === 'traffic' ? 'cpc' : 'cpa';
  }
</script>

<section class="campaign-card">
  <div class="section-title">
    <span>1</span>
    <div><h2>Campaignを設定</h2><p>広告の目的と予算を先に決めます。</p></div>
  </div>
  <div class="form-grid">
    <Field label="Campaign名"><input bind:value={draft.name} placeholder="例：studio 夏季集客" /></Field>
    <Field label="Landing Page URL"><input type="url" bind:value={draft.landingPageUrl} placeholder="https://example.com" /></Field>
    <Field label="目的">
      <select value={draft.objective} onchange={chooseObjective}>
        <option value="traffic">サイトへのアクセス</option>
        <option value="conversion">コンバージョン獲得</option>
      </select>
    </Field>
    <Field label="1日の予算（円）"><input type="number" min="1" step="100" bind:value={draft.dailyBudget} placeholder="例：1000" /></Field>
    <Field label="開始日"><input type="date" bind:value={draft.startDate} /></Field>
    <Field label="終了日（任意）"><input type="date" bind:value={draft.endDate} /></Field>
    <Field label={`目標${draft.targetKpi.type === 'cpc' ? 'CPC' : 'CPA'}（円）`}><input type="number" min="1" step="10" bind:value={draft.targetKpi.value} placeholder={draft.targetKpi.type === 'cpc' ? '例：100' : '例：500'} /></Field>
  </div>
</section>

<style>
  .campaign-card { margin-bottom: 24px; padding: 22px; border: 1px solid #dbe3ef; border-radius: 16px; background: white; box-shadow: 0 8px 24px #0f172a08; }
  .section-title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .section-title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  h2, p { margin: 0; }
  h2 { font-size: 16px; }
  p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .form-grid { display: grid; grid-template-columns: 1.25fr 1.75fr 1fr 1fr; gap: 15px; align-items: end; }
  select, input { box-sizing: border-box; width: 100%; min-height: 40px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 9px 11px; color: #172033; font: inherit; font-size: 13px; outline: none; }
  select:focus, input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
  @media (max-width: 900px) { .form-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 560px) { .form-grid { grid-template-columns: 1fr; } }
</style>
