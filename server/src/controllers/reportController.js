import AttendanceSummary from '../models/AttendanceSummary.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import Employee from '../models/Employee.js';
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
