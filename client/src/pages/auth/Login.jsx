import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  Moon,
  Split,
  Sun,
  User,
  Phone,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Button from '../../components/common/Button';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Verify, 2: New Password, 3: Success
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMobile, setForgotMobile] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('Please enter both Email/Employee ID and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(identifier, password);
      if (res.success) {
        if (res.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Invalid credentials.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Login failed. Please check server connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoIdentifier, demoPassword) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    setErrorMessage(null);
  };

  const openForgotModal = () => {
    setForgotIdentifier(identifier);
    setForgotMobile('');
    setVerifiedUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setForgotError(null);
    setForgotSuccessMessage(null);
    setForgotStep(1);
    setIsForgotModalOpen(true);
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered Email or Employee ID.');
      return;
    }

    setIsForgotLoading(true);
    setForgotError(null);

    try {
      const res = await api.post('/auth/forgot-password/verify', {
        identifier: forgotIdentifier.trim(),
        mobile: forgotMobile.trim(),
      });

      if (res.data.success) {
        setVerifiedUser(res.data.user);
        setForgotStep(2);
      } else {
        setForgotError(res.data.message || 'Verification failed.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Account not found. Please verify details.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsForgotLoading(true);
    setForgotError(null);

    try {
      const res = await api.post('/auth/forgot-password/reset', {
        identifier: forgotIdentifier.trim(),
        newPassword,
      });

      if (res.data.success) {
        setForgotSuccessMessage(res.data.message || 'Password updated successfully!');
        setForgotStep(3);
        // Pre-fill login fields
        setIdentifier(forgotIdentifier.trim());
        setPassword(newPassword);
        setTimeout(() => {
          setIsForgotModalOpen(false);
        }, 1800);
      } else {
        setForgotError(res.data.message || 'Failed to update password.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo and Heading */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">VS HRMS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Attendance & Shift Management Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/90 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Email Address or Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. EMP101 or name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotModal}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={ArrowRight}
              className="w-full mt-2 shadow-brand-500/20 shadow-md"
            >
              Sign In to Account
            </Button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick One-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@hrms.local', 'Admin@123')}
                className="p-2.5 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-xl text-left transition-colors flex items-center gap-2 group"
              >
                <Shield className="w-4 h-4 text-brand-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-brand-700">HR Admin</div>
                  <div className="text-[10px] text-slate-400">SuperAdmin</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('john@hrms.local', 'Emp@123')}
                className="p-2.5 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-xl text-left transition-colors flex items-center gap-2 group"
              >
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-brand-700">John Doe</div>
                  <div className="text-[10px] text-slate-400">General Shift</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('priya@hrms.local', 'Emp@123')}
                className="p-2.5 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-xl text-left transition-colors flex items-center gap-2 group"
              >
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-brand-700">Priya Sharma</div>
                  <div className="text-[10px] text-slate-400">Night Shift</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rahul@hrms.local', 'Emp@123')}
                className="p-2.5 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 rounded-xl text-left transition-colors flex items-center gap-2 group"
              >
                <Split className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-brand-700">Rahul Verma</div>
                  <div className="text-[10px] text-slate-400">Split Shift</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center mt-6 text-xs font-semibold text-slate-500 tracking-wide">
          Powered by Vishal
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reset Password</h3>
                  <p className="text-[11px] text-slate-500">
                    {forgotStep === 1 && 'Step 1 of 2: Verify Identity'}
                    {forgotStep === 2 && 'Step 2 of 2: Create New Password'}
                    {forgotStep === 3 && 'Password Reset Complete'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {forgotError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* Step 1: Verification Form */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotVerify} className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    Apna registered <strong>Email Address</strong> ya <strong>Employee ID</strong> (e.g. <code>EMP101</code>) enter karein:
                  </p>

                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">
                      Email or Employee ID *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. EMP101 or name@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">
                      Registered Mobile Number (Verification)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={forgotMobile}
                        onChange={(e) => setForgotMobile(e.target.value)}
                        placeholder="Mobile number (or last 4 digits)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Security check: Mobile number check optional ya verification ke liye use hoga.
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsForgotModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" isLoading={isForgotLoading}>
                      Verify Account
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 2: Set New Password */}
              {forgotStep === 2 && verifiedUser && (
                <form onSubmit={handleForgotReset} className="space-y-4 text-xs">
                  {/* Verified Profile Card */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{verifiedUser.fullName}</div>
                      <div className="text-[11px] text-slate-500">
                        ID: <span className="font-mono font-semibold">{verifiedUser.employeeId}</span> • {verifiedUser.department}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-slate-600 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setForgotStep(1)}>
                      Back
                    </Button>
                    <Button variant="primary" type="submit" isLoading={isForgotLoading}>
                      Set New Password & Login
                    </Button>
                  </div>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {forgotStep === 3 && (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Password Reset Successful!</h4>
                  <p className="text-xs text-slate-500">
                    {forgotSuccessMessage}
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="w-full"
                    >
                      Continue to Sign In
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
