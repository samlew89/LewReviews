// ============================================================================
// LewReviews Mobile - Onboarding Layout
// ============================================================================

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="follow-users" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
