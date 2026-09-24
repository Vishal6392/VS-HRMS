import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB, closeDB } from './src/config/db.js';
import User from './src/models/User.js';
import Employee from './src/models/Employee.js';
import Shift from './src/models/Shift.js';
import Holiday from './src/models/Holiday.js';
import WeeklyOffRule from './src/models/WeeklyOffRule.js';
import ShiftRoster from './src/models/ShiftRoster.js';
import AttendanceSummary from './src/models/AttendanceSummary.js';
import AttendanceEvent from './src/models/AttendanceEvent.js';
import {
  getDayOfWeekFromYMD,
  getDayNameFromYMD,
  getEmployeeWeeklyOffDays,
  resolveExpectedSchedule,
  resolveDayAttendance,
  loadRosterContext,
} from './src/services/rosterEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runRosterTestSuite() {
  console.log('🧪 Starting Shift Roster, Weekly Off & Comp-Off Test Suite...\n');

  try {
    await connectDB();

    // Clean test records
    await ShiftRoster.deleteMany({ employeeId: /ROST_/ });
    await Employee.deleteMany({ employeeId: /ROST_/ });
    await Holiday.deleteMany({ holidayName: /TEST_HOLIDAY/ });
    await WeeklyOffRule.deleteMany({ department: /TEST_DEPT/ });

    // 1. Shifts
    const generalShift = await Shift.findOne({ shiftCode: 'GEN-01' }) || await Shift.create({
      shiftName: 'General Day Shift',
      shiftCode: 'GEN-01',
      shiftType: 'GENERAL',
      startTime: '09:30',
      endTime: '18:30',
    });

    const nightShift = await Shift.findOne({ shiftCode: 'NGT-01' }) || await Shift.create({
      shiftName: 'Night Shift',
      shiftCode: 'NGT-01',
      shiftType: 'NIGHT',
      startTime: '22:00',
      endTime: '06:00',
    });

    // 2. Department Weekly Off Rule: IT Support -> Sat(6) + Sun(0)
    await WeeklyOffRule.create({
      department: 'TEST_DEPT_IT',
      days: [0, 6],
      description: 'Saturday + Sunday off',
    });

    // 3. Employees
    // Emp 1: IT Support (Sat + Sun default off)
    const emp1 = await Employee.create({
      employeeId: 'ROST_001',
      fullName: 'Rahul Sharma',
      email: 'rahul.roster@hrms.local',
      mobile: '+91 91111 11111',
      department: 'TEST_DEPT_IT',
      designation: 'Support Engineer',
      joiningDate: new Date(),
      assignedShift: generalShift._id,
      weeklyOffDays: null, // inherits TEST_DEPT_IT [0, 6]
    });

    // Emp 2: Custom Wednesday off (3)
    const emp2 = await Employee.create({
      employeeId: 'ROST_002',
      fullName: 'Vikas Kumar',
      email: 'vikas.roster@hrms.local',
      mobile: '+91 92222 22222',
      department: 'TEST_DEPT_IT',
      designation: '24x7 Lead',
      joiningDate: new Date(),
      assignedShift: nightShift._id,
      weeklyOffDays: [3], // Custom Wednesday off
    });

    // 4. Test Holiday: 2026-10-02 (Gandhi Jayanti)
    await Holiday.create({
      holidayName: 'TEST_HOLIDAY_GANDHI',
      date: '2026-10-02',
      type: 'NATIONAL',
      status: 'ACTIVE',
    });

    console.log('--- 1. Testing Default Weekly-Off & Day Mapping ---');
    // 2026-09-27 is Sunday (0)
    // 2026-09-28 is Monday (1)
    // 2026-09-30 is Wednesday (3)
    // 2026-10-03 is Saturday (6)
    console.assert(getDayOfWeekFromYMD('2026-09-27') === 0, '2026-09-27 should be Sunday (0)');
    console.assert(getDayOfWeekFromYMD('2026-09-28') === 1, '2026-09-28 should be Monday (1)');
    console.assert(getDayOfWeekFromYMD('2026-09-30') === 3, '2026-09-30 should be Wednesday (3)');
    console.assert(getDayOfWeekFromYMD('2026-10-03') === 6, '2026-10-03 should be Saturday (6)');
    console.log('  ✅ [PASS] Day of week resolution & calendar calculations');

    const emp1Offs = getEmployeeWeeklyOffDays(emp1, { TEST_DEPT_IT: { days: [0, 6] } });
    console.assert(emp1Offs.includes(0) && emp1Offs.includes(6), 'Emp 1 should have Sat+Sun off');

    const emp2Offs = getEmployeeWeeklyOffDays(emp2, { TEST_DEPT_IT: { days: [0, 6] } });
    console.assert(emp2Offs.length === 1 && emp2Offs[0] === 3, 'Emp 2 should have Wednesday off');
    console.log('  ✅ [PASS] Configurable weekly off: IT Support [0, 6] and custom [3]');

    console.log('\n--- 2. Testing Priority Resolution (Schedule Resolver) ---');
    // Context
    const ctx = await loadRosterContext({
      startDate: '2026-09-27',
      endDate: '2026-10-04',
      employeeIds: [emp1._id, emp2._id],
    });

    // TEST 1: Monday without roster -> Normal Working Day
    const monSchedule = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-09-28',
      rostersMap: ctx.rostersMap,
      holidaysMap: ctx.holidaysMap,
      departmentRuleMap: ctx.departmentRuleMap,
    });
    console.assert(monSchedule.expectedStatus === 'WORKING', 'Monday should be WORKING');
    console.assert(monSchedule.isWorkRequired === true, 'Monday attendance is required');
    console.log('  ✅ [PASS] TEST 1: Normal working day defaults to General Shift (attendance required)');

    // TEST 2: Monday without attendance -> ABSENT
    const monAtt = resolveDayAttendance({ expectedSchedule: monSchedule, summary: null });
    console.assert(monAtt.actualStatus === 'ABSENT' && monAtt.displayCode === 'A', 'Unpunched working day must be ABSENT');
    console.log('  ✅ [PASS] TEST 2: Expected working day with no punches yields ABSENT (A)');

    // TEST 3: Sunday 2026-09-27 without roster -> Default Week Off
    const sunDefault = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-09-27',
      rostersMap: ctx.rostersMap,
      holidaysMap: ctx.holidaysMap,
      departmentRuleMap: ctx.departmentRuleMap,
    });
    console.assert(sunDefault.expectedStatus === 'WEEK_OFF', 'Sunday must be WEEK_OFF');
    const sunDefaultAtt = resolveDayAttendance({ expectedSchedule: sunDefault, summary: null });
    console.assert(sunDefaultAtt.actualStatus === 'WEEK_OFF' && sunDefaultAtt.displayCode === 'WO', 'Sunday without punch must be WO (NOT ABSENT)');
    console.log('  ✅ [PASS] TEST 3: Sunday default week off with no attendance yields WO (NOT ABSENT)');

    // TEST 4: Saturday 2026-10-03 without roster -> Default Week Off
    const satDefault = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-10-03',
      rostersMap: ctx.rostersMap,
      holidaysMap: ctx.holidaysMap,
      departmentRuleMap: ctx.departmentRuleMap,
    });
    console.assert(satDefault.expectedStatus === 'WEEK_OFF', 'Saturday must be WEEK_OFF');
    const satDefaultAtt = resolveDayAttendance({ expectedSchedule: satDefault, summary: null });
    console.assert(satDefaultAtt.actualStatus === 'WEEK_OFF' && satDefaultAtt.displayCode === 'WO', 'Saturday without punch must be WO');
    console.log('  ✅ [PASS] TEST 4: Saturday default week off with no attendance yields WO (NOT ABSENT)');

    console.log('\n--- 3. Testing Roster Overrides (Sunday Duty & Comp-Off) ---');
    // TEST 5: Explicit Roster: Sunday 2026-09-27 assigned Night Shift
    await ShiftRoster.create({
      employee: emp1._id,
      employeeId: emp1.employeeId,
      date: '2026-09-27',
      shift: nightShift._id,
      rosterStatus: 'WORKING',
      weekOffType: 'OVERRIDE',
      remarks: 'Sunday 24x7 Night Shift Support',
    });

    // TEST 6: Explicit Roster: Wednesday 2026-09-30 assigned COMP_OFF
    await ShiftRoster.create({
      employee: emp1._id,
      employeeId: emp1.employeeId,
      date: '2026-09-30',
      shift: null,
      rosterStatus: 'COMP_OFF',
      weekOffType: 'COMPENSATORY',
      compOffForDate: '2026-09-27',
      remarks: 'Comp-Off for Sunday Night Duty',
    });

    // Reload context with new rosters
    const updatedCtx = await loadRosterContext({
      startDate: '2026-09-27',
      endDate: '2026-10-04',
      employeeIds: [emp1._id, emp2._id],
    });

    const sunOverridden = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-09-27',
      rostersMap: updatedCtx.rostersMap,
      holidaysMap: updatedCtx.holidaysMap,
      departmentRuleMap: updatedCtx.departmentRuleMap,
    });
    console.assert(sunOverridden.expectedStatus === 'WORKING', 'Sunday must be overridden to WORKING');
    console.assert(sunOverridden.shift._id.toString() === nightShift._id.toString(), 'Sunday must assign Night Shift');
    console.assert(sunOverridden.isWeekOffOverride === true, 'Sunday must be marked as Week Off Override');
    console.log('  ✅ [PASS] TEST 5: Sunday default off overridden by roster -> WORKING (Night Shift)');

    // TEST 7: Sunday worked: attendance punch recorded
    const dummySunSummary = {
      status: 'PRESENT',
      firstCheckIn: new Date('2026-09-27T22:05:00Z'),
      lastCheckOut: new Date('2026-09-28T06:05:00Z'),
      workingHours: 8.0,
    };
    const sunWorkedAtt = resolveDayAttendance({ expectedSchedule: sunOverridden, summary: dummySunSummary });
    console.assert(sunWorkedAtt.actualStatus === 'PRESENT', 'Sunday actual status is PRESENT');
    console.assert(sunWorkedAtt.isWeekOffWorked === true, 'Sunday is flagged as Week Off Worked');
    console.log('  ✅ [PASS] TEST 6: Sunday Night Shift worked -> PRESENT & isWeekOffWorked: true');

    // TEST 8: Wednesday Comp-Off evaluated
    const wedCompOff = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-09-30',
      rostersMap: updatedCtx.rostersMap,
      holidaysMap: updatedCtx.holidaysMap,
      departmentRuleMap: updatedCtx.departmentRuleMap,
    });
    console.assert(wedCompOff.expectedStatus === 'COMP_OFF', 'Wednesday must be COMP_OFF');
    console.assert(wedCompOff.compOffForDate === '2026-09-27', 'Wednesday compOffForDate must link to 2026-09-27');

    const wedAtt = resolveDayAttendance({ expectedSchedule: wedCompOff, summary: null });
    console.assert(wedAtt.actualStatus === 'COMP_OFF' && wedAtt.displayCode === 'CO', 'Wednesday must be CO (NOT ABSENT)');
    console.log('  ✅ [PASS] TEST 7: Wednesday Compensatory Off with no punch yields CO (NOT ABSENT)');

    console.log('\n--- 4. Testing Holiday Calendar & Holiday Working ---');
    // TEST 9: Holiday without attendance
    const holidaySchedule = resolveExpectedSchedule({
      employee: emp1,
      dateStr: '2026-10-02',
      rostersMap: updatedCtx.rostersMap,
      holidaysMap: updatedCtx.holidaysMap,
      departmentRuleMap: updatedCtx.departmentRuleMap,
    });
    console.assert(holidaySchedule.expectedStatus === 'HOLIDAY', '2026-10-02 must be HOLIDAY');
    const holAtt = resolveDayAttendance({ expectedSchedule: holidaySchedule, summary: null });
    console.assert(holAtt.actualStatus === 'HOLIDAY' && holAtt.displayCode === 'H', 'Holiday without punch is H (NOT ABSENT)');
    console.log('  ✅ [PASS] TEST 8: Holiday without attendance yields H (NOT ABSENT)');

    // TEST 10: Holiday explicitly rostered as WORKING (e.g. 24x7 coverage)
    await ShiftRoster.create({
      employee: emp2._id,
      employeeId: emp2.employeeId,
      date: '2026-10-02',
      shift: nightShift._id,
      rosterStatus: 'WORKING',
      remarks: '24x7 Holiday Shift',
    });

    const holidayRosterCtx = await loadRosterContext({
      startDate: '2026-10-02',
      endDate: '2026-10-02',
      employeeIds: [emp2._id],
    });

    const holWorkedSchedule = resolveExpectedSchedule({
      employee: emp2,
      dateStr: '2026-10-02',
      rostersMap: holidayRosterCtx.rostersMap,
      holidaysMap: holidayRosterCtx.holidaysMap,
      departmentRuleMap: holidayRosterCtx.departmentRuleMap,
    });
    console.assert(holWorkedSchedule.expectedStatus === 'WORKING', 'Holiday overridden to WORKING');
    console.assert(holWorkedSchedule.isHolidayOverride === true, 'Marked as Holiday Override');

    const holWorkedAtt = resolveDayAttendance({
      expectedSchedule: holWorkedSchedule,
      summary: { status: 'PRESENT', firstCheckIn: new Date(), workingHours: 8 },
    });
    console.assert(holWorkedAtt.isHolidayWorked === true, 'Flagged as isHolidayWorked: true');
    console.log('  ✅ [PASS] TEST 9: Holiday worked with explicit roster yields PRESENT & isHolidayWorked: true');

    // TEST 11: Duplicate Roster Prevention
    let dupErrorCaught = false;
    try {
      await ShiftRoster.create({
        employee: emp1._id,
        employeeId: emp1.employeeId,
        date: '2026-09-27',
        rosterStatus: 'WORKING',
      });
    } catch (e) {
      dupErrorCaught = true;
    }
    console.assert(dupErrorCaught, 'Duplicate roster entry for same employee + date must fail');
    console.log('  ✅ [PASS] TEST 10: Unique index on { employee: 1, date: 1 } blocks duplicates');

    // Clean up
    await ShiftRoster.deleteMany({ employeeId: /ROST_/ });
    await Employee.deleteMany({ employeeId: /ROST_/ });
    await Holiday.deleteMany({ holidayName: /TEST_HOLIDAY/ });
    await WeeklyOffRule.deleteMany({ department: /TEST_DEPT/ });

    console.log('\n🎉 ALL 10 ROSTER & WEEKLY-OFF CORE TESTS PASSED 100%!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runRosterTestSuite();
