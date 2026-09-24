import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  Maximize2,
} from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import LocationDisplay from '../location/LocationDisplay';
import {
  formatTime,
  formatMinutesToDuration,
  formatDecimalHours,
} from '../../utils/formatters';

export const AttendanceTimeline = ({ events = [], summary = null }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!events || events.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium">No punches recorded for today yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Your check-in, breaks, and check-out timeline will appear here.
        </p>
      </Card>
    );
  }

  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const getEventMeta = (type) => {
    switch (type) {
      case 'CHECK_IN':
        return {
          title: 'CHECK IN',
          icon: LogIn,
          color: 'text-emerald-600 bg-emerald-100 border-emerald-300',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'BREAK_START':
        return {
          title: 'LUNCH / BREAK START',
          icon: Coffee,
          color: 'text-blue-600 bg-blue-100 border-blue-300',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'BREAK_END':
        return {
          title: 'LUNCH / BREAK END',
          icon: CheckCircle2,
          color: 'text-indigo-600 bg-indigo-100 border-indigo-300',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'CHECK_OUT':
        return {
          title: 'CHECK OUT',
          icon: LogOut,
          color: 'text-rose-600 bg-rose-100 border-rose-300',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          title: type,
          icon: Clock,
          color: 'text-slate-600 bg-slate-100 border-slate-300',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" />
          Attendance Activity Timeline
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          {sortedEvents.length} event(s)
        </span>
      </div>

      {/* Timeline items */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {sortedEvents.map((ev, idx) => {
          const meta = getEventMeta(ev.eventType);
          const Icon = meta.icon;

          return (
            <div key={ev._id || idx} className="relative group">
              {/* Timeline marker icon */}
              <div
                className={`absolute -left-6 top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${meta.color}`}
              >
                <div className="w-2 h-2 rounded-full bg-current" />
              </div>

              {/* Event Content */}
              <div className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatTime(ev.timestamp)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border ${meta.badge}`}
                    >
                      {meta.title}
                    </span>
                  </div>

                  {ev.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(ev.photoUrl)}
                      className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium bg-brand-50/60 px-2 py-0.5 rounded"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      View Photo
                    </button>
                  )}
                </div>

                {/* Location and Photo preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                  <LocationDisplay
                    latitude={ev.latitude}
                    longitude={ev.longitude}
                    accuracy={ev.accuracy}
                    timestamp={ev.timestamp}
                    matchedLocationName={ev.matchedLocationName}
                    distanceFromLocation={ev.distanceFromLocation}
                  />

                  {ev.photoUrl && (
                    <div
                      className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shrink-0 cursor-pointer shadow-xs group/thumb"
                      onClick={() => setSelectedPhoto(ev.photoUrl)}
                      title="Click to enlarge verified selfie"
                    >
                      <img
                        src={ev.photoUrl}
                        alt="Selfie"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary KPI Strip below Section 21 */}
      {summary && (
        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-slate-50 p-3 rounded-xl">
          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Total Work
            </span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {formatDecimalHours(summary.workingHours)}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Break
            </span>
            <span className="text-base font-bold text-blue-600 font-mono">
              {formatMinutesToDuration(summary.breakDurationMinutes)}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Late
            </span>
            <span
              className={`text-base font-bold font-mono ${
                summary.lateMinutes > 0 ? 'text-amber-600' : 'text-slate-600'
              }`}
            >
              {formatMinutesToDuration(summary.lateMinutes)}
            </span>
          </div>

          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">
              Overtime
            </span>
            <span
              className={`text-base font-bold font-mono ${
                summary.overtimeMinutes > 0 ? 'text-emerald-600' : 'text-slate-600'
              }`}
            >
              {formatMinutesToDuration(summary.overtimeMinutes)}
            </span>
          </div>
        </div>
      )}

      {/* Photo Enlarge Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title="Attendance Photo Audit"
        subtitle="Live camera capture verified at punch time."
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-black">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="w-full mt-4 text-center">
            <span className="text-xs text-slate-500">
              Verified by HTML5 MediaStream Camera Device
            </span>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default AttendanceTimeline;
