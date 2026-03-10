// ============================================================================
// LewReviews Mobile - Auth Context Provider
// ============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { clearPushToken } from '../hooks/usePushNotifications';
import type { AuthError, User, Session } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const handleDeepLink = useCallback(async (url: string) => {
    const parsed = Linking.parse(url);
    const isResetPasswordPath = typeof parsed.path === 'string' && parsed.path.endsWith('reset-password');
    if (!isResetPasswordPath) return;

    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const fragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) {
        setIsPasswordRecovery(true);
      }
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Check if app was opened via a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for deep links while app is running
    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [handleDeepLink]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Clear push token before signing out
    await clearPushToken();
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    isPasswordRecovery,
    clearPasswordRecovery,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Auth Hook
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
