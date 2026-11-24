export interface Banner {
  bannerId: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: 'HOME_TOP' | 'HOME_MIDDLE' | 'HOME_BOTTOM' | 'POPUP' | 'CATEGORY';
  platform: 'WEB' | 'MOBILE' | 'ALL';
  sortOrder: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}
