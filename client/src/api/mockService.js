/**
 * In-Browser Mock Service for GitHub Pages (Static Hosting)
 * Enables 100% full software functionality directly in the browser when running without a live Node.js server.
 */

const STORAGE_KEYS = {
  USERS: 'vs_hrms_mock_users',
  EMPLOYEES: 'vs_hrms_mock_employees',
  SHIFTS: 'vs_hrms_mock_shifts',
  EVENTS: 'vs_hrms_mock_events',
  SUMMARIES: 'vs_hrms_mock_summaries',
  AUDIT: 'vs_hrms_mock_audit',
  INITIALIZED: 'vs_hrms_mock_initialized_v2',
};

// Initial Seed Data
const DEFAULT_SHIFTS = [
  {
    _id: 'shift_gen',
    shiftName: 'General Day Shift',
    shiftCode: 'GEN-01',
    shiftType: 'GENERAL',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: 15,
    minWorkingHours: 8,
    breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 60 },
    isActive: true,
    description: 'Standard 9-hour corporate schedule with 1-hour lunch break.',
  },
  {
    _id: 'shift_ngt',
    shiftName: 'Night Operations Shift',
    shiftCode: 'NGT-01',
    shiftType: 'NIGHT',
    startTime: '22:00',
    endTime: '06:00',
    gracePeriodMinutes: 15,
    minWorkingHours: 7.5,
    breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 45 },
    isActive: true,
    description: 'Overnight shift crossing midnight (10:00 PM to 06:00 AM next day).',
  },
  {
    _id: 'shift_spl',
    shiftName: 'Hospitality Split Shift',
    shiftCode: 'SPL-01',
    shiftType: 'SPLIT',
    startTime: '06:00',
    endTime: '22:00',
    gracePeriodMinutes: 15,
    minWorkingHours: 8,
    breakPolicy: { allowedBreaks: 2, maxBreakMinutes: 30 },
    splitSegments: [
      { segmentName: 'Morning Service', startTime: '06:00', endTime: '10:00' },
      { segmentName: 'Evening Service', startTime: '18:00', endTime: '22:00' },
    ],
    isActive: true,
    description: 'Split schedule with two distinct duty segments in a single calendar day.',
  },
];

const DEFAULT_EMPLOYEES = [];

const DEFAULT_USERS = [
  {
    _id: 'usr_admin',
    email: 'admin@hrms.local',
    password: 'Admin@123',
    role: 'admin',
    employee: null,
    isActive: true,
  },
];

const samplePhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%232563eb"/><circle cx="100" cy="80" r="40" fill="%23ffffff"/><path d="M40 180 C40 130 160 130 160 180 Z" fill="%23ffffff"/></svg>';

function initMockStorage() {
  const currentVer = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (currentVer !== 'v5_clean') {
    // Keep custom employees created by user, but filter out legacy ADM001 employee
    let existingEmps = [];
    try {
      existingEmps = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]')
        .filter((e) => e.employeeId !== 'ADM001' && e.email !== 'admin@hrms.local');
    } catch {}

    const cleanAdminUser = { ...DEFAULT_USERS[0] };

    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(DEFAULT_SHIFTS));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(existingEmps));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([cleanAdminUser]));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'v5_clean');

    // Also update saved user session if present
    try {
      const curUser = JSON.parse(localStorage.getItem('hrms_user') || 'null');
      if (curUser && (curUser.email === 'admin@hrms.local' || curUser.role === 'admin')) {
        curUser.employee = null;
        localStorage.setItem('hrms_user', JSON.stringify(curUser));
      }
    } catch {}
  }

  // Auto-heal: Ensure all employees have a corresponding login in USERS
  try {
    const emps = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
    const usrs = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    let usersUpdated = false;

    emps.forEach((emp) => {
      const emailLower = emp.email?.toLowerCase().trim();
      const hasUser = usrs.some((u) => u.email?.toLowerCase().trim() === emailLower);
      if (!hasUser && emailLower) {
        usrs.push({
          _id: `usr_${emp._id || Date.now()}`,
          email: emp.email,
          password: emp.password || 'Password@123',
          role: emp.role || 'employee',
          employee: emp,
          isActive: true,
        });
        usersUpdated = true;
      }
    });

    if (usersUpdated) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usrs));
    }
  } catch (e) {
    console.warn('Auto-heal check error:', e);
  }

  // Auto-cleanup photos older than 40 days to preserve storage
  try {
    const evts = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 40);
    let photoCleaned = false;
    evts.forEach((ev) => {
      if (new Date(ev.timestamp) < cutoff && ev.photoUrl) {
        ev.photoUrl = '';
        photoCleaned = true;
      }
    });
    if (photoCleaned) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(evts));
    }
  } catch (e) {}
}

initMockStorage();

export const mockHandleRequest = async (config) => {
  initMockStorage();

  const url = config.url.replace('/api', '');
  const method = (config.method || 'get').toLowerCase();
  const data = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});

  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const employees = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
  const shifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS) || '[]');
  let summaries = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUMMARIES) || '[]');
  let events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
  let auditLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT) || '[]');

  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem('hrms_user'));
    } catch {
      return null;
    }
  };

  // 1. Auth Login (Supports Email OR Employee ID)
  if (url === '/auth/login' && method === 'post') {
    const { email, password, identifier } = data;
    const loginQuery = (identifier || email || '').toLowerCase().trim();

    const user = users.find((u) => {
      const emailMatch = u.email?.toLowerCase().trim() === loginQuery;
      const empIdMatch = u.employee?.employeeId?.toLowerCase().trim() === loginQuery;
      return emailMatch || empIdMatch;
    });

    if (!user || user.password !== password) {
      return {
        status: 401,
        data: {
          success: false,
          message: 'Invalid credentials. Please check your email/employee ID and password.',
        },
      };
    }

    if (!user.isActive) {
      return { status: 403, data: { success: false, message: 'Account is deactivated. Contact HR.' } };
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'Login successful',
        token: `mock_jwt_token_${user._id}`,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          employee: user.employee,
        },
      },
    };
  }

  // 1b. Forgot Password - Identity Verification
  if (url === '/auth/forgot-password/verify' && method === 'post') {
    const { identifier, mobile } = data;
    const cleanId = (identifier || '').toLowerCase().trim();
    const cleanMobile = (mobile || '').replace(/\D/g, '');

    const user = users.find((u) => {
      const emailMatch = u.email?.toLowerCase().trim() === cleanId;
      const empIdMatch = u.employee?.employeeId?.toLowerCase().trim() === cleanId;
      return emailMatch || empIdMatch;
    });

    if (!user) {
      return {
        status: 404,
        data: {
          success: false,
          message: 'No registered employee or user found with this Email or Employee ID.',
        },
      };
    }

    if (user.role === 'admin') {
      return {
        status: 403,
        data: {
          success: false,
          message: 'SuperAdmin credentials cannot be reset from this form. Please update SUPERADMIN_PASSWORD in Render Environment Variables.',
        },
      };
    }

    const emp = user.employee || employees.find((e) => e.email?.toLowerCase().trim() === user.email?.toLowerCase().trim());

    if (emp && cleanMobile) {
      const empMobileDigits = (emp.mobile || '').replace(/\D/g, '');
      if (empMobileDigits && !empMobileDigits.endsWith(cleanMobile.slice(-4)) && !empMobileDigits.includes(cleanMobile)) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'Mobile number does not match company records for this employee.',
          },
        };
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'Identity verified successfully.',
        user: {
          fullName: emp?.fullName || 'Super Admin',
          employeeId: emp?.employeeId || 'ADMIN',
          email: user.email,
          department: emp?.department || 'Administration',
          mobileMasked: emp?.mobile ? emp.mobile.slice(0, 4) + '••••' + emp.mobile.slice(-4) : 'Verified',
        },
      },
    };
  }

  // 1c. Forgot Password - Reset Execution
  if (url === '/auth/forgot-password/reset' && method === 'post') {
    const { identifier, newPassword } = data;
    const cleanId = (identifier || '').toLowerCase().trim();

    if (!newPassword || newPassword.length < 6) {
      return { status: 400, data: { success: false, message: 'Password must be at least 6 characters.' } };
    }

    const user = users.find((u) => {
      const emailMatch = u.email?.toLowerCase().trim() === cleanId;
      const empIdMatch = u.employee?.employeeId?.toLowerCase().trim() === cleanId;
      return emailMatch || empIdMatch;
    });

    if (!user) {
      return { status: 404, data: { success: false, message: 'User account not found.' } };
    }

    if (user.role === 'admin') {
      return {
        status: 403,
        data: {
          success: false,
          message: 'SuperAdmin credentials are securely managed via Render Environment Variables (SUPERADMIN_PASSWORD). Reset from website UI is disabled for security.',
        },
      };
    }

    user.password = newPassword;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    return {
      status: 200,
      data: {
        success: true,
        message: 'Password successfully updated! You can now log in with your new password.',
      },
    };
  }

  // 2. Auth Me
  if (url === '/auth/me' && method === 'get') {
    const cur = getSavedUser();
    return { status: 200, data: { success: true, user: cur } };
  }

  // 3. Auth Change Password
  if (url === '/auth/change-password' && method === 'post') {
    const cur = getSavedUser();
    if (cur && cur.email) {
      const u = users.find((x) => x.email?.toLowerCase() === cur.email?.toLowerCase());
      if (u) {
        u.password = data.newPassword;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }
    return { status: 200, data: { success: true, message: 'Password updated successfully.' } };
  }

  // 4. Shifts
  if (url.startsWith('/shifts') && method === 'get') {
    return { status: 200, data: { success: true, count: shifts.length, data: shifts } };
  }
  if (url === '/shifts' && method === 'post') {
    const newShift = { ...data, _id: `shift_${Date.now()}`, isActive: true };
    shifts.push(newShift);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    return { status: 201, data: { success: true, message: 'Shift created successfully.', data: newShift } };
  }
  if (url.includes('/shifts/') && method === 'put') {
    const id = url.split('/shifts/')[1];
    const idx = shifts.findIndex((s) => s._id === id);
    if (idx !== -1) {
      shifts[idx] = { ...shifts[idx], ...data };
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      return { status: 200, data: { success: true, message: 'Shift updated.', data: shifts[idx] } };
    }
  }
  if (url.includes('/shifts/') && url.includes('/toggle-status')) {
    const id = url.split('/shifts/')[1].split('/')[0];
    const shift = shifts.find((s) => s._id === id);
    if (shift) {
      shift.isActive = !shift.isActive;
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      return { status: 200, data: { success: true, message: 'Status toggled', data: shift } };
    }
  }

  // 5. Employees
  if (url.startsWith('/employees') && method === 'get') {
    return { status: 200, data: { success: true, total: employees.length, data: employees } };
  }
  if (url === '/employees' && method === 'post') {
    const assignedShiftObj = shifts.find((s) => s._id === data.assignedShift) || shifts[0];
    const newEmp = {
      ...data,
      _id: `emp_${Date.now()}`,
      assignedShift: assignedShiftObj,
      employmentStatus: 'ACTIVE',
    };
    employees.push(newEmp);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    // ALSO CREATE USER LOGIN ACCOUNT
    const newUser = {
      _id: `usr_${newEmp._id}`,
      email: newEmp.email,
      password: data.password || 'Password@123',
      role: data.role || 'employee',
      employee: newEmp,
      isActive: true,
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    return { status: 201, data: { success: true, message: 'Employee created.', data: newEmp } };
  }
  if (url.includes('/employees/') && url.includes('/reset-password') && method === 'post') {
    const id = url.split('/employees/')[1].split('/')[0];
    const emp = employees.find((e) => e._id === id || e.employeeId === id);
    if (emp) {
      const u = users.find(
        (usr) =>
          usr.email?.toLowerCase().trim() === emp.email?.toLowerCase().trim() ||
          usr.employee?.employeeId === emp.employeeId
      );
      if (u) {
        u.password = data.newPassword || 'Password@123';
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return {
          status: 200,
          data: {
            success: true,
            message: `Password reset successfully to: ${u.password}`,
          },
        };
      }
    }
    return { status: 404, data: { success: false, message: 'Employee user account not found.' } };
  }
  if (url.includes('/employees/') && method === 'put') {
    const id = url.split('/employees/')[1].split('?')[0];
    const idx = employees.findIndex((e) => e._id === id);
    if (idx !== -1) {
      const oldEmail = employees[idx].email;
      employees[idx] = { ...employees[idx], ...data };
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

      // Sync changes to User credentials
      const userIdx = users.findIndex(
        (u) =>
          u.email?.toLowerCase().trim() === oldEmail?.toLowerCase().trim() ||
          u.employee?._id === id ||
          u.employee?.employeeId === employees[idx].employeeId
      );
      if (userIdx !== -1) {
        if (data.email) users[userIdx].email = data.email.toLowerCase().trim();
        users[userIdx].employee = { ...users[userIdx].employee, ...employees[idx] };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        // Update active session if this was the logged-in user
        const curUser = getSavedUser();
        if (curUser?._id === users[userIdx]._id || curUser?.email === oldEmail) {
          localStorage.setItem(
            'hrms_user',
            JSON.stringify({ ...curUser, email: users[userIdx].email, employee: employees[idx] })
          );
        }
      }

      return { status: 200, data: { success: true, message: 'Employee updated.', data: employees[idx] } };
    }
  }
  if (url.includes('/employees/') && method === 'delete') {
    const id = url.split('/employees/')[1].split('?')[0];
    const emp = employees.find((e) => e._id === id);
    if (!emp) {
      return { status: 404, data: { success: false, message: 'Employee not found.' } };
    }
    if (emp.employeeId === 'ADM001' || emp.email === 'admin@hrms.local') {
      return { status: 400, data: { success: false, message: 'SuperAdmin account cannot be deleted.' } };
    }
    const updatedEmployees = employees.filter((e) => e._id !== id);
    const updatedUsers = users.filter(
      (u) =>
        u.email?.toLowerCase().trim() !== emp.email?.toLowerCase().trim() &&
        u.employee?._id !== id &&
        u.employee?.employeeId !== emp.employeeId
    );
    const updatedEvents = events.filter((ev) => ev.employeeId !== emp.employeeId);
    const updatedSummaries = summaries.filter((sm) => sm.employeeId !== emp.employeeId);

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedEmployees));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updatedEvents));
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(updatedSummaries));

    return {
      status: 200,
      data: { success: true, message: `Employee ${emp.fullName} (${emp.employeeId}) deleted successfully.` },
    };
  }
  if (url.includes('/employees/') && url.includes('/toggle-status')) {
    const id = url.split('/employees/')[1].split('/')[0];
    const emp = employees.find((e) => e._id === id);
    if (emp) {
      emp.employmentStatus = emp.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      return { status: 200, data: { success: true, message: 'Status toggled', data: emp } };
    }
  }

  // 6. Attendance Today
  if (url === '/attendance/today' && method === 'get') {
    const cur = getSavedUser();
    const today = new Date().toISOString().split('T')[0];
    const empId = cur?.employee?.employeeId || 'EMP101';
    const empObj = employees.find((e) => e.employeeId === empId) || employees[1];

    let summary = summaries.find((s) => s.employeeId === empId && s.attendanceDate === today);

    return {
      status: 200,
      data: {
        success: true,
        attendanceDate: today,
        shift: empObj.assignedShift || shifts[0],
        employee: empObj,
        summary: summary || null,
      },
    };
  }

  // 7. Attendance Punch
  if (url === '/attendance/punch' && method === 'post') {
    const cur = getSavedUser();
    const today = new Date().toISOString().split('T')[0];
    const empId = cur?.employee?.employeeId || 'EMP101';
    const empObj = employees.find((e) => e.employeeId === empId) || employees[1];
    const shift = empObj.assignedShift || shifts[0];

    const punchNow = new Date();
    const isCheckInOut = data.eventType === 'CHECK_IN' || data.eventType === 'CHECK_OUT';
    const newEvent = {
      _id: `ev_${Date.now()}`,
      employee: empObj,
      employeeId: empId,
      attendanceDate: today,
      eventType: data.eventType,
      timestamp: punchNow.toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy || 12,
      photoUrl: isCheckInOut ? data.photoUrl : '',
      breakType: data.breakType || 'LUNCH',
    };

    events.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    let summary = summaries.find((s) => s.employeeId === empId && s.attendanceDate === today);

    let newStatus = 'PRESENT';
    if (data.eventType === 'CHECK_IN') newStatus = 'WORKING';
    if (data.eventType === 'BREAK_START') newStatus = 'ON_BREAK';
    if (data.eventType === 'BREAK_END') newStatus = 'WORKING';
    if (data.eventType === 'CHECK_OUT') newStatus = 'CHECKED_OUT';

    let lateMins = 0;
    if (data.eventType === 'CHECK_IN' && shift) {
      const punchMins = punchNow.getHours() * 60 + punchNow.getMinutes();
      const [sh, sm] = (shift.startTime || '09:30').split(':').map(Number);
      const shiftStartMins = sh * 60 + sm;
      const grace = shift.gracePeriodMinutes || 15;
      if (punchMins > shiftStartMins + grace) {
        const [eh, em] = (shift.endTime || '18:30').split(':').map(Number);
        const shiftEndMins = eh * 60 + em;
        if (shift.shiftType !== 'NIGHT' && punchMins > shiftEndMins) {
          lateMins = Math.min(punchMins - shiftStartMins, shiftEndMins - shiftStartMins);
        } else {
          lateMins = punchMins - shiftStartMins;
        }
      }
    }

    if (!summary) {
      summary = {
        _id: `sum_${Date.now()}`,
        employee: empObj,
        employeeId: empId,
        attendanceDate: today,
        shift,
        scheduledHours: 9.0,
        workingHours: data.eventType === 'CHECK_OUT' ? 8.5 : 0,
        breakDurationMinutes: 0,
        lateMinutes: lateMins,
        earlyLeavingMinutes: 0,
        overtimeMinutes: 0,
        status: lateMins > 0 ? 'LATE' : newStatus,
        firstCheckIn: punchNow.toISOString(),
        lastCheckOut: data.eventType === 'CHECK_OUT' ? punchNow.toISOString() : null,
        activeBreakStart: data.eventType === 'BREAK_START' ? punchNow.toISOString() : null,
        events: [newEvent],
      };
      summaries.push(summary);
    } else {
      summary.status = newStatus;
      summary.events.push(newEvent);
      if (data.eventType === 'BREAK_START') {
        summary.activeBreakStart = punchNow.toISOString();
      }
      if (data.eventType === 'BREAK_END') {
        summary.activeBreakStart = null;
        summary.breakDurationMinutes = (summary.breakDurationMinutes || 0) + 30;
      }
      if (data.eventType === 'CHECK_OUT') {
        summary.lastCheckOut = punchNow.toISOString();
        summary.workingHours = 8.5;
      }
    }

    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(summaries));

    return {
      status: 200,
      data: {
        success: true,
        message: `${data.eventType.replace('_', ' ')} recorded successfully!`,
        data: { summary, event: newEvent },
      },
    };
  }

  // 8. Attendance My History
  if (url.startsWith('/attendance/my-history') && method === 'get') {
    const cur = getSavedUser();
    const empId = cur?.employee?.employeeId;
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const month = urlParams.get('month');
    const year = urlParams.get('year');

    let mySummaries = summaries.filter((s) => !empId || s.employeeId === empId || s.employee?._id === cur?.employee?._id);

    if (month && year) {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      mySummaries = mySummaries.filter((s) => s.attendanceDate?.startsWith(monthPrefix));
    }

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkingHours = 0;
    let totalOvertimeMinutes = 0;
    let totalLateMinutes = 0;
    let totalBreakMinutes = 0;

    mySummaries.forEach((s) => {
      if (['PRESENT', 'WORKING', 'CHECKED_OUT', 'LATE', 'HALF_DAY'].includes(s.status)) {
        presentDays++;
      } else if (s.status === 'ABSENT') {
        absentDays++;
      }
      if (s.status === 'HALF_DAY') halfDays++;
      if (s.lateMinutes > 0) {
        lateDays++;
        totalLateMinutes += s.lateMinutes;
      }
      totalWorkingHours += s.workingHours || 0;
      totalOvertimeMinutes += s.overtimeMinutes || 0;
      totalBreakMinutes += s.breakDurationMinutes || 0;
    });

    const onTimePercentage =
      presentDays > 0 ? Math.max(0, Math.round(((presentDays - lateDays) / presentDays) * 100)) : 100;

    return {
      status: 200,
      data: {
        success: true,
        count: mySummaries.length,
        kpis: {
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          totalWorkingHours: Number(totalWorkingHours.toFixed(1)),
          totalOvertimeHours: Number((totalOvertimeMinutes / 60).toFixed(1)),
          totalLateMinutes,
          totalBreakMinutes,
          onTimePercentage,
        },
        data: mySummaries,
      },
    };
  }

  // 9. Attendance All (Admin)
  if (url.startsWith('/attendance/all') && method === 'get') {
    const today = new Date().toISOString().split('T')[0];
    const totalEmployees = employees.length;
    const presentToday = summaries.filter((s) => ['PRESENT', 'WORKING', 'ON_BREAK', 'CHECKED_OUT', 'LATE', 'HALF_DAY'].includes(s.status)).length;
    const lateToday = summaries.filter((s) => s.lateMinutes > 0).length;
    const onBreak = summaries.filter((s) => s.status === 'ON_BREAK').length;
    const missingPunch = summaries.filter((s) => s.status === 'MISSING_PUNCH').length;
    const overtime = summaries.filter((s) => s.overtimeMinutes > 0).length;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    return {
      status: 200,
      data: {
        success: true,
        date: today,
        kpis: {
          totalEmployees,
          presentToday,
          absentToday,
          lateToday,
          onBreak,
          missingPunch,
          overtime,
        },
        data: summaries,
      },
    };
  }

  // 10. Attendance Adjust
  if (url.includes('/attendance/adjust/') && method === 'put') {
    const id = url.split('/attendance/adjust/')[1];
    const summary = summaries.find((s) => s._id === id);
    if (summary) {
      if (data.status) summary.status = data.status;
      if (data.workingHours !== undefined) summary.workingHours = data.workingHours;
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(summaries));
      return { status: 200, data: { success: true, message: 'Record adjusted successfully.', data: summary } };
    }
  }

  // 11. Reports
  if (url.startsWith('/reports/') && method === 'get') {
    const reportType = url.split('/reports/')[1].split('?')[0];

    if (reportType === 'daily') {
      const formatted = summaries.map((r) => ({
        date: r.attendanceDate,
        employeeId: r.employeeId,
        employeeName: r.employee?.fullName || 'Anita Desai',
        department: r.employee?.department || 'Quality Assurance',
        shiftName: r.shift?.shiftName || 'General Day Shift',
        scheduledStart: '09:30',
        actualCheckIn: '09:48 AM',
        scheduledEnd: '18:30',
        actualCheckOut: '—',
        breakMinutes: r.breakDurationMinutes,
        workingHours: r.workingHours,
        lateMinutes: r.lateMinutes,
        earlyLeavingMinutes: 0,
        overtimeMinutes: 0,
        status: r.status,
      }));
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }

    if (reportType === 'monthly') {
      const formatted = employees.map((emp) => ({
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        shiftName: emp.assignedShift?.shiftName || 'General',
        totalMonthDays: 30,
        presentDays: 24,
        absentDays: 4,
        halfDays: 2,
        lateDays: 3,
        totalEarlyMinutes: 0,
        totalWorkingHours: 192,
        totalOvertimeMinutes: 120,
      }));
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }

    if (reportType === 'late') {
      const formatted = [
        {
          date: new Date().toISOString().split('T')[0],
          employeeId: 'EMP104',
          employeeName: 'Anita Desai',
          department: 'Quality Assurance',
          shiftName: 'General Day Shift',
          shiftStart: '09:30',
          actualCheckIn: '09:48 AM',
          lateMinutes: 18,
        },
      ];
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }

    if (reportType === 'breaks') {
      const formatted = [
        {
          date: new Date().toISOString().split('T')[0],
          employeeId: 'EMP101',
          employeeName: 'John Doe',
          department: 'Engineering',
          breakType: 'Lunch Break',
          breakStart: '01:15 PM',
          breakEnd: '01:45 PM',
          durationMinutes: 30,
        },
      ];
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }

    if (reportType === 'overtime') {
      const formatted = [
        {
          date: new Date().toISOString().split('T')[0],
          employeeId: 'EMP101',
          employeeName: 'John Doe',
          department: 'Engineering',
          shiftName: 'General Day Shift',
          scheduledHours: 8,
          actualWorkingHours: 9.5,
          overtimeMinutes: 90,
          overtimeHours: 1.5,
        },
      ];
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }

    if (reportType === 'missing-punch') {
      return { status: 200, data: { success: true, count: 0, data: [] } };
    }

    if (reportType === 'location') {
      const formatted = events.slice(-50).reverse().map((ev) => {
        const emp = employees.find((e) => e.employeeId === ev.employeeId) || ev.employee;
        return {
          date: ev.attendanceDate,
          time: new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          employeeId: ev.employeeId,
          employeeName: emp?.fullName || 'Anita Desai',
          department: emp?.department || 'Quality Assurance',
          eventType: ev.eventType,
          latitude: ev.latitude,
          longitude: ev.longitude,
          accuracyMeters: ev.accuracy || 12,
          mapUrl: `https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`,
          hasPhoto: Boolean(ev.photoUrl),
        };
      });
      return { status: 200, data: { success: true, count: formatted.length, data: formatted } };
    }
  }

  // 12. Audit Logs
  if (url.startsWith('/audit-logs') && method === 'get') {
    return { status: 200, data: { success: true, total: auditLogs.length, data: auditLogs } };
  }

  return { status: 404, data: { success: false, message: `Mock route not found: ${url}` } };
};
