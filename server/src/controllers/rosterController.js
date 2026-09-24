import ShiftRoster from '../models/ShiftRoster.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import Holiday from '../models/Holiday.js';
import WeeklyOffRule from '../models/WeeklyOffRule.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import { logAudit } from '../services/auditService.js';
import {
  getDayOfWeekFromYMD,
  getDayNameFromYMD,
  getEmployeeWeeklyOffDays,
  resolveExpectedSchedule,
  resolveDayAttendance,
  loadRosterContext,
} from '../services/rosterEngine.js';

// ==========================================
// 1. ROSTER CRUD & SEARCH
// ==========================================

export const getRosters = async (req, res) => {
  try {
    const { startDate, endDate, month, year, department, employeeId, shiftId, rosterStatus } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (year && month) {
      const monthPad = String(month).padStart(2, '0');
      filter.date = { $regex: new RegExp(`^${year}-${monthPad}`) };
    }

    if (rosterStatus) filter.rosterStatus = rosterStatus;
    if (shiftId) filter.shift = shiftId;

    if (employeeId) {
      filter.employee = employeeId;
    } else if (department) {
      const empsInDept = await Employee.find({ department }).select('_id');
      filter.employee = { $in: empsInDept.map((e) => e._id) };
    }

    const rosters = await ShiftRoster.find(filter)
      .populate('employee', 'employeeId fullName department designation profilePhoto')
      .populate('shift')
      .populate('holiday')
      .populate('createdBy', 'name email')
      .sort({ date: 1, 'employee.fullName': 1 });

    res.json({
      success: true,
      count: rosters.length,
      data: rosters,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyGrid = async (req, res) => {
  try {
    const { year, month, department, employeeId } = req.query;
    const now = new Date();
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const targetMonth = parseInt(month, 10) || now.getMonth() + 1;

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const monthPad = String(targetMonth).padStart(2, '0');
    const startDate = `${targetYear}-${monthPad}-01`;
    const endDate = `${targetYear}-${monthPad}-${String(daysInMonth).padStart(2, '0')}`;

    // Filter active employees (excluding system SuperAdmin profile if detached)
    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const empFilter = {
      employmentStatus: 'ACTIVE',
      employeeId: { $ne: 'ADM001' },
      email: { $ne: adminEmail },
    };
    if (department) empFilter.department = department;
    if (employeeId) empFilter._id = employeeId;

    const employees = await Employee.find(empFilter)
      .populate('assignedShift')
      .sort({ department: 1, fullName: 1 });

    const employeeIds = employees.map((e) => e._id);

    // Bulk fetch Roster Context and actual AttendanceSummaries
    const [context, summaries] = await Promise.all([
      loadRosterContext({ startDate, endDate, employeeIds }),
      AttendanceSummary.find({
        attendanceDate: { $gte: startDate, $lte: endDate },
        employee: { $in: employeeIds },
      }).populate('shift'),
    ]);

    const summariesMap = {};
    summaries.forEach((s) => {
      const key = `${s.employee.toString()}_${s.attendanceDate}`;
      summariesMap[key] = s;
    });

    // Build day columns
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dPad = String(d).padStart(2, '0');
      const dateStr = `${targetYear}-${monthPad}-${dPad}`;
      days.push({
        date: dateStr,
        dayNumber: d,
        dayName: getDayNameFromYMD(dateStr),
        dayOfWeek: getDayOfWeekFromYMD(dateStr),
        holiday: context.holidaysMap[dateStr] || null,
      });
    }

    // Build grid rows
    const rows = employees.map((emp) => {
      const daySchedules = days.map((day) => {
        const expected = resolveExpectedSchedule({
          employee: emp,
          dateStr: day.date,
          rostersMap: context.rostersMap,
          holidaysMap: context.holidaysMap,
          departmentRuleMap: context.departmentRuleMap,
        });

        const sumKey = `${emp._id.toString()}_${day.date}`;
        const sum = summariesMap[sumKey] || null;
        const evaluated = resolveDayAttendance({
          expectedSchedule: expected,
          summary: sum,
        });

        return {
          date: day.date,
          dayNumber: day.dayNumber,
          dayName: day.dayName,
          expectedStatus: expected.expectedStatus,
          rosterStatus: expected.rosterEntry?.rosterStatus || expected.expectedStatus,
          shift: expected.shift,
          isExplicitRoster: expected.isExplicitRoster,
          isWeekOffOverride: expected.isWeekOffOverride,
          isHolidayOverride: expected.isHolidayOverride,
          compOffForDate: expected.compOffForDate || null,
          remarks: expected.remarks || '',
          rosterId: expected.rosterEntry?._id || null,
          // Attendance evaluation
          actualStatus: evaluated.actualStatus,
          displayCode: evaluated.displayCode,
          hasPunches: evaluated.hasPunches,
          firstCheckIn: evaluated.firstCheckIn,
          lastCheckOut: evaluated.lastCheckOut,
          workingHours: evaluated.workingHours,
          isWeekOffWorked: evaluated.isWeekOffWorked,
          isHolidayWorked: evaluated.isHolidayWorked,
        };
      });

      // Quick summary stats for this employee in this month
      let scheduledWorkingDays = 0;
      let scheduledWeekOffs = 0;
      let scheduledCompOffs = 0;
      let scheduledHolidays = 0;
      let actualPresents = 0;
      let actualAbsents = 0;
      let weekOffWorked = 0;
      let holidayWorked = 0;

      daySchedules.forEach((ds) => {
        if (ds.expectedStatus === 'WORKING') scheduledWorkingDays++;
        if (ds.expectedStatus === 'WEEK_OFF') scheduledWeekOffs++;
        if (ds.expectedStatus === 'COMP_OFF') scheduledCompOffs++;
        if (ds.expectedStatus === 'HOLIDAY') scheduledHolidays++;

        if (['P', 'L', 'HD'].includes(ds.displayCode)) actualPresents++;
        if (ds.displayCode === 'A') actualAbsents++;
        if (ds.isWeekOffWorked) weekOffWorked++;
        if (ds.isHolidayWorked) holidayWorked++;
      });

      return {
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          department: emp.department,
          designation: emp.designation,
          assignedShift: emp.assignedShift,
          weeklyOffDays: emp.weeklyOffDays || null,
        },
        days: daySchedules,
        stats: {
          scheduledWorkingDays,
          scheduledWeekOffs,
          scheduledCompOffs,
          scheduledHolidays,
          actualPresents,
          actualAbsents,
          weekOffWorked,
          holidayWorked,
        },
      };
    });

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth,
      daysInMonth,
      days,
      rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrUpdateRoster = async (req, res) => {
  try {
    const { employeeId, date, shiftId, rosterStatus = 'WORKING', weekOffType = 'NONE', remarks = '' } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee and Date (YYYY-MM-DD) are required.',
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    let shift = null;
    if (rosterStatus === 'WORKING') {
      const shiftRef = shiftId || employee.assignedShift;
      shift = await Shift.findById(shiftRef);
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'A valid Shift is mandatory when roster status is WORKING.',
        });
      }
    }

    let roster = await ShiftRoster.findOne({ employee: employee._id, date });
    const isNew = !roster;
    const beforeValue = roster ? roster.toObject() : null;

    if (roster) {
      roster.shift = shift ? shift._id : null;
      roster.rosterStatus = rosterStatus;
      roster.weekOffType = weekOffType;
      roster.remarks = remarks ? remarks.trim() : '';
      roster.updatedBy = req.user?._id;
      await roster.save();
    } else {
      roster = await ShiftRoster.create({
        employee: employee._id,
        employeeId: employee.employeeId,
        date,
        shift: shift ? shift._id : null,
        rosterStatus,
        weekOffType,
        remarks: remarks ? remarks.trim() : '',
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
      });
    }

    await logAudit({
      req,
      action: isNew ? 'ROSTER_CREATED' : 'ROSTER_UPDATED',
      targetModel: 'ShiftRoster',
      targetId: roster._id,
      targetIdentifier: `${employee.fullName} (${date})`,
      details: `${isNew ? 'Created' : 'Updated'} roster for ${employee.fullName} on ${date}: ${rosterStatus} ${shift ? `(${shift.shiftName})` : ''}`,
      beforeValue,
      afterValue: roster.toObject(),
    });

    const populated = await ShiftRoster.findById(roster._id)
      .populate('employee', 'employeeId fullName department')
      .populate('shift');

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: `Roster saved for ${employee.fullName} on ${date}.`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkCreateRoster = async (req, res) => {
  try {
    const {
      employeeIds = [],
      department,
      startDate,
      endDate,
      shiftId,
      rosterStatus = 'WORKING',
      weekOffType = 'NONE',
      remarks = '',
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start Date and End Date (YYYY-MM-DD) are required.',
      });
    }

    let targetEmployees = [];
    if (employeeIds.length > 0) {
      targetEmployees = await Employee.find({ _id: { $in: employeeIds }, employmentStatus: 'ACTIVE' });
    } else if (department) {
      targetEmployees = await Employee.find({ department, employmentStatus: 'ACTIVE' });
    } else {
      targetEmployees = await Employee.find({ employmentStatus: 'ACTIVE' });
    }

    if (targetEmployees.length === 0) {
      return res.status(400).json({ success: false, message: 'No matching active employees selected.' });
    }

    let shift = null;
    if (rosterStatus === 'WORKING') {
      if (shiftId) {
        shift = await Shift.findById(shiftId);
      }
    }

    // Generate date sequence
    const dates = [];
    const current = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const bulkOps = [];
    for (const emp of targetEmployees) {
      const activeShiftId = shift ? shift._id : (rosterStatus === 'WORKING' ? emp.assignedShift : null);

      for (const d of dates) {
        bulkOps.push({
          updateOne: {
            filter: { employee: emp._id, date: d },
            update: {
              $set: {
                employeeId: emp.employeeId,
                shift: activeShiftId,
                rosterStatus,
                weekOffType,
                remarks: remarks ? remarks.trim() : '',
                updatedBy: req.user?._id,
              },
              $setOnInsert: {
                createdBy: req.user?._id,
              },
            },
            upsert: true,
          },
        });
      }
    }

    const result = await ShiftRoster.bulkWrite(bulkOps);

    await logAudit({
      req,
      action: 'ROSTER_BULK_ASSIGNED',
      targetModel: 'ShiftRoster',
      targetIdentifier: `${targetEmployees.length} employees (${startDate} to ${endDate})`,
      details: `Bulk roster created for ${targetEmployees.length} employee(s) from ${startDate} to ${endDate}: ${rosterStatus}`,
    });

    res.status(201).json({
      success: true,
      message: `Bulk roster updated for ${targetEmployees.length} employee(s) across ${dates.length} days.`,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const copyWeekRoster = async (req, res) => {
  try {
    const { sourceStartDate, targetStartDate, employeeIds = [], department } = req.body;

    if (!sourceStartDate || !targetStartDate) {
      return res.status(400).json({
        success: false,
        message: 'Source Start Date and Target Start Date (YYYY-MM-DD) are required.',
      });
    }

    let targetEmployees = [];
    if (employeeIds.length > 0) {
      targetEmployees = await Employee.find({ _id: { $in: employeeIds }, employmentStatus: 'ACTIVE' });
    } else if (department) {
      targetEmployees = await Employee.find({ department, employmentStatus: 'ACTIVE' });
    } else {
      targetEmployees = await Employee.find({ employmentStatus: 'ACTIVE' });
    }

    if (targetEmployees.length === 0) {
      return res.status(400).json({ success: false, message: 'No matching active employees selected.' });
    }

    // Source 7 days & Target 7 days
    const sourceDates = [];
    const targetDates = [];
    for (let i = 0; i < 7; i++) {
      const s = new Date(sourceStartDate + 'T00:00:00Z');
      s.setUTCDate(s.getUTCDate() + i);
      sourceDates.push(s.toISOString().split('T')[0]);

      const t = new Date(targetStartDate + 'T00:00:00Z');
      t.setUTCDate(t.getUTCDate() + i);
      targetDates.push(t.toISOString().split('T')[0]);
    }

    const empIdList = targetEmployees.map((e) => e._id);
    const sourceRosters = await ShiftRoster.find({
      employee: { $in: empIdList },
      date: { $in: sourceDates },
    });

    const sourceMap = {};
    sourceRosters.forEach((r) => {
      sourceMap[`${r.employee.toString()}_${r.date}`] = r;
    });

    const bulkOps = [];
    for (const emp of targetEmployees) {
      for (let i = 0; i < 7; i++) {
        const sDate = sourceDates[i];
        const tDate = targetDates[i];
        const srcRoster = sourceMap[`${emp._id.toString()}_${sDate}`];

        if (srcRoster) {
          bulkOps.push({
            updateOne: {
              filter: { employee: emp._id, date: tDate },
              update: {
                $set: {
                  employeeId: emp.employeeId,
                  shift: srcRoster.shift,
                  rosterStatus: srcRoster.rosterStatus,
                  weekOffType: srcRoster.weekOffType,
                  remarks: `Copied from ${sDate}`,
                  updatedBy: req.user?._id,
                },
                $setOnInsert: {
                  createdBy: req.user?._id,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No existing roster entries found in the source week to copy.',
      });
    }

    await ShiftRoster.bulkWrite(bulkOps);

    await logAudit({
      req,
      action: 'ROSTER_WEEK_COPIED',
      targetModel: 'ShiftRoster',
      targetIdentifier: `${sourceStartDate} -> ${targetStartDate}`,
      details: `Copied week roster from ${sourceStartDate} to ${targetStartDate} for ${targetEmployees.length} employees`,
    });

    res.json({
      success: true,
      message: `Successfully copied week schedule to week of ${targetStartDate} (${bulkOps.length} entries assigned).`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCompOff = async (req, res) => {
  try {
    const { employeeId, workedDate, offDate, reason = 'Compensatory Off for Sunday/Holiday Duty' } = req.body;

    if (!employeeId || !workedDate || !offDate) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, Worked Date, and Off Date are required.',
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // 1. Ensure workedDate is set to WORKING if not already
    let workedRoster = await ShiftRoster.findOne({ employee: employee._id, date: workedDate });
    if (!workedRoster) {
      await ShiftRoster.create({
        employee: employee._id,
        employeeId: employee.employeeId,
        date: workedDate,
        shift: employee.assignedShift,
        rosterStatus: 'WORKING',
        weekOffType: 'OVERRIDE',
        remarks: 'Overridden as Working for Comp-Off generation',
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
      });
    }

    // 2. Set offDate as COMP_OFF linked to workedDate
    let offRoster = await ShiftRoster.findOne({ employee: employee._id, date: offDate });
    if (offRoster) {
      offRoster.shift = null;
      offRoster.rosterStatus = 'COMP_OFF';
      offRoster.weekOffType = 'COMPENSATORY';
      offRoster.compOffForDate = workedDate;
      offRoster.remarks = reason.trim();
      offRoster.updatedBy = req.user?._id;
      await offRoster.save();
    } else {
      offRoster = await ShiftRoster.create({
        employee: employee._id,
        employeeId: employee.employeeId,
        date: offDate,
        shift: null,
        rosterStatus: 'COMP_OFF',
        weekOffType: 'COMPENSATORY',
        compOffForDate: workedDate,
        remarks: reason.trim(),
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
      });
    }

    await logAudit({
      req,
      action: 'COMP_OFF_ASSIGNED',
      targetModel: 'ShiftRoster',
      targetId: offRoster._id,
      targetIdentifier: `${employee.fullName} (${offDate})`,
      details: `Assigned Compensatory Off on ${offDate} in exchange for worked shift on ${workedDate}`,
      afterValue: offRoster.toObject(),
    });

    res.status(201).json({
      success: true,
      message: `Compensatory Off granted for ${employee.fullName} on ${offDate} (worked on ${workedDate}).`,
      data: offRoster,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRoster = async (req, res) => {
  try {
    const roster = await ShiftRoster.findById(req.params.id).populate('employee', 'fullName employeeId');
    if (!roster) {
      return res.status(404).json({ success: false, message: 'Roster entry not found.' });
    }

    const empName = roster.employee?.fullName || 'Employee';
    const date = roster.date;
    const status = roster.rosterStatus;

    await ShiftRoster.findByIdAndDelete(roster._id);

    await logAudit({
      req,
      action: 'ROSTER_DELETED',
      targetModel: 'ShiftRoster',
      targetId: roster._id,
      targetIdentifier: `${empName} (${date})`,
      details: `Removed explicit roster entry on ${date} (${status}) for ${empName}`,
    });

    res.json({
      success: true,
      message: `Roster entry removed for ${empName} on ${date}. Reverted to default schedule.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyRoster = async (req, res) => {
  try {
    const empId = req.user.employee?._id || req.user.employee;
    let employee = empId ? await Employee.findById(empId).populate('assignedShift') : null;
    if (!employee) {
      employee = await Employee.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email?.toLowerCase().trim() }],
      }).populate('assignedShift');
    }

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not associated with this account.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Fetch next 14 days
    const nextDates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      nextDates.push(d.toISOString().split('T')[0]);
    }

    const startDate = nextDates[0];
    const endDate = nextDates[nextDates.length - 1];

    const context = await loadRosterContext({
      startDate,
      endDate,
      employeeIds: [employee._id],
    });

    const upcoming = nextDates.map((dateStr) => {
      const expected = resolveExpectedSchedule({
        employee,
        dateStr,
        rostersMap: context.rostersMap,
        holidaysMap: context.holidaysMap,
        departmentRuleMap: context.departmentRuleMap,
      });

      return {
        date: dateStr,
        dayName: expected.dayName,
        isToday: dateStr === todayStr,
        expectedStatus: expected.expectedStatus,
        shift: expected.shift,
        isWorkRequired: expected.isWorkRequired,
        isWeeklyOff: expected.expectedStatus === 'WEEK_OFF',
        isCompOff: expected.expectedStatus === 'COMP_OFF',
        isHoliday: expected.expectedStatus === 'HOLIDAY',
        compOffForDate: expected.compOffForDate || null,
        remarks: expected.remarks || '',
      };
    });

    res.json({
      success: true,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        assignedShift: employee.assignedShift,
      },
      todaySchedule: upcoming[0],
      upcoming,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. HOLIDAY MASTER CONTROLLERS
// ==========================================

export const getHolidays = async (req, res) => {
  try {
    const { year, status } = req.query;
    const filter = {};

    if (year) {
      filter.date = { $regex: new RegExp(`^${year}-`) };
    }
    if (status) {
      filter.status = status;
    }

    const holidays = await Holiday.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { holidayName, date, type = 'PUBLIC', description = '', status = 'ACTIVE' } = req.body;

    if (!holidayName || !date) {
      return res.status(400).json({ success: false, message: 'Holiday Name and Date are required.' });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(400).json({ success: false, message: `A holiday (${existing.holidayName}) already exists on ${date}.` });
    }

    const holiday = await Holiday.create({
      holidayName: holidayName.trim(),
      date,
      type,
      description: description ? description.trim() : '',
      status,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await logAudit({
      req,
      action: 'HOLIDAY_CREATED',
      targetModel: 'Holiday',
      targetId: holiday._id,
      targetIdentifier: `${holiday.holidayName} (${date})`,
      details: `Created holiday '${holiday.holidayName}' on ${date} (${type})`,
      afterValue: holiday.toObject(),
    });

    res.status(201).json({
      success: true,
      message: `Holiday '${holiday.holidayName}' added successfully.`,
      data: holiday,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    const beforeValue = holiday.toObject();

    if (req.body.holidayName) holiday.holidayName = req.body.holidayName.trim();
    if (req.body.date) holiday.date = req.body.date;
    if (req.body.type) holiday.type = req.body.type;
    if (req.body.description !== undefined) holiday.description = req.body.description.trim();
    if (req.body.status) holiday.status = req.body.status;

    holiday.updatedBy = req.user?._id;
    await holiday.save();

    await logAudit({
      req,
      action: 'HOLIDAY_UPDATED',
      targetModel: 'Holiday',
      targetId: holiday._id,
      targetIdentifier: holiday.holidayName,
      details: `Updated holiday '${holiday.holidayName}' on ${holiday.date}`,
      beforeValue,
      afterValue: holiday.toObject(),
    });

    res.json({
      success: true,
      message: `Holiday '${holiday.holidayName}' updated successfully.`,
      data: holiday,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    const name = holiday.holidayName;
    const date = holiday.date;

    await Holiday.findByIdAndDelete(holiday._id);

    await logAudit({
      req,
      action: 'HOLIDAY_DELETED',
      targetModel: 'Holiday',
      targetId: holiday._id,
      targetIdentifier: `${name} (${date})`,
      details: `Deleted holiday '${name}' on ${date}`,
    });

    res.json({
      success: true,
      message: `Holiday '${name}' deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. WEEKLY OFF CONFIGURATION CONTROLLERS
// ==========================================

export const getWeeklyOffRules = async (req, res) => {
  try {
    const rules = await WeeklyOffRule.find().sort({ department: 1 });
    res.json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWeeklyOffRule = async (req, res) => {
  try {
    const { department, days = [0, 6], description = '' } = req.body;

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    if (!Array.isArray(days) || days.some((d) => d < 0 || d > 6)) {
      return res.status(400).json({
        success: false,
        message: 'Days must be an array of numbers between 0 (Sunday) and 6 (Saturday).',
      });
    }

    let rule = await WeeklyOffRule.findOne({ department: department.trim() });
    const isNew = !rule;
    const beforeValue = rule ? rule.toObject() : null;

    if (rule) {
      rule.days = days;
      rule.description = description.trim();
      rule.updatedBy = req.user?._id;
      await rule.save();
    } else {
      rule = await WeeklyOffRule.create({
        department: department.trim(),
        days,
        description: description.trim(),
        createdBy: req.user?._id,
        updatedBy: req.user?._id,
      });
    }

    await logAudit({
      req,
      action: 'WEEKLY_OFF_RULE_UPDATED',
      targetModel: 'WeeklyOffRule',
      targetId: rule._id,
      targetIdentifier: department,
      details: `Configured weekly off days for department '${department}': [${days.join(', ')}]`,
      beforeValue,
      afterValue: rule.toObject(),
    });

    res.json({
      success: true,
      message: `Weekly off rule updated for department '${department}'.`,
      data: rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeeWeeklyOff = async (req, res) => {
  try {
    const { weeklyOffDays } = req.body; // e.g. [0] for Sunday, or [0, 6] for Sat+Sun, or null to revert
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (weeklyOffDays !== null && (!Array.isArray(weeklyOffDays) || weeklyOffDays.some((d) => d < 0 || d > 6))) {
      return res.status(400).json({
        success: false,
        message: 'weeklyOffDays must be null or an array of integers 0 to 6.',
      });
    }

    const beforeValue = employee.weeklyOffDays;
    employee.weeklyOffDays = weeklyOffDays;
    await employee.save();

    await logAudit({
      req,
      action: 'EMPLOYEE_WEEKLY_OFF_UPDATED',
      targetModel: 'Employee',
      targetId: employee._id,
      targetIdentifier: `${employee.fullName} (${employee.employeeId})`,
      details: `Custom weekly off days updated to: ${weeklyOffDays ? `[${weeklyOffDays.join(', ')}]` : 'Inherit department default'}`,
      beforeValue: { weeklyOffDays: beforeValue },
      afterValue: { weeklyOffDays },
    });

    res.json({
      success: true,
      message: `Weekly off updated for ${employee.fullName}.`,
      data: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        weeklyOffDays: employee.weeklyOffDays,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
