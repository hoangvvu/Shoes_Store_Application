const purchaseReceiptRepository = require('../repositories/purchaseReceipt.repository');
const supplierRepository = require('../repositories/supplier.repository');
const employeeRepository = require('../repositories/employee.repository');
const productRepository = require('../repositories/product.repository');
const { validateCreatePurchaseReceipt } = require('../validators/purchaseReceipt.validator');
const { NotFoundError, BadRequestError } = require('../errors');

const purchaseReceiptService = {
  async getPurchaseReceipts({ supplierId, employeeId, from, to, page, size }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.max(1, Math.min(100, parseInt(size, 10) || 10));
    return purchaseReceiptRepository.findAll({
      supplierId: supplierId ? parseInt(supplierId, 10) : null,
      employeeId: employeeId ? parseInt(employeeId, 10) : null,
      fromDate: from || null,
      toDate: to || null,
      page: pageNum,
      size: sizeNum,
    });
  },

  async getPurchaseReceiptById(id) {
    const receipt = await purchaseReceiptRepository.findById(id);
    if (!receipt) {
      throw new NotFoundError(`Không tìm thấy phiếu nhập kho #${id}`);
    }
    return receipt;
  },

  async createPurchaseReceipt(data, userContext) {
    validateCreatePurchaseReceipt(data);

    // 1. Verify supplier
    const supplier = await supplierRepository.findById(data.supplierId);
    if (!supplier) {
      throw new BadRequestError(`Nhà cung cấp #${data.supplierId} không tồn tại`);
    }

    // 2. Identify employeeId from user context or body
    let employeeId = data.employeeId || userContext?.employeeId;
    if (!employeeId) {
      // If userContext has employeeId
      if (userContext?.userId) {
        // Fallback: look up employee from user
        const emp = await employeeRepository.findById(userContext.userId);
        if (emp) employeeId = emp.employeeId;
      }
    }

    if (!employeeId) {
      // Default to 1 (Admin/first employee) if none specified for flexibility
      employeeId = 1;
    }

    // 3. Verify each variant exists
    for (const line of data.items) {
      const v = await productRepository.findVariantById(line.variantId);
      if (!v) {
        throw new BadRequestError(`Biến thể #${line.variantId} không tồn tại`);
      }
    }

    const receiptId = await purchaseReceiptRepository.create(
      {
        employeeId: parseInt(employeeId, 10),
        supplierId: parseInt(data.supplierId, 10),
        items: data.items,
      },
      userContext?.userId || null
    );

    return purchaseReceiptRepository.findById(receiptId);
  },

  async deletePurchaseReceipt(id, actorUserId = null) {
    const receipt = await purchaseReceiptRepository.findById(id);
    if (!receipt) {
      throw new NotFoundError(`Không tìm thấy phiếu nhập kho #${id}`);
    }

    return purchaseReceiptRepository.softDelete(id, actorUserId);
  },
};

module.exports = purchaseReceiptService;
