import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No access token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vs_hrms_jwt_secret_production_key_2026_987654321');
    const user = await User.findById(decoded.id).populate('employee');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact HR.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] role(s).`,
      });
    }
    next();
  };
};

export const requireSuperAdmin = (req, res, next) => {
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
  const isSuper =
    req.user?.isSuperAdmin === true ||
    (req.user?.role === 'admin' && req.user?.email?.toLowerCase() === superAdminEmail);

  if (!isSuper) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Access restricted to Super Admin only. Admins cannot access this resource.',
    });
  }
  next();
};

