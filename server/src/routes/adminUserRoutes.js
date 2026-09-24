import express from 'express';
import {
  getAdminUsers,
  createAdminUser,
  toggleAdminStatus,
  resetAdminPassword,
  deleteAdminUser,
} from '../controllers/adminUserController.js';
import { protect, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes here strictly require authentication and Super Admin privileges
router.use(protect);
router.use(requireSuperAdmin);

router.get('/', getAdminUsers);
router.post('/', createAdminUser);
router.put('/:id/status', toggleAdminStatus);
router.put('/:id/password', resetAdminPassword);
router.delete('/:id', deleteAdminUser);

export default router;
