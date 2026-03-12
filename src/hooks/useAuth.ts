// PATH: src/hooks/useAuth.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { databaseService, type User } from '../services/database';

type AuthResult = { success: true };
type SignUpResult = { success: true; needsVerification: boolean };

const AUTH_TIMEOUT_MS = 20000;

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const redirectBase = useMemo(() => getRedirectBase(), []);

  const mountedRef = useRef(true);
  const bootstrapInFlightRef = useRef(false);
  const profilePromiseRef = useRef<Promise<User | null> | null>(null);
  const lastResolvedAuthUserIdRef = useRef<string | null>(null);
  const lastCreateAttemptAuthUserIdRef = useRef<string | null>(null);

  const safeSetUser = useCallback((nextUser: User | null) => {
    if (!mountedRef.current) return;
    setUser((prev) => {
      const prevId = prev?.user_id ?? null;
      const nextId = nextUser?.user_id ?? null;
      if (prevId === nextId) return prev;
      return nextUser;
    });
  }, []);

  const safeSetLoading = useCallback((value: boolean) => {
    if (!mountedRef.current) return;
    setLoading((prev) => (prev === value ? prev : value));
  }, []);

  const safeSetError = useCallback((value: string | null) => {
    if (!mountedRef.current) return;
    setError((prev) => (prev === value ? prev : value));
  }, []);

  const ensureUserProfileFromSession = useCallback(async (): Promise<User | null> => {
    if (profilePromiseRef.current) {
      return profilePromiseRef.current;
    }

    profilePromiseRef.current = (async () => {
      console.log('[useAuth] ensureUserProfileFromSession: start');

      const { data, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'supabase.auth.getSession'
      );

      if (sessionError) throw sessionError;

      const authUser = data.session?.user;
      console.log(
        '[useAuth] ensureUserProfileFromSession: auth user',
        authUser?.email,
        authUser?.id
      );

      if (!authUser?.id) {
        lastResolvedAuthUserIdRef.current = null;
        return null;
      }

      let currentUser = await withTimeout(
        databaseService.getCurrentUser(),
        AUTH_TIMEOUT_MS,
        'databaseService.getCurrentUser'
      );

      console.log(
        '[useAuth] ensureUserProfileFromSession: current user exists?',
        !!currentUser
      );

      if (!currentUser) {
        const sameCreateAttempt = lastCreateAttemptAuthUserIdRef.current === authUser.id;

        if (!sameCreateAttempt) {
          console.log('[useAuth] ensureUserProfileFromSession: creating missing profile');
          lastCreateAttemptAuthUserIdRef.current = authUser.id;

          const createdUser = await withTimeout(
            databaseService.createUser({
              email: authUser.email ?? '',
              name:
                (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
                authUser.email?.split('@')[0] ||
                'User',
              auth_user_id: authUser.id,
              avatar_url:
                typeof authUser.user_metadata?.avatar_url === 'string'
                  ? authUser.user_metadata.avatar_url
                  : undefined,
            }),
            AUTH_TIMEOUT_MS,
            'databaseService.createUser'
          );

          if (!createdUser) {
            throw new Error('Failed to create user profile');
          }
        } else {
          console.log(
            '[useAuth] ensureUserProfileFromSession: skipping duplicate create attempt'
          );
        }

        currentUser = await withTimeout(
          databaseService.getCurrentUser(),
          AUTH_TIMEOUT_MS,
          'databaseService.getCurrentUser after create'
        );
      }

      lastResolvedAuthUserIdRef.current = authUser.id;
      console.log('[useAuth] ensureUserProfileFromSession: done', currentUser?.email);
      return currentUser;
    })();

    try {
      return await profilePromiseRef.current;
    } finally {
      profilePromiseRef.current = null;
    }
  }, []);

  const bootstrapAuth = useCallback(async () => {
    if (bootstrapInFlightRef.current) {
      console.log('[useAuth] bootstrapAuth: skipped, already in flight');
      return;
    }

    bootstrapInFlightRef.current = true;
    console.log('[useAuth] bootstrapAuth: start');
    safeSetLoading(true);
    safeSetError(null);

    try {
      const { data, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'bootstrap getSession'
      );

      if (sessionError) throw sessionError;

      const session = data.session;
      console.log('[useAuth] bootstrapAuth: session user', session?.user?.email);

      if (!session?.user?.id) {
        lastResolvedAuthUserIdRef.current = null;
        safeSetUser(null);
        safeSetLoading(false);
        console.log('[useAuth] bootstrapAuth: no session');
        return;
      }

      const resolvedUser = await ensureUserProfileFromSession();
      safeSetUser(resolvedUser);
      safeSetLoading(false);
      console.log('[useAuth] bootstrapAuth: resolved user', resolvedUser?.email);
    } catch (err: unknown) {
      console.error('[useAuth] bootstrapAuth error:', err);

      const message = getErrorMessage(err, 'Failed to initialize authentication');
      safeSetError(message);

      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'bootstrap recovery getSession'
        );

        if (data.session?.user?.id) {
          const recoveredUser = await ensureUserProfileFromSession();
          safeSetUser(recoveredUser);
        } else {
          safeSetUser(null);
        }
      } catch (recoveryErr) {
        console.error('[useAuth] bootstrapAuth recovery failed:', recoveryErr);
        safeSetUser(null);
      } finally {
        safeSetLoading(false);
      }
    } finally {
      bootstrapInFlightRef.current = false;
    }
  }, [ensureUserProfileFromSession, safeSetError, safeSetLoading, safeSetUser]);

  useEffect(() => {
    mountedRef.current = true;

    void bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] onAuthStateChange:', event, session?.user?.email);

      if (!mountedRef.current) return;

      try {
        if (event === 'SIGNED_OUT') {
          lastResolvedAuthUserIdRef.current = null;
          lastCreateAttemptAuthUserIdRef.current = null;
          safeSetUser(null);
          safeSetError(null);
          safeSetLoading(false);
          return;
        }

        if (!session?.user?.id) {
          lastResolvedAuthUserIdRef.current = null;
          safeSetUser(null);
          safeSetLoading(false);
          return;
        }

        if (
          event === 'INITIAL_SESSION' &&
          lastResolvedAuthUserIdRef.current === session.user.id &&
          user
        ) {
          console.log('[useAuth] onAuthStateChange: skipping duplicate INITIAL_SESSION');
          safeSetLoading(false);
          return;
        }

        safeSetLoading(true);
        const resolvedUser = await ensureUserProfileFromSession();
        safeSetUser(resolvedUser);
        safeSetLoading(false);
      } catch (err: unknown) {
        console.error('[useAuth] onAuthStateChange error:', err);
        safeSetError(getErrorMessage(err, 'Auth state change failed'));
        safeSetLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [bootstrapAuth, ensureUserProfileFromSession, safeSetError, safeSetLoading, safeSetUser, user]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        safeSetLoading(true);
        safeSetError(null);

        const { data, error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          AUTH_TIMEOUT_MS,
          'signInWithPassword'
        );

        if (signInError) {
          const msg = signInError.message || '';
          if (msg.includes('Invalid login credentials')) {
            throw new Error(
              'Invalid email or password. Please check your credentials and try again.'
            );
          }
          if (msg.includes('Email not confirmed')) {
            throw new Error(
              'Please verify your email address before signing in. Check your inbox for a confirmation link.'
            );
          }
          throw signInError;
        }

        console.log('[useAuth] signIn success:', data.user?.email);

        if (data.user?.id) {
          const resolvedUser = await ensureUserProfileFromSession();
          safeSetUser(resolvedUser);
        } else {
          safeSetUser(null);
        }

        safeSetLoading(false);
        return { success: true };
      } catch (err: unknown) {
        console.error('[useAuth] signIn error:', err);
        safeSetUser(null);
        safeSetError(getErrorMessage(err, 'Failed to sign in'));
        safeSetLoading(false);
        throw err;
      }
    },
    [ensureUserProfileFromSession, safeSetError, safeSetLoading, safeSetUser]
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<SignUpResult> => {
      try {
        safeSetLoading(true);
        safeSetError(null);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please enter a valid email address');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }

        const { data, error: signUpError } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name },
              emailRedirectTo: `${redirectBase}/dashboard`,
            },
          }),
          AUTH_TIMEOUT_MS,
          'signUp'
        );

        if (signUpError) {
          const msg = signUpError.message || '';
          if (msg.includes('User already registered')) {
            throw new Error(
              'An account with this email already exists. Please sign in instead.'
            );
          }
          throw signUpError;
        }

        if (data.session?.user?.id) {
          const resolvedUser = await ensureUserProfileFromSession();
          safeSetUser(resolvedUser);
          safeSetLoading(false);
          return { success: true, needsVerification: false };
        }

        safeSetLoading(false);
        return { success: true, needsVerification: true };
      } catch (err: unknown) {
        console.error('[useAuth] signUp error:', err);
        safeSetError(getErrorMessage(err, 'Failed to create account'));
        safeSetLoading(false);
        throw err;
      }
    },
    [ensureUserProfileFromSession, redirectBase, safeSetError, safeSetLoading, safeSetUser]
  );

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        safeSetLoading(true);
        safeSetError(null);

        const { error: resetError } = await withTimeout(
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${redirectBase}/reset-password`,
          }),
          AUTH_TIMEOUT_MS,
          'resetPasswordForEmail'
        );

        if (resetError) {
          const msg = resetError.message || '';
          if (msg.includes('User not found')) {
            throw new Error('No account found with this email address');
          }
          throw resetError;
        }

        safeSetLoading(false);
        return { success: true };
      } catch (err: unknown) {
        console.error('[useAuth] resetPassword error:', err);
        safeSetError(getErrorMessage(err, 'Failed to send reset email'));
        safeSetLoading(false);
        throw err;
      }
    },
    [redirectBase, safeSetError, safeSetLoading]
  );

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    try {
      safeSetLoading(true);
      safeSetError(null);

      const { error: updateError } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword }),
        AUTH_TIMEOUT_MS,
        'updateUser'
      );

      if (updateError) throw updateError;

      safeSetLoading(false);
      return { success: true };
    } catch (err: unknown) {
      console.error('[useAuth] updatePassword error:', err);
      safeSetError(getErrorMessage(err, 'Failed to update password'));
      safeSetLoading(false);
      throw err;
    }
  }, [safeSetError, safeSetLoading]);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      safeSetLoading(true);
      safeSetError(null);

      const { error: signOutError } = await withTimeout(
        supabase.auth.signOut(),
        AUTH_TIMEOUT_MS,
        'signOut'
      );

      if (signOutError) throw signOutError;

      lastResolvedAuthUserIdRef.current = null;
      lastCreateAttemptAuthUserIdRef.current = null;
      safeSetUser(null);
      safeSetLoading(false);
      return { success: true };
    } catch (err: unknown) {
      console.error('[useAuth] signOut error:', err);
      safeSetError(getErrorMessage(err, 'Failed to sign out'));
      safeSetLoading(false);
      throw err;
    }
  }, [safeSetError, safeSetLoading, safeSetUser]);

  const refreshSession = useCallback(async (): Promise<AuthResult> => {
    try {
      safeSetLoading(true);
      safeSetError(null);

      const { data, error: refreshError } = await withTimeout(
        supabase.auth.refreshSession(),
        AUTH_TIMEOUT_MS,
        'refreshSession'
      );

      if (refreshError) throw refreshError;

      if (data.user?.id) {
        const resolvedUser = await ensureUserProfileFromSession();
        safeSetUser(resolvedUser);
      } else {
        safeSetUser(null);
      }

      safeSetLoading(false);
      return { success: true };
    } catch (err: unknown) {
      console.error('[useAuth] refreshSession error:', err);
      safeSetError(getErrorMessage(err, 'Failed to refresh session'));
      safeSetLoading(false);
      throw err;
    }
  }, [ensureUserProfileFromSession, safeSetError, safeSetLoading, safeSetUser]);

  const clearError = useCallback(() => safeSetError(null), [safeSetError]);

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