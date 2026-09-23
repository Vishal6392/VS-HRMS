import express from 'express';
import {
  getShifts,
  getShiftById,
  createShift,
  updateShift,
  toggleShiftStatus,
} from '../controllers/shiftController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getShifts);
router.get('/:id', getShiftById);

// Admin only actions
router.post('/', requireRole('admin'), createShift);
router.put('/:id', requireRole('admin'), updateShift);
router.patch('/:id/toggle-status', requireRole('admin'), toggleShiftStatus);

export default router;
