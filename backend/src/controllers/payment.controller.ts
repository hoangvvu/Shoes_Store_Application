import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

// helper nhỏ
const pid = (req: Request) => Number(req.params.id);

export const paymentController = {
  // ─── Payment Methods ─────────────────────────────────────────────────────────

  /** GET /payment-methods – khách/nhân viên lấy ds hình thức đang bật */
  async listMethods(req: Request, res: Response) {
    const onlyActive = req.query.all !== '1';
    res.json(await paymentService.listMethods(onlyActive));
  },

  /** POST /payment-methods – Admin tạo mới */
  async createMethod(req: Request, res: Response) {
    res.status(201).json(await paymentService.createMethod(req.body));
  },

  /** PATCH /payment-methods/:id/active – Admin bật/tắt */
  async setMethodActive(req: Request, res: Response) {
    res.json(await paymentService.setMethodActive(pid(req), req.body.isActive));
  },

  /** DELETE /payment-methods/:id – Admin xóa mềm */
  async deleteMethod(req: Request, res: Response) {
    await paymentService.deleteMethod(pid(req));
    res.status(204).end();
  },

  // ─── Payments ────────────────────────────────────────────────────────────────

  /** GET /orders/:id/payment – xem trạng thái thanh toán của đơn */
  async getPaymentStatus(req: Request, res: Response) {
    res.json(await paymentService.getPaymentStatus(req.user!, pid(req)));
  },

  /** POST /payments/:id/confirm-cash – NV xác nhận đã thu tiền mặt */
  async confirmCash(req: Request, res: Response) {
    res.json(await paymentService.confirmCash(req.user!, pid(req)));
  },

  /** POST /payments/:id/proof – khách tải ảnh chứng từ */
  async uploadProof(req: Request, res: Response) {
    res.json(await paymentService.uploadProof(req.user!, pid(req), req.body.proofUrl));
  },

  /** POST /payments/:id/review – NV đối soát chứng từ */
  async reviewProof(req: Request, res: Response) {
    res.json(await paymentService.reviewProof(req.user!, pid(req), req.body.status, req.body.note ?? ''));
  },

  /** POST /orders/:id/pay – khách thanh toán lại sau khi FAILED */
  async retryPay(req: Request, res: Response) {
    res.status(201).json(await paymentService.retryPay(req.user!, pid(req), req.body.methodCode));
  },

  // ─── Webhooks ────────────────────────────────────────────────────────────────

  /** POST /webhooks/momo – IPN từ MoMo (sandbox) */
  async webhookMomo(req: Request, res: Response) {
    const { orderId, transId, amount, resultCode } = req.body;
    if (resultCode !== 0) {
      // Không thành công → trả 204 để cổng không retry, nhưng không cập nhật DB
      return res.sendStatus(204);
    }
    await paymentService.handleWebhook(Number(orderId), String(transId), Number(amount));
    res.sendStatus(204);
  },

  /** POST /webhooks/bank – Webhook ngân hàng/QR */
  async webhookBank(req: Request, res: Response) {
    const { paymentId, transactionCode, amount, resultCode } = req.body;
    if (resultCode !== 0) return res.sendStatus(204);
    await paymentService.handleWebhook(Number(paymentId), String(transactionCode), Number(amount));
    res.sendStatus(204);
  },

  // ─── Refunds ─────────────────────────────────────────────────────────────────

  /** POST /refunds – NV/Admin tạo yêu cầu hoàn tiền */
  async createRefund(req: Request, res: Response) {
    const { paymentId, amount, reason } = req.body;
    res.status(201).json(await paymentService.createRefund(req.user!, paymentId, amount, reason));
  },

  /** PATCH /refunds/:id/complete – NV/Admin xác nhận đã hoàn xong */
  async completeRefund(req: Request, res: Response) {
    res.json(await paymentService.completeRefund(req.user!, pid(req), req.body.transactionCode));
  },

  /** PATCH /refunds/:id/reject – Admin từ chối hoàn tiền */
  async rejectRefund(req: Request, res: Response) {
    res.json(await paymentService.rejectRefund(req.user!, pid(req), req.body.reason));
  },
};
