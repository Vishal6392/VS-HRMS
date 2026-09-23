import express from 'express';
import {
  getDailyReport,
  getMonthlyReport,
  getLateReport,
  getBreakReport,
  getOvertimeReport,
  getMissingPunchReport,
} from '../controllers/reportController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/late', getLateReport);
router.get('/breaks', getBreakReport);
router.get('/overtime', getOvertimeReport);
router.get('/missing-punch', getMissingPunchReport);

export default router;
