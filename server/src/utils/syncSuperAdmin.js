import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import AttendanceSummary from '../models/AttendanceSummary.js';

/**
 * Synchronizes SuperAdmin credentials directly from Environment Variables (Render)
 * and ensures SuperAdmin is NOT treated as an employee in the system.
 */
export const syncSuperAdminFromEnv = async () => {
  try {
    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase().trim();
    const adminPassword = process.env.SUPERADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.SUPERADMIN_NAME || 'Super Admin';

    console.log(`🔐 Verifying SuperAdmin credentials from environment for: ${adminEmail}`);

    // 1. Remove any legacy ADM001 / admin employee records from Employee collection
    const deletedAdminEmps = await Employee.deleteMany({
      $or: [{ employeeId: 'ADM001' }, { email: adminEmail }],
    });
    if (deletedAdminEmps.deletedCount > 0) {
      console.log(`ℹ️ Removed ${deletedAdminEmps.deletedCount} legacy admin employee record(s). SuperAdmin is purely an administrator.`);
    }

    // Also clean any dummy attendance records for ADM001
    await AttendanceEvent.deleteMany({ employeeId: 'ADM001' });
    await AttendanceSummary.deleteMany({ employeeId: 'ADM001' });

    // 2. Find or create the SuperAdmin User
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.findOne({ isSuperAdmin: true });
    }

    if (!adminUser) {
      adminUser = new User({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        name: adminName,
        isSuperAdmin: true,
        adminType: 'superadmin',
        employee: null,
        isActive: true,
      });
      await adminUser.save();
      console.log(`✅ SuperAdmin account created from environment variables (${adminEmail}).`);
    } else {
      // Synchronize email and password from environment variables
      adminUser.email = adminEmail;
      adminUser.role = 'admin';
      adminUser.name = adminName;
      adminUser.isSuperAdmin = true;
      adminUser.adminType = 'superadmin';
      adminUser.employee = null;
      adminUser.isActive = true;

      // Check if password in env has changed or needs update
      const isSamePassword = await adminUser.comparePassword(adminPassword);
      if (!isSamePassword) {
        adminUser.password = adminPassword; // pre('save') hook will hash it with bcrypt
        console.log('🔄 SuperAdmin password updated to match environment variable (Render).');
      }

      await adminUser.save();
      console.log(`✅ SuperAdmin account synced with environment variables (${adminEmail}).`);
    }

    return adminUser;
  } catch (error) {
    console.error('❌ Error synchronizing SuperAdmin from environment:', error.message);
  }
};
