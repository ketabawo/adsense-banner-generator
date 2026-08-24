export type BannerSize = {
  id: string;
  width: number;
  height: number;
  label: string;
};

export type TextAlign = 'left' | 'center' | 'right';
export type BackgroundType = 'color' | 'image';

export type BannerState = {
  size: BannerSize;
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
