import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarDays,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Copy,
  Gift,
  Settings,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Layers,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Coffee,
  Users,
  Building,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ROSTER_STATUS_STYLES = {
  WORKING: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'Working',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  WEEK_OFF: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    label: 'Week Off',
    badge: 'bg-slate-200 text-slate-700',
  },
  COMP_OFF: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    label: 'Comp Off',
    badge: 'bg-purple-100 text-purple-800',
  },
  HOLIDAY: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Holiday',
    badge: 'bg-amber-100 text-amber-800',
  },
  LEAVE: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    label: 'Leave',
    badge: 'bg-rose-100 text-rose-800',
  },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ShiftRoster = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Grid Data
  const [gridData, setGridData] = useState(null);
  const [isLoadingGrid, setIsLoadingGrid] = useState(true);

  // Common Resources
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [singleForm, setSingleForm] = useState({
    employeeId: '',
    date: '',
    shiftId: '',
    rosterStatus: 'WORKING',
    weekOffType: 'NONE',
    remarks: '',
  });
  const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);

  // Bulk Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    targetType: 'DEPARTMENT', // 'DEPARTMENT' | 'EMPLOYEES'
    department: '',
    employeeIds: [],
    startDate: '',
    endDate: '',
    shiftId: '',
    rosterStatus: 'WORKING',
    remarks: '',
  });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Copy Week Modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyForm, setCopyForm] = useState({
    sourceStartDate: '',
    targetStartDate: '',
    department: '',
  });
  const [isCopySubmitting, setIsCopySubmitting] = useState(false);

  // Comp Off Modal
  const [isCompOffModalOpen, setIsCompOffModalOpen] = useState(false);
  const [compOffForm, setCompOffForm] = useState({
    employeeId: '',
    workedDate: '',
    offDate: '',
    reason: 'Sunday 24x7 Shift Support',
  });
  const [isCompOffSubmitting, setIsCompOffSubmitting] = useState(false);

  // Holidays Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidaysList, setHolidaysList] = useState([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [newHolidayForm, setNewHolidayForm] = useState({
    holidayName: '',
    date: '',
    type: 'PUBLIC',
    description: '',
  });
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Weekly Off Rules Modal
  const [isWeeklyOffModalOpen, setIsWeeklyOffModalOpen] = useState(false);
  const [weeklyOffRules, setWeeklyOffRules] = useState([]);
  const [selectedDeptRule, setSelectedDeptRule] = useState({
    department: 'IT Support',
    days: [0, 6], // Sunday, Saturday
    description: '',
  });
  const [isSavingWeeklyOff, setIsSavingWeeklyOff] = useState(false);

  // Notification Toast / Message
  const [alertMessage, setAlertMessage] = useState(null);

  const showAlert = (type, message) => {
    setAlertMessage({ type, message });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // Fetch Core Data (Shifts, Employees)
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [shiftsRes, empsRes] = await Promise.all([
          api.get('/shifts'),
          api.get('/employees'),
        ]);

        if (shiftsRes.data.success) {
          setShifts(shiftsRes.data.data || []);
        }
        if (empsRes.data.success) {
          const empList = empsRes.data.data || [];
          setEmployees(empList);
          const depts = [...new Set(empList.map((e) => e.department).filter(Boolean))];
          setDepartments(depts);
        }
      } catch (err) {
        console.error('Failed to load shifts/employees for roster:', err);
      }
    };

    fetchResources();
  }, []);

  // Fetch Monthly Grid Data
  const fetchMonthlyGrid = async () => {
    setIsLoadingGrid(true);
    try {
      const params = {
        year: selectedYear,
        month: selectedMonth,
      };
      if (departmentFilter) params.department = departmentFilter;

      const res = await api.get('/rosters/monthly-grid', { params });
      if (res.data.success) {
        setGridData(res.data);
      }
    } catch (err) {
      console.error('Failed to load roster grid:', err);
      showAlert('error', err.response?.data?.message || 'Failed to load shift roster grid.');
    } finally {
      setIsLoadingGrid(false);
    }
  };

  useEffect(() => {
    fetchMonthlyGrid();
  }, [selectedYear, selectedMonth, departmentFilter]);

  // Navigate Months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Open Single Roster Edit Modal
  const handleCellClick = (emp, daySchedule) => {
    setSingleForm({
      employeeId: emp._id,
      employeeName: emp.fullName,
      date: daySchedule.date,
      shiftId: daySchedule.shift?._id || emp.assignedShift?._id || (shifts[0]?._id || ''),
      rosterStatus: daySchedule.rosterStatus || 'WORKING',
      weekOffType: daySchedule.weekOffType || 'NONE',
      remarks: daySchedule.remarks || '',
      rosterId: daySchedule.rosterId || null,
    });
    setIsSingleModalOpen(true);
  };

  // Save Single Roster
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setIsSingleSubmitting(true);
    try {
      const payload = {
        employeeId: singleForm.employeeId,
        date: singleForm.date,
        shiftId: singleForm.rosterStatus === 'WORKING' ? singleForm.shiftId : null,
        rosterStatus: singleForm.rosterStatus,
        weekOffType: singleForm.weekOffType,
        remarks: singleForm.remarks,
      };

      const res = await api.post('/rosters', payload);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsSingleModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save roster entry.');
    } finally {
      setIsSingleSubmitting(false);
    }
  };

  // Delete Single Roster Override
  const handleDeleteRosterOverride = async (rosterId) => {
    if (!rosterId) return;
    if (!window.confirm('Revert this date to standard default schedule?')) return;
    try {
      const res = await api.delete(`/rosters/${rosterId}`);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsSingleModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to delete roster entry.');
    }
  };

  // Bulk Roster Submit
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setIsBulkSubmitting(true);
    try {
      const payload = {
        department: bulkForm.targetType === 'DEPARTMENT' ? bulkForm.department : undefined,
        employeeIds: bulkForm.targetType === 'EMPLOYEES' ? bulkForm.employeeIds : [],
        startDate: bulkForm.startDate,
        endDate: bulkForm.endDate,
        shiftId: bulkForm.rosterStatus === 'WORKING' ? bulkForm.shiftId : null,
        rosterStatus: bulkForm.rosterStatus,
        remarks: bulkForm.remarks,
      };

      const res = await api.post('/rosters/bulk', payload);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsBulkModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to apply bulk roster.');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Copy Week Submit
  const handleCopyWeekSubmit = async (e) => {
    e.preventDefault();
    setIsCopySubmitting(true);
    try {
      const res = await api.post('/rosters/copy-week', copyForm);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsCopyModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to copy week roster.');
    } finally {
      setIsCopySubmitting(false);
    }
  };

  // Comp-Off Submit
  const handleCompOffSubmit = async (e) => {
    e.preventDefault();
    setIsCompOffSubmitting(true);
    try {
      const res = await api.post('/rosters/comp-off', compOffForm);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsCompOffModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to grant compensatory off.');
    } finally {
      setIsCompOffSubmitting(false);
    }
  };

  // Load Holidays
  const fetchHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
      const res = await api.get('/rosters/holidays', { params: { year: selectedYear } });
      if (res.data.success) {
        setHolidaysList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const handleOpenHolidaysModal = () => {
    fetchHolidays();
    setIsHolidayModalOpen(true);
  };

  const handleAddHolidaySubmit = async (e) => {
    e.preventDefault();
    setIsAddingHoliday(true);
    try {
      const res = await api.post('/rosters/holidays', newHolidayForm);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setNewHolidayForm({ holidayName: '', date: '', type: 'PUBLIC', description: '' });
        fetchHolidays();
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to create holiday.');
    } finally {
      setIsAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      const res = await api.delete(`/rosters/holidays/${id}`);
      if (res.data.success) {
        showAlert('success', res.data.message);
        fetchHolidays();
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to delete holiday.');
    }
  };

  // Load Weekly Off Rules
  const fetchWeeklyOffRules = async () => {
    try {
      const res = await api.get('/rosters/weekly-off-rules');
      if (res.data.success) {
        const rules = res.data.data || [];
        setWeeklyOffRules(rules);
        const it = rules.find((r) => r.department === 'IT Support');
        if (it) {
          setSelectedDeptRule(it);
        }
      }
    } catch (err) {
      console.error('Failed to load weekly off rules:', err);
    }
  };

  const handleOpenWeeklyOffModal = () => {
    fetchWeeklyOffRules();
    setIsWeeklyOffModalOpen(true);
  };

  const handleSaveWeeklyOffRule = async (e) => {
    e.preventDefault();
    setIsSavingWeeklyOff(true);
    try {
      const res = await api.post('/rosters/weekly-off-rules', selectedDeptRule);
      if (res.data.success) {
        showAlert('success', res.data.message);
        setIsWeeklyOffModalOpen(false);
        fetchMonthlyGrid();
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to save weekly off rule.');
    } finally {
      setIsSavingWeeklyOff(false);
    }
  };

  const toggleWeeklyOffDay = (dayIndex) => {
    const current = selectedDeptRule.days || [];
    if (current.includes(dayIndex)) {
      setSelectedDeptRule({ ...selectedDeptRule, days: current.filter((d) => d !== dayIndex) });
    } else {
      setSelectedDeptRule({ ...selectedDeptRule, days: [...current, dayIndex].sort() });
    }
  };

  // Filtered rows for search query
  const filteredRows = (gridData?.rows || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employee.fullName.toLowerCase().includes(q) ||
      r.employee.employeeId.toLowerCase().includes(q) ||
      r.employee.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Alert Notification Toast */}
      {alertMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{alertMessage.message}</span>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-600" />
            Shift Roster & Offs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            24x7 rotation scheduling, date-specific shift overrides, weekly offs & compensatory off management.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWeeklyOffModal}
            icon={Settings}
            className="text-xs py-1.5"
            title="Configure Department Default Weekly Offs"
          >
            Weekly Offs
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenHolidaysModal}
            icon={Calendar}
            className="text-xs py-1.5"
            title="Manage Public & Company Holidays"
          >
            Holidays
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCopyModalOpen(true)}
            icon={Copy}
            className="text-xs py-1.5"
            title="Copy Week Roster"
          >
            Copy Week
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCompOffForm({
                employeeId: employees[0]?._id || '',
                workedDate: '',
                offDate: '',
                reason: 'Sunday 24x7 Coverage',
              });
              setIsCompOffModalOpen(true);
            }}
            icon={Gift}
            className="text-xs py-1.5 text-purple-700 bg-purple-50/50 hover:bg-purple-100 border-purple-200"
            title="Grant Compensatory Off"
          >
            Comp-Off
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
              const endOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(gridData?.daysInMonth || 30).padStart(2, '0')}`;
              setBulkForm({
                targetType: 'DEPARTMENT',
                department: departments[0] || 'IT Support',
                employeeIds: [],
                startDate: startOfMonth,
                endDate: endOfMonth,
                shiftId: shifts[0]?._id || '',
                rosterStatus: 'WORKING',
                remarks: 'Department standard rotation',
              });
              setIsBulkModalOpen(true);
            }}
            icon={Layers}
            className="text-xs py-1.5"
            title="Bulk Schedule"
          >
            Bulk Roster
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSingleForm({
                employeeId: employees[0]?._id || '',
                employeeName: employees[0]?.fullName || '',
                date: new Date().toISOString().split('T')[0],
                shiftId: shifts[0]?._id || '',
                rosterStatus: 'WORKING',
                weekOffType: 'NONE',
                remarks: '',
                rosterId: null,
              });
              setIsSingleModalOpen(true);
            }}
            icon={Plus}
            className="text-xs py-1.5 shadow-xs"
          >
            Add Roster
          </Button>
        </div>
      </div>

      {/* Filter and Month Navigation Card */}
      <Card className="p-4 border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-600 hover:text-brand-600 hover:bg-white rounded-lg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-slate-800 px-3 min-w-[130px] text-center text-xs">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-slate-600 hover:text-brand-600 hover:bg-white rounded-lg transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchMonthlyGrid}
              icon={RefreshCw}
              isLoading={isLoadingGrid}
              className="py-1 px-2.5 text-slate-500 hover:text-brand-600"
              title="Refresh Roster Grid"
            >
              Refresh
            </Button>
          </div>

          {/* Department Filter & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-600">Roster Legend:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span>Working (Assigned Shift)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-400" />
              <span>Week Off (WO)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span>Comp Off (CO)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>Holiday (H)</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 italic">
            Tip: Click any cell to modify or assign date-specific roster.
          </span>
        </div>
      </Card>

      {/* Main Monthly Calendar Matrix Grid */}
      <Card className="border-slate-200 shadow-card overflow-hidden">
        {isLoadingGrid ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
            <span className="text-xs">Loading monthly shift roster grid...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No Roster Data Found"
            description="No employees match your filter, or no shifts are configured for this month."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold text-[11px]">
                  {/* Sticky Employee Column */}
                  <th className="sticky left-0 z-20 bg-slate-900 py-3 px-3 min-w-[200px] border-r border-slate-700 shadow-md">
                    Employee Details
                  </th>

                  {/* Day Columns */}
                  {gridData.days.map((d) => {
                    const isWeekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                    const isHoliday = Boolean(d.holiday);

                    return (
                      <th
                        key={d.date}
                        className={`py-2 px-1 text-center min-w-[42px] border-r border-slate-800 ${
                          isHoliday
                            ? 'bg-amber-900/60 text-amber-200'
                            : isWeekend
                            ? 'bg-slate-800/90 text-slate-300'
                            : ''
                        }`}
                        title={isHoliday ? `${d.holiday.holidayName} (${d.holiday.type})` : `${d.dayName} ${d.date}`}
                      >
                        <div className="text-[10px] uppercase font-mono opacity-70">
                          {d.dayName}
                        </div>
                        <div className="font-bold text-xs">{d.dayNumber}</div>
                      </th>
                    );
                  })}

                  {/* Summary Stats Header */}
                  <th className="py-2.5 px-3 min-w-[120px] text-right bg-slate-800 text-slate-200">
                    Monthly Offs/Working
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, rowIdx) => {
                  const emp = row.employee;

                  return (
                    <tr
                      key={emp._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                      }`}
                    >
                      {/* Sticky Employee Column */}
                      <td className="sticky left-0 z-10 bg-white py-2 px-3 border-r border-slate-200 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div className="truncate max-w-[150px]">
                            <span className="font-bold text-slate-900 block truncate text-xs leading-tight">
                              {emp.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate font-mono">
                              {emp.employeeId} • {emp.department}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {row.days.map((d) => {
                        const style = ROSTER_STATUS_STYLES[d.expectedStatus] || ROSTER_STATUS_STYLES.WORKING;
                        const isWeekend = d.dayName === 'Sun' || d.dayName === 'Sat';

                        // Content representation
                        let contentText = 'WO';
                        let subText = null;

                        if (d.expectedStatus === 'WORKING') {
                          contentText = d.shift?.shiftCode || (d.shift?.shiftName?.slice(0, 3) || 'WRK');
                          subText = d.shift?.startTime ? `${d.shift.startTime.slice(0, 5)}` : null;
                        } else if (d.expectedStatus === 'WEEK_OFF') {
                          contentText = 'WO';
                        } else if (d.expectedStatus === 'COMP_OFF') {
                          contentText = 'CO';
                        } else if (d.expectedStatus === 'HOLIDAY') {
                          contentText = 'H';
                        } else if (d.expectedStatus === 'LEAVE') {
                          contentText = 'L';
                        }

                        // Punch check indicators
                        const wasWorked = d.hasPunches;
                        const isOffWorked = d.isWeekOffWorked || d.isHolidayWorked;

                        return (
                          <td
                            key={d.date}
                            onClick={() => handleCellClick(emp, d)}
                            className={`py-1 px-0.5 text-center border-r border-slate-100 cursor-pointer hover:ring-2 hover:ring-brand-400 hover:z-20 transition-all select-none ${
                              isWeekend && d.expectedStatus === 'WEEK_OFF' ? 'bg-slate-50/40' : ''
                            }`}
                            title={`Date: ${d.date} (${d.dayName})\nStatus: ${d.expectedStatus}\nShift: ${d.shift?.shiftName || 'None'}\n${d.isExplicitRoster ? 'Overridden via explicit roster' : 'Default schedule'}\nClick to edit`}
                          >
                            <div
                              className={`mx-auto w-8 py-1 rounded flex flex-col items-center justify-center transition-transform hover:scale-105 border ${style.border} ${style.bg} ${
                                d.isExplicitRoster ? 'ring-1 ring-brand-400 shadow-xs' : ''
                              }`}
                            >
                              <span className={`text-[10px] font-bold leading-none ${style.text}`}>
                                {contentText}
                              </span>

                              {/* Small punch status indicator dot */}
                              {wasWorked && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                    isOffWorked
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  title={isOffWorked ? 'Off-day worked!' : 'Attended'}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary Statistics */}
                      <td className="py-2 px-3 text-right border-l border-slate-200 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {row.stats.scheduledWorkingDays} Work / {row.stats.scheduledWeekOffs} WO
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {row.stats.scheduledCompOffs > 0 && `${row.stats.scheduledCompOffs} CO `}
                          {row.stats.weekOffWorked > 0 && (
                            <span className="text-amber-600 font-bold">
                              • {row.stats.weekOffWorked} WO Worked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. SINGLE ROSTER EDIT MODAL                             */}
      {/* ======================================================== */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Schedule Roster Override"
        subtitle={`Set specific shift or off schedule for ${singleForm.employeeName} on ${singleForm.date}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Roster Status *
            </label>
            <select
              value={singleForm.rosterStatus}
              onChange={(e) => setSingleForm({ ...singleForm, rosterStatus: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="WORKING">WORKING (Attendance Required)</option>
              <option value="WEEK_OFF">WEEK_OFF (Scheduled Weekly Off - Not Absent)</option>
              <option value="COMP_OFF">COMP_OFF (Compensatory Off - Not Absent)</option>
              <option value="HOLIDAY">HOLIDAY (Company / National Holiday)</option>
              <option value="LEAVE">LEAVE (Approved Leave)</option>
            </select>
          </div>

          {singleForm.rosterStatus === 'WORKING' && (
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Assigned Shift *
              </label>
              <select
                required
                value={singleForm.shiftId}
                onChange={(e) => setSingleForm({ ...singleForm, shiftId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.shiftName} ({s.shiftCode}) • {s.startTime} - {s.endTime} [{s.shiftType}]
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Remarks / Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Sunday 24x7 Night Shift Support or Client Deployment"
              value={singleForm.remarks}
              onChange={(e) => setSingleForm({ ...singleForm, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {singleForm.rosterId ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleDeleteRosterOverride(singleForm.rosterId)}
                icon={Trash2}
                className="text-xs py-1.5"
              >
                Revert to Default
              </Button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSingleModalOpen(false)}
                className="text-xs py-1.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSingleSubmitting}
                className="text-xs py-1.5 shadow-xs"
              >
                Save Roster
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. BULK ROSTER CREATION MODAL                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Shift Roster Assignment"
        subtitle="Schedule multiple employees or an entire department across a date range."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Target Group
              </label>
              <select
                value={bulkForm.targetType}
                onChange={(e) => setBulkForm({ ...bulkForm, targetType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="DEPARTMENT">By Department</option>
                <option value="ALL">All Active Employees</option>
              </select>
            </div>

            {bulkForm.targetType === 'DEPARTMENT' && (
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                  Department
                </label>
                <select
                  value={bulkForm.department}
                  onChange={(e) => setBulkForm({ ...bulkForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={bulkForm.startDate}
                onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={bulkForm.endDate}
                onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Roster Status
              </label>
              <select
                value={bulkForm.rosterStatus}
                onChange={(e) => setBulkForm({ ...bulkForm, rosterStatus: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="WORKING">WORKING</option>
                <option value="WEEK_OFF">WEEK_OFF</option>
              </select>
            </div>

            {bulkForm.rosterStatus === 'WORKING' && (
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                  Shift *
                </label>
                <select
                  required
                  value={bulkForm.shiftId}
                  onChange={(e) => setBulkForm({ ...bulkForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  {shifts.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.shiftName} ({s.shiftCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Standard Schedule"
              value={bulkForm.remarks}
              onChange={(e) => setBulkForm({ ...bulkForm, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isBulkSubmitting}
            >
              Apply Bulk Roster
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 3. COPY WEEK ROSTER MODAL                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Copy Previous Week Schedule"
        subtitle="Duplicate 7-day shift roster pattern from one week to another."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCopyWeekSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Source Week Start Date (e.g. Monday) *
            </label>
            <input
              type="date"
              required
              value={copyForm.sourceStartDate}
              onChange={(e) => setCopyForm({ ...copyForm, sourceStartDate: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Target Week Start Date (e.g. Next Monday) *
            </label>
            <input
              type="date"
              required
              value={copyForm.targetStartDate}
              onChange={(e) => setCopyForm({ ...copyForm, targetStartDate: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Department (Optional - Leave blank for all)
            </label>
            <select
              value={copyForm.department}
              onChange={(e) => setCopyForm({ ...copyForm, department: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCopyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCopySubmitting}
            >
              Copy Week Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. COMPENSATORY OFF MODAL                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCompOffModalOpen}
        onClose={() => setIsCompOffModalOpen(false)}
        title="Grant Compensatory Off (Comp-Off)"
        subtitle="Assign an approved compensatory day off in exchange for a worked weekly off or holiday."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCompOffSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Select Employee *
            </label>
            <select
              required
              value={compOffForm.employeeId}
              onChange={(e) => setCompOffForm({ ...compOffForm, employeeId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId} • {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Worked Off Date *
              </label>
              <input
                type="date"
                required
                value={compOffForm.workedDate}
                onChange={(e) => setCompOffForm({ ...compOffForm, workedDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                The Sunday/Holiday worked
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                Comp-Off Date *
              </label>
              <input
                type="date"
                required
                value={compOffForm.offDate}
                onChange={(e) => setCompOffForm({ ...compOffForm, offDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                The weekday given off
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Reason / Remarks
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sunday 24x7 Night Shift Support Coverage"
              value={compOffForm.reason}
              onChange={(e) => setCompOffForm({ ...compOffForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompOffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCompOffSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Grant Comp-Off
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 5. HOLIDAY MASTER MODAL                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Holiday Calendar Master"
        subtitle={`Configure national, public, and company holidays for ${selectedYear}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Add Holiday Form */}
          <form onSubmit={handleAddHolidaySubmit} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
            <span className="font-bold text-amber-900 block text-xs">
              + Add New Holiday
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-0.5">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali / Republic Day"
                  value={newHolidayForm.holidayName}
                  onChange={(e) => setNewHolidayForm({ ...newHolidayForm, holidayName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-0.5">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={newHolidayForm.date}
                  onChange={(e) => setNewHolidayForm({ ...newHolidayForm, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-0.5">
                  Type
                </label>
                <select
                  value={newHolidayForm.type}
                  onChange={(e) => setNewHolidayForm({ ...newHolidayForm, type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="NATIONAL">NATIONAL</option>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="COMPANY">COMPANY</option>
                  <option value="OPTIONAL">OPTIONAL</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isAddingHoliday}
                className="text-xs py-1"
              >
                Add Holiday
              </Button>
            </div>
          </form>

          {/* Existing Holidays List */}
          <div>
            <span className="font-bold text-slate-800 block mb-2 text-xs">
              Configured Holidays ({holidaysList.length})
            </span>

            {isLoadingHolidays ? (
              <div className="py-8 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              </div>
            ) : holidaysList.length === 0 ? (
              <div className="py-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                No holidays recorded for this calendar year.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Holiday Name</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holidaysList.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{h.date}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{h.holidayName}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            {h.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 6. WEEKLY OFF SETTINGS MODAL                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isWeeklyOffModalOpen}
        onClose={() => setIsWeeklyOffModalOpen(false)}
        title="Department Weekly-Off Configuration"
        subtitle="Configure default weekly off pattern for IT Support or other teams (e.g. Sat+Sun or Sun only)."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveWeeklyOffRule} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
              Select Department
            </label>
            <select
              value={selectedDeptRule.department}
              onChange={(e) => {
                const dept = e.target.value;
                const existing = weeklyOffRules.find((r) => r.department === dept);
                if (existing) {
                  setSelectedDeptRule(existing);
                } else {
                  setSelectedDeptRule({
                    department: dept,
                    days: dept === 'IT Support' ? [0, 6] : [0],
                    description: '',
                  });
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="IT Support">IT Support (Default)</option>
              {departments
                .filter((d) => d !== 'IT Support')
                .map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1.5">
              Select Weekly Off Days
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAY_NAMES.map((name, idx) => {
                const isSelected = (selectedDeptRule.days || []).includes(idx);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleWeeklyOffDay(idx)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{name}</span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Note: Explicit shift rosters for Sunday duty or emergency shifts will always override these default weekly offs.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWeeklyOffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingWeeklyOff}
            >
              Save Weekly Off Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftRoster;
