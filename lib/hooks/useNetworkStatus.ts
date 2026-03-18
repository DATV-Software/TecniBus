import { useEffect, useState } from 'react';
import { networkDetector } from '@/lib/network/networkDetector';

export type NetworkStatus = {
  isOnline: boolean;
  /** Force an immediate connectivity check */
  retry: () => void;
};

/**
 * React hook that exposes the global network state.
 * Backed by the `networkDetector` singleton so all components share the same state.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(networkDetector.isOnline);

  useEffect(() => {
    setIsOnline(networkDetector.isOnline);
    const unsub = networkDetector.subscribe(setIsOnline);
    return unsub;
  }, []);

  return {
    isOnline,
    retry: () => void networkDetector.check(),
  };
}
