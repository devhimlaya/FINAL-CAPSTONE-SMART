/**
 * syncCoordinator.ts
 *
 * Unified sync coordinator — the SINGLE entry point for all background sync.
 * Replaces the previous triple-scheduler pattern that caused race conditions
 * and inconsistent data.
 *
 * Responsibilities:
 *  1. Runs EnrollPro sync → Atlas sync → Branding sync in correct order
 *  2. Maintains a global lock (no overlapping runs)
 *  3. Broadcasts SSE events so frontend auto-refreshes
 *  4. Exposes status/result for admin dashboard
 *  5. Supports immediate trigger (webhook, manual admin action)
 *
 * Call startUnifiedSyncScheduler() once on server boot. That's it.
 */

import { runEnrollProSync, getEnrollProSyncStatus } from './enrollproSync';
import { runAtlasSync, getSyncStatus as getAtlasSyncStatus } from './atlasSync';
import { syncEnrollProBranding } from './enrollproBrandingSync';
import { broadcastSyncStatus } from './sseManager';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SYNC_INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES ?? '5', 10);
const BRANDING_SYNC_EVERY_N_CYCLES = parseInt(process.env.BRANDING_SYNC_EVERY_N_CYCLES ?? '12', 10); // 12 × 5min = 60min
const INITIAL_DELAY_MS = parseInt(process.env.SYNC_INITIAL_DELAY_MS ?? '5000', 10); // 5s after boot

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let syncRunning = false;
let syncCycleCount = 0;
let lastFullSyncAt: Date | null = null;
let lastSyncResult: UnifiedSyncResult | null = null;
let _schedulerTimer: NodeJS.Timeout | null = null;

export interface UnifiedSyncResult {
  timestamp: string;
  durationMs: number;
  enrollpro: {
    advisoriesSynced: number;
    studentsSynced: number;
    teachersMatched: number;
    errors: string[];
  } | null;
  atlas: {
    matched: number;
    created: number;
    deleted: number;
    teachersWithLoads: number;
    errors: string[];
  } | null;
  branding: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core sync cycle
// ---------------------------------------------------------------------------

/**
 * Runs a full sync cycle in the correct dependency order:
 *   1. EnrollPro (teachers, sections, students, enrollments)
 *   2. Atlas (teaching load — depends on sections from step 1)
 *   3. Branding (independent, only every Nth cycle)
 *
 * Safe to call from anywhere — will skip if already running.
 */
export async function runUnifiedSync(options?: {
  forceBranding?: boolean;
  source?: string;
}): Promise<UnifiedSyncResult> {
  if (syncRunning) {
    console.log('[SyncCoordinator] Sync already running, skipping.');
    return lastSyncResult ?? buildEmptyResult('skipped — already running');
  }

  syncRunning = true;
  syncCycleCount++;
  const startTime = Date.now();
  const source = options?.source ?? 'scheduled';

  console.log(`\n[SyncCoordinator] ===== Sync cycle #${syncCycleCount} started (${source}) ${new Date().toISOString()} =====`);

  // Broadcast start event to SSE clients
  broadcastSyncStatus({
    type: 'SYNC_STARTED',
    source,
    timestamp: new Date().toISOString(),
  });

  let enrollproResult: UnifiedSyncResult['enrollpro'] = null;
  let atlasResult: UnifiedSyncResult['atlas'] = null;
  let brandingSynced = false;
  let error: string | undefined;

  try {
    // ── Step 1: EnrollPro Sync ──────────────────────────────────────────
    // Must run first — Atlas depends on sections and teachers from EnrollPro.
    try {
      console.log('[SyncCoordinator] Step 1/3: EnrollPro sync...');
      const epResult = await runEnrollProSync();
      if (epResult) {
        enrollproResult = {
          advisoriesSynced: epResult.advisoriesSynced,
          studentsSynced: epResult.studentsSynced,
          teachersMatched: epResult.teachersMatched,
          errors: epResult.errors,
        };
      }
    } catch (err: any) {
      console.error('[SyncCoordinator] EnrollPro sync failed:', err.message);
      enrollproResult = { advisoriesSynced: 0, studentsSynced: 0, teachersMatched: 0, errors: [err.message] };
    }

    // ── Step 2: Atlas Sync ──────────────────────────────────────────────
    // Teaching load — depends on sections existing in SMART DB.
    try {
      console.log('[SyncCoordinator] Step 2/3: Atlas sync...');
      const atResult = await runAtlasSync();
      if (atResult) {
        atlasResult = {
          matched: atResult.matched,
          created: atResult.created,
          deleted: atResult.deleted,
          teachersWithLoads: atResult.teachersWithLoads,
          errors: atResult.errors,
        };
      }
    } catch (err: any) {
      console.error('[SyncCoordinator] Atlas sync failed:', err.message);
      atlasResult = { matched: 0, created: 0, deleted: 0, teachersWithLoads: 0, errors: [err.message] };
    }

    // ── Step 3: Branding Sync (low frequency) ───────────────────────────
    // Only runs every Nth cycle unless forced.
    const shouldSyncBranding = options?.forceBranding || (syncCycleCount % BRANDING_SYNC_EVERY_N_CYCLES === 0);
    if (shouldSyncBranding) {
      try {
        console.log('[SyncCoordinator] Step 3/3: Branding sync...');
        await syncEnrollProBranding();
        brandingSynced = true;
      } catch (err: any) {
        console.error('[SyncCoordinator] Branding sync failed:', err.message);
      }
    } else {
      console.log(`[SyncCoordinator] Step 3/3: Branding sync skipped (next at cycle #${Math.ceil(syncCycleCount / BRANDING_SYNC_EVERY_N_CYCLES) * BRANDING_SYNC_EVERY_N_CYCLES})`);
    }

  } catch (err: any) {
    error = err.message;
    console.error('[SyncCoordinator] Fatal error:', err.message);
  } finally {
    syncRunning = false;
  }

  const durationMs = Date.now() - startTime;
  lastFullSyncAt = new Date();

  lastSyncResult = {
    timestamp: lastFullSyncAt.toISOString(),
    durationMs,
    enrollpro: enrollproResult,
    atlas: atlasResult,
    branding: brandingSynced,
    ...(error ? { error } : {}),
  };

  console.log(
    `[SyncCoordinator] ===== Sync cycle #${syncCycleCount} complete in ${durationMs}ms =====\n` +
    `  EnrollPro: ${enrollproResult?.studentsSynced ?? 0} students, ${enrollproResult?.advisoriesSynced ?? 0} advisories\n` +
    `  Atlas:     ${atlasResult?.created ?? 0} assignments created, ${atlasResult?.matched ?? 0} teachers matched\n` +
    `  Branding:  ${brandingSynced ? 'synced' : 'skipped'}\n`
  );

  // Broadcast completion to all SSE clients
  broadcastSyncStatus({
    type: 'SYNC_COMPLETE',
    source,
    timestamp: lastFullSyncAt.toISOString(),
    durationMs,
    result: {
      enrollpro: enrollproResult ? {
        students: enrollproResult.studentsSynced,
        advisories: enrollproResult.advisoriesSynced,
        errors: enrollproResult.errors.length,
      } : null,
      atlas: atlasResult ? {
        created: atlasResult.created,
        matched: atlasResult.matched,
        errors: atlasResult.errors.length,
      } : null,
    },
  });

  return lastSyncResult;
}

/**
 * Trigger an immediate sync cycle (from webhook or manual admin action).
 * Non-blocking — returns immediately if sync is already running.
 */
export function triggerImmediateSync(source = 'manual'): void {
  runUnifiedSync({ source, forceBranding: false }).catch((err) => {
    console.error(`[SyncCoordinator] Triggered sync (${source}) failed:`, err);
  });
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Start the unified sync scheduler. Call ONCE on server boot.
 * Replaces startAtlasSyncScheduler, startEnrollProSyncScheduler,
 * startEnrollProBrandingSyncScheduler, and the autoSync setInterval.
 */
export function startUnifiedSyncScheduler(): void {
  if (_schedulerTimer) {
    console.warn('[SyncCoordinator] Scheduler already running, ignoring duplicate start.');
    return;
  }

  const intervalMs = SYNC_INTERVAL_MINUTES * 60 * 1000;

  console.log(
    `[SyncCoordinator] Scheduler started — syncing every ${SYNC_INTERVAL_MINUTES} min. ` +
    `Branding every ${BRANDING_SYNC_EVERY_N_CYCLES * SYNC_INTERVAL_MINUTES} min. ` +
    `First sync in ${INITIAL_DELAY_MS / 1000}s.`
  );

  // First sync after a short delay (let DB connections settle)
  setTimeout(() => {
    runUnifiedSync({ source: 'boot', forceBranding: true }).catch((err) => {
      console.error('[SyncCoordinator] Boot sync failed:', err);
    });
  }, INITIAL_DELAY_MS);

  // Recurring sync
  _schedulerTimer = setInterval(() => {
    runUnifiedSync({ source: 'scheduled' }).catch((err) => {
      console.error('[SyncCoordinator] Scheduled sync failed:', err);
    });
  }, intervalMs);
}

/**
 * Stop the scheduler (for graceful shutdown or testing).
 */
export function stopUnifiedSyncScheduler(): void {
  if (_schedulerTimer) {
    clearInterval(_schedulerTimer);
    _schedulerTimer = null;
    console.log('[SyncCoordinator] Scheduler stopped.');
  }
}

// ---------------------------------------------------------------------------
// Status accessors
// ---------------------------------------------------------------------------

export function getUnifiedSyncStatus() {
  return {
    running: syncRunning,
    cycleCount: syncCycleCount,
    lastSyncAt: lastFullSyncAt?.toISOString() ?? null,
    lastResult: lastSyncResult,
    config: {
      intervalMinutes: SYNC_INTERVAL_MINUTES,
      brandingEveryNCycles: BRANDING_SYNC_EVERY_N_CYCLES,
    },
    subsystems: {
      enrollpro: getEnrollProSyncStatus(),
      atlas: getAtlasSyncStatus(),
    },
  };
}

export function isUnifiedSyncRunning(): boolean {
  return syncRunning;
}

export function getLastUnifiedSyncResult(): UnifiedSyncResult | null {
  return lastSyncResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEmptyResult(error: string): UnifiedSyncResult {
  return {
    timestamp: new Date().toISOString(),
    durationMs: 0,
    enrollpro: null,
    atlas: null,
    branding: false,
    error,
  };
}
