/**
 * Authentication Context for LewReviews
 *
 * Provides session management and authentication hooks for React Native.
 * Uses Supabase Auth with AsyncStorage persistence.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Profile } from '../types/database';

/**
 * Authentication state interface
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Authentication context value interface
 */
interface AuthContextValue extends AuthState {
  // Auth methods
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;

  // Profile methods
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

/**
 * Default auth state
 */
const defaultAuthState: AuthState = {
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
};

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider Component
 *
 * Wraps the app to provide authentication state and methods.
 *
 * @example
 * ```tsx
 * // In your App.tsx
 * import { AuthProvider } from './lib/auth';
 *
 * export default function App() {
 *   return (
 *     <AuthProvider>
 *       <Navigation />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(defaultAuthState);

  /**
   * Fetch user profile from database
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  /**
   * Update auth state with session and profile
   */
  const updateAuthState = useCallback(
    async (session: Session | null) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          session,
          user: session.user,
          profile,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    },
    [fetchProfile]
  );

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      updateAuthState(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateAuthState]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  }, []);

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true, // Handle redirect in React Native
      },
    });
    return { error };
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  /**
   * Reset password (send reset email)
   */
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, []);

  /**
   * Update password (for authenticated users)
   */
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  /**
   * Refresh profile data
   */
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState((prev) => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  /**
   * Update profile data
   */
  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!state.user) {
        return { error: new Error('Not authenticated') };
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', state.user.id);

        if (error) {
          return { error: new Error(error.message) };
        }

        // Refresh profile after update
        await refreshProfile();
        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [state.user, refreshProfile]
  );

  /**
   * Memoized context value
   */
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithEmail,
      signUpWithEmail,
      signInWithOAuth,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      updateProfile,
    }),
    [
      state,
      signInWithEmail,
      signUpWithEmail,
      signInWithOAuth,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Access authentication state and methods from any component.
 *
 * @returns AuthContextValue with session, user, profile, and auth methods
 *
 * @example
 * ```tsx
 * import { useAuth } from './lib/auth';
 *
 * function ProfileScreen() {
 *   const { user, profile, isLoading, signOut } = useAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!user) {
 *     return <LoginScreen />;
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Welcome, {profile?.display_name || profile?.username}</Text>
 *       <Button onPress={signOut} title="Sign Out" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * useSession Hook
 *
 * Convenience hook for accessing just the session.
 *
 * @returns Session object or null
 */
export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}

/**
 * useUser Hook
 *
 * Convenience hook for accessing just the user.
 *
 * @returns User object or null
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * useProfile Hook
 *
 * Convenience hook for accessing just the profile.
 *
 * @returns Profile object or null
 */
export function useProfile(): Profile | null {
  const { profile } = useAuth();
  return profile;
}

/**
 * useIsAuthenticated Hook
 *
 * Convenience hook for checking authentication status.
 *
 * @returns boolean indicating if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export default AuthProvider;
