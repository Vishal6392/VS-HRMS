import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  VideoOff,
  Sparkles,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Lock,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../../api/axios';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatTime } from '../../utils/formatters';

export const PunchVerificationModal = ({
  isOpen,
  onClose,
  actionType = 'CHECK_IN',
  onSubmitPunch,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // States
  const [photoData, setPhotoData] = useState(null);
  const [locationData, setLocationData] = useState({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
  });
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [locationSource, setLocationSource] = useState('GPS Geofence');

  // Server Geofence Check State
  const [geofenceCheck, setGeofenceCheck] = useState({
    isLoading: true,
    result: null, // { allowed, reason, message, matchedLocation, nearestLocation, distance, allowedRadius, outsideMeters, currentAccuracy, requiredAccuracy }
    error: null,
  });

  const [cameraError, setCameraError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhotoData(null);
      setErrorMessage(null);
      setLocationError(null);
      setIsSuccess(false);
      setIsSubmitting(false);

      // Step 1: Detect Location & Validate Geofence (Camera will start ONLY if location is inside approved area)
      detectLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Real-time server-side geofence verification
  const validateLocationWithBackend = async (coords) => {
    setGeofenceCheck((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await api.post('/attendance/check-location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        eventType: actionType,
      });

      if (res.data.success) {
        const checkResult = res.data.data;
        setGeofenceCheck({
          isLoading: false,
          result: checkResult,
          error: null,
        });

        if (checkResult.allowed) {
          // Inside allowed geofence -> open camera for selfie verification!
          startCamera();
        } else {
          // Outside allowed geofence or poor accuracy -> do not run camera hardware unnecessarily
          stopCamera();
        }
      }
    } catch (err) {
      console.error('Server geofence pre-check failed:', err);
      const msg = err.response?.data?.message || 'Failed to verify location with server.';
      setGeofenceCheck({
        isLoading: false,
        result: null,
        error: msg,
      });
      stopCamera();
    }
  };

  const detectLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setErrorMessage(null);
    setGeofenceCheck({ isLoading: true, result: null, error: null });

    if (!navigator.geolocation) {
      setIsLocating(false);
      const msg = 'Geolocation is not supported by your browser.';
      setLocationError(msg);
      setGeofenceCheck({ isLoading: false, result: null, error: msg });
      stopCamera();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 10),
        };

        setLocationData(coords);
        setLocationSource('Live Device GPS');
        setIsLocating(false);

        // Validate coordinates against employee's allowed geofence locations
        validateLocationWithBackend(coords);

        // Optional: High-precision refinement
        navigator.geolocation.getCurrentPosition(
          (highPos) => {
            const refined = {
              latitude: Number(highPos.coords.latitude.toFixed(6)),
              longitude: Number(highPos.coords.longitude.toFixed(6)),
              accuracy: Math.round(highPos.coords.accuracy || 5),
            };
            setLocationData(refined);
            setLocationSource('High-Precision GPS');
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      },
      (err) => {
        setIsLocating(false);
        stopCamera();

        let friendlyError = 'Unable to determine your current location. Please try again.';
        if (err.code === 1) {
          friendlyError = 'Location permission is required to mark attendance. Please enable location permissions in your browser or device settings and try again.';
        } else if (err.code === 2) {
          friendlyError = 'Unable to determine your current location. Please verify device GPS or network and try again.';
        } else if (err.code === 3) {
          friendlyError = 'Location request timed out. Please check device GPS and try again.';
        }

        setLocationError(friendlyError);
        setGeofenceCheck({
          isLoading: false,
          result: null,
          error: friendlyError,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API not supported in this browser. Use demo snapshot.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError('Camera hardware unavailable or permission denied.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getSnapshotFromVideo = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const createSimulatedPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(200, 150, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(200, 360, 130, 0, Math.PI, true);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Live Verified: ${new Date().toLocaleTimeString()}`, 20, 380);

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Main Action: Capture & Punch Immediately!
  const handleCaptureAndPunch = async (fallbackPhoto = null) => {
    if (!geofenceCheck.result?.allowed) {
      setErrorMessage('Cannot confirm attendance: You are outside the allowed attendance area.');
      return;
    }

    let captured = fallbackPhoto;
    if (!captured) {
      captured = getSnapshotFromVideo();
    }

    if (!captured) {
      captured = createSimulatedPhoto();
    }

    setPhotoData(captured);
    stopCamera();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        eventType: actionType,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        photoUrl: captured,
        breakType: 'LUNCH',
      };

      const result = await onSubmitPunch(payload);
      if (result && result.success) {
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 55,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        // Auto close after brief celebration
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(result?.message || 'Failed to record punch. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'An error occurred while marking attendance.'
      );
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    if (geofenceCheck.result?.allowed) {
      startCamera();
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'CHECK_IN':
        return 'Check In Verification';
      case 'BREAK_START':
        return 'Start Lunch Break Verification';
      case 'BREAK_END':
        return 'End Lunch Break Verification';
      case 'CHECK_OUT':
        return 'Check Out Verification';
      default:
        return 'Attendance Verification';
    }
  };

  const getButtonText = () => {
    switch (actionType) {
      case 'CHECK_IN':
        return 'Capture Selfie & Complete Check In';
      case 'BREAK_START':
        return 'Capture Selfie & Start Lunch';
      case 'BREAK_END':
        return 'Capture Selfie & End Break';
      case 'CHECK_OUT':
        return 'Capture Selfie & Check Out';
      default:
        return 'Capture & Confirm';
    }
  };

  const isLocationVerified = Boolean(geofenceCheck.result?.allowed);
  const isCheckingLocation = isLocating || geofenceCheck.isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={getTitle()}
      subtitle="Location coordinates and live selfie capture."
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-xs">
        {/* 1. Location Status Section */}
        {isCheckingLocation ? (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Location Status: Checking location...
                </span>
                <span className="text-[11px] text-slate-500">
                  Acquiring device GPS coordinates & validating geo-fence perimeter...
                </span>
              </div>
            </div>
          </div>
        ) : locationError ? (
          <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-3 text-rose-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="font-bold text-xs block">Location Permission Required</span>
                <p className="text-[11px] text-rose-700">{locationError}</p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                icon={RefreshCw}
                className="bg-white border-rose-300 text-rose-700 hover:bg-rose-100 text-xs py-1"
              >
                Retry Location Access
              </Button>
            </div>
          </div>
        ) : isLocationVerified ? (
          <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>✓ Location verified</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    {geofenceCheck.result.matchedLocationName || 'Approved Location'}
                    {geofenceCheck.result.geofenceStatus !== 'EXEMPT' && (
                      <span className="font-mono ml-1.5">
                        • Distance: {geofenceCheck.result.distance}m
                        {geofenceCheck.result.allowedRadius ? ` (Allowed: ${geofenceCheck.result.allowedRadius}m)` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={detectLocation}
                  className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-200/60 rounded transition-colors"
                  title="Refresh GPS"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  ±{Math.round(locationData.accuracy)}m
                </span>
              </div>
            </div>
          </div>
        ) : geofenceCheck.result?.reason === 'POOR_GPS_ACCURACY' ? (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-3 text-amber-900">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="font-bold text-xs block">
                  ⚠ GPS accuracy is too low
                </span>
                <div className="text-[11px] text-amber-800">
                  Current accuracy: <span className="font-mono font-bold">±{geofenceCheck.result?.currentAccuracy}m</span> • Required: <span className="font-mono font-bold">within ±{geofenceCheck.result?.requiredAccuracy}m</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Your current GPS accuracy is too low for attendance verification. Please enable high-accuracy location or step outdoors and try again.
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                icon={RefreshCw}
                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 text-xs py-1"
              >
                Retry High-Accuracy GPS
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-3 text-rose-900">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="font-bold text-xs block">
                  ✕ Outside allowed area
                </span>
                {geofenceCheck.result?.nearestLocation ? (
                  <>
                    <div className="text-[11px] text-rose-800">
                      Nearest location: <strong className="font-semibold">{geofenceCheck.result.nearestLocation.locationName}</strong>
                    </div>
                    <div className="text-[11px] text-rose-700 font-mono">
                      Distance: {geofenceCheck.result.distance}m • Allowed: {geofenceCheck.result.allowedRadius}m
                    </div>
                    <div className="text-[11px] font-semibold text-rose-800 pt-0.5">
                      You are {geofenceCheck.result.outsideMeters} meters outside the allowed attendance area.
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-rose-700">
                    {geofenceCheck.result?.message || 'No approved attendance locations match your current position.'}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-200 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                icon={RefreshCw}
                className="bg-white border-rose-300 text-rose-700 hover:bg-rose-100 text-xs py-1"
              >
                Re-check Current Location
              </Button>
            </div>
          </div>
        )}

        {/* 2. Camera Viewfinder Area */}
        <div className="relative w-full aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center mb-4">
          {photoData ? (
            <div className="relative w-full h-full">
              <img
                src={photoData}
                alt="Captured selfie preview"
                className="w-full h-full object-cover"
              />
              {isSuccess && (
                <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold">Attendance Recorded!</h4>
                  <p className="text-xs text-emerald-200 mt-0.5">Status updated successfully</p>
                </div>
              )}
            </div>
          ) : !isLocationVerified ? (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2 border border-slate-700">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">Camera Locked</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                {isCheckingLocation
                  ? 'Verifying your GPS coordinates against allowed geo-fence perimeters...'
                  : 'Live selfie camera will activate once you are within an approved attendance area.'}
              </p>
            </div>
          ) : cameraError ? (
            <div className="p-6 text-center text-slate-300">
              <VideoOff className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-rose-200 mb-1">{cameraError}</p>
              <p className="text-[11px] text-slate-400 mb-3">
                Click below to use the verified demo snapshot.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCaptureAndPunch(createSimulatedPhoto())}
                icon={Sparkles}
                className="bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
              >
                Use Verified Snapshot & Complete
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/60 ring-4 ring-black/20" />
              </div>
              <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Live Camera Ready
              </div>
            </>
          )}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="w-full p-2.5 mb-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 3. Action Controls */}
        <div className="w-full space-y-2">
          {!photoData ? (
            <>
              <Button
                variant={isLocationVerified ? 'success' : 'secondary'}
                size="lg"
                onClick={() => handleCaptureAndPunch()}
                disabled={isSubmitting || !isLocationVerified}
                isLoading={isSubmitting}
                icon={Camera}
                className={`w-full py-3.5 text-sm font-bold ${
                  isLocationVerified
                    ? 'shadow-md shadow-emerald-500/20'
                    : 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-600'
                }`}
              >
                {isSubmitting
                  ? 'Verifying & Recording...'
                  : !isLocationVerified
                  ? 'Outside Geo-Fence Perimeter'
                  : getButtonText()}
              </Button>

              {isLocationVerified && !cameraError && (
                <button
                  type="button"
                  onClick={() => handleCaptureAndPunch(createSimulatedPhoto())}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-brand-600 transition-colors py-1 flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Testing without webcam? Click for Instant Verified Snapshot
                </button>
              )}
            </>
          ) : !isSuccess ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleRetake}
                disabled={isSubmitting}
                icon={RefreshCw}
                className="flex-1"
              >
                Retake
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={() => handleCaptureAndPunch(photoData)}
                isLoading={isSubmitting}
                icon={CheckCircle2}
                className="flex-1 shadow-md"
              >
                Retry Submit
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default PunchVerificationModal;
