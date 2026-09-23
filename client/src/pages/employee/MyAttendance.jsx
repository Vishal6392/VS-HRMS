import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  ChevronRight,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatDecimalHours,
  formatMinutesToDuration,
} from '../../utils/formatters';

export const MyAttendance = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/attendance/my-history');
        if (res.data.success) {
          setHistory(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch personal attendance history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading your attendance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Attendance History</h2>
          <p className="text-xs text-slate-500">Review your past punches and working hours.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance History"
            description="You do not have any past attendance records logged yet."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((record) => (
            <Card
              key={record._id}
              hover
              onClick={() => setSelectedRecord(record)}
              className="p-4 cursor-pointer border-slate-200/90 transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatDate(record.attendanceDate)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({record.shift?.shiftName || 'General Shift'})
                  </span>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-lg text-xs text-center border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Check In</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {record.firstCheckIn ? formatTime(record.firstCheckIn) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Check Out</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {record.lastCheckOut ? formatTime(record.lastCheckOut) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Worked</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatDecimalHours(record.workingHours)}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Break: {formatMinutesToDuration(record.breakDurationMinutes)} &bull; Late:{' '}
                  {formatMinutesToDuration(record.lateMinutes)}
                </span>
                <span className="text-brand-600 font-medium flex items-center gap-0.5 text-xs">
                  View Timeline <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Day Timeline Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={`Attendance on ${formatDate(selectedRecord?.attendanceDate)}`}
        subtitle="Chronological audit of GPS punches and live photos."
        maxWidth="max-w-lg"
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

export default MyAttendance;
