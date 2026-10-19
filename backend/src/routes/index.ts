import { Router } from 'express';
import addressRoutes from './address.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import customerRoutes from './customer.routes';
import meRoutes from './me.routes';
import orderRoutes, { myOrdersRouter, posRouter } from './order.routes';
import {
  paymentMethodRouter,
  paymentsRouter,
  refundsRouter,
  webhookRouter,
} from './payment.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me/addresses', addressRoutes); // phải đứng trước /me
router.use('/me/orders', myOrdersRouter);   // phải đứng trước /me
router.use('/me', meRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/pos', posRouter);
// M9 – Thanh toán & Hoàn tiền
router.use('/payment-methods', paymentMethodRouter);
router.use('/payments', paymentsRouter);
router.use('/webhooks', webhookRouter);
router.use('/refunds', refundsRouter);
export default router;
