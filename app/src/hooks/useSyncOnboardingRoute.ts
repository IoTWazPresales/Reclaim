import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { saveOnboardingStep, type OnboardingRouteName } from '@/lib/onboardingProgress';

/** Call from each onboarding screen so resume-after-kill stays accurate. */
export function useSyncOnboardingRoute(routeName: OnboardingRouteName) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useFocusEffect(
    useCallback(() => {
      if (userId) void saveOnboardingStep(userId, routeName);
    }, [userId, routeName]),
  );
}
