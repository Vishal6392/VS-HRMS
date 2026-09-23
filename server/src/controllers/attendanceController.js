import AttendanceEvent from '../models/AttendanceEvent.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';
import {
  getShiftDateForPunch,
  calculateAttendanceSummary,
} from '../services/attendanceEngine.js';
import { logAudit } from '../services/auditService.js';

export const punchAttendance = async (req, res) => {
  try {
    const { eventType, latitude, longitude, accuracy, photoUrl, breakType = 'LUNCH', notes = '' } = req.body;

    if (!eventType || !['CHECK_IN', 'BREAK_START', 'BREAK_END', 'CHECK_OUT'].includes(eventType)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing attendance event type.' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (GPS) are required to verify attendance.',
      });
    }

    // Photo verification is strictly required for CHECK_IN and CHECK_OUT only (breaks do not require selfie)
    const requiresPhoto = eventType === 'CHECK_IN' || eventType === 'CHECK_OUT';
    if (requiresPhoto && (!photoUrl || photoUrl.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Live photo verification is required for Check In and Check Out.',
      });
    }

    // Get current employee
    const employee = await Employee.findById(req.user.employee).populate('assignedShift');
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not associated with this user.' });
    }

    if (employee.employmentStatus !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Your employment status is inactive. Cannot mark attendance.' });
    }

    const shift = employee.assignedShift;
    if (!shift) {
      return res.status(400).json({ success: false, message: 'No shift assigned to employee. Contact HR.' });
    }

    const punchNow = new Date();
    const attendanceDate = getShiftDateForPunch(punchNow, shift);

    // Fetch existing summary and events for today's shift
    let summary = await AttendanceSummary.findOne({
      employee: employee._id,
      attendanceDate,
    }).populate('events');

    const existingEvents = summary?.events || [];
    const sortedEvents = [...existingEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const lastEvent = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1] : null;

    // Strict state sequence enforcement
    if (eventType === 'CHECK_IN') {
      if (lastEvent) {
        if (lastEvent.eventType === 'CHECK_IN' || lastEvent.eventType === 'BREAK_END') {
          return res.status(400).json({ success: false, message: 'You have already checked in for this shift.' });
        }
        if (lastEvent.eventType === 'BREAK_START') {
          return res.status(400).json({ success: false, message: 'You are currently on a break. Please end break first.' });
        }
        if (lastEvent.eventType === 'CHECK_OUT') {
          // If shift is SPLIT, check if second segment is allowed
          if (shift.shiftType === 'SPLIT') {
            const checkInCount = sortedEvents.filter((e) => e.eventType === 'CHECK_IN').length;
            if (checkInCount >= 2) {
              return res.status(400).json({ success: false, message: 'Both split shift segments have already been completed.' });
            }
          } else {
            return res.status(400).json({ success: false, message: 'You have already checked out for this shift.' });
          }
        }
      }
    } else if (eventType === 'BREAK_START') {
      if (!lastEvent || (lastEvent.eventType !== 'CHECK_IN' && lastEvent.eventType !== 'BREAK_END')) {
        return res.status(400).json({ success: false, message: 'You must check in before starting a break.' });
      }
    } else if (eventType === 'BREAK_END') {
      if (!lastEvent || lastEvent.eventType !== 'BREAK_START') {
        return res.status(400).json({ success: false, message: 'You are not currently on an active break.' });
      }
    } else if (eventType === 'CHECK_OUT') {
      if (!lastEvent) {
        return res.status(400).json({ success: false, message: 'You must check in before checking out.' });
      }
      if (lastEvent.eventType === 'BREAK_START') {
        return res.status(400).json({
          success: false,
          message: 'Please end your active break before checking out.',
        });
      }
      if (lastEvent.eventType === 'CHECK_OUT') {
        return res.status(400).json({ success: false, message: 'You have already checked out for this shift.' });
      }
    }

    // Determine segment index if split shift
    let segmentIndex = 0;
    if (shift.shiftType === 'SPLIT') {
      const priorCheckIns = sortedEvents.filter((e) => e.eventType === 'CHECK_IN').length;
      segmentIndex = eventType === 'CHECK_IN' ? priorCheckIns : Math.max(0, priorCheckIns - 1);
    }

    // Record Attendance Event
    const newEvent = await AttendanceEvent.create({
      employee: employee._id,
      employeeId: employee.employeeId,
      attendanceDate,
      eventType,
      timestamp: punchNow,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy) || 0,
      photoUrl,
      breakType,
      segmentIndex,
      deviceMetadata: {
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || '',
      },
      notes,
    });

    const allEvents = [...existingEvents, newEvent];
    const calculations = calculateAttendanceSummary(allEvents, shift, attendanceDate);

    if (!summary) {
      summary = new AttendanceSummary({
        employee: employee._id,
        employeeId: employee.employeeId,
        attendanceDate,
        shift: shift._id,
        events: [newEvent._id],
        ...calculations,
      });
    } else {
      summary.events.push(newEvent._id);
      Object.assign(summary, calculations);
    }

    await summary.save();

    const populatedSummary = await AttendanceSummary.findById(summary._id)
      .populate('shift')
      .populate('events');

    res.json({
      success: true,
      message: `${eventType.replace('_', ' ')} recorded successfully!`,
      data: {
        summary: populatedSummary,
        event: newEvent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.employee).populate('assignedShift');
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee profile not found.' });
    }

    const shift = employee.assignedShift;
    const now = new Date();
    const todayDate = getShiftDateForPunch(now, shift);

    let summary = await AttendanceSummary.findOne({
      employee: employee._id,
      attendanceDate: todayDate,
    })
      .populate('shift')
      .populate({
        path: 'events',
        options: { sort: { timestamp: 1 } },
      });

    res.json({
      success: true,
      attendanceDate: todayDate,
      shift,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
      },
      summary: summary || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { employee: req.user.employee };

    if (startDate && endDate) {
      filter.attendanceDate = { $gte: startDate, $lte: endDate };
    }

    const summaries = await AttendanceSummary.find(filter)
      .populate('shift')
      .populate('events')
      .sort({ attendanceDate: -1 });

    res.json({ success: true, count: summaries.length, data: summaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const { date, department, shift, status, search, page = 1, limit = 50 } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const matchQuery = { attendanceDate: targetDate };
    if (shift) matchQuery.shift = shift;
    if (status) matchQuery.status = status;

    // Fetch summaries for targetDate
    let summaries = await AttendanceSummary.find(matchQuery)
      .populate({
        path: 'employee',
        select: 'employeeId fullName email department designation profilePhoto assignedShift employmentStatus',
      })
      .populate('shift')
      .populate('events')
      .sort({ 'employee.fullName': 1 });

    // Filter by department or search string on employee
    if (department) {
      summaries = summaries.filter((s) => s.employee?.department === department);
    }
    if (search) {
      const q = search.toLowerCase();
      summaries = summaries.filter(
        (s) =>
          s.employee?.fullName?.toLowerCase().includes(q) ||
          s.employee?.employeeId?.toLowerCase().includes(q)
      );
    }

    // Also get list of all active employees to know who is absent
    const allEmployees = await Employee.find({ employmentStatus: 'ACTIVE' })
      .populate('assignedShift');

    const totalActive = allEmployees.length;
    const presentCount = summaries.filter((s) => ['PRESENT', 'LATE', 'WORKING', 'ON_BREAK', 'CHECKED_OUT', 'HALF_DAY'].includes(s.status)).length;
    const lateCount = summaries.filter((s) => s.lateMinutes > 0).length;
    const onBreakCount = summaries.filter((s) => s.status === 'ON_BREAK').length;
    const missingPunchCount = summaries.filter((s) => s.status === 'MISSING_PUNCH').length;
    const overtimeCount = summaries.filter((s) => s.overtimeMinutes > 0).length;
    const absentCount = Math.max(0, totalActive - presentCount);

    res.json({
      success: true,
      date: targetDate,
      kpis: {
        totalEmployees: totalActive,
        presentToday: presentCount,
        absentToday: absentCount,
        lateToday: lateCount,
        onBreak: onBreakCount,
        missingPunch: missingPunchCount,
        overtime: overtimeCount,
      },
      data: summaries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceDetail = async (req, res) => {
  try {
    const summary = await AttendanceSummary.findById(req.params.id)
      .populate({
        path: 'employee',
        populate: { path: 'assignedShift' },
      })
      .populate('shift')
      .populate({
        path: 'events',
        options: { sort: { timestamp: 1 } },
      });

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustAttendance = async (req, res) => {
  try {
    const { status, workingHours, reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, message: 'A reason is required to adjust attendance.' });
    }

    const summary = await AttendanceSummary.findById(req.params.id).populate('employee');
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const beforeValue = {
      status: summary.status,
      workingHours: summary.workingHours,
    };

    if (status) summary.status = status;
    if (workingHours !== undefined) summary.workingHours = Number(workingHours);
    summary.isManualAdjustment = true;
    summary.adjustmentReason = reason.trim();

    await summary.save();

    await logAudit({
      req,
      action: 'ATTENDANCE_ADJUSTED',
      targetModel: 'AttendanceSummary',
      targetId: summary._id,
      targetIdentifier: `${summary.employee?.fullName} (${summary.attendanceDate})`,
      details: `Manual attendance adjustment: ${reason}`,
      beforeValue,
      afterValue: { status: summary.status, workingHours: summary.workingHours, reason: summary.adjustmentReason },
    });

    res.json({ success: true, message: 'Attendance record adjusted successfully.', data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
