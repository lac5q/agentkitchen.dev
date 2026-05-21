import crypto from "crypto";
import type Database from "better-sqlite3";

export interface RecordConsentInput {
  operatorId: string;
  meetingLabel: string;
}

export function recordConsent(db: Database.Database, input: RecordConsentInput): string {
  const meetingId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO meeting_consents (meeting_id, operator_id, meeting_label, consented)
     VALUES (?, ?, ?, 1)`
  ).run(meetingId, input.operatorId, input.meetingLabel);
  return meetingId;
}

export function hasConsent(db: Database.Database, meetingId: string): boolean {
  const row = db
    .prepare("SELECT consented FROM meeting_consents WHERE meeting_id = ?")
    .get(meetingId) as { consented: number } | undefined;
  return row?.consented === 1;
}
