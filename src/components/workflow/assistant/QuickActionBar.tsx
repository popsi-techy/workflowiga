"use client";

import {
  Bell,
  GitBranch,
  ListChecks,
  SkipForward,
  Split,
} from "lucide-react";
import type { QuickActionId } from "@/lib/workflow/assistant/types";

const ACTIONS: {
  id: QuickActionId;
  label: string;
  icon: typeof ListChecks;
}[] = [
  { id: "add_approval", label: "Add approval", icon: ListChecks },
  { id: "add_condition", label: "Add condition", icon: Split },
  { id: "add_notification", label: "Add notification", icon: Bell },
  { id: "add_skip", label: "Add skip step", icon: SkipForward },
  { id: "create_branch", label: "Create branch", icon: GitBranch },
];

interface Props {
  onAction: (id: QuickActionId) => void;
}

export function QuickActionBar({ onAction }: Props) {
  return (
    <div className="shrink-0 border-t border-[var(--border)] bg-white px-2 py-2">
      <div className="flex flex-wrap gap-1">
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onAction(id)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 text-[10.5px] font-medium text-[var(--foreground)] transition-colors hover:border-[#eb5424]/40 hover:bg-[#eb5424]/5"
          >
            <Icon className="h-3 w-3 text-[#eb5424]" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
