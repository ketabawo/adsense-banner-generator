<script lang="ts">
  import PerformanceDashboard from '$lib/components/PerformanceDashboard.svelte';
  import { defaultTargeting, targetingFor, parseTargeting, locationLabel } from '$lib/targeting/rules';
  import GoogleAccount from '$lib/components/GoogleAccount.svelte';
  import GoogleAdsConnection from '$lib/components/GoogleAdsConnection.svelte';
  let accountEmail = $state('');
  let adsConnectionKey = $state('');
  import BannerEditor from '$lib/components/BannerEditor.svelte';
  import CreativeAssistant from '$lib/components/CreativeAssistant.svelte';
  import { applyCopyProposal } from '$lib/creative/copy';
  import BannerPreview from '$lib/components/BannerPreview.svelte';
  import CampaignSetup from '$lib/components/CampaignSetup.svelte';
  import CampaignList from '$lib/components/CampaignList.svelte';
  import GoogleAdsSetup from '$lib/components/GoogleAdsSetup.svelte';
  import CampaignReview from '$lib/components/CampaignReview.svelte';
  import CreativeSourceSelector from '$lib/components/CreativeSourceSelector.svelte';
  import UploadedCreativeEditor from '$lib/components/UploadedCreativeEditor.svelte';
  import CreativeVariants from '$lib/components/CreativeVariants.svelte';
  import CreativeLibrary from '$lib/components/CreativeLibrary.svelte';
  import { createDefaultCreativeState } from '$lib/banner/defaultState';
  import { isSupportedBannerSize, validateImageFile } from '$lib/banner/imageUpload';
  import { loadCampaigns, saveCampaigns } from '$lib/campaign/storage';
  import { persistCampaignDraft } from '$lib/campaign/persist';
  import { settingsForObjective, validateCampaignDraft, withoutCampaign } from '$lib/campaign/rules';
  import { creativeUsageCount, loadCreativeLibrary, migrateCampaignCreatives, removeLibraryCreative, sameCreativeContent, toLibraryCreative } from '$lib/creative/library';
  import { collectVariants, createVariant } from '$lib/creative/variants';
  import type { Campaign, CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  import type { CreativeMode, CreativeSize, CreativeSource, CreativeVariant, LibraryCreative, UploadedCreativeAsset } from '$lib/types/creative';

  // Manual controls and AI copy proposals update this same state object.
  let creative = $state(createDefaultCreativeState());
  let variants = $state<CreativeVariant[]>([]);
  let activeVariantId = $state('base');
  let backgroundImage = $state<HTMLImageElement | undefined>();
  let imageError = $state('');
  let imageGenerating = $state(false);
  let creativeMode = $state<CreativeMode>('studio');
  let creativeName = $state('');
  let uploadedAsset = $state<UploadedCreativeAsset | undefined>();
  let uploadError = $state('');
  let libraryCreatives = $state<LibraryCreative[]>([]);
  let selectedLibraryCreative = $state<LibraryCreative | undefined>();
  let libraryError = $state('');
  let campaigns = $state<Campaign[]>([]);
  let saveMessage = $state('');
  let dateError = $state('');
  let editingId = $state<string | undefined>();
  let showReview = $state(false);
  let draft = $state<CampaignDraft>({
    name: '',
    landingPageUrl: '',
    objective: 'traffic',
    dailyBudget: undefined,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    targetKpi: { type: 'cpc', value: undefined }
  });
  let googleAds = $state<GoogleAdsDraft>({ adName: '', location: '日本', targeting: defaultTargeting(), bidding: 'maximize_clicks' });
  let savedSnapshot = $state('');
  let libraryReady: Promise<void> = Promise.resolve();

  function currentSnapshot() {
    return JSON.stringify({ draft, googleAds, creativeMode, creativeName, creative, variants, activeVariantId, uploadedAsset, selectedLibraryId: selectedLibraryCreative?.id });
  }

  let hasUnsavedChanges = $derived(savedSnapshot !== '' && currentSnapshot() !== savedSnapshot);

  $effect(() => {
    const loadedCampaigns = loadCampaigns();
    campaigns = loadedCampaigns;
    libraryReady = initializeCreativeLibrary(loadedCampaigns);
    if (!savedSnapshot) savedSnapshot = currentSnapshot();
  });

  async function initializeCreativeLibrary(existingCampaigns: Campaign[]) {
    try {
      libraryCreatives = await migrateCampaignCreatives(existingCampaigns);
      libraryError = '';
    } catch {
      libraryError = 'Creativeライブラリを読み込めませんでした。ブラウザのストレージ設定をご確認ください。';
    }
  }

  $effect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  });

  function confirmDiscardChanges() {
    return !hasUnsavedChanges || window.confirm('未保存の変更があります。変更を破棄して続けますか？');
  }

  function syncObjective(objective: CampaignDraft['objective']) {
    googleAds.bidding = settingsForObjective(objective).bidding;
  }

  function selectCreativeMode(mode: CreativeMode) {
    creativeMode = mode;
    uploadError = '';
    if (!creativeName.trim()) creativeName = draft.name.trim() ? `${draft.name.trim()} Creative` : '';
    if (mode === 'studio') loadBackgroundImage(creative.background.image);
    if (mode === 'upload') backgroundImage = undefined;
  }

  function loadBackgroundImage(url?: string) {
    if (!url) {
      backgroundImage = undefined;
      return;
    }
    const image = new Image();
    image.onload = () => {
      const currentUrl = creativeMode === 'library' && selectedLibraryCreative?.source.type === 'studio'
        ? selectedLibraryCreative.source.state.background.image : creative.background.image;
      if (url === currentUrl) backgroundImage = image;
    };
    image.src = url;
  }

  function currentVariants(): CreativeVariant[] {
    return collectVariants($state.snapshot(variants), activeVariantId, $state.snapshot(creative));
  }

  function selectVariant(id: string) {
    if (id === activeVariantId) return;
    const all = currentVariants();
    const selected = all.find(variant => variant.id === id);
    if (!selected) return;
    variants = all;
    activeVariantId = id;
    creative = structuredClone(selected.state);
    loadBackgroundImage(creative.background.image);
    imageError = '';
  }

  function addVariant(size: CreativeSize) {
    const all = currentVariants();
    const existing = all.find(variant => variant.state.size.width === size.width && variant.state.size.height === size.height);
    if (existing) { selectVariant(existing.id); return; }
    const id = crypto.randomUUID();
    const next = createVariant($state.snapshot(creative), size, id);
    variants = [...all, next];
    activeVariantId = id;
    creative = next.state;
    backgroundImage = undefined;
    imageError = '';
  }

  function removeVariant(id: string) {
    const all = currentVariants();
    if (all.length <= 1) return;
    const remaining = all.filter(variant => variant.id !== id);
    variants = remaining;
    if (id === activeVariantId) {
      activeVariantId = remaining[0].id;
      creative = structuredClone(remaining[0].state);
      loadBackgroundImage(creative.background.image);
    }
  }

  function importVariant(state: CreativeVariant['state'], name: string) {
    const all = currentVariants();
    const id = crypto.randomUUID();
    const next: CreativeVariant = { id, state: structuredClone($state.snapshot(state)), name: `${name}から追加` };
    variants = [...all, next];
    activeVariantId = id;
    creative = next.state;
    loadBackgroundImage(creative.background.image);
    imageError = '';
  }

  function selectLibraryCreative(selected: LibraryCreative) {
    selectedLibraryCreative = structuredClone($state.snapshot(selected));
    creativeName = selected.name;
    if (selected.source.type === 'studio') loadBackgroundImage(selected.source.state.background.image);
    else backgroundImage = undefined;
    libraryError = '';
  }

  function selectLibraryVariant(selected: LibraryCreative, variantId: string) {
    const variant = selected.variants?.find(item => item.id === variantId);
    if (!variant) return;
    selectLibraryCreative({ ...selected, source: { type: 'studio', state: structuredClone(variant.state) }, activeVariantId: variantId });
  }

  async function deleteLibraryCreative(selected: LibraryCreative) {
    const usage = creativeUsageCount(campaigns, selected.id);
    const usageMessage = usage > 0 ? `\n${usage}件のCampaign内の選択中Creativeは残ります。ライブラリに保存された他サイズのVariantは削除されます。` : '';
    if (!window.confirm(`「${selected.name}」をライブラリから削除しますか？${usageMessage}`)) return;
    try {
      await removeLibraryCreative(selected.id);
      libraryCreatives = libraryCreatives.filter((item) => item.id !== selected.id);
      if (selectedLibraryCreative?.id === selected.id) selectedLibraryCreative = undefined;
      libraryError = `「${selected.name}」をライブラリから削除しました。`;
    } catch {
      libraryError = 'Creativeを削除できませんでした。もう一度お試しください。';
    }
  }

  function handleCompletedCreativeUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    uploadError = '';
    if (!file) return;
    uploadError = validateImageFile(file);
    if (uploadError) {
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const image = new Image();
      image.onload = () => {
        if (!isSupportedBannerSize(image.naturalWidth, image.naturalHeight)) {
          uploadError = `未対応サイズです。主要サイズ（300×250、336×280、728×90など）の画像を選択してください。`;
          input.value = '';
          return;
        }
        let storedUrl = url;
        let storedMimeType = file.type as UploadedCreativeAsset['mimeType'];
        if (storedUrl.length * 2 > 2_500_000) {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          if (!context) {
            uploadError = '画像を処理できませんでした。別の画像をお試しください。';
            return;
          }
          context.drawImage(image, 0, 0);
          storedUrl = canvas.toDataURL('image/webp', 0.92);
          storedMimeType = 'image/webp';
          if (storedUrl.length * 2 > 2_500_000) {
            uploadError = 'ブラウザ保存用に圧縮しても画像が大きすぎます。別の画像をお試しください。';
            input.value = '';
            return;
          }
        }
        uploadedAsset = {
          url: storedUrl,
          mimeType: storedMimeType,
          width: image.naturalWidth,
          height: image.naturalHeight
        };
        if (!creativeName.trim()) creativeName = file.name.replace(/\.[^.]+$/, '');
      };
      image.onerror = () => uploadError = '画像を読み込めませんでした。別の画像をお試しください。';
      image.src = url;
    };
    reader.onerror = () => uploadError = '画像を読み込めませんでした。別の画像をお試しください。';
    reader.readAsDataURL(file);
  }

  function currentCreativeSource(): CreativeSource | undefined {
    if (creativeMode === 'studio') return { type: 'studio', state: $state.snapshot(creative) };
    if (creativeMode === 'upload') return uploadedAsset ? { type: 'upload', asset: $state.snapshot(uploadedAsset) } : undefined;
    return selectedLibraryCreative ? structuredClone($state.snapshot(selectedLibraryCreative.source)) : undefined;
  }

  function handleImageUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    imageError = '';
    if (!file) return;
    imageError = validateImageFile(file);
    if (imageError) {
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          imageError = '画像を処理できませんでした。別の画像をお試しください。';
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimizedUrl = canvas.toDataURL('image/webp', 0.86);
        if (optimizedUrl.length * 2 > 2_500_000) {
          imageError = '保存用に圧縮しても画像が大きすぎます。より小さい画像を選択してください。';
          input.value = '';
          return;
        }
        const optimizedImage = new Image();
        optimizedImage.onload = () => {
          backgroundImage = optimizedImage;
          creative.background.image = optimizedUrl;
        };
        optimizedImage.onerror = () => imageError = '画像を処理できませんでした。別の画像をお試しください。';
        optimizedImage.src = optimizedUrl;
      };
      image.onerror = () => imageError = '画像を読み込めませんでした。別の画像をお試しください。';
      image.src = String(reader.result);
    };
    reader.onerror = () => imageError = '画像を読み込めませんでした。別の画像をお試しください。';
    reader.readAsDataURL(file);
  }

  async function generateBackgroundImage(prompt: string) {
    if (imageGenerating) return;
    const targetCreative = creative;
    const targetSize = $state.snapshot(creative.size);
    imageGenerating = true; imageError = '';
    try {
      const response = await fetch('/api/image-generation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, size: targetSize.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '画像を生成できませんでした。');
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = result.image; });
      const canvas = document.createElement('canvas');
      canvas.width = targetSize.width; canvas.height = targetSize.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('生成画像を処理できませんでした。');
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      const optimizedUrl = canvas.toDataURL('image/webp', 0.86);
      if (optimizedUrl.length * 2 > 2_500_000) throw new Error('生成画像が保存可能な容量を超えました。もう一度お試しください。');
      if (creative !== targetCreative || creativeMode !== 'studio' || creative.size.width !== targetSize.width || creative.size.height !== targetSize.height) return;
      creative.background.image = optimizedUrl;
      creative.background.type = 'image';
      loadBackgroundImage(optimizedUrl);
    } catch (error) { imageError = error instanceof Error ? error.message : '画像を生成できませんでした。'; }
    finally { imageGenerating = false; }
  }

  function validateCampaign() {
    const result = validateCampaignDraft($state.snapshot(draft), $state.snapshot(googleAds));
    saveMessage = result.message;
    dateError = result.dateError;
    return result.valid;
  }

  function openReview() {
    if (!validateCampaign()) return;
    if (creativeMode === 'upload' && !creativeName.trim()) {
      saveMessage = 'Creative名を入力してください。';
      return;
    }
    if (creativeMode === 'upload' && !uploadedAsset) {
      uploadError = '完成画像を選択してください。';
      saveMessage = uploadError;
      return;
    }
    if (creativeMode === 'library' && !selectedLibraryCreative) {
      libraryError = '使用するCreativeをライブラリから選択してください。';
      saveMessage = libraryError;
      return;
    }
    showReview = true;
    requestAnimationFrame(() => document.querySelector('.review-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function saveCampaign() {
    const dailyBudget = draft.dailyBudget;
    const targetValue = draft.targetKpi.value;
    if (!dailyBudget || !targetValue) {
      showReview = false;
      saveMessage = '予算と目標KPIを入力し直してください。';
      return;
    }
    const now = new Date().toISOString();
    const existing = editingId ? campaigns.find((campaign) => campaign.id === editingId) : undefined;
    const id = existing?.id ?? crypto.randomUUID();
    const creativeSource = currentCreativeSource();
    if (!creativeSource) {
      showReview = false;
      saveMessage = 'Creative画像を選択し直してください。';
      return;
    }
    const savedCreativeName = creativeName.trim() || `${draft.name.trim()} Creative`;
    const existingLibraryCreative = existing ? libraryCreatives.find((item) => item.id === existing.creative.id) : undefined;
    const studioVariants = creativeMode === 'studio' ? currentVariants() : undefined;
    const contentForComparison = { name: savedCreativeName, source: creativeSource, activeVariantId: studioVariants ? activeVariantId : undefined };
    const creativeId = creativeMode === 'library' && selectedLibraryCreative
      ? selectedLibraryCreative.id
      : existing && (!existingLibraryCreative || sameCreativeContent(contentForComparison, existingLibraryCreative, studioVariants))
        ? existing.creative.id
        : crypto.randomUUID();
    const campaign: Campaign = {
      ...$state.snapshot(draft),
      dailyBudget,
      targetKpi: { type: draft.targetKpi.type, value: targetValue },
      id,
      status: 'draft',
      creative: { id: creativeId, name: savedCreativeName, source: creativeSource, ...(studioVariants ? { activeVariantId } : selectedLibraryCreative?.activeVariantId ? { activeVariantId: selectedLibraryCreative.activeVariantId } : {}) },
      googleAds: {
        channel: 'google_ads',
        campaignType: 'display',
        adName: googleAds.adName.trim(),
        location: locationLabel(targetingFor(googleAds)),
        targeting: parseTargeting(targetingFor(googleAds)),
        language: 'ja',
        bidding: googleAds.bidding,
        initialState: 'paused'
      },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    const nextCampaigns = existing
      ? [campaign, ...campaigns.filter((item) => item.id !== campaign.id)]
      : [campaign, ...campaigns];
    const libraryCreativeToUpdate = libraryCreatives.find((item) => item.id === campaign.creative.id);
    const libraryCreative = creativeMode !== 'library'
      ? toLibraryCreative(campaign.creative, libraryCreativeToUpdate, now, studioVariants)
      : undefined;
    try {
      // Campaign localStorage contains only the selected image; the complete
      // Variant set must be safely stored before this Campaign can point to it.
      libraryCreatives = await persistCampaignDraft(nextCampaigns, libraryCreative);
    } catch {
      saveMessage = 'CreativeライブラリまたはCampaignを保存できませんでした。下書きは更新していません。保存容量を確認して再度お試しください。';
      return;
    }
    campaigns = nextCampaigns;
    editingId = campaign.id;
    showReview = false;
    saveMessage = `「${campaign.name}」を下書き保存しました。`;
    savedSnapshot = currentSnapshot();
  }

  function createCampaign() {
    if (!confirmDiscardChanges()) return;
    resetCampaign();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetCampaign(message = '') {
    editingId = undefined;
    saveMessage = message;
    dateError = '';
    showReview = false;
    draft.name = '';
    draft.landingPageUrl = '';
    draft.objective = 'traffic';
    draft.dailyBudget = undefined;
    draft.startDate = new Date().toISOString().slice(0, 10);
    draft.endDate = '';
    draft.targetKpi.value = undefined;
    draft.targetKpi.type = 'cpc';
    googleAds.adName = '';
    googleAds.location = '日本';
    googleAds.targeting = defaultTargeting();
    googleAds.bidding = 'maximize_clicks';
    creative = createDefaultCreativeState();
    variants = [];
    activeVariantId = 'base';
    backgroundImage = undefined;
    creativeMode = 'studio';
    creativeName = '';
    uploadedAsset = undefined;
    uploadError = '';
    selectedLibraryCreative = undefined;
    libraryError = '';
    savedSnapshot = currentSnapshot();
  }

  async function editCampaign(campaign: Campaign) {
    if (campaign.id !== editingId && !confirmDiscardChanges()) return;
    await libraryReady;
    const selected = $state.snapshot(campaign);
    editingId = selected.id;
    saveMessage = '';
    dateError = '';
    showReview = false;
    Object.assign(draft, structuredClone({
      name: selected.name,
      landingPageUrl: selected.landingPageUrl,
      objective: selected.objective,
      dailyBudget: selected.dailyBudget,
      startDate: selected.startDate,
      endDate: selected.endDate ?? '',
      targetKpi: selected.targetKpi
    }));
    googleAds.adName = selected.googleAds?.adName ?? `${selected.name} バナー広告`;
    googleAds.location = selected.googleAds?.location ?? '日本';
    googleAds.targeting = structuredClone(targetingFor(selected.googleAds));
    googleAds.bidding = selected.googleAds?.bidding ?? (selected.objective === 'conversion' ? 'maximize_conversions' : 'maximize_clicks');
    creativeName = selected.creative.name;
    selectedLibraryCreative = undefined;
    if (selected.creative.source.type === 'studio') {
      creativeMode = 'studio';
      uploadedAsset = undefined;
      creative = structuredClone(selected.creative.source.state);
      activeVariantId = selected.creative.activeVariantId ?? 'base';
      variants = structuredClone($state.snapshot(libraryCreatives.find(item => item.id === selected.creative.id)?.variants ?? [{ id: activeVariantId, state: creative }]));
      loadBackgroundImage(creative.background.image);
    } else {
      variants = [];
      activeVariantId = 'base';
      creativeMode = 'upload';
      uploadedAsset = structuredClone(selected.creative.source.asset);
      backgroundImage = undefined;
    }
    savedSnapshot = currentSnapshot();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(`「${campaign.name}」を削除しますか？この操作は取り消せません。`)) return;
    const nextCampaigns = withoutCampaign(campaigns, campaign.id);
    try {
      saveCampaigns(nextCampaigns);
      campaigns = nextCampaigns;
      if (editingId === campaign.id) resetCampaign(`「${campaign.name}」を削除しました。`);
      else saveMessage = `「${campaign.name}」を削除しました。`;
    } catch {
      saveMessage = 'Campaignを削除できませんでした。もう一度お試しください。';
    }
  }
</script>

<svelte:head><title>studio.ketabawo.asia | Creative制作</title></svelte:head>

<header>
  <div class="brand"><span>AI</span><strong>studio.ketabawo.asia</strong><em>Creative MVP</em></div>
  <GoogleAccount bind:email={accountEmail} />
</header>

<main>
  <div class="intro">
    <div><h1>Campaignを作成</h1><p>Campaign設定とCreativeをまとめて下書き保存します。</p></div>
    <div class="privacy"><span>✓</span><div><strong>Creativeはブラウザ内で編集</strong><small>編集・下書き保存はブラウザ内。入稿時は画像と広告設定をstudioサーバー経由でGoogle Adsへ送信します。</small></div></div>
  </div>
  {#if accountEmail}
    {#key accountEmail}
      <GoogleAdsConnection onConnectionChange={(key) => adsConnectionKey = key} />
      {#key adsConnectionKey}<PerformanceDashboard />{/key}
    {/key}
  {/if}
  <CampaignList {campaigns} activeId={editingId} onCreate={createCampaign} onEdit={editCampaign} onDelete={deleteCampaign} />
  <CampaignSetup {draft} {dateError} onObjectiveChange={syncObjective} />
  <section class="creative-step">
    <div class="creative-title"><span>2</span><div><h2>Creativeを用意</h2><p>新しく作る、完成画像をアップロードする、保存済みを使う、のどれか一つを選びます。</p></div></div>
    <CreativeSourceSelector mode={creativeMode} onSelect={selectCreativeMode} />
    {#if creativeMode === 'studio'}
      <CreativeVariants {variants} activeId={activeVariantId} currentState={creative} savedCreatives={libraryCreatives} onSelect={selectVariant} onAdd={addVariant} onImport={importVariant} onRemove={removeVariant} />
      {#key creative}
        {#key accountEmail}
          <CreativeAssistant {creative} signedIn={!!accountEmail} onApply={(before, proposal) => applyCopyProposal(creative, before, proposal)} />
        {/key}
      {/key}
      <div class="workspace">
        <BannerEditor creativeState={creative} {imageError} {imageGenerating} onImageUpload={handleImageUpload} onGenerateImage={generateBackgroundImage} />
        <BannerPreview {creative} {backgroundImage} />
      </div>
    {:else if creativeMode === 'upload'}
      <UploadedCreativeEditor name={creativeName} asset={uploadedAsset} error={uploadError} onNameInput={(name) => creativeName = name} onUpload={handleCompletedCreativeUpload} />
    {:else}
      <div class="library-intro"><strong>Campaignのバナーを一枚に差し替える</strong><p>選択したバナーだけが、このCampaignのCreativeになります。Reviewにも選択した一枚だけが表示されます。既存のサイズ別一覧へ画像を追加したい場合は「新しいバナーを作る」に戻り、「以前の画像をサイズ別編集に戻す」を使ってください。</p></div>
      <CreativeLibrary creatives={libraryCreatives} selectedId={selectedLibraryCreative?.id} selectedVariantId={selectedLibraryCreative?.activeVariantId} usageCount={(id) => creativeUsageCount(campaigns, id)} onSelect={selectLibraryCreative} onSelectVariant={selectLibraryVariant} onDelete={deleteLibraryCreative} />
      {#if selectedLibraryCreative}<p class="library-selected" role="status">「{selectedLibraryCreative.name}」へ差し替えました。Reviewにはこの一枚だけを表示します。</p>{/if}
      {#if libraryError}<p class:library-success={libraryError.includes('削除しました')} class="library-message" role="status">{libraryError}</p>{/if}
    {/if}
  </section>
  <GoogleAdsSetup settings={googleAds} />
  <div class="save-area">
    <div><strong>入稿内容を確認</strong><p>Campaign・Creative・Google Ads設定をReviewしてから保存します。</p>{#if hasUnsavedChanges}<span class="unsaved">● 未保存の変更があります</span>{/if}</div>
    <button onclick={openReview}>Reviewへ進む</button>
  </div>
  {#if saveMessage}<p class:save-error={saveMessage.includes('してください') || saveMessage.includes('超えました')} class="save-message">{saveMessage}</p>{/if}
  {#if showReview}
    {@const creativeSource = currentCreativeSource()}
    {@const reviewVariants = creativeMode === 'studio' ? currentVariants() : []}
    <div class="review-anchor">
      {#if creativeSource}<CampaignReview {draft} ads={googleAds} creativeName={creativeName.trim() || `${draft.name.trim()} Creative`} {creativeSource} variants={reviewVariants} {activeVariantId} {backgroundImage} onCancel={() => showReview = false} onConfirm={saveCampaign} />{/if}
    </div>
  {/if}
</main>

<footer>studio.ketabawo.asia <span>•</span> Creative制作モジュール <span>•</span> <a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー（別タブ）</a></footer>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { background: #f6f8fb; }
  :global(body) { margin: 0; color: #172033; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif; -webkit-font-smoothing: antialiased; }
  header { display: flex; min-height: 62px; gap: 16px; padding: 0 max(24px, calc((100% - 1180px) / 2)); align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; background: #ffffffeb; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand > span { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 8px; background: #2563eb; color: white; font-size: 12px; font-weight: 800; }
  .brand strong { font-size: 15px; letter-spacing: -.2px; }
  .brand em { padding: 3px 6px; border-radius: 4px; background: #eff6ff; color: #2563eb; font-size: 9px; font-style: normal; font-weight: 750; }
  main { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 34px 0 60px; }
  .intro { display: flex; margin-bottom: 25px; align-items: center; justify-content: space-between; }
  h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: -.5px; }
  .intro p { margin: 0; color: #64748b; font-size: 12px; }
  .privacy { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #d1fae5; border-radius: 5px; background: #f0fdf4; }
  .privacy > span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #10b981; color: white; font-size: 11px; }
  .privacy div { display: grid; gap: 2px; }
  .privacy strong { color: #047857; font-size: 10px; }
  .privacy small { max-width: 360px; color: #416b5d; font-size: 12px; line-height: 1.6; }
  .creative-step { margin-top: 24px; padding: 22px; border: 1px solid #dbe3ef; border-radius: 5px; background: white; box-shadow: 0 8px 24px #0f172a08; }
  .creative-title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .creative-title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 5px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  .creative-title h2, .creative-title p { margin: 0; }
  .creative-title h2 { font-size: 16px; }
  .creative-title p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }
  .save-area { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 20px 22px; border: 1px solid #bfdbfe; border-radius: 5px; background: #eff6ff; }
  .save-area strong { font-size: 14px; }
  .save-area p { margin: 4px 0 0; color: #64748b; font-size: 11px; }
  .unsaved { display: block; margin-top: 7px; color: #b45309; font-size: 10px; font-weight: 700; }
  .save-area button { flex: 0 0 auto; border: 0; border-radius: 5px; padding: 12px 18px; background: #2563eb; color: white; cursor: pointer; font: inherit; font-size: 13px; font-weight: 750; }
  .save-area button:hover { background: #1d4ed8; }
  .save-message { margin: 12px 0 0; color: #047857; font-size: 12px; text-align: right; }
  .save-message.save-error { color: #dc2626; }
  .library-message { margin: 12px 0 0; color: #dc2626; font-size: 11px; }
  .library-message.library-success { color: #047857; }
  .library-intro { margin: 0 0 12px; }
  .library-intro strong { font-size: 13px; }
  .library-intro p, .library-selected { margin: 4px 0 0; color: #64748b; font-size: 11px; }
  .library-selected { margin-top: 12px; color: #166534; font-weight: 650; }
  footer { padding: 22px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  footer span { margin: 0 7px; color: #cbd5e1; }
  @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } .intro { gap: 18px; } }
  @media (max-width: 600px) { header { padding: 12px 16px; flex-wrap: wrap; } main { width: calc(100% - 28px); padding-top: 24px; } .intro { align-items: flex-start; flex-direction: column; } .privacy { width: 100%; } .creative-step { padding: 14px; } .save-area { align-items: stretch; flex-direction: column; } }
</style>
