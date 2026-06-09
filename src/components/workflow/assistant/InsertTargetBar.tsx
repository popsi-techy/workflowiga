"use client";

import { MapPin, RotateCcw } from "lucide-react";
import { describeInsertTarget } from "@/lib/workflow/assistant/insert-target";
import type { AssistantInsertTarget } from "@/lib/workflow/assistant/insert-target";
import type { WorkflowNode } from "@/lib/workflow/types";

interface Props {
  nodes: WorkflowNode[];
  target: AssistantInsertTarget;
  onChangeClick: () => void;
  onReset: () => void;
}

export function InsertTargetBar({
  nodes,
  target,
  onChangeClick,
  onReset,
}: Props) {
  const desc = describeInsertTarget(nodes, target);

  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-[var(--muted)]/15 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onChangeClick}
          title="Choose where to add the next step"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[#eb5424]/5"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eb5424]/10 text-[#eb5424]">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11.5px] font-semibold leading-tight text-[var(--foreground)]">
              {desc.primary}
            </span>
            <span className="block truncate text-[10px] leading-tight text-[var(--muted-fg)]">
              {desc.secondary
                ? `in ${desc.secondary}`
                : "Tap to change · or click a block on the canvas"}
            </span>
          </span>
        </button>

        {!desc.atEnd && (
          <button
            type="button"
            onClick={onReset}
            title="Reset to end of flow"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--muted-fg)] transition-colors hover:border-[#eb5424]/40 hover:text-[var(--foreground)]"
          >
            <RotateCcw className="h-3 w-3" />
            End
          </button>
        )}
      </div>
    </div>
  );
}
