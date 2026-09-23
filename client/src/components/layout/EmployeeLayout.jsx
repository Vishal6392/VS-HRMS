import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Coffee,
  User,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const EmployeeLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', to: '/employee/attendance', icon: CalendarCheck },
    { label: 'Breaks', to: '/employee/breaks', icon: Coffee },
    { label: 'Profile', to: '/employee/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-0">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                VS HRMS
              </div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                {user?.employee?.fullName || 'Employee Portal'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-800">
                {user?.employee?.department || 'Staff'}
              </div>
              <div className="text-[11px] text-slate-400">
                ID: {user?.employee?.employeeId || 'EMP'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Section 32) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 sm:hidden shadow-lg safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-brand-600 font-semibold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default EmployeeLayout;
