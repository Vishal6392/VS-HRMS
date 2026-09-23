import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  Edit3,
  MapPin,
  Camera,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatDecimalHours,
  formatMinutesToDuration,
} from '../../utils/formatters';

export const AttendanceLive = () => {
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Adjustment Modal
  const [adjustRecord, setAdjustRecord] = useState(null);
  const [adjustStatus, setAdjustStatus] = useState('PRESENT');
  const [adjustWorkingHours, setAdjustWorkingHours] = useState(8);
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState(null);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetDate) params.append('date', targetDate);
      if (department) params.append('department', department);
      if (shiftFilter) params.append('shift', shiftFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/attendance/all?${params.toString()}`);
      if (res.data.success) {
        setAttendance(res.data.data);
      }

      const shiftRes = await api.get('/shifts');
      if (shiftRes.data.success) {
        setShifts(shiftRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [targetDate, department, shiftFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAttendance();
  };

  const handleOpenAdjust = (rec) => {
    setAdjustRecord(rec);
    setAdjustStatus(rec.status);
    setAdjustWorkingHours(rec.workingHours || 8);
    setAdjustReason('');
    setAdjustError(null);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustReason || adjustReason.trim() === '') {
      setAdjustError('A reason is mandatory for auditing historical adjustments.');
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const res = await api.put(`/attendance/adjust/${adjustRecord._id}`, {
        status: adjustStatus,
        workingHours: Number(adjustWorkingHours),
        reason: adjustReason.trim(),
      });

      if (res.data.success) {
        setAdjustRecord(null);
        fetchAttendance();
      }
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Failed to adjust record.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const departments = Array.from(new Set(attendance.map((a) => a.employee?.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Attendance Log Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit GPS locations, live camera verifications, and shift event timelines.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAttendance}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-slate-200">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Shift
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="WORKING">Working</option>
              <option value="ON_BREAK">On Break</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="MISSING_PUNCH">Missing Punch</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Search Employee
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or ID..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Table of Records */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Loading attendance audit logs...</span>
            </div>
          ) : attendance.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Calendar}
                title="No attendance entries found"
                description={`No punches match your filter criteria for ${formatDate(targetDate)}.`}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-3">Department</th>
                  <th className="py-3.5 px-3">Shift</th>
                  <th className="py-3.5 px-3">Check In</th>
                  <th className="py-3.5 px-3">Check Out</th>
                  <th className="py-3.5 px-3">Break</th>
                  <th className="py-3.5 px-3">Worked</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {rec.employee?.fullName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {rec.employee?.fullName || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {rec.employee?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 font-medium">
                      {rec.employee?.department || '—'}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                        {rec.shift?.shiftName || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold">
                      {rec.firstCheckIn ? (
                        <span className={rec.lateMinutes > 0 ? 'text-amber-600' : 'text-slate-800'}>
                          {formatTime(rec.firstCheckIn)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">
                      {rec.lastCheckOut ? formatTime(rec.lastCheckOut) : '—'}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {formatMinutesToDuration(rec.breakDurationMinutes)}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                      {formatDecimalHours(rec.workingHours)}
                    </td>

                    <td className="py-3.5 px-3">
                      <StatusBadge status={rec.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(rec)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Audit Adjustment"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Attendance Detail & Timeline Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={
          selectedRecord
            ? `${selectedRecord.employee?.fullName} — ${formatDate(selectedRecord.attendanceDate)}`
            : 'Attendance Details'
        }
        subtitle="GPS geofence audit, camera photos, and activity timeline."
        maxWidth="max-w-xl"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <AttendanceTimeline
              events={selectedRecord.events || []}
              summary={selectedRecord}
            />
          </div>
        )}
      </Modal>

      {/* Audit Adjustment Modal */}
      <Modal
        isOpen={!!adjustRecord}
        onClose={() => setAdjustRecord(null)}
        title="Manual Attendance Adjustment"
        subtitle="Modifications are permanently logged with your admin identity."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
          {adjustError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {adjustError}
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase text-slate-600 mb-1">
              Target Employee
            </label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">
              {adjustRecord?.employee?.fullName} ({adjustRecord?.employee?.employeeId})
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 mb-1">
              Adjusted Status *
            </label>
            <select
              value={adjustStatus}
              onChange={(e) => setAdjustStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              <option value="PRESENT">PRESENT</option>
              <option value="HALF_DAY">HALF_DAY</option>
              <option value="LATE">LATE</option>
              <option value="ABSENT">ABSENT</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 mb-1">
              Adjusted Working Hours *
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={adjustWorkingHours}
              onChange={(e) => setAdjustWorkingHours(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-600 mb-1">
              Mandatory Adjustment Reason *
            </label>
            <textarea
              required
              rows={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Employee device battery died during checkout, verified with manager approval."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustRecord(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAdjusting}>
              Save & Audit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceLive;
