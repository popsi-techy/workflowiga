import { Circle, AlignLeft } from "lucide-react";

export function StartPill() {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--pill-bg)] px-4 text-[13px] font-semibold text-[var(--pill-fg)]">
      <Circle className="h-3.5 w-3.5" strokeWidth={2.5} />
      Start
    </div>
  );
}

export function EndPill() {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--pill-bg)] px-4 text-[13px] font-semibold text-[var(--pill-fg)]">
      <AlignLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      End
    </div>
  );
}
