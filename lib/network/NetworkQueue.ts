import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActionType, QueuedAction } from './types';
import { classifyError, isRetryable } from './errorClassifier';
import { getNextRetryDelay, getMaxRetries } from './retryStrategy';

const QUEUE_STORAGE_KEY = '@tecnibus:network_queue_v1';

type Executor<T = unknown> = (payload: T) => Promise<void>;

/**
 * Persistent offline action queue.
 *
 * Design:
 * - Singleton to share state across the entire app
 * - AsyncStorage-backed: survives app restarts
 * - Executor registry: maps ActionType → async function that performs the real call
 * - Exponential backoff: failed network actions are retried with increasing delay
 * - Deduplication: prevents queuing the same logical action twice
 * - Server-authoritative: validation errors (4xx) remove the action from queue without retry
 */
export class NetworkQueue {
  private static _instance: NetworkQueue | null = null;

  private _queue: QueuedAction[] = [];
  private _executors = new Map<ActionType, Executor>();
  private _syncing = false;
  private _listeners = new Set<() => void>();

  private constructor() {}

  static getInstance(): NetworkQueue {
    if (!NetworkQueue._instance) {
      NetworkQueue._instance = new NetworkQueue();
    }
    return NetworkQueue._instance;
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register an executor for a given action type.
   * Must be called at app startup before any action can be processed.
   */
  register<T>(type: ActionType, executor: Executor<T>): void {
    this._executors.set(type, executor as Executor);
  }

  // ── Enqueueing ────────────────────────────────────────────────────────────

  /**
   * Add an action to the offline queue.
   *
   * @param type - The action type (determines executor and max retries)
   * @param payload - Serializable payload replayed when syncing
   * @param deduplicateKey - If set, skip enqueueing if a pending action with
   *   the same type and this key substring in its payload already exists.
   *   Prevents double-queuing "mark student X absent" etc.
   * @returns The action ID, or 'duplicate' if deduplicated.
   */
  async enqueue<T>(
    type: ActionType,
    payload: T,
    deduplicateKey?: string,
  ): Promise<string> {
    if (deduplicateKey) {
      const isDuplicate = this._queue.some(
        (a) =>
          a.type === type &&
          a.status !== 'failed' &&
          JSON.stringify(a.payload).includes(deduplicateKey),
      );
      if (isDuplicate) {
        console.log(
          `[Queue] Skipping duplicate ${type} (key: ${deduplicateKey})`,
        );
        return 'duplicate';
      }
    }

    const action: QueuedAction<T> = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: getMaxRetries(type),
      status: 'pending',
    };

    this._queue.push(action as QueuedAction);
    await this._persist();
    this._notify();

    console.log(
      `[Queue] Enqueued ${type} | queue length: ${this._queue.length}`,
    );
    return action.id;
  }

  // ── Processing ────────────────────────────────────────────────────────────

  /**
   * Process all pending actions that are ready for retry.
   * Safe to call multiple times — concurrent calls are no-ops.
   */
  async processQueue(): Promise<void> {
    if (this._syncing) return;

    const now = Date.now();
    const toProcess = this._queue.filter(
      (a) =>
        a.status === 'pending' &&
        (!a.nextRetryAt || a.nextRetryAt <= now),
    );

    if (toProcess.length === 0) return;

    this._syncing = true;
    console.log(`[Queue] Processing ${toProcess.length} pending action(s)`);

    for (const action of toProcess) {
      // Re-read from queue to get latest state (may have been removed)
      const current = this._queue.find((a) => a.id === action.id);
      if (!current || current.status !== 'pending') continue;
      await this._processAction(current);
    }

    this._syncing = false;
  }

  private async _processAction(action: QueuedAction): Promise<void> {
    const executor = this._executors.get(action.type);
    if (!executor) {
      console.warn(`[Queue] No executor for: ${action.type} — skipping`);
      return;
    }

    this._updateInMemory(action.id, { status: 'syncing' });

    try {
      await executor(action.payload);

      // ✅ Success — remove from queue
      this._queue = this._queue.filter((a) => a.id !== action.id);
      await this._persist();
      this._notify();
      console.log(`[Queue] ✅ Synced ${action.type}`);
    } catch (error) {
      const kind = classifyError(error);
      const msg = error instanceof Error ? error.message : String(error);

      if (!isRetryable(kind)) {
        // Validation / auth failure — no point retrying
        this._updateInMemory(action.id, {
          status: 'failed',
          lastError: `[${kind}] ${msg}`,
        });
        console.warn(`[Queue] ❌ Non-retryable ${action.type}: ${msg}`);
      } else if (action.retryCount >= action.maxRetries) {
        // Exhausted all retries
        this._updateInMemory(action.id, {
          status: 'failed',
          lastError: `Max retries (${action.maxRetries}) exceeded. ${msg}`,
        });
        console.warn(`[Queue] ❌ Max retries exceeded for ${action.type}`);
      } else {
        // Schedule next retry with backoff
        const delay = getNextRetryDelay(action.retryCount);
        this._updateInMemory(action.id, {
          status: 'pending',
          retryCount: action.retryCount + 1,
          nextRetryAt: Date.now() + delay,
          lastError: msg,
        });
        console.log(
          `[Queue] ⏳ Retry ${action.type} in ${(delay / 1000).toFixed(1)}s` +
          ` (attempt ${action.retryCount + 1}/${action.maxRetries})`,
        );
      }

      await this._persist();
      this._notify();
    }
  }

  private _updateInMemory(id: string, updates: Partial<QueuedAction>): void {
    const idx = this._queue.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this._queue[idx] = { ...this._queue[idx], ...updates };
    }
    this._notify();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /** Load queue from AsyncStorage. Call once at app startup. */
  async load(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as QueuedAction[];
      // Reset any 'syncing' status from a crash/force-quit
      this._queue = parsed.map((a) =>
        a.status === 'syncing' ? { ...a, status: 'pending' as const } : a,
      );
      console.log(
        `[Queue] Loaded ${this._queue.length} action(s) from storage`,
      );
      this._notify();
    } catch (e) {
      console.error('[Queue] Failed to load from storage:', e);
      this._queue = [];
    }
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        QUEUE_STORAGE_KEY,
        JSON.stringify(this._queue),
      );
    } catch (e) {
      console.error('[Queue] Failed to persist:', e);
    }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _notify(): void {
    this._listeners.forEach((l) => l());
  }

  // ── Public state getters ──────────────────────────────────────────────────

  get queue(): readonly QueuedAction[] {
    return this._queue;
  }

  get pendingCount(): number {
    return this._queue.filter((a) => a.status === 'pending').length;
  }

  get syncingCount(): number {
    return this._queue.filter((a) => a.status === 'syncing').length;
  }

  get failedActions(): readonly QueuedAction[] {
    return this._queue.filter((a) => a.status === 'failed');
  }

  get isSyncing(): boolean {
    return this._syncing;
  }

  async clearFailed(): Promise<void> {
    this._queue = this._queue.filter((a) => a.status !== 'failed');
    await this._persist();
    this._notify();
  }

  async retryFailed(): Promise<void> {
    this._queue = this._queue.map((a) =>
      a.status === 'failed'
        ? { ...a, status: 'pending' as const, retryCount: 0, nextRetryAt: undefined }
        : a,
    );
    await this._persist();
    this._notify();
    await this.processQueue();
  }
}

export const networkQueue = NetworkQueue.getInstance();
