import { Router } from 'express';
import addressRoutes from './address.routes';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import meRoutes from './me.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me/addresses', addressRoutes); // phải đứng trước /me
router.use('/me', meRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
export default router;
