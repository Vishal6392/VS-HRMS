import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/', getAuditLogs);

export default router;
