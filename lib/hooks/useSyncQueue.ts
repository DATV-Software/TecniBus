import { useCallback, useEffect, useRef, useState } from 'react';
import { networkDetector } from '@/lib/network/networkDetector';
import { networkQueue } from '@/lib/network/NetworkQueue';
import { QueuedAction } from '@/lib/network/types';

export type SyncQueueState = {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  /** All actions currently in the queue */
  queue: readonly QueuedAction[];
  /** Whether the queue is actively syncing right now */
  isSyncing: boolean;
  /** Whether there are failed actions the user should know about */
  hasFailures: boolean;
  /** Retry all failed actions */
  retryFailed: () => Promise<void>;
  /** Dismiss (clear) all failed actions */
  clearFailed: () => Promise<void>;
};

/**
 * React hook that exposes the NetworkQueue state to components.
 *
 * - Subscribes to queue changes and re-renders when the queue updates
 * - Triggers queue processing when network comes back online
 * - Processes any pending actions that are ready for retry on each render cycle
 */
export function useSyncQueue(): SyncQueueState {
  const [, forceRender] = useState(0);
  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleProcess = useCallback(() => {
    if (processTimerRef.current) return;
    // Small delay so multiple rapid queue changes batch into one process call
    processTimerRef.current = setTimeout(() => {
      processTimerRef.current = null;
      void networkQueue.processQueue();
    }, 500);
  }, []);

  useEffect(() => {
    // Subscribe to queue changes → re-render
    const unsubQueue = networkQueue.subscribe(() => {
      forceRender((n) => n + 1);
    });

    // Subscribe to network state → process queue on reconnect
    const unsubNetwork = networkDetector.subscribe((isOnline) => {
      if (isOnline && networkQueue.pendingCount > 0) {
        scheduleProcess();
      }
    });

    // Process any pending actions that survived a restart
    if (networkDetector.isOnline && networkQueue.pendingCount > 0) {
      scheduleProcess();
    }

    return () => {
      unsubQueue();
      unsubNetwork();
      if (processTimerRef.current) {
        clearTimeout(processTimerRef.current);
      }
    };
  }, [scheduleProcess]);

  return {
    pendingCount: networkQueue.pendingCount,
    syncingCount: networkQueue.syncingCount,
    failedCount: networkQueue.failedActions.length,
    queue: networkQueue.queue,
    isSyncing: networkQueue.isSyncing,
    hasFailures: networkQueue.failedActions.length > 0,
    retryFailed: () => networkQueue.retryFailed(),
    clearFailed: () => networkQueue.clearFailed(),
  };
}
