import User from '../models/User.js';
import { logAudit } from '../services/auditService.js';

/**
 * Get all Admin users (Super Admin and Sub-Admins)
 * Restricted to Super Admin only
 */
export const getAdminUsers = async (req, res) => {
  try {
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    const formatted = admins.map((user) => {
      const isSuper =
        user.isSuperAdmin === true || user.email.toLowerCase() === superAdminEmail;
      return {
        _id: user._id,
        email: user.email,
        name: isSuper ? (process.env.SUPERADMIN_NAME || user.name || 'Super Admin') : (user.name || 'Sub-Admin'),
        role: user.role,
        isSuperAdmin: isSuper,
        adminType: isSuper ? 'superadmin' : (user.adminType || 'subadmin'),
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      };
    });

    // Ensure SuperAdmin is at the top of the list
    formatted.sort((a, b) => (b.isSuperAdmin ? 1 : 0) - (a.isSuperAdmin ? 1 : 0));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new Sub-Admin user
 * Restricted to Super Admin only
 */
export const createSubAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password for Sub-Admin.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user with email '${cleanEmail}' already exists.`,
      });
    }

    const newSubAdmin = new User({
      email: cleanEmail,
      password,
      role: 'admin',
      name: name.trim(),
      isSuperAdmin: false,
      adminType: 'subadmin',
      employee: null,
      isActive: true,
    });

    await newSubAdmin.save();

    await logAudit({
      req,
      action: 'CREATE_SUBADMIN',
      targetModel: 'User',
      targetId: newSubAdmin._id,
      targetIdentifier: cleanEmail,
      details: `Super Admin created Sub-Admin: ${name.trim()} (${cleanEmail})`,
      afterValue: {
        email: cleanEmail,
        name: name.trim(),
        role: 'admin',
        adminType: 'subadmin',
      },
    });

    res.status(201).json({
      success: true,
      message: `Sub-Admin '${name.trim()}' created successfully.`,
      data: {
        _id: newSubAdmin._id,
        email: newSubAdmin.email,
        name: newSubAdmin.name,
        role: newSubAdmin.role,
        isSuperAdmin: false,
        adminType: 'subadmin',
        isActive: newSubAdmin.isActive,
        createdAt: newSubAdmin.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle Sub-Admin active / inactive status
 * Restricted to Super Admin only
 */
export const toggleSubAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    if (
      targetUser.isSuperAdmin === true ||
      targetUser.email.toLowerCase() === superAdminEmail
    ) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin account cannot be deactivated.',
      });
    }

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    await logAudit({
      req,
      action: 'UPDATE_SUBADMIN_STATUS',
      targetModel: 'User',
      targetId: targetUser._id,
      targetIdentifier: targetUser.email,
      details: `Sub-Admin ${targetUser.email} status changed to ${targetUser.isActive ? 'Active' : 'Inactive'}`,
      afterValue: { isActive: targetUser.isActive },
    });

    res.json({
      success: true,
      message: `Admin '${targetUser.name || targetUser.email}' is now ${targetUser.isActive ? 'Active' : 'Inactive'}.`,
      data: {
        _id: targetUser._id,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset Sub-Admin password by Super Admin
 * Restricted to Super Admin only
 */
export const resetSubAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    if (
      targetUser.isSuperAdmin === true ||
      targetUser.email.toLowerCase() === superAdminEmail
    ) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin password cannot be reset here. Update SUPERADMIN_PASSWORD in Render.',
      });
    }

    targetUser.password = newPassword;
    await targetUser.save();

    await logAudit({
      req,
      action: 'RESET_SUBADMIN_PASSWORD',
      targetModel: 'User',
      targetId: targetUser._id,
      targetIdentifier: targetUser.email,
      details: `Super Admin reset password for Sub-Admin: ${targetUser.email}`,
    });

    res.json({
      success: true,
      message: `Password reset successfully for Sub-Admin '${targetUser.name || targetUser.email}'.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a Sub-Admin
 * Restricted to Super Admin only
 */
export const deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    if (
      targetUser.isSuperAdmin === true ||
      targetUser.email.toLowerCase() === superAdminEmail
    ) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin account cannot be deleted.',
      });
    }

    await User.findByIdAndDelete(id);

    await logAudit({
      req,
      action: 'DELETE_SUBADMIN',
      targetModel: 'User',
      targetId: id,
      targetIdentifier: targetUser.email,
      details: `Super Admin deleted Sub-Admin account: ${targetUser.email}`,
    });

    res.json({
      success: true,
      message: `Sub-Admin '${targetUser.name || targetUser.email}' deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
