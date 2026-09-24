import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  Search,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/axios';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';

export const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState(null);

  // Create Sub-Admin Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin-users');
      if (res.data.success) {
        setAdmins(res.data.data);
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch admin users.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleGeneratePassword = (targetSetter) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    targetSetter(pass);
  };

  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      setAlert({ type: 'error', message: 'Please fill all required fields.' });
      return;
    }
    setCreateLoading(true);
    setAlert(null);
    try {
      const res = await api.post('/admin-users', createForm);
      if (res.data.success) {
        setAlert({
          type: 'success',
          message: `Sub-Admin '${createForm.name}' created successfully.`,
        });
        setCreateModalOpen(false);
        setCreateForm({ name: '', email: '', password: '' });
        fetchAdmins();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create Sub-Admin.',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    if (admin.isSuperAdmin) return;
    try {
      const res = await api.put(`/admin-users/${admin._id}/status`);
      if (res.data.success) {
        setAlert({
          type: 'success',
          message: res.data.message,
        });
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === admin._id ? { ...a, isActive: res.data.data.isActive } : a
          )
        );
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update admin status.',
      });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setResetLoading(true);
    setAlert(null);
    try {
      const res = await api.put(`/admin-users/${selectedAdmin._id}/password`, {
        newPassword,
      });
      if (res.data.success) {
        setAlert({
          type: 'success',
          message: res.data.message,
        });
        setResetModalOpen(false);
        setSelectedAdmin(null);
        setNewPassword('');
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reset password.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/admin-users/${adminToDelete._id}`);
      if (res.data.success) {
        setAlert({
          type: 'success',
          message: res.data.message,
        });
        setDeleteModalOpen(false);
        setAdminToDelete(null);
        fetchAdmins();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete Sub-Admin.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAdmins = admins.length;
  const activeSubAdmins = admins.filter((a) => !a.isSuperAdmin && a.isActive).length;
  const inactiveSubAdmins = admins.filter((a) => !a.isSuperAdmin && !a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
              Super Admin Control
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">Security & Roles</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Sub-Admin Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create administrative accounts with restricted access (Sub-Admins cannot view Audit Logs).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Sub-Admin
          </Button>
        </div>
      </div>

      {/* Alert Notifications */}
      {alert && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            alert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Separation Notice Box */}
      <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h3 className="font-bold text-slate-900">
              Role-Based Access Hierarchy Active
            </h3>
            <p className="text-slate-600 leading-relaxed">
              <strong>Super Admin:</strong> Full operational controls, server environment configuration, and exclusive access to <strong>Admin Audit Logs</strong> and Sub-Admin accounts.<br />
              <strong>Sub-Admin:</strong> Daily administration (Employees, Shifts, Attendance Live, and Reports). For security and compliance, <strong>Audit Logs are strictly hidden and blocked</strong> for Sub-Admins.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Admins</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalAdmins}</div>
          <div className="text-xs text-slate-400 mt-0.5">Configured administrative users</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Super Admin</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">1</div>
          <div className="text-xs text-slate-400 mt-0.5">Master administrator (Render env)</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Active Sub-Admins</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{activeSubAdmins}</div>
          <div className="text-xs text-slate-400 mt-0.5">Active operational admins</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Inactive Sub-Admins</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{inactiveSubAdmins}</div>
          <div className="text-xs text-slate-400 mt-0.5">Suspended administrative access</div>
        </div>
      </div>

      {/* Main Admin Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {/* Table Search Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            />
          </div>
          <div className="text-xs text-slate-500 self-end sm:self-auto">
            Showing <strong>{filteredAdmins.length}</strong> accounts
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admin Profile</th>
                <th className="px-4 py-3.5">Account Role</th>
                <th className="px-4 py-3.5">Audit Log Access</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Loading administrative accounts...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No admin accounts found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isSuper = admin.isSuperAdmin;
                  return (
                    <tr
                      key={admin._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSuper ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
                              isSuper
                                ? 'bg-indigo-600 text-white'
                                : 'bg-brand-100 text-brand-700'
                            }`}
                          >
                            {admin.name ? admin.name.charAt(0) : 'A'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              {admin.name}
                              {isSuper && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Shield className="w-3 h-3 text-indigo-600" />
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Sub-Admin
                          </span>
                        )}
                      </td>

                      {/* Audit Log Access */}
                      <td className="px-4 py-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Full Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-3 h-3 text-slate-400" />
                            Restricted (Hidden)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {admin.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-4 text-slate-500 font-mono text-[11px]">
                        {admin.lastLogin ? formatDate(admin.lastLogin, 'dd MMM yyyy, HH:mm') : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {isSuper ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Protected (Render Config)
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active Status */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(admin)}
                              title={admin.isActive ? 'Suspend Sub-Admin' : 'Activate Sub-Admin'}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                admin.isActive
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {admin.isActive ? 'Suspend' : 'Activate'}
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setNewPassword('');
                                setResetModalOpen(true);
                              }}
                              title="Reset Password"
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdminToDelete(admin);
                                setDeleteModalOpen(true);
                              }}
                              title="Delete Sub-Admin"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create New Sub-Admin */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Sub-Admin"
        subtitle="Create an operational admin user with restricted audit log access."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubAdmin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="subadmin@hrms.local"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Initial Password *
              </label>
              <button
                type="button"
                onClick={() =>
                  handleGeneratePassword((val) => setCreateForm({ ...createForm, password: val }))
                }
                className="text-[11px] text-brand-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                Generate Strong
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs pr-10 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Security Rule:</strong> Sub-Admins can manage employees, shifts, attendance, and reports, but <strong>Audit Logs</strong> will remain completely inaccessible to them.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={createLoading}>
              {createLoading ? 'Creating Sub-Admin...' : 'Save Sub-Admin'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Reset Password */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Sub-Admin Password"
        subtitle={`Update credentials for ${selectedAdmin?.name || selectedAdmin?.email}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                New Password *
              </label>
              <button
                type="button"
                onClick={() => handleGeneratePassword(setNewPassword)}
                className="text-[11px] text-brand-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs pr-10 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={resetLoading}>
              {resetLoading ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Delete Confirm */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        subtitle="This action will permanently remove this Sub-Admin account."
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete the Sub-Admin account for{' '}
            <strong className="text-slate-900">{adminToDelete?.name}</strong> ({adminToDelete?.email})?
            This user will no longer be able to log in to AV HRMS.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={handleDeleteAdmin}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminManagement;
