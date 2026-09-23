import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import TodayShiftCard from '../../components/attendance/TodayShiftCard';
import PunchActionCard from '../../components/attendance/PunchActionCard';
import AttendanceTimeline from '../../components/attendance/AttendanceTimeline';
import { Loader2, AlertCircle } from 'lucide-react';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodayData = async () => {
    try {
      const res = await api.get('/attendance/today');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load today attendance data:', err);
      setError('Unable to load attendance details. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const handlePunchSuccess = async (payload) => {
    try {
      const res = await api.post('/attendance/punch', payload);
      if (res.data.success) {
        // Refresh local view immediately
        await fetchTodayData();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Punch submission failed',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading today's attendance details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Today's Shift Overview Card */}
      <TodayShiftCard
        shift={data?.shift}
        summary={data?.summary}
        employee={data?.employee}
      />

      {/* 2. Hero Punch Action Area */}
      <PunchActionCard
        summary={data?.summary}
        shift={data?.shift}
        onPunchSuccess={handlePunchSuccess}
      />

      {/* 3. Visual Attendance Timeline */}
      <AttendanceTimeline
        events={data?.summary?.events || []}
        summary={data?.summary}
      />
    </div>
  );
};

export default EmployeeDashboard;
