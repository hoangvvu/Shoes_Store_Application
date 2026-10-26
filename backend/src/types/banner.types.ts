export type BannerPosition = 'HOME_TOP' | 'HOME_MIDDLE' | 'HOME_BOTTOM' | 'POPUP' | 'CATEGORY';
export type BannerPlatform = 'WEB' | 'MOBILE' | 'ALL';

export interface Banner {
  bannerId: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: BannerPosition;
  platform: BannerPlatform;
  sortOrder: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  promotionId: number | null;
  createdBy: number | null;
  createdAt: string;
}

export interface BannerFilter {
  platform?: BannerPlatform;
  position?: BannerPosition;
  isActive?: boolean;
}

export interface CreateBannerInput {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  position?: BannerPosition;
  platform?: BannerPlatform;
  sortOrder?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  promotionId?: number | null;
}

export interface UpdateBannerInput {
  title?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  position?: BannerPosition;
  platform?: BannerPlatform;
  sortOrder?: number;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  promotionId?: number | null;
}
