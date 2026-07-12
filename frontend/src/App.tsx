import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Organization } from './pages/Organization';
import { AssetDirectory } from './pages/AssetDirectory';
import { AssetPassport } from './pages/AssetPassport';
import { Allocations } from './pages/Allocations';
import { Bookings } from './pages/Bookings';
import { Maintenance } from './pages/Maintenance';
import { Audits } from './pages/Audits';
import { Reports } from './pages/Reports';
import { NotificationsPage } from './pages/Notifications';

// Private Route Guard
const PrivateRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-semibold text-slate-500">Validating Session...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Role-Based Route Guard — redirects unauthorized roles to dashboard
const RoleRoute: React.FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Main Layout Wrapper
const DashboardLayout: React.FC = () => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header onSearchClick={() => setIsCommandOpen(true)} />
        <main className="flex-grow overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/assets" element={<AssetDirectory />} />
                <Route path="/assets/:id" element={<AssetPassport />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/logs" element={<NotificationsPage />} />

                {/* Admin & Asset Manager only */}
                <Route element={<RoleRoute allowedRoles={['Admin', 'Asset Manager']} />}>
                  <Route path="/organization" element={<Organization />} />
                  <Route path="/audits" element={<Audits />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>

                {/* Admin, Asset Manager, Department Head */}
                <Route element={<RoleRoute allowedRoles={['Admin', 'Asset Manager', 'Department Head']} />}>
                  <Route path="/allocations" element={<Allocations />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
