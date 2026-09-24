import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Modal } from '../common/Modal';
import EmptyState from '../common/EmptyState';
import {
  FileEdit,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';
import api from '../../api/axios';
import { formatDate } from '../../utils/formatters';

export const AttendanceAdjustmentsTab = ({ targetMonth, targetYear, employees = [], onDataChanged }) => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState(null);

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    originalStatus: 'A',
    adjustedStatus: 'P',
    adjustmentType: 'ABSENT_TO_PRESENT',
    reason: '',
    referenceDate: '',
  });

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/adjustments?month=${targetMonth}&year=${targetYear}`);
      if (res.data.success) {
        setAdjustments(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load adjustments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [targetMonth, targetYear]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.date || !form.reason) {
      setAlert({ type: 'error', message: 'Please fill all required fields.' });
      return;
    }

    setFormLoading(true);
    setAlert(null);
    try {
      const res = await api.post('/reports/adjustments', form);
      if (res.data.success) {
        setAlert({ type: 'success', message: res.data.message });
        setModalOpen(false);
        setForm({
          employeeId: '',
          date: new Date().toISOString().split('T')[0],
          originalStatus: 'A',
          adjustedStatus: 'P',
          adjustmentType: 'ABSENT_TO_PRESENT',
          reason: '',
          referenceDate: '',
        });
        fetchAdjustments();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save attendance adjustment.',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete and revert this attendance adjustment?')) return;
    try {
      const res = await api.delete(`/reports/adjustments/${id}`);
      if (res.data.success) {
        setAlert({ type: 'success', message: 'Adjustment reverted.' });
        fetchAdjustments();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete adjustment.' });
    }
  };

  const filtered = adjustments.filter(
    (a) =>
      a.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Alert banner */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            alert.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{alert.message}</span>
          </div>
          <button type="button" onClick={() => setAlert(null)} className="underline opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Attendance Adjustments & Reconciliation Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record and audit HR modifications (e.g. Absent converted to Comp-Off or Present). Every change is audited.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdjustments}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Adjustment
          </Button>
        </div>
      </div>

      {/* Adjustments Table Card */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee, ID or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            />
          </div>
          <div className="text-xs text-slate-500">
            Total <strong>{filtered.length}</strong> adjustments recorded
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading adjustments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={FileEdit}
                title="No attendance adjustments"
                description={`No manual adjustments have been created for ${targetMonth}/${targetYear}.`}
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status Change</th>
                  <th className="py-3 px-4">Adjustment Type</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Reference Date</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((adj) => (
                  <tr key={adj._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{adj.employee?.fullName || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{adj.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{adj.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold font-mono">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 border border-slate-200">
                          {adj.originalStatus}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {adj.adjustedStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium text-slate-600">
                        {adj.adjustmentType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={adj.reason}>
                      {adj.reason}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {adj.referenceDate || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{adj.approvedByName || 'HR Admin'}</div>
                      <div className="text-[10px] text-slate-400">
                        {adj.createdAt ? formatDate(adj.createdAt, 'dd MMM yyyy, HH:mm') : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(adj._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete and revert adjustment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal: Create Adjustment */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Attendance Adjustment"
        subtitle="Modify an attendance status for an employee with an official audit record."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Employee *
            </label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId}) - {emp.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Original Status *
              </label>
              <select
                value={form.originalStatus}
                onChange={(e) => setForm({ ...form, originalStatus: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="A">Absent (A)</option>
                <option value="WO">Weekly Off (WO)</option>
                <option value="H">Holiday (H)</option>
                <option value="MP">Missing Punch (MP)</option>
                <option value="L">Leave (L)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Adjusted Status *
              </label>
              <select
                value={form.adjustedStatus}
                onChange={(e) => setForm({ ...form, adjustedStatus: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 bg-white font-bold text-emerald-700"
              >
                <option value="P">Present (P)</option>
                <option value="CO">Comp-Off (CO)</option>
                <option value="WOW">Week-Off Worked (WOW)</option>
                <option value="HW">Holiday Worked (HW)</option>
                <option value="WO">Weekly Off (WO)</option>
                <option value="H">Holiday (H)</option>
                <option value="L">Paid Leave (L)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Adjustment Type
            </label>
            <select
              value={form.adjustmentType}
              onChange={(e) => setForm({ ...form, adjustmentType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 bg-white"
            >
              <option value="ABSENT_TO_PRESENT">Absent to Present (Biometric Failure / Site Duty)</option>
              <option value="ABSENT_TO_COMPOFF">Absent to Comp-Off (Authorized Comp-Off)</option>
              <option value="WEEKOFF_WORKED">Week-Off Worked (Weekend Rotation Duty)</option>
              <option value="HOLIDAY_WORKED">Holiday Worked (Emergency IT Coverage)</option>
              <option value="MISSING_PUNCH_RESOLVED">Missing Punch Resolved (Forgot Checkout)</option>
              <option value="PAID_LEAVE">Paid Leave Approval</option>
              <option value="CUSTOM">Custom Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Justification *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Worked Sunday 27-Sep IT duty, approved Wednesday Comp-off."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reference Date (Optional)
            </label>
            <input
              type="date"
              placeholder="e.g. Worked Date for Comp-off"
              value={form.referenceDate}
              onChange={(e) => setForm({ ...form, referenceDate: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
