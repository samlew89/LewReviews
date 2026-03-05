// ============================================================================
// LewReviews Mobile - Onboarding Hook
// ============================================================================
// Tracks whether the current user has completed onboarding.
// Uses AsyncStorage for fast local reads, falls back to Supabase for
// cross-device/reinstall scenarios.
//
// State is shared across all hook instances via module-level subscribers
// so the root layout and onboarding screens stay in sync.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

// ============================================================================
// Shared state across all hook instances
// ============================================================================

let globalValue: boolean | null = null;
const subscribers = new Set<(val: boolean | null) => void>();

function setGlobal(val: boolean | null) {
  globalValue = val;
  subscribers.forEach((fn) => fn(val));
}

// ============================================================================
// Hook
// ============================================================================

function storageKey(userId: string): string {
  return `onboarding_completed:${userId}`;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(globalValue);

  // Subscribe to shared state changes from other hook instances
  useEffect(() => {
    const handler = (val: boolean | null) => setIsOnboardingComplete(val);
    subscribers.add(handler);
    return () => { subscribers.delete(handler); };
  }, []);

  // Fetch onboarding state when user changes
  useEffect(() => {
    if (!user) {
      setGlobal(null);
      return;
    }

    // If already resolved globally, skip the fetch
    if (globalValue !== null) {
      setIsOnboardingComplete(globalValue);
      return;
    }

    let cancelled = false;

    async function check() {
      // Fast path: check AsyncStorage first
      const local = await AsyncStorage.getItem(storageKey(user!.id));
      if (local === 'true') {
        if (!cancelled) setGlobal(true);
        return;
      }

      // Slow path: check Supabase (handles reinstall/new device)
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user!.id)
        .single();

      if (cancelled) return;

      if (data?.onboarding_completed) {
        await AsyncStorage.setItem(storageKey(user!.id), 'true');
        setGlobal(true);
      } else {
        setGlobal(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    await Promise.all([
      AsyncStorage.setItem(storageKey(user.id), 'true'),
      supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id),
    ]);

    setGlobal(true);
  }, [user]);

  return { isOnboardingComplete, completeOnboarding };
}
