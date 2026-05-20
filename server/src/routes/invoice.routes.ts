import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { getInvoices, createInvoice, markAsPaid, batchCreateInvoices } from '@/controllers/invoice.controller';

const router = Router();

// GET    /api/invoices           — STUDENT xem của mình, ADMIN/STAFF xem tất cả
router.get('/', verifyJWT, getInvoices);

// POST   /api/invoices           — ADMIN/STAFF only
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createInvoice);

// POST   /api/invoices/batch     — ADMIN only (tạo hàng loạt)
router.post('/batch', verifyJWT, requireRoles('ADMIN'), batchCreateInvoices);

// PATCH  /api/invoices/:id/pay   — authenticated (SV tự pay hoặc ADMIN mark)
router.patch('/:id/pay', verifyJWT, markAsPaid);

export default router;
