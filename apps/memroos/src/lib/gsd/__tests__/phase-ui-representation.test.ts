import { describe, expect, it } from "vitest";

import { validatePhaseUiRepresentation } from "../phase-ui-representation";

describe("validatePhaseUiRepresentation", () => {
  it("fails completed phase summaries without a UI representation decision", () => {
    const result = validatePhaseUiRepresentation(`# Phase 99 Summary

status: complete

## Verification

- Tests passed.
`);

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("ui_representation");
  });

  it("accepts visible UI, existing UI provenance, API-only, and follow-up decisions", () => {
    const result = validatePhaseUiRepresentation(`# Phase 99 Summary

status: complete
ui_representation: api_only
ui_representation_note: Backend-only migration; operator proof is exposed through existing audit entries.
`);

    expect(result.ok).toBe(true);
    expect(result.kind).toBe("api_only");
  });
});
