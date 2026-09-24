import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import {
  FileBarChart,
  Printer,
  Calendar,
  FileSpreadsheet,
  FileText,
  Clock,
  Coffee,
  AlertTriangle,
  Flame,
  Loader2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  FileEdit,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MonthlyAttendanceRegister } from '../../components/reports/MonthlyAttendanceRegister';
import { MonthlySalarySummary } from '../../components/reports/MonthlySalarySummary';
import { AttendanceAdjustmentsTab } from '../../components/reports/AttendanceAdjustmentsTab';
import { MonthLockTab } from '../../components/reports/MonthLockTab';
import { SalaryPolicyModal } from '../../components/reports/SalaryPolicyModal';

export const Reports = () => {
  // Tabs: 'salary-summary' | 'monthly-register' | 'adjustments' | 'month-lock' | 'daily' | 'monthly' | 'location' | 'late' | 'breaks' | 'overtime' | 'missing-punch'
  const [activeTab, setActiveTab] = useState('salary-summary');

  // Loading States
  const [isLoading, setIsLoading] = useState(false);

  // Standard Report Data (for daily/late/breaks/overtime/missing-punch/location)
  const [reportData, setReportData] = useState([]);

  // Monthly Register Data (Report 1)
  const [registerResponse, setRegisterResponse] = useState(null);

  // Monthly HR Salary Summary Data (Report 2)
  const [salaryResponse, setSalaryResponse] = useState(null);

  // Master Data
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Filters
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(() => new Date().getFullYear());
  const [department, setDepartment] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Policy Modal
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  const tabs = [
    { id: 'salary-summary', label: 'Monthly HR Salary Summary', icon: FileSpreadsheet, isPrimary: true },
    { id: 'monthly-register', label: 'Monthly Attendance Register', icon: Calendar, isPrimary: true },
    { id: 'adjustments', label: 'Attendance Adjustments', icon: FileEdit },
    { id: 'month-lock', label: 'Month Finalization', icon: Lock },
    { id: 'daily', label: 'Daily Attendance', icon: Clock },
    { id: 'location', label: 'GPS Location Audit', icon: MapPin },
    { id: 'late', label: 'Late Coming', icon: Clock },
    { id: 'breaks', label: 'Break Details', icon: Coffee },
    { id: 'overtime', label: 'Overtime Hours', icon: Flame },
    { id: 'missing-punch', label: 'Missing Punches', icon: AlertTriangle },
  ];

  // Fetch Employees and Shifts for filter dropdowns
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([
          api.get('/employees'),
          api.get('/shifts?activeOnly=true'),
        ]);
        if (empRes.data.success) setEmployees(empRes.data.data || []);
        if (shiftRes.data.success) setShifts(shiftRes.data.data || []);
      } catch (e) {
        console.error('Failed to load masters:', e);
      }
    };
    fetchMasters();
  }, []);

  // Fetch report data according to active tab
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'monthly-register') {
        const params = new URLSearchParams();
        params.append('month', targetMonth);
        params.append('year', targetYear);
        if (department) params.append('department', department);
        if (selectedShift) params.append('shift', selectedShift);
        if (selectedStatus) params.append('status', selectedStatus);

        const res = await api.get(`/reports/monthly-register?${params.toString()}`);
        if (res.data.success) {
          setRegisterResponse(res.data);
        }
      } else if (activeTab === 'salary-summary') {
        const params = new URLSearchParams();
        params.append('month', targetMonth);
        params.append('year', targetYear);
        if (department) params.append('department', department);

        const res = await api.get(`/reports/salary-summary?${params.toString()}`);
        if (res.data.success) {
          setSalaryResponse(res.data);
        }
      } else if (activeTab === 'adjustments' || activeTab === 'month-lock') {
        // Managed by child component
      } else {
        // Standard legacy endpoints
        let endpoint = `/reports/${activeTab}`;
        const params = new URLSearchParams();

        if (activeTab === 'daily') {
          params.append('date', targetDate);
        } else if (activeTab === 'monthly') {
          params.append('month', targetMonth);
          params.append('year', targetYear);
        } else {
          params.append('startDate', targetDate);
          params.append('endDate', targetDate);
        }

        if (department) params.append('department', department);

        const res = await api.get(`${endpoint}?${params.toString()}`);
        if (res.data.success) {
          setReportData(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, targetDate, targetMonth, targetYear, department, selectedShift, selectedStatus]);

  // Reset Filters
  const handleResetFilters = () => {
    const now = new Date();
    setTargetDate(now.toISOString().split('T')[0]);
    setTargetMonth(now.getMonth() + 1);
    setTargetYear(now.getFullYear());
    setDepartment('');
    setSelectedShift('');
    setSelectedStatus('');
  };

  // Export to Excel (Full Multi-Sheet Workbook for HR Reports)
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (activeTab === 'salary-summary' || activeTab === 'monthly-register') {
      // Sheet 1: Salary Summary
      if (salaryResponse?.data && salaryResponse.data.length > 0) {
        const salaryExportRows = salaryResponse.data.map((emp) => ({
          'Employee ID': emp.employeeId,
          'Employee Name': emp.fullName,
          'Department': emp.department,
          'Designation': emp.designation || 'Staff',
          'Month': emp.month,
          'Calendar Days': emp.calendarDays,
          'Scheduled Working Days': emp.scheduledWorkingDays,
          'Present Days': emp.presentDays,
          'Absent Days': emp.absentDays,
          'Weekly Off (WO)': emp.weekOffDays,
          'Comp-Off (CO)': emp.compOffDays,
          'Holiday (H)': emp.holidayDays,
          'Holiday Worked (HW)': emp.holidayWorkedDays,
          'Week-Off Worked (WOW)': emp.weekOffWorkedDays,
          'Paid Leave': emp.paidLeaveDays,
          'Unpaid Leave': emp.unpaidLeaveDays,
          'Missing Punch': emp.missingPunchDays,
          'Late Days': emp.lateDays,
          'Late Minutes': emp.totalLateMinutes,
          'Worked Hours': emp.totalWorkingHours,
          'Overtime Hours': emp.totalOvertimeHours,
          'Payable Days': emp.payableDays,
          'Non-Payable Days': emp.nonPayableDays,
          'Payable Formula': emp.payableFormula,
          'Attendance Adjustment': emp.attendanceAdjustment,
          'Remarks': emp.remarks,
        }));
        const wsSalary = XLSX.utils.json_to_sheet(salaryExportRows);
        XLSX.utils.book_append_sheet(workbook, wsSalary, 'Salary Summary');
      }

      // Sheet 2: Detailed Attendance Register
      if (registerResponse?.data && registerResponse.data.length > 0) {
        const registerExportRows = [];
        registerResponse.data.forEach((emp) => {
          Object.values(emp.daily || {}).forEach((d) => {
            registerExportRows.push({
              'Employee ID': emp.employeeId,
              'Employee Name': emp.fullName,
              'Department': emp.department,
              'Date': d.dateStr,
              'Roster Status': d.rosterStatus,
              'Scheduled Shift': d.scheduledShift?.shiftName || 'Weekly Off / None',
              'Attendance Status': d.statusCode,
              'Status Description': d.statusTitle,
              'Check In': d.actualCheckIn || '—',
              'Check Out': d.actualCheckOut || '—',
              'Break Duration (mins)': d.breakDurationMinutes || 0,
              'Worked Hours': d.workingHours || 0,
              'Late Minutes': d.lateMinutes || 0,
              'Overtime Minutes': d.overtimeMinutes || 0,
              'Week Off Worked': d.isWeekOffWorked ? 'YES' : 'NO',
              'Holiday Worked': d.isHolidayWorked ? 'YES' : 'NO',
              'Location': d.locationName || '—',
              'Distance (m)': d.locationDistance ?? '—',
              'Accuracy (m)': d.locationAccuracy ?? '—',
              'Adjusted': d.isAdjusted ? 'YES' : 'NO',
            });
          });
        });
        const wsRegister = XLSX.utils.json_to_sheet(registerExportRows);
        XLSX.utils.book_append_sheet(workbook, wsRegister, 'Attendance Register');
      }

      // Sheet 3: Attendance Adjustments
      if (salaryResponse?.adjustmentsList && salaryResponse.adjustmentsList.length > 0) {
        const adjRows = salaryResponse.adjustmentsList.map((a) => ({
          'Employee ID': a.employeeId,
          'Employee Name': a.employeeName,
          'Department': a.department,
          'Date': a.date,
          'Original Status': a.originalStatus,
          'Adjusted Status': a.adjustedStatus,
          'Adjustment Type': a.adjustmentType,
          'Reason': a.reason,
          'Reference Date': a.referenceDate || '—',
          'Approved By': a.approvedByName,
        }));
        const wsAdj = XLSX.utils.json_to_sheet(adjRows);
        XLSX.utils.book_append_sheet(workbook, wsAdj, 'Adjustments');
      }

      // Sheet 4: Reconciliation KPIs
      if (salaryResponse?.reconciliation) {
        const r = salaryResponse.reconciliation;
        const wsRecon = XLSX.utils.json_to_sheet([
          { Metric: 'Total Employees', Value: r.totalEmployees },
          { Metric: 'Total Calendar Days', Value: r.totalCalendarDays },
          { Metric: 'Total Scheduled Working Days', Value: r.totalScheduledWorkingDays },
          { Metric: 'Total Present Days', Value: r.totalPresent },
          { Metric: 'Total Absent Days', Value: r.totalAbsent },
          { Metric: 'Total Week Off Days', Value: r.totalWeekOff },
          { Metric: 'Total Comp-Off Days', Value: r.totalCompOff },
          { Metric: 'Total Holidays', Value: r.totalHolidays },
          { Metric: 'Total Holiday Worked', Value: r.totalHolidayWorked },
          { Metric: 'Total Week-Off Worked', Value: r.totalWeekOffWorked },
          { Metric: 'Total Payable Days', Value: r.totalPayableDays },
          { Metric: 'Total Working Hours', Value: r.totalWorkingHours },
          { Metric: 'Total Overtime Hours', Value: r.totalOvertimeHours },
        ]);
        XLSX.utils.book_append_sheet(workbook, wsRecon, 'Reconciliation Totals');
      }

      XLSX.writeFile(
        workbook,
        `HRMS_MONTHLY_HR_SALARY_REPORT_${targetYear}_${String(targetMonth).padStart(2, '0')}.xlsx`
      );
      return;
    }

    // Default single sheet export for standard operational reports
    if (!reportData || reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.toUpperCase());
    XLSX.writeFile(workbook, `HRMS_${activeTab.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    let sourceData = reportData;
    if (activeTab === 'salary-summary' && salaryResponse?.data) {
      sourceData = salaryResponse.data;
    }

    if (!sourceData || sourceData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(sourceData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `HRMS_${activeTab.toUpperCase()}_REPORT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isMonthlyMode =
    activeTab === 'salary-summary' ||
    activeTab === 'monthly-register' ||
    activeTab === 'adjustments' ||
    activeTab === 'month-lock' ||
    activeTab === 'monthly';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              HR Salary & Payroll Ready
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Attendance Reconciliation Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Monthly HR Salary & Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit date-wise registers, verify payable days, manage adjustments, and freeze monthly payroll inputs.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={FileText}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            icon={FileSpreadsheet}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            Export HR Excel (.xlsx)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-1 no-print">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isPrimary ? 'text-brand-600' : ''}`} />
              <span>{tab.label}</span>
              {tab.isPrimary && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-slate-200 no-print">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {isMonthlyMode ? (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Payroll Month
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Year
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Department Filter
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. IT Support / Engineering"
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
            />
          </div>

          {activeTab === 'monthly-register' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Shift Filter
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
                >
                  <option value="">All Shifts</option>
                  {shifts.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.shiftName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Status Filter
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="P">Present (P)</option>
                  <option value="A">Absent (A)</option>
                  <option value="WO">Weekly Off (WO)</option>
                  <option value="CO">Comp-Off (CO)</option>
                  <option value="H">Holiday (H)</option>
                  <option value="WOW">Week-Off Worked (WOW)</option>
                  <option value="HW">Holiday Worked (HW)</option>
                  <option value="L">Leave (L)</option>
                  <option value="MP">Missing Punch (MP)</option>
                </select>
              </div>
            </>
          )}

          <div className="self-end flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={fetchReport} disabled={isLoading}>
              Apply Filter
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters} title="Reset filters">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Tab Content Switching */}
      {activeTab === 'salary-summary' ? (
        <MonthlySalarySummary
          data={salaryResponse?.data || []}
          reconciliation={salaryResponse?.reconciliation || null}
          policy={salaryResponse?.policy || null}
          loading={isLoading}
          targetMonth={targetMonth}
          targetYear={targetYear}
          onOpenPolicyModal={() => setPolicyModalOpen(true)}
        />
      ) : activeTab === 'monthly-register' ? (
        <MonthlyAttendanceRegister
          dates={registerResponse?.dates || []}
          data={registerResponse?.data || []}
          loading={isLoading}
          targetMonth={targetMonth}
          targetYear={targetYear}
          onQuickAdjust={({ employeeId, date, originalStatus }) => {
            setActiveTab('adjustments');
          }}
        />
      ) : activeTab === 'adjustments' ? (
        <AttendanceAdjustmentsTab
          targetMonth={targetMonth}
          targetYear={targetYear}
          employees={employees}
          onDataChanged={fetchReport}
        />
      ) : activeTab === 'month-lock' ? (
        <MonthLockTab
          targetMonth={targetMonth}
          targetYear={targetYear}
          onStatusChanged={fetchReport}
        />
      ) : (
        /* Legacy Standard Report Table (Daily, Location, Late, Breaks, Overtime, Missing Punch) */
        <Card className="border-slate-200 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
                <span className="text-xs font-medium">Generating report data...</span>
              </div>
            ) : reportData.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={FileBarChart}
                  title="No report rows generated"
                  description="There are no entries for the requested filter selection."
                />
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    {Object.keys(reportData[0]).map((colKey) => (
                      <th key={colKey} className="py-3 px-3 capitalize">
                        {colKey.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                      {Object.entries(row).map(([k, val], cIdx) => (
                        <td key={cIdx} className="py-3 px-3 text-slate-700">
                          {typeof val === 'string' && val.startsWith('http') ? (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] transition-colors"
                            >
                              <MapPin className="w-3 h-3 text-brand-600" />
                              <span>View on Maps</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ) : k === 'geofenceStatus' ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                val === 'ALLOWED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : val === 'EXEMPT'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {String(val)}
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="font-mono font-semibold">
                              {k.toLowerCase().includes('lat') || k.toLowerCase().includes('long')
                                ? val.toFixed(5)
                                : val}
                            </span>
                          ) : (
                            String(val ?? '—')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Salary Attendance Policy Modal */}
      <SalaryPolicyModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        onPolicyUpdated={(newPolicy) => {
          fetchReport();
        }}
      />
    </div>
  );
};

export default Reports;
