/**
 * Utility formatters for dates, times, durations, and status badges
 */

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
};

export const formatMinutesToDuration = (minutes) => {
  if (minutes === undefined || minutes === null || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

export const formatDecimalHours = (hours) => {
  if (!hours || hours <= 0) return '0h 0m';
  const totalMins = Math.round(hours * 60);
  return formatMinutesToDuration(totalMins);
};

export const formatTimeSeconds = (totalSeconds) => {
  if (!totalSeconds || totalSeconds < 0) return '00:00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return [
    String(hrs).padStart(2, '0'),
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ].join(':');
};

export const getStatusConfig = (status) => {
  switch (status) {
    case 'PRESENT':
      return {
        label: 'Present',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'WORKING':
      return {
        label: 'Working Now',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20',
        dot: 'bg-emerald-500 animate-pulse',
      };
    case 'ON_BREAK':
      return {
        label: 'On Break',
        bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/20',
        dot: 'bg-blue-500 animate-pulse',
      };
    case 'LATE':
      return {
        label: 'Late',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'HALF_DAY':
      return {
        label: 'Half Day',
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'CHECKED_OUT':
      return {
        label: 'Checked Out',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
      };
    case 'MISSING_PUNCH':
      return {
        label: 'Missing Punch',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'ABSENT':
      return {
        label: 'Absent',
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      };
    case 'WEEKLY_OFF':
      return {
        label: 'Weekly Off',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    default:
      return {
        label: status || 'Not Marked',
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
};

export const getGoogleMapsUrl = (lat, lng) => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

export const getGPSAccuracyText = (accuracy) => {
  if (accuracy === undefined || accuracy === null) return 'Unknown accuracy';
  if (accuracy <= 20) return `±${Math.round(accuracy)}m (Excellent)`;
  if (accuracy <= 50) return `±${Math.round(accuracy)}m (Good)`;
  if (accuracy <= 100) return `±${Math.round(accuracy)}m (Moderate)`;
  return `±${Math.round(accuracy)}m (Low accuracy)`;
};
