import { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';

/**
 * Encapsula el ref del ScrollView principal del admin dashboard
 * y los callbacks beforeShow para desplazar hasta cada sección del tour.
 */
export function useAdminTourSetup() {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToStatus = useCallback(async () => {
    scrollRef.current?.scrollTo({ y: 310, animated: true });
    await new Promise<void>(r => setTimeout(r, 450));
  }, []);

  const scrollToActions = useCallback(async () => {
    scrollRef.current?.scrollTo({ y: 640, animated: true });
    await new Promise<void>(r => setTimeout(r, 450));
  }, []);

  return { scrollRef, scrollToStatus, scrollToActions };
}
