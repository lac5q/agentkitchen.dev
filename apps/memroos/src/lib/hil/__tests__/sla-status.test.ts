import { describe, expect, it } from "vitest";
import { slaTrafficLight } from "../sla-status";

describe("slaTrafficLight", () => {
  // Fixed reference point for all tests
  const now = new Date("2026-05-21T12:00:00.000Z").getTime();

  it("returns green when more than 50% of the SLA window remains", () => {
    // SLA is 3600s (1hr); deadline is 2700s (45min) from now; 75% remaining
    const deadline = new Date(now + 2700 * 1000).toISOString();
    expect(slaTrafficLight(deadline, 3600, "open", now)).toBe("green");
  });

  it("returns amber when less than 50% remains but the deadline is not past", () => {
    // SLA is 3600s; deadline is 1200s (20min) from now; 33% remaining
    const deadline = new Date(now + 1200 * 1000).toISOString();
    expect(slaTrafficLight(deadline, 3600, "open", now)).toBe("amber");
  });

  it("returns red when the deadline is in the past", () => {
    // Deadline was 60s ago
    const deadline = new Date(now - 60 * 1000).toISOString();
    expect(slaTrafficLight(deadline, 3600, "open", now)).toBe("red");
  });

  it("returns red for sla_breached status regardless of time math", () => {
    // Deadline is 2700s away — math would say green, but status overrides
    const deadline = new Date(now + 2700 * 1000).toISOString();
    expect(slaTrafficLight(deadline, 3600, "sla_breached", now)).toBe("red");
  });
});
