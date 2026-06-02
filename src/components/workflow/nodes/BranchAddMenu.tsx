"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  Bell,
  Filter as FilterIcon,
  GitFork,
  LogOut,
  ShieldCheck,
  ShieldHalf,
  SkipForward,
  Split,
  ToggleRight,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  defaultBranchExitConfig,
  defaultBranchFilterConfig,
  defaultBranchModuleConfig,
  defaultBranchNotificationConfig,
  defaultNestedConditionalLevel,
  defaultNestedConditionalV2Level,
  defaultNestedMultisplitLevel,
} from "@/lib/workflow/branch-blocks";
import type {
  ApprovalLevelConfig,
  EditorContext,
} from "@/lib/workflow/types";

interface BranchBlockOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  makePreset: () => Partial<ApprovalLevelConfig>;
}

const APPROVAL_LEVEL_OPTION: BranchBlockOption = {
  id: "approval_level",
  label: "Approval Level",
  description: "Request sign-off from an approver",
  icon: ShieldCheck,
  makePreset: () => ({ blockType: "approval_level", name: "Approval Level" }),
};

const ASSIGN_OPTION: BranchBlockOption = {
  id: "assign_entities",
  label: "Assign Entities",
  description: "Provision apps, entitlements and roles",
  icon: AppWindow,
  makePreset: () => ({
    blockType: "assign_entities",
    name: "Assign Entities",
    appIds: [],
    entitlementIds: [],
    techRoleIds: [],
    businessRoleIds: [],
    criteria: { logic: "AND", conditions: [] },
  }),
};

const SOD_OPTION: BranchBlockOption = {
  id: "sod_check",
  label: "SoD Check",
  description: "Run a Segregation-of-Duties check + route results",
  icon: ShieldHalf,
  makePreset: () => ({ blockType: "sod_check", name: "SoD Check" }),
};

const MULTISPLIT_OPTION: BranchBlockOption = {
  id: "approval_split",
  label: "Multisplit",
  description: "Run parallel branches",
  icon: GitFork,
  makePreset: () =>
    defaultNestedMultisplitLevel({ name: "Multisplit Branch" }),
};

const NOTIFICATION_OPTION: BranchBlockOption = {
  id: "notification",
  label: "Notification",
  description: "Send a Slack or email alert",
  icon: Bell,
  makePreset: () => defaultBranchNotificationConfig({ name: "Notification" }),
};

const CONDITIONAL_OPTION: BranchBlockOption = {
  id: "conditional_branch",
  label: "Conditional",
  description: "Branch further on a condition",
  icon: Split,
  makePreset: () =>
    defaultNestedConditionalLevel({
      name: "Conditional",
      globalFallbackType: "Block",
    }),
};

const CONDITIONAL_V2_OPTION: BranchBlockOption = {
  id: "conditional_branch_v2",
  label: "Conditional Type 2",
  description: "Branch on boolean relationship attributes",
  icon: ToggleRight,
  makePreset: () =>
    defaultNestedConditionalV2Level({ name: "Conditional Type 2" }),
};

const EXIT_OPTION: BranchBlockOption = {
  id: "exit",
  label: "Exit",
  description: "End this path",
  icon: LogOut,
  makePreset: () => defaultBranchExitConfig({ name: "Exit" }),
};

const SKIP_OPTION: BranchBlockOption = {
  id: "skip",
  label: "Skip",
  description: "Bypass — continue after the branch",
  icon: SkipForward,
  makePreset: () => ({ blockType: "skip", name: "Skip" }),
};

const FILTER_OPTION: BranchBlockOption = {
  id: "filter",
  label: "User Filter",
  description: "Scope this branch to a user segment",
  icon: FilterIcon,
  makePreset: () => defaultBranchFilterConfig(),
};

const MODULE_OPTION: BranchBlockOption = {
  id: "approval_policy_ref",
  label: "Approval Policy",
  description: "Require sign-off using a saved approval policy",
  icon: ShieldCheck,
  makePreset: () => defaultBranchModuleConfig(),
};

/** Block types offered inside a branch, ordered by relevance to the context.
 *  Approval multisplit branches are restricted to a single approval level.
 *  Workflow multisplit branches additionally offer filters and modules. */
export function branchBlockOptions(
  editorContext: EditorContext,
  options?: { approvalMultisplitOnly?: boolean; workflowMultisplit?: boolean },
): BranchBlockOption[] {
  if (options?.approvalMultisplitOnly) return [APPROVAL_LEVEL_OPTION];
  const primary =
    editorContext === "approval"
      ? [APPROVAL_LEVEL_OPTION, ASSIGN_OPTION]
      : [ASSIGN_OPTION, APPROVAL_LEVEL_OPTION];
  const base = [
    ...primary,
    SOD_OPTION,
    NOTIFICATION_OPTION,
    CONDITIONAL_OPTION,
    CONDITIONAL_V2_OPTION,
    MULTISPLIT_OPTION,
    EXIT_OPTION,
    SKIP_OPTION,
  ];
  if (options?.workflowMultisplit) {
    return [FILTER_OPTION, MODULE_OPTION, ...base];
  }
  return base;
}

export function BranchAddMenu({
  open,
  anchorRect,
  editorContext,
  approvalMultisplitOnly,
  workflowMultisplit,
  onSelect,
  onClose,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  editorContext: EditorContext;
  approvalMultisplitOnly?: boolean;
  workflowMultisplit?: boolean;
  onSelect: (preset: Partial<ApprovalLevelConfig>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !anchorRect) {
      setPosition(null);
      return;
    }
    const width = 260;
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    if (left > maxLeft) left = maxLeft;
    setPosition({ left, top: anchorRect.bottom + 8 });
  }, [open, anchorRect]);

  useLayoutEffect(() => {
    if (!open || !anchorRect || !ref.current || !position) return;
    const h = ref.current.offsetHeight;
    const viewportH = window.innerHeight;
    let top = position.top;
    if (top + h > viewportH - 12) {
      const above = anchorRect.top - h - 8;
      top = above > 12 ? above : Math.max(12, viewportH - h - 12);
    }
    if (top !== position.top) setPosition({ left: position.left, top });
  });

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const t = setTimeout(() => {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !position || typeof document === "undefined") return null;

  const options = branchBlockOptions(editorContext, {
    approvalMultisplitOnly,
    workflowMultisplit,
  });

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Add block to branch"
      style={{ position: "fixed", left: position.left, top: position.top, width: 260 }}
      className="z-50 flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-xl ring-1 ring-black/5"
    >
      <div className="flex shrink-0 items-center gap-1 px-3 pb-1 pt-2">
        <p className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
          Add to branch
        </p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 p-1.5 pt-0">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => {
                onSelect(opt.makePreset());
                onClose();
              }}
              className="group flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-[var(--muted)]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">
                  {opt.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted-fg)]">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
