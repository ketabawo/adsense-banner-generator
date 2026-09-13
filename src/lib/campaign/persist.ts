import { saveCampaigns } from './storage';
import { loadCreativeLibrary, saveLibraryCreative } from '$lib/creative/library';
import type { Campaign } from '$lib/types/campaign';
import type { LibraryCreative } from '$lib/types/creative';

export async function persistCampaignDraft(
  campaigns: Campaign[],
  creative?: LibraryCreative,
  library = { save: saveLibraryCreative, load: loadCreativeLibrary }
) {
  if (creative) await library.save(creative);
  const creatives = await library.load();
  saveCampaigns(campaigns);
  return creatives;
}
