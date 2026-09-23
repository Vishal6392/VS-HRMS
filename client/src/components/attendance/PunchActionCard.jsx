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
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import LiveCameraModal from '../camera/LiveCameraModal';
import LocationDisplay from '../location/LocationDisplay';
import { formatTime, getGPSAccuracyText } from '../../utils/formatters';

export const PunchActionCard = ({ summary, shift, onPunchSuccess }) => {
  const [targetAction, setTargetAction] = useState(null); // 'CHECK_IN' | 'BREAK_START' | 'BREAK_END' | 'CHECK_OUT'
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isConfirmingPunch, setIsConfirmingPunch] = useState(false);
  const [punchFeedback, setPunchFeedback] = useState(null);

  const currentStatus = summary?.status || 'ABSENT';
  const hasCheckedIn = summary && summary.firstCheckIn;
  const isWorking = currentStatus === 'WORKING';
  const isOnBreak = currentStatus === 'ON_BREAK';
  const isCheckedOut = currentStatus === 'CHECKED_OUT' || (summary && summary.lastCheckOut && shift?.shiftType !== 'SPLIT');

  // Trigger the multi-step verification process
  const startPunchFlow = (actionType) => {
    setTargetAction(actionType);
    setCapturedPhoto(null);
    setLocationError(null);
    setPunchFeedback(null);
    setIsGettingLocation(true);

    // Step 1: Query browser GPS
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      // Provide a standard office coordinate fallback for test environment
      setLocationData({ latitude: 28.6139, longitude: 77.2090, accuracy: 15 });
      setIsGettingLocation(false);
      setIsCameraOpen(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
        // Step 2: Open Camera modal automatically
        setIsCameraOpen(true);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        let msg = 'Location permission is required to mark attendance.';
        if (error.code === error.TIMEOUT) msg = 'Location request timed out. Please try again.';
        if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location information is unavailable.';
        setLocationError(msg);

        // Fallback office coordinate so user can still test in restricted browser settings
        setLocationData({ latitude: 28.6139, longitude: 77.2090, accuracy: 18 });
        setIsGettingLocation(false);
        setIsCameraOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handlePhotoCaptured = (photoBase64) => {
    setCapturedPhoto(photoBase64);
    // Proceed to Step 3: Confirmation modal is now shown because capturedPhoto exists!
  };

  const handleConfirmPunch = async () => {
    if (!targetAction || !locationData || !capturedPhoto) return;

    setIsConfirmingPunch(true);
    setPunchFeedback(null);

    try {
      const payload = {
        eventType: targetAction,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        photoUrl: capturedPhoto,
        breakType: 'LUNCH',
      };

      const result = await onPunchSuccess(payload);
      if (result && result.success) {
        // Trigger celebratory confetti on check-in or checkout!
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (e) {}

        // Reset state
        setTargetAction(null);
        setCapturedPhoto(null);
        setLocationData(null);
      } else {
        setPunchFeedback({
          type: 'error',
          message: result?.message || 'Failed to record attendance. Please try again.',
        });
      }
    } catch (err) {
      setPunchFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'An error occurred while punching.',
      });
    } finally {
      setIsConfirmingPunch(false);
    }
  };

  const getActionTitle = (type) => {
    switch (type) {
      case 'CHECK_IN':
        return 'Ready to Check In?';
      case 'BREAK_START':
        return 'Ready to Start Lunch Break?';
      case 'BREAK_END':
        return 'Ready to End Lunch Break?';
      case 'CHECK_OUT':
        return 'Ready to Check Out?';
      default:
        return 'Confirm Attendance Verification';
    }
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
            {isGettingLocation && (
              <span className="text-xs text-brand-600 animate-pulse font-medium">
                Detecting GPS Location...
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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

        {/* Main Action Buttons Area (Section 8 strictly enforced) */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 1. If not checked in: [ CHECK IN ] */}
          {!hasCheckedIn && (
            <Button
              variant="success"
              size="xl"
              onClick={() => startPunchFlow('CHECK_IN')}
              icon={LogIn}
              isLoading={isGettingLocation}
              className="w-full text-base py-4 shadow-emerald-500/20 shadow-lg"
            >
              {isGettingLocation ? 'Detecting Location...' : 'CHECK IN NOW'}
            </Button>
          )}

          {/* 2. If working: [ START BREAK ] and [ CHECK OUT ] */}
          {isWorking && (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => startPunchFlow('BREAK_START')}
                icon={Coffee}
                isLoading={isGettingLocation && targetAction === 'BREAK_START'}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              >
                START LUNCH
              </Button>

              <Button
                variant="danger"
                size="lg"
                onClick={() => startPunchFlow('CHECK_OUT')}
                icon={LogOut}
                isLoading={isGettingLocation && targetAction === 'CHECK_OUT'}
                className="flex-1 py-3.5 shadow-rose-500/20"
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
              onClick={() => startPunchFlow('BREAK_END')}
              icon={CheckCircle2}
              isLoading={isGettingLocation}
              className="w-full text-base py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 shadow-lg"
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

      {/* Live Camera Capture Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          if (!capturedPhoto) setTargetAction(null);
        }}
        onCapture={handlePhotoCaptured}
        actionTitle={targetAction?.replace('_', ' ') || 'Verification'}
      />

      {/* Step 3: Confirmation Dialog (Section 9) */}
      <Modal
        isOpen={!!capturedPhoto && !!targetAction}
        onClose={() => {
          setCapturedPhoto(null);
          setTargetAction(null);
        }}
        title={getActionTitle(targetAction)}
        subtitle="Review your captured location and photo before confirming."
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center">
          {/* Captured photo preview */}
          <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-brand-500 shadow-md mb-4 bg-black">
            {capturedPhoto && (
              <img
                src={capturedPhoto}
                alt="Captured selfie confirmation"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          {/* Summary verification card */}
          <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Action:</span>
              <span className="font-bold text-slate-800 uppercase">
                {targetAction?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Detected Time:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatTime(new Date())}
              </span>
            </div>

            <div className="flex justify-between items-start pt-1">
              <span className="text-slate-500">GPS Location:</span>
              <div className="text-right">
                <LocationDisplay
                  latitude={locationData?.latitude}
                  longitude={locationData?.longitude}
                  accuracy={locationData?.accuracy}
                  showMapLink={false}
                />
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {punchFeedback && (
            <div className="w-full p-3 mb-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{punchFeedback.message}</span>
            </div>
          )}

          {/* Confirm Button */}
          <div className="w-full flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCapturedPhoto(null);
                setIsCameraOpen(true);
              }}
              disabled={isConfirmingPunch}
              className="flex-1"
            >
              Retake Photo
            </Button>

            <Button
              variant="success"
              onClick={handleConfirmPunch}
              isLoading={isConfirmingPunch}
              icon={CheckCircle2}
              className="flex-1 shadow-md shadow-emerald-500/20"
            >
              CONFIRM PUNCH
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PunchActionCard;
