import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import AuditLog from '../models/AuditLog.js';
import { calculateAttendanceSummary } from '../services/attendanceEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting HRMS seed routine...');

    // Clear existing collections
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Shift.deleteMany({});
    await AttendanceEvent.deleteMany({});
    await AttendanceSummary.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('🧹 Cleared existing data.');

    // 1. Create Shift Masters
    const generalShift = await Shift.create({
      shiftName: 'General Day Shift',
      shiftCode: 'GEN-01',
      shiftType: 'GENERAL',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMinutes: 15,
      minWorkingHours: 8,
      breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 60 },
      description: 'Standard 9-hour corporate working schedule with 1-hour lunch break.',
    });

    const nightShift = await Shift.create({
      shiftName: 'Night Operations Shift',
      shiftCode: 'NGT-01',
      shiftType: 'NIGHT',
      startTime: '22:00',
      endTime: '06:00',
      gracePeriodMinutes: 15,
      minWorkingHours: 7.5,
      breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 45 },
      description: 'Overnight shift crossing midnight (10:00 PM to 06:00 AM next day).',
    });

    const splitShift = await Shift.create({
      shiftName: 'Hospitality Split Shift',
      shiftCode: 'SPL-01',
      shiftType: 'SPLIT',
      startTime: '06:00',
      endTime: '22:00',
      gracePeriodMinutes: 15,
      minWorkingHours: 8,
      breakPolicy: { allowedBreaks: 2, maxBreakMinutes: 30 },
      splitSegments: [
        { segmentName: 'Morning Service', startTime: '06:00', endTime: '10:00' },
        { segmentName: 'Evening Service', startTime: '18:00', endTime: '22:00' },
      ],
      description: 'Split schedule with two distinct duty segments in a single calendar day.',
    });

    console.log('✅ Created Shift Masters: General, Night, Split.');

    // 2. Create SuperAdmin
    const adminUser = await User.create({
      email: 'admin@hrms.local',
      password: 'Admin@123',
      role: 'admin',
      isActive: true,
    });

    const adminEmployee = await Employee.create({
      employeeId: 'ADM001',
      fullName: 'Vikram Singh (HR Lead)',
      mobile: '+91 98765 00001',
      email: 'admin@hrms.local',
      department: 'Human Resources',
      designation: 'Head of People Operations',
      joiningDate: new Date('2022-01-15'),
      reportingManager: 'Executive Management',
      assignedShift: generalShift._id,
      employmentStatus: 'ACTIVE',
      user: adminUser._id,
    });

    adminUser.employee = adminEmployee._id;
    await adminUser.save();

    console.log('✅ Created SuperAdmin: admin@hrms.local / Admin@123');

    // 3. Create Sample Employees
    const empData = [
      {
        employeeId: 'EMP101',
        fullName: 'John Doe',
        mobile: '+91 98765 11001',
        email: 'john@hrms.local',
        department: 'Engineering',
        designation: 'Senior Frontend Engineer',
        joiningDate: new Date('2023-03-01'),
        reportingManager: 'Vikram Singh',
        assignedShift: generalShift._id,
        password: 'Emp@123',
      },
      {
        employeeId: 'EMP102',
        fullName: 'Priya Sharma',
        mobile: '+91 98765 11002',
        email: 'priya@hrms.local',
        department: 'Operations',
        designation: 'Night Operations Lead',
        joiningDate: new Date('2023-05-15'),
        reportingManager: 'Vikram Singh',
        assignedShift: nightShift._id,
        password: 'Emp@123',
      },
      {
        employeeId: 'EMP103',
        fullName: 'Rahul Verma',
        mobile: '+91 98765 11003',
        email: 'rahul@hrms.local',
        department: 'Logistics',
        designation: 'Fleet Supervisor',
        joiningDate: new Date('2023-08-10'),
        reportingManager: 'Vikram Singh',
        assignedShift: splitShift._id,
        password: 'Emp@123',
      },
      {
        employeeId: 'EMP104',
        fullName: 'Anita Desai',
        mobile: '+91 98765 11004',
        email: 'anita@hrms.local',
        department: 'Quality Assurance',
        designation: 'QA Analyst',
        joiningDate: new Date('2024-01-20'),
        reportingManager: 'John Doe',
        assignedShift: generalShift._id,
        password: 'Emp@123',
      },
      {
        employeeId: 'EMP105',
        fullName: 'Sameer Khan',
        mobile: '+91 98765 11005',
        email: 'sameer@hrms.local',
        department: 'Engineering',
        designation: 'Backend Developer',
        joiningDate: new Date('2024-02-01'),
        reportingManager: 'John Doe',
        assignedShift: generalShift._id,
        password: 'Emp@123',
      },
    ];

    const createdEmployees = [];

    for (const data of empData) {
      const user = await User.create({
        email: data.email,
        password: data.password,
        role: 'employee',
        isActive: true,
      });

      const emp = await Employee.create({
        employeeId: data.employeeId,
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email,
        department: data.department,
        designation: data.designation,
        joiningDate: data.joiningDate,
        reportingManager: data.reportingManager,
        assignedShift: data.assignedShift,
        employmentStatus: 'ACTIVE',
        user: user._id,
      });

      user.employee = emp._id;
      await user.save();
      createdEmployees.push(emp);
    }

    console.log(`✅ Created ${createdEmployees.length} standard employees.`);

    // 4. Seed Attendance Events for Today and Yesterday so Reports & KPIs have instant data
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // Dummy photo preview (compact SVG data URL representation)
    const samplePhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%232563eb"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><path d="M40 180 C40 130 160 130 160 180 Z" fill="%23ffffff"/></svg>';

    // A) John Doe: Completed day yesterday
    const johnEventsYesterday = [
      await AttendanceEvent.create({
        employee: createdEmployees[0]._id,
        employeeId: createdEmployees[0].employeeId,
        attendanceDate: yesterday,
        eventType: 'CHECK_IN',
        timestamp: new Date(`${yesterday}T09:28:00+05:30`),
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 12,
        photoUrl: samplePhoto,
      }),
      await AttendanceEvent.create({
        employee: createdEmployees[0]._id,
        employeeId: createdEmployees[0].employeeId,
        attendanceDate: yesterday,
        eventType: 'BREAK_START',
        timestamp: new Date(`${yesterday}T13:15:00+05:30`),
        latitude: 28.6140,
        longitude: 77.2092,
        accuracy: 14,
        photoUrl: samplePhoto,
      }),
      await AttendanceEvent.create({
        employee: createdEmployees[0]._id,
        employeeId: createdEmployees[0].employeeId,
        attendanceDate: yesterday,
        eventType: 'BREAK_END',
        timestamp: new Date(`${yesterday}T13:45:00+05:30`),
        latitude: 28.6141,
        longitude: 77.2089,
        accuracy: 15,
        photoUrl: samplePhoto,
      }),
      await AttendanceEvent.create({
        employee: createdEmployees[0]._id,
        employeeId: createdEmployees[0].employeeId,
        attendanceDate: yesterday,
        eventType: 'CHECK_OUT',
        timestamp: new Date(`${yesterday}T18:35:00+05:30`),
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 11,
        photoUrl: samplePhoto,
      }),
    ];

    const johnSummaryYesterday = calculateAttendanceSummary(johnEventsYesterday, generalShift, yesterday);
    await AttendanceSummary.create({
      employee: createdEmployees[0]._id,
      employeeId: createdEmployees[0].employeeId,
      attendanceDate: yesterday,
      shift: generalShift._id,
      events: johnEventsYesterday.map((e) => e._id),
      ...johnSummaryYesterday,
    });

    // B) Anita Desai: Late Check-in Today
    const anitaEventsToday = [
      await AttendanceEvent.create({
        employee: createdEmployees[3]._id,
        employeeId: createdEmployees[3].employeeId,
        attendanceDate: today,
        eventType: 'CHECK_IN',
        timestamp: new Date(`${today}T09:52:00+05:30`), // Late by 22 mins
        latitude: 28.6138,
        longitude: 77.2091,
        accuracy: 16,
        photoUrl: samplePhoto,
      }),
    ];
    const anitaSummaryToday = calculateAttendanceSummary(anitaEventsToday, generalShift, today);
    await AttendanceSummary.create({
      employee: createdEmployees[3]._id,
      employeeId: createdEmployees[3].employeeId,
      attendanceDate: today,
      shift: generalShift._id,
      events: anitaEventsToday.map((e) => e._id),
      ...anitaSummaryToday,
    });

    // C) Sameer Khan: Checked in & currently on lunch break today
    const sameerEventsToday = [
      await AttendanceEvent.create({
        employee: createdEmployees[4]._id,
        employeeId: createdEmployees[4].employeeId,
        attendanceDate: today,
        eventType: 'CHECK_IN',
        timestamp: new Date(`${today}T09:25:00+05:30`),
        latitude: 28.6142,
        longitude: 77.2088,
        accuracy: 9,
        photoUrl: samplePhoto,
      }),
      await AttendanceEvent.create({
        employee: createdEmployees[4]._id,
        employeeId: createdEmployees[4].employeeId,
        attendanceDate: today,
        eventType: 'BREAK_START',
        timestamp: new Date(`${today}T13:00:00+05:30`),
        latitude: 28.6140,
        longitude: 77.2089,
        accuracy: 11,
        photoUrl: samplePhoto,
      }),
    ];
    const sameerSummaryToday = calculateAttendanceSummary(sameerEventsToday, generalShift, today);
    await AttendanceSummary.create({
      employee: createdEmployees[4]._id,
      employeeId: createdEmployees[4].employeeId,
      attendanceDate: today,
      shift: generalShift._id,
      events: sameerEventsToday.map((e) => e._id),
      ...sameerSummaryToday,
    });

    // 5. Seed initial Audit Logs
    await AuditLog.create({
      performedBy: adminUser._id,
      performedByName: 'Vikram Singh (HR Lead)',
      action: 'SYSTEM_INITIALIZED',
      targetRecord: { model: 'System', id: '1', identifier: 'Base HRMS Setup' },
      details: 'Base shifts and organization master configuration initialized.',
      createdAt: new Date(),
    });

    console.log('🎉 Database seeded successfully with demo users, shifts, and attendance!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// If run directly via node
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await closeDB();
    process.exit(0);
  })();
}
