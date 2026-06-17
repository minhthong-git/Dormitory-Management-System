import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import {
  getReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
  calculateUtility,
} from '@/controllers/utility.controller';
import {
  validateCreateUtility,
  validateUpdateUtility,
  validateCalculateUtility,
  validateUtilityQueries,
} from '@/middleware/validateUtility';

const router = Router();

// GET /api/utilities — All authenticated (Student gets their own)
router.get('/', verifyJWT, validateUtilityQueries, getReadings);

// GET /api/utilities/:id — All authenticated
router.get('/:id', verifyJWT, getReadingById);

// POST /api/utilities — ADMIN/STAFF
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), validateCreateUtility, createReading);

// PUT /api/utilities/:id — ADMIN/STAFF
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), validateUpdateUtility, updateReading);

// DELETE /api/utilities/:id — ADMIN only
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), deleteReading);

// POST /api/utilities/calculate — ADMIN/STAFF
router.post('/calculate', verifyJWT, requireRoles('ADMIN', 'STAFF'), validateCalculateUtility, calculateUtility);

export default router;
