import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/services/core/supabase';

export function useCompleteOnboarding() {
  const { user, patchProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const completeOnboarding = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      // Actualización local inmediata — sin reload ni loading global
      patchProfile({ onboarding_completed: true });
    } finally {
      setLoading(false);
    }
  };

  return { completeOnboarding, loading };
}
