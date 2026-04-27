/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Employees from './pages/Employees';
import Layout from './components/Layout';
import { FirebaseProvider, useFirebase } from './lib/FirebaseProvider';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

function AppRoutes() {
  const { user, employee, loading } = useFirebase();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  if (loading || (user && !employee)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold">Initializing Portal</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <Layout user={employee || { username: user.email?.split('@')[0], role: 'staff' }} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </Router>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppRoutes />
    </FirebaseProvider>
  );
}

