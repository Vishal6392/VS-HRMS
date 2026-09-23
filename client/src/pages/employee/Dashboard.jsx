import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import TodayShiftCard from '../../components/attendance/TodayShiftCard';
import PunchActionCard from '../../components/attendance/PunchActionCard';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import {
  Calendar,
  Clock,
  Coffee,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatDecimalHours,
  formatMinutesToDuration,
} from '../../utils/formatters';

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

export const EmployeeDashboard = () => {
  const { user } = useAuth();

  // Today's Shift & Punch State
  const [todayData, setTodayData] = useState(null);
  const [isTodayLoading, setIsTodayLoading] = useState(true);
  const [showTodayTimeline, setShowTodayTimeline] = useState(false);

  // Monthly Overview & Report State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlyKpis, setMonthlyKpis] = useState({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    totalWorkingHours: 0,
    totalOvertimeHours: 0,
    totalLateMinutes: 0,
    totalBreakMinutes: 0,
    onTimePercentage: 100,
  });
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 1. Fetch Today Attendance & Shift Info
  const fetchTodayData = async () => {
    try {
      const res = await api.get('/attendance/today');
      if (res.data.success) {
        setTodayData(res.data);
      }
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    } finally {
      setIsTodayLoading(false);
    }
  };

  // 2. Fetch Monthly Statement & Performance KPIs
  const fetchMonthlyData = async () => {
    setIsMonthlyLoading(true);
    try {
      const res = await api.get('/attendance/my-history', {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      if (res.data.success) {
        setMonthlyRecords(res.data.data || []);
        if (res.data.kpis) {
          setMonthlyKpis(res.data.kpis);
        }
      }
    } catch (err) {
      console.error('Failed to load monthly attendance history:', err);
      setErrorMessage('Could not load monthly statement. Please check network connection.');
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);

  // Handle Punch Submission
  const handlePunchSuccess = async (payload) => {
    try {
      const res = await api.post('/attendance/punch', payload);
      if (res.data.success) {
        await Promise.all([fetchTodayData(), fetchMonthlyData()]);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Punch submission failed',
      };
    }
  };

  // Month navigation helpers
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

  // Filter records
  const filteredRecords = monthlyRecords.filter((rec) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT' && ['PRESENT', 'WORKING', 'CHECKED_OUT'].includes(rec.status)) ||
      (statusFilter === 'LATE' && (rec.status === 'LATE' || rec.lateMinutes > 0)) ||
      (statusFilter === 'HALF_DAY' && rec.status === 'HALF_DAY') ||
      (statusFilter === 'ABSENT' && rec.status === 'ABSENT');

    const matchesSearch =
      !searchQuery ||
      rec.attendanceDate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.status?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // 1-Click Excel Download for Current Month
  const handleExportExcel = () => {
    if (!monthlyRecords || monthlyRecords.length === 0) return;

    const empName = user?.employee?.fullName || 'Employee';
    const empId = user?.employee?.employeeId || 'EMP';
    const dept = user?.employee?.department || 'Operations';
    const monthName = MONTH_NAMES[selectedMonth - 1];

    const exportRows = monthlyRecords.map((r) => {
      const d = new Date(r.attendanceDate);
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      const firstCheckInTime = r.firstCheckIn ? formatTime(r.firstCheckIn) : '—';
      const lastCheckOutTime = r.lastCheckOut ? formatTime(r.lastCheckOut) : '—';

      // Find Check In event GPS if exists
      const inEvent = (r.events || []).find((ev) => ev.eventType === 'CHECK_IN');
      const inGps = inEvent?.latitude ? `${inEvent.latitude}, ${inEvent.longitude}` : '—';

      return {
        'Date': r.attendanceDate,
        'Day': dayOfWeek,
        'Shift': r.shift?.shiftName || 'General Shift',
        'Scheduled Hours': r.shift?.minWorkingHours || 8,
        'First Check-In': firstCheckInTime,
        'Check-In GPS': inGps,
        'Break Duration (Min)': r.breakDurationMinutes || 0,
        'Last Check-Out': lastCheckOutTime,
        'Effective Working Hours': r.workingHours ? Number(r.workingHours.toFixed(2)) : 0,
        'Late (Mins)': r.lateMinutes || 0,
        'Overtime (Mins)': r.overtimeMinutes || 0,
        'Attendance Status': r.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${monthName}_${selectedYear}`);

    const fileName = `Attendance_Report_${empId}_${monthName}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 1-Click CSV Download
  const handleExportCSV = () => {
    if (!monthlyRecords || monthlyRecords.length === 0) return;

    const empId = user?.employee?.employeeId || 'EMP';
    const monthName = MONTH_NAMES[selectedMonth - 1];

    const exportRows = monthlyRecords.map((r) => ({
      'Date': r.attendanceDate,
      'Shift': r.shift?.shiftName || 'General Shift',
      'Check-In': r.firstCheckIn ? formatTime(r.firstCheckIn) : '—',
      'Check-Out': r.lastCheckOut ? formatTime(r.lastCheckOut) : '—',
      'Break Duration (Min)': r.breakDurationMinutes || 0,
      'Working Hours': r.workingHours ? Number(r.workingHours.toFixed(2)) : 0,
      'Late (Mins)': r.lateMinutes || 0,
      'Overtime (Mins)': r.overtimeMinutes || 0,
      'Status': r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Attendance_Report_${empId}_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isTodayLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading your employee portal...</p>
      </div>
    );
  }

  const currentMonthName = MONTH_NAMES[selectedMonth - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Welcome & Month Selector Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            {user?.employee?.fullName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                Welcome back, {user?.employee?.fullName || 'Team Member'} 👋
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                ID: {user?.employee?.employeeId || 'EMP'}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-600">{user?.employee?.department || 'Staff'}</span>
              <span>•</span>
              <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium text-[11px]">
                Shift: {todayData?.shift?.shiftName || 'General Shift'} ({todayData?.shift?.startTime || '09:30'} - {todayData?.shift?.endTime || '18:30'})
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Month Navigator */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-white rounded-lg transition-all"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              {currentMonthName} {selectedYear}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-white rounded-lg transition-all"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={fetchMonthlyData}
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-white rounded-lg transition-all"
            title="Refresh Attendance Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMonthlyLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Today's Shift & Punch Actions Area */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayShiftCard
            shift={todayData?.shift}
            summary={todayData?.summary}
            employee={todayData?.employee}
          />
          <PunchActionCard
            summary={todayData?.summary}
            shift={todayData?.shift}
            onPunchSuccess={handlePunchSuccess}
          />
        </div>

        {/* Collapsible Today's Activity Timeline */}
        {todayData?.summary?.events && todayData.summary.events.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowTodayTimeline(!showTodayTimeline)}
              className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Today's Logged Activity ({todayData.summary.events.length} punches registered)</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-brand-600 font-bold">
                <span>{showTodayTimeline ? 'Hide Activity' : 'View Timestamps & GPS'}</span>
                {showTodayTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showTodayTimeline && (
              <div className="p-4 border-t border-slate-100 animate-fade-in">
                <AttendanceTimeline
                  events={todayData.summary.events}
                  summary={todayData.summary}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Current Month Performance KPI Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {currentMonthName} {selectedYear} Attendance Summary
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {monthlyRecords.length} recorded day(s)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Present Days */}
          <Card className="p-4 border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Present Days
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {monthlyKpis.presentDays}
              <span className="text-xs font-semibold text-slate-500 ml-1">Days</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>Duty completed on shift</span>
            </p>
          </Card>

          {/* Absent Days */}
          <Card className="p-4 border-rose-200/80 bg-gradient-to-br from-white to-rose-50/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Absent / Missing
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {monthlyKpis.absentDays}
              <span className="text-xs font-semibold text-slate-500 ml-1">Days</span>
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              {monthlyKpis.absentDays > 0 ? 'Action required with HR' : 'Zero unexcused absences'}
            </p>
          </Card>

          {/* Late Coming */}
          <Card className="p-4 border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Late Arrivals
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {monthlyKpis.lateDays}
              <span className="text-xs font-semibold text-slate-500 ml-1">Days</span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              Total Late: <strong className="font-mono">{monthlyKpis.totalLateMinutes}m</strong>
            </p>
          </Card>

          {/* Working Hours */}
          <Card className="p-4 border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Working Time
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {monthlyKpis.totalWorkingHours}
              <span className="text-xs font-semibold text-slate-500 ml-1">hrs</span>
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-1">
              {monthlyKpis.totalOvertimeHours > 0
                ? `+${monthlyKpis.totalOvertimeHours}h Overtime logged`
                : 'Standard schedule'}
            </p>
          </Card>
        </div>

        {/* Punctuality Progress Meter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800">
                On-Time Arrival & Punctuality Rating:
              </span>
              <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-full ${
                monthlyKpis.onTimePercentage >= 90
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : monthlyKpis.onTimePercentage >= 75
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {monthlyKpis.onTimePercentage}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Based on shift scheduled start times and grace periods for {currentMonthName} {selectedYear}.
            </p>
          </div>

          <div className="w-full sm:w-48 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthlyKpis.onTimePercentage >= 90
                  ? 'bg-emerald-500'
                  : monthlyKpis.onTimePercentage >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${monthlyKpis.onTimePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Monthly Attendance Statement & 1-Click Excel Download */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        {/* Table & Report Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                My Monthly Attendance Statement
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review day-by-day punches, break timings, working hours, and download reports.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              disabled={monthlyRecords.length === 0}
              className="text-xs bg-white shadow-xs"
            >
              Export CSV
            </Button>

            <Button
              variant="success"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleExportExcel}
              disabled={monthlyRecords.length === 0}
              className="text-xs shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Download Excel Report (.xlsx)
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          {/* Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'PRESENT', label: 'Present' },
              { id: 'LATE', label: 'Late' },
              { id: 'HALF_DAY', label: 'Half Day' },
              { id: 'ABSENT', label: 'Absent' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] max-w-xs w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by date or status..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Statement Table */}
        <div className="overflow-x-auto">
          {isMonthlyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Loading monthly attendance statement...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-14">
              <EmptyState
                icon={Calendar}
                title={`No Attendance Records Found for ${currentMonthName} ${selectedYear}`}
                description="No daily punches have been registered under your account for the selected period."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check In</th>
                  <th className="py-3 px-3">Break</th>
                  <th className="py-3 px-3">Check Out</th>
                  <th className="py-3 px-3">Working Hours</th>
                  <th className="py-3 px-3">Late / OT</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => {
                  const checkInEvent = (record.events || []).find((ev) => ev.eventType === 'CHECK_IN');
                  const d = new Date(record.attendanceDate);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <tr
                      key={record._id || record.attendanceDate}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {formatDate(record.attendanceDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {dayName} • {record.shift?.shiftName || 'General Shift'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <StatusBadge status={record.status} />
                      </td>

                      {/* First Check In */}
                      <td className="py-3 px-3 font-mono">
                        {record.firstCheckIn ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {formatTime(record.firstCheckIn)}
                            </span>
                            {checkInEvent?.latitude && (
                              <a
                                href={`https://www.google.com/maps?q=${checkInEvent.latitude},${checkInEvent.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-brand-600 hover:underline mt-0.5"
                                title="View check-in GPS location on Google Maps"
                              >
                                <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                <span>Verified GPS</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Break Taken */}
                      <td className="py-3 px-3 text-slate-600">
                        {record.breakDurationMinutes && record.breakDurationMinutes > 0 ? (
                          <span className="font-medium text-slate-700 flex items-center gap-1">
                            <Coffee className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{record.breakDurationMinutes} min</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* Last Check Out */}
                      <td className="py-3 px-3 font-mono">
                        {record.lastCheckOut ? (
                          <span className="font-semibold text-slate-800">
                            {formatTime(record.lastCheckOut)}
                          </span>
                        ) : record.firstCheckIn ? (
                          <span className="text-amber-600 text-[11px] font-medium animate-pulse">
                            Working...
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Working Hours */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-slate-900">
                          {formatDecimalHours(record.workingHours)}
                        </span>
                      </td>

                      {/* Late / OT */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          {record.lateMinutes > 0 && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded w-fit">
                              Late: {record.lateMinutes}m
                            </span>
                          )}
                          {record.overtimeMinutes > 0 && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded w-fit">
                              OT: +{Math.round(record.overtimeMinutes)}m
                            </span>
                          )}
                          {!record.lateMinutes && !record.overtimeMinutes && (
                            <span className="text-[11px] text-slate-400 font-medium">On time</span>
                          )}
                        </div>
                      </td>

                      {/* Details Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDayRecord(record)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="View day audit details & photos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium hidden sm:inline">Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Statistics Bar */}
        {monthlyRecords.length > 0 && (
          <div className="p-3 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div>
              Statement for <strong className="text-slate-800">{currentMonthName} {selectedYear}</strong>: {monthlyKpis.presentDays} Days Present • {monthlyKpis.absentDays} Absent • {monthlyKpis.lateDays} Late
            </div>
            <div className="font-mono font-bold text-slate-800">
              Total Logged: {monthlyKpis.totalWorkingHours} hrs
            </div>
          </div>
        )}
      </Card>

      {/* 5. Day Detail Inspection Modal */}
      {selectedDayRecord && (
        <Modal
          isOpen={!!selectedDayRecord}
          onClose={() => setSelectedDayRecord(null)}
          title={`Attendance Details - ${formatDate(selectedDayRecord.attendanceDate)}`}
          subtitle={`Shift: ${selectedDayRecord.shift?.shiftName || 'General Shift'} (${selectedDayRecord.shift?.startTime || '09:30'} - ${selectedDayRecord.shift?.endTime || '18:30'})`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            {/* Summary Highlights */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedDayRecord.status} />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Working Time</span>
                <span className="text-sm font-bold text-slate-800 font-mono mt-1 block">
                  {formatDecimalHours(selectedDayRecord.workingHours)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Break Duration</span>
                <span className="text-sm font-bold text-slate-800 font-mono mt-1 block">
                  {selectedDayRecord.breakDurationMinutes || 0} min
                </span>
              </div>
            </div>

            {/* Registered Punch Timeline */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Punches & GPS Geolocation Log</span>
              </h4>

              {selectedDayRecord.events && selectedDayRecord.events.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDayRecord.events.map((ev, index) => (
                    <div
                      key={ev._id || index}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ev.eventType === 'CHECK_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ev.eventType === 'CHECK_OUT'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {ev.eventType.replace('_', ' ')}
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {formatTime(ev.timestamp)}
                          </span>
                        </div>

                        {ev.latitude && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {ev.latitude.toFixed(5)}, {ev.longitude.toFixed(5)} (±{Math.round(ev.accuracy || 12)}m)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.latitude && (
                          <a
                            href={`https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Open Google Maps location"
                          >
                            <span>Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {ev.photoUrl && (
                          <img
                            src={ev.photoUrl}
                            alt="Verification selfie"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-300 shadow-xs"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No detailed punch events available for this day.</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setSelectedDayRecord(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeDashboard;
