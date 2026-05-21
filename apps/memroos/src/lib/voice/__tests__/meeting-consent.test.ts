// @vitest-environment node
/**
 * Wave 0 RED scaffold: meeting-consent library (VOICE-08 / D-13 / D-14)
 *
 * These tests pin the contract for meeting-consent.ts BEFORE implementation.
 * They must fail until meeting-consent.ts and the meeting_consents table DDL
 * in db-schema.ts are created.
 *
 * Contract:
 *   - recordConsent(db, { operatorId, meetingLabel }) inserts a meeting_consents
 *     row and returns an opaque meeting_id (UUID-like string, NOT a URL)
 *   - hasConsent(db, meetingId) returns true after recordConsent, false for unknown
 *   - recordConsent NEVER stores a room URL or token on the row
 */

import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { initSchema } from "@/lib/db-schema";

// These imports will fail (Cannot find module) until meeting-consent.ts exists — RED
import { recordConsent, hasConsent } from "../meeting-consent";

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  initSchema(db);
  return db;
}

describe("meeting-consent library (VOICE-08)", () => {
  let db: Database.Database;

  afterEach(() => {
    db?.close();
  });

  it("recordConsent inserts a meeting_consents row and returns an opaque meeting_id", () => {
    db = makeDb();
    const meetingId = recordConsent(db, {
      operatorId: "op-123",
      meetingLabel: "Q2 strategy sync",
    });

    expect(typeof meetingId).toBe("string");
    expect(meetingId.length).toBeGreaterThan(8);

    // Must be UUID-like — not a URL
    expect(meetingId).not.toContain("://");
    expect(meetingId).not.toContain("http");

    const row = db
      .prepare("SELECT * FROM meeting_consents WHERE meeting_id = ?")
      .get(meetingId) as Record<string, unknown> | undefined;

    expect(row).toBeDefined();
    expect(row!.operator_id).toBe("op-123");
    expect(row!.meeting_label).toBe("Q2 strategy sync");
    expect(row!.consented).toBe(1);
  });

  it("hasConsent returns true for a recorded meeting_id", () => {
    db = makeDb();
    const meetingId = recordConsent(db, {
      operatorId: "op-456",
      meetingLabel: "Investor call",
    });

    expect(hasConsent(db, meetingId)).toBe(true);
  });

  it("hasConsent returns false for an unknown meeting_id", () => {
    db = makeDb();
    expect(hasConsent(db, "nonexistent-uuid-xyz")).toBe(false);
  });

  it("recordConsent does not store any room URL or token on the row (D-13)", () => {
    db = makeDb();
    const meetingId = recordConsent(db, {
      operatorId: "op-789",
      meetingLabel: "Board review",
    });

    const row = db
      .prepare("SELECT * FROM meeting_consents WHERE meeting_id = ?")
      .get(meetingId) as Record<string, unknown> | undefined;

    expect(row).toBeDefined();

    // D-13: no room_url or token column must exist on the row
    const columns = Object.keys(row!);
    expect(columns).not.toContain("room_url");
    expect(columns).not.toContain("token");
    expect(columns).not.toContain("join_url");
    expect(columns).not.toContain("daily_token");

    // No column value should look like a URL
    for (const val of Object.values(row!)) {
      if (typeof val === "string") {
        expect(val).not.toContain("://");
      }
    }
  });

  it("each recordConsent call returns a distinct meeting_id", () => {
    db = makeDb();
    const id1 = recordConsent(db, { operatorId: "op-1", meetingLabel: "Meeting A" });
    const id2 = recordConsent(db, { operatorId: "op-1", meetingLabel: "Meeting B" });
    expect(id1).not.toBe(id2);
  });
});
