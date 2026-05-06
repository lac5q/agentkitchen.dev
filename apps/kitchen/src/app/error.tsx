"use client";

import { KitchenFallback } from "@/components/system/kitchen-fallback";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <KitchenFallback
        eyebrow="Kitchen misfire"
        title="A station threw sparks."
        message="Something inside this route failed while Kitchen was still running. Try the route again, or return to the Flow map to inspect system health."
        code="500"
        primaryHref="/flow"
        primaryLabel="Open the Flow"
        secondaryHref="/"
        secondaryLabel="Kitchen Floor"
      />
      <button
        onClick={reset}
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
      >
        Retry this route
      </button>
    </div>
  );
}
