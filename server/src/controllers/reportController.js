import AttendanceSummary from '../models/AttendanceSummary.js';
import AttendanceEvent from '../models/AttendanceEvent.js';
import Employee from '../models/Employee.js';

export const getDailyReport = async (req, res) => {
  try {
    const { date, department, shift, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const query = { attendanceDate: targetDate };
    if (shift) query.shift = shift;
    if (status) query.status = status;

    let records = await AttendanceSummary.find(query)
      .populate('employee', 'employeeId fullName department designation mobile')
      .populate('shift', 'shiftName shiftCode startTime endTime shiftType')
      .sort({ 'employee.fullName': 1 });

    if (department) {
      records = records.filter((r) => r.employee?.department === department);
    }

    const formatted = records.map((r) => ({
      date: r.attendanceDate,
      employeeId: r.employee?.employeeId || r.employeeId,
      employeeName: r.employee?.fullName || 'N/A',
      department: r.employee?.department || 'N/A',
      shiftName: r.shift?.shiftName || 'N/A',
      scheduledStart: r.shift?.startTime || 'N/A',
      actualCheckIn: r.firstCheckIn ? new Date(r.firstCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      scheduledEnd: r.shift?.endTime || 'N/A',
      actualCheckOut: r.lastCheckOut ? new Date(r.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      breakMinutes: r.breakDurationMinutes,
      workingHours: r.workingHours,
      lateMinutes: r.lateMinutes,
      earlyLeavingMinutes: r.earlyLeavingMinutes,
      overtimeMinutes: r.overtimeMinutes,
      status: r.status,
    }));

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
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);

    const monthStr = String(targetMonth).padStart(2, '0');
    const startPattern = `^${targetYear}-${monthStr}`;

    const empQuery = { employmentStatus: 'ACTIVE' };
    if (department) empQuery.department = department;
    if (employeeId) empQuery._id = employeeId;

    const employees = await Employee.find(empQuery).populate('assignedShift');

    const summaries = await AttendanceSummary.find({
      attendanceDate: { $regex: new RegExp(startPattern) },
    }).populate('shift');

    const result = employees.map((emp) => {
      const empSummaries = summaries.filter((s) => s.employee.toString() === emp._id.toString());

      let presentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;
      let totalEarlyMinutes = 0;

      empSummaries.forEach((s) => {
        if (['PRESENT', 'LATE', 'WORKING', 'ON_BREAK', 'CHECKED_OUT'].includes(s.status)) {
          presentCount++;
        }
        if (s.status === 'HALF_DAY') {
          halfDayCount++;
        }
        if (s.lateMinutes > 0) {
          lateCount++;
        }
        totalWorkMinutes += (s.workingHours || 0) * 60;
        totalOvertimeMinutes += s.overtimeMinutes || 0;
        totalEarlyMinutes += s.earlyLeavingMinutes || 0;
      });

      // Default 30 or month days
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const absentCount = Math.max(0, daysInMonth - (presentCount + halfDayCount));

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        shiftName: emp.assignedShift?.shiftName || 'N/A',
        totalMonthDays: daysInMonth,
        presentDays: presentCount,
        absentDays: absentCount,
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
