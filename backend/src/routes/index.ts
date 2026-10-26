import { Router } from 'express';
import addressRoutes from './address.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import { brandsRouter, categoriesRouter, colorsRouter, sizesRouter } from './catalog.routes';
import customerRoutes from './customer.routes';
import employeeRoutes from './employee.routes';
import favoriteRoutes from './favorite.routes';
import invoiceRoutes from './invoice.routes';
import meRoutes from './me.routes';
import orderRoutes, { myOrdersRouter, posRouter } from './order.routes';
import {
  paymentMethodRouter,
  paymentsRouter,
  refundsRouter,
  webhookRouter,
} from './payment.routes';
import { productRouter, variantRouter } from './product.routes';
import receiptRoutes from './receipt.routes';
import reportRoutes from './report.routes';
import reviewRoutes, { productReviewsRouter, repliesRouter } from './review.routes';
import supplierRoutes from './supplier.routes';
import uploadRoutes from './upload.routes';
import userRoutes from './user.routes';
import inventoryRoutes from './inventory.routes';
import { adminNotificationRouter, customerNotificationRouter } from './notification.routes';
import { promotionsRouter, vouchersRouter } from './promotion.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me/notifications', customerNotificationRouter); // phải đứng trước /me
router.use('/me/addresses', addressRoutes); // phải đứng trước /me
router.use('/me/orders', myOrdersRouter);   // phải đứng trước /me
router.use('/me/favorites', favoriteRoutes); // phải đứng trước /me
router.use('/me', meRoutes);
router.use('/notifications', adminNotificationRouter);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/employees', employeeRoutes);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/sizes', sizesRouter);
router.use('/colors', colorsRouter);
router.use('/products/:productId/reviews', productReviewsRouter); // M14
router.use('/products', productRouter);
router.use('/variants', variantRouter);
router.use('/reviews', reviewRoutes);
router.use('/replies', repliesRouter);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-receipts', receiptRoutes);

router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/pos', posRouter);

// M11 – Khuyến mãi & Voucher
router.use('/promotions', promotionsRouter);
router.use('/vouchers', vouchersRouter);

// M9 – Thanh toán & Hoàn tiền
router.use('/payment-methods', paymentMethodRouter);
router.use('/payments', paymentsRouter);
router.use('/webhooks', webhookRouter);
router.use('/refunds', refundsRouter);
router.use('/uploads', uploadRoutes);

export default router;
