import { cn } from "@/lib/utils";
import { NOC } from "@/lib/noc-theme";

interface KangarooMarkProps {
  className?: string;
}

export function KangarooMark({ className }: KangarooMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-[10px] border text-[1.55rem] leading-none",
        className
      )}
      style={{
        borderColor: NOC.ruleStrong,
        background: NOC.cream,
        boxShadow: `0 8px 22px color-mix(in srgb, ${NOC.ink} 8%, transparent)`,
      }}
      role="img"
      aria-label="MemroOS kangaroo logo"
    >
      <span aria-hidden="true">🦘</span>
    </span>
  );
}
