import AttendanceSummary from '../models/AttendanceSummary.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import Employee from '../models/Employee.js';
import ShiftRoster from '../models/ShiftRoster.js';
import SalaryAttendancePolicy from '../models/SalaryAttendancePolicy.js';
import AttendanceAdjustment from '../models/AttendanceAdjustment.js';
import PayrollMonthLock from '../models/PayrollMonthLock.js';
import { logAudit } from '../services/auditService.js';
import {
  loadRosterContext,
  resolveExpectedSchedule,
  resolveDayAttendance,
  getDayNameFromYMD,
} from '../services/rosterEngine.js';

export const getDailyReport = async (req, res) => {
  try {
    const { date, department, shift, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const query = { attendanceDate: targetDate };
    if (shift) query.shift = shift;
    if (status) query.status = status;

    let records = await AttendanceSummary.find(query)
      .populate('employee', 'employeeId fullName department designation mobile assignedShift weeklyOffDays')
      .populate('shift', 'shiftName shiftCode startTime endTime shiftType')
      .populate('events')
      .sort({ 'employee.fullName': 1 });

    if (department) {
      records = records.filter((r) => r.employee?.department === department);
    }

    const employeeIds = records.map((r) => r.employee?._id).filter(Boolean);
    const rosterCtx = await loadRosterContext({
      startDate: targetDate,
      endDate: targetDate,
      employeeIds,
    });

    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const formatted = records
      .filter((r) => r.employeeId !== 'ADM001' && r.employee?.email !== adminEmail)
      .map((r) => {
        const checkInEvent = (r.events || []).find((ev) => ev.eventType === 'CHECK_IN');

        const expected = r.employee
          ? resolveExpectedSchedule({
              employee: r.employee,
              dateStr: targetDate,
              rostersMap: rosterCtx.rostersMap,
              holidaysMap: rosterCtx.holidaysMap,
              departmentRuleMap: rosterCtx.departmentRuleMap,
            })
          : null;

        const isWeekOffWorked =
          expected?.isWeekOffOverride ||
          (expected?.expectedStatus === 'WEEK_OFF' && Boolean(r.firstCheckIn));
        const isHolidayWorked =
          expected?.isHolidayOverride ||
          (expected?.expectedStatus === 'HOLIDAY' && Boolean(r.firstCheckIn));

        return {
          date: r.attendanceDate,
          day: getDayNameFromYMD(r.attendanceDate),
          employeeId: r.employee?.employeeId || r.employeeId,
          employeeName: r.employee?.fullName || 'N/A',
          department: r.employee?.department || 'N/A',
          scheduledShift: expected?.shift?.shiftName || r.shift?.shiftName || 'N/A',
          rosterStatus: expected?.expectedStatus || 'WORKING',
          actualCheckIn: r.firstCheckIn
            ? new Date(r.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          actualCheckOut: r.lastCheckOut
            ? new Date(r.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'N/A',
          locationName: checkInEvent?.matchedLocationName || '—',
          breakMinutes: r.breakDurationMinutes,
          workingHours: r.workingHours,
          lateMinutes: r.lateMinutes,
          earlyLeavingMinutes: r.earlyLeavingMinutes,
          overtimeMinutes: r.overtimeMinutes,
          status: r.status,
          weekOffWorked: isWeekOffWorked ? 'YES' : 'NO',
          holidayWorked: isHolidayWorked ? 'YES' : 'NO',
        };
      });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, department, employeeId } = req.query;
    const now = new Date();
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const targetMonth = parseInt(month, 10) || now.getMonth() + 1;

    const monthStr = String(targetMonth).padStart(2, '0');
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = `${targetYear}-${monthStr}-01`;
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const empQuery = {
      employmentStatus: 'ACTIVE',
      employeeId: { $ne: 'ADM001' },
      email: { $ne: adminEmail },
    };
    if (department) empQuery.department = department;
    if (employeeId) empQuery._id = employeeId;

    const employees = await Employee.find(empQuery).populate('assignedShift');
    const employeeIds = employees.map((e) => e._id);

    const [rosterCtx, summaries] = await Promise.all([
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

    const result = employees.map((emp) => {
      let presentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let weekOffCount = 0;
      let compOffCount = 0;
      let holidayCount = 0;
      let weekOffWorkedCount = 0;
      let holidayWorkedCount = 0;
      let scheduledWorkingCount = 0;

      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;
      let totalEarlyMinutes = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${targetYear}-${monthStr}-${String(d).padStart(2, '0')}`;
        const expected = resolveExpectedSchedule({
          employee: emp,
          dateStr: dStr,
          rostersMap: rosterCtx.rostersMap,
          holidaysMap: rosterCtx.holidaysMap,
          departmentRuleMap: rosterCtx.departmentRuleMap,
        });

        const sumKey = `${emp._id.toString()}_${dStr}`;
        const sum = summariesMap[sumKey] || null;
        const evaluated = resolveDayAttendance({
          expectedSchedule: expected,
          summary: sum,
        });

        if (expected.expectedStatus === 'WORKING') scheduledWorkingCount++;

        if (evaluated.hasPunches) {
          presentCount++;
          if (sum?.status === 'HALF_DAY') halfDayCount++;
          if (sum && sum.lateMinutes > 0) lateCount++;
          if (sum) {
            totalWorkMinutes += (sum.workingHours || 0) * 60;
            totalOvertimeMinutes += sum.overtimeMinutes || 0;
            totalEarlyMinutes += sum.earlyLeavingMinutes || 0;
          }
          if (evaluated.isWeekOffWorked) weekOffWorkedCount++;
          if (evaluated.isHolidayWorked) holidayWorkedCount++;
        } else {
          // No punch: derive correct status without marking legitimate off-days as Absent
          if (expected.expectedStatus === 'WEEK_OFF') {
            weekOffCount++;
          } else if (expected.expectedStatus === 'COMP_OFF') {
            compOffCount++;
          } else if (expected.expectedStatus === 'HOLIDAY') {
            holidayCount++;
          } else {
            // Expected was WORKING and didn't punch
            absentCount++;
          }
        }
      }

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        shiftName: emp.assignedShift?.shiftName || 'N/A',
        totalMonthDays: daysInMonth,
        scheduledWorkingDays: scheduledWorkingCount,
        presentDays: presentCount,
        absentDays: absentCount,
        weekOffDays: weekOffCount,
        compOffDays: compOffCount,
        holidayDays: holidayCount,
        weekOffWorkedDays: weekOffWorkedCount,
        holidayWorkedDays: holidayWorkedCount,
        halfDays: halfDayCount,
        lateDays: lateCount,
        totalEarlyMinutes,
        totalWorkingHours: Number((totalWorkMinutes / 60).toFixed(2)),
        totalOvertimeMinutes,
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLateReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const query = { lateMinutes: { $gt: 0 } };

    if (startDate && endDate) {
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    let records = await AttendanceSummary.find(query)
      .populate('employee', 'employeeId fullName department designation')
      .populate('shift', 'shiftName startTime')
      .sort({ attendanceDate: -1 });

    if (department) {
      records = records.filter((r) => r.employee?.department === department);
    }

    const formatted = records.map((r) => ({
      date: r.attendanceDate,
      employeeId: r.employee?.employeeId || r.employeeId,
      employeeName: r.employee?.fullName || 'N/A',
      department: r.employee?.department || 'N/A',
      shiftName: r.shift?.shiftName || 'N/A',
      shiftStart: r.shift?.startTime || 'N/A',
      actualCheckIn: r.firstCheckIn ? new Date(r.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      lateMinutes: r.lateMinutes,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBreakReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const query = { eventType: { $in: ['BREAK_START', 'BREAK_END'] } };

    if (startDate && endDate) {
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    const events = await AttendanceEvent.find(query)
      .populate('employee', 'employeeId fullName department')
      .sort({ timestamp: 1 });

    // Group events into break sessions
    const sessions = [];
    const openBreaks = {};

    for (const ev of events) {
      if (department && ev.employee?.department !== department) continue;

      const key = `${ev.employeeId}_${ev.attendanceDate}`;
      if (ev.eventType === 'BREAK_START') {
        openBreaks[key] = ev;
      } else if (ev.eventType === 'BREAK_END' && openBreaks[key]) {
        const startEv = openBreaks[key];
        const durationMins = Math.round((new Date(ev.timestamp) - new Date(startEv.timestamp)) / 60000);

        sessions.push({
          date: ev.attendanceDate,
          employeeId: ev.employeeId,
          employeeName: ev.employee?.fullName || 'N/A',
          department: ev.employee?.department || 'N/A',
          breakType: startEv.breakType || 'LUNCH',
          breakStart: new Date(startEv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          breakEnd: new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: durationMins,
        });

        delete openBreaks[key];
      }
    }

    res.json({ success: true, count: sessions.length, data: sessions.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOvertimeReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const query = { overtimeMinutes: { $gt: 0 } };

    if (startDate && endDate) {
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    let records = await AttendanceSummary.find(query)
      .populate('employee', 'employeeId fullName department designation')
      .populate('shift', 'shiftName')
      .sort({ attendanceDate: -1 });

    if (department) {
      records = records.filter((r) => r.employee?.department === department);
    }

    const formatted = records.map((r) => ({
      date: r.attendanceDate,
      employeeId: r.employee?.employeeId || r.employeeId,
      employeeName: r.employee?.fullName || 'N/A',
      department: r.employee?.department || 'N/A',
      shiftName: r.shift?.shiftName || 'N/A',
      scheduledHours: r.scheduledHours,
      actualWorkingHours: r.workingHours,
      overtimeMinutes: r.overtimeMinutes,
      overtimeHours: Number((r.overtimeMinutes / 60).toFixed(2)),
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMissingPunchReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const query = {
      firstCheckIn: { $ne: null },
      lastCheckOut: null,
      status: { $ne: 'ON_BREAK' },
    };

    if (startDate && endDate) {
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    let records = await AttendanceSummary.find(query)
      .populate('employee', 'employeeId fullName department designation')
      .populate('shift', 'shiftName startTime endTime')
      .sort({ attendanceDate: -1 });

    if (department) {
      records = records.filter((r) => r.employee?.department === department);
    }

    const formatted = records.map((r) => ({
      date: r.attendanceDate,
      employeeId: r.employee?.employeeId || r.employeeId,
      employeeName: r.employee?.fullName || 'N/A',
      department: r.employee?.department || 'N/A',
      shiftName: r.shift?.shiftName || 'N/A',
      checkInTime: r.firstCheckIn ? new Date(r.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      missingAction: 'CHECK_OUT',
      status: 'MISSING_PUNCH',
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLocationAuditReport = async (req, res) => {
  try {
    const { date, startDate, endDate, department, employeeId, geofenceStatus } = req.query;
    const query = {};

    if (date) {
      query.attendanceDate = date;
    } else if (startDate && endDate) {
      query.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    if (geofenceStatus) {
      query.geofenceStatus = geofenceStatus;
    }

    let events = await AttendanceEvent.find(query)
      .populate('employee', 'employeeId fullName department designation')
      .populate('matchedLocation', 'locationName locationType allowedRadiusMeters')
      .sort({ timestamp: -1 })
      .limit(300);

    if (department) {
      events = events.filter((e) => e.employee?.department === department);
    }
    if (employeeId) {
      events = events.filter((e) => e.employee?.employeeId === employeeId || e.employeeId === employeeId);
    }

    const formatted = events.map((e) => ({
      date: e.attendanceDate,
      time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      employeeId: e.employee?.employeeId || e.employeeId,
      employeeName: e.employee?.fullName || 'N/A',
      department: e.employee?.department || 'N/A',
      eventType: e.eventType,
      latitude: e.latitude,
      longitude: e.longitude,
      accuracyMeters: e.accuracy || 10,
      matchedLocationName: e.matchedLocationName || e.matchedLocation?.locationName || 'N/A',
      distanceFromLocation: e.distanceFromLocation || 0,
      geofenceStatus: e.geofenceStatus || 'ALLOWED',
      mapUrl: `https://www.google.com/maps?q=${e.latitude},${e.longitude}`,
      hasPhoto: Boolean(e.photoUrl),
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper to fetch or initialize default salary attendance policy
 */
export const getEffectiveSalaryPolicy = async () => {
  let policy = await SalaryAttendancePolicy.findOne().sort({ updatedAt: -1 });
  if (!policy) {
    policy = await SalaryAttendancePolicy.create({
      policyName: 'Default Company Salary Policy',
      countWeekOffAsPaid: true,
      countCompOffAsPaid: true,
      countHolidayAsPaid: true,
      countPaidLeaveAsPaid: true,
      countHolidayWorkedAsExtra: false,
      countWeekOffWorkedAsExtra: false,
    });
  }
  return policy;
};

/**
 * Get salary attendance policy
 */
export const getSalaryPolicy = async (req, res) => {
  try {
    const policy = await getEffectiveSalaryPolicy();
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update salary attendance policy
 */
export const updateSalaryPolicy = async (req, res) => {
  try {
    const {
      policyName,
      countWeekOffAsPaid,
      countCompOffAsPaid,
      countHolidayAsPaid,
      countPaidLeaveAsPaid,
      countHolidayWorkedAsExtra,
      countWeekOffWorkedAsExtra,
    } = req.body;

    let policy = await SalaryAttendancePolicy.findOne().sort({ updatedAt: -1 });
    if (!policy) {
      policy = new SalaryAttendancePolicy();
    }

    if (policyName !== undefined) policy.policyName = policyName;
    if (countWeekOffAsPaid !== undefined) policy.countWeekOffAsPaid = Boolean(countWeekOffAsPaid);
    if (countCompOffAsPaid !== undefined) policy.countCompOffAsPaid = Boolean(countCompOffAsPaid);
    if (countHolidayAsPaid !== undefined) policy.countHolidayAsPaid = Boolean(countHolidayAsPaid);
    if (countPaidLeaveAsPaid !== undefined) policy.countPaidLeaveAsPaid = Boolean(countPaidLeaveAsPaid);
    if (countHolidayWorkedAsExtra !== undefined) policy.countHolidayWorkedAsExtra = Boolean(countHolidayWorkedAsExtra);
    if (countWeekOffWorkedAsExtra !== undefined) policy.countWeekOffWorkedAsExtra = Boolean(countWeekOffWorkedAsExtra);
    policy.updatedBy = req.user?._id;

    await policy.save();

    await logAudit({
      req,
      action: 'UPDATE_SALARY_POLICY',
      targetModel: 'SalaryAttendancePolicy',
      targetId: policy._id,
      targetIdentifier: policy.policyName,
      details: 'Updated salary attendance policy rules',
      afterValue: policy.toObject(),
    });

    res.json({ success: true, message: 'Salary attendance policy updated successfully.', data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Attendance Adjustments
 */
export const getAttendanceAdjustments = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const query = {};

    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      const daysInMonth = new Date(year, month, 0).getDate();
      query.date = {
        $gte: `${year}-${monthStr}-01`,
        $lte: `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`,
      };
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    const adjustments = await AttendanceAdjustment.find(query)
      .populate('employee', 'employeeId fullName department designation')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });

    res.json({ success: true, count: adjustments.length, data: adjustments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create or Update Attendance Adjustment
 */
export const createAttendanceAdjustment = async (req, res) => {
  try {
    const { employeeId, date, originalStatus, adjustedStatus, adjustmentType, reason, referenceDate } = req.body;

    if (!employeeId || !date || !originalStatus || !adjustedStatus || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee, date, original status, adjusted status, and reason.',
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const approvedByName = req.user?.fullName || req.user?.name || req.user?.email || 'HR Admin';

    const adjustment = await AttendanceAdjustment.findOneAndUpdate(
      { employee: employee._id, date },
      {
        employee: employee._id,
        employeeId: employee.employeeId,
        date,
        originalStatus,
        adjustedStatus,
        adjustmentType: adjustmentType || 'CUSTOM',
        reason,
        referenceDate: referenceDate || null,
        approvedBy: req.user?._id,
        approvedByName,
        status: 'APPROVED',
      },
      { upsert: true, new: true, runValidators: true }
    );

    await logAudit({
      req,
      action: 'CREATE_ATTENDANCE_ADJUSTMENT',
      targetModel: 'AttendanceAdjustment',
      targetId: adjustment._id,
      targetIdentifier: `${employee.employeeId} - ${date}`,
      details: `Adjustment for ${employee.fullName} (${employee.employeeId}) on ${date}: ${originalStatus} -> ${adjustedStatus}. Reason: ${reason}`,
      afterValue: adjustment.toObject(),
    });

    res.status(201).json({
      success: true,
      message: `Attendance adjustment saved for ${employee.fullName} on ${date}.`,
      data: adjustment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Attendance Adjustment
 */
export const deleteAttendanceAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustment = await AttendanceAdjustment.findById(id).populate('employee', 'fullName employeeId');
    if (!adjustment) {
      return res.status(404).json({ success: false, message: 'Adjustment record not found.' });
    }

    await AttendanceAdjustment.findByIdAndDelete(id);

    await logAudit({
      req,
      action: 'DELETE_ATTENDANCE_ADJUSTMENT',
      targetModel: 'AttendanceAdjustment',
      targetId: id,
      targetIdentifier: `${adjustment.employeeId} - ${adjustment.date}`,
      details: `Deleted adjustment for ${adjustment.employee?.fullName || adjustment.employeeId} on ${adjustment.date}`,
    });

    res.json({ success: true, message: 'Adjustment deleted and reverted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Month Lock Status & Exceptions
 */
export const getMonthLockStatus = async (req, res) => {
  try {
    const now = new Date();
    const targetYear = parseInt(req.query.year, 10) || now.getFullYear();
    const targetMonth = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const monthStr = String(targetMonth).padStart(2, '0');
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = `${targetYear}-${monthStr}-01`;
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
    const nowStr = now.toISOString().split('T')[0];

    const lock = await PayrollMonthLock.findOne({ year: targetYear, month: targetMonth })
      .populate('finalizedBy', 'name email');

    // Run Month-End Exception Checks
    const [missingPunchesCount, pendingAdjCount, activeEmployees] = await Promise.all([
      AttendanceSummary.countDocuments({
        attendanceDate: { $gte: startDate, $lte: endDate, $lt: nowStr },
        firstCheckIn: { $ne: null },
        lastCheckOut: null,
      }),
      AttendanceAdjustment.countDocuments({
        date: { $gte: startDate, $lte: endDate },
        status: 'PENDING',
      }),
      Employee.find({
        employmentStatus: 'ACTIVE',
        employeeId: { $ne: 'ADM001' },
      }).select('employeeId fullName department assignedShift'),
    ]);

    const unassignedShiftsCount = activeEmployees.filter((e) => !e.assignedShift).length;

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        status: lock ? lock.status : 'OPEN',
        finalizedAt: lock?.finalizedAt || null,
        finalizedByName: lock?.finalizedByName || lock?.finalizedBy?.name || null,
        notes: lock?.notes || '',
        exceptions: {
          missingPunches: missingPunchesCount,
          unassignedShifts: unassignedShiftsCount,
          pendingAdjustments: pendingAdjCount,
          totalActiveEmployees: activeEmployees.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Finalize or Reopen Month
 */
export const finalizeMonth = async (req, res) => {
  try {
    const { year, month, action, notes } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    const targetYear = parseInt(year, 10);
    const targetMonth = parseInt(month, 10);
    const newStatus = action === 'REOPEN' ? 'OPEN' : 'FINALIZED';
    const finalizedByName = req.user?.fullName || req.user?.name || req.user?.email || 'HR Admin';

    const lock = await PayrollMonthLock.findOneAndUpdate(
      { year: targetYear, month: targetMonth },
      {
        year: targetYear,
        month: targetMonth,
        status: newStatus,
        finalizedBy: newStatus === 'FINALIZED' ? req.user?._id : null,
        finalizedByName: newStatus === 'FINALIZED' ? finalizedByName : null,
        finalizedAt: newStatus === 'FINALIZED' ? new Date() : null,
        notes: notes || (newStatus === 'FINALIZED' ? 'Month verified and finalized for payroll' : 'Month reopened by HR'),
      },
      { upsert: true, new: true }
    );

    await logAudit({
      req,
      action: newStatus === 'FINALIZED' ? 'FINALIZE_MONTH' : 'REOPEN_MONTH',
      targetModel: 'PayrollMonthLock',
      targetId: lock._id,
      targetIdentifier: `${targetYear}-${targetMonth}`,
      details: `${newStatus === 'FINALIZED' ? 'Finalized' : 'Reopened'} attendance for ${targetMonth}/${targetYear}`,
      afterValue: lock.toObject(),
    });

    res.json({
      success: true,
      message: `Month ${targetMonth}/${targetYear} is now ${newStatus}.`,
      data: lock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * REPORT 1: MONTHLY ATTENDANCE REGISTER
 * Returns date-wise matrix of all employees for the month with clickable day details
 */
export const getMonthlyAttendanceRegister = async (req, res) => {
  try {
    const { month, year, department, shift, status, employeeId, designation } = req.query;
    const now = new Date();
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const targetMonth = parseInt(month, 10) || now.getMonth() + 1;

    const monthStr = String(targetMonth).padStart(2, '0');
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = `${targetYear}-${monthStr}-01`;
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
    const nowStr = now.toISOString().split('T')[0];

    const dates = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${targetYear}-${monthStr}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(targetYear, targetMonth - 1, d);
      const dayOfWeek = dObj.getDay();
      dates.push({
        dateStr: dStr,
        dayNumber: d,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const empQuery = {
      employmentStatus: 'ACTIVE',
      employeeId: { $ne: 'ADM001' },
      email: { $ne: adminEmail },
    };
    if (department) empQuery.department = department;
    if (designation) empQuery.designation = designation;
    if (employeeId) empQuery._id = employeeId;
    if (shift) empQuery.assignedShift = shift;

    const employees = await Employee.find(empQuery)
      .populate('assignedShift')
      .sort({ fullName: 1 });
    const employeeIds = employees.map((e) => e._id);

    const [rosterCtx, summaries, adjustments, monthLock] = await Promise.all([
      loadRosterContext({ startDate, endDate, employeeIds }),
      AttendanceSummary.find({
        attendanceDate: { $gte: startDate, $lte: endDate },
        employee: { $in: employeeIds },
      })
        .populate('shift')
        .populate({ path: 'events', options: { sort: { timestamp: 1 } } }),
      AttendanceAdjustment.find({
        date: { $gte: startDate, $lte: endDate },
        employee: { $in: employeeIds },
        status: 'APPROVED',
      }).populate('approvedBy', 'name email'),
      PayrollMonthLock.findOne({ year: targetYear, month: targetMonth }),
    ]);

    const summariesMap = {};
    summaries.forEach((s) => {
      summariesMap[`${s.employee.toString()}_${s.attendanceDate}`] = s;
    });

    const adjustmentsMap = {};
    adjustments.forEach((a) => {
      adjustmentsMap[`${a.employee.toString()}_${a.date}`] = a;
    });

    const result = employees.map((emp) => {
      const dailyMap = {};
      let presentCount = 0;
      let absentCount = 0;
      let weekOffCount = 0;
      let compOffCount = 0;
      let holidayCount = 0;
      let holidayWorkedCount = 0;
      let weekOffWorkedCount = 0;
      let leaveCount = 0;
      let missingPunchCount = 0;
      let lateDaysCount = 0;
      let totalLateMinutes = 0;
      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;
      let scheduledWorkingCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${targetYear}-${monthStr}-${String(d).padStart(2, '0')}`;
        const key = `${emp._id.toString()}_${dStr}`;
        const expected = resolveExpectedSchedule({
          employee: emp,
          dateStr: dStr,
          rostersMap: rosterCtx.rostersMap,
          holidaysMap: rosterCtx.holidaysMap,
          departmentRuleMap: rosterCtx.departmentRuleMap,
        });

        const sum = summariesMap[key] || null;
        const adj = adjustmentsMap[key] || null;
        const events = sum?.events || [];
        const checkInEvent = events.find((ev) => ev.eventType === 'CHECK_IN') || events[0];

        if (expected.expectedStatus === 'WORKING') scheduledWorkingCount++;

        const hasPunches = Boolean(sum && (sum.firstCheckIn || events.length > 0));
        let statusCode = 'A';
        let statusTitle = 'Absent';
        let isMissingPunch = false;

        const isWeekOffWorked =
          expected.isWeekOffOverride ||
          (expected.expectedStatus === 'WEEK_OFF' && hasPunches);
        const isHolidayWorked =
          expected.isHolidayOverride ||
          (expected.expectedStatus === 'HOLIDAY' && hasPunches);

        if (hasPunches) {
          if (isWeekOffWorked) {
            statusCode = 'WOW';
            statusTitle = 'Week-Off Worked';
            weekOffWorkedCount++;
            presentCount++;
          } else if (isHolidayWorked) {
            statusCode = 'HW';
            statusTitle = 'Holiday Worked';
            holidayWorkedCount++;
            presentCount++;
          } else {
            statusCode = 'P';
            statusTitle = 'Present';
            presentCount++;
          }

          if (sum.lateMinutes > 0) {
            lateDaysCount++;
            totalLateMinutes += sum.lateMinutes;
          }
          totalWorkMinutes += (sum.workingHours || 0) * 60;
          totalOvertimeMinutes += sum.overtimeMinutes || 0;

          // Check if checkout missing on past date
          if (sum.firstCheckIn && !sum.lastCheckOut && dStr < nowStr) {
            isMissingPunch = true;
            missingPunchCount++;
          }
        } else {
          // No Punches
          if (dStr > nowStr) {
            // Future dates
            if (expected.expectedStatus === 'WEEK_OFF') {
              statusCode = 'WO';
              statusTitle = 'Weekly Off';
              weekOffCount++;
            } else if (expected.expectedStatus === 'COMP_OFF') {
              statusCode = 'CO';
              statusTitle = 'Compensatory Off';
              compOffCount++;
            } else if (expected.expectedStatus === 'HOLIDAY') {
              statusCode = 'H';
              statusTitle = 'Holiday';
              holidayCount++;
            } else if (expected.expectedStatus === 'LEAVE') {
              statusCode = 'L';
              statusTitle = 'Leave';
              leaveCount++;
            } else {
              statusCode = 'SCHEDULED';
              statusTitle = 'Scheduled Working';
            }
          } else {
            // Past date or today with no punch
            if (expected.expectedStatus === 'WEEK_OFF') {
              statusCode = 'WO';
              statusTitle = 'Weekly Off';
              weekOffCount++;
            } else if (expected.expectedStatus === 'COMP_OFF') {
              statusCode = 'CO';
              statusTitle = 'Compensatory Off';
              compOffCount++;
            } else if (expected.expectedStatus === 'HOLIDAY') {
              statusCode = 'H';
              statusTitle = 'Holiday';
              holidayCount++;
            } else if (expected.expectedStatus === 'LEAVE') {
              statusCode = 'L';
              statusTitle = 'Leave';
              leaveCount++;
            } else {
              statusCode = 'A';
              statusTitle = 'Absent';
              absentCount++;
            }
          }
        }

        // Apply manual adjustment if present
        let isAdjusted = false;
        let adjustmentDetails = null;
        if (adj) {
          isAdjusted = true;
          adjustmentDetails = {
            _id: adj._id,
            originalStatus: adj.originalStatus,
            adjustedStatus: adj.adjustedStatus,
            adjustmentType: adj.adjustmentType,
            reason: adj.reason,
            referenceDate: adj.referenceDate,
            approvedByName: adj.approvedByName,
            createdAt: adj.createdAt,
          };
          statusCode = adj.adjustedStatus;
          statusTitle = `Adjusted to ${adj.adjustedStatus}`;
        }

        dailyMap[dStr] = {
          dateStr: dStr,
          dayNumber: d,
          statusCode,
          statusTitle,
          isMissingPunch,
          isWeekOffWorked,
          isHolidayWorked,
          isCompOff: expected.expectedStatus === 'COMP_OFF' || Boolean(expected.compOffForDate),
          compOffForDate: expected.compOffForDate || null,
          rosterStatus: expected.expectedStatus,
          scheduledShift: expected.shift
            ? {
                _id: expected.shift._id,
                shiftName: expected.shift.shiftName,
                shiftCode: expected.shift.shiftCode,
                startTime: expected.shift.startTime,
                endTime: expected.shift.endTime,
                shiftType: expected.shift.shiftType,
              }
            : null,
          actualCheckIn: sum?.firstCheckIn
            ? new Date(sum.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          actualCheckOut: sum?.lastCheckOut
            ? new Date(sum.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null,
          breakDurationMinutes: sum?.breakDurationMinutes || 0,
          workingHours: sum?.workingHours ? Number(sum.workingHours.toFixed(2)) : 0,
          lateMinutes: sum?.lateMinutes || 0,
          earlyLeavingMinutes: sum?.earlyLeavingMinutes || 0,
          overtimeMinutes: sum?.overtimeMinutes || 0,
          locationName: checkInEvent?.matchedLocationName || '—',
          locationDistance: checkInEvent?.distanceFromLocation != null ? Math.round(checkInEvent.distanceFromLocation) : null,
          locationAccuracy: checkInEvent?.accuracy != null ? Math.round(checkInEvent.accuracy) : null,
          isAdjusted,
          adjustmentDetails,
        };
      }

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        assignedShift: emp.assignedShift?.shiftName || 'General',
        daily: dailyMap,
        totals: {
          calendarDays: daysInMonth,
          scheduledWorkingDays: scheduledWorkingCount,
          presentDays: presentCount,
          absentDays: absentCount,
          weekOffDays: weekOffCount,
          compOffDays: compOffCount,
          holidayDays: holidayCount,
          holidayWorkedDays: holidayWorkedCount,
          weekOffWorkedDays: weekOffWorkedCount,
          leaveDays: leaveCount,
          missingPunchDays: missingPunchCount,
          lateDays: lateDaysCount,
          totalLateMinutes,
          totalWorkingHours: Number((totalWorkMinutes / 60).toFixed(2)),
          totalOvertimeMinutes,
        },
      };
    });

    let filtered = result;
    if (status) {
      filtered = filtered.filter((r) =>
        Object.values(r.daily).some((d) => d.statusCode === status)
      );
    }

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth,
      daysInMonth,
      dates,
      count: filtered.length,
      data: filtered,
      monthLock: monthLock || { status: 'OPEN' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * REPORT 2: MONTHLY HR SALARY SUMMARY
 * Provides salary-ready payroll input rows with Payable Days, adjustments, policy application
 */
export const getMonthlySalarySummary = async (req, res) => {
  try {
    const { month, year, department, employeeId } = req.query;
    const now = new Date();
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const targetMonth = parseInt(month, 10) || now.getMonth() + 1;

    const monthStr = String(targetMonth).padStart(2, '0');
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = `${targetYear}-${monthStr}-01`;
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
    const nowStr = now.toISOString().split('T')[0];

    const adminEmail = (process.env.SUPERADMIN_EMAIL || 'admin@hrms.local').toLowerCase();
    const empQuery = {
      employmentStatus: 'ACTIVE',
      employeeId: { $ne: 'ADM001' },
      email: { $ne: adminEmail },
    };
    if (department) empQuery.department = department;
    if (employeeId) empQuery._id = employeeId;

    const [employees, policy, monthLock] = await Promise.all([
      Employee.find(empQuery).populate('assignedShift').sort({ fullName: 1 }),
      getEffectiveSalaryPolicy(),
      PayrollMonthLock.findOne({ year: targetYear, month: targetMonth }).populate('finalizedBy', 'name email'),
    ]);

    const employeeIds = employees.map((e) => e._id);

    const [rosterCtx, summaries, adjustments] = await Promise.all([
      loadRosterContext({ startDate, endDate, employeeIds }),
      AttendanceSummary.find({
        attendanceDate: { $gte: startDate, $lte: endDate },
        employee: { $in: employeeIds },
      }).populate('shift'),
      AttendanceAdjustment.find({
        date: { $gte: startDate, $lte: endDate },
        employee: { $in: employeeIds },
        status: 'APPROVED',
      }).populate('approvedBy', 'name email'),
    ]);

    const summariesMap = {};
    summaries.forEach((s) => {
      summariesMap[`${s.employee.toString()}_${s.attendanceDate}`] = s;
    });

    const adjustmentsMap = {};
    adjustments.forEach((a) => {
      adjustmentsMap[`${a.employee.toString()}_${a.date}`] = a;
    });

    const employeeSummaries = employees.map((emp) => {
      let presentDays = 0;
      let absentDays = 0;
      let weekOffDays = 0;
      let compOffDays = 0;
      let holidayDays = 0;
      let holidayWorkedDays = 0;
      let weekOffWorkedDays = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let missingPunchDays = 0;
      let lateDays = 0;
      let totalLateMinutes = 0;
      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;
      let scheduledWorkingDays = 0;

      const dailyMiniCalendar = [];
      const compOffNotes = [];
      const manualAdjustmentsList = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${targetYear}-${monthStr}-${String(d).padStart(2, '0')}`;
        const key = `${emp._id.toString()}_${dStr}`;
        const expected = resolveExpectedSchedule({
          employee: emp,
          dateStr: dStr,
          rostersMap: rosterCtx.rostersMap,
          holidaysMap: rosterCtx.holidaysMap,
          departmentRuleMap: rosterCtx.departmentRuleMap,
        });

        const sum = summariesMap[key] || null;
        const adj = adjustmentsMap[key] || null;
        const hasPunches = Boolean(sum && sum.firstCheckIn);

        if (expected.expectedStatus === 'WORKING') scheduledWorkingDays++;

        let statusCode = 'A';
        const isWeekOffWorked =
          expected.isWeekOffOverride ||
          (expected.expectedStatus === 'WEEK_OFF' && hasPunches);
        const isHolidayWorked =
          expected.isHolidayOverride ||
          (expected.expectedStatus === 'HOLIDAY' && hasPunches);

        if (hasPunches) {
          if (isWeekOffWorked) {
            statusCode = 'WOW';
            weekOffWorkedCount++;
            presentDays++;
          } else if (isHolidayWorked) {
            statusCode = 'HW';
            holidayWorkedCount++;
            presentDays++;
          } else {
            statusCode = 'P';
            presentDays++;
          }

          if (sum.lateMinutes > 0) {
            lateDays++;
            totalLateMinutes += sum.lateMinutes;
          }
          totalWorkMinutes += (sum.workingHours || 0) * 60;
          totalOvertimeMinutes += sum.overtimeMinutes || 0;

          if (sum.firstCheckIn && !sum.lastCheckOut && dStr < nowStr) {
            missingPunchDays++;
          }
        } else {
          if (dStr > nowStr) {
            if (expected.expectedStatus === 'WEEK_OFF') {
              statusCode = 'WO';
              weekOffDays++;
            } else if (expected.expectedStatus === 'COMP_OFF') {
              statusCode = 'CO';
              compOffDays++;
            } else if (expected.expectedStatus === 'HOLIDAY') {
              statusCode = 'H';
              holidayDays++;
            } else if (expected.expectedStatus === 'LEAVE') {
              statusCode = 'L';
              paidLeaveDays++;
            } else {
              statusCode = 'SCHEDULED';
            }
          } else {
            if (expected.expectedStatus === 'WEEK_OFF') {
              statusCode = 'WO';
              weekOffDays++;
            } else if (expected.expectedStatus === 'COMP_OFF') {
              statusCode = 'CO';
              compOffDays++;
            } else if (expected.expectedStatus === 'HOLIDAY') {
              statusCode = 'H';
              holidayDays++;
            } else if (expected.expectedStatus === 'LEAVE') {
              statusCode = 'L';
              paidLeaveDays++;
            } else {
              statusCode = 'A';
              absentDays++;
            }
          }
        }

        if (expected.expectedStatus === 'COMP_OFF' && expected.compOffForDate) {
          compOffNotes.push(`Comp-Off on ${dStr} (against ${expected.compOffForDate} duty)`);
        }

        if (adj) {
          statusCode = adj.adjustedStatus;
          manualAdjustmentsList.push({
            date: dStr,
            originalStatus: adj.originalStatus,
            adjustedStatus: adj.adjustedStatus,
            reason: adj.reason,
            referenceDate: adj.referenceDate,
          });
        }

        dailyMiniCalendar.push({
          dateStr: dStr,
          day: d,
          statusCode,
          shiftName: expected.shift?.shiftName || '—',
          hours: sum?.workingHours ? Number(sum.workingHours.toFixed(1)) : 0,
        });
      }

      // Transparent Payable Days Calculation
      const payableDays =
        presentDays +
        (policy.countWeekOffAsPaid ? weekOffDays : 0) +
        (policy.countCompOffAsPaid ? compOffDays : 0) +
        (policy.countHolidayAsPaid ? holidayDays : 0) +
        (policy.countPaidLeaveAsPaid ? paidLeaveDays : 0);

      const nonPayableDays = absentDays + unpaidLeaveDays;

      const formulaParts = [`${presentDays} Present`];
      if (policy.countWeekOffAsPaid && weekOffDays > 0) formulaParts.push(`${weekOffDays} Paid WO`);
      if (policy.countCompOffAsPaid && compOffDays > 0) formulaParts.push(`${compOffDays} Paid CO`);
      if (policy.countHolidayAsPaid && holidayDays > 0) formulaParts.push(`${holidayDays} Paid Holiday`);
      if (policy.countPaidLeaveAsPaid && paidLeaveDays > 0) formulaParts.push(`${paidLeaveDays} Paid Leave`);

      const payableFormula = `${formulaParts.join(' + ')} = ${payableDays} Days (${nonPayableDays} Non-Payable)`;

      // Compile adjustment remarks
      const adjustmentNotes = [...compOffNotes];
      if (manualAdjustmentsList.length > 0) {
        adjustmentNotes.push(`${manualAdjustmentsList.length} manual adjustment(s) applied`);
      }
      const attendanceAdjustmentSummary = adjustmentNotes.join('; ') || 'None';

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        assignedShift: emp.assignedShift?.shiftName || 'General',
        month: `${targetMonth}/${targetYear}`,
        calendarDays: daysInMonth,
        scheduledWorkingDays,
        presentDays,
        absentDays,
        weekOffDays,
        compOffDays,
        holidayDays,
        holidayWorkedDays,
        weekOffWorkedDays,
        paidLeaveDays,
        unpaidLeaveDays,
        missingPunchDays,
        lateDays,
        totalLateMinutes,
        totalWorkingHours: Number((totalWorkMinutes / 60).toFixed(2)),
        totalOvertimeHours: Number((totalOvertimeMinutes / 60).toFixed(2)),
        payableDays,
        nonPayableDays,
        payableFormula,
        attendanceAdjustment: attendanceAdjustmentSummary,
        remarks:
          absentDays > 0
            ? `${absentDays} day(s) unauthorized absent`
            : payableDays >= daysInMonth
            ? 'Full month payable'
            : 'Salary-Ready',
        dailyMiniCalendar,
        adjustments: manualAdjustmentsList,
      };
    });

    // Compute Overall Reconciliation KPI
    const totalCount = employeeSummaries.length;
    const sumField = (f) => employeeSummaries.reduce((acc, curr) => acc + (curr[f] || 0), 0);

    const reconciliation = {
      totalEmployees: totalCount,
      totalCalendarDays: daysInMonth * totalCount,
      totalScheduledWorkingDays: sumField('scheduledWorkingDays'),
      totalPresent: sumField('presentDays'),
      totalAbsent: sumField('absentDays'),
      totalWeekOff: sumField('weekOffDays'),
      totalCompOff: sumField('compOffDays'),
      totalHolidays: sumField('holidayDays'),
      totalHolidayWorked: sumField('holidayWorkedDays'),
      totalWeekOffWorked: sumField('weekOffWorkedDays'),
      totalPaidLeave: sumField('paidLeaveDays'),
      totalUnpaidLeave: sumField('unpaidLeaveDays'),
      totalPayableDays: sumField('payableDays'),
      totalWorkingHours: Number(sumField('totalWorkingHours').toFixed(1)),
      totalOvertimeHours: Number(sumField('totalOvertimeHours').toFixed(1)),
    };

    res.json({
      success: true,
      year: targetYear,
      month: targetMonth,
      daysInMonth,
      count: employeeSummaries.length,
      policy,
      monthLock: monthLock || { status: 'OPEN' },
      reconciliation,
      data: employeeSummaries,
      adjustmentsList: adjustments.map((a) => ({
        _id: a._id,
        employeeName: a.employee?.fullName || '—',
        employeeId: a.employee?.employeeId || a.employeeId,
        department: a.employee?.department || '—',
        date: a.date,
        originalStatus: a.originalStatus,
        adjustedStatus: a.adjustedStatus,
        adjustmentType: a.adjustmentType,
        reason: a.reason,
        referenceDate: a.referenceDate,
        approvedByName: a.approvedByName,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

