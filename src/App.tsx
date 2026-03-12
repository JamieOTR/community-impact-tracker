// PATH: src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SessionManager from './components/Auth/SessionManager';
import AIChat from './components/Chat/AIChat';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import Programs from './pages/programs';
import ProgramDetail from './pages/ProgramDetail';

import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Landing />}
        />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            user ? (
              <>
                <Header />
                <Dashboard />
                <Footer />
                <AIChat />
                <SessionManager />
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/programs"
          element={
            user ? (
              <>
                <Header />
                <Programs />
                <Footer />
                <AIChat />
                <SessionManager />
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/programs/:id"
          element={
            user ? (
              <>
                <Header />
                <ProgramDetail />
                <Footer />
                <AIChat />
                <SessionManager />
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user ? (
              <>
                <Header />
                <AdminDashboard />
                <Footer />
                <SessionManager />
              </>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={user ? '/dashboard' : '/'} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;