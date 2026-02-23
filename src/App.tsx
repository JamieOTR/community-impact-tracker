// PATH: src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SessionManager from './components/Auth/SessionManager';
import AIChat from './components/Chat/AIChat';

import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';

import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabase';
import { databaseService } from './services/database';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const ensureProfileExists = async () => {
      try {
        // Only attempt if we have an app-authenticated user.
        if (!user?.user_id) return;

        // Confirm we truly have a Supabase auth session (defensive check).
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;

        const authUser = data.session?.user;
        if (!authUser) return;

        // RLS-scoped: if no row exists, create it.
        const existingUser = await databaseService.getCurrentUser();
        if (cancelled) return;

        if (!existingUser) {
          await databaseService.createUser({
            email: authUser.email!,
            name: authUser.user_metadata?.full_name ?? authUser.email!.split('@')[0],
            auth_user_id: authUser.id,
          });
        }
      } catch (_err) {
        console.error('Error ensuring user profile exists after email confirmation');
      }
    };

    // Run once when auth is resolved and user is present.
    if (!loading && user) {
      void ensureProfileExists();
    }

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
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

        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;