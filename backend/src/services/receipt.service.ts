import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { productRepository } from '../repositories/product.repository';
import { receiptRepository } from '../repositories/receipt.repository';
import { supplierRepository } from '../repositories/supplier.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';
import type {
  CreateReceiptInput,
  ReceiptListQuery,
} from '../validators/inventory.validator';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy phiếu nhập', 'RECEIPT_NOT_FOUND');

export const receiptService = {
  async list(q: ReceiptListQuery) {
    const { rows, total } = await receiptRepository.list({
      from: q.from,
      to: q.to,
      supplierId: q.supplierId,
      status: q.status,
      page: q.page,
      size: q.size,
    });
    return toPaged(
      rows.map((r) => ({
        ...r,
        receiptDate: r.receiptDate.toISOString(),
      })),
      total,
      q.page,
      q.size,
    );
  },

  async getDetail(id: number) {
    const receipt = await receiptRepository.findById(id);
    if (!receipt) throw NOT_FOUND();

    const lines = await receiptRepository.findLinesByReceiptId(id);
    return {
      ...receipt,
      receiptDate: receipt.receiptDate.toISOString(),
      lines,
    };
  },

  async create(actor: AuthUser, input: CreateReceiptInput) {
    const supplier = await supplierRepository.findById(input.supplierId);
    if (!supplier) throw AppError.notFound('Không tìm thấy nhà cung cấp', 'SUPPLIER_NOT_FOUND');

    // Xác định employeeId của người thực hiện
    let employeeId: number | null | undefined = actor.employeeId;
    if (!employeeId) {
      const user = await userRepository.findActiveById(actor.userId);
      employeeId = user?.employeeId;
    }
    if (!employeeId) {
      throw AppError.badRequest('Tài khoản thực hiện chưa liên kết với hồ sơ nhân viên', 'NO_EMPLOYEE_PROFILE');
    }

    // Gộp dòng nếu trùng variantId
    const mergedLines = new Map<number, { variantId: number; quantity: number; importPrice: number }>();
    for (const line of input.lines) {
      const existing = mergedLines.get(line.variantId);
      if (existing) {
        existing.quantity += line.quantity;
        existing.importPrice = line.importPrice; // dùng giá mới nhất
      } else {
        mergedLines.set(line.variantId, { ...line });
      }
    }

    // Kiểm tra các biến thể tồn tại
    for (const [variantId] of mergedLines) {
      const variant = await productRepository.findVariantById(variantId);
      if (!variant) {
        throw AppError.badRequest(`Biến thể #${variantId} không tồn tại`, 'VARIANT_NOT_FOUND');
      }
    }

    const receiptId = await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);

      const rId = await receiptRepository.insertReceipt(
        { supplierId: input.supplierId, employeeId: employeeId! },
        tx,
      );

      for (const line of mergedLines.values()) {
        await receiptRepository.insertReceiptLine(
          {
            receiptId: rId,
            variantId: line.variantId,
            quantity: line.quantity,
            importPrice: line.importPrice,
          },
          tx,
        );
      }

      return rId;
    });

    return this.getDetail(receiptId);
  },

  async remove(actor: AuthUser, id: number, reason?: string) {
    const receipt = await receiptRepository.findById(id);
    if (!receipt) throw NOT_FOUND();
    if (receipt.isDeleted) throw AppError.conflict('Phiếu nhập đã bị xóa trước đó', 'RECEIPT_ALREADY_DELETED');

    try {
      await withTransaction(async (tx) => {
        await setActor(tx, actor.userId);
        await receiptRepository.softDelete(id, tx);
        await receiptRepository.recordCancelAudit(
          id,
          actor.userId,
          reason?.trim() || 'Hủy phiếu nhập kho',
          tx,
        );
      });
    } catch (err: unknown) {
      const e = err as { number?: number; message?: string };
      if (e?.number === 51011 || (e?.message ?? '').includes('Không đủ tồn kho')) {
        throw AppError.conflict(
          'Không thể xóa phiếu nhập vì hàng trong kho đã được bán hoặc xuất, không đủ tồn để hoàn tác',
          'INSUFFICIENT_STOCK_FOR_REVERSAL',
        );
      }
      throw err;
    }
  },
};
