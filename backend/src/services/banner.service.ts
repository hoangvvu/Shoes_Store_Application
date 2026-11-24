import { AppError } from '../errors/AppError';
import { bannerRepository } from '../repositories/banner.repository';
import type { Banner, BannerFilter, CreateBannerInput, UpdateBannerInput } from '../types/banner.types';

export const bannerService = {
  async list(filter?: BannerFilter): Promise<Banner[]> {
    return bannerRepository.list(filter);
  },

  async getById(id: number): Promise<Banner> {
    const banner = await bannerRepository.findById(id);
    if (!banner) {
      throw AppError.notFound(`Không tìm thấy banner #${id}`);
    }
    return banner;
  },

  async create(data: CreateBannerInput, userId?: number | null): Promise<Banner> {
    if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
      throw AppError.badRequest('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
    }
    return bannerRepository.create(data, userId);
  },

  async update(id: number, data: UpdateBannerInput): Promise<Banner> {
    const existing = await bannerRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Không tìm thấy banner #${id}`);
    }
    const updated = await bannerRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Cập nhật thất bại cho banner #${id}`);
    }
    return updated;
  },

  async remove(id: number): Promise<void> {
    const ok = await bannerRepository.delete(id);
    if (!ok) {
      throw AppError.notFound(`Không tìm thấy banner #${id}`);
    }
  },
};
