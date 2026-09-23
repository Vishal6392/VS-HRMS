import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Mail,
  Building,
  Briefcase,
  Clock,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetEmp, setPasswordTargetEmp] = useState(null);
  const [targetNewPassword, setTargetNewPassword] = useState('Password@123');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const initialForm = {
    employeeId: '',
    fullName: '',
    mobile: '',
    email: '',
    department: 'Engineering',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    reportingManager: '',
    assignedShift: '',
    password: 'Password@123',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/employees');
      if (res.data.success) {
        setEmployees(res.data.data);
      }
      const shiftRes = await api.get('/shifts?activeOnly=true');
      if (shiftRes.data.success) {
        setShifts(shiftRes.data.data);
        if (shiftRes.data.data.length > 0 && !formData.assignedShift) {
          setFormData((prev) => ({ ...prev, assignedShift: shiftRes.data.data[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load employees or shifts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post('/employees', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setFormData(initialForm);
        fetchEmployees();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (emp) => {
    setCurrentEmployee(emp);
    setFormData({
      fullName: emp.fullName,
      mobile: emp.mobile,
      department: emp.department,
      designation: emp.designation,
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      reportingManager: emp.reportingManager || '',
      assignedShift: emp.assignedShift?._id || emp.assignedShift || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentEmployee) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.put(`/employees/${currentEmployee._id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        setCurrentEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      await api.patch(`/employees/${emp._id}/toggle-status`);
      fetchEmployees();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleOpenResetPassword = (emp) => {
    setPasswordTargetEmp(emp);
    setTargetNewPassword('Password@123');
    setPasswordSuccessMsg(null);
    setFormError(null);
    setIsPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordTargetEmp) return;
    setIsResettingPassword(true);
    setFormError(null);
    try {
      const res = await api.post(`/employees/${passwordTargetEmp._id}/reset-password`, {
        newPassword: targetNewPassword,
      });
      if (res.data.success) {
        setPasswordSuccessMsg(res.data.message || 'Password reset successfully!');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccessMsg(null);
        }, 1500);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || emp.employmentStatus === statusFilter;
    const matchesDept = !deptFilter || emp.department === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Employee Master Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization members, credentials, and assigned work shifts.
          </p>
        </div>

        <Button
          variant="primary"
          icon={UserPlus}
          onClick={() => {
            setFormData({
              ...initialForm,
              assignedShift: shifts[0]?._id || '',
              employeeId: `EMP${Math.floor(100 + Math.random() * 900)}`,
            });
            setIsAddModalOpen(true);
          }}
          className="self-start sm:self-auto shadow-sm"
        >
          Add New Employee
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Loading employee records...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Users}
                title="No employees found"
                description="No employee records match the selected filter criteria."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3">Assigned Shift</th>
                  <th className="py-3 px-3">Joined</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <div>{emp.email}</div>
                      <div className="text-[11px] text-slate-400">{emp.mobile}</div>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-700">
                      {emp.department}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {emp.designation}
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium text-[11px]">
                        {emp.assignedShift?.shiftName || 'General Shift'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {formatDate(emp.joiningDate)}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.employmentStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.employmentStatus === 'ACTIVE'
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {emp.employmentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditOpen(emp)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(emp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reset Employee Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            emp.employmentStatus === 'ACTIVE'
                              ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            emp.employmentStatus === 'ACTIVE'
                              ? 'Deactivate employee'
                              : 'Activate employee'
                          }
                        >
                          {emp.employmentStatus === 'ACTIVE' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        subtitle="Create employee master profile and autogenerate login credentials."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Department *
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Designation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Assigned Shift *
              </label>
              <select
                required
                value={formData.assignedShift}
                onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.shiftName} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Reporting Manager
              </label>
              <input
                type="text"
                value={formData.reportingManager}
                onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Initial Account Password *
              </label>
              <input
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Employee Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${currentEmployee?.fullName}`}
        subtitle="Update employee record and shift assignment."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Department *
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Designation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Assigned Shift *
              </label>
              <select
                required
                value={formData.assignedShift}
                onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {shifts.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.shiftName} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Reporting Manager
              </label>
              <input
                type="text"
                value={formData.reportingManager}
                onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Reset Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Reset Employee Password"
        subtitle={`Set new account login credentials for ${passwordTargetEmp?.fullName || ''} (${passwordTargetEmp?.employeeId || ''}).`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          {passwordSuccessMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-semibold text-slate-800">{passwordTargetEmp?.fullName}</div>
                <div className="text-[11px] text-slate-500">
                  Email: <span className="font-mono text-slate-700">{passwordTargetEmp?.email}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  ID: <span className="font-mono text-slate-700">{passwordTargetEmp?.employeeId}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  value={targetNewPassword}
                  onChange={(e) => setTargetNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm font-semibold text-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Employee is password se apne email ya ID ke through login kar payega.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isResettingPassword}>
                  Update Password
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
