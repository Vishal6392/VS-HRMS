import express from 'express';
import {
  getDailyReport,
  getMonthlyReport,
  getLateReport,
  getBreakReport,
  getOvertimeReport,
  getMissingPunchReport,
  getLocationAuditReport,
  getMonthlyAttendanceRegister,
  getMonthlySalarySummary,
  getSalaryPolicy,
  updateSalaryPolicy,
  getAttendanceAdjustments,
  createAttendanceAdjustment,
  deleteAttendanceAdjustment,
  getMonthLockStatus,
  finalizeMonth,
} from '../controllers/reportController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

// Existing standard reports
router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/late', getLateReport);
router.get('/breaks', getBreakReport);
router.get('/overtime', getOvertimeReport);
router.get('/missing-punch', getMissingPunchReport);
router.get('/location', getLocationAuditReport);

// New HR Salary-Ready Reports
router.get('/monthly-register', getMonthlyAttendanceRegister);
router.get('/salary-summary', getMonthlySalarySummary);

// Salary Policy Configuration
router.get('/policy', getSalaryPolicy);
router.put('/policy', updateSalaryPolicy);

// Attendance Adjustments
router.get('/adjustments', getAttendanceAdjustments);
router.post('/adjustments', createAttendanceAdjustment);
router.delete('/adjustments/:id', deleteAttendanceAdjustment);

// Month Lock / Finalization & Exceptions
router.get('/month-lock', getMonthLockStatus);
router.post('/month-lock', finalizeMonth);

export default router;
