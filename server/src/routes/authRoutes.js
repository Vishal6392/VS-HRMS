import express from 'express';
import {
  login,
  getMe,
  changePassword,
  verifyForgotPassword,
  resetForgotPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password/verify', verifyForgotPassword);
router.post('/forgot-password/reset', resetForgotPassword);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

export default router;
