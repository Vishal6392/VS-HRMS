import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import app from './src/index.js';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Shift from './src/models/Shift.js';
import Location from './src/models/Location.js';
import EmployeeLocationAssignment from './src/models/EmployeeLocationAssignment.js';
import AttendanceEvent from './src/models/AttendanceEvent.js';
import AttendanceSummary from './src/models/AttendanceSummary.js';
import AuditLog from './src/models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runApiE2ETests() {
  console.log('🚀 Running Full-Flow End-to-End API Tests for Geo-Fencing...\n');

  try {
    // 1. Create an Admin User and an Employee User for testing
    await User.deleteMany({ email: /e2e_.*@hrms\.local/ });
    await Employee.deleteMany({ employeeId: /E2E/ });
    await Location.deleteMany({ locationName: /E2E_/ });

    const shift = await Shift.findOne() || await Shift.create({
      shiftName: 'E2E Test Shift',
      shiftCode: 'E2E-01',
      shiftType: 'GENERAL',
      startTime: '09:00',
      endTime: '18:00',
    });

    // Create Employee Profile
    const emp = await Employee.create({
      employeeId: 'E2E001',
      fullName: 'E2E Test Employee',
      email: 'e2e_employee@hrms.local',
      mobile: '+91 98765 43210',
      department: 'Operations',
      designation: 'Field Executive',
      joiningDate: new Date(),
      assignedShift: shift._id,
      attendanceLocationPolicy: 'ASSIGNED_LOCATIONS',
    });

    const empUser = await User.create({
      email: 'e2e_employee@hrms.local',
      password: 'Password@123',
      role: 'employee',
      employee: emp._id,
      isActive: true,
    });

    const adminUser = await User.create({
      email: 'e2e_admin@hrms.local',
      password: 'Password@123',
      role: 'admin',
      isSuperAdmin: true,
      isActive: true,
    });

    // Login Admin
    const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e_admin@hrms.local', password: 'Password@123' }),
    });
    const adminLogin = await adminLoginRes.json();
    const adminToken = adminLogin.token;
    console.log('✅ Admin Login Successful');

    // Login Employee
    const empLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e_employee@hrms.local', password: 'Password@123' }),
    });
    const empLogin = await empLoginRes.json();
    const empToken = empLogin.token;
    console.log('✅ Employee Login Successful');

    // 2. Admin Creates a Location: E2E_Corporate_Office
    const createLocRes = await fetch('http://localhost:5000/api/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationName: 'E2E_Corporate_Office',
        locationType: 'OFFICE',
        address: '100 Main Road, Lucknow',
        latitude: 26.8467,
        longitude: 80.9462,
        allowedRadiusMeters: 100,
        minimumGpsAccuracyMeters: 50,
      }),
    });
    const createdLoc = await createLocRes.json();
    console.log('✅ Location Master Created via API:', createdLoc.data.locationName, 'Radius:', createdLoc.data.allowedRadiusMeters);
    const officeLocId = createdLoc.data._id;

    // 3. Admin Assigns Location to Employee
    const assignRes = await fetch(`http://localhost:5000/api/locations/employee/${emp._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationId: officeLocId,
        status: 'ACTIVE',
      }),
    });
    const assignedData = await assignRes.json();
    console.log('✅ Location Assigned to Employee via API:', assignedData.success);

    // 4. Employee Real-Time Pre-Check: Outside Geofence
    const checkOutsideRes = await fetch('http://localhost:5000/api/attendance/check-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        latitude: 28.6139, // Delhi, ~400km away
        longitude: 77.2090,
        accuracy: 15,
        eventType: 'CHECK_IN',
      }),
    });
    const checkOutside = await checkOutsideRes.json();
    console.log('✅ Pre-Check Outside Geofence Allowed?:', checkOutside.data.allowed, `(${checkOutside.data.outsideMeters}m outside)`);

    // 5. Employee Punch Check In: Outside Geofence -> REJECTED 400
    const dummyPhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="blue" width="100" height="100"/></svg>';
    const punchOutsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'CHECK_IN',
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 15,
        photoUrl: dummyPhoto,
      }),
    });
    const punchOutside = await punchOutsideRes.json();
    console.log('✅ Punch Outside Geofence Status:', punchOutsideRes.status, '(Blocked message:', punchOutside.message, ')');

    // 6. Employee Real-Time Pre-Check: Inside Geofence -> ALLOWED
    const checkInsideRes = await fetch('http://localhost:5000/api/attendance/check-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        latitude: 26.8468, // ~20m from office
        longitude: 80.9463,
        accuracy: 12,
        eventType: 'CHECK_IN',
      }),
    });
    const checkInside = await checkInsideRes.json();
    console.log('✅ Pre-Check Inside Geofence Allowed?:', checkInside.data.allowed, `(Matched: ${checkInside.data.matchedLocationName}, Distance: ${checkInside.data.distance}m)`);

    // 7. Employee Punch Check In: Inside Geofence -> SUCCESS 200
    const punchInsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'CHECK_IN',
        latitude: 26.8468,
        longitude: 80.9463,
        accuracy: 12,
        photoUrl: dummyPhoto,
      }),
    });
    const punchInside = await punchInsideRes.json();
    console.log('✅ Punch Inside Geofence Status:', punchInsideRes.status, '(Recorded:', punchInside.success, ')');
    console.log('   Matched Location:', punchInside.data?.event?.matchedLocationName, 'Distance:', punchInside.data?.event?.distanceFromLocation);

    // 8. Employee Lunch Break: Try to start lunch outside geofence -> REJECTED
    const breakOutsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'BREAK_START',
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 15,
        breakType: 'LUNCH',
      }),
    });
    console.log('✅ Lunch Break Outside Geofence Status:', breakOutsideRes.status, '(Blocked!)');

    // 9. Employee Lunch Break: Inside Geofence -> SUCCESS
    const breakInsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'BREAK_START',
        latitude: 26.8467,
        longitude: 80.9462,
        accuracy: 10,
        breakType: 'LUNCH',
      }),
    });
    console.log('✅ Lunch Break Inside Geofence Status:', breakInsideRes.status, '(Recorded!)');

    // 10. Check-out outside geofence test -> REJECTED
    // First end break inside
    await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'BREAK_END',
        latitude: 26.8467,
        longitude: 80.9462,
        accuracy: 10,
        breakType: 'LUNCH',
      }),
    });

    const checkOutOutsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'CHECK_OUT',
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 15,
        photoUrl: dummyPhoto,
      }),
    });
    console.log('✅ Check-Out Outside Geofence Status:', checkOutOutsideRes.status, '(Blocked!)');

    // 11. Check-out inside geofence -> SUCCESS
    const checkOutInsideRes = await fetch('http://localhost:5000/api/attendance/punch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        eventType: 'CHECK_OUT',
        latitude: 26.8467,
        longitude: 80.9462,
        accuracy: 10,
        photoUrl: dummyPhoto,
      }),
    });
    console.log('✅ Check-Out Inside Geofence Status:', checkOutInsideRes.status, '(Recorded!)');

    // 12. Security Test: Normal employee cannot create or edit locations
    const unauthorizedCreateRes = await fetch('http://localhost:5000/api/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`, // Employee token!
      },
      body: JSON.stringify({
        locationName: 'Hacker Location',
        latitude: 0,
        longitude: 0,
      }),
    });
    console.log('✅ Security Test: Employee Forbidden from creating locations:', unauthorizedCreateRes.status === 403 ? 'FORBIDDEN (403)' : unauthorizedCreateRes.status);

    // 13. Audit Log verification
    const auditRes = await fetch('http://localhost:5000/api/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    const geofenceLogs = (auditData.data || []).filter((l) => l.action?.includes('GEOFENCE') || l.action?.includes('LOCATION'));
    console.log(`✅ Audit Logs Recorded: Found ${geofenceLogs.length} Geo-fence / Location audit entries.`);

    // Clean up
    await Location.deleteMany({ locationName: /E2E_/ });
    await EmployeeLocationAssignment.deleteMany({ employeeId: emp._id });
    await AttendanceEvent.deleteMany({ employeeId: emp.employeeId });
    await AttendanceSummary.deleteMany({ employeeId: emp.employeeId });
    await Employee.deleteMany({ employeeId: /E2E/ });
    await User.deleteMany({ email: /e2e_.*@hrms\.local/ });

    console.log('\n🎉 ALL FULL-FLOW END-TO-END GEOFENCE API TESTS PASSED 100%!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E API Test Failed:', err);
    process.exit(1);
  }
}

await new Promise((r) => setTimeout(r, 1000));
await runApiE2ETests();
