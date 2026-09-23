import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import EmptyState from '../../components/common/EmptyState';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Coffee,
  AlertTriangle,
  Flame,
  Search,
  Calendar,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  formatTime,
  formatDecimalHours,
  formatMinutesToDuration,
} from '../../utils/formatters';

export const AdminDashboard = () => {
  const [kpis, setKpis] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onBreak: 0,
    missingPunch: 0,
    overtime: 0,
  });
  const [attendanceList, setAttendanceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/attendance/all?date=${todayStr}`);
      if (res.data.success) {
        setKpis(res.data.kpis);
        setAttendanceList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpiCards = [
    {
      title: 'TOTAL EMPLOYEES',
      value: kpis.totalEmployees,
      icon: Users,
      color: 'text-slate-700 bg-slate-100',
    },
    {
      title: 'PRESENT TODAY',
      value: kpis.presentToday,
      icon: UserCheck,
      color: 'text-emerald-700 bg-emerald-100',
    },
    {
      title: 'ABSENT TODAY',
      value: kpis.absentToday,
      icon: UserX,
      color: 'text-rose-700 bg-rose-100',
    },
    {
      title: 'LATE TODAY',
      value: kpis.lateToday,
      icon: Clock,
      color: 'text-amber-700 bg-amber-100',
    },
    {
      title: 'ON BREAK',
      value: kpis.onBreak,
      icon: Coffee,
      color: 'text-blue-700 bg-blue-100',
    },
    {
      title: 'MISSING PUNCH',
      value: kpis.missingPunch,
      icon: AlertTriangle,
      color: 'text-orange-700 bg-orange-100',
    },
    {
      title: 'OVERTIME',
      value: kpis.overtime,
      icon: Flame,
      color: 'text-purple-700 bg-purple-100',
    },
  ];

  const filteredAttendance = attendanceList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.employee?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !deptFilter || item.employee?.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(
    new Set(attendanceList.map((i) => i.employee?.department).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Attendance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily attendance metrics and active employee status.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Live
        </button>
      </div>

      {/* Top 7 KPI Cards (Section 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="p-3.5 border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-1.5 rounded-lg ${kpi.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {kpi.value}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Today's Attendance Table Section */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's Attendance</h2>
            <p className="text-xs text-slate-500">Live check-in and checkout feed for today.</p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee / ID..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
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

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Fetching today's logs...</span>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="No attendance punches today"
                description="No employee has marked check-in yet for today's date."
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
                  <th className="py-3.5 px-3">Break</th>
                  <th className="py-3.5 px-3">Check Out</th>
                  <th className="py-3.5 px-3">Working Hours</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {row.employee?.fullName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">
                            {row.employee?.fullName || 'N/A'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {row.employee?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 font-medium">
                      {row.employee?.department || '—'}
                    </td>

                    <td className="py-3.5 px-3 text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                        {row.shift?.shiftName || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">
                      {row.firstCheckIn ? (
                        <span className={row.lateMinutes > 0 ? 'text-amber-600' : 'text-slate-800'}>
                          {formatTime(row.firstCheckIn)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {row.breakDurationMinutes > 0 ? `${row.breakDurationMinutes}m` : '0m'}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800">
                      {row.lastCheckOut ? formatTime(row.lastCheckOut) : '—'}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                      {formatDecimalHours(row.workingHours)}
                    </td>

                    <td className="py-3.5 px-3">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
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
            ? `${selectedRecord.employee?.fullName} — Attendance Detail`
            : 'Attendance Details'
        }
        subtitle="Complete GPS geofence, live selfie verification and punch timeline."
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
    </div>
  );
};

export default AdminDashboard;
