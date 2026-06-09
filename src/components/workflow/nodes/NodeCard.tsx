"use client";

import { Fragment, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Trash2, CheckCircle2, AlertCircle, Users, Clock, Mail, ShieldHalf, ShieldCheck, GitFork, Plus, X, SkipForward, Split, LogOut, ListChecks, Bell, Scale, Filter as FilterIcon, ToggleRight, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import { NODE_META } from "@/lib/workflow/icons";
import {
  paletteCardLeftBorderClass,
  paletteCardSelectionClass,
  paletteCategoryForBranchLevel,
  paletteCategoryForNode,
  paletteIconTileClass,
  palettePillSelectionClass,
} from "@/lib/workflow/palette-tones";
import { APPS, ATTRIBUTES, CONDITIONAL_ATTRIBUTES, APPROVAL_CONDITIONAL_ATTRIBUTES, getApp, OPERATORS } from "@/lib/workflow/mock-data";
import {
  branchSplitValuesComplete,
  formatBranchSplitSummary,
  getBranchAttributeValues,
  getSplitAttributeIds,
} from "@/lib/workflow/split-by-attribute";
import { isApprovalPolicyEvent, APPROVAL_POLICY_EVENT_NAME } from "@/lib/workflow/approval-policy";
import {
  branchHasRoutingCondition,
  routingBranchKeyword,
} from "@/lib/workflow/routing-branch";
import {
  branchNotificationSummary,
  isBranchFilterConfigured,
  isBranchFilterLevel,
  isBranchModuleLevel,
  isBranchNotificationConfigured,
} from "@/lib/workflow/branch-blocks";
import { sodCheckSubtitle } from "@/components/workflow/config/SodCheckConfig";
import { BranchAddMenu } from "./BranchAddMenu";
import {
  splitBranchLayout,
  maxConditionalNodeWidth,
  branchColumnWidth,
} from "@/lib/workflow/branch-column-layout";
import {
  getConditionBranches,
  getConditionBranchesFromContainer,
  isConditionalSetupComplete,
  resolveElseEnabled,
} from "@/lib/workflow/conditional-branch";
import { branchIdForAttrCase, BOOLEAN_CASE_LABELS } from "@/lib/workflow/boolean-branch";
import {
  formatApprovalConditionRule,
  formatConditionValue,
  getApprovalV2AttributeLabel,
  normalizeBooleanCaseValue,
} from "@/lib/workflow/approval-conditional-v2";
import { separableOutcomes } from "@/lib/workflow/decision-outcomes";
import {
  hasInlineDecision,
  isNestedFlowLevel,
} from "@/lib/workflow/branch-decision";
import {
  approvalLevelApproverCount,
  approvalLevelCompletionSummary,
} from "@/lib/workflow/approval-level-completion";
import { isMultisplitDecisionLevel } from "@/lib/workflow/multisplit-decision";
import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ConditionalBranchData,
  ApprovalPolicyData,
  ApprovalPolicyRefData,
  EventData,
  FilterData,
  TaskData,
  WorkflowNode,
  ViewMode,
} from "@/lib/workflow/types";

interface NodeCardProps {
  node: WorkflowNode;
}

export function NodeCard({ node }: NodeCardProps) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const resetWorkflow = useWorkflowStore((s) => s.resetWorkflow);
  const requestConfirm = useWorkflowStore((s) => s.requestConfirm);
  const nodes = useWorkflowStore((s) => s.nodes);
  const view = useWorkflowStore((s) => s.view);

  const meta = NODE_META[node.kind];
  const Icon = meta.icon;
  const selected = selectedId === node.id;
  const isEvent = node.kind === "event";
  const isTask = node.kind === "task";

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    selectNode(node.id);
  }

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isApprovalPolicyEvent(node)) return;
    if (isEvent) {
      const dependents = nodes.filter((n) => n.id !== node.id);
      if (dependents.length > 0) {
        const labels = dependents
          .map((d) => NODE_META[d.kind].label)
          .join(" and ");
        requestConfirm({
          title: "Remove the Event?",
          message: `Removing the Event will also remove the ${labels}. All workflow progress will be lost.`,
          confirmLabel: "Remove all",
          tone: "danger",
          onConfirm: () => resetWorkflow(),
        });
        return;
      }
    }
    if (node.status === "configured") {
      requestConfirm({
        title: `Remove this ${meta.label.toLowerCase()}?`,
        message:
          "This is a configured node. Its settings will be discarded if you continue.",
        confirmLabel: "Remove",
        tone: "danger",
        onConfirm: () => removeNode(node.id),
      });
      return;
    }
    removeNode(node.id);
  }

  const taskType = isTask ? (node.data as AnyTaskData).taskType : undefined;
  const CardIcon =
    taskType === "approval_policy_ref"
      ? ShieldCheck
      : taskType === "exit"
        ? LogOut
        : taskType === "notification"
          ? Bell
          : taskType === "sod_check"
            ? Scale
            : taskType === "conditional_branch_v2"
              ? ToggleRight
              : Icon;
  const isModuleRef = taskType === "approval_policy_ref";
  const isExitTask = taskType === "exit";
  const isNotification = taskType === "notification";
  const isSodCheck = taskType === "sod_check";
  if (taskType === "conditional_branch") {
    return (
      <SplitBranchesFlow
        mode="node"
        node={node}
        data={node.data as ConditionalBranchData}
        view={view}
        conditional={true}
      />
    );
  }
  if (taskType === "conditional_branch_v2") {
    return (
      <ConditionalBranchV2Flow
        mode="node"
        node={node}
        data={node.data as import("@/lib/workflow/types").ConditionalBranchV2Data}
        view={view}
      />
    );
  }
  if (taskType === "approval_split") {
    const splitData = node.data as ApprovalSplitData;
    return (
      <SplitBranchesFlow
        mode="node"
        node={node}
        data={splitData}
        view={view}
        conditional={false}
      />
    );
  }
  if (taskType === "exit") {
    return <ExitPill node={node} />;
  }
  if (taskType === "skip") {
    return <SkipPill node={node} />;
  }

  const category = paletteCategoryForNode(node);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectNode(node.id);
        }
      }}
      className={cn(
        "node-enter group relative w-[460px] cursor-pointer overflow-hidden rounded-xl border bg-white text-left transition-[border-color,box-shadow,transform] duration-150 ease-out",
        paletteCardLeftBorderClass(category),
        selected
          ? cn(
              "shadow-[var(--shadow-card-hover)]",
              paletteCardSelectionClass(category, true),
            )
          : "border-[var(--border)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      {/* ── Criteria banner (assign-entities task cards only) ──────────── */}
      {isTask && (node.data as AnyTaskData).taskType !== "approval_level" && (node.data as AnyTaskData).taskType !== "approval_split" && !isModuleRef && !isExitTask && !isNotification && !isSodCheck && (
        <TaskCriteriaBanner
          data={node.data as TaskData}
          detailed={view === "detailed"}
        />
      )}

      <div className="relative flex items-start gap-3 px-4 py-3.5 pr-11">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            paletteIconTileClass(category),
          )}
        >
          <CardIcon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-[var(--foreground)]">
              {nodeTitle(node)}
            </h3>
            <StatusChip status={node.status} />
          </div>
          <p className="mt-1 truncate text-[12px] leading-snug text-[var(--muted-fg)]">
            {nodeSubtitle(node)}
          </p>
          {isTask && (node.data as AnyTaskData).taskType === "approval_level" && (
            <ApprovalMetaPills data={node.data as ApprovalLevelData} />
          )}
          {view === "detailed" && node.kind === "task" && (node.data as AnyTaskData).taskType !== "approval_level" && (node.data as AnyTaskData).taskType !== "approval_split" && !isModuleRef && !isExitTask && !isNotification && (
            <TaskSummaryChips data={node.data as TaskData} />
          )}
          {view === "detailed" && node.kind === "filter" && (
            <FilterSummaryChips data={node.data as FilterData} />
          )}
        </div>

        {!isApprovalPolicyEvent(node) && (
          <div
            className={cn(
              "absolute right-3 top-3.5 transition-opacity",
              selected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <IconBtn label="Delete" icon={Trash2} onClick={onDelete} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Criteria banner ───────────────────────────────────────────────────────────
// Shows the task's own criteria (data.criteria.conditions) at the top of every
// task card:
//   0 conditions  → "For all users"
//   1 condition   → that one chip
//   2+ conditions → first chip + "+N more" badge
// In detailed view all chips are shown.

function TaskCriteriaBanner({
  data,
  detailed,
}: {
  data: TaskData;
  detailed: boolean;
}) {
  const valid = data.criteria.conditions.filter(
    (c) => c.attribute && c.value,
  );
  const count = valid.length;

  // How many condition chips to show inline.
  const visibleChips = detailed ? valid : valid.slice(0, 1);
  const overflow = detailed ? 0 : Math.max(0, count - 1);

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2">
      {/* Label */}
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-fg)]">
        Criteria
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {/* Case 1: no criteria */}
        {count === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <Users className="h-3 w-3" />
            No additional task-level criteria.
          </span>
        )}

        {/* Case 2 / 3: one or more criteria */}
        {count > 0 && (
          <>
            {visibleChips.map((c) => {
              const attr = ATTRIBUTES.find((a) => a.value === c.attribute);
              const val = Array.isArray(c.value)
                ? c.value.join(", ")
                : c.value;
              return (
                <span
                  key={c.id}
                  className="inline-flex h-5 max-w-[200px] items-center gap-1 rounded-md bg-white px-2 text-[10.5px] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                >
                  <strong className="font-semibold shrink-0">
                    {attr?.label ?? c.attribute}
                  </strong>
                  <span className="mx-0.5 text-[var(--muted-fg)]">=</span>
                  <span className="truncate">{val}</span>
                </span>
              );
            })}
            {overflow > 0 && (
              <span className="inline-flex h-5 items-center rounded-full bg-[var(--muted)] px-2 text-[10.5px] font-medium text-[var(--muted-fg)]">
                +{overflow}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Node title / subtitle helpers ─────────────────────────────────────────────

function nodeTitle(node: WorkflowNode): string {
  if (node.kind === "event") {
    const d = node.data as EventData | ApprovalPolicyData;
    if (d.type === "approval_policy") {
      const ap = d as ApprovalPolicyData;
      return ap.name?.trim() || APPROVAL_POLICY_EVENT_NAME;
    }
    return `${capitalize((d as EventData).type)} Event`;
  }
  if (node.kind === "filter") return "User Filter";
  // task
  const td = node.data as AnyTaskData;
  if (td.taskType === "approval_level") return (td as ApprovalLevelData).name || "Approval Level";
  if (td.taskType === "approval_split") return (td as ApprovalSplitData).name || "Multisplit Branch";
  if (td.taskType === "conditional_branch") return (td as ConditionalBranchData).name || "Conditional Branch";
  if (td.taskType === "conditional_branch_v2") return (td as import("@/lib/workflow/types").ConditionalBranchV2Data).name || "Conditional Type 2";
  if (td.taskType === "approval_policy_ref") return (td as ApprovalPolicyRefData).name || "Approval Policy";
  if (td.taskType === "exit") return (td as import("@/lib/workflow/types").ExitData).name || "Exit";
  if (td.taskType === "notification") return (td as import("@/lib/workflow/types").NotificationData).name || "Notification";
  if (td.taskType === "sod_check") return (td as import("@/lib/workflow/types").SodCheckData).name || "SoD Check";
  return "Assign Entities";
}

function nodeSubtitle(node: WorkflowNode): string {
  if (node.kind === "event") {
    const d = node.data as EventData | ApprovalPolicyData;
    const userDesc = d.description?.trim();
    if (userDesc) return userDesc;
    return "Add description";
  }
  if (node.kind === "filter") {
    const d = node.data as FilterData;
    const count = d.conditions.filter((c) => c.attribute && c.value).length;
    if (count === 0) return "No conditions configured";
    return `${count} ${count === 1 ? "condition" : "conditions"} · ${d.logic}`;
  }
  // task
  const td = node.data as AnyTaskData;
  if (td.taskType === "approval_level") {
    const ld = td as ApprovalLevelData;
    if (!ld.approverType) return "No approver configured";
    const base = `Approver · ${ld.approverType}`;
    const completion = approvalLevelCompletionSummary(
      ld.completionMode,
      approvalLevelApproverCount(ld),
      ld.threshold,
    );
    return `${base} · ${completion}`;
  }
  if (td.taskType === "approval_split") {
    const sd = td as ApprovalSplitData;
    const modeLabel =
      sd.completionMode === "all"
        ? "All branches must approve"
        : sd.completionMode === "any"
          ? "Any branch approves"
          : sd.completionMode === "majority"
            ? "Majority of branches must approve"
            : `${sd.threshold} of ${sd.branches.length} branches must approve`;
    return `${sd.branches.length} branches · ${modeLabel}`;
  }
  if (td.taskType === "conditional_branch") {
    const cd = td as ConditionalBranchData;
    if (!isConditionalSetupComplete(cd)) {
      return "Choose how many conditions to evaluate";
    }
    const count = getConditionBranchesFromContainer(cd).length;
    const elseNote = resolveElseEnabled(cd) ? " · else path on the right" : "";
    return `${count} ${count === 1 ? "condition" : "conditions"}${elseNote}`;
  }
  if (td.taskType === "conditional_branch_v2") {
    const cd = td as import("@/lib/workflow/types").ConditionalBranchV2Data;
    if (cd.selectedAttributes.length === 0) return "Select relationship conditions to branch on";
    const condBranches = cd.elseEnabled ? cd.branches.length - 1 : cd.branches.length;
    const elseNote = cd.elseEnabled ? " · else path" : "";
    return `${cd.selectedAttributes.length} ${cd.selectedAttributes.length === 1 ? "attribute" : "attributes"} · ${condBranches} ${condBranches === 1 ? "branch" : "branches"}${elseNote}`;
  }
  if (td.taskType === "approval_policy_ref") {
    const rd = td as ApprovalPolicyRefData;
    if (!rd.policyId) return "No approval policy selected";
    const policy = useWorkflowStore
      .getState()
      .policies.find((p) => p.id === rd.policyId);
    return policy ? `Linked · ${policy.name}` : "Linked policy not found";
  }
  if (td.taskType === "exit") {
    return "Ends the flow";
  }
  if (td.taskType === "notification") {
    const nd = td as import("@/lib/workflow/types").NotificationData;
    if (!nd.channels.length) return "No channel selected";
    return `Sends via ${nd.channels.map((c) => (c === "slack" ? "Slack" : "Email")).join(", ")}`;
  }
  if (td.taskType === "sod_check") {
    return sodCheckSubtitle(td as import("@/lib/workflow/types").SodCheckData);
  }
  const d = td as TaskData;
  const parts: string[] = [];
  if (d.appIds?.length) parts.push(`${d.appIds.length} apps`);
  if (d.entitlementIds?.length) parts.push(`${d.entitlementIds.length} entitlements`);
  if (d.techRoleIds?.length) parts.push(`${d.techRoleIds.length} tech roles`);
  if (d.businessRoleIds?.length) parts.push(`${d.businessRoleIds.length} business roles`);
  if (parts.length === 0) return "Nothing selected yet";
  return parts.join(" · ");
}

// ── Detailed-view chip rows ───────────────────────────────────────────────────

function TaskSummaryChips({ data }: { data: TaskData }) {
  const chips: { label: string; tone?: "muted" }[] = [
    { label: `${data.appIds.length} Apps` },
    { label: `${data.entitlementIds.length} Entitlements` },
    { label: `${data.techRoleIds.length} Tech Roles` },
    { label: `${data.businessRoleIds.length} Business Roles` },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
            c.tone === "muted"
              ? "bg-[var(--muted)] text-[var(--muted-fg)]"
              : "bg-[var(--accent-softer)] text-[#9A3412]",
          )}
        >
          {c.label}
        </span>
      ))}
      {data.appIds.length > 0 && (
        <div className="mt-1 flex w-full items-center gap-1">
          {data.appIds.slice(0, 5).map((id) => {
            const app = getApp(id);
            if (!app) return null;
            return (
              <span
                key={id}
                title={app.name}
                className="inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-semibold text-white"
                style={{ backgroundColor: app.color }}
              >
                {app.initials}
              </span>
            );
          })}
          {data.appIds.length > 5 && (
            <span className="text-[11px] text-[var(--muted-fg)]">
              +{data.appIds.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSummaryChips({ data }: { data: FilterData }) {
  const valid = data.conditions.filter((c) => c.attribute && c.value);
  if (valid.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {valid.slice(0, 3).map((c) => {
        const attr = ATTRIBUTES.find((a) => a.value === c.attribute);
        return (
          <span
            key={c.id}
            className="inline-flex h-5 items-center rounded-full bg-[var(--muted)] px-2 text-[11px] text-[var(--foreground)]"
          >
            {attr?.label ?? c.attribute} ={" "}
            {Array.isArray(c.value) ? c.value.join(", ") : c.value}
          </span>
        );
      })}
      {valid.length > 3 && (
        <span className="text-[11px] text-[var(--muted-fg)]">
          +{valid.length - 3} more
        </span>
      )}
    </div>
  );
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function StatusChip({ status }: { status: WorkflowNode["status"] }) {
  if (status === "configured") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-50 px-2 text-[10.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <CheckCircle2 className="h-3 w-3" />
        Configured
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-red-50 px-2 text-[10.5px] font-medium text-red-700 ring-1 ring-inset ring-red-200/70">
        <AlertCircle className="h-3 w-3" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-amber-50 px-2 text-[10.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200/70">
      <AlertCircle className="h-3 w-3" />
      Incomplete
    </span>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Approver-level config shape that may carry override flags + id. */
type LevelLike = Partial<ApprovalLevelConfig> & {
  approverType?: ApprovalLevelData["approverType"];
  fallbackType?: ApprovalLevelData["fallbackType"];
  fallbackEmail?: string;
  slaEnabled?: boolean;
  slaDuration?: number;
  slaDurationUnit?: "hours" | "days";
  overrideFallback?: boolean;
  overrideSla?: boolean;
  notifyApproverOnAssignment?: boolean;
  assignmentNotifyChannels?: import("@/lib/workflow/types").NotificationChannel[];
  completionMode?: ApprovalLevelData["completionMode"];
  threshold?: number;
  approverRefs?: string[];
  id?: string;
};

/** Resolves the effective fallback + SLA labels for an approval level,
 *  honouring inheritance from a parent multisplit's global rules. */
function resolveApprovalMeta(
  data: LevelLike,
  parentSplitData?: ApprovalSplitData,
) {
  const inheritFallback = !!parentSplitData && !data.overrideFallback;

  const fallbackType = inheritFallback
    ? parentSplitData!.globalFallbackType
    : data.fallbackType;
  const fallbackEmail = inheritFallback
    ? parentSplitData!.globalFallbackEmail
    : data.fallbackEmail;

  const fallbackLabel = fallbackType
    ? fallbackType === "Add fallback email"
      ? fallbackEmail || "Fallback email"
      : fallbackType
    : null;
  // SLA is now per-approver, driven by its "No Action / SLA Breached" outcome.
  const slaLabel = data.slaEnabled ? `${data.slaDuration} ${data.slaDurationUnit}` : null;

  return {
    fallbackLabel,
    slaLabel,
    fallbackInherited: inheritFallback && !!fallbackLabel,
    slaInherited: false,
  };
}

/** Compact pill row showing an approval level's fallback + SLA meta. */
function ApprovalMetaPills({
  data,
}: {
  data: LevelLike;
}) {
  const parentMultisplitData = useWorkflowStore((s) => {
    const found = s.nodes.find(
      (n) =>
        n.kind === "task" &&
        (n.data as AnyTaskData).taskType === "approval_split" &&
        (n.data as ApprovalSplitData).branches.some((b) =>
          b.levels.some((l) => l.id === data.id),
        ),
    );
    return found?.data as ApprovalSplitData | undefined;
  });

  const { fallbackLabel, slaLabel, fallbackInherited, slaInherited } =
    resolveApprovalMeta(data, parentMultisplitData);

  const assignAlert =
    data.notifyApproverOnAssignment &&
    (data.assignmentNotifyChannels?.length ?? 0) > 0
      ? `Alerts: ${data.assignmentNotifyChannels!
          .map((c) => (c === "slack" ? "Slack" : "Email"))
          .join(" + ")}`
      : null;

  const completionLabel = approvalLevelCompletionSummary(
    data.completionMode,
    approvalLevelApproverCount(data as ApprovalLevelData),
    data.threshold,
  );

  if (!fallbackLabel && !slaLabel && !assignAlert && !completionLabel) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {completionLabel && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-violet-50 px-2 text-[10.5px] font-medium text-violet-800">
          <Users className="h-2.5 w-2.5" />
          {completionLabel}
        </span>
      )}
      {assignAlert && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-sky-50 px-2 text-[10.5px] font-medium text-sky-700">
          <Bell className="h-3 w-3" />
          {assignAlert}
        </span>
      )}
      {fallbackLabel && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[var(--muted)] px-2 text-[10.5px] font-medium text-[var(--muted-fg)]">
          <Mail className="h-2.5 w-2.5" />
          {fallbackLabel}
          {fallbackInherited && (
            <span className="text-[9px] uppercase tracking-wide opacity-70">
              inherited
            </span>
          )}
        </span>
      )}
      {slaLabel && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-amber-50 px-2 text-[10.5px] font-medium text-amber-700">
          <Clock className="h-2.5 w-2.5" />
          SLA {slaLabel}
          {slaInherited && (
            <span className="text-[9px] uppercase tracking-wide opacity-70">
              inherited
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/** Compact terminal "Exit" pill — styled like the branch rule handles. */
function ExitPill({ node }: { node: WorkflowNode }) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const selected = selectedId === node.id;

  return (
    <div className="flex w-full flex-col items-center select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          selectNode(node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(node.id);
          }
        }}
        className={cn(
          "group relative flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md",
          palettePillSelectionClass("rules", selected),
        )}
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Exit</span>
        <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-fg)]">
          Ends flow
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeNode(node.id);
          }}
          className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Compact "Skip" pill — bypasses this route; the flow continues after. */
function SkipPill({ node }: { node: WorkflowNode }) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const selected = selectedId === node.id;
  return (
    <div className="flex w-full flex-col items-center select-none">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          selectNode(node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(node.id);
          }
        }}
        className={cn(
          "group relative flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md",
          palettePillSelectionClass("rules", selected),
        )}
      >
        <SkipForward className="h-3.5 w-3.5" />
        <span>Skip</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeNode(node.id);
          }}
          className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

type SplitBranchesFlowProps =
  | {
      mode: "node";
      node: WorkflowNode;
      data: ApprovalSplitData | ConditionalBranchData | import("@/lib/workflow/types").ConditionalBranchV2Data;
      view: ViewMode;
      conditional?: boolean;
    }
  | {
      mode: "embedded";
      parentNodeId: string;
      hostLevelId: string;
      data: import("@/lib/workflow/types").EmbeddedConditionalData;
      view: ViewMode;
      onRemove?: () => void;
    };

function SplitBranchesFlow(props: SplitBranchesFlowProps) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const editorContext = useWorkflowStore((s) => s.editorContext);

  const isEmbedded = props.mode === "embedded";
  const branches = props.data.branches;
  // Decision blocks hide their catch-all ELSE once every outcome has its own
  // route — nothing can fall through, so the "All other requests" branch is noise.
  const decisionKind = (
    props.data as import("@/lib/workflow/types").DecisionLike
  ).decisionKind;
  const allOutcomesCovered =
    !!decisionKind && separableOutcomes(props.data).length === 0;
  const hasElseEnabled = resolveElseEnabled(
    props.data as import("@/lib/workflow/types").ConditionalBranchData,
  );
  const renderBranches = decisionKind
    ? !hasElseEnabled || allOutcomesCovered
      ? getConditionBranches(branches, hasElseEnabled)
      : branches
    : hasElseEnabled
      ? branches
      : getConditionBranches(branches, false);
  const flowName = props.data.name;
  const conditional = isEmbedded
    ? props.data.splitKind !== "multisplit"
    : !!props.conditional;
  const hasElseBranch =
    conditional &&
    !decisionKind &&
    resolveElseEnabled(props.data as import("@/lib/workflow/types").ConditionalBranchData);
  // Approval multisplit branches hold a single approval level and nothing
  // else; their outcome is the combined decision below the whole multisplit.
  const multisplitBranch = !conditional && editorContext === "approval";
  const workflowMultisplitBranch = !conditional && editorContext === "workflow";
  const anchorId = isEmbedded ? props.hostLevelId : props.node.id;
  const branchLineNodeId = isEmbedded ? props.parentNodeId : props.node.id;
  const embeddedHostLevelId = isEmbedded ? props.hostLevelId : undefined;
  const selected = selectedId === anchorId;
  const HandleIcon = conditional ? Split : GitFork;
  const handleLabel = conditional ? "Conditional Branch" : "Multisplit Branch";
  const splitCategory = "rules" as const;

  function setBranches(
    next: import("@/lib/workflow/types").SplitBranchData[],
  ) {
    if (isEmbedded) {
      updateNode(props.hostLevelId, {
        embeddedConditional: { ...props.data, branches: next },
      } as unknown as Partial<WorkflowNode["data"]>);
    } else {
      updateNode(props.node.id, {
        branches: next,
      } as Partial<ApprovalSplitData>);
    }
  }

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    selectNode(anchorId);
  }

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (props.mode === "embedded") {
      const remove = props.onRemove;
      if (!remove) return;
      const hasContent = branches.some(
        (b) =>
          (b.condition?.conditions?.length ?? 0) > 0 || b.levels.length > 0,
      );
      if (hasContent) {
        useWorkflowStore.getState().requestConfirm({
          title: "Remove this nested conditional?",
          message:
            "This nested conditional has configured branches. Its settings will be discarded if you continue.",
          confirmLabel: "Remove",
          tone: "danger",
          onConfirm: remove,
        });
        return;
      }
      remove();
      return;
    }
    const node = props.node;
    if (node.status === "configured") {
      useWorkflowStore.getState().requestConfirm({
        title: `Remove this ${conditional ? "conditional branch" : "multisplit"}?`,
        message: "This is a configured node. Its settings will be discarded if you continue.",
        confirmLabel: "Remove",
        tone: "danger",
        onConfirm: () => removeNode(node.id),
      });
      return;
    }
    removeNode(node.id);
  }

  function removeLevelFromBranch(branchId: string, levelId: string) {
    const pruneLevels = (
      levels: import("@/lib/workflow/types").ApprovalLevelConfig[],
    ): import("@/lib/workflow/types").ApprovalLevelConfig[] =>
      levels
        .filter((l) => l.id !== levelId)
        .map((l) => {
          if (!l.embeddedConditional) {
            return l;
          }
          return {
            ...l,
            embeddedConditional: {
              ...l.embeddedConditional,
              branches: l.embeddedConditional.branches.map((eb) => ({
                ...eb,
                levels: pruneLevels(eb.levels),
              })),
            },
          };
        });

    setBranches(
      branches.map((b) => ({
        ...b,
        levels: pruneLevels(b.levels),
      })),
    );
  }

  const view = props.view;
  const { widths, total: canvasW, centers, centerX } =
    splitBranchLayout(renderBranches);
  const stemH = 24;
  const splitH = 40;
  const connH = stemH + splitH;
  const ySplit = stemH + splitH / 2;
  const yMerge = splitH / 2;
  const connR = 12;

  // A branch that ends in an Exit terminates — it draws no line down to the
  // merge point. If every branch exits, the whole flow dead-ends (no merge).
  const branchEndsWithExit = (
    branch: import("@/lib/workflow/types").SplitBranchData,
  ) => {
    const ls = branch.levels;
    return ls.length > 0 && ls[ls.length - 1].blockType === "exit";
  };
  const continuingIdxs = renderBranches
    .map((b, i) => (branchEndsWithExit(b) ? -1 : i))
    .filter((i) => i >= 0);
  const anyBranchMerges = continuingIdxs.length > 0;
  // When a single branch continues (the rest exit), make it the straight spine:
  // anchor the split/merge lines on that branch's center and shift the whole
  // branch group so it lines up under the handle and the downstream flow.
  const spineX =
    continuingIdxs.length === 1 ? centers[continuingIdxs[0]]! : centerX;
  const spineShiftX = centerX - spineX;

  const flowBody = (
    <>
      {/* T-junction handle badge */}
      <div className="relative flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          onClick={onCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectNode(anchorId);
            }
          }}
          className={cn(
            "group relative flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all",
            !isEmbedded && "hover:scale-105 hover:shadow-md",
            palettePillSelectionClass(splitCategory, selected),
          )}
        >
          <HandleIcon className="h-3.5 w-3.5" />
          <span>{flowName || handleLabel}</span>
          <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-fg)] font-medium">
            {renderBranches.length}
          </span>

          {(!isEmbedded || props.mode === "embedded" && !!props.onRemove) && (
            <button
              type="button"
              onClick={onDelete}
              className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Stem + split connectors (single SVG so lines meet with no gap) */}
      <div
        className="relative shrink-0"
        style={{
          width: canvasW,
          transform: spineShiftX ? `translateX(${spineShiftX}px)` : undefined,
        }}
      >
        <svg
          width={canvasW}
          height={connH}
          viewBox={`0 0 ${canvasW} ${connH}`}
          fill="none"
          className="block"
        >
          <line
            x1={spineX}
            y1={0}
            x2={spineX}
            y2={ySplit}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          {renderBranches.map((branch, idx) => {
            const x = centers[idx]!;
            const branchKey = `${branch.id}-${idx}`;
            if (x < spineX) {
              return (
                <path
                  key={branchKey}
                  d={`M ${spineX} ${ySplit} L ${x + connR} ${ySplit} Q ${x} ${ySplit} ${x} ${ySplit + connR} L ${x} ${connH}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            if (x > spineX) {
              return (
                <path
                  key={branchKey}
                  d={`M ${spineX} ${ySplit} L ${x - connR} ${ySplit} Q ${x} ${ySplit} ${x} ${ySplit + connR} L ${x} ${connH}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            return (
              <path
                key={branchKey}
                d={`M ${spineX} ${ySplit} L ${spineX} ${connH}`}
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                fill="none"
              />
            );
          })}
        </svg>

        {/* Branch lines + cards */}
        <div className="flex items-stretch" style={{ width: canvasW }}>
          {renderBranches.map((branch, branchIndex) => {
            return (
              <div
                key={`${branch.id}-${branchIndex}`}
                className="flex flex-col items-center animate-fade-in self-stretch"
                style={{
                  width: widths[branchIndex],
                  maxWidth: widths[branchIndex],
                }}
              >
                {/* Condition header (conditional branches only) */}
                {conditional && (
                  <BranchConditionChip
                    branch={branch}
                    branchIndex={branchIndex}
                    totalBranches={renderBranches.length}
                    hasElseBranch={hasElseBranch}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNode(anchorId);
                    }}
                  />
                )}
                {/* Attribute-value header (multisplit "split by attribute") */}
                {!conditional &&
                  !isEmbedded &&
                  getSplitAttributeIds(props.data as ApprovalSplitData).length >
                    0 && (
                  <BranchSplitChip
                    attrIds={getSplitAttributeIds(
                      props.data as ApprovalSplitData,
                    )}
                    branch={branch}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNode(anchorId);
                    }}
                  />
                )}
                {/* Branch line with inline cards */}
                <BranchLine
                  nodeId={branchLineNodeId}
                  branch={branch}
                  embeddedHostLevelId={embeddedHostLevelId}
                  onRemoveLevel={(levelId) =>
                    removeLevelFromBranch(branch.id, levelId)
                  }
                  view={view}
                  multisplitBranch={multisplitBranch}
                  workflowMultisplitBranch={workflowMultisplitBranch}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom merge SVG */}
        <svg
          width={canvasW}
          height={splitH}
          viewBox={`0 0 ${canvasW} ${splitH}`}
          fill="none"
          className="block"
        >
          {renderBranches.map((branch, idx) => {
            // Exit-terminated branches don't draw a merge path.
            if (branchEndsWithExit(branch)) return null;
            const x = centers[idx]!;
            const branchKey = `${branch.id}-${idx}`;
            if (x < spineX) {
              return (
                <path
                  key={branchKey}
                  d={`M ${x} 0 L ${x} ${yMerge - connR} Q ${x} ${yMerge} ${x + connR} ${yMerge} L ${spineX} ${yMerge}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            if (x > spineX) {
              return (
                <path
                  key={branchKey}
                  d={`M ${x} 0 L ${x} ${yMerge - connR} Q ${x} ${yMerge} ${x - connR} ${yMerge} L ${spineX} ${yMerge}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            return (
              <path
                key={branchKey}
                d={`M ${spineX} 0 L ${spineX} ${yMerge}`}
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                fill="none"
              />
            );
          })}
          {anyBranchMerges && (
            <line
              x1={spineX}
              y1={yMerge}
              x2={spineX}
              y2={splitH}
              stroke="var(--border-strong)"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </>
  );

  if (isEmbedded) {
    return (
      <div
        className={cn(
          "w-full overflow-visible py-1",
          selected && "rounded-lg ring-2 ring-[var(--accent-soft)]",
        )}
        style={{ width: canvasW, maxWidth: canvasW }}
      >
        <div className="flex flex-col items-center select-none leading-none">
          {flowBody}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full select-none leading-none">
      <div className="w-px h-6 bg-[var(--border-strong)]" />
      {flowBody}
    </div>
  );
}

type ConditionalBranchV2FlowProps =
  | {
      mode: "node";
      node: WorkflowNode;
      data: import("@/lib/workflow/types").ConditionalBranchV2Data;
      view: ViewMode;
    }
  | {
      mode: "embedded";
      parentNodeId: string;
      hostLevelId: string;
      data: import("@/lib/workflow/types").EmbeddedConditionalData;
      view: ViewMode;
      onRemove?: () => void;
    };

function ConditionalBranchV2Flow(props: ConditionalBranchV2FlowProps) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNode = useWorkflowStore((s) => s.updateNode);

  const isEmbedded = props.mode === "embedded";
  const data = props.data;
  const view = props.view;
  const anchorId = isEmbedded ? props.hostLevelId : props.node.id;
  const branchLineNodeId = isEmbedded ? props.parentNodeId : props.node.id;
  const embeddedHostLevelId = isEmbedded ? props.hostLevelId : undefined;

  const selected = selectedId === anchorId;
  const splitCategory = "rules" as const;

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    selectNode(anchorId);
  }

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isEmbedded) {
      const remove = props.onRemove;
      if (!remove) return;
      const hasContent = data.branches.some((b) => b.levels.length > 0);
      if (hasContent) {
        useWorkflowStore.getState().requestConfirm({
          title: "Remove this nested conditional?",
          message: "This nested conditional has configured branches. Its settings will be discarded if you continue.",
          confirmLabel: "Remove",
          tone: "danger",
          onConfirm: () => remove(),
        });
        return;
      }
      remove();
    } else {
      if (props.node.status === "configured") {
        useWorkflowStore.getState().requestConfirm({
          title: "Remove this conditional branch?",
          message: "This is a configured node. Its settings will be discarded if you continue.",
          confirmLabel: "Remove",
          tone: "danger",
          onConfirm: () => removeNode(props.node.id),
        });
        return;
      }
      removeNode(props.node.id);
    }
  }

  function removeLevelFromBranch(branchId: string, levelId: string) {
    const pruneLevels = (
      levels: import("@/lib/workflow/types").ApprovalLevelConfig[],
    ): import("@/lib/workflow/types").ApprovalLevelConfig[] =>
      levels
        .filter((l) => l.id !== levelId)
        .map((l) => {
          if (!l.embeddedConditional) {
            return l;
          }
          return {
            ...l,
            embeddedConditional: {
              ...l.embeddedConditional,
              branches: l.embeddedConditional.branches.map((eb) => ({
                ...eb,
                levels: pruneLevels(eb.levels),
              })),
            },
          };
        });

    const next = data.branches.map((b) => ({
      ...b,
      levels: pruneLevels(b.levels),
    }));

    if (isEmbedded) {
      updateNode(props.hostLevelId, {
        embeddedConditional: { ...props.data, branches: next },
      } as unknown as Partial<WorkflowNode["data"]>);
    } else {
      updateNode(props.node.id, {
        branches: next,
      } as Partial<import("@/lib/workflow/types").ConditionalBranchV2Data>);
    }
  }

  const branchEndsWithExit = (
    branch: import("@/lib/workflow/types").SplitBranchData,
  ) => {
    const ls = branch.levels;
    return ls.length > 0 && ls[ls.length - 1].blockType === "exit";
  };

  // Group branches by selected attributes
  const groups: Array<{
    id: string;
    type: "attribute" | "else" | "placeholder" | "advanced";
    name: string;
    branches: import("@/lib/workflow/types").SplitBranchData[];
    anyBranchMerges: boolean;
    endsWithExit: boolean;
  }> = [];

  const selectedAttributes = data.selectedAttributes ?? [];
  const attributeCases = data.attributeCases ?? {};
  const elseEnabled = data.elseEnabled !== false;

  const hasAnyCases = selectedAttributes.some(
    (attr) => (attributeCases[attr] ?? []).length > 0
  );
  const isDefault = selectedAttributes.length === 0 || !hasAnyCases;

  if (isDefault) {
    const emptyBranch = data.branches.find((b) => b.id === "br_v2_empty_if");
    if (emptyBranch) {
      const continuingBranches = [emptyBranch].filter((b) => !branchEndsWithExit(b));
      const anyBranchMerges = continuingBranches.length > 0;
      groups.push({
        id: "empty_if",
        type: "placeholder",
        name: "IF Set condition",
        branches: [emptyBranch],
        anyBranchMerges,
        endsWithExit: !anyBranchMerges,
      });
    }
  } else {
    for (const attr of selectedAttributes) {
      const cases = attributeCases[attr] ?? [];
      const attrBranches = cases
        .map((val) => data.branches.find((b) => b.id === branchIdForAttrCase(attr, val)))
        .filter(Boolean) as import("@/lib/workflow/types").SplitBranchData[];

      if (attrBranches.length > 0) {
        const continuingBranches = attrBranches.filter((b) => !branchEndsWithExit(b));
        const anyBranchMerges = continuingBranches.length > 0;
        groups.push({
          id: attr,
          type: "attribute",
          name: getApprovalV2AttributeLabel(attr),
          branches: attrBranches,
          anyBranchMerges,
          endsWithExit: !anyBranchMerges,
        });
      }
    }
  }

  if (data.advancedConditions && data.advancedConditions.length > 0) {
    for (const adv of data.advancedConditions) {
      const advBranch = data.branches.find((b) => b.id === adv.id);
      if (advBranch) {
        const continuingBranches = [advBranch].filter((b) => !branchEndsWithExit(b));
        const anyBranchMerges = continuingBranches.length > 0;
        let badgeName = adv.name;
        if (!badgeName) {
          const conds = adv.condition.conditions;
          if (conds.length > 0) {
            badgeName = formatApprovalConditionRule(conds[0]);
            if (conds.length > 1) {
              badgeName += ` +${conds.length - 1}`;
            }
          } else {
            badgeName = "Attribute condition";
          }
        }

        groups.push({
          id: adv.id,
          type: "advanced",
          name: badgeName,
          branches: [advBranch],
          anyBranchMerges,
          endsWithExit: !anyBranchMerges,
        });
      }
    }
  }

  if (elseEnabled) {
    const elseBranch = data.branches.find((b) => b.id === "br_v2_else");
    if (elseBranch) {
      const continuingBranches = [elseBranch].filter((b) => !branchEndsWithExit(b));
      const anyBranchMerges = continuingBranches.length > 0;
      groups.push({
        id: "else",
        type: "else",
        name: "Else",
        branches: [elseBranch],
        anyBranchMerges,
        endsWithExit: !anyBranchMerges,
      });
    }
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center w-full select-none leading-none">
        <div className="w-px h-6 bg-[var(--border-strong)]" />
        <div
          role="button"
          tabIndex={0}
          onClick={onCardClick}
          className={cn(
            "group relative flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md",
            palettePillSelectionClass(splitCategory, selected),
          )}
        >
          <ToggleRight className="h-3.5 w-3.5" />
          <span>{data.name || "Conditional Type 2"}</span>
          <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-fg)] font-medium">
            0 attributes
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // Calculate layout widths
  const groupWidths = groups.map((g) =>
    g.branches.reduce((sum, b) => sum + branchColumnWidth(b), 0)
  );
  const canvasW = groupWidths.reduce((sum, w) => sum + w, 0);
  const groupOffsets = groupWidths.map((w, i) =>
    groupWidths.slice(0, i).reduce((sum, x) => sum + x, 0)
  );
  const groupCenters = groupOffsets.map((left, i) => left + groupWidths[i] / 2);
  const centerX = canvasW / 2;

  const stemH = 24;
  const splitH = 40;
  const connH = stemH + splitH;
  const ySplit = stemH + splitH / 2;
  const connR = 12;

  const continuingGroups = groups.filter((g) => !g.endsWithExit);
  const anyGroupMerges = continuingGroups.length > 0;

  const hasElse = data.elseEnabled && groups.some((g) => g.type === "else");
  const spineX = (hasElse && groups.length > 1)
    ? (groupWidths.slice(0, -1).reduce((sum, w) => sum + w, 0) / 2)
    : centerX;
  const spineShiftX = centerX - spineX;

  const flowBody = (
    <>
      {/* Top Split lines SVG + Row of groups + Bottom Merge SVG wrapped in translated container */}
      <div
        className="relative shrink-0 animate-fade-in"
        style={{
          width: canvasW,
          transform: spineShiftX ? `translateX(${spineShiftX}px)` : undefined,
        }}
      >
        <svg
          width={canvasW}
          height={connH}
          viewBox={`0 0 ${canvasW} ${connH}`}
          fill="none"
          className="block"
        >
          <line
            x1={spineX}
            y1={0}
            x2={spineX}
            y2={ySplit}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
          />
          {groupCenters.map((x, idx) => {
            if (x < spineX) {
              return (
                <path
                  key={groups[idx].id}
                  d={`M ${spineX} ${ySplit} L ${x + connR} ${ySplit} Q ${x} ${ySplit} ${x} ${ySplit + connR} L ${x} ${connH}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            if (x > spineX) {
              return (
                <path
                  key={groups[idx].id}
                  d={`M ${spineX} ${ySplit} L ${x - connR} ${ySplit} Q ${x} ${ySplit} ${x} ${ySplit + connR} L ${x} ${connH}`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            return (
              <path
                key={groups[idx].id}
                d={`M ${spineX} ${ySplit} L ${spineX} ${connH}`}
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                fill="none"
              />
            );
          })}
        </svg>

        {/* Horizontal row of groups */}
        <div className="flex items-stretch" style={{ width: canvasW }}>
          {groups.map((group, groupIdx) => {
            const groupW = groupWidths[groupIdx];
            const isElse = group.type === "else";

            // Calculate sub-branch centers & layout relative to the group container
            const branchWidths = group.branches.map((b) => branchColumnWidth(b));
            const branchCenters = branchWidths.map((w, idx) => {
              const left = branchWidths.slice(0, idx).reduce((sum, x) => sum + x, 0);
              return left + w / 2;
            });

            const isDefaultView = isDefault && !(data.advancedConditions && data.advancedConditions.length > 0);

            if (isDefaultView) {
              const branch = group.branches[0];
              return (
                <div
                  key={group.id}
                  className="flex flex-col items-center animate-fade-in self-stretch"
                  style={{ width: groupW, maxWidth: groupW }}
                >
                  <BranchConditionChip
                    branch={branch}
                    branchIndex={groupIdx}
                    totalBranches={groups.length}
                    hasElseBranch={elseEnabled}
                    onClick={onCardClick}
                  />
                  <BranchLine
                    nodeId={branchLineNodeId}
                    branch={branch}
                    embeddedHostLevelId={embeddedHostLevelId}
                    onRemoveLevel={(levelId) => removeLevelFromBranch(branch.id, levelId)}
                    view={view}
                    multisplitBranch={false}
                    workflowMultisplitBranch={false}
                  />
                </div>
              );
            }

            return (
              <div
                key={group.id}
                className="flex flex-col items-center animate-fade-in self-stretch"
                style={{ width: groupW, maxWidth: groupW }}
              >
                {/* Attribute Header Badge */}
                <div className="relative flex items-center justify-center z-10">
                  {isElse ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border-strong)] bg-slate-50 px-3 py-1 text-[11px] font-medium text-[var(--muted-fg)] shadow-sm">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span>Else (all other requests)</span>
                    </div>
                  ) : group.type === "placeholder" ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border-strong)] bg-slate-50 px-3 py-1 text-[11px] font-medium text-[var(--muted-fg)] shadow-sm">
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span>IF Set condition</span>
                    </div>
                  ) : group.type === "advanced" ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-800 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10.5px] truncate max-w-[240px]" title={group.name}>
                        {group.name}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[10.5px] truncate max-w-[240px]" title={group.name}>
                        {group.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub-split SVG within the group (from attribute badge to case chips) */}
                {group.branches.length > 1 ? (
                  <div className="relative shrink-0 w-full">
                    <svg
                      width={groupW}
                      height={32}
                      viewBox={`0 0 ${groupW} 32`}
                      fill="none"
                      className="block"
                    >
                      <line
                        x1={groupW / 2}
                        y1={0}
                        x2={groupW / 2}
                        y2={12}
                        stroke="var(--border-strong)"
                        strokeWidth="1.5"
                      />
                      {branchCenters.map((x, idx) => {
                        if (x < groupW / 2) {
                          return (
                            <path
                              key={group.branches[idx].id}
                              d={`M ${groupW / 2} 12 L ${x + 8} 12 Q ${x} 12 ${x} 18 L ${x} 32`}
                              stroke="var(--border-strong)"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          );
                        }
                        if (x > groupW / 2) {
                          return (
                            <path
                              key={group.branches[idx].id}
                              d={`M ${groupW / 2} 12 L ${x - 8} 12 Q ${x} 12 ${x} 18 L ${x} 32`}
                              stroke="var(--border-strong)"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          );
                        }
                        return (
                          <path
                            key={group.branches[idx].id}
                            d={`M ${groupW / 2} 12 L ${groupW / 2} 32`}
                            stroke="var(--border-strong)"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="w-px h-8 bg-[var(--border-strong)] shrink-0" />
                )}

                {/* Sub-branch columns */}
                <div className="flex items-stretch w-full grow">
                  {group.branches.map((branch, branchIndex) => {
                    const branchW = branchWidths[branchIndex];

                    // Determine case label and design
                    let caseVal: string = "";
                    if (branch.id === "br_v2_else") {
                      caseVal = "Else";
                    } else if (branch.id === "br_v2_empty_if") {
                      caseVal = "IF";
                    } else if (group.type === "advanced") {
                      caseVal = ""; // No label for advanced expression branch
                    } else {
                      const suffix = branch.id.replace(`br_v2_${group.id}_`, "");
                      const normalized = normalizeBooleanCaseValue(suffix);
                      caseVal = normalized
                        ? BOOLEAN_CASE_LABELS[normalized]
                        : suffix.charAt(0).toUpperCase() + suffix.slice(1);
                    }

                    const isTrue = caseVal === "True";
                    const isFalse = caseVal === "False";
                    const isAny = caseVal === "Any";
                    const isNone = caseVal === "None";
                    const isIf = caseVal.toLowerCase() === "if";

                    return (
                      <div
                        key={branch.id}
                        className="flex flex-col items-center animate-fade-in self-stretch"
                        style={{ width: branchW, maxWidth: branchW }}
                      >
                        {/* Case Pill */}
                        {group.type !== "advanced" ? (
                          <div
                            className={cn(
                              "relative mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold tracking-wide uppercase shadow-sm bg-white z-10",
                              isTrue
                                ? "border-emerald-200 text-emerald-700"
                                : isFalse
                                  ? "border-rose-200 text-rose-700"
                                  : isAny
                                    ? "border-sky-200 text-sky-700"
                                    : isIf
                                      ? "border-amber-200 text-amber-700"
                                      : "border-slate-300 text-slate-600"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1 w-1 rounded-full",
                                isTrue
                                  ? "bg-emerald-500"
                                  : isFalse
                                    ? "bg-rose-500"
                                    : isAny
                                      ? "bg-sky-500"
                                      : isIf
                                        ? "bg-amber-500"
                                        : "bg-slate-400"
                              )}
                            />
                            <span>{caseVal}</span>
                          </div>
                        ) : (
                          <div className="h-[22px] mb-2 shrink-0 w-px bg-[var(--border-strong)]" />
                        )}

                        {/* Branch Level cards and connector lines */}
                        <BranchLine
                          nodeId={branchLineNodeId}
                          branch={branch}
                          embeddedHostLevelId={embeddedHostLevelId}
                          onRemoveLevel={(levelId) => removeLevelFromBranch(branch.id, levelId)}
                          view={view}
                          multisplitBranch={false}
                          workflowMultisplitBranch={false}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Sub-merge SVG (from case branch lines back to group output line) */}
                {group.branches.length > 1 ? (
                  <div className="relative shrink-0 w-full mt-auto">
                    <svg
                      width={groupW}
                      height={24}
                      viewBox={`0 0 ${groupW} 24`}
                      fill="none"
                      className="block"
                    >
                      {branchCenters.map((x, idx) => {
                        const branch = group.branches[idx];
                        if (branchEndsWithExit(branch)) return null;

                        if (x < groupW / 2) {
                          return (
                            <path
                              key={branch.id}
                              d={`M ${x} 0 L ${x} 8 Q ${x} 14 ${x + 6} 14 L ${groupW / 2} 14`}
                              stroke="var(--border-strong)"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          );
                        }
                        if (x > groupW / 2) {
                          return (
                            <path
                              key={branch.id}
                              d={`M ${x} 0 L ${x} 8 Q ${x} 14 ${x - 6} 14 L ${groupW / 2} 14`}
                              stroke="var(--border-strong)"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          );
                        }
                        return (
                          <path
                            key={branch.id}
                            d={`M ${groupW / 2} 0 L ${groupW / 2} 14`}
                            stroke="var(--border-strong)"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        );
                      })}
                      {group.anyBranchMerges && (
                        <line
                          x1={groupW / 2}
                          y1={14}
                          x2={groupW / 2}
                          y2={24}
                          stroke="var(--border-strong)"
                          strokeWidth="1.5"
                        />
                      )}
                    </svg>
                  </div>
                ) : (
                  <div className="w-px h-6 bg-[var(--border-strong)] mt-auto shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Global Merge lines SVG */}
        <svg
          width={canvasW}
          height={40}
          viewBox={`0 0 ${canvasW} 40`}
          fill="none"
          className="block"
        >
          {groupCenters.map((x, idx) => {
            const group = groups[idx];
            if (group.endsWithExit) return null;

            if (x < spineX) {
              return (
                <path
                  key={group.id}
                  d={`M ${x} 0 L ${x} 12 Q ${x} 20 ${x + connR} 20 L ${spineX} 20`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            if (x > spineX) {
              return (
                <path
                  key={group.id}
                  d={`M ${x} 0 L ${x} 12 Q ${x} 20 ${x - connR} 20 L ${spineX} 20`}
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            }
            return (
              <path
                key={group.id}
                d={`M ${spineX} 0 L ${spineX} 20`}
                stroke="var(--border-strong)"
                strokeWidth="1.5"
                fill="none"
              />
            );
          })}
          {anyGroupMerges && (
            <line
              x1={spineX}
              y1={20}
              x2={spineX}
              y2={40}
              stroke="var(--border-strong)"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </>
  );

  return (
    <div className="flex flex-col items-center w-full select-none leading-none">
      <div className="w-px h-6 bg-[var(--border-strong)]" />
      
      {/* 1. Main badge */}
      <div className="relative flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          onClick={onCardClick}
          className={cn(
            "group relative flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md",
            palettePillSelectionClass(splitCategory, selected),
          )}
        >
          <ToggleRight className="h-3.5 w-3.5" />
          <span>{data.name || "Conditional Type 2"}</span>
          <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-fg)] font-medium">
            {groups.length} paths
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {flowBody}
    </div>
  );
}

const OP_SYMBOL: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "contains",
  starts_with: "starts with",
  in: "in",
  not_in: "not in",
  greater_than: ">",
  less_than: "<",
  gte: "≥",
  lte: "≤",
};

/** Read-only chip summarising a conditional branch's routing condition. */
/** Header chip for multisplit branches when split-by-attribute(s) is configured. */
function BranchSplitChip({
  attrIds,
  branch,
  onClick,
}: {
  attrIds: string[];
  branch: import("@/lib/workflow/types").SplitBranchData;
  onClick: (e: React.MouseEvent) => void;
}) {
  const values = getBranchAttributeValues(branch, attrIds);
  const summary = formatBranchSplitSummary(attrIds, values);
  const filled = branchSplitValuesComplete(branch, attrIds);
  return (
    <button
      onClick={onClick}
      title={summary}
      className={cn(
        "node-enter mb-1 inline-flex max-w-[320px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] shadow-sm transition-colors",
        filled
          ? "border-[var(--accent)]/40 bg-[var(--accent-softer)] text-[#9A3412]"
          : "border-dashed border-[var(--border-strong)] bg-white text-[var(--muted-fg)]",
      )}
    >
      <GitFork className="h-3 w-3 shrink-0" />
      <span className={cn("truncate leading-tight", filled ? "font-semibold" : "font-medium")}>
        {summary}
      </span>
    </button>
  );
}

function BranchConditionChip({
  branch,
  branchIndex,
  totalBranches,
  hasElseBranch = true,
  onClick,
}: {
  branch: import("@/lib/workflow/types").SplitBranchData;
  branchIndex: number;
  totalBranches: number;
  hasElseBranch?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const attributeDefs =
    editorContext === "approval" ? APPROVAL_CONDITIONAL_ATTRIBUTES : CONDITIONAL_ATTRIBUTES;
  const keyword = routingBranchKeyword(branchIndex, totalBranches, { hasElseBranch });
  const isCatchAll = keyword === "ELSE";
  const hasCondition = !isCatchAll && branchHasRoutingCondition(branch);
  const valid = (branch.condition?.conditions ?? []).filter(
    (c) => c.attribute && (Array.isArray(c.value) ? c.value.length : c.value),
  );
  let detail: string;
  if (isCatchAll) {
    detail = "All other requests";
  } else if (!hasCondition) {
    detail = "Set condition";
  } else {
    const c = valid[0];
    const attr = attributeDefs.find((a) => a.value === c.attribute);
    const attrLabel = attr?.label ?? getApprovalV2AttributeLabel(c.attribute);
    const unit = attr?.unit ?? "";
    const val = formatConditionValue(
      c.attribute,
      Array.isArray(c.value) ? c.value : String(c.value),
    );
    const more = valid.length > 1 ? ` +${valid.length - 1}` : "";
    detail = `${attrLabel} ${OP_SYMBOL[c.operator] ?? c.operator} ${unit}${val}${more}`;
  }
  // Catch-all and configured conditions read as "set"; only an empty IF/ELSE IF is pending.
  const configured = isCatchAll || hasCondition;
  const label = `${keyword} · ${detail}`;
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "node-enter mb-1 inline-flex max-w-[300px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] shadow-sm transition-colors",
        configured
          ? "border-[var(--accent)]/40 bg-[var(--accent-softer)] text-[#9A3412]"
          : "border-dashed border-[var(--border-strong)] bg-white text-[var(--muted-fg)]",
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase leading-none tracking-wide",
          keyword === "IF" && "bg-[var(--accent)] text-white",
          keyword === "ELSE IF" && "bg-white/90 text-[#9A3412] ring-1 ring-[var(--accent)]/25",
          keyword === "ELSE" && "bg-[var(--muted)] text-[var(--foreground)]",
        )}
      >
        {keyword}
      </span>
      <span
        className={cn(
          "truncate leading-tight",
          configured ? "font-semibold" : "font-medium",
        )}
      >
        {detail}
      </span>
    </button>
  );
}

/** A single vertical branch line with drop zones and inline approval level cards */
function BranchLine({
  nodeId,
  branch,
  onRemoveLevel,
  view,
  embeddedHostLevelId,
  multisplitBranch,
  workflowMultisplitBranch,
}: {
  nodeId: string;
  branch: import("@/lib/workflow/types").SplitBranchData;
  onRemoveLevel: (levelId: string) => void;
  view: ViewMode;
  embeddedHostLevelId?: string;
  multisplitBranch?: boolean;
  workflowMultisplitBranch?: boolean;
}) {
  const levels = branch.levels;
  // A multisplit branch is capped at one approval level — hide the add
  // affordance entirely once it's filled.
  const branchFull = !!multisplitBranch && levels.length >= 1;

  return (
    <div className="flex grow flex-col items-center w-full min-h-[80px]">
      {levels.length === 0 ? (
        <BranchLineSlot
          nodeId={nodeId}
          branchId={branch.id}
          index={0}
          isEmpty={true}
          embeddedHostLevelId={embeddedHostLevelId}
          multisplitBranch={multisplitBranch}
          workflowMultisplitBranch={workflowMultisplitBranch}
        />
      ) : (
        <>
          {/* Slot above the first level so blocks can be inserted at the top.
              Multisplit branches are single-slot, so they get a plain stem. */}
          {branchFull ? (
            <div className="w-px h-4 bg-[var(--border-strong)] shrink-0" />
          ) : (
            <BranchLineSlot
              nodeId={nodeId}
              branchId={branch.id}
              index={0}
              embeddedHostLevelId={embeddedHostLevelId}
              multisplitBranch={multisplitBranch}
              workflowMultisplitBranch={workflowMultisplitBranch}
            />
          )}
          {levels.map((level, idx) => {
            // Exit terminates the branch — draw no line/slot below it.
            const isExitLevel = level.blockType === "exit";
            // A multisplit's combined-outcome decision is auto-managed: it
            // can't be removed on its own and nothing inserts between it and
            // its multisplit.
            const isComboDecision = isMultisplitDecisionLevel(level);
            const nextIsComboDecision =
              idx + 1 < levels.length &&
              isMultisplitDecisionLevel(levels[idx + 1]);
            return (
              <div
                key={level.id}
                className="flex w-full flex-col items-center overflow-visible"
              >
                {isNestedFlowLevel(level) ? (
                  level.blockType === "conditional_branch_v2" ? (
                    <ConditionalBranchV2Flow
                      mode="embedded"
                      parentNodeId={nodeId}
                      hostLevelId={level.id}
                      data={level.embeddedConditional!}
                      view={view}
                      onRemove={
                        isComboDecision ? undefined : () => onRemoveLevel(level.id)
                      }
                    />
                  ) : (
                    <SplitBranchesFlow
                      mode="embedded"
                      parentNodeId={nodeId}
                      hostLevelId={level.id}
                      data={level.embeddedConditional!}
                      view={view}
                      onRemove={
                        isComboDecision ? undefined : () => onRemoveLevel(level.id)
                      }
                    />
                  )
                ) : (
                  <>
                    <BranchLevelCard
                      nodeId={nodeId}
                      branchId={branch.id}
                      level={level}
                      onRemove={() => onRemoveLevel(level.id)}
                      view={view}
                      embeddedHostLevelId={embeddedHostLevelId}
                    />
                    {hasInlineDecision(level) && level.embeddedConditional && (
                      <>
                        <div className="w-px h-4 bg-[var(--border-strong)] shrink-0" />
                        <SplitBranchesFlow
                          mode="embedded"
                          parentNodeId={nodeId}
                          hostLevelId={level.id}
                          data={level.embeddedConditional}
                          view={view}
                        />
                      </>
                    )}
                  </>
                )}
                {!isExitLevel && !branchFull && !nextIsComboDecision && (
                  <BranchLineSlot
                    nodeId={nodeId}
                    branchId={branch.id}
                    index={idx + 1}
                    embeddedHostLevelId={embeddedHostLevelId}
                    multisplitBranch={multisplitBranch}
                    workflowMultisplitBranch={workflowMultisplitBranch}
                  />
                )}
              </div>
            );
          })}
          {!(levels.length > 0 && levels[levels.length - 1].blockType === "exit") && (
            <div className="w-px flex-grow bg-[var(--border-strong)] min-h-[24px]" />
          )}
        </>
      )}
    </div>
  );
}

/** A segment of the branch line that acts as a drop target and hover-to-add zone */
function BranchLineSlot({
  nodeId,
  branchId,
  index,
  isEmpty,
  embeddedHostLevelId,
  multisplitBranch,
  workflowMultisplitBranch,
}: {
  nodeId: string;
  branchId: string;
  index: number;
  isEmpty?: boolean;
  embeddedHostLevelId?: string;
  multisplitBranch?: boolean;
  workflowMultisplitBranch?: boolean;
}) {
  const draggingKind = useWorkflowStore((s) => s.draggingKind);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const slotId = embeddedHostLevelId
    ? `branch-slot-${nodeId}-${embeddedHostLevelId}-${branchId}-${index}`
    : `branch-slot-${nodeId}-${branchId}-${index}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: {
      isBranchDrop: true,
      nodeId,
      branchId,
      index,
      embeddedHostLevelId,
    },
  });

  const addLabel = "Add block";
  const acceptsBranchDrag =
    draggingKind === "task" ||
    (workflowMultisplitBranch && draggingKind === "filter");

  // Not dragging a droppable block — vertical line with a ripple "+" affordance.
  if (!acceptsBranchDrag) {
    return (
      <div className="conn-add relative flex w-full grow flex-col items-center min-h-[80px]">
        <div className="w-px flex-grow bg-[var(--border-strong)]" />
        <button
          ref={setNodeRef as unknown as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuRect(e.currentTarget.getBoundingClientRect());
          }}
          aria-label={addLabel}
          title={addLabel}
          className="conn-add-btn"
        >
          <Plus className="plus-icon h-3 w-3" strokeWidth={3} />
        </button>
        <BranchAddMenu
          open={!!menuRect}
          anchorRect={menuRect}
          editorContext={editorContext}
          approvalMultisplitOnly={multisplitBranch}
          workflowMultisplit={workflowMultisplitBranch}
          onClose={() => setMenuRect(null)}
          onSelect={(preset) =>
            useWorkflowStore
              .getState()
              .insertNodeIntoBranch(
                nodeId,
                branchId,
                index,
                preset,
                embeddedHostLevelId,
              )
          }
        />
      </div>
    );
  }

  // Dragging a task — pulse "+" indicator that expands to an "Insert here"
  // bar on hover, identical to the main-canvas drop slots.
  return (
    <div className="flex w-full grow flex-col items-center min-h-[80px]">
      <div className="w-px h-6 shrink-0 bg-[var(--border-strong)]" />
      <div
        ref={setNodeRef}
        className="my-1 flex h-11 w-[420px] items-center justify-center"
        aria-label="Drop here to insert"
      >
        {isOver ? (
          <span className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] text-[12px] font-medium text-[var(--accent)]">
            <Plus className="h-3.5 w-3.5" />
            Insert here
          </span>
        ) : (
          <span className="drop-pulse flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/50">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="w-px flex-grow bg-[var(--border-strong)] min-h-[6px]" />
    </div>
  );
}

/** Approval level card rendered inline on a branch line */
function BranchLevelCard({
  nodeId,
  branchId,
  level,
  onRemove,
  view,
  embeddedHostLevelId: _embeddedHostLevelId,
}: {
  nodeId: string;
  branchId: string;
  level: ApprovalLevelConfig;
  onRemove: () => void;
  view: ViewMode;
  embeddedHostLevelId?: string;
}) {
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const selected = selectedId === level.id; // Check if THIS LEVEL is selected!

  const parentSplitNode = useWorkflowStore((s) =>
    s.nodes.find((n) => n.id === nodeId),
  );
  const parentTaskType =
    parentSplitNode?.kind === "task"
      ? (parentSplitNode.data as AnyTaskData).taskType
      : undefined;
  const parentMultisplitData =
    parentTaskType === "approval_split"
      ? (parentSplitNode!.data as ApprovalSplitData)
      : undefined;

  const isExit = level.blockType === "exit";
  const isSkip = level.blockType === "skip";
  const isAssign = level.blockType === "assign_entities";
  const isNotification = level.blockType === "notification";
  const isSod = level.blockType === "sod_check";
  const isFilter = isBranchFilterLevel(level);
  const isModule = isBranchModuleLevel(level);
  const policies = useWorkflowStore((s) => s.policies);
  const linkedPolicy = isModule
    ? policies.find((p) => p.id === level.policyId)
    : undefined;
  const assignCount =
    (level.appIds?.length ?? 0) +
    (level.entitlementIds?.length ?? 0) +
    (level.techRoleIds?.length ?? 0) +
    (level.businessRoleIds?.length ?? 0);
  const overrideFallback = level.overrideFallback;
  const effectiveFallback =
    parentMultisplitData && !overrideFallback
      ? parentMultisplitData.globalFallbackType
      : level.fallbackType;

  const isConfigured = isExit || isSkip || isSod
    ? true
    : isFilter
      ? isBranchFilterConfigured(level)
      : isModule
        ? !!level.policyId
        : isNotification
      ? isBranchNotificationConfigured(level)
      : isAssign
        ? assignCount > 0
        : level.approverType !== "" && effectiveFallback !== "";

  const levelCategory = paletteCategoryForBranchLevel(level);

  const assignSummary = (() => {
    const parts: string[] = [];
    if (level.appIds?.length) parts.push(`${level.appIds.length} apps`);
    if (level.entitlementIds?.length) parts.push(`${level.entitlementIds.length} entitlements`);
    if (level.techRoleIds?.length) parts.push(`${level.techRoleIds.length} tech roles`);
    if (level.businessRoleIds?.length) parts.push(`${level.businessRoleIds.length} business roles`);
    return parts.length ? parts.join(" · ") : "Nothing selected yet";
  })();

  function onCardClick(e: React.MouseEvent) {
    e.stopPropagation();
    selectNode(level.id);
  }

  if (isSod) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(level.id);
          }
        }}
        className={cn(
          "node-enter group relative w-[300px] shrink-0 cursor-pointer rounded-xl border bg-white text-left transition-[border-color,box-shadow] duration-150",
          paletteCardLeftBorderClass(levelCategory),
          selected
            ? cn("shadow-[var(--shadow-card-hover)]", paletteCardSelectionClass(levelCategory, true))
            : "border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              paletteIconTileClass(levelCategory, { configured: isConfigured }),
            )}
          >
            <ShieldHalf className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
              {level.name ?? "SoD Check"}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-fg)]">
              Runs the SoD check · outcomes below
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm group-hover:flex"
          aria-label="Remove SoD check"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isFilter) {
    const validCount = (level.criteria?.conditions ?? []).filter(
      (c) => c.attribute && c.value,
    ).length;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(level.id);
          }
        }}
        className={cn(
          "node-enter group relative w-[300px] shrink-0 cursor-pointer rounded-xl border bg-white text-left transition-[border-color,box-shadow] duration-150",
          paletteCardLeftBorderClass(levelCategory),
          selected
            ? cn("shadow-[var(--shadow-card-hover)]", paletteCardSelectionClass(levelCategory, true))
            : "border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              paletteIconTileClass(levelCategory, { configured: isConfigured }),
            )}
          >
            <FilterIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
              {level.name ?? "User Filter"}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-fg)]">
              {validCount > 0
                ? `${validCount} condition${validCount === 1 ? "" : "s"} · ${level.criteria?.logic ?? "AND"}`
                : "Define user conditions"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm group-hover:flex"
          aria-label="Remove filter"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isModule) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(level.id);
          }
        }}
        className={cn(
          "node-enter group relative w-[300px] shrink-0 cursor-pointer rounded-xl border bg-white text-left transition-[border-color,box-shadow] duration-150",
          paletteCardLeftBorderClass(levelCategory),
          selected
            ? cn("shadow-[var(--shadow-card-hover)]", paletteCardSelectionClass(levelCategory, true))
            : "border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              paletteIconTileClass(levelCategory, { configured: isConfigured }),
            )}
          >
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
              {level.name ?? "Approval Policy"}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-fg)]">
              {linkedPolicy?.name ?? "Choose a linked policy"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm group-hover:flex"
          aria-label="Remove module"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isNotification) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(level.id);
          }
        }}
        className={cn(
          "node-enter group relative w-[300px] shrink-0 cursor-pointer rounded-xl border bg-white text-left transition-[border-color,box-shadow] duration-150",
          paletteCardLeftBorderClass(levelCategory),
          selected
            ? cn("shadow-[var(--shadow-card-hover)]", paletteCardSelectionClass(levelCategory, true))
            : "border-[var(--border)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              paletteIconTileClass(levelCategory, { configured: isConfigured }),
            )}
          >
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
              {level.name ?? "Notification"}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-fg)]">
              {branchNotificationSummary(level)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm group-hover:flex"
          aria-label="Remove notification"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Exit / Skip render as compact terminal-style pills (like rule handles).
  if (isExit || isSkip) {
    const PillIcon = isExit ? LogOut : SkipForward;
    const pillLabel = isExit ? "Exit" : "Skip";
    const pillBadge = isExit ? "Ends flow" : "Bypass";
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNode(level.id);
          }
        }}
        className={cn(
          "group relative flex shrink-0 items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[12px] font-semibold shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md",
          palettePillSelectionClass(levelCategory, selected),
        )}
      >
        <PillIcon className="h-3.5 w-3.5" />
        <span>{pillLabel}</span>
        <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-fg)]">
          {pillBadge}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2.5 -top-2.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectNode(level.id);
        }
      }}
      className={cn(
        "node-enter group relative w-[420px] cursor-pointer rounded-xl border bg-white text-left transition-[border-color,box-shadow] duration-150 ease-out shrink-0",
        paletteCardLeftBorderClass(levelCategory),
        selected
          ? cn("shadow-[var(--shadow-card-hover)]", paletteCardSelectionClass(levelCategory, true))
          : "border-[var(--border)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      <div className="relative flex items-center gap-3 px-3.5 py-3 pr-11">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            paletteIconTileClass(levelCategory, { configured: isConfigured }),
          )}
        >
          {isExit ? (
            <LogOut className="h-4 w-4" />
          ) : isAssign ? (
            <ListChecks className="h-4 w-4" />
          ) : (
            <ShieldHalf className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[var(--foreground)]">
              {isExit
                ? "Exit"
                : isAssign
                  ? level.name || "Assign Entities"
                  : level.name || "Approval Level"}
            </h3>
            {!isExit && !isAssign && level.approverType && (
              <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--accent-softer)] px-2 text-[10.5px] font-medium text-[#9A3412]">
                {level.approverType}
              </span>
            )}
            {isConfigured ? (
              <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 text-[10.5px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </span>
            ) : (
              <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 text-[10.5px] font-medium text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Incomplete
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted-fg)]">
            {isExit
              ? `Ends here · ${level.exitOutcome ?? "End"}`
              : isAssign
                ? assignSummary
                : level.approverType
                  ? "Approver step"
                  : "Choose an approver to continue"}
          </p>
          {!isExit && !isAssign && <ApprovalMetaPills data={level as LevelLike} />}
        </div>

        <div
          className={cn(
            "absolute right-3 top-3 transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          <IconBtn label="Delete" icon={Trash2} onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }} />
        </div>
      </div>
    </div>
  );
}

// suppress unused-import warning
void APPS;
