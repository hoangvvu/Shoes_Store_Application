const { voucherRepository } = require('../repositories');
const AppError = require('../errors/AppError');

class VoucherService {
  async getActiveVouchers() {
    return voucherRepository.findActiveVouchers();
  }

  async checkVoucher(code, orderValue = 0) {
    if (!code) {
      throw new AppError('Vui lòng nhập mã giảm giá', 400);
    }

    const voucher = await voucherRepository.findByCode(code);
    if (!voucher) {
      throw new AppError('Mã giảm giá không tồn tại', 404);
    }

    if (!voucher.isActive) {
      throw new AppError('Mã giảm giá này hiện đang tạm ngưng sử dụng', 400);
    }

    const now = new Date();
    if (now < voucher.startDate) {
      throw new AppError('Chương trình khuyến mãi này chưa bắt đầu', 400);
    }

    if (now > voucher.endDate) {
      throw new AppError('Mã giảm giá này đã hết hạn sử dụng', 400);
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      throw new AppError('Mã giảm giá này đã hết lượt sử dụng', 400);
    }

    const minOrderVal = Number(voucher.minOrderValue);
    if (orderValue < minOrderVal) {
      throw new AppError(`Đơn hàng phải có giá trị tối thiểu ${minOrderVal.toLocaleString('vi-VN')} đ để áp dụng mã này`, 400);
    }

    // Tính số tiền giảm giá
    let discountAmount = 0;
    if (voucher.discountType === 'PERCENT') {
      discountAmount = (orderValue * Number(voucher.discountValue)) / 100;
      if (voucher.maxDiscountAmount && discountAmount > Number(voucher.maxDiscountAmount)) {
        discountAmount = Number(voucher.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(voucher.discountValue);
    }

    return {
      voucher: {
        id: voucher.id,
        code: voucher.code,
        title: voucher.title,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue,
      },
      orderValue,
      discountAmount,
      finalValue: Math.max(0, orderValue - discountAmount),
    };
  }

  async getAllVouchers(query) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const search = query.search;
    let isActive;
    if (query.isActive !== undefined) {
      isActive = query.isActive === 'true';
    }

    return voucherRepository.findAll({ page, limit, search, isActive });
  }

  async getVoucherById(id) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) {
      throw new AppError('Không tìm thấy voucher theo mã định danh', 404);
    }
    return voucher;
  }

  async createVoucher(data) {
    const code = data.code.trim().toUpperCase();
    const existing = await voucherRepository.findByCode(code);
    if (existing) {
      throw new AppError(`Mã giảm giá ${code} đã tồn tại trong hệ thống`, 409);
    }

    const payload = {
      code,
      title: data.title.trim(),
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      minOrderValue: data.minOrderValue !== undefined ? Number(data.minOrderValue) : 0,
      maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
      usageLimit: data.usageLimit !== undefined ? parseInt(data.usageLimit, 10) : 100,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    };

    return voucherRepository.create(payload);
  }

  async updateVoucher(id, data) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) {
      throw new AppError('Không tìm thấy voucher để cập nhật', 404);
    }

    const updatePayload = {};

    if (data.code) {
      const newCode = data.code.trim().toUpperCase();
      const existing = await voucherRepository.findByCode(newCode);
      if (existing && existing.id !== id) {
        throw new AppError(`Mã giảm giá ${newCode} đã được sử dụng cho một voucher khác`, 409);
      }
      updatePayload.code = newCode;
    }

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.discountType !== undefined) updatePayload.discountType = data.discountType;
    if (data.discountValue !== undefined) updatePayload.discountValue = Number(data.discountValue);
    if (data.minOrderValue !== undefined) updatePayload.minOrderValue = Number(data.minOrderValue);
    if (data.maxDiscountAmount !== undefined) updatePayload.maxDiscountAmount = data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null;
    if (data.usageLimit !== undefined) updatePayload.usageLimit = parseInt(data.usageLimit, 10);
    if (data.startDate !== undefined) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updatePayload.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);

    return voucherRepository.update(id, updatePayload);
  }

  async toggleVoucherStatus(id, newStatus) {
    const voucher = await voucherRepository.findById(id);
    if (!voucher) {
      throw new AppError('Không tìm thấy voucher cần thay đổi trạng thái', 404);
    }

    const targetStatus = typeof newStatus === 'boolean' ? newStatus : !voucher.isActive;
    const updated = await voucherRepository.updateStatus(id, targetStatus);
    return {
      voucher: updated,
      message: targetStatus ? 'Đã mở khóa và kích hoạt voucher thành công' : 'Đã khóa voucher thành công',
    };
  }
}

module.exports = new VoucherService();
