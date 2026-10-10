import { Router } from 'express';
import authRoutes from './auth.routes';
import meRoutes from './me.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/me', meRoutes); // M2 sẽ mount thêm /me/addresses tại đây
router.use('/users', userRoutes);
export default router;
