import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTour } from './useTour';
import { useCompleteOnboarding } from './useCompleteOnboarding';

/**
 * Hook reutilizable: inicia el tour automáticamente en el primer login.
 * @param scope — 'admin' | 'driver' | 'parent' — filtra los steps de esta pantalla
 */
export function useTourAutoStart(scope: string) {
  const { profile } = useAuth();
  const { startTour } = useTour();
  const { completeOnboarding } = useCompleteOnboarding();

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      const t = setTimeout(() => startTour(scope, completeOnboarding), 900);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.onboarding_completed]);
}
