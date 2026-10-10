const inventoryRepository = require('../repositories/inventory.repository');
const productRepository = require('../repositories/product.repository');
const { validateAdjustStock } = require('../validators/inventory.validator');
const { NotFoundError, BadRequestError } = require('../errors');

const inventoryService = {
  async getStockList(params) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const size = Math.max(1, Math.min(100, parseInt(params.size, 10) || 15));
    const threshold = params.threshold !== undefined ? parseInt(params.threshold, 10) : null;
    const lowStockOnly = params.lowStockOnly === 'true' || params.lowStockOnly === true;

    return inventoryRepository.getStockList({
      q: params.q ? params.q.trim() : null,
      categoryId: params.categoryId ? parseInt(params.categoryId, 10) : null,
      brandId: params.brandId ? parseInt(params.brandId, 10) : null,
      threshold,
      lowStockOnly,
      page,
      size,
    });
  },

  async getVariantLedger(variantId, params) {
    const variant = await productRepository.findVariantById(variantId);
    if (!variant) {
      throw new NotFoundError(`Không tìm thấy biến thể #${variantId}`);
    }

    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const size = Math.max(1, Math.min(100, parseInt(params.size, 10) || 20));

    return inventoryRepository.getVariantLedger(variantId, {
      from: params.from || null,
      to: params.to || null,
      page,
      size,
    });
  },

  async adjustStock(data, userId) {
    validateAdjustStock(data);

    const variantId = parseInt(data.variantId, 10);
    const quantityChange = parseInt(data.quantityChange, 10);
    const reason = data.reason.trim();

    const variant = await productRepository.findVariantById(variantId);
    if (!variant) {
      throw new NotFoundError(`Không tìm thấy biến thể #${variantId}`);
    }

    if (quantityChange < 0 && variant.stockQuantity + quantityChange < 0) {
      throw new BadRequestError(
        `Không thể giảm ${Math.abs(quantityChange)} sản phẩm vì tồn kho hiện tại chỉ còn ${variant.stockQuantity}`
      );
    }

    // Call stored procedure sp_adjust_stock
    return inventoryRepository.adjustStock(
      variantId,
      quantityChange,
      reason,
      userId || 1 // fallback to 1 (Admin) if testing without token
    );
  },

  async getLowStockVariants(threshold = 10) {
    const th = parseInt(threshold, 10) || 10;
    return inventoryRepository.getLowStockVariants(th);
  },

  async getInventoryMovementReport(from, to) {
    if (!from || !to) {
      // Default to last 30 days if not provided
      const now = new Date();
      to = to || now.toISOString();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      from = from || past.toISOString();
    }
    return inventoryRepository.getInventoryMovement(from, to);
  },
};

module.exports = inventoryService;
