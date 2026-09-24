import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import EmployeeLayout from './components/layout/EmployeeLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Login from './pages/auth/Login';
import EmployeeDashboard from './pages/employee/Dashboard';
import MyAttendance from './pages/employee/MyAttendance';
import MyBreaks from './pages/employee/MyBreaks';
import Profile from './pages/employee/Profile';

import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import Shifts from './pages/admin/Shifts';
import AttendanceLive from './pages/admin/AttendanceLive';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import AdminManagement from './pages/admin/AdminManagement';

// On GitHub Pages, use HashRouter to prevent 404 on page reload
const Router =
  typeof window !== 'undefined' && window.location.hostname.includes('github.io')
    ? HashRouter
    : BrowserRouter;

// Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">
        Initializing session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Guard strictly for Super Admin (blocks Sub-Admins from audit logs and admin user management)
const SuperAdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user?.isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

// Root index redirect based on role
const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication */}
          <Route path="/login" element={<Login />} />

          {/* Employee Routes (Mobile First) */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['employee', 'admin']}>
                <EmployeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="attendance" element={<MyAttendance />} />
            <Route path="breaks" element={<MyBreaks />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* HR / SuperAdmin Routes (Desktop SaaS) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="attendance" element={<AttendanceLive />} />
            <Route path="reports" element={<Reports />} />
            <Route
              path="audit-logs"
              element={
                <SuperAdminRoute>
                  <AuditLogs />
                </SuperAdminRoute>
              }
            />
            <Route
              path="admins"
              element={
                <SuperAdminRoute>
                  <AdminManagement />
                </SuperAdminRoute>
              }
            />
          </Route>

          {/* Fallback Root Navigation */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
