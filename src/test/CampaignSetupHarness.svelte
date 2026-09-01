<script lang="ts">
  import CampaignSetup from '$lib/components/CampaignSetup.svelte';
  import { campaignDraft } from './fixtures';
  import type { CampaignDraft } from '$lib/types/campaign';

  let { dateError = '', onObjectiveChange }: {
    dateError?: string;
    onObjectiveChange: (objective: CampaignDraft['objective']) => void;
  } = $props();
  let draft = $state(campaignDraft());
</script>

<CampaignSetup {draft} {dateError} {onObjectiveChange} />
