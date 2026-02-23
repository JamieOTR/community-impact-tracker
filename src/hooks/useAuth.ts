// PATH: src/hooks/useAuth.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { databaseService, type User } from '../services/database';

type AuthResult = { success: true };
type SignUpResult = { success: true; needsVerification: boolean };

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err || fallback;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

function getRedirectBase(): string {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) {
    return `${window.location.protocol}//${host}:${window.location.port}`;
  }
  return window.location.origin;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const redirectBase = useMemo(() => getRedirectBase(), []);

  const loadUserData = useCallback(async (_authUserId: string) => {
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
    } catch (err: unknown) {
      console.error('[useAuth] loadUserData error:', err);
      setUser(null);
      setError(getErrorMessage(err, 'Failed to load user data'));
    } finally {
      setLoading(false);
    }
  }, []);

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
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

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
      } catch (err: unknown) {
        console.error('[useAuth] init error:', err);
        setSafe(() => {
          setUser(null);
          setError(getErrorMessage(err, 'Failed to initialize authentication'));
          setLoading(false);
        });
      }
    };

    void init();

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

        // TOKEN_REFRESHED / USER_UPDATED etc.: keep state stable by default.
      } catch (err: unknown) {
        console.error('[useAuth] onAuthStateChange error:', err);
        setSafe(() => {
          setError(getErrorMessage(err, 'Auth state change failed'));
          setLoading(false);
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const msg = signInError.message || '';
        if (msg.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (msg.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation link.');
        }
        throw signInError;
      }

      if (data.user?.id) {
        await loadUserData(data.user.id);
      }

      return { success: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign in'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<SignUpResult> => {
    try {
      setLoading(true);
      setError(null);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${redirectBase}/dashboard`,
        },
      });

      if (signUpError) {
        const msg = signUpError.message || '';
        if (msg.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw signUpError;
      }

      if (data.session?.user?.id) {
        await loadUserData(data.session.user.id);
        return { success: true, needsVerification: false };
      }

      return { success: true, needsVerification: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create account'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadUserData, redirectBase]);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase}/reset-password`,
      });

      if (resetError) {
        const msg = resetError.message || '';
        if (msg.includes('User not found')) {
          throw new Error('No account found with this email address');
        }
        throw resetError;
      }

      return { success: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send reset email'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [redirectBase]);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      return { success: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update password'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      setUser(null);
      return { success: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign out'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthResult> => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      if (data.user?.id) {
        await loadUserData(data.user.id);
      }

      return { success: true };
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to refresh session'));
      throw err;
    }
  }, [loadUserData]);

  const clearError = useCallback(() => setError(null), []);

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
    clearError,
  };
}