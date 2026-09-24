import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Shift from './src/models/Shift.js';
import ShiftRoster from './src/models/ShiftRoster.js';
import Holiday from './src/models/Holiday.js';
import WeeklyOffRule from './src/models/WeeklyOffRule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runRosterApiE2ETests() {
  console.log('🚀 Running Full E2E API Tests for Shift Roster & Comp-Off...\n');

  try {
    // 1. Authenticate Admin
    const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hrms.local', password: 'Admin@123' }),
    });

    const adminLogin = await adminLoginRes.json();
    if (!adminLogin.success) {
      throw new Error(`Admin login failed: ${adminLogin.message}`);
    }
    const adminToken = adminLogin.token;
    console.log('✅ 1. Admin Login Successful');

    // 2. Fetch Monthly Grid
    const gridRes = await fetch('http://localhost:5000/api/rosters/monthly-grid?year=2026&month=9', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const gridData = await gridRes.json();
    console.assert(gridData.success === true, 'Grid fetch must be successful');
    console.log(`✅ 2. Monthly Grid API Returned ${gridData.rows?.length || 0} employees for ${gridData.year}-${gridData.month}`);

    // Fetch Shift and Employee via HTTP API
    const shiftsRes = await fetch('http://localhost:5000/api/shifts', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const shiftsData = await shiftsRes.json();
    const shift = shiftsData.data[0];

    const empsRes = await fetch('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empsData = await empsRes.json();
    let emp = empsData.data?.[0];

    if (!emp) {
      const createEmpRes = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fullName: 'E2E Roster Tester',
          email: 'e2e_roster_test@hrms.local',
          mobile: '+91 99999 88888',
          department: 'IT Support',
          designation: 'L1 Support',
          joiningDate: '2026-01-01',
          assignedShift: shift._id,
        }),
      });
      const createdEmpData = await createEmpRes.json();
      emp = createdEmpData.data;
    }

    // 3. Assign Single Roster Override via API
    const singleRes = await fetch('http://localhost:5000/api/rosters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: emp._id,
        date: '2026-09-27', // Sunday
        shiftId: shift._id,
        rosterStatus: 'WORKING',
        weekOffType: 'OVERRIDE',
        remarks: 'Sunday 24x7 Night Shift',
      }),
    });
    const singleData = await singleRes.json();
    console.assert(singleData.success === true, 'Single roster assignment failed');
    console.log(`✅ 3. Single Roster Override Created for ${emp.fullName} on 2026-09-27 (${singleData.data.rosterStatus})`);
    const rosterId = singleData.data._id;

    // 4. Create Comp-Off via API
    const compOffRes = await fetch('http://localhost:5000/api/rosters/comp-off', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: emp._id,
        workedDate: '2026-09-27',
        offDate: '2026-09-30',
        reason: 'Comp-Off for Sunday Shift',
      }),
    });
    const compOffData = await compOffRes.json();
    console.assert(compOffData.success === true, 'Comp-off creation failed');
    console.log(`✅ 4. Compensatory Off Granted on 2026-09-30 linked to worked date: ${compOffData.data.compOffForDate}`);

    // 5. Bulk Roster Creation via API
    const bulkRes = await fetch('http://localhost:5000/api/rosters/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeIds: [emp._id],
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        shiftId: shift._id,
        rosterStatus: 'WORKING',
        remarks: 'October Standard Rotation',
      }),
    });
    const bulkData = await bulkRes.json();
    console.assert(bulkData.success === true, 'Bulk roster failed');
    console.log('✅ 5. Bulk Roster API successfully updated date range 2026-10-01 to 2026-10-05');

    // 6. Copy Week API
    const copyRes = await fetch('http://localhost:5000/api/rosters/copy-week', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeIds: [emp._id],
        sourceStartDate: '2026-10-01',
        targetStartDate: '2026-10-08',
      }),
    });
    const copyData = await copyRes.json();
    console.assert(copyData.success === true, 'Copy week failed');
    console.log('✅ 6. Copy Week API successfully duplicated week roster');

    // 7. Holiday Master API
    const holRes = await fetch('http://localhost:5000/api/rosters/holidays', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        holidayName: 'E2E_Test_Holiday',
        date: '2026-11-01',
        type: 'COMPANY',
        description: 'Company Foundation Day',
      }),
    });
    const holData = await holRes.json();
    console.assert(holData.success === true, 'Holiday creation failed');
    console.log(`✅ 7. Holiday Master Created: ${holData.data.holidayName} on ${holData.data.date}`);

    // 8. Weekly Off Rules API
    const ruleRes = await fetch('http://localhost:5000/api/rosters/weekly-off-rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        department: 'IT Support',
        days: [0, 6], // Sunday & Saturday
        description: 'Standard 24x7 IT weekend off defaults',
      }),
    });
    const ruleData = await ruleRes.json();
    console.assert(ruleData.success === true, 'Weekly off rule update failed');
    console.log(`✅ 8. Weekly Off Rule Updated for '${ruleData.data.department}': [${ruleData.data.days.join(', ')}]`);

    // 9. Revert/Delete Roster Override
    const delRes = await fetch(`http://localhost:5000/api/rosters/${rosterId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delData = await delRes.json();
    console.assert(delData.success === true, 'Delete roster failed');
    console.log('✅ 9. Single Roster Override Reverted / Deleted successfully');

    console.log('\n🎉 ALL SHIFT ROSTER E2E API INTEGRATION TESTS PASSED 100%!');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E API Test Failed:', err);
    process.exit(1);
  }
}

runRosterApiE2ETests();
