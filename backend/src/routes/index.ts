import { Router } from 'express';
import addressRoutes from './address.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import { brandsRouter, categoriesRouter, colorsRouter, sizesRouter } from './catalog.routes';
import customerRoutes from './customer.routes';
import employeeRoutes from './employee.routes';
import inventoryRoutes from './inventory.routes';
import meRoutes from './me.routes';
import orderRoutes, { myOrdersRouter, posRouter } from './order.routes';
import { productRouter, variantRouter } from './product.routes';
import receiptRoutes from './receipt.routes';
import reportRoutes from './report.routes';
import supplierRoutes from './supplier.routes';
import uploadRoutes from './upload.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me/addresses', addressRoutes); // phải đứng trước /me
router.use('/me/orders', myOrdersRouter); // phải đứng trước /me
router.use('/me', meRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/employees', employeeRoutes);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/sizes', sizesRouter);
router.use('/colors', colorsRouter);
router.use('/products', productRouter);
router.use('/variants', variantRouter);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-receipts', receiptRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/pos', posRouter);
router.use('/uploads', uploadRoutes);

export default router;
