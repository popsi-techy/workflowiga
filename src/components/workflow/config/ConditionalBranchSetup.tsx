"use client";

import { GitBranch } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  MAX_CONDITION_BRANCHES,
  MIN_CONDITION_BRANCHES,
} from "@/lib/workflow/conditional-branch";
import { ConfigInset, ConfigSurface } from "./config-layout";

export function ConditionalBranchSetup({
  pendingCount,
  onPendingCountChange,
  onCreate,
}: {
  pendingCount: number;
  onPendingCountChange: (n: number) => void;
  onCreate: () => void;
}) {
  const options = Array.from(
    { length: MAX_CONDITION_BRANCHES - MIN_CONDITION_BRANCHES + 1 },
    (_, i) => i + MIN_CONDITION_BRANCHES,
  );

  return (
    <ConfigInset className="gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-softer)] text-[var(--accent)]">
          <GitBranch className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--foreground)]">
            How many conditions should this branch evaluate?
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--muted-fg)]">
            Routes are checked top to bottom. An{" "}
            <strong className="font-medium text-[var(--foreground)]">
              Else
            </strong>{" "}
            path is added automatically on the right and exits by default when
            nothing matches.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPendingCountChange(n)}
            className={cn(
              "inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-lg border px-3 text-[13px] font-semibold transition-colors",
              pendingCount === n
                ? "border-[var(--accent)] bg-[var(--accent-softer)] text-[#9A3412]"
                : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--border-strong)]",
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <ConfigSurface className="gap-1.5">
        <p className="text-[11px] font-medium text-[var(--foreground)]">
          Default else path
        </p>
        <p className="text-[11px] text-[var(--muted-fg)]">
          Unmatched requests flow to the right-hand path and end at{" "}
          <span className="font-medium text-[var(--foreground)]">Exit</span>.
          You can change this on the canvas after creating routes.
        </p>
      </ConfigSurface>

      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-9 items-center justify-center self-start rounded-md bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        Create {pendingCount}{" "}
        {pendingCount === 1 ? "condition route" : "condition routes"}
      </button>
    </ConfigInset>
  );
}

export function ConditionalElseSection({
  elseBranchName,
  elseSummary,
}: {
  elseBranchName: string;
  elseSummary: string;
}) {
  return (
    <ConfigInset className="gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-[var(--muted)] text-[var(--muted-fg)]">
          Else
        </span>
        <p className="text-[12px] font-medium text-[var(--foreground)]">
          {elseBranchName}
        </p>
      </div>
      <p className="text-[11px] text-[var(--muted-fg)]">
        Shown as the right-hand path from the condition diamond on the canvas.
      </p>
      <p className="text-[11px] text-[var(--foreground)]">{elseSummary}</p>
    </ConfigInset>
  );
}
