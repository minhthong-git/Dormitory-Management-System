import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStatistics,
  exportInvoiceExcel,
  exportInvoicePDF,
  generateMonthlyInvoice,
  updatePaymentStatus,
} from '@/controllers/invoice.controller';
import {
  validateCreateInvoice,
  validateUpdateInvoice,
  validateInvoiceQueries,
} from '@/middleware/validateInvoice';

const router = Router();

// GET /api/invoices/statistics — ADMIN only
router.get('/statistics', verifyJWT, requireRoles('ADMIN'), getInvoiceStatistics);

// GET /api/invoices/export/excel — ADMIN only
router.get('/export/excel', verifyJWT, requireRoles('ADMIN'), exportInvoiceExcel);

// GET /api/invoices/export/pdf — All authenticated (controller checks ownership)
router.get('/export/pdf', verifyJWT, exportInvoicePDF);

// POST /api/invoices/generate — ADMIN/STAFF
router.post('/generate', verifyJWT, requireRoles('ADMIN', 'STAFF'), generateMonthlyInvoice);

// PATCH /api/invoices/:id/payment — All authenticated (Student can self-pay)
router.patch('/:id/payment', verifyJWT, updatePaymentStatus);

// GET /api/invoices — All authenticated (Student gets their own)
router.get('/', verifyJWT, validateInvoiceQueries, getInvoices);

// GET /api/invoices/:id — All authenticated (Student gets their own)
router.get('/:id', verifyJWT, getInvoiceById);

// POST /api/invoices — ADMIN/STAFF
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), validateCreateInvoice, createInvoice);

// PUT /api/invoices/:id — ADMIN/STAFF
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), validateUpdateInvoice, updateInvoice);

// DELETE /api/invoices/:id — ADMIN only
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), deleteInvoice);

export default router;
