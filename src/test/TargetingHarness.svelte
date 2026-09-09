<script lang="ts">
  import TargetingEditor from '$lib/components/TargetingEditor.svelte';
  import { defaultTargeting, parseTargeting, targetingFor } from '$lib/targeting/rules';
  import type { GoogleAdsDraft } from '$lib/types/campaign';
  let settings = $state<GoogleAdsDraft>({ adName: 'test', location: '日本', bidding: 'maximize_clicks', targeting: defaultTargeting() });
  let saved = $state('');
</script>
<TargetingEditor {settings} />
<button onclick={() => saved = JSON.stringify(parseTargeting(targetingFor(settings)))}>保存テスト</button>
<button onclick={() => settings.targeting = JSON.parse(saved)}>復元テスト</button>
<output>{saved}</output>
