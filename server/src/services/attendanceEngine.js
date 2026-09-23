/**
 * Attendance Status & Shift Calculation Engine
 * Handles General, Night, and Split shift calculations.
 */

// Helper to parse "HH:mm" into minutes from start of day
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to format minutes into "Xh Ym"
export const formatMinutes = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '0h 0m';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hrs}h ${mins}m`;
};

/**
 * Calculates scheduled duration of a shift in minutes
 */
export const getShiftScheduledMinutes = (shift) => {
  if (!shift) return 480; // default 8h

  if (shift.shiftType === 'SPLIT' && shift.splitSegments && shift.splitSegments.length > 0) {
    let total = 0;
    for (const seg of shift.splitSegments) {
      const start = timeToMinutes(seg.startTime);
      const end = timeToMinutes(seg.endTime);
      if (end >= start) {
        total += end - start;
      } else {
        // Cross midnight segment
        total += (1440 - start) + end;
      }
    }
    return total;
  }

  const start = timeToMinutes(shift.startTime);
  const end = timeToMinutes(shift.endTime);

  if (shift.shiftType === 'NIGHT' || end < start) {
    // Crosses midnight, e.g. 22:00 (1320m) to 06:00 (360m)
    return (1440 - start) + end;
  }

  return end - start;
};

/**
 * Determines whether a punch at a given Date belongs to today's shift
 * or yesterday's night shift.
 */
export const getShiftDateForPunch = (punchDate, shift) => {
  const d = new Date(punchDate);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const punchMinutes = hours * 60 + minutes;

  // Format date as YYYY-MM-DD
  const formatYMD = (dateObj) => {
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const da = String(dateObj.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  if (!shift || shift.shiftType !== 'NIGHT') {
    return formatYMD(d);
  }

  // For night shift (e.g. 22:00 to 06:00):
  // If punch happens in early morning (e.g. before 12:00 noon), it belongs to yesterday's shift start!
  const shiftEndMinutes = timeToMinutes(shift.endTime); // e.g. 360 (06:00)
  // Give a 4-hour window after shift end for check-out
  if (punchMinutes <= shiftEndMinutes + 240) {
    const yesterday = new Date(d);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatYMD(yesterday);
  }

  return formatYMD(d);
};

/**
 * Calculates late minutes based on first check-in and shift start
 */
export const calculateLateMinutes = (firstCheckIn, shift, attendanceDateStr) => {
  if (!firstCheckIn || !shift) return 0;

  const checkInDate = new Date(firstCheckIn);
  const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

  let shiftStartMinutes = timeToMinutes(shift.startTime);
  const grace = shift.gracePeriodMinutes || 0;

  if (shift.shiftType === 'SPLIT' && shift.splitSegments && shift.splitSegments.length > 0) {
    shiftStartMinutes = timeToMinutes(shift.splitSegments[0].startTime);
  }

  const allowedStartMinutes = shiftStartMinutes + grace;

  if (checkInMinutes > allowedStartMinutes) {
    return checkInMinutes - shiftStartMinutes;
  }
  return 0;
};

/**
 * Calculates full attendance summary from raw events
 */
export const calculateAttendanceSummary = (events, shift, attendanceDateStr) => {
  const scheduledMinutes = getShiftScheduledMinutes(shift);
  const scheduledHours = Number((scheduledMinutes / 60).toFixed(2));

  if (!events || events.length === 0) {
    return {
      scheduledHours,
      workingHours: 0,
      breakDurationMinutes: 0,
      lateMinutes: 0,
      earlyLeavingMinutes: 0,
      overtimeMinutes: 0,
      shortHoursMinutes: 0,
      status: 'ABSENT',
      firstCheckIn: null,
      lastCheckOut: null,
      activeBreakStart: null,
      lastEventType: null,
    };
  }

  // Sort chronologically
  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let firstCheckIn = null;
  let lastCheckOut = null;
  let activeBreakStart = null;
  let totalBreakMinutes = 0;
  let totalWorkMinutes = 0;
  let currentCheckIn = null;
  let currentBreakStart = null;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const ts = new Date(ev.timestamp);

    if (ev.eventType === 'CHECK_IN') {
      if (!firstCheckIn) firstCheckIn = ts;
      currentCheckIn = ts;
    } else if (ev.eventType === 'BREAK_START') {
      currentBreakStart = ts;
      activeBreakStart = ts;
    } else if (ev.eventType === 'BREAK_END') {
      if (currentBreakStart) {
        const breakMins = Math.max(0, (ts - currentBreakStart) / (1000 * 60));
        totalBreakMinutes += breakMins;
        currentBreakStart = null;
        activeBreakStart = null;
      }
    } else if (ev.eventType === 'CHECK_OUT') {
      lastCheckOut = ts;
      if (currentCheckIn) {
        const workSpanMins = Math.max(0, (ts - currentCheckIn) / (1000 * 60));
        totalWorkMinutes += workSpanMins;
        currentCheckIn = null;
      }
    }
  }

  // Deduct breaks from work minutes if workSpan included break span
  // In our flow, totalWorkMinutes is the sum of checkin-to-checkout spans minus breaks
  const netWorkMinutes = Math.max(0, totalWorkMinutes - totalBreakMinutes);
  const workingHours = Number((netWorkMinutes / 60).toFixed(2));

  const lateMinutes = calculateLateMinutes(firstCheckIn, shift, attendanceDateStr);

  // Calculate early leaving and overtime if checkout is done
  let earlyLeavingMinutes = 0;
  let overtimeMinutes = 0;
  let shortHoursMinutes = 0;

  const minWorkMins = (shift?.minWorkingHours || 8) * 60;
  if (lastCheckOut) {
    if (netWorkMinutes < minWorkMins) {
      shortHoursMinutes = Math.round(minWorkMins - netWorkMinutes);
    }
    if (netWorkMinutes > scheduledMinutes) {
      overtimeMinutes = Math.round(netWorkMinutes - scheduledMinutes);
    }

    // Check early departure relative to shift end time
    if (shift) {
      const checkOutMinutes = lastCheckOut.getHours() * 60 + lastCheckOut.getMinutes();
      let shiftEndMinutes = timeToMinutes(shift.endTime);
      if (shift.shiftType === 'SPLIT' && shift.splitSegments && shift.splitSegments.length > 0) {
        shiftEndMinutes = timeToMinutes(shift.splitSegments[shift.splitSegments.length - 1].endTime);
      }
      if (shift.shiftType === 'NIGHT') {
        // If night shift checkout was before morning end time
        if (checkOutMinutes < shiftEndMinutes) {
          earlyLeavingMinutes = shiftEndMinutes - checkOutMinutes;
        }
      } else {
        if (checkOutMinutes < shiftEndMinutes) {
          earlyLeavingMinutes = shiftEndMinutes - checkOutMinutes;
        }
      }
    }
  }

  // Determine attendance status
  const lastEvent = sorted[sorted.length - 1];
  const lastEventType = lastEvent.eventType;
  let status = 'PRESENT';

  if (lastEventType === 'BREAK_START') {
    status = 'ON_BREAK';
  } else if (lastEventType === 'CHECK_IN' || lastEventType === 'BREAK_END') {
    status = 'WORKING';
  } else if (lastEventType === 'CHECK_OUT') {
    // If working hours < half day threshold
    const halfDayThresholdMins = (minWorkMins / 2);
    if (netWorkMinutes < halfDayThresholdMins) {
      status = 'HALF_DAY';
    } else if (lateMinutes > 0) {
      status = 'LATE';
    } else {
      status = 'CHECKED_OUT'; // or PRESENT
    }
  }

  return {
    scheduledHours,
    workingHours,
    breakDurationMinutes: Math.round(totalBreakMinutes),
    lateMinutes: Math.round(lateMinutes),
    earlyLeavingMinutes: Math.round(earlyLeavingMinutes),
    overtimeMinutes: Math.round(overtimeMinutes),
    shortHoursMinutes: Math.round(shortHoursMinutes),
    status,
    firstCheckIn,
    lastCheckOut,
    activeBreakStart,
    lastEventType,
  };
};
