// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { databaseService, type User } from '../services/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setSafe = (fn: () => void) => {
      if (isMounted) fn();
    };

    const init = async () => {
      try {
        setSafe(() => {
          setLoading(true);
          setError(null);
        });

        // 1) Get current session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;

        // 2) If signed in, load profile. If not signed in, stop cleanly.
        if (session?.user?.id) {
          await loadUserData(session.user.id);
        } else {
          setSafe(() => {
            setUser(null);
            setLoading(false);
          });
        }
      } catch (err: any) {
        console.error('[useAuth] init error:', err);
        setSafe(() => {
          setUser(null);
          setError(err?.message || 'Failed to initialize authentication');
          setLoading(false);
        });
      }
    };

    init();

    // 3) Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user?.id) {
          await loadUserData(session.user.id);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSafe(() => {
            setUser(null);
            setError(null);
            setLoading(false);
          });
          return;
        }

        // For TOKEN_REFRESHED / USER_UPDATED etc., we keep state stable by default.
      } catch (err: any) {
        console.error('[useAuth] onAuthStateChange error:', err);
        setSafe(() => {
          setError(err?.message || 'Auth state change failed');
          setLoading(false);
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async (_authUserId: string) => {
    try {
      setLoading(true);
      setError(null);

      // getCurrentUser() should be auth-scoped via RLS
      const userData = await databaseService.getCurrentUser();

      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
        setError('User profile not found');
      }
    } catch (err: any) {
      console.error('[useAuth] loadUserData error:', err);
      setUser(null);
      setError(err?.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation link.');
        }
        throw error;
      }

      if (data.user?.id) {
        await loadUserData(data.user.id);
      }

      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');

      const redirectBase =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
          : window.location.origin;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${redirectBase}/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }

      if (data.session?.user?.id) {
        await loadUserData(data.session.user.id);
        return { success: true, needsVerification: false };
      }

      return { success: true, needsVerification: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to create account');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const redirectBase =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}`
          : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase}/reset-password`,
      });

      if (error) {
        if (error.message.includes('User not found')) {
          throw new Error('No account found with this email address');
        }
        throw error;
      }

      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data.user?.id) {
        await loadUserData(data.user.id);
      }

      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh session');
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    clearError: () => setError(null),
  };
}
