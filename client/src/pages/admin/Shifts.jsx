import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  Clock,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Moon,
  Sun,
  Split,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const initialForm = {
    shiftName: '',
    shiftCode: '',
    shiftType: 'GENERAL',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: 15,
    minWorkingHours: 8,
    breakPolicy: { allowedBreaks: 1, maxBreakMinutes: 60 },
    splitSegments: [
      { segmentName: 'Morning Segment', startTime: '06:00', endTime: '10:00' },
      { segmentName: 'Evening Segment', startTime: '18:00', endTime: '22:00' },
    ],
    description: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shifts');
      if (res.data.success) {
        setShifts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post('/shifts', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setFormData(initialForm);
        fetchShifts();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (shift) => {
    setCurrentShift(shift);
    setFormData({
      shiftName: shift.shiftName,
      shiftCode: shift.shiftCode,
      shiftType: shift.shiftType,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodMinutes: shift.gracePeriodMinutes,
      minWorkingHours: shift.minWorkingHours,
      breakPolicy: shift.breakPolicy || { allowedBreaks: 1, maxBreakMinutes: 60 },
      splitSegments: shift.splitSegments?.length > 0 ? shift.splitSegments : initialForm.splitSegments,
      description: shift.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentShift) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.put(`/shifts/${currentShift._id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        setCurrentShift(null);
        fetchShifts();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (shift) => {
    try {
      await api.patch(`/shifts/${shift._id}/toggle-status`);
      fetchShifts();
    } catch (err) {
      console.error('Failed to toggle shift status:', err);
    }
  };

  const getShiftBadge = (type) => {
    switch (type) {
      case 'NIGHT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
            <Moon className="w-3 h-3 text-indigo-500" />
            Night Shift (Cross Midnight)
          </span>
        );
      case 'SPLIT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
            <Split className="w-3 h-3 text-blue-500" />
            Split Shift (Dual Duty)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
            <Sun className="w-3 h-3 text-amber-500" />
            General Day Shift
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Shift Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure working schedules, grace thresholds, night shifts, and split rosters.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setFormData(initialForm);
            setIsAddModalOpen(true);
          }}
          className="self-start sm:self-auto shadow-sm"
        >
          Create New Shift
        </Button>
      </div>

      {/* Shifts Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <span className="text-xs font-medium">Loading shift masters...</span>
        </div>
      ) : shifts.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Clock}
            title="No shifts defined"
            description="Create your first organization shift schedule."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <Card key={shift._id} className="p-5 border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                      {shift.shiftCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">
                      {shift.shiftName}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      shift.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        shift.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4">{getShiftBadge(shift.shiftType)}</div>

                {/* Timing details */}
                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Working Span:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {shift.startTime} &bull; {shift.endTime}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Period:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {shift.gracePeriodMinutes} mins
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Min Working Hours:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {shift.minWorkingHours} hrs
                    </span>
                  </div>

                  {shift.shiftType === 'SPLIT' && shift.splitSegments && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Split Segments
                      </span>
                      {shift.splitSegments.map((seg, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-600 font-mono">
                          <span>{seg.segmentName}:</span>
                          <span>{seg.startTime} - {seg.endTime}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {shift.description && (
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2">
                    {shift.description}
                  </p>
                )}
              </div>

              {/* Actions footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(shift)}
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    shift.isActive
                      ? 'text-slate-500 hover:text-rose-600'
                      : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  {shift.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {shift.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => handleEditOpen(shift)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Shift
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setCurrentShift(null);
        }}
        title={isEditModalOpen ? `Edit ${currentShift?.shiftName}` : 'Create Shift Master'}
        subtitle="Specify shift hours, night shift logic, and split work segments."
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={isEditModalOpen ? handleEditSubmit : handleCreateSubmit}
          className="space-y-4 text-xs"
        >
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Shift Name *
              </label>
              <input
                type="text"
                required
                value={formData.shiftName}
                onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
                placeholder="e.g. General Day Shift"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Shift Code *
              </label>
              <input
                type="text"
                required
                value={formData.shiftCode}
                onChange={(e) => setFormData({ ...formData, shiftCode: e.target.value })}
                placeholder="e.g. GEN-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Shift Type *
              </label>
              <select
                value={formData.shiftType}
                onChange={(e) => {
                  const newType = e.target.value;
                  let newStart = formData.startTime;
                  let newEnd = formData.endTime;
                  if (newType === 'NIGHT') {
                    newStart = '22:00';
                    newEnd = '06:00';
                  } else if (newType === 'SPLIT') {
                    newStart = '06:00';
                    newEnd = '22:00';
                  } else {
                    newStart = '09:30';
                    newEnd = '18:30';
                  }
                  setFormData({
                    ...formData,
                    shiftType: newType,
                    startTime: newStart,
                    endTime: newEnd,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="GENERAL">General Shift (Standard Single Span)</option>
                <option value="NIGHT">Night Shift (Crosses Midnight)</option>
                <option value="SPLIT">Split Shift (Two Duty Segments)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Grace Period (Minutes) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.gracePeriodMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Conditional Night Shift helper banner */}
          {formData.shiftType === 'NIGHT' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 flex items-start gap-2">
              <Moon className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <div>
                <strong>Night Shift Cross-Midnight Engine Active:</strong> Checkouts occurring the
                following morning will automatically link to the shift start calendar date without
                falsely flagging the employee as absent or missing.
              </div>
            </div>
          )}

          {/* Conditional Split Shift Segments builder */}
          {formData.shiftType === 'SPLIT' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5" />
                  Split Shift Duty Segments
                </span>
                <span className="text-[11px] text-blue-700">
                  Off-duty gap between segments is NOT counted as break
                </span>
              </div>

              {formData.splitSegments.map((seg, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-blue-200/80">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Segment Name</label>
                    <input
                      type="text"
                      required
                      value={seg.segmentName}
                      onChange={(e) => {
                        const newSegs = [...formData.splitSegments];
                        newSegs[idx].segmentName = e.target.value;
                        setFormData({ ...formData, splitSegments: newSegs });
                      }}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">Start Time</label>
                    <input
                      type="time"
                      required
                      value={seg.startTime}
                      onChange={(e) => {
                        const newSegs = [...formData.splitSegments];
                        newSegs[idx].startTime = e.target.value;
                        setFormData({ ...formData, splitSegments: newSegs });
                      }}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase">End Time</label>
                    <input
                      type="time"
                      required
                      value={seg.endTime}
                      onChange={(e) => {
                        const newSegs = [...formData.splitSegments];
                        newSegs[idx].endTime = e.target.value;
                        setFormData({ ...formData, splitSegments: newSegs });
                      }}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase text-slate-600 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
              placeholder="Operational details regarding shift rules and policies..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEditModalOpen ? 'Save Changes' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;
