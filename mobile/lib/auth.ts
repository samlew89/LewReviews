// ============================================================================
// LewReviews Mobile - Auth Utilities
// ============================================================================
// Provides authentication functions using Supabase Auth
// ============================================================================

import { createContext, useContext } from 'react';
import { supabase } from './supabase';
import type { AuthError, User, Session } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

// ============================================================================
// Auth Functions
// ============================================================================

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { error };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================================================
// Auth Hook (simplified - for full implementation use a context provider)
// ============================================================================

/**
 * Simple auth hook that returns auth functions
 * For a production app, this should be replaced with a proper
 * AuthProvider context that manages user/session state
 */
export function useAuth(): Pick<AuthContextType, 'signInWithEmail' | 'signUpWithEmail' | 'signOut'> {
  return {
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}

export default {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  getCurrentSession,
  useAuth,
};
