const { supplierRepository } = require('../repositories');
const AppError = require('../errors/AppError');

class SupplierService {
  async getAllSuppliers(queryParams) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = parseInt(queryParams.limit || '10', 10);
    const search = queryParams.search;

    return supplierRepository.findAll({ page, limit, search });
  }

  async getSupplierById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Không tìm thấy nhà cung cấp theo mã định danh yêu cầu', 404);
    }
    return supplier;
  }

  async createSupplier(data) {
    const cleanName = data.name.trim();

    // 1. Ràng buộc: Kiểm tra trùng lặp tên nhà cung cấp
    const existingByName = await supplierRepository.findByName(cleanName);
    if (existingByName) {
      throw new AppError(`Nhà cung cấp có tên "${cleanName}" đã tồn tại trong hệ thống`, 409);
    }

    // 2. Ràng buộc: Kiểm tra trùng lặp Email (nếu có)
    if (data.contactEmail && data.contactEmail.trim()) {
      const cleanEmail = data.contactEmail.trim();
      const existingByEmail = await supplierRepository.findByEmail(cleanEmail);
      if (existingByEmail) {
        throw new AppError(`Email liên hệ "${cleanEmail}" đã được sử dụng bởi một nhà cung cấp khác`, 409);
      }
    }

    // 3. Ràng buộc: Kiểm tra trùng lặp Số điện thoại (nếu có)
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.trim();
      const existingByPhone = await supplierRepository.findByPhone(cleanPhone);
      if (existingByPhone) {
        throw new AppError(`Số điện thoại "${cleanPhone}" đã được sử dụng bởi một nhà cung cấp khác`, 409);
      }
    }

    return supplierRepository.create(data);
  }

  async updateSupplier(id, data) {
    // 1. Kiểm tra nhà cung cấp có tồn tại
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Không tìm thấy nhà cung cấp để cập nhật', 404);
    }

    // 2. Ràng buộc trùng lặp Tên khi sửa
    if (data.name && data.name.trim()) {
      const cleanName = data.name.trim();
      const existingByName = await supplierRepository.findByName(cleanName);
      if (existingByName && existingByName.id !== id) {
        throw new AppError(`Tên nhà cung cấp "${cleanName}" đã được sử dụng bởi nhà cung cấp khác`, 409);
      }
    }

    // 3. Ràng buộc trùng lặp Email khi sửa
    if (data.contactEmail && data.contactEmail.trim()) {
      const cleanEmail = data.contactEmail.trim();
      const existingByEmail = await supplierRepository.findByEmail(cleanEmail);
      if (existingByEmail && existingByEmail.id !== id) {
        throw new AppError(`Email liên hệ "${cleanEmail}" đã được sử dụng bởi nhà cung cấp khác`, 409);
      }
    }

    // 4. Ràng buộc trùng lặp Phone khi sửa
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.trim();
      const existingByPhone = await supplierRepository.findByPhone(cleanPhone);
      if (existingByPhone && existingByPhone.id !== id) {
        throw new AppError(`Số điện thoại "${cleanPhone}" đã được sử dụng bởi nhà cung cấp khác`, 409);
      }
    }

    return supplierRepository.update(id, data);
  }

  async deleteSupplier(id) {
    // 1. Kiểm tra tồn tại
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new AppError('Không tìm thấy nhà cung cấp để xóa', 404);
    }

    // 2. Ràng buộc toàn vẹn: Không cho phép xóa nhà cung cấp đang có sản phẩm liên kết
    const productCount = supplier._count?.products || 0;
    if (productCount > 0) {
      throw new AppError(
        `Không thể xóa nhà cung cấp "${supplier.name}" vì đang có ${productCount} sản phẩm liên kết trong hệ thống. Vui lòng chuyển đổi nhà cung cấp của các sản phẩm này trước khi xóa.`,
        400
      );
    }

    await supplierRepository.delete(id);
    return {
      id,
      name: supplier.name,
      message: `Đã xóa nhà cung cấp "${supplier.name}" thành công`,
    };
  }
}

module.exports = new SupplierService();
