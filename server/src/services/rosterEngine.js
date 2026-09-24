import ShiftRoster from '../models/ShiftRoster.js';
import Holiday from '../models/Holiday.js';
import WeeklyOffRule from '../models/WeeklyOffRule.js';

/**
 * Returns 0 (Sunday) through 6 (Saturday) for a "YYYY-MM-DD" string
 */
export const getDayOfWeekFromYMD = (ymdStr) => {
  if (!ymdStr) return 0;
  const [year, month, day] = ymdStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
};

/**
 * Returns human-readable day name (Sun, Mon, Tue, ...)
 */
export const getDayNameFromYMD = (ymdStr) => {
  const dayIndex = getDayOfWeekFromYMD(ymdStr);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[dayIndex];
};

/**
 * Resolves the weekly-off days for an employee (array of numbers, 0=Sun..6=Sat)
 */
export const getEmployeeWeeklyOffDays = (employee, departmentRuleMap = {}) => {
  if (employee?.weeklyOffDays && Array.isArray(employee.weeklyOffDays) && employee.weeklyOffDays.length > 0) {
    return employee.weeklyOffDays;
  }

  const dept = employee?.department;
  if (dept && departmentRuleMap[dept]) {
    return departmentRuleMap[dept].days;
  }

  if (departmentRuleMap['DEFAULT']) {
    return departmentRuleMap['DEFAULT'].days;
  }

  // Default for IT Support and general corporate: Saturday (6) and Sunday (0)
  return [0, 6];
};

/**
 * Resolves expected work status for an employee on a single calendar date.
 * Priority:
 * 1. Explicit Roster
 * 2. Holiday Calendar
 * 3. Default Weekly Off Pattern
 * 4. Normal Working Day (using Employee's assignedShift)
 */
export const resolveExpectedSchedule = ({
  employee,
  dateStr,
  rostersMap = {},
  holidaysMap = {},
  departmentRuleMap = {},
}) => {
  const dayOfWeek = getDayOfWeekFromYMD(dateStr);
  const dayName = getDayNameFromYMD(dateStr);
  const weeklyOffDays = getEmployeeWeeklyOffDays(employee, departmentRuleMap);
  const isNaturallyWeeklyOff = weeklyOffDays.includes(dayOfWeek);
  const naturalHoliday = holidaysMap[dateStr] || null;

  // 1. Explicit Roster Check
  const rosterKey = `${employee._id.toString()}_${dateStr}`;
  const explicitRoster = rostersMap[rosterKey] || null;

  if (explicitRoster) {
    const status = explicitRoster.rosterStatus;

    if (status === 'WORKING') {
      return {
        dateStr,
        dayOfWeek,
        dayName,
        expectedStatus: 'WORKING',
        shift: explicitRoster.shift || employee.assignedShift,
        isWorkRequired: true,
        isExplicitRoster: true,
        rosterEntry: explicitRoster,
        isWeekOffOverride: isNaturallyWeeklyOff,
        isHolidayOverride: Boolean(naturalHoliday),
        weekOffType: isNaturallyWeeklyOff ? 'OVERRIDE' : 'NONE',
        remarks: explicitRoster.remarks || '',
      };
    }

    if (status === 'WEEK_OFF') {
      return {
        dateStr,
        dayOfWeek,
        dayName,
        expectedStatus: 'WEEK_OFF',
        shift: null,
        isWorkRequired: false,
        isExplicitRoster: true,
        rosterEntry: explicitRoster,
        weekOffType: explicitRoster.weekOffType || 'REGULAR',
        remarks: explicitRoster.remarks || '',
      };
    }

    if (status === 'COMP_OFF') {
      return {
        dateStr,
        dayOfWeek,
        dayName,
        expectedStatus: 'COMP_OFF',
        shift: null,
        isWorkRequired: false,
        isExplicitRoster: true,
        rosterEntry: explicitRoster,
        compOffForDate: explicitRoster.compOffForDate || null,
        weekOffType: 'COMPENSATORY',
        remarks: explicitRoster.remarks || '',
      };
    }

    if (status === 'HOLIDAY') {
      return {
        dateStr,
        dayOfWeek,
        dayName,
        expectedStatus: 'HOLIDAY',
        shift: null,
        isWorkRequired: false,
        isExplicitRoster: true,
        rosterEntry: explicitRoster,
        holiday: explicitRoster.holiday || naturalHoliday,
        remarks: explicitRoster.remarks || '',
      };
    }

    if (status === 'LEAVE') {
      return {
        dateStr,
        dayOfWeek,
        dayName,
        expectedStatus: 'LEAVE',
        shift: null,
        isWorkRequired: false,
        isExplicitRoster: true,
        rosterEntry: explicitRoster,
        remarks: explicitRoster.remarks || '',
      };
    }
  }

  // 2. Holiday Calendar Check
  if (naturalHoliday && naturalHoliday.status === 'ACTIVE') {
    return {
      dateStr,
      dayOfWeek,
      dayName,
      expectedStatus: 'HOLIDAY',
      shift: null,
      isWorkRequired: false,
      isExplicitRoster: false,
      holiday: naturalHoliday,
      remarks: naturalHoliday.holidayName,
    };
  }

  // 3. Default Weekly Off Check
  if (isNaturallyWeeklyOff) {
    return {
      dateStr,
      dayOfWeek,
      dayName,
      expectedStatus: 'WEEK_OFF',
      shift: null,
      isWorkRequired: false,
      isExplicitRoster: false,
      isDefaultWeeklyOff: true,
      weekOffType: 'REGULAR',
      remarks: 'Default Weekly Off',
    };
  }

  // 4. Normal Working Day
  return {
    dateStr,
    dayOfWeek,
    dayName,
    expectedStatus: 'WORKING',
    shift: employee.assignedShift,
    isWorkRequired: true,
    isExplicitRoster: false,
    remarks: 'Standard Shift Schedule',
  };
};

/**
 * Combines expected schedule with actual punch records to yield official daily status
 */
export const resolveDayAttendance = ({ expectedSchedule, summary, events = [] }) => {
  const hasPunches = summary && (summary.firstCheckIn || (events && events.length > 0));

  if (hasPunches) {
    const rawStatus = summary.status || 'PRESENT';
    const isWeekOffWorked =
      expectedSchedule.isWeekOffOverride ||
      (expectedSchedule.expectedStatus === 'WEEK_OFF' && hasPunches);
    const isHolidayWorked =
      expectedSchedule.isHolidayOverride ||
      (expectedSchedule.expectedStatus === 'HOLIDAY' && hasPunches);

    let displayCode = 'P';
    if (rawStatus === 'LATE') displayCode = 'L';
    if (rawStatus === 'HALF_DAY') displayCode = 'HD';

    return {
      dateStr: expectedSchedule.dateStr,
      dayName: expectedSchedule.dayName,
      expectedStatus: expectedSchedule.expectedStatus,
      actualStatus: rawStatus,
      displayCode,
      scheduledShift: expectedSchedule.shift,
      hasPunches: true,
      firstCheckIn: summary.firstCheckIn,
      lastCheckOut: summary.lastCheckOut,
      workingHours: summary.workingHours || 0,
      breakDurationMinutes: summary.breakDurationMinutes || 0,
      lateMinutes: summary.lateMinutes || 0,
      earlyLeavingMinutes: summary.earlyLeavingMinutes || 0,
      overtimeMinutes: summary.overtimeMinutes || 0,
      isWeekOffWorked,
      isHolidayWorked,
      matchedLocationName: (events[0]?.matchedLocationName) || '',
      summary,
    };
  }

  // No Punches: derive correct status without marking legitimate off-days as Absent
  let actualStatus = 'ABSENT';
  let displayCode = 'A';

  if (expectedSchedule.expectedStatus === 'WEEK_OFF') {
    actualStatus = 'WEEK_OFF';
    displayCode = 'WO';
  } else if (expectedSchedule.expectedStatus === 'COMP_OFF') {
    actualStatus = 'COMP_OFF';
    displayCode = 'CO';
  } else if (expectedSchedule.expectedStatus === 'HOLIDAY') {
    actualStatus = 'HOLIDAY';
    displayCode = 'H';
  } else if (expectedSchedule.expectedStatus === 'LEAVE') {
    actualStatus = 'LEAVE';
    displayCode = 'L';
  } else {
    // Expected was WORKING and no attendance was marked -> ABSENT
    actualStatus = 'ABSENT';
    displayCode = 'A';
  }

  return {
    dateStr: expectedSchedule.dateStr,
    dayName: expectedSchedule.dayName,
    expectedStatus: expectedSchedule.expectedStatus,
    actualStatus,
    displayCode,
    scheduledShift: expectedSchedule.shift,
    hasPunches: false,
    firstCheckIn: null,
    lastCheckOut: null,
    workingHours: 0,
    breakDurationMinutes: 0,
    lateMinutes: 0,
    earlyLeavingMinutes: 0,
    overtimeMinutes: 0,
    isWeekOffWorked: false,
    isHolidayWorked: false,
    matchedLocationName: '',
    summary: null,
  };
};

/**
 * Loads all contextual data (Holidays, WeeklyOffRules, Rosters) for a date range in bulk
 */
export const loadRosterContext = async ({ startDate, endDate, employeeIds = [] }) => {
  const [holidays, weeklyOffRules, rosters] = await Promise.all([
    Holiday.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'ACTIVE',
    }),
    WeeklyOffRule.find(),
    ShiftRoster.find({
      date: { $gte: startDate, $lte: endDate },
      ...(employeeIds.length > 0 ? { employee: { $in: employeeIds } } : {}),
    })
      .populate('shift')
      .populate('holiday'),
  ]);

  const holidaysMap = {};
  holidays.forEach((h) => {
    holidaysMap[h.date] = h;
  });

  const departmentRuleMap = {};
  weeklyOffRules.forEach((r) => {
    departmentRuleMap[r.department] = r;
  });

  const rostersMap = {};
  rosters.forEach((r) => {
    const key = `${r.employee.toString()}_${r.date}`;
    rostersMap[key] = r;
  });

  return {
    holidaysMap,
    departmentRuleMap,
    rostersMap,
  };
};
