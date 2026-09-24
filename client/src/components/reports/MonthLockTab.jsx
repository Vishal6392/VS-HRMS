import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Modal } from '../common/Modal';
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Clock,
  UserCheck,
} from 'lucide-react';
import api from '../../api/axios';
import { formatDate } from '../../utils/formatters';

export const MonthLockTab = ({ targetMonth, targetYear, onStatusChanged }) => {
  const [lockData, setLockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState('FINALIZE'); // 'FINALIZE' | 'REOPEN'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchLockStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/month-lock?month=${targetMonth}&year=${targetYear}`);
      if (res.data.success) {
        setLockData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch month lock status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockStatus();
  }, [targetMonth, targetYear]);

  const handleAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert(null);
    try {
      const res = await api.post('/reports/month-lock', {
        year: targetYear,
        month: targetMonth,
        action: modalAction,
        notes,
      });
      if (res.data.success) {
        setAlert({ type: 'success', message: res.data.message });
        setModalOpen(false);
        setNotes('');
        fetchLockStatus();
        if (onStatusChanged) onStatusChanged();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update month lock status.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isFinalized = lockData?.status === 'FINALIZED';
  const exceptions = lockData?.exceptions || {};
  const hasExceptions = (exceptions.missingPunches || 0) > 0 || (exceptions.unassignedShifts || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            alert.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{alert.message}</span>
          </div>
          <button type="button" onClick={() => setAlert(null)} className="underline opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Status Hero Card */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isFinalized
            ? 'bg-gradient-to-r from-purple-900 to-indigo-950 text-white border-purple-800 shadow-lg'
            : 'bg-gradient-to-r from-brand-900 to-slate-900 text-white border-slate-800 shadow-md'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isFinalized ? 'bg-purple-500 text-white' : 'bg-brand-500 text-white'
              }`}
            >
              {isFinalized ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isFinalized ? 'bg-purple-400/30 text-purple-200 border border-purple-400/40' : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  {isFinalized ? 'PAYROLL LOCKED / FINALIZED' : 'OPEN FOR RECONCILIATION'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {new Date(targetYear, targetMonth - 1, 1).toLocaleString('default', { month: 'long' })} {targetYear}
                </span>
              </div>
              <h1 className="text-xl font-bold mt-1.5">
                {isFinalized
                  ? 'Attendance Month Finalized & Locked for Salary'
                  : 'Attendance Month Open for Edits & Reconciliation'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isFinalized
                  ? `Finalized by ${lockData?.finalizedByName || 'HR Admin'} on ${
                      lockData?.finalizedAt ? formatDate(lockData.finalizedAt, 'dd MMM yyyy, HH:mm') : '—'
                    }. All attendance events, rosters, and adjustments for this month are locked.`
                  : 'Review month-end exceptions, complete attendance adjustments, and finalize the month to freeze salary inputs for payroll processing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFinalized ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalAction('REOPEN');
                  setModalOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Unlock className="w-4 h-4 mr-1.5" />
                Reopen Month
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setModalAction('FINALIZE');
                  setModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                Finalize Month
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Month-End Exception Checks Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Month-End Pre-Reconciliation Checks</h3>
            <p className="text-xs text-slate-500">
              Verify that these operational exceptions are resolved before final salary sign-off.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLockStatus} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-scan
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Check 1: Missing Punches */}
          <Card
            className={`p-4 border ${
              exceptions.missingPunches > 0
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase">Missing Punches</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  exceptions.missingPunches > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {exceptions.missingPunches > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{exceptions.missingPunches || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">Check-In without Check-Out on past dates</div>
          </Card>

          {/* Check 2: Unassigned Shifts */}
          <Card
            className={`p-4 border ${
              exceptions.unassignedShifts > 0
                ? 'border-rose-200 bg-rose-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase">Unassigned Shifts</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  exceptions.unassignedShifts > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {exceptions.unassignedShifts > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{exceptions.unassignedShifts || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active employees missing assigned shift</div>
          </Card>

          {/* Check 3: Pending Adjustments */}
          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase">Pending Adjustments</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{exceptions.pendingAdjustments || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">Adjustments awaiting HR approval</div>
          </Card>

          {/* Check 4: Total Active Staff */}
          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase">Active Employees</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{exceptions.totalActiveEmployees || 0}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total staff in payroll scope</div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalAction === 'FINALIZE' ? 'Finalize Attendance Month' : 'Reopen Attendance Month'}
        subtitle={`Action for ${new Date(targetYear, targetMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${targetYear}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAction} className="p-6 space-y-4">
          {modalAction === 'FINALIZE' && hasExceptions && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Exceptions Detected:</strong> There are unresolved missing punches or unassigned shifts. You can still finalize, but salary reconciliation may require manual review.
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            {modalAction === 'FINALIZE'
              ? 'Finalizing will lock all attendance summaries, roster dates, and adjustments for this month. HR can proceed to download the final salary input sheet.'
              : 'Reopening will allow HR to make further adjustments or roster updates. You can lock it again after completing changes.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Audit Remarks
            </label>
            <textarea
              rows={2}
              placeholder={
                modalAction === 'FINALIZE'
                  ? 'e.g. Month attendance verified by HR and ready for Accounts salary run.'
                  : 'e.g. Reopened to adjust overtime for IT support team.'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'FINALIZE' ? 'primary' : 'danger'}
              size="sm"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Processing...'
                : modalAction === 'FINALIZE'
                ? 'Confirm & Finalize'
                : 'Confirm & Reopen'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
