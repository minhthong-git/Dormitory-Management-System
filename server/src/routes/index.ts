import { Router } from 'express';
import authRoutes from './auth.routes';
import roomRoutes from './room.routes';
import contractRoutes from './contract.routes';
import invoiceRoutes from './invoice.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboard.routes';
import studentRoutes from './student.routes';
import bedRoutes from './bed.routes';

const router = Router();

// ── Mount all API routes ───────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/beds', bedRoutes);
router.use('/contracts', contractRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

export default router;
