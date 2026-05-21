export type PhaseUiRepresentation =
  | "visible_ui"
  | "existing_ui_provenance"
  | "api_only"
  | "follow_up_required";

const ALLOWED: PhaseUiRepresentation[] = [
  "visible_ui",
  "existing_ui_provenance",
  "api_only",
  "follow_up_required",
];

export interface PhaseUiRepresentationValidation {
  ok: boolean;
  kind: PhaseUiRepresentation | null;
  missing: string[];
  errors: string[];
}

function fieldValue(summary: string, field: string): string | null {
  const match = summary.match(new RegExp(`^${field}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? null;
}

export function validatePhaseUiRepresentation(summary: string): PhaseUiRepresentationValidation {
  const kind = fieldValue(summary, "ui_representation");
  const note = fieldValue(summary, "ui_representation_note");
  const missing: string[] = [];
  const errors: string[] = [];

  if (!kind) {
    missing.push("ui_representation");
  } else if (!ALLOWED.includes(kind as PhaseUiRepresentation)) {
    errors.push(`ui_representation must be one of: ${ALLOWED.join(", ")}`);
  }

  if (!note) {
    missing.push("ui_representation_note");
  }

  return {
    ok: missing.length === 0 && errors.length === 0,
    kind: ALLOWED.includes(kind as PhaseUiRepresentation) ? (kind as PhaseUiRepresentation) : null,
    missing,
    errors,
  };
}
