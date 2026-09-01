import { openDB, type DBSchema } from 'idb';
import type { Campaign } from '$lib/types/campaign';
import type { Creative, LibraryCreative } from '$lib/types/creative';

const DB_NAME = 'studio.creative-library';
const DB_VERSION = 1;
const STORE_NAME = 'creatives';

interface CreativeLibraryDB extends DBSchema {
  creatives: {
    key: string;
    value: LibraryCreative;
    indexes: { 'by-updated-at': string };
  };
}

function database() {
  return openDB<CreativeLibraryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('by-updated-at', 'updatedAt');
    }
  });
}

export async function loadCreativeLibrary(): Promise<LibraryCreative[]> {
  const db = await database();
  const creatives = await db.getAllFromIndex(STORE_NAME, 'by-updated-at');
  return creatives.reverse();
}

export async function saveLibraryCreative(creative: LibraryCreative) {
  const db = await database();
  await db.put(STORE_NAME, creative);
}

export async function removeLibraryCreative(id: string) {
  const db = await database();
  await db.delete(STORE_NAME, id);
}

export async function migrateCampaignCreatives(campaigns: Campaign[]): Promise<LibraryCreative[]> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  for (const campaign of campaigns) {
    const existing = await transaction.store.get(campaign.creative.id);
    if (!existing) {
      await transaction.store.put({
        ...structuredClone(campaign.creative),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      });
    }
  }
  await transaction.done;
  return loadCreativeLibrary();
}

export function toLibraryCreative(creative: Creative, existing: LibraryCreative | undefined, now: string): LibraryCreative {
  return {
    ...structuredClone(creative),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

export function creativeUsageCount(campaigns: Campaign[], creativeId: string) {
  return campaigns.filter((campaign) => campaign.creative.id === creativeId).length;
}

export function sameCreativeContent(creative: Pick<Creative, 'name' | 'source'>, libraryCreative: LibraryCreative) {
  return creative.name === libraryCreative.name && JSON.stringify(creative.source) === JSON.stringify(libraryCreative.source);
}

export const CREATIVE_LIBRARY_DB_NAME = DB_NAME;
