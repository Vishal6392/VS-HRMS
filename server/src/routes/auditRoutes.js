import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireSuperAdmin);

router.get('/', getAuditLogs);

export default router;
