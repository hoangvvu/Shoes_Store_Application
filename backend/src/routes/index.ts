import { Router } from 'express';
import addressRoutes from './address.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import customerRoutes from './customer.routes';
import favoriteRoutes from './favorite.routes';
import invoiceRoutes from './invoice.routes';
import meRoutes from './me.routes';
import orderRoutes, { myOrdersRouter, posRouter } from './order.routes';
import reviewRoutes, { productReviewsRouter, repliesRouter } from './review.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me/addresses', addressRoutes); // phải đứng trước /me
router.use('/me/orders', myOrdersRouter); // phải đứng trước /me
router.use('/me/favorites', favoriteRoutes); // phải đứng trước /me
router.use('/me', meRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/pos', posRouter);
router.use('/products/:productId/reviews', productReviewsRouter); // M14; router sản phẩm (M4) mount riêng tại /products
router.use('/reviews', reviewRoutes);
router.use('/replies', repliesRouter);
export default router;
