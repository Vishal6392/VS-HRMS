import express from 'express';
import {
  getAdminUsers,
  createSubAdmin,
  toggleSubAdminStatus,
  resetSubAdminPassword,
  deleteSubAdmin,
} from '../controllers/adminUserController.js';
import { protect, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes here strictly require authentication and Super Admin privileges
router.use(protect);
router.use(requireSuperAdmin);

router.get('/', getAdminUsers);
router.post('/', createSubAdmin);
router.put('/:id/status', toggleSubAdminStatus);
router.put('/:id/password', resetSubAdminPassword);
router.delete('/:id', deleteSubAdmin);

export default router;
