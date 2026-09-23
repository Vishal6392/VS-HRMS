import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import { Coffee, Clock, Calendar, Loader2 } from 'lucide-react';
import { formatDate, formatTime, formatMinutesToDuration } from '../../utils/formatters';

export const MyBreaks = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBreakHistory = async () => {
      try {
        const res = await api.get('/attendance/my-history');
        if (res.data.success) {
          // Extract break events from summaries
          const breakList = [];
          res.data.data.forEach((summary) => {
            const events = summary.events || [];
            const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let currentStart = null;
            sorted.forEach((ev) => {
              if (ev.eventType === 'BREAK_START') {
                currentStart = ev;
              } else if (ev.eventType === 'BREAK_END' && currentStart) {
                const diffMins = Math.round(
                  (new Date(ev.timestamp) - new Date(currentStart.timestamp)) / 60000
                );
                breakList.push({
                  date: summary.attendanceDate,
                  type: currentStart.breakType || 'Lunch Break',
                  start: currentStart.timestamp,
                  end: ev.timestamp,
                  durationMinutes: diffMins,
                });
                currentStart = null;
              }
            });

            // If an active break is still in progress
            if (currentStart) {
              breakList.push({
                date: summary.attendanceDate,
                type: currentStart.breakType || 'Lunch Break',
                start: currentStart.timestamp,
                end: null,
                durationMinutes: null,
                inProgress: true,
              });
            }
          });

          setHistory(breakList);
        }
      } catch (err) {
        console.error('Failed to load break history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading break history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Break History</h2>
        <p className="text-xs text-slate-500">Record of lunch breaks and pauses taken during shifts.</p>
      </div>

      {history.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Coffee}
            title="No Breaks Recorded"
            description="You have not taken or completed any recorded breaks yet."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((brk, idx) => (
            <Card key={idx} className="p-4 border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{brk.type}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(brk.date)}
                    </span>
                  </div>
                </div>

                {brk.inProgress ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold animate-pulse border border-blue-200">
                    In Progress
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                    {formatMinutesToDuration(brk.durationMinutes)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Start: <strong className="text-slate-700 font-mono">{formatTime(brk.start)}</strong></span>
                <span>
                  End:{' '}
                  <strong className="text-slate-700 font-mono">
                    {brk.end ? formatTime(brk.end) : 'Active now'}
                  </strong>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBreaks;
