import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Shield, Coffee, CheckCircle } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatTime, formatTimeSeconds } from '../../utils/formatters';

export const TodayShiftCard = ({ shift, summary, employee }) => {
  const [elapsedWorkingSeconds, setElapsedWorkingSeconds] = useState(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState(0);

  // Real-time counter
  useEffect(() => {
    const updateTimers = () => {
      if (!summary) return;

      const now = new Date().getTime();

      // If currently on break
      if (summary.status === 'ON_BREAK' && summary.activeBreakStart) {
        const breakStart = new Date(summary.activeBreakStart).getTime();
        setElapsedBreakSeconds(Math.max(0, Math.floor((now - breakStart) / 1000)));
      }

      // If working
      if (summary.status === 'WORKING' && summary.firstCheckIn) {
        const checkIn = new Date(summary.firstCheckIn).getTime();
        const breakMs = (summary.breakDurationMinutes || 0) * 60 * 1000;
        const totalMs = now - checkIn - breakMs;
        setElapsedWorkingSeconds(Math.max(0, Math.floor(totalMs / 1000)));
      } else if (summary.workingHours) {
        setElapsedWorkingSeconds(Math.round(summary.workingHours * 3600));
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [summary]);

  const currentStatus = summary?.status || 'ABSENT';

  return (
    <Card className="p-5 overflow-hidden relative border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today's Shift
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
              {shift?.shiftCode || 'GS'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {shift?.shiftName || 'General Shift'}
          </h2>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 bg-slate-50/50 -mx-5 px-5">
        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase">Scheduled Start</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {shift?.startTime || '09:30'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase">Scheduled End</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {shift?.endTime || '18:30'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase">Active Working Time</div>
          <div className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
            {currentStatus === 'WORKING'
              ? formatTimeSeconds(elapsedWorkingSeconds)
              : `${summary?.workingHours || 0} hrs`}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-500 uppercase">Break Duration</div>
          <div className="text-sm font-bold font-mono text-blue-600 mt-0.5">
            {currentStatus === 'ON_BREAK'
              ? formatTimeSeconds(elapsedBreakSeconds)
              : `${summary?.breakDurationMinutes || 0} min`}
          </div>
        </div>
      </div>

      {shift?.shiftType === 'SPLIT' && shift.splitSegments && shift.splitSegments.length > 0 && (
        <div className="mt-3 pt-2 text-xs text-slate-600 flex flex-wrap gap-2">
          <span className="font-medium text-slate-700">Split Segments:</span>
          {shift.splitSegments.map((seg, idx) => (
            <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {seg.segmentName}: {seg.startTime} - {seg.endTime}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

export default TodayShiftCard;
