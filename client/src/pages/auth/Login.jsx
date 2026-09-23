import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  UserCheck,
  Moon,
  Split,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(email, password);
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

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage(null);
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
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                />
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

        {/* Security watermark footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          Protected by HTTPS &bull; Geofenced Audit &bull; Live Camera Verification
        </div>
      </div>
    </div>
  );
};

export default Login;
