// Operator-console (NOC) palette. Mirrors the design bundle's token set.
// Kept as fixed values (not CSS vars) so the light-only NOC surface does not
// flip under the global `.dark` variant.

export const NOC = {
  cream: "#fafaf7",
  paper: "#ffffff",
  fog: "#f2f2ee",
  rule: "#e4e4dd",
  ruleStrong: "#c9c9c2",
  ink: "#0f0f0e",
  muted: "#4a4a45",
  soft: "#6e6e67",
  terra: "#a8392c",
  terraDeep: "#7a2a1e",
  peach: "#f2e2dc",
  peachWarm: "#ecd3c8",
  success: "#2f7a4f",
  successBg: "#e3eee5",
  warn: "#a86a1c",
  warnBg: "#f5e8d2",
  info: "#2c5fa8",
  infoBg: "#e0e8f4",
  cold: "#8d8d85",
} as const;

export const NOC_FONT_BODY =
  "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const NOC_FONT_MONO =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export type NocColor = (typeof NOC)[keyof typeof NOC];
