export type SlaLight = "green" | "amber" | "red";

export function slaTrafficLight(
  deadlineIso: string,
  slaSeconds: number,
  status: string,
  now = Date.now()
): SlaLight {
  if (status === "sla_breached") return "red";

  const deadlineMs = new Date(deadlineIso).getTime();
  if (!Number.isFinite(deadlineMs) || deadlineMs <= now) return "red";

  const totalMs = Math.max(1, slaSeconds * 1000);
  const remainingMs = deadlineMs - now;
  return remainingMs / totalMs >= 0.5 ? "green" : "amber";
}
