export type CreativeSize = {
  id: string;
  width: number;
  height: number;
  label: string;
};

export type TextAlign = 'left' | 'center' | 'right';
export type BackgroundType = 'color' | 'image';
export type CreativeMode = 'studio' | 'upload' | 'library';
export type UploadedCreativeAsset = Extract<CreativeSource, { type: 'upload' }>['asset'];

/**
 * The single editable state shared by the parameter UI and AI copy proposals. This is the source data for studio-created creatives.
 */
export type CreativeState = {
  size: CreativeSize;
  background: {
    type: BackgroundType;
    color: string;
    image?: string;
    overlayOpacity: number;
  };
  headline: {
    text: string;
    fontSize: number;
    bold: boolean;
    color: string;
    align: TextAlign;
  };
  subText: {
    enabled: boolean;
    text: string;
    fontSize: number;
    color: string;
  };
  cta: {
    enabled: boolean;
    text: string;
    backgroundColor: string;
    color: string;
    borderRadius: number;
  };
  templateId: 'simple';
};

/**
 * Creative input is intentionally independent from the editor. Campaigns and
 * ads can reference either an editable studio creative or an uploaded asset.
 */
export type CreativeSource =
  | { type: 'studio'; state: CreativeState }
  | {
      type: 'upload';
      asset: {
        url: string;
        mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
        width: number;
        height: number;
      };
    };

export type Creative = {
  id: string;
  name: string;
  source: CreativeSource;
  /** The variant selected for this Campaign's preview and fixed-image submission. */
  activeVariantId?: string;
};

export type CreativeVariant = { id: string; state: CreativeState; name?: string };

export type LibraryCreative = Creative & {
  createdAt: string;
  updatedAt: string;
  /** Full editable variants live in IndexedDB; Campaign localStorage keeps the selected state only. */
  variants?: CreativeVariant[];
};
