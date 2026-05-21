/**
 * Phase 71: HIL SLA background scheduler (HIL-05).
 *
 * Polls for expired open HIL escalations every 60 seconds and applies the
 * configured SLA action (notify / auto-resolve / abandon) to each.
 *
 * Registered via instrumentation.ts under the scheduler-singleton lock so
 * only one Memroos process owns the timer (D-08).
 *
 * Security:
 *   T-71-11: runSlaPoll wraps runSlaActions in try/catch so errors never
 *   propagate into the setInterval timer and kill the scheduler.
 */

import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { runSlaActions } from "./sla-actions";

/** Poll interval in milliseconds — one minute (D-08). */
export const SLA_POLL_INTERVAL_MS = 60_000;

/** Module-level started guard to prevent double-start. */
let _started = false;

/**
 * Runs a single SLA poll cycle: finds and acts on expired open escalations.
 * All errors are caught and logged — never propagated into the timer (T-71-11).
 *
 * @param db - DB instance; defaults to the global singleton.
 */
export function runSlaPoll(db: Database.Database = getDb()): void {
  try {
    const result = runSlaActions(db);
    if (result.acted > 0) {
      console.log(
        `[sla-scheduler] Acted on ${result.acted} expired escalation(s):`,
        result.byAction
      );
    }
  } catch (err) {
    console.error("[sla-scheduler] Unhandled error during SLA poll:", err);
  }
}

/**
 * Starts the SLA escalation scheduler.
 * Runs immediately on first start, then every SLA_POLL_INTERVAL_MS.
 * Module-level guard prevents double-start (mirrors startDecayScheduler pattern).
 */
export function startSlaScheduler(): void {
  if (_started) return;
  _started = true;
  console.log(`[sla-scheduler] scheduler started (interval: ${SLA_POLL_INTERVAL_MS / 1000}s)`);
  runSlaPoll();
  setInterval(runSlaPoll, SLA_POLL_INTERVAL_MS);
}

/**
 * Resets the started guard — for test isolation only.
 */
export function _resetSlaSchedulerForTest(): void {
  _started = false;
}
