import express from 'express';
import {
  getRosters,
  getMonthlyGrid,
  createOrUpdateRoster,
  bulkCreateRoster,
  copyWeekRoster,
  createCompOff,
  deleteRoster,
  getMyRoster,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getWeeklyOffRules,
  updateWeeklyOffRule,
  updateEmployeeWeeklyOff,
} from '../controllers/rosterController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Employee read-only upcoming roster & today schedule
router.get('/my-roster', getMyRoster);

// Admin Roster Queries & Grid
router.get('/', getRosters);
router.get('/monthly-grid', getMonthlyGrid);

// Admin Roster Modifications
router.post('/', requireRole('admin'), createOrUpdateRoster);
router.post('/bulk', requireRole('admin'), bulkCreateRoster);
router.post('/copy-week', requireRole('admin'), copyWeekRoster);
router.post('/comp-off', requireRole('admin'), createCompOff);
router.delete('/:id', requireRole('admin'), deleteRoster);

// Holiday Master
router.get('/holidays', getHolidays);
router.post('/holidays', requireRole('admin'), createHoliday);
router.put('/holidays/:id', requireRole('admin'), updateHoliday);
router.delete('/holidays/:id', requireRole('admin'), deleteHoliday);

// Weekly Off Configuration
router.get('/weekly-off-rules', getWeeklyOffRules);
router.post('/weekly-off-rules', requireRole('admin'), updateWeeklyOffRule);
router.patch('/employee/:employeeId/weekly-off', requireRole('admin'), updateEmployeeWeeklyOff);

export default router;
