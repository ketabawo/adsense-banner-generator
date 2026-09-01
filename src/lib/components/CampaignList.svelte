<script lang="ts">
  import type { Campaign } from '$lib/types/campaign';

  let { campaigns, activeId, onCreate, onEdit, onDelete }: {
    campaigns: Campaign[];
    activeId?: string;
    onCreate: () => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (campaign: Campaign) => void;
  } = $props();

  const yen = new Intl.NumberFormat('ja-JP');
</script>

<section class="list-card">
  <div class="list-head">
    <div><span>Campaigns</span><strong>{campaigns.length}</strong></div>
    <button onclick={onCreate}>＋ 新規作成</button>
  </div>
  {#if campaigns.length === 0}
    <p class="empty">まだCampaignはありません。下のフォームから最初のCampaignを作成してください。</p>
  {:else}
    <div class="campaigns">
      {#each campaigns as campaign}
        <div class:active={campaign.id === activeId} class="campaign">
          <button class="campaign-main" onclick={() => onEdit(campaign)}>
            <div>
            <strong>{campaign.name}</strong>
            <span>{campaign.objective === 'traffic' ? 'アクセス' : 'コンバージョン'} ・ ¥{yen.format(campaign.dailyBudget)}/日</span>
            </div>
            <div class="meta"><em>下書き</em><time>{new Date(campaign.updatedAt).toLocaleDateString('ja-JP')}</time></div>
          </button>
          <button class="delete" aria-label={`${campaign.name}を削除`} title="Campaignを削除" onclick={() => onDelete(campaign)}>削除</button>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .list-card { margin-bottom: 22px; overflow: hidden; border: 1px solid #dbe3ef; border-radius: 14px; background: white; }
  .list-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 17px; border-bottom: 1px solid #e2e8f0; }
  .list-head div { display: flex; align-items: center; gap: 8px; }
  .list-head span { font-size: 14px; font-weight: 750; }
  .list-head strong { display: grid; min-width: 21px; height: 21px; padding: 0 6px; place-items: center; border-radius: 11px; background: #eff6ff; color: #2563eb; font-size: 10px; }
  .list-head button { border: 0; border-radius: 8px; padding: 8px 11px; background: #172033; color: white; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; }
  .empty { margin: 0; padding: 18px; color: #64748b; font-size: 12px; }
  .campaigns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: #e2e8f0; }
  .campaign { position: relative; display: flex; min-width: 0; align-items: stretch; background: white; color: #172033; }
  .campaign:hover, .campaign.active { background: #f8fbff; box-shadow: inset 0 0 0 2px #93c5fd; }
  .campaign-main { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: space-between; gap: 12px; border: 0; padding: 15px 8px 15px 16px; background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; }
  .campaign-main > div:first-child { display: grid; min-width: 0; gap: 5px; }
  .campaign strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .campaign span { color: #64748b; font-size: 10px; }
  .meta { display: grid; flex: 0 0 auto; justify-items: end; gap: 5px; }
  em { padding: 3px 6px; border-radius: 10px; background: #f1f5f9; color: #64748b; font-size: 9px; font-style: normal; }
  time { color: #94a3b8; font-size: 9px; }
  .delete { align-self: center; margin-right: 10px; border: 0; border-radius: 7px; padding: 6px 7px; background: transparent; color: #94a3b8; cursor: pointer; font: inherit; font-size: 9px; }
  .delete:hover { background: #fee2e2; color: #dc2626; }
  @media (max-width: 850px) { .campaigns { grid-template-columns: 1fr; } }
</style>
