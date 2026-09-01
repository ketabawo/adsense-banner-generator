<script lang="ts">
  import BannerEditor from '$lib/components/BannerEditor.svelte';
  import BannerPreview from '$lib/components/BannerPreview.svelte';
  import CampaignSetup from '$lib/components/CampaignSetup.svelte';
  import CampaignList from '$lib/components/CampaignList.svelte';
  import GoogleAdsSetup from '$lib/components/GoogleAdsSetup.svelte';
  import CampaignReview from '$lib/components/CampaignReview.svelte';
  import CreativeSourceSelector from '$lib/components/CreativeSourceSelector.svelte';
  import UploadedCreativeEditor from '$lib/components/UploadedCreativeEditor.svelte';
  import CreativeLibrary from '$lib/components/CreativeLibrary.svelte';
  import { createDefaultCreativeState } from '$lib/banner/defaultState';
  import { isSupportedBannerSize, validateImageFile } from '$lib/banner/imageUpload';
  import { loadCampaigns, saveCampaigns } from '$lib/campaign/storage';
  import { settingsForObjective, validateCampaignDraft, withoutCampaign } from '$lib/campaign/rules';
  import { creativeUsageCount, loadCreativeLibrary, migrateCampaignCreatives, removeLibraryCreative, sameCreativeContent, saveLibraryCreative, toLibraryCreative } from '$lib/creative/library';
  import type { Campaign, CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  import type { CreativeMode, CreativeSource, LibraryCreative, UploadedCreativeAsset } from '$lib/types/creative';

  // Manual controls and future AI commands must update this same state object.
  let creative = $state(createDefaultCreativeState());
  let backgroundImage = $state<HTMLImageElement | undefined>();
  let imageError = $state('');
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
  let googleAds = $state<GoogleAdsDraft>({ adName: '', location: '日本', bidding: 'maximize_clicks' });
  let savedSnapshot = $state('');

  function currentSnapshot() {
    return JSON.stringify({ draft, googleAds, creativeMode, creativeName, creative, uploadedAsset, selectedLibraryId: selectedLibraryCreative?.id });
  }

  let hasUnsavedChanges = $derived(savedSnapshot !== '' && currentSnapshot() !== savedSnapshot);

  $effect(() => {
    const loadedCampaigns = loadCampaigns();
    campaigns = loadedCampaigns;
    void initializeCreativeLibrary(loadedCampaigns);
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
    image.onload = () => backgroundImage = image;
    image.src = url;
  }

  function selectLibraryCreative(selected: LibraryCreative) {
    selectedLibraryCreative = structuredClone($state.snapshot(selected));
    creativeName = selected.name;
    if (selected.source.type === 'studio') loadBackgroundImage(selected.source.state.background.image);
    else backgroundImage = undefined;
    libraryError = '';
  }

  async function deleteLibraryCreative(selected: LibraryCreative) {
    const usage = creativeUsageCount(campaigns, selected.id);
    const usageMessage = usage > 0 ? `\n${usage}件のCampaign内のCreativeは削除されず、そのまま残ります。` : '';
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
    const contentForComparison = { name: savedCreativeName, source: creativeSource };
    const creativeId = creativeMode === 'library' && selectedLibraryCreative
      ? selectedLibraryCreative.id
      : existing && (!existingLibraryCreative || sameCreativeContent(contentForComparison, existingLibraryCreative))
        ? existing.creative.id
        : crypto.randomUUID();
    const campaign: Campaign = {
      ...$state.snapshot(draft),
      dailyBudget,
      targetKpi: { type: draft.targetKpi.type, value: targetValue },
      id,
      status: 'draft',
      creative: { id: creativeId, name: savedCreativeName, source: creativeSource },
      googleAds: {
        channel: 'google_ads',
        campaignType: 'display',
        adName: googleAds.adName.trim(),
        location: googleAds.location.trim(),
        language: 'ja',
        bidding: googleAds.bidding,
        initialState: 'paused'
      },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    campaigns = existing
      ? [campaign, ...campaigns.filter((item) => item.id !== campaign.id)]
      : [campaign, ...campaigns];
    try {
      saveCampaigns(campaigns);
    } catch {
      campaigns = loadCampaigns();
      saveMessage = '保存容量を超えました。画像を小さくしてお試しください。';
      return;
    }
    try {
      const libraryCreativeToUpdate = libraryCreatives.find((item) => item.id === campaign.creative.id);
      await saveLibraryCreative(toLibraryCreative(campaign.creative, libraryCreativeToUpdate, now));
      libraryCreatives = await loadCreativeLibrary();
    } catch {
      libraryError = 'Campaignは保存しましたが、Creativeライブラリを更新できませんでした。';
    }
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
    googleAds.bidding = 'maximize_clicks';
    creative = createDefaultCreativeState();
    backgroundImage = undefined;
    creativeMode = 'studio';
    creativeName = '';
    uploadedAsset = undefined;
    uploadError = '';
    selectedLibraryCreative = undefined;
    libraryError = '';
    savedSnapshot = currentSnapshot();
  }

  function editCampaign(campaign: Campaign) {
    if (campaign.id !== editingId && !confirmDiscardChanges()) return;
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
    googleAds.bidding = selected.googleAds?.bidding ?? (selected.objective === 'conversion' ? 'maximize_conversions' : 'maximize_clicks');
    creativeName = selected.creative.name;
    selectedLibraryCreative = undefined;
    if (selected.creative.source.type === 'studio') {
      creativeMode = 'studio';
      uploadedAsset = undefined;
      creative = structuredClone(selected.creative.source.state);
      const imageUrl = creative.background.image;
      if (imageUrl) {
        const image = new Image();
        image.onload = () => backgroundImage = image;
        image.src = imageUrl;
      } else {
        backgroundImage = undefined;
      }
    } else {
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
  <p>AI広告運用プラットフォーム</p>
</header>

<main>
  <div class="intro">
    <div><h1>Campaignを作成</h1><p>Campaign設定とCreativeをまとめて下書き保存します。</p></div>
    <div class="privacy"><span>✓</span><div><strong>ブラウザだけで完結</strong><small>アップロード画像は外部へ送信されません</small></div></div>
  </div>
  <CampaignList {campaigns} activeId={editingId} onCreate={createCampaign} onEdit={editCampaign} onDelete={deleteCampaign} />
  <CampaignSetup {draft} {dateError} onObjectiveChange={syncObjective} />
  <section class="creative-step">
    <div class="creative-title"><span>2</span><div><h2>Creativeを選択</h2><p>studioで作成するか、完成済みの広告画像を登録します。</p></div></div>
    <CreativeSourceSelector mode={creativeMode} onSelect={selectCreativeMode} />
    {#if creativeMode === 'studio'}
      <div class="workspace">
        <BannerEditor state={creative} {imageError} onImageUpload={handleImageUpload} />
        <BannerPreview {creative} {backgroundImage} />
      </div>
    {:else if creativeMode === 'upload'}
      <UploadedCreativeEditor name={creativeName} asset={uploadedAsset} error={uploadError} onNameInput={(name) => creativeName = name} onUpload={handleCompletedCreativeUpload} />
    {:else}
      <CreativeLibrary creatives={libraryCreatives} selectedId={selectedLibraryCreative?.id} usageCount={(id) => creativeUsageCount(campaigns, id)} onSelect={selectLibraryCreative} onDelete={deleteLibraryCreative} />
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
    <div class="review-anchor">
      {#if creativeSource}<CampaignReview {draft} ads={googleAds} creativeName={creativeName.trim() || `${draft.name.trim()} Creative`} {creativeSource} {backgroundImage} onCancel={() => showReview = false} onConfirm={saveCampaign} />{/if}
    </div>
  {/if}
</main>

<footer>studio.ketabawo.asia <span>•</span> Creative制作モジュール</footer>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { background: #f6f8fb; }
  :global(body) { margin: 0; color: #172033; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif; -webkit-font-smoothing: antialiased; }
  header { display: flex; height: 62px; padding: 0 max(24px, calc((100% - 1180px) / 2)); align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; background: #ffffffeb; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand > span { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 8px; background: #2563eb; color: white; font-size: 12px; font-weight: 800; }
  .brand strong { font-size: 15px; letter-spacing: -.2px; }
  .brand em { padding: 3px 6px; border-radius: 4px; background: #eff6ff; color: #2563eb; font-size: 9px; font-style: normal; font-weight: 750; }
  header p { color: #94a3b8; font-size: 11px; }
  main { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 34px 0 60px; }
  .intro { display: flex; margin-bottom: 25px; align-items: center; justify-content: space-between; }
  h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: -.5px; }
  .intro p { margin: 0; color: #64748b; font-size: 12px; }
  .privacy { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #d1fae5; border-radius: 10px; background: #f0fdf4; }
  .privacy > span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #10b981; color: white; font-size: 11px; }
  .privacy div { display: grid; gap: 2px; }
  .privacy strong { color: #047857; font-size: 10px; }
  .privacy small { color: #6b9a86; font-size: 9px; }
  .creative-step { margin-top: 24px; padding: 22px; border: 1px solid #dbe3ef; border-radius: 16px; background: white; box-shadow: 0 8px 24px #0f172a08; }
  .creative-title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .creative-title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  .creative-title h2, .creative-title p { margin: 0; }
  .creative-title h2 { font-size: 16px; }
  .creative-title p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }
  .save-area { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 20px 22px; border: 1px solid #bfdbfe; border-radius: 14px; background: #eff6ff; }
  .save-area strong { font-size: 14px; }
  .save-area p { margin: 4px 0 0; color: #64748b; font-size: 11px; }
  .unsaved { display: block; margin-top: 7px; color: #b45309; font-size: 10px; font-weight: 700; }
  .save-area button { flex: 0 0 auto; border: 0; border-radius: 9px; padding: 12px 18px; background: #2563eb; color: white; cursor: pointer; font: inherit; font-size: 13px; font-weight: 750; }
  .save-area button:hover { background: #1d4ed8; }
  .save-message { margin: 12px 0 0; color: #047857; font-size: 12px; text-align: right; }
  .save-message.save-error { color: #dc2626; }
  .library-message { margin: 12px 0 0; color: #dc2626; font-size: 11px; }
  .library-message.library-success { color: #047857; }
  footer { padding: 22px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  footer span { margin: 0 7px; color: #cbd5e1; }
  @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } .intro { gap: 18px; } }
  @media (max-width: 600px) { header { padding: 0 16px; } header p { display: none; } main { width: calc(100% - 28px); padding-top: 24px; } .intro { align-items: flex-start; flex-direction: column; } .privacy { width: 100%; } .creative-step { padding: 14px; } .save-area { align-items: stretch; flex-direction: column; } }
</style>
