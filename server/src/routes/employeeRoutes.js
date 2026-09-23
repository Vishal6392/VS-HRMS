import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  adminResetEmployeePassword,
} from '../controllers/employeeController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);

// Admin only actions
router.post('/', requireRole('admin'), createEmployee);
router.put('/:id', requireRole('admin'), updateEmployee);
router.patch('/:id/toggle-status', requireRole('admin'), toggleEmployeeStatus);
router.post('/:id/reset-password', requireRole('admin'), adminResetEmployeePassword);

export default router;
