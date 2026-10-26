import type { Request, Response } from 'express';
import { promotionService } from '../services/promotion.service';

export const promotionController = {
  async listPromotions(req: Request, res: Response) {
    const { page, size, promoType, isActive, status, search } = req.query;
    const result = await promotionService.listPromotions({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
      promoType: promoType ? String(promoType) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      status: status as any,
      search: search ? String(search) : undefined,
    });
    res.json({ success: true, data: result });
  },

  async getPromotionDetail(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await promotionService.getPromotionDetail(id);
    res.json({ success: true, data: result });
  },

  async createPromotion(req: Request, res: Response) {
    const result = await promotionService.createPromotion(req.body);
    res.status(201).json({ success: true, data: result, message: 'Tạo chương trình khuyến mãi thành công' });
  },

  async updatePromotion(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await promotionService.updatePromotion(id, req.body);
    res.json({ success: true, data: result, message: 'Cập nhật chương trình khuyến mãi thành công' });
  },

  async toggleStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    const result = await promotionService.toggleStatus(id, isActive);
    res.json({ success: true, data: result, message: 'Cập nhật trạng thái khuyến mãi thành công' });
  },

  async deletePromotion(req: Request, res: Response) {
    const id = Number(req.params.id);
    await promotionService.deletePromotion(id);
    res.json({ success: true, message: 'Xóa chương trình khuyến mãi thành công' });
  },

  async syncProducts(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { products } = req.body;
    const result = await promotionService.syncProducts(id, products);
    res.json({ success: true, data: result, message: 'Đồng bộ danh sách sản phẩm khuyến mãi thành công' });
  },

  async syncTiers(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { tiers } = req.body;
    const result = await promotionService.syncTiers(id, tiers);
    res.json({ success: true, data: result, message: 'Đồng bộ các bậc hóa đơn thành công' });
  },

  async listVouchers(req: Request, res: Response) {
    const promoId = Number(req.params.id);
    const { search, page, size } = req.query;
    const result = await promotionService.listVouchers(promoId, {
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
    res.json({ success: true, data: result });
  },

  async createVoucher(req: Request, res: Response) {
    const promoId = Number(req.params.id);
    await promotionService.createVoucher(promoId, req.body);
    res.status(201).json({ success: true, message: 'Tạo voucher thành công' });
  },

  async generateBatchVouchers(req: Request, res: Response) {
    const promoId = Number(req.params.id);
    const result = await promotionService.generateBatchVouchers(promoId, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: `Đã sinh thành công ${result.generatedCount} mã voucher`,
    });
  },

  async toggleVoucherStatus(req: Request, res: Response) {
    const { code } = req.params;
    const { isDeleted } = req.body;
    await promotionService.toggleVoucherStatus(code, isDeleted ?? true);
    res.json({ success: true, message: 'Cập nhật trạng thái voucher thành công' });
  },

  async getActivePromotions(_req: Request, res: Response) {
    const result = await promotionService.getActivePromotions();
    res.json({ success: true, data: result });
  },

  async getPublicVouchers(_req: Request, res: Response) {
    const result = await promotionService.getPublicVouchers();
    res.json({ success: true, data: result });
  },

  async validateVoucher(req: Request, res: Response) {
    const { voucherCode, totalAmount } = req.body;
    const result = await promotionService.validateVoucher(voucherCode, totalAmount);
    res.json({ success: true, data: result });
  },
};
