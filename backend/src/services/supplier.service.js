const supplierRepository = require('../repositories/supplier.repository');
const { validateSupplier } = require('../validators/supplier.validator');
const { NotFoundError } = require('../errors');

const supplierService = {
  async getSuppliers({ q, page, size }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.max(1, Math.min(100, parseInt(size, 10) || 10));
    return supplierRepository.findAll({ q, page: pageNum, size: sizeNum });
  },

  async getSupplierById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError(`Không tìm thấy nhà cung cấp #${id}`);
    }
    return supplier;
  },

  async createSupplier(data) {
    validateSupplier(data);
    return supplierRepository.create({
      supplierName: data.supplierName.trim(),
      phone: data.phone ? data.phone.trim() : null,
      email: data.email ? data.email.trim() : null,
      address: data.address ? data.address.trim() : null,
    });
  },

  async updateSupplier(id, data) {
    validateSupplier(data);
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError(`Không tìm thấy nhà cung cấp #${id}`);
    }

    return supplierRepository.update(id, {
      supplierName: data.supplierName ? data.supplierName.trim() : undefined,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      email: data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined,
      address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
    });
  },

  async deleteSupplier(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError(`Không tìm thấy nhà cung cấp #${id}`);
    }

    return supplierRepository.delete(id);
  },
};

module.exports = supplierService;
