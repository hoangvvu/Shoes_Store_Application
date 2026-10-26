import { z } from 'zod';

export const bannerPositions = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'POPUP', 'CATEGORY'] as const;
export const bannerPlatforms = ['WEB', 'MOBILE', 'ALL'] as const;

export const createBannerSchema = z.object({
  title: z.string({ required_error: 'Vui lòng nhập tiêu đề banner' }).trim().min(1, 'Tiêu đề không được để trống').max(150),
  imageUrl: z.string({ required_error: 'Vui lòng chọn ảnh banner' }).trim().min(1, 'Ảnh banner không được để trống').max(500),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  position: z.enum(bannerPositions).default('HOME_TOP'),
  platform: z.enum(bannerPlatforms).default('ALL'),
  sortOrder: z.coerce.number().int().default(0),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  promotionId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateBannerSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(150).optional(),
  imageUrl: z.string().trim().min(1, 'Ảnh banner không được để trống').max(500).optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  position: z.enum(bannerPositions).optional(),
  platform: z.enum(bannerPlatforms).optional(),
  sortOrder: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  promotionId: z.coerce.number().int().positive().nullable().optional(),
});

export const bannerQuerySchema = z.object({
  platform: z.enum(bannerPlatforms).optional(),
  position: z.enum(bannerPositions).optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true || val === '1' || val === 1) return true;
    if (val === 'false' || val === false || val === '0' || val === 0) return false;
    return undefined;
  }, z.boolean().optional()),
});
