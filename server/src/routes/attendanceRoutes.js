import express from 'express';
import {
  punchAttendance,
  getTodayAttendance,
  getMyAttendanceHistory,
  getAllAttendance,
  getAttendanceDetail,
  adjustAttendance,
} from '../controllers/attendanceController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Employee attendance actions
router.post('/punch', punchAttendance);
router.get('/today', getTodayAttendance);
router.get('/my-history', getMyAttendanceHistory);

// Admin attendance actions
router.get('/all', requireRole('admin'), getAllAttendance);
router.get('/detail/:id', getAttendanceDetail); // Available to admin or owner
router.put('/adjust/:id', requireRole('admin'), adjustAttendance);

export default router;
