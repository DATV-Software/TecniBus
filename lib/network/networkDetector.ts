import { AppState, AppStateStatus } from 'react-native';

/**
 * Lightweight URL for connectivity checks.
 * We ping our own Supabase project — if it's reachable, we have internet
 * AND our backend is available, which is exactly what we care about.
 */
const PING_URL =
  `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://supabase.com'}/rest/v1/`;

const PING_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const PING_TIMEOUT_MS = 6_000;
const OFFLINE_POLL_MS = 8_000;
// Delay before the very first ping so the device network stack is ready
const STARTUP_DELAY_MS = 1_500;

async function pingOnce(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
      headers: { apikey: PING_ANON_KEY },
    });
    // Any HTTP response (even 4xx) means the server is reachable
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ping(retries = 2): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    if (await pingOnce()) return true;
    if (i < retries) await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

type NetworkListener = (isOnline: boolean) => void;

/**
 * Singleton network state detector.
 *
 * Responsibilities:
 * - Performs an HTTP ping to determine real connectivity (not just "has WiFi")
 * - Polls every 8s when offline to detect restoration
 * - Listens to AppState changes to re-check when app comes to foreground
 * - Notifies subscribers on state change
 * - Accepts manual `reportNetworkError()` to immediately transition to offline
 *   (called by services when they get a network-level error)
 */
class NetworkDetector {
  private static _instance: NetworkDetector | null = null;

  private _isOnline = true;
  private _listeners = new Set<NetworkListener>();
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _initialized = false;
  private _checking = false;

  private constructor() {}

  static getInstance(): NetworkDetector {
    if (!NetworkDetector._instance) {
      NetworkDetector._instance = new NetworkDetector();
    }
    return NetworkDetector._instance;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  // ── Initialization ────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void this.check();
      }
    });

    // Wait for the device network stack to be ready before first ping
    await new Promise((r) => setTimeout(r, STARTUP_DELAY_MS));
    await this.check();
  }

  // ── Connectivity Check ────────────────────────────────────────────────────

  async check(): Promise<boolean> {
    if (this._checking) return this._isOnline;
    this._checking = true;
    try {
      const online = await ping();
      this._setOnline(online);
      return online;
    } finally {
      this._checking = false;
    }
  }

  /**
   * Called by services when they receive a network-level error.
   * Immediately transitions to offline state and starts polling.
   */
  reportNetworkError(): void {
    this._setOnline(false);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _setOnline(online: boolean): void {
    const changed = online !== this._isOnline;
    this._isOnline = online;

    if (!online && !this._pollTimer) {
      // Start polling when we go offline
      this._pollTimer = setInterval(() => void this.check(), OFFLINE_POLL_MS);
    } else if (online && this._pollTimer) {
      // Stop polling when we come back online
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }

    if (changed) {
      console.log(
        `[NetworkDetector] Connection ${online ? '✅ restored' : '❌ lost'}`,
      );
      this._listeners.forEach((fn) => fn(online));
    }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(fn: NetworkListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const networkDetector = NetworkDetector.getInstance();
