import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  MapPin,
  Camera,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import PunchVerificationModal from './PunchVerificationModal';

export const PunchActionCard = ({ summary, shift, onPunchSuccess }) => {
  const [activePunchType, setActivePunchType] = useState(null); // 'CHECK_IN' | 'BREAK_START' | 'BREAK_END' | 'CHECK_OUT'

  const currentStatus = summary?.status || 'ABSENT';
  const hasCheckedIn = summary && summary.firstCheckIn;
  const isWorking = currentStatus === 'WORKING';
  const isOnBreak = currentStatus === 'ON_BREAK';
  const isCheckedOut =
    currentStatus === 'CHECKED_OUT' ||
    (summary && summary.lastCheckOut && shift?.shiftType !== 'SPLIT');

  const handleOpenVerification = (type) => {
    setActivePunchType(type);
  };

  const handleCloseVerification = () => {
    setActivePunchType(null);
  };

  return (
    <>
      <Card className="p-5 md:p-6 border-slate-200 relative overflow-hidden shadow-card">
        {/* Header indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attendance Action
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* State description */}
        <div className="mb-5 text-center sm:text-left">
          {!hasCheckedIn && (
            <div>
              <h3 className="text-lg font-bold text-slate-900">You have not checked in yet</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark your check-in with GPS and live photo verification to begin your shift.
              </p>
            </div>
          )}

          {isWorking && (
            <div>
              <h3 className="text-lg font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                You are currently on duty
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Take a lunch break or check out when your shift concludes.
              </p>
            </div>
          )}

          {isOnBreak && (
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 mb-3">
              <h3 className="text-base font-bold text-blue-800 flex items-center justify-center sm:justify-start gap-2">
                <Coffee className="w-4 h-4 text-blue-600" />
                Lunch Break Active
              </h3>
              <p className="text-xs text-blue-600 mt-0.5">
                Click below to resume your working session when you return.
              </p>
            </div>
          )}

          {isCheckedOut && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
              <h3 className="text-base font-bold text-slate-800">Shift Completed for Today</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All daily attendance requirements have been successfully recorded.
              </p>
            </div>
          )}
        </div>

        {/* Main Action Buttons Area */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 1. If not checked in: [ CHECK IN ] */}
          {!hasCheckedIn && (
            <Button
              variant="success"
              size="xl"
              onClick={() => handleOpenVerification('CHECK_IN')}
              icon={LogIn}
              className="w-full text-base py-4 shadow-emerald-500/20 shadow-lg font-bold"
            >
              CHECK IN NOW
            </Button>
          )}

          {/* 2. If working: [ START BREAK ] and [ CHECK OUT ] */}
          {isWorking && (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleOpenVerification('BREAK_START')}
                icon={Coffee}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 font-bold"
              >
                START LUNCH
              </Button>

              <Button
                variant="danger"
                size="lg"
                onClick={() => handleOpenVerification('CHECK_OUT')}
                icon={LogOut}
                className="flex-1 py-3.5 shadow-rose-500/20 font-bold"
              >
                CHECK OUT
              </Button>
            </>
          )}

          {/* 3. If on break: only [ END BREAK ] enabled */}
          {isOnBreak && (
            <Button
              variant="primary"
              size="xl"
              onClick={() => handleOpenVerification('BREAK_END')}
              icon={CheckCircle2}
              className="w-full text-base py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 shadow-lg font-bold"
            >
              END LUNCH BREAK
            </Button>
          )}
        </div>

        {/* Verification badges */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            GPS Geofence Audited
          </span>
          <span className="flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-brand-600" />
            Live Photo Verified
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Server Timestamp
          </span>
        </div>
      </Card>

      {/* Unified Punch & Camera Verification Modal */}
      <PunchVerificationModal
        isOpen={!!activePunchType}
        onClose={handleCloseVerification}
        actionType={activePunchType || 'CHECK_IN'}
        onSubmitPunch={onPunchSuccess}
      />
    </>
  );
};

export default PunchActionCard;
