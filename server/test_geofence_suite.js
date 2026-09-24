import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB, closeDB } from './src/config/db.js';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Shift from './src/models/Shift.js';
import Location from './src/models/Location.js';
import EmployeeLocationAssignment from './src/models/EmployeeLocationAssignment.js';
import AttendanceEvent from './src/models/AttendanceEvent.js';
import AttendanceSummary from './src/models/AttendanceSummary.js';
import { calculateDistanceInMeters, validateEmployeeGeofence } from './src/utils/geofence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runGeofenceTestSuite = async () => {
  console.log('🧪 Starting Comprehensive Geo-Fencing System Test Suite...\n');

  await connectDB();

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, testName, details = '') => {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    }
  };

  try {
    // -------------------------------------------------------------
    // Unit Test: Haversine Distance Formula Accuracy
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Haversine Distance Utility ---');
    // Lucknow Hazratganj: 26.8467, 80.9462
    // Approx 100m north: 26.8476, 80.9462
    const d100 = calculateDistanceInMeters(26.8467, 80.9462, 26.8476, 80.9462);
    assert(d100 >= 95 && d100 <= 105, '100m Coordinate Shift Calculation', `Distance was ${d100}m`);

    // Same coordinates = 0m
    const dZero = calculateDistanceInMeters(26.8467, 80.9462, 26.8467, 80.9462);
    assert(dZero === 0, 'Identical Coordinates Yield 0 Meters', `Distance was ${dZero}m`);

    // -------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------
    console.log('\n--- 2. Setting up Test Fixtures (Locations & Employees) ---');

    // Clean any prior test fixtures
    await Location.deleteMany({ locationName: /^TEST_/ });
    await Employee.deleteMany({ employeeId: /^TST/ });
    await User.deleteMany({ email: /^test_/ });

    const shift = await Shift.findOne() || await Shift.create({
      shiftName: 'Test General Shift',
      shiftCode: 'TST-01',
      shiftType: 'GENERAL',
      startTime: '09:00',
      endTime: '18:00',
    });

    // 1. Office Location (Radius 100m, Accuracy 50m)
    const testOffice = await Location.create({
      locationName: 'TEST_Lucknow_HQ',
      locationType: 'OFFICE',
      address: 'Hazratganj, Lucknow',
      latitude: 26.846700,
      longitude: 80.946200,
      allowedRadiusMeters: 100,
      minimumGpsAccuracyMeters: 50,
      status: 'ACTIVE',
    });

    // 2. WFH Location (Radius 150m, Accuracy 50m)
    const testWfh = await Location.create({
      locationName: 'TEST_Home_A',
      locationType: 'WFH',
      address: 'Gomti Nagar, Lucknow',
      latitude: 26.855000,
      longitude: 80.980000,
      allowedRadiusMeters: 150,
      minimumGpsAccuracyMeters: 50,
      status: 'ACTIVE',
    });

    // 3. Client Hotel Site (Radius 300m, Accuracy 60m)
    const testClientSite = await Location.create({
      locationName: 'TEST_Client_Hotel_ABC',
      locationType: 'CLIENT_SITE',
      address: 'Vipin Khand, Lucknow',
      latitude: 26.865000,
      longitude: 80.990000,
      allowedRadiusMeters: 300,
      minimumGpsAccuracyMeters: 60,
      status: 'ACTIVE',
    });

    // Employee 1: Standard Multi-location Employee
    const emp1 = await Employee.create({
      employeeId: 'TST001',
      fullName: 'Test Rahul Sharma',
      email: 'test_rahul@hrms.local',
      mobile: '+91 99999 11111',
      department: 'Engineering',
      designation: 'Staff Engineer',
      joiningDate: new Date(),
      assignedShift: shift._id,
      attendanceLocationPolicy: 'ASSIGNED_LOCATIONS',
    });

    // Assign Office and WFH to Employee 1
    await EmployeeLocationAssignment.create({
      employeeId: emp1._id,
      locationId: testOffice._id,
      status: 'ACTIVE',
    });
    await EmployeeLocationAssignment.create({
      employeeId: emp1._id,
      locationId: testWfh._id,
      status: 'ACTIVE',
    });

    console.log('✅ Fixtures created: 3 locations, 1 multi-location employee.');

    // -------------------------------------------------------------
    // TEST 1: Inside Office Radius -> ALLOW
    // -------------------------------------------------------------
    console.log('\n--- 3. Running Geo-Fence Tests ---');
    // ~40m from office center
    const res1 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.846900,
      longitude: 80.946400,
      accuracy: 15,
    });
    assert(
      res1.allowed === true && res1.matchedLocation?.locationName === 'TEST_Lucknow_HQ',
      'TEST 1: Employee Inside Office Radius -> ALLOW',
      `Result: ${JSON.stringify(res1)}`
    );

    // -------------------------------------------------------------
    // TEST 2: Outside Office Radius -> BLOCK
    // -------------------------------------------------------------
    // ~250m from office center (neither near office nor home)
    const res2 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.849200,
      longitude: 80.946200,
      accuracy: 15,
    });
    assert(
      res2.allowed === false && res2.reason === 'OUTSIDE_GEOFENCE' && res2.outsideMeters > 0,
      'TEST 2: Employee Outside Office Radius -> BLOCK',
      `Result: ${JSON.stringify(res2)}`
    );

    // -------------------------------------------------------------
    // TEST 3: Inside WFH Radius -> ALLOW
    // -------------------------------------------------------------
    // ~50m from WFH center
    const res3 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.855300,
      longitude: 80.980200,
      accuracy: 20,
    });
    assert(
      res3.allowed === true && res3.matchedLocation?.locationName === 'TEST_Home_A',
      'TEST 3: Employee Inside WFH Radius -> ALLOW',
      `Result: ${JSON.stringify(res3)}`
    );

    // -------------------------------------------------------------
    // TEST 4: Outside WFH Radius -> BLOCK
    // -------------------------------------------------------------
    // ~400m from WFH center
    const res4 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.858500,
      longitude: 80.980000,
      accuracy: 20,
    });
    assert(
      res4.allowed === false && res4.reason === 'OUTSIDE_GEOFENCE',
      'TEST 4: Employee Outside WFH Radius -> BLOCK',
      `Result: ${JSON.stringify(res4)}`
    );

    // -------------------------------------------------------------
    // TEST 5: Multiple Locations Matching -> Chooses Closest
    // -------------------------------------------------------------
    // Point closer to Office than WFH
    const res5 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.846720,
      longitude: 80.946220,
      accuracy: 10,
    });
    assert(
      res5.allowed === true && res5.matchedLocation?.locationName === 'TEST_Lucknow_HQ' && res5.distance < 15,
      'TEST 5: Multi-Location Evaluation Selects Closest Valid Location',
      `Matched: ${res5.matchedLocation?.locationName}, Distance: ${res5.distance}m`
    );

    // -------------------------------------------------------------
    // TEST 6: Outside ALL Assigned Locations -> BLOCK with nearest info
    // -------------------------------------------------------------
    // Random far point (e.g. Delhi coords)
    const res6 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 15,
    });
    assert(
      res6.allowed === false && res6.reason === 'OUTSIDE_GEOFENCE' && res6.nearestLocation !== null && res6.distance > 400000,
      'TEST 6: Employee Outside All Assigned Locations -> BLOCK with nearest location and distance',
      `Result: ${JSON.stringify(res6)}`
    );

    // -------------------------------------------------------------
    // TEST 7: Temporary Field Assignment Valid Today -> ALLOW
    // -------------------------------------------------------------
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const tomorrow = new Date(Date.now() + 86400000);

    const tempAsg = await EmployeeLocationAssignment.create({
      employeeId: emp1._id,
      locationId: testClientSite._id,
      validFrom: yesterday,
      validTill: tomorrow,
      status: 'ACTIVE',
    });

    const res7 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.865200,
      longitude: 80.990200,
      accuracy: 25,
      punchDate: today,
    });
    assert(
      res7.allowed === true && res7.matchedLocation?.locationName === 'TEST_Client_Hotel_ABC',
      'TEST 7: Temporary Field Assignment Valid Today -> ALLOW',
      `Result: ${JSON.stringify(res7)}`
    );

    // -------------------------------------------------------------
    // TEST 8: Temporary Field Assignment Expired -> BLOCK
    // -------------------------------------------------------------
    // Set assignment validity to expired (past date)
    tempAsg.validFrom = new Date(Date.now() - 3 * 86400000);
    tempAsg.validTill = new Date(Date.now() - 86400000);
    await tempAsg.save();

    const res8 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.865200,
      longitude: 80.990200,
      accuracy: 25,
      punchDate: today,
    });
    assert(
      res8.allowed === false && res8.matchedLocation?.locationName !== 'TEST_Client_Hotel_ABC',
      'TEST 8: Expired Temporary Assignment is Automatically Disallowed',
      `Result: ${JSON.stringify(res8)}`
    );

    // -------------------------------------------------------------
    // TEST 9: Poor GPS Accuracy Warning / Blocking
    // -------------------------------------------------------------
    // Inside office radius (center), but device GPS accuracy is 120m (exceeds office 50m threshold)
    const res9 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.846700,
      longitude: 80.946200,
      accuracy: 120, // Poor accuracy
    });
    assert(
      res9.allowed === false && res9.reason === 'POOR_GPS_ACCURACY' && res9.currentAccuracy === 120,
      'TEST 9: Poor GPS Accuracy Beyond Allowed Threshold -> BLOCKED',
      `Result: ${JSON.stringify(res9)}`
    );

    // -------------------------------------------------------------
    // TEST 10: Policy OFFICE_ONLY Restricts WFH
    // -------------------------------------------------------------
    emp1.attendanceLocationPolicy = 'OFFICE_ONLY';
    await emp1.save();

    // At WFH location, inside WFH radius
    const res10 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.855000,
      longitude: 80.980000,
      accuracy: 15,
    });
    assert(
      res10.allowed === false && res10.reason === 'OUTSIDE_GEOFENCE' && res10.nearestLocation?.locationName === 'TEST_Lucknow_HQ',
      'TEST 10: OFFICE_ONLY Policy Restricts WFH Location Even Inside WFH Radius',
      `Result: ${JSON.stringify(res10)}`
    );

    // -------------------------------------------------------------
    // TEST 11: Policy ANYWHERE Bypasses Geofence
    // -------------------------------------------------------------
    emp1.attendanceLocationPolicy = 'ANYWHERE';
    await emp1.save();

    const res11 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 19.0760, // Mumbai coords, far away
      longitude: 72.8777,
      accuracy: 30,
    });
    assert(
      res11.allowed === true && res11.geofenceStatus === 'EXEMPT',
      'TEST 11: ANYWHERE Policy Bypasses Geofence Restriction with EXEMPT Status',
      `Result: ${JSON.stringify(res11)}`
    );

    // -------------------------------------------------------------
    // TEST 12: SuperAdmin as Employee
    // -------------------------------------------------------------
    emp1.attendanceLocationPolicy = 'ASSIGNED_LOCATIONS';
    await emp1.save();

    const superAdminUser = await User.create({
      email: 'test_superadmin_emp@hrms.local',
      password: 'Password@123',
      role: 'admin',
      isSuperAdmin: true,
      employee: emp1._id,
    });

    // Test that geofence evaluates accurately for SuperAdmin employee
    const res12 = await validateEmployeeGeofence({
      employee: emp1,
      latitude: 26.846700,
      longitude: 80.946200,
      accuracy: 15,
    });
    assert(
      res12.allowed === true && res12.matchedLocation?.locationName === 'TEST_Lucknow_HQ',
      'TEST 12: SuperAdmin Linked to Employee Profile Has Geo-Fence Evaluated Normally',
      `Result: ${JSON.stringify(res12)}`
    );

    // Clean up test fixtures
    await Location.deleteMany({ locationName: /^TEST_/ });
    await EmployeeLocationAssignment.deleteMany({ employeeId: emp1._id });
    await Employee.deleteMany({ employeeId: /^TST/ });
    await User.deleteMany({ email: /^test_/ });

    console.log(`\n🎉 Test Suite Completed: ${passedTests}/${totalTests} Tests Passed!`);

    await closeDB();

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    await closeDB();
    process.exit(1);
  }
};

runGeofenceTestSuite();
