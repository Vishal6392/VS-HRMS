import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  History,
  Shield,
  Search,
  Filter,
  Eye,
  Loader2,
  Calendar,
} from 'lucide-react';
import { formatDate, formatTime } from '../../utils/formatters';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action) => {
    if (action.includes('CREATED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('DEACTIVATED') || action.includes('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('ADJUSTED') || action.includes('UPDATED')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all administrative creations, status modifications, and manual adjustments.
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 self-start sm:self-auto"
        >
          <option value="">All Administrative Actions</option>
          <option value="ADMIN_LOGIN">Admin Login</option>
          <option value="EMPLOYEE_CREATED">Employee Created</option>
          <option value="EMPLOYEE_UPDATED">Employee Updated</option>
          <option value="EMPLOYEE_DEACTIVATED">Employee Deactivated</option>
          <option value="SHIFT_CREATED">Shift Created</option>
          <option value="SHIFT_UPDATED">Shift Updated</option>
          <option value="ATTENDANCE_ADJUSTED">Attendance Adjusted</option>
        </select>
      </div>

      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Loading audit history...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={History}
                title="No audit entries logged"
                description="Administrative operations will be recorded here automatically."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Performed By</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target Record</th>
                  <th className="py-3 px-3">Audit Details</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <div>{formatDate(log.createdAt)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(log.createdAt)}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{log.performedByName}</div>
                      <div className="text-[10px] text-slate-400">{log.performedBy?.email}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-700">
                      <span className="font-medium">{log.targetRecord?.model}:</span>{' '}
                      <span className="text-slate-500 font-mono">
                        {log.targetRecord?.identifier || log.targetRecord?.id}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {log.details || '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {(log.beforeValue || log.afterValue) && (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Inspect Values Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Change Inspection"
        subtitle={`Action: ${selectedLog?.action} on ${selectedLog?.targetRecord?.model}`}
        maxWidth="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            {selectedLog.beforeValue && (
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1 font-sans">
                  Before Value:
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.beforeValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.afterValue && (
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-600 block mb-1 font-sans">
                  After Value:
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.afterValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;
