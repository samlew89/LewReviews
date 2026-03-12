// ============================================================================
// LewReviews — Dynamic Island consensus Live Activity manager
// Starts/updates/ends the Live Activity as videos change in the feed
// NOTE: Live Activities require a dev build with expo-widgets. In Expo Go
//       the native module isn't available, so this hook is a no-op stub.
//       Re-enable the real implementation when building with EAS.
// ============================================================================

import { useCallback } from 'react';

export function useConsensusActivity() {
  const startOrUpdate = useCallback(
    (_percent: number | null, _movieTitle: string | null) => {
      // No-op in Expo Go — Live Activities require a dev build
    },
    []
  );

  const end = useCallback(() => {
    // No-op in Expo Go
  }, []);

  return { startOrUpdate, end };
}
