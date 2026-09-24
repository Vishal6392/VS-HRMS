import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { logAudit } from '../services/auditService.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'vs_hrms_jwt_secret_production_key_2026_987654321', {
    expiresIn: '7d',
  });
};

export const login = async (req, res) => {
  try {
    const { email, password, identifier } = req.body;
    const loginQuery = (identifier || email || '').trim();

    if (!loginQuery || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email/employee ID and password.' });
    }

    // Try finding by Email first
    let user = await User.findOne({ email: loginQuery.toLowerCase() }).populate({
      path: 'employee',
      populate: { path: 'assignedShift' },
    });

    // If not found by email, try finding Employee by employeeId
    if (!user) {
      const emp = await Employee.findOne({ employeeId: loginQuery.toUpperCase() });
      if (emp && emp.user) {
        user = await User.findById(emp.user).populate({
          path: 'employee',
          populate: { path: 'assignedShift' },
        });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/employee ID or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is currently deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/employee ID or password.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    if (user.role === 'admin') {
      await logAudit({
        req,
        performedBy: user._id,
        performedByName: user.employee ? user.employee.fullName : user.email,
        action: 'ADMIN_LOGIN',
        details: `Admin logged in from IP: ${req.ip || 'unknown'}`,
      });
    }

    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const isSuper = user.isSuperAdmin === true || (user.role === 'admin' && user.email.toLowerCase() === superAdminEmail);
    const fullName = isSuper
      ? (process.env.SUPERADMIN_NAME || user.name || 'Super Admin')
      : (user.name || (user.employee ? user.employee.fullName : user.email));

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isSuperAdmin: isSuper,
        adminType: isSuper ? 'superadmin' : (user.adminType === 'superadmin' ? 'superadmin' : (user.role === 'admin' ? 'admin' : null)),
        fullName,
        employee: user.employee,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyForgotPassword = async (req, res) => {
  try {
    const { identifier, mobile } = req.body;
    const cleanId = (identifier || '').trim();
    const cleanMobile = (mobile || '').replace(/\D/g, '');

    if (!cleanId) {
      return res.status(400).json({ success: false, message: 'Please provide Email or Employee ID.' });
    }

    let user = await User.findOne({ email: cleanId.toLowerCase() }).populate('employee');
    if (!user) {
      const emp = await Employee.findOne({ employeeId: cleanId.toUpperCase() }).populate('assignedShift');
      if (emp && emp.user) {
        user = await User.findById(emp.user).populate('employee');
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered account found with this Email or Employee ID.' });
    }

    // SuperAdmin credentials cannot be reset from public UI
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin credentials cannot be reset from this form. Please update SUPERADMIN_PASSWORD in Render Environment Variables.',
      });
    }

    const emp = user.employee;
    if (emp && cleanMobile) {
      const empMobileDigits = (emp.mobile || '').replace(/\D/g, '');
      if (empMobileDigits && !empMobileDigits.endsWith(cleanMobile.slice(-4)) && !empMobileDigits.includes(cleanMobile)) {
        return res.status(400).json({ success: false, message: 'Mobile number does not match registered employee records.' });
      }
    }

    res.json({
      success: true,
      message: 'Identity verified successfully.',
      user: {
        fullName: emp ? emp.fullName : user.email,
        employeeId: emp ? emp.employeeId : 'ADMIN',
        email: user.email,
        department: emp ? emp.department : 'Administration',
        mobileMasked: emp?.mobile ? emp.mobile.slice(0, 4) + '••••' + emp.mobile.slice(-4) : 'Verified',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetForgotPassword = async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;
    const cleanId = (identifier || '').trim();

    if (!cleanId || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide identifier and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    let user = await User.findOne({ email: cleanId.toLowerCase() });
    if (!user) {
      const emp = await Employee.findOne({ employeeId: cleanId.toUpperCase() });
      if (emp && emp.user) {
        user = await User.findById(emp.user);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // SuperAdmin is protected from public UI reset
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin credentials are securely managed via Render Environment Variables (SUPERADMIN_PASSWORD). Direct reset from website UI is disabled for security.',
      });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      req,
      performedBy: user._id,
      performedByName: user.email,
      action: 'PASSWORD_RESET',
      details: `Password reset via self-service verification for ${user.email}`,
    });

    res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: { path: 'assignedShift' },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const isSuper = user.isSuperAdmin === true || (user.role === 'admin' && user.email.toLowerCase() === superAdminEmail);
    const fullName = isSuper
      ? (process.env.SUPERADMIN_NAME || user.name || 'Super Admin')
      : (user.name || (user.employee ? user.employee.fullName : user.email));

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isSuperAdmin: isSuper,
        adminType: isSuper ? 'superadmin' : (user.adminType === 'superadmin' ? 'superadmin' : (user.role === 'admin' ? 'admin' : null)),
        fullName,
        employee: user.employee,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const isSuper = req.user.isSuperAdmin === true || (req.user.role === 'admin' && req.user.email.toLowerCase() === superAdminEmail);

    if (isSuper) {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin password is managed directly via Render Environment Variables (SUPERADMIN_PASSWORD).',
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
