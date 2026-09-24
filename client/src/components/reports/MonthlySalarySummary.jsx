import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Modal } from '../common/Modal';
import EmptyState from '../common/EmptyState';
import {
  FileSpreadsheet,
  Settings,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const MonthlySalarySummary = ({
  data = [],
  reconciliation = null,
  policy = null,
  loading = false,
  targetMonth,
  targetYear,
  onOpenPolicyModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeCard, setSelectedEmployeeCard] = useState(null);

  const filtered = data.filter(
    (emp) =>
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Overall Payroll Reconciliation KPI Cards */}
      {reconciliation && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Monthly Payroll Reconciliation Totals
            </span>
            <div className="text-[11px] text-slate-400">
              Aggregated from Roster + Actual Punches + Adjustments
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Staff</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{reconciliation.totalEmployees || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{reconciliation.totalCalendarDays || 0} Total Man-Days</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">Scheduled Work</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{reconciliation.totalScheduledWorkingDays || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Expected Roster Duty</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Total Present</span>
              <div className="text-xl font-bold text-emerald-700 mt-1">{reconciliation.totalPresent || 0}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Punched Working Days</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">Off-Days (WO+CO)</span>
              <div className="text-xl font-bold text-purple-700 mt-1">
                {(reconciliation.totalWeekOff || 0) + (reconciliation.totalCompOff || 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {reconciliation.totalWeekOff || 0} WO • {reconciliation.totalCompOff || 0} CO
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-700">Total Absent</span>
              <div className="text-xl font-bold text-rose-700 mt-1">{reconciliation.totalAbsent || 0}</div>
              <div className="text-[10px] text-rose-500 mt-0.5">Unauthorized Days</div>
            </div>

            <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 text-white p-3.5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold uppercase text-brand-200">Total Payable Days</span>
              <div className="text-xl font-extrabold mt-1">{reconciliation.totalPayableDays || 0}</div>
              <div className="text-[10px] text-brand-100 mt-0.5">Salary-Ready Days</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Salary Attendance Policy Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {policy?.policyName || 'Company Salary Attendance Policy'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Policy
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Paid Weekly Off: <strong>{policy?.countWeekOffAsPaid ? 'YES' : 'NO'}</strong></span>
              <span>•</span>
              <span>Paid Comp-Off: <strong>{policy?.countCompOffAsPaid ? 'YES' : 'NO'}</strong></span>
              <span>•</span>
              <span>Paid Holidays: <strong>{policy?.countHolidayAsPaid ? 'YES' : 'NO'}</strong></span>
              <span>•</span>
              <span>Paid Leaves: <strong>{policy?.countPaidLeaveAsPaid ? 'YES' : 'NO'}</strong></span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPolicyModal}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs shrink-0"
        >
          <Settings className="w-3.5 h-3.5 mr-1.5" />
          Configure Policy
        </Button>
      </div>

      {/* 3. Main Salary Summary Table Card */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        {/* Table Search & Count Toolbar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee, ID or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing <strong>{filtered.length}</strong> payroll-ready employees
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center text-slate-400 text-xs">
              <FileSpreadsheet className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600" />
              Compiling salary summary input sheet...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={FileSpreadsheet}
                title="No salary summary records"
                description={`No payroll summary rows generated for ${targetMonth}/${targetYear}.`}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-2 text-center" title="Calendar Days">Days</th>
                  <th className="py-3 px-2 text-center" title="Scheduled Working Days">Sch</th>
                  <th className="py-3 px-2 text-center bg-emerald-50 text-emerald-800" title="Present Days">P</th>
                  <th className="py-3 px-2 text-center bg-rose-50 text-rose-800" title="Absent Days">A</th>
                  <th className="py-3 px-2 text-center bg-slate-100 text-slate-700" title="Weekly Off">WO</th>
                  <th className="py-3 px-2 text-center bg-purple-50 text-purple-800" title="Compensatory Off">CO</th>
                  <th className="py-3 px-2 text-center bg-amber-50 text-amber-800" title="Holidays">H</th>
                  <th className="py-3 px-2 text-center bg-blue-50 text-blue-800" title="Holiday & Week-Off Worked">Off Wkd</th>
                  <th className="py-3 px-2 text-center" title="Late Days & Minutes">Late</th>
                  <th className="py-3 px-3 text-center" title="Total Worked Hours">Worked Hrs</th>
                  <th className="py-3 px-2 text-center" title="Overtime Hours">OT</th>
                  <th className="py-3 px-3 text-center bg-emerald-100/70 text-emerald-950 font-bold" title="Payable Days for Salary">Payable Days</th>
                  <th className="py-3 px-3 text-center bg-rose-100/70 text-rose-950 font-bold" title="Non-Payable Days (Salary Deduction)">Non-Payable</th>
                  <th className="py-3 px-4">Attendance Adjustment / Remarks</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                    </td>

                    {/* Department & Designation */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">{emp.department}</div>
                      <div className="text-[10px] text-slate-400">{emp.designation || 'Staff'}</div>
                    </td>

                    {/* Calendar Days */}
                    <td className="py-3 px-2 text-center font-mono font-medium text-slate-600">
                      {emp.calendarDays}
                    </td>

                    {/* Scheduled Working Days */}
                    <td className="py-3 px-2 text-center font-mono font-semibold text-slate-700">
                      {emp.scheduledWorkingDays}
                    </td>

                    {/* Present */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {emp.presentDays}
                    </td>

                    {/* Absent */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                      {emp.absentDays}
                    </td>

                    {/* Weekly Off */}
                    <td className="py-3 px-2 text-center font-mono text-slate-700 bg-slate-50/60">
                      {emp.weekOffDays}
                    </td>

                    {/* Comp-Off */}
                    <td className="py-3 px-2 text-center font-mono text-purple-700 bg-purple-50/40">
                      {emp.compOffDays}
                    </td>

                    {/* Holiday */}
                    <td className="py-3 px-2 text-center font-mono text-amber-700 bg-amber-50/40">
                      {emp.holidayDays}
                    </td>

                    {/* Off Worked */}
                    <td className="py-3 px-2 text-center font-mono text-blue-700 bg-blue-50/40">
                      {(emp.weekOffWorkedDays || 0) + (emp.holidayWorkedDays || 0)}
                    </td>

                    {/* Late */}
                    <td className="py-3 px-2 text-center font-mono text-slate-600">
                      {emp.lateDays > 0 ? `${emp.lateDays}d (${emp.totalLateMinutes}m)` : '—'}
                    </td>

                    {/* Worked Hours */}
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800">
                      {emp.totalWorkingHours}h
                    </td>

                    {/* Overtime */}
                    <td className="py-3 px-2 text-center font-mono text-slate-600">
                      {emp.totalOvertimeHours > 0 ? `${emp.totalOvertimeHours}h` : '—'}
                    </td>

                    {/* PAYABLE DAYS (Primary Salary Input) */}
                    <td
                      className="py-3 px-3 text-center font-mono font-extrabold text-sm text-emerald-800 bg-emerald-50 border-x border-emerald-200 cursor-help"
                      title={emp.payableFormula}
                    >
                      {emp.payableDays}
                    </td>

                    {/* Non-Payable Days */}
                    <td
                      className="py-3 px-3 text-center font-mono font-bold text-xs text-rose-700 bg-rose-50 border-r border-rose-200 cursor-help"
                      title={`${emp.nonPayableDays} Unpaid Absence Days`}
                    >
                      {emp.nonPayableDays}
                    </td>

                    {/* Attendance Adjustment / Remarks */}
                    <td className="py-3 px-4 max-w-xs">
                      {emp.attendanceAdjustment && emp.attendanceAdjustment !== 'None' ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 truncate max-w-[200px]" title={emp.attendanceAdjustment}>
                          {emp.attendanceAdjustment}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployeeCard(emp)}
                        className="text-xs flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Slip Card
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* 4. Employee Monthly Summary Card Modal */}
      {selectedEmployeeCard && (
        <Modal
          isOpen={Boolean(selectedEmployeeCard)}
          onClose={() => setSelectedEmployeeCard(null)}
          title={`Monthly HR Salary Attendance Card`}
          subtitle={`${selectedEmployeeCard.fullName} (${selectedEmployeeCard.employeeId}) • ${selectedEmployeeCard.month}`}
          maxWidth="max-w-2xl"
        >
          <div className="p-6 space-y-5 text-xs">
            {/* Header Profile Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedEmployeeCard.fullName}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedEmployeeCard.employeeId} • Dept: {selectedEmployeeCard.department} • Designation: {selectedEmployeeCard.designation || 'Staff'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Payable Days</div>
                  <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                    {selectedEmployeeCard.payableDays} <span className="text-xs text-slate-400 font-normal">/ {selectedEmployeeCard.calendarDays}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent Payable Formula Explanation */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Transparent Payable Days Calculation Formula</span>
              </div>
              <p className="font-mono text-xs font-semibold text-emerald-800">
                {selectedEmployeeCard.payableFormula}
              </p>
              <p className="text-[11px] text-emerald-700">
                Verified according to active company policy ({selectedEmployeeCard.nonPayableDays} days marked non-payable for salary deduction).
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Present Days</span>
                <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
                  {selectedEmployeeCard.presentDays}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Weekly Offs (WO)</span>
                <div className="text-lg font-bold text-slate-700 font-mono mt-1">
                  {selectedEmployeeCard.weekOffDays}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Comp-Offs (CO)</span>
                <div className="text-lg font-bold text-purple-700 font-mono mt-1">
                  {selectedEmployeeCard.compOffDays}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unauthorized Absent</span>
                <div className="text-lg font-bold text-rose-700 font-mono mt-1">
                  {selectedEmployeeCard.absentDays}
                </div>
              </div>
            </div>

            {/* Worked Hours & Overtime */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Worked Hours</span>
                <div className="text-base font-bold text-slate-800 font-mono mt-1">
                  {selectedEmployeeCard.totalWorkingHours} hrs
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Overtime Hours</span>
                <div className="text-base font-bold text-emerald-700 font-mono mt-1">
                  {selectedEmployeeCard.totalOvertimeHours} hrs
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Late Coming</span>
                <div className="text-base font-bold text-rose-600 font-mono mt-1">
                  {selectedEmployeeCard.lateDays}d ({selectedEmployeeCard.totalLateMinutes}m)
                </div>
              </div>
            </div>

            {/* Attendance Adjustments / Comp-Off Relationship */}
            {selectedEmployeeCard.attendanceAdjustment && selectedEmployeeCard.attendanceAdjustment !== 'None' && (
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>Salary Adjustments & Comp-Off Reconciliation</span>
                </div>
                <p className="text-xs font-semibold text-purple-800">
                  {selectedEmployeeCard.attendanceAdjustment}
                </p>
              </div>
            )}

            {/* Mini Calendar View 01..31 */}
            <div>
              <span className="text-xs font-bold text-slate-800 block mb-2">
                Monthly Attendance Pattern (1 to {selectedEmployeeCard.calendarDays})
              </span>
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                {(selectedEmployeeCard.dailyMiniCalendar || []).map((d) => (
                  <div
                    key={d.day}
                    className="p-1.5 rounded-lg border border-slate-200 text-center bg-white shadow-xs"
                  >
                    <div className="text-[10px] font-bold text-slate-400">{d.day}</div>
                    <div
                      className={`text-xs font-extrabold mt-0.5 ${
                        d.statusCode === 'P'
                          ? 'text-emerald-700'
                          : d.statusCode === 'A'
                          ? 'text-rose-700'
                          : d.statusCode === 'WO'
                          ? 'text-slate-600'
                          : d.statusCode === 'CO'
                          ? 'text-purple-700'
                          : d.statusCode === 'H'
                          ? 'text-amber-700'
                          : d.statusCode === 'WOW' || d.statusCode === 'HW'
                          ? 'text-blue-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {d.statusCode}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEmployeeCard(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
