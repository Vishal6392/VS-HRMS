import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Modal } from '../common/Modal';
import EmptyState from '../common/EmptyState';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Coffee,
  Info,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

export const MonthlyAttendanceRegister = ({
  dates = [],
  data = [],
  loading = false,
  targetMonth,
  targetYear,
  onQuickAdjust,
}) => {
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Badge styler for standardized statuses
  const renderStatusBadge = (day) => {
    if (!day) return <span className="text-slate-300 font-mono">—</span>;
    const code = day.statusCode || 'A';

    switch (code) {
      case 'P':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:scale-105 transition-transform"
            title={`Present - ${day.workingHours || 0} hrs`}
          >
            P
          </span>
        );
      case 'A':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200 hover:scale-105 transition-transform"
            title="Absent"
          >
            A
          </span>
        );
      case 'WO':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 hover:scale-105 transition-transform"
            title="Weekly Off"
          >
            WO
          </span>
        );
      case 'CO':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200 hover:scale-105 transition-transform"
            title={day.compOffForDate ? `Comp-Off (against ${day.compOffForDate})` : 'Compensatory Off'}
          >
            CO
          </span>
        );
      case 'H':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200 hover:scale-105 transition-transform"
            title="Holiday"
          >
            H
          </span>
        );
      case 'WOW':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200 hover:scale-105 transition-transform"
            title="Week-Off Worked"
          >
            WOW
          </span>
        );
      case 'HW':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[10px] bg-orange-50 text-orange-700 border border-orange-200 hover:scale-105 transition-transform"
            title="Holiday Worked"
          >
            HW
          </span>
        );
      case 'L':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-cyan-50 text-cyan-700 border border-cyan-200 hover:scale-105 transition-transform"
            title="Leave"
          >
            L
          </span>
        );
      case 'MP':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
            title="Missing Punch"
          >
            MP
          </span>
        );
      case 'SCHEDULED':
        return (
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[10px] font-semibold bg-indigo-50/60 text-indigo-600 border border-indigo-100 hover:scale-105 transition-transform"
            title="Scheduled Future Shift"
          >
            {day.scheduledShift?.shiftCode?.slice(0, 3) || 'SCH'}
          </span>
        );
      default:
        return (
          <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-[11px] bg-slate-50 text-slate-600 border border-slate-200">
            {code}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Legend Ribbon */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
        <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">P</span>
          <span className="text-slate-600">Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">A</span>
          <span className="text-slate-600">Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">WO</span>
          <span className="text-slate-600">Week Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">CO</span>
          <span className="text-slate-600">Comp-Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">H</span>
          <span className="text-slate-600">Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">WOW</span>
          <span className="text-slate-600">Week Off Worked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-orange-50 text-orange-700 border border-orange-200">HW</span>
          <span className="text-slate-600">Holiday Worked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200">L</span>
          <span className="text-slate-600">Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">MP</span>
          <span className="text-slate-600">Missing Punch</span>
        </div>
      </div>

      {/* Main Register Table Card */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-600" />
              Compiling monthly attendance register...
            </div>
          ) : data.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Calendar}
                title="No attendance register records"
                description={`No active employee records found for ${targetMonth}/${targetYear}.`}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  {/* Sticky Employee Header */}
                  <th className="py-3 px-3.5 sticky left-0 z-20 bg-slate-50 font-bold uppercase tracking-wider text-[11px] min-w-[200px] border-r border-slate-200">
                    Employee Profile
                  </th>

                  {/* Date Columns 1..31 */}
                  {dates.map((d) => (
                    <th
                      key={d.dateStr}
                      className={`py-2 px-1 text-center font-bold min-w-[36px] border-r border-slate-100 ${
                        d.isWeekend ? 'bg-amber-50/50 text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="text-[12px]">{String(d.dayNumber).padStart(2, '0')}</div>
                      <div className="text-[9px] uppercase font-semibold text-slate-400">
                        {d.dayName}
                      </div>
                    </th>
                  ))}

                  {/* Summary Totals Headers */}
                  <th className="py-2 px-2 text-center font-bold bg-emerald-50/70 text-emerald-800 border-r border-emerald-100" title="Present Days">P</th>
                  <th className="py-2 px-2 text-center font-bold bg-rose-50/70 text-rose-800 border-r border-rose-100" title="Absent Days">A</th>
                  <th className="py-2 px-2 text-center font-bold bg-slate-100 text-slate-700 border-r border-slate-200" title="Week Offs">WO</th>
                  <th className="py-2 px-2 text-center font-bold bg-purple-50/70 text-purple-800 border-r border-purple-100" title="Comp Offs">CO</th>
                  <th className="py-2 px-2 text-center font-bold bg-amber-50/70 text-amber-800 border-r border-amber-100" title="Holidays">H</th>
                  <th className="py-2 px-2 text-center font-bold bg-blue-50/70 text-blue-800 border-r border-blue-100" title="Off-Days Worked (WOW+HW)">WOW</th>
                  <th className="py-2 px-2 text-center font-bold bg-slate-50 text-slate-700 border-r border-slate-200" title="Late Days">Late</th>
                  <th className="py-2 px-2.5 text-center font-bold bg-slate-50 text-slate-800 border-r border-slate-200" title="Total Working Hours">Hours</th>
                  <th className="py-2 px-2 text-center font-bold bg-slate-50 text-slate-800" title="Total Overtime Minutes">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((emp) => {
                  const totals = emp.totals || {};
                  return (
                    <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sticky Employee Row Header */}
                      <td className="py-3 px-3.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-xs">
                        <div className="font-semibold text-slate-900 truncate max-w-[190px]">
                          {emp.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                          <span>{emp.employeeId}</span>
                          <span>•</span>
                          <span className="truncate">{emp.department}</span>
                        </div>
                      </td>

                      {/* Day Cells 1..31 */}
                      {dates.map((d) => {
                        const dayData = emp.daily?.[d.dateStr] || null;
                        return (
                          <td
                            key={d.dateStr}
                            onClick={() =>
                              setSelectedDayDetail({
                                employee: emp,
                                date: d,
                                day: dayData,
                              })
                            }
                            className={`p-1 text-center cursor-pointer border-r border-slate-100 hover:bg-brand-50/50 transition-colors ${
                              d.isWeekend ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            {renderStatusBadge(dayData)}
                          </td>
                        );
                      })}

                      {/* Row Totals */}
                      <td className="py-2.5 px-2 text-center font-bold font-mono text-emerald-700 bg-emerald-50/30 border-r border-emerald-100">
                        {totals.presentDays || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold font-mono text-rose-700 bg-rose-50/30 border-r border-rose-100">
                        {totals.absentDays || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold font-mono text-slate-700 bg-slate-50/50 border-r border-slate-200">
                        {totals.weekOffDays || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold font-mono text-purple-700 bg-purple-50/30 border-r border-purple-100">
                        {totals.compOffDays || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold font-mono text-amber-700 bg-amber-50/30 border-r border-amber-100">
                        {totals.holidayDays || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold font-mono text-blue-700 bg-blue-50/30 border-r border-blue-100">
                        {(totals.weekOffWorkedDays || 0) + (totals.holidayWorkedDays || 0)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium font-mono text-slate-600 border-r border-slate-200">
                        {totals.lateDays || 0}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-bold font-mono text-slate-800 border-r border-slate-200">
                        {totals.totalWorkingHours || 0}h
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium font-mono text-slate-600">
                        {totals.totalOvertimeMinutes > 0 ? `${totals.totalOvertimeMinutes}m` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Daily Detail View Modal */}
      {selectedDayDetail && (
        <Modal
          isOpen={Boolean(selectedDayDetail)}
          onClose={() => setSelectedDayDetail(null)}
          title={`Attendance Audit - ${selectedDayDetail.date?.dateStr}`}
          subtitle={`${selectedDayDetail.employee?.fullName} (${selectedDayDetail.employee?.employeeId}) • ${selectedDayDetail.date?.dayName}`}
          maxWidth="max-w-lg"
        >
          <div className="p-6 space-y-4 text-xs">
            {/* Top Status & Shift Header */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400">Roster & Schedule</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedDayDetail.day?.scheduledShift?.shiftName || 'Weekly Off / None'}
                </div>
                {selectedDayDetail.day?.scheduledShift && (
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedDayDetail.day?.scheduledShift.startTime} – {selectedDayDetail.day?.scheduledShift.endTime} ({selectedDayDetail.day?.scheduledShift.shiftType})
                  </div>
                )}
              </div>
              <div>
                {renderStatusBadge(selectedDayDetail.day)}
              </div>
            </div>

            {/* Attendance Punch Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">First Check-In</span>
                <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                  {selectedDayDetail.day?.actualCheckIn || 'No Punch'}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last Check-Out</span>
                <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                  {selectedDayDetail.day?.actualCheckOut || 'No Punch'}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Working Hours</span>
                <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                  {selectedDayDetail.day?.workingHours || 0} hrs
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Break Duration</span>
                <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                  {selectedDayDetail.day?.breakDurationMinutes || 0} mins
                </div>
              </div>
            </div>

            {/* Late / Overtime Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500">Late Arrival</span>
                <div className="font-bold font-mono text-rose-600 mt-0.5">
                  {selectedDayDetail.day?.lateMinutes || 0}m
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500">Early Leaving</span>
                <div className="font-bold font-mono text-amber-600 mt-0.5">
                  {selectedDayDetail.day?.earlyLeavingMinutes || 0}m
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500">Overtime</span>
                <div className="font-bold font-mono text-emerald-600 mt-0.5">
                  {selectedDayDetail.day?.overtimeMinutes || 0}m
                </div>
              </div>
            </div>

            {/* GPS Location & Geo-fence Audit */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Geofence & Location Audit</span>
              </div>
              <div className="text-xs text-slate-800 font-medium">
                Location: <strong>{selectedDayDetail.day?.locationName || 'Unassigned / Anywhere'}</strong>
              </div>
              {selectedDayDetail.day?.locationDistance != null && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Distance: {selectedDayDetail.day.locationDistance}m • GPS Accuracy: ±{selectedDayDetail.day.locationAccuracy || 10}m
                </div>
              )}
            </div>

            {/* Off-Day & Comp-Off Details */}
            {(selectedDayDetail.day?.isCompOff || selectedDayDetail.day?.compOffForDate || selectedDayDetail.day?.isWeekOffWorked || selectedDayDetail.day?.isHolidayWorked) && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Off-Duty & Rotation Intelligence</span>
                </div>
                {selectedDayDetail.day?.compOffForDate && (
                  <p className="text-[11px]">
                    This day is an approved Compensatory Off granted against worked duty on: <strong>{selectedDayDetail.day.compOffForDate}</strong>.
                  </p>
                )}
                {selectedDayDetail.day?.isWeekOffWorked && (
                  <p className="text-[11px]">
                    Employee was scheduled or punched on a natural Weekly Off (Week Off Worked).
                  </p>
                )}
                {selectedDayDetail.day?.isHolidayWorked && (
                  <p className="text-[11px]">
                    Employee performed duty on a public or company holiday (Holiday Worked).
                  </p>
                )}
              </div>
            )}

            {/* Manual Adjustment Trail */}
            {selectedDayDetail.day?.isAdjusted && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Manual HR Adjustment Active</span>
                </div>
                <p className="text-[11px]">
                  Status modified from <strong>{selectedDayDetail.day.adjustmentDetails?.originalStatus}</strong> to <strong>{selectedDayDetail.day.adjustmentDetails?.adjustedStatus}</strong> by {selectedDayDetail.day.adjustmentDetails?.approvedByName}.
                </p>
                <p className="text-[10px] text-emerald-700 italic">
                  Reason: "{selectedDayDetail.day.adjustmentDetails?.reason}"
                </p>
              </div>
            )}

            {/* Quick Action Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const emp = selectedDayDetail.employee;
                  const date = selectedDayDetail.date?.dateStr;
                  const currentStatus = selectedDayDetail.day?.statusCode || 'A';
                  setSelectedDayDetail(null);
                  if (onQuickAdjust) {
                    onQuickAdjust({
                      employeeId: emp._id,
                      date,
                      originalStatus: currentStatus,
                    });
                  }
                }}
                className="text-brand-600 hover:text-brand-700 border-brand-200"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Adjust Attendance
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setSelectedDayDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
