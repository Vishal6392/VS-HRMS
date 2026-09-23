import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const Profile = () => {
  const { user } = useAuth();
  const emp = user?.employee;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setIsChangingPass(true);
    setPassFeedback(null);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setPassFeedback({ type: 'success', message: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setPassFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update password.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
        <p className="text-xs text-slate-500">Your employee records and account credentials.</p>
      </div>

      {/* Main Profile Info Card */}
      <Card className="p-5 border-slate-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
            {emp?.fullName ? emp.fullName.charAt(0) : 'E'}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{emp?.fullName || 'Employee'}</h3>
            <p className="text-xs text-brand-600 font-medium">{emp?.designation || 'Staff Member'}</p>
            <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              ID: {emp?.employeeId || 'EMP000'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Email</span>
              <span className="font-semibold text-slate-800">{emp?.email || user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Mobile</span>
              <span className="font-semibold text-slate-800">{emp?.mobile || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Department</span>
              <span className="font-semibold text-slate-800">{emp?.department || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Joining Date</span>
              <span className="font-semibold text-slate-800">
                {emp?.joiningDate ? formatDate(emp.joiningDate) : '—'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Assigned Shift Card */}
      <Card className="p-5 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Assigned Work Shift
          </h4>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {emp?.assignedShift?.shiftCode || 'GS'}
          </span>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
          <div className="flex justify-between">
            <span className="text-slate-500">Shift Name:</span>
            <span className="font-semibold text-slate-800">{emp?.assignedShift?.shiftName || 'General Shift'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Working Hours:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {emp?.assignedShift?.startTime || '09:30'} — {emp?.assignedShift?.endTime || '18:30'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Grace Period:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {emp?.assignedShift?.gracePeriodMinutes || 15} minutes
            </span>
          </div>
        </div>
      </Card>

      {/* Change Password Card */}
      <Card className="p-5 border-slate-200">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          Change Password
        </h4>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          {passFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {passFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passFeedback.message}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isChangingPass}
            className="w-full mt-1"
          >
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
