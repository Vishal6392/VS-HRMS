import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import Button from '../common/Button';
import { Settings, ShieldCheck, CheckCircle2, HelpCircle } from 'lucide-react';
import api from '../../api/axios';

export const SalaryPolicyModal = ({ isOpen, onClose, onPolicyUpdated }) => {
  const [policy, setPolicy] = useState({
    policyName: 'Default Salary Attendance Policy',
    countWeekOffAsPaid: true,
    countCompOffAsPaid: true,
    countHolidayAsPaid: true,
    countPaidLeaveAsPaid: true,
    countHolidayWorkedAsExtra: false,
    countWeekOffWorkedAsExtra: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPolicy();
    }
  }, [isOpen]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/policy');
      if (res.data.success && res.data.data) {
        setPolicy(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch salary policy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await api.put('/reports/policy', policy);
      if (res.data.success) {
        setAlert({ type: 'success', message: 'Salary attendance policy updated successfully.' });
        if (onPolicyUpdated) onPolicyUpdated(res.data.data);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update policy.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Salary Attendance Policy"
      subtitle="Define which non-working statuses count as paid days for payroll calculation."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSave} className="p-6 space-y-5">
        {alert && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              alert.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alert.message}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Policy Name
          </label>
          <input
            type="text"
            required
            value={policy.policyName || ''}
            onChange={(e) => setPolicy({ ...policy, policyName: e.target.value })}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Paid Days Inclusions (Payable Formula)</span>
          </div>

          {/* Option 1: Weekly Off Paid */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.countWeekOffAsPaid}
              onChange={(e) => setPolicy({ ...policy, countWeekOffAsPaid: e.target.checked })}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Count Weekly Offs as Paid Days (WO)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Standard monthly salary includes scheduled weekly offs as paid salary days.
              </p>
            </div>
          </label>

          {/* Option 2: Comp-Off Paid */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.countCompOffAsPaid}
              onChange={(e) => setPolicy({ ...policy, countCompOffAsPaid: e.target.checked })}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Count Compensatory Offs as Paid Days (CO)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comp-off granted for working on off-days or holidays will not result in salary deduction.
              </p>
            </div>
          </label>

          {/* Option 3: Holiday Paid */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.countHolidayAsPaid}
              onChange={(e) => setPolicy({ ...policy, countHolidayAsPaid: e.target.checked })}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Count National & Company Holidays as Paid Days (H)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Holidays listed on company calendar count as full paid days.
              </p>
            </div>
          </label>

          {/* Option 4: Paid Leave Paid */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.countPaidLeaveAsPaid}
              onChange={(e) => setPolicy({ ...policy, countPaidLeaveAsPaid: e.target.checked })}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Count Approved Paid Leaves as Paid Days (L)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authorized leaves will be included in the total payable days.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>
            {saving ? 'Saving Policy...' : 'Save Policy'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
