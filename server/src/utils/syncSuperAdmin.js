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

    // 1. Check if an Employee profile is linked or exists for this SuperAdmin
    const existingAdminEmp = await Employee.findOne({
      $or: [{ email: adminEmail }, { employeeId: 'ADM001' }],
    });

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
        employee: existingAdminEmp ? existingAdminEmp._id : null,
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
      if (!adminUser.employee && existingAdminEmp) {
        adminUser.employee = existingAdminEmp._id;
      }
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
